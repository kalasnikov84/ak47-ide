import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useEditorStore } from '../../stores/editorStore';
import { useToastStore } from '../Toast/ToastContainer';
import { TerminalIcon, ChevronUp, ChevronDown, Maximize2, Play, Trash2, Plus, Minus, Package, Sparkles, Download } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface TerminalOutput {
  line: string;
  is_error: boolean;
  is_done: boolean;
  timestamp?: number;
}

interface VenvPrompt {
  action: string;
  project_path: string;
  run_path: string;
}

interface MissingModule {
  module_name: string;
  project_path: string;
  run_path: string;
}

interface TerminalProps {
  height?: number;
  projectPath?: string;
}

const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 500;

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour12: false });
};

export function Terminal({ height: _height }: TerminalProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const projectPath = useEditorStore((s) => s.projectPath);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_HEIGHT);
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [venvPrompt, setVenvPrompt] = useState<VenvPrompt | null>(null);
  const [missingModule, setMissingModule] = useState<MissingModule | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const currentHeight = isMaximized ? 'calc(100vh - 24px)' : isCollapsed ? 36 : terminalHeight;

  const increaseHeight = () => {
    setTerminalHeight((prev) => Math.min(prev + 50, MAX_HEIGHT));
  };

  const decreaseHeight = () => {
    setTerminalHeight((prev) => Math.max(prev - 50, MIN_HEIGHT));
  };

  const handleInstallMissingModule = async () => {
    if (!missingModule || isInstalling) return;
    
    setIsInstalling(true);
    addToast({ type: 'info', message: `Installing ${missingModule.module_name}...` });
    setOutput((prev) => [...prev, { 
      line: `[pip] Installing ${missingModule.module_name}...`, 
      is_error: false, 
      is_done: false 
    }]);
    
    try {
      await invoke('install_missing_module', {
        moduleName: missingModule.module_name,
        projectPath: missingModule.project_path,
        runPath: missingModule.run_path,
      });
      addToast({ type: 'success', message: `${missingModule.module_name} installed successfully!` });
      setMissingModule(null);
    } catch (e) {
      addToast({ type: 'error', message: `Failed to install ${missingModule.module_name}` });
      setOutput((prev) => [...prev, { 
        line: `[pip] Error: ${e}`, 
        is_error: true, 
        is_done: false 
      }]);
    }
    setIsInstalling(false);
  };

  useEffect(() => {
    const unlistenOutput = listen<TerminalOutput>('terminal:output', (event) => {
      setOutput((prev) => [...prev, { ...event.payload, timestamp: Date.now() }]);
      if (event.payload.is_done) {
        setIsRunning(false);
        setMissingModule(null);
      }
    });
    
    const unlistenStart = listen('terminal:start', () => {
      setIsRunning(true);
    });
    
    const unlistenPrompt = listen<VenvPrompt>('terminal:prompt-deps', (event) => {
      setVenvPrompt(event.payload);
    });

    const unlistenMissing = listen<MissingModule>('terminal:missing-module', (event) => {
      setMissingModule(event.payload);
      setOutput((prev) => [...prev, { 
        line: `[error] ModuleNotFoundError: No module named '${event.payload.module_name}'`, 
        is_error: true, 
        is_done: false 
      }]);
    });
    
    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenStart.then((fn) => fn());
      unlistenPrompt.then((fn) => fn());
      unlistenMissing.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const clearOutput = () => {
    setOutput([]);
  };

  const handleCreateVenv = async () => {
    if (!venvPrompt) return;
    const runPath = venvPrompt.run_path;
    const projectPath = venvPrompt.project_path;
    
    setVenvPrompt(null);
    setOutput((prev) => [...prev, { 
      line: '[venv] Creating virtual environment...', 
      is_error: false, 
      is_done: false 
    }]);
    try {
      await invoke('create_python_venv', { projectPath });
      setOutput((prev) => [...prev, { 
        line: '[venv] Virtual environment created successfully!', 
        is_error: false, 
        is_done: false 
      }]);
      if (runPath) {
        await invoke('run_file', { path: runPath, autoVenv: true, autoInstall: true });
      }
    } catch (e: unknown) {
      console.error('[Terminal] create_python_venv error:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setOutput((prev) => [...prev, { 
        line: `[venv] Error: ${errorMessage}`, 
        is_error: true, 
        is_done: false 
      }]);
    }
  };

  const handleInstallDeps = async () => {
    if (!venvPrompt) return;
    const runPath = venvPrompt.run_path;
    const projectPath = venvPrompt.project_path;
    
    setVenvPrompt(null);
    setOutput((prev) => [...prev, { 
      line: '[deps] Installing dependencies from requirements.txt...', 
      is_error: false, 
      is_done: false 
    }]);
    
    try {
      const result = await invoke<string>('install_python_deps', { projectPath });
      
      setOutput((prev) => [...prev, { 
        line: result || '[deps] Dependencies installed successfully!', 
        is_error: false, 
        is_done: false 
      }]);
      
      if (runPath) {
        await invoke('run_file', { path: runPath, autoVenv: true, autoInstall: true });
      }
    } catch (e: unknown) {
      console.error('[Terminal] install_python_deps error:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setOutput((prev) => [...prev, { 
        line: `[deps] Error: ${errorMessage}`, 
        is_error: true, 
        is_done: false 
      }]);
    }
  };

  const handleInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const value = inputValue.trim();
      setInputValue('');
      
      if (value.startsWith('pip install ')) {
        const moduleName = value.replace('pip install ', '').trim();
        if (moduleName) {
          setOutput((prev) => [...prev, { line: `> ${value}`, is_error: false, is_done: false }]);
          addToast({ type: 'info', message: `Installing ${moduleName}...` });
          setOutput((prev) => [...prev, { line: `[pip] Installing ${moduleName}...`, is_error: false, is_done: false }]);
          setIsInstalling(true);
          try {
            await invoke('install_pip_package', { moduleName, projectPath: projectPath || '' });
            addToast({ type: 'success', message: `${moduleName} installed successfully!` });
            setOutput((prev) => [...prev, { line: `[pip] Successfully installed ${moduleName}`, is_error: false, is_done: false }]);
          } catch (err) {
            addToast({ type: 'error', message: `Failed to install ${moduleName}` });
            setOutput((prev) => [...prev, { line: `[pip] Error: ${err}`, is_error: true, is_done: false }]);
          }
          setIsInstalling(false);
          return;
        }
      }
      
      setOutput((prev) => [...prev, { line: `> ${value}`, is_error: false, is_done: false }]);
      
      if (isRunning) {
        try {
          await invoke('send_input', { input: value });
        } catch (err) {
          console.error('Failed to send input:', err);
        }
      }
    }
  };

  return (
    <div
      className="flex flex-col border-t transition-all duration-300 rounded-tl-xl mx-2"
      style={{
        backgroundColor: theme.colors.bg,
        borderColor: isHovered ? theme.colors.accent : theme.colors.border,
        height: currentHeight,
        minHeight: 36,
        boxShadow: isHovered ? `0 -4px 20px ${theme.colors.accent}20` : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center justify-between px-4 h-9 border-b flex-shrink-0 select-none transition-all duration-200"
        style={{ 
          borderColor: theme.colors.border, 
          backgroundColor: theme.colors.bgSecondary 
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200"
            style={{ backgroundColor: isHovered ? `${theme.colors.accent}20` : 'transparent' }}
          >
            <TerminalIcon size={14} className={isRunning ? 'animate-pulse' : ''} style={{ color: theme.colors.accent }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: theme.colors.text }}>
              OUTPUT
            </span>
          </div>
          <div 
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 ${isRunning ? 'animate-pulse' : ''}`}
            style={{ 
              backgroundColor: isRunning ? `${theme.colors.warning}30` : `${theme.colors.success}20`, 
              color: isRunning ? theme.colors.warning : theme.colors.success,
              boxShadow: `0 0 10px ${isRunning ? theme.colors.warning : theme.colors.success}30`,
            }}
          >
            <Play size={10} />
            <span>{isRunning ? 'Running...' : 'Python'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {output.length > 0 && (
            <button
              onClick={clearOutput}
              className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ color: theme.colors.textMuted, backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.bgTertiary;
                e.currentTarget.style.color = theme.colors.error;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.colors.textMuted;
              }}
              title="Clear"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={decreaseHeight}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: theme.colors.textMuted, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bgTertiary;
              e.currentTarget.style.color = theme.colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textMuted;
            }}
            title="Decrease height"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={increaseHeight}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: theme.colors.textMuted, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bgTertiary;
              e.currentTarget.style.color = theme.colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textMuted;
            }}
            title="Increase height"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: theme.colors.textMuted, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bgTertiary;
              e.currentTarget.style.color = theme.colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textMuted;
            }}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: theme.colors.textMuted, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bgTertiary;
              e.currentTarget.style.color = theme.colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textMuted;
            }}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div
          ref={outputRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm transition-all duration-300"
          style={{ backgroundColor: '#0d1117' }}
        >
          {output.length === 0 ? (
            <div className="space-y-4">
              {missingModule ? (
                <div 
                  className="mt-4 p-4 rounded-xl border"
                  style={{ 
                    backgroundColor: `${theme.colors.error}10`,
                    borderColor: theme.colors.error,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={18} style={{ color: theme.colors.error }} />
                    <span className="font-bold" style={{ color: theme.colors.error }}>
                      Module Not Found
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: theme.colors.text }}>
                    The module <span className="font-mono font-bold">{missingModule.module_name}</span> is not installed.
                  </p>
                  <button
                    onClick={handleInstallMissingModule}
                    disabled={isInstalling}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50"
                    style={{ 
                      backgroundColor: theme.colors.success,
                      color: '#fff',
                    }}
                  >
                    <Download size={16} />
                    {isInstalling ? 'Installing...' : `pip install ${missingModule.module_name}`}
                  </button>
                </div>
              ) : (
                <></>
              )}
              <div className="flex items-center gap-2">
                <span className="animate-pulse" style={{ color: theme.colors.success }}>◆</span>
                <span className="font-bold tracking-wide" style={{ color: theme.colors.accent }}>AK47 Python Terminal</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div 
                  className="flex flex-col items-center p-3 rounded-xl border"
                  style={{ backgroundColor: `${theme.colors.success}10`, borderColor: theme.colors.border }}
                >
                  <Play size={16} style={{ color: theme.colors.success }} />
                  <span className="text-xs font-bold mt-1" style={{ color: theme.colors.text }}>F5</span>
                  <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Run code</span>
                </div>
                <div 
                  className="flex flex-col items-center p-3 rounded-xl border"
                  style={{ backgroundColor: `${theme.colors.warning}10`, borderColor: theme.colors.border }}
                >
                  <span className="text-xs font-bold" style={{ color: theme.colors.warning }}>Ctrl+C</span>
                  <span className="text-xs font-bold mt-1" style={{ color: theme.colors.text }}>Stop</span>
                  <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Process</span>
                </div>
                <div 
                  className="flex flex-col items-center p-3 rounded-xl border"
                  style={{ backgroundColor: `${theme.colors.accent}10`, borderColor: theme.colors.border }}
                >
                  <TerminalIcon size={16} style={{ color: theme.colors.accent }} />
                  <span className="text-xs font-bold mt-1" style={{ color: theme.colors.text }}>Ctrl+L</span>
                  <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Clear</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2" style={{ color: '#8b949e' }}>
                <span>Output will appear here when you run your Python script</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {output.map((line, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 font-mono text-xs"
                >
                  <span className="w-8 text-right flex-shrink-0" style={{ color: '#484f58' }}>
                    {index + 1}
                  </span>
                  <span className="w-20 flex-shrink-0" style={{ color: '#484f58' }}>
                    {line.timestamp ? formatTime(line.timestamp) : '--:--:--'}
                  </span>
                  <span style={{ color: line.is_error ? theme.colors.error : '#8b949e' }}>
                    {line.is_error ? '✗' : '›'}
                  </span>
                  <span 
                    className="flex-1 whitespace-pre-wrap"
                    style={{ color: line.is_error ? theme.colors.error : '#c9d1d9' }}
                  >
                    {line.line}
                  </span>
                </div>
              ))}
              {isRunning && (
                <div className="flex items-center gap-2 mt-2">
                  <span style={{ color: theme.colors.accent }}>▊</span>
                  <span className="animate-pulse" style={{ color: theme.colors.textMuted }}>Running...</span>
                </div>
              )}
              
              {missingModule && (
                <div 
                  className="mt-4 p-4 rounded-xl border"
                  style={{ 
                    backgroundColor: `${theme.colors.error}10`,
                    borderColor: theme.colors.error,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={18} style={{ color: theme.colors.error }} />
                    <span className="font-bold" style={{ color: theme.colors.error }}>
                      Module Not Found
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: theme.colors.text }}>
                    The module <span className="font-mono font-bold">{missingModule.module_name}</span> is not installed.
                  </p>
                  <button
                    onClick={handleInstallMissingModule}
                    disabled={isInstalling}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50"
                    style={{ 
                      backgroundColor: theme.colors.success,
                      color: '#fff',
                    }}
                  >
                    <Download size={16} />
                    {isInstalling ? 'Installing...' : `pip install ${missingModule.module_name}`}
                  </button>
                </div>
              )}

              {venvPrompt && (
                <div 
                  className="mt-4 p-4 rounded-xl border"
                  style={{ 
                    backgroundColor: `${theme.colors.accent}10`,
                    borderColor: theme.colors.accent,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={18} style={{ color: theme.colors.accent }} />
                    <span className="font-bold" style={{ color: theme.colors.text }}>
                      Virtual Environment Setup
                    </span>
                  </div>
                  <div className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
                    {venvPrompt.action === 'install_deps' 
                      ? 'Dependencies from requirements.txt are not installed. Install them now?'
                      : 'No virtual environment found. Create one for this project?'}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={venvPrompt.action === 'install_deps' ? handleInstallDeps : handleCreateVenv}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
                      style={{ 
                        backgroundColor: theme.colors.success,
                        color: '#fff',
                      }}
                    >
                      <Sparkles size={14} />
                      {venvPrompt.action === 'install_deps' ? 'Install Dependencies' : 'Create venv'}
                    </button>
                    <button
                      onClick={() => setVenvPrompt(null)}
                      className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105"
                      style={{ 
                        backgroundColor: theme.colors.bgTertiary,
                        color: theme.colors.textMuted,
                      }}
                    >
                      Later
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: '#30363d' }}>
            <span style={{ color: theme.colors.accent }}>&gt;</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInput}
              placeholder="Type 'pip install <module>' to install packages..."
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm"
              style={{ color: '#c9d1d9', caretColor: theme.colors.accent }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
