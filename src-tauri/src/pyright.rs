use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Command, Stdio, ChildStdin, Child};
use std::sync::atomic::{AtomicBool, Ordering};
use std::io::{BufRead, BufReader, Write};
use std::sync::Mutex;

static PYRIGHT_SERVER: Lazy<Mutex<Option<PyrightServer>>> = Lazy::new(|| Mutex::new(None));
static INITIALIZED: AtomicBool = AtomicBool::new(false);
static AUTO_INSTALL_ATTEMPTED: AtomicBool = AtomicBool::new(false);

struct PyrightServer {
    child: Child,
    stdin: Mutex<ChildStdin>,
    request_id: Mutex<u32>,
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
            "/usr/local/bin/pyright".to_string(),
            "/usr/bin/pyright".to_string(),
        ],
        "macos" => vec![
            format!("{}/.local/bin/pyright", home.as_deref().unwrap_or("")),
            "/usr/local/bin/pyright".to_string(),
            "/opt/homebrew/bin/pyright".to_string(),
        ],
        "windows" => vec![
            format!("{}\\.local\\bin\\pyright.bat", home.as_deref().unwrap_or("")),
            "C:\\Python\\Scripts\\pyright.bat".to_string(),
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
    
    let output = Command::new("sh")
        .args(["-c", "which python3"])
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
    
    let commands = vec![
        format!("{} -m pip install pyright", python),
        format!("{} -m pip install --user pyright", python),
    ];
    
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
    
    Err("Failed to install pyright".to_string())
}

fn get_pyright_path() -> Option<PathBuf> {
    find_pyright_in_path().or_else(find_pyright_in_common_locations)
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
        child,
        stdin: Mutex::new(stdin),
        request_id: Mutex::new(1),
    };

    let mut guard = PYRIGHT_SERVER.lock().unwrap();
    *guard = Some(server);

    INITIALIZED.store(true, Ordering::SeqCst);

    Ok(())
}

pub fn open_document(file_path: String, content: String, python_path: Option<String>) -> Result<(), String> {
    if !INITIALIZED.load(Ordering::SeqCst) {
        init_server(python_path)?;
    }

    eprintln!("[Pyright] Opened document: {}", file_path);
    Ok(())
}

pub fn change_document(_file_path: String, _content: String, _version: u32) -> Result<(), String> {
    if !INITIALIZED.load(Ordering::SeqCst) {
        return Ok(());
    }
    Ok(())
}

pub fn get_completions(file_path: String, _content: String, line: u32, column: u32, _python_path: Option<String>) -> Result<CompletionResult, String> {
    if !INITIALIZED.load(Ordering::SeqCst) {
        return Ok(CompletionResult {
            items: vec![],
            is_incomplete: Some(false),
        });
    }

    eprintln!("[Pyright] Getting completions for {}:{}:{}", file_path, line, column);

    Ok(CompletionResult {
        items: vec![],
        is_incomplete: Some(false),
    })
}

pub fn close_document(_file_path: String) -> Result<(), String> {
    Ok(())
}

pub fn shutdown_server() -> Result<(), String> {
    let mut guard = PYRIGHT_SERVER.lock().unwrap();
    if let Some(mut server) = guard.take() {
        let _ = server.child.kill();
    }
    
    INITIALIZED.store(false, Ordering::SeqCst);
    Ok(())
}
