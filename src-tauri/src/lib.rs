use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::thread;
use std::sync::Mutex;
use std::process::{Command, Stdio, ChildStdin};
use std::io::Write;
use tauri::{AppHandle, Emitter, Manager};

static CURRENT_CHILD: Mutex<Option<(u32, ChildStdin)>> = Mutex::new(None);

#[tauri::command]
fn close_app(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }
}

fn kill_current_process() {
    if let Ok(mut guard) = CURRENT_CHILD.lock() {
        if let Some((pid, _)) = guard.take() {
            let _ = Command::new("kill")
                .arg("-9")
                .arg(pid.to_string())
                .output();
        }
    }
}

#[tauri::command]
fn kill_process() -> Result<(), String> {
    kill_current_process();
    Ok(())
}

#[tauri::command]
fn send_input(input: String) -> Result<(), String> {
    if let Ok(mut guard) = CURRENT_CHILD.lock() {
        if let Some((_, mut stdin)) = guard.take() {
            stdin.write_all(input.as_bytes()).map_err(|e| e.to_string())?;
            stdin.write_all(b"\n").map_err(|e| e.to_string())?;
            stdin.flush().map_err(|e| e.to_string())?;
            *guard = Some((0, stdin));
            return Ok(());
        }
    }
    Err("No running process".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    name: String,
    path: String,
    is_directory: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct TerminalOutput {
    pub line: String,
    pub is_error: bool,
    pub is_done: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct VenvPrompt {
    pub action: String,
    pub project_path: String,
    pub run_path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MissingModule {
    pub module_name: String,
    pub project_path: String,
    pub run_path: String,
}

#[tauri::command]
async fn install_missing_module(app: AppHandle, module_name: String, project_path: String, _run_path: String) -> Result<(), String> {
    let venv_path = format!("{}/venv", project_path);
    let venv_python = format!("{}/bin/python", venv_path);
    
    if !Path::new(&venv_python).exists() {
        return Err("No virtual environment found".to_string());
    }
    
    app.emit("terminal:output", TerminalOutput {
        line: format!("[pip] Installing {}...", module_name),
        is_error: false,
        is_done: false,
    }).ok();
    
    let output = Command::new("bash")
        .args(["-c", &format!("source \"{}/bin/activate\" && pip install {}", venv_path, module_name)])
        .output();
    
    if output.is_err() || !output.as_ref().map(|o| o.status.success()).unwrap_or(false) {
        let error = output.as_ref()
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_else(|e| e.to_string());
        app.emit("terminal:output", TerminalOutput {
            line: format!("[pip] Failed to install {}: {}", module_name, error),
            is_error: true,
            is_done: false,
        }).ok();
        return Err(error);
    }
    
    app.emit("terminal:output", TerminalOutput {
        line: format!("[pip] Successfully installed {}", module_name),
        is_error: false,
        is_done: false,
    }).ok();
    
    return Ok(());
}

#[tauri::command]
async fn install_pip_package(app: AppHandle, module_name: String, project_path: String) -> Result<(), String> {
    let venv_path = format!("{}/venv", project_path);
    let venv_python = format!("{}/bin/python", venv_path);
    
    let (_program, use_venv) = if Path::new(&venv_python).exists() {
        (venv_python, true)
    } else {
        ("python3".to_string(), false)
    };
    
    app.emit("terminal:output", TerminalOutput {
        line: format!("[pip] Installing {}...", module_name),
        is_error: false,
        is_done: false,
    }).ok();
    
    let output = if use_venv {
        Command::new("bash")
            .args(["-c", &format!("source \"{}/bin/activate\" && pip install {}", venv_path, module_name)])
            .output()
    } else {
        Command::new("pip")
            .args(["install", &module_name])
            .output()
    };
    
    if output.is_err() || !output.as_ref().map(|o| o.status.success()).unwrap_or(false) {
        let error = output.as_ref()
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_else(|e| e.to_string());
        app.emit("terminal:output", TerminalOutput {
            line: format!("[pip] Failed to install {}: {}", module_name, error),
            is_error: true,
            is_done: false,
        }).ok();
        return Err(error);
    }
    
    app.emit("terminal:output", TerminalOutput {
        line: format!("[pip] Successfully installed {}", module_name),
        is_error: false,
        is_done: false,
    }).ok();
    
    return Ok(());
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut result: Vec<FileEntry> = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            let path_buf = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = path_buf.is_dir();
            
            if !name.starts_with('.') {
                result.push(FileEntry {
                    name,
                    path: path_buf.to_string_lossy().to_string(),
                    is_directory: is_dir,
                });
            }
        }
    }

    result.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(result)
}

#[tauri::command]
fn open_folder_dialog() -> Result<Option<String>, String> {
    Ok(None)
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_path(path: String, is_directory: bool) -> Result<(), String> {
    if is_directory {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn check_venv_status(project_path: String) -> Result<VenvStatus, String> {
    let mut status = VenvStatus::default();
    
    if Path::new(&format!("{}/venv", project_path)).exists() {
        status.python_venv_exists = true;
    }
    if Path::new(&format!("{}/node_modules", project_path)).exists() {
        status.node_modules_exists = true;
    }
    if Path::new(&format!("{}/go.mod", project_path)).exists() {
        status.go_mod_exists = true;
    }
    if Path::new(&format!("{}/Cargo.toml", project_path)).exists() {
        status.cargo_toml_exists = true;
    }
    if Path::new(&format!("{}/requirements.txt", project_path)).exists() {
        status.requirements_exists = true;
    }
    if Path::new(&format!("{}/package.json", project_path)).exists() {
        status.package_json_exists = true;
    }
    
    Ok(status)
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct VenvStatus {
    python_venv_exists: bool,
    node_modules_exists: bool,
    go_mod_exists: bool,
    cargo_toml_exists: bool,
    requirements_exists: bool,
    package_json_exists: bool,
}

#[tauri::command]
fn create_python_venv(project_path: String) -> Result<String, String> {
    let venv_path = format!("{}/venv", project_path);
    
    if Path::new(&venv_path).exists() {
        return Ok(format!("venv already exists at {}", venv_path));
    }
    
    let output = Command::new("python3")
        .args(["-m", "venv", &venv_path])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(format!("Created venv at {}", venv_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn install_python_deps(project_path: String) -> Result<String, String> {
    let venv_path = format!("{}/venv", project_path);
    let requirements_path = format!("{}/requirements.txt", project_path);
    
    if !Path::new(&requirements_path).exists() {
        return Ok("No requirements.txt found".to_string());
    }
    
    if !Path::new(&venv_path).exists() {
        return Err("Virtual environment not found. Please create venv first.".to_string());
    }
    
    let activate_path = format!("{}/venv/bin/activate", project_path);
    let script = format!(
        "source \"{}\" && pip install -r \"{}\"",
        activate_path,
        requirements_path
    );
    
    println!("[install_python_deps] Running: {}", script);
    
    let output_result = Command::new("bash")
        .args(["-c", &script])
        .output();
    
    match output_result {
        Ok(output) => {
            if output.status.success() {
                Ok("Dependencies installed".to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                if !stderr.is_empty() {
                    Err(stderr)
                } else if !stdout.is_empty() {
                    Err(stdout)
                } else {
                    Err("Unknown error occurred".to_string())
                }
            }
        }
        Err(e) => {
            Err(format!("Failed to execute command: {}", e))
        }
    }
}

#[tauri::command]
fn install_node_deps(project_path: String) -> Result<String, String> {
    if Path::new(&format!("{}/package.json", project_path)).exists() {
        let output = Command::new("npm")
            .current_dir(&project_path)
            .args(["install"])
            .output()
            .map_err(|e| e.to_string())?;
        
        if output.status.success() {
            Ok("Node dependencies installed".to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    } else {
        Ok("No package.json found".to_string())
    }
}

#[tauri::command]
fn init_go_module(project_path: String) -> Result<String, String> {
    if Path::new(&format!("{}/go.mod", project_path)).exists() {
        return Ok("go.mod already exists".to_string());
    }
    
    let output = Command::new("go")
        .current_dir(&project_path)
        .args(["mod", "init", "ak47-ide"])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok("Go module initialized".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn init_cargo_project(project_path: String) -> Result<String, String> {
    if Path::new(&format!("{}/Cargo.toml", project_path)).exists() {
        return Ok("Cargo.toml already exists".to_string());
    }
    
    let project_name = Path::new(&project_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("project");
    
    let output = Command::new("cargo")
        .current_dir(&project_path)
        .args(["init", "--name", project_name])
        .output()
        .map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok("Cargo project initialized".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn run_file(app: AppHandle, path: String, auto_venv: bool, auto_install: bool) -> Result<(), String> {
    let extension = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let project_path = Path::new(&path)
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or("")
        .to_string();
    
    let file_name = path.split('/').last().unwrap_or(&path).to_string();

    let venv_path = format!("{}/venv", project_path);
    let venv_python = format!("{}/bin/python", venv_path);
    let requirements_path = format!("{}/requirements.txt", project_path);
    let requirements_exists = Path::new(&requirements_path).exists();
    let venv_exists = Path::new(&venv_path).exists();

    if extension == "py" {
        if !venv_exists && auto_venv {
            app.emit("terminal:output", TerminalOutput {
                line: format!("[venv] Creating virtual environment in {}...", project_path),
                is_error: false,
                is_done: false,
            }).ok();
            
            let output = Command::new("python3")
                .args(["-m", "venv", &venv_path])
                .output();
            
            if output.is_err() || !output.as_ref().map(|o| o.status.success()).unwrap_or(false) {
                let error_msg = output.as_ref()
                    .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
                    .unwrap_or_else(|e| e.to_string());
                app.emit("terminal:output", TerminalOutput {
                    line: format!("[venv] Failed to create: {}", error_msg),
                    is_error: true,
                    is_done: false,
                }).ok();
            } else {
                app.emit("terminal:output", TerminalOutput {
                    line: "[venv] Virtual environment created successfully".to_string(),
                    is_error: false,
                    is_done: false,
                }).ok();
            }
            
            if requirements_exists && auto_install {
                app.emit("terminal:output", TerminalOutput {
                    line: "[deps] Installing dependencies from requirements.txt...".to_string(),
                    is_error: false,
                    is_done: false,
                }).ok();
                
                let output = Command::new("bash")
                    .args(["-c", &format!("source \"{}/bin/activate\" && pip install -r \"{}\"", venv_path, requirements_path)])
                    .output();
                
                if output.is_err() || !output.as_ref().map(|o| o.status.success()).unwrap_or(false) {
                    app.emit("terminal:output", TerminalOutput {
                        line: "[deps] Failed to install dependencies".to_string(),
                        is_error: true,
                        is_done: false,
                    }).ok();
                } else {
                    app.emit("terminal:output", TerminalOutput {
                        line: "[deps] Dependencies installed successfully".to_string(),
                        is_error: false,
                        is_done: false,
                    }).ok();
                }
            }
        } else if !venv_exists && !auto_venv && requirements_exists {
            app.emit("terminal:output", TerminalOutput {
                line: "[warn] No virtual environment, dependencies may not be available".to_string(),
                is_error: false,
                is_done: false,
            }).ok();
        }
    }
    
    let program = match extension {
        "py" => {
            if Path::new(&venv_python).exists() {
                app.emit("terminal:output", TerminalOutput {
                    line: format!("[venv] Using {}", venv_python),
                    is_error: false,
                    is_done: false,
                }).ok();
                venv_python
            } else {
                app.emit("terminal:output", TerminalOutput {
                    line: "[system] Using system python3".to_string(),
                    is_error: false,
                    is_done: false,
                }).ok();
                "python3".to_string()
            }
        },
        "js" => "node".to_string(),
        "sh" => "bash".to_string(),
        _ => return Err(format!("Unsupported file type: {}", extension)),
    };

    app.emit("terminal:start", &path).ok();
    app.emit("terminal:output", TerminalOutput {
        line: format!("Running {}...", file_name),
        is_error: false,
        is_done: false,
    }).ok();

    let mut cmd = Command::new(&program);
    if extension == "py" {
        cmd.arg("-u");
    }
    cmd.arg(&path);
    cmd.current_dir(&project_path);
    cmd.stderr(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stdin(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let pid = child.id();
    let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
    
    if let Ok(mut guard) = CURRENT_CHILD.lock() {
        *guard = Some((pid, stdin));
    }
    
    let app_clone = app.clone();
    let path_clone = path.clone();
    let project_clone = project_path.clone();
    thread::spawn(move || {
        use std::io::BufRead;
        
        if let Some(stdout) = child.stdout.take() {
            let reader = std::io::BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    app_clone.emit("terminal:output", TerminalOutput {
                        line,
                        is_error: false,
                        is_done: false,
                    }).ok();
                }
            }
        }
        
        if let Some(stderr) = child.stderr.take() {
            let reader = std::io::BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    if line.contains("ModuleNotFoundError") || line.contains("No module named") {
                        let module_name = line.split("'")
                            .nth(1)
                            .map(|s| s.to_string())
                            .unwrap_or_default();
                        
                        if !module_name.is_empty() {
                            app_clone.emit("terminal:missing-module", MissingModule {
                                module_name,
                                project_path: project_clone,
                                run_path: path_clone,
                            }).ok();
                            return;
                        }
                    }
                    
                    app_clone.emit("terminal:output", TerminalOutput {
                        line,
                        is_error: true,
                        is_done: false,
                    }).ok();
                }
            }
        }
        
        let status = child.wait();
        if let Ok(exit_status) = status {
            app_clone.emit("terminal:output", TerminalOutput {
                line: format!("\n[Process exited with code {}]", exit_status.code().unwrap_or(-1)),
                is_error: exit_status.code().map(|c| c != 0).unwrap_or(false),
                is_done: true,
            }).ok();
        }
    });
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            read_directory,
            open_folder_dialog,
            run_file,
            kill_process,
            send_input,
            create_directory,
            delete_path,
            check_venv_status,
            create_python_venv,
            install_python_deps,
            install_node_deps,
            init_go_module,
            init_cargo_project,
            close_app,
            install_missing_module,
            install_pip_package
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
