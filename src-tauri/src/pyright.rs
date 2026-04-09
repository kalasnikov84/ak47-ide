use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::process::{Command, Stdio, ChildStdin, Child};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::time::Instant;

static PYRIGHT_SERVER: Lazy<Mutex<Option<PyrightServer>>> = Lazy::new(|| Mutex::new(None));
static INITIALIZED: AtomicBool = AtomicBool::new(false);
static REQUEST_ID: AtomicU32 = AtomicU32::new(1);
static AUTO_INSTALL_ATTEMPTED: AtomicBool = AtomicBool::new(false);

struct PyrightServer {
    _child: Child,
    _stdin: ChildStdin,
    request_id: Mutex<u32>,
    last_use: Instant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionItem {
    pub label: String,
    #[serde(rename = "insertText")]
    pub insert_text: Option<String>,
    #[serde(rename = "kind")]
    pub kind: Option<u32>,
    #[serde(rename = "detail")]
    pub detail: Option<String>,
    #[serde(rename = "documentation")]
    pub documentation: Option<String>,
    #[serde(rename = "sortText")]
    pub sort_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResult {
    pub items: Vec<CompletionItem>,
    #[serde(rename = "isIncomplete")]
    pub is_incomplete: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: u32,
    method: String,
    params: Value,
}

fn get_platform() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

fn find_pyright_in_path() -> Option<PathBuf> {
    let cmd = if cfg!(target_os = "windows") {
        "where pyright"
    } else {
        "which pyright"
    };
    
    let output = Command::new("sh")
        .args(["-c", cmd])
        .output();
    
    if let Ok(output) = output {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(PathBuf::from(path));
            }
        }
    }
    None
}

fn find_pyright_in_common_locations() -> Option<PathBuf> {
    let platform = get_platform();
    let home = std::env::var("HOME").ok();
    
    let candidates: Vec<String> = match platform {
        "linux" => vec![
            format!("{}/.local/bin/pyright", home.as_deref().unwrap_or("")),
            format!("{}/.pyenv/shims/pyright", home.as_deref().unwrap_or("")),
            "/usr/local/bin/pyright".to_string(),
            "/usr/bin/pyright".to_string(),
            "/opt/pyright/bin/pyright".to_string(),
        ],
        "macos" => vec![
            format!("{}/.local/bin/pyright", home.as_deref().unwrap_or("")),
            format!("{}/.pyenv/shims/pyright", home.as_deref().unwrap_or("")),
            "/usr/local/bin/pyright".to_string(),
            format!("{}/Library/Python/*/bin/pyright", home.as_deref().unwrap_or("")),
            "/opt/homebrew/bin/pyright".to_string(),
        ],
        "windows" => vec![
            format!("{}\\.local\\bin\\pyright.bat", home.as_deref().unwrap_or("")),
            format!("%APPDATA%\\Python\\Scripts\\pyright.bat"),
            "C:\\Python\\Scripts\\pyright.bat".to_string(),
            "C:\\Program Files\\Pyright\\bin\\pyright.exe".to_string(),
        ],
        _ => vec![],
    };
    
    for p in candidates {
        let path = PathBuf::from(&p);
        if path.exists() {
            return Some(path);
        }
    }
    
    None
}

fn find_python() -> String {
    if let Ok(v) = std::env::var("PYTHON_PATH") {
        return v;
    }
    
    let python_cmd = if cfg!(target_os = "windows") {
        "where python"
    } else {
        "which python3"
    };
    
    let output = Command::new("sh")
        .args(["-c", python_cmd])
        .output();
    
    if let Ok(output) = output {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return path.split('\n').next().unwrap_or("python3").to_string();
            }
        }
    }
    
    "python3".to_string()
}

fn install_pyright() -> Result<(), String> {
    if AUTO_INSTALL_ATTEMPTED.load(Ordering::SeqCst) {
        return Err("Pyright installation already attempted".to_string());
    }
    AUTO_INSTALL_ATTEMPTED.store(true, Ordering::SeqCst);
    
    let python = find_python();
    
    let pip_cmd_1 = format!("{} -m pip install pyright", python);
    let pip_cmd_2 = format!("{} -m pip install --user pyright", python);
    
    let commands = vec![pip_cmd_1, pip_cmd_2];
    
    for cmd in commands {
        let output = Command::new("sh")
            .args(["-c", &cmd])
            .output();
        
        if let Ok(output) = output {
            if output.status.success() {
                return Ok(());
            }
        }
    }
    
    if cfg!(target_os = "windows") {
        let output = Command::new("npm")
            .args(["install", "-g", "pyright"])
            .output();
        
        if let Ok(output) = output {
            if output.status.success() {
                return Ok(());
            }
        }
    }
    
    Err("Failed to install pyright".to_string())
}

fn get_pyright_path() -> Option<PathBuf> {
    if let Some(path) = find_pyright_in_path() {
        return Some(path);
    }
    
    if let Some(path) = find_pyright_in_common_locations() {
        return Some(path);
    }
    
    None
}

pub fn check_pyright_installed() -> bool {
    get_pyright_path().is_some()
}

pub fn check_and_install_pyright() -> bool {
    if get_pyright_path().is_some() {
        return true;
    }
    
    if install_pyright().is_ok() {
        return get_pyright_path().is_some();
    }
    
    false
}

fn init_server(python_path: Option<String>) -> Result<(), String> {
    let pyright_path = get_pyright_path().ok_or_else(|| {
        if !check_and_install_pyright() {
            "Pyright not found. Install with: pip install pyright".to_string()
        } else {
            "Pyright not found".to_string()
        }
    })?;
    
    let python = python_path.unwrap_or_else(find_python);

    let mut child = Command::new(&pyright_path)
        .args([
            "--langserver",
            "--pythonpath",
            &python,
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start pyright: {}", e))?;

    let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
    let _stdout = child.stdout.take();

    let server = PyrightServer {
        _child: child,
        _stdin: stdin,
        request_id: Mutex::new(1),
        last_use: Instant::now(),
    };

    let mut guard = PYRIGHT_SERVER.lock();
    *guard = Some(server);

    INITIALIZED.store(true, Ordering::SeqCst);

    Ok(())
}

pub fn open_document(file_path: String, content: String, python_path: Option<String>) -> Result<(), String> {
    if !INITIALIZED.load(Ordering::SeqCst) {
        init_server(python_path)?;
    }

    let _params = serde_json::json!({
        "textDocument": {
            "uri": format!("file://{}", file_path),
            "languageId": "python",
            "version": 1,
            "text": content
        }
    });

    Ok(())
}

pub fn change_document(_file_path: String, _content: String, _version: u32) -> Result<(), String> {
    Ok(())
}

pub fn get_completions(_file_path: String, _content: String, _line: u32, _column: u32, _python_path: Option<String>) -> Result<CompletionResult, String> {
    Ok(CompletionResult {
        items: vec![],
        is_incomplete: Some(false),
    })
}

pub fn close_document(_file_path: String) -> Result<(), String> {
    Ok(())
}

pub fn shutdown_server() -> Result<(), String> {
    let mut guard = PYRIGHT_SERVER.lock();
    if let Some(_server) = guard.take() {
        // server will be dropped and killed automatically
    }
    
    INITIALIZED.store(false, Ordering::SeqCst);
    REQUEST_ID.store(1, Ordering::SeqCst);
    Ok(())
}
