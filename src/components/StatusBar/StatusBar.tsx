import { useState, useEffect, useRef } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { FileCode, CheckCircle, Circle, Zap, Box, Play, Globe, Power, XCircle, Cpu, AlertTriangle, Activity } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SystemInfo {
  cpu_usage: number;
  memory_usage: number;
  memory_total_mb: number;
  memory_used_mb: number;
  is_high_load: boolean;
}

export function StatusBar() {
  const theme = useThemeStore((s) => s.currentTheme);
  const activeTab = useEditorStore((s) => s.getActiveTab());
  const settings = useSettingsStore((s) => s.settings);
  const [isRu, setIsRu] = useState(false);
  const [pyrightStatus, setPyrightStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'disabled'>('idle');
  const [pyrightInstalled, setPyrightInstalled] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [showCpuWarning, setShowCpuWarning] = useState(false);
  const cpuCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const lastWarningTime = useRef(0);

  useEffect(() => {
    if (!settings.pyright?.enabled) {
      setPyrightStatus('disabled');
      return;
    }
    invoke<boolean>('check_pyright_installed')
      .then(installed => {
        setPyrightInstalled(installed);
        setPyrightStatus(installed ? 'idle' : 'error');
      })
      .catch(() => setPyrightStatus('error'));
  }, [settings.pyright?.enabled]);

  useEffect(() => {
    if (activeTab?.path.endsWith('.py') && pyrightInstalled && settings.pyright?.enabled) {
      const timer = setTimeout(() => setPyrightStatus('ready'), 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab?.path, pyrightInstalled, settings.pyright?.enabled]);

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const info = await invoke<SystemInfo>('get_system_info');
        setSystemInfo(info);
        
        const now = Date.now();
        const shouldWarn = info.is_high_load && (now - lastWarningTime.current > 10000);
        
        if (shouldWarn) {
          setShowCpuWarning(true);
          lastWarningTime.current = now;
        }
        
        if (!info.is_high_load) {
          setShowCpuWarning(false);
        }
      } catch {
        setSystemInfo(null);
      }
    };

    cpuCheckInterval.current = setInterval(checkSystem, 3000);
    checkSystem();

    return () => {
      if (cpuCheckInterval.current) {
        clearInterval(cpuCheckInterval.current);
      }
    };
  }, []);

  const labels = {
    ready: isRu ? 'Готов' : 'Ready',
    modified: isRu ? 'Изменено' : 'Modified',
    run: isRu ? 'Запустить' : 'Run',
    closeApp: isRu ? 'Выход' : 'Exit',
    forceClose: isRu ? 'Принудительно' : 'Force Close',
    tabSize: isRu ? 'Табуляция' : 'Tab Size',
    utf8: 'UTF-8',
    cpu: isRu ? 'CPU' : 'CPU',
    mem: isRu ? 'RAM' : 'RAM',
  };

  const handleRun = async () => {
    if (!activeTab) return;
    try {
      await invoke('run_file', { 
        path: activeTab.path,
        autoVenv: settings.autoVenv.autoVenv,
        autoInstall: settings.autoVenv.autoInstall
      });
    } catch (e) {
      console.error('Error running file:', e);
    }
  };

  const handleCloseApp = async () => {
    if (!confirm(isRu ? 'Закрыть AK47 IDE?' : 'Close AK47 IDE?')) return;
    try {
      if (activeTab && activeTab.isDirty) {
        await invoke('write_file', { path: activeTab.path, content: activeTab.content });
      }
      await invoke('close_app');
    } catch (e) {
      console.error('Failed to close:', e);
    }
  };

  const handleForceClose = async () => {
    const msg = isRu 
      ? 'Это принудительно закроет IDE. Все несохранённые изменения будут потеряны. Продолжить?'
      : 'This will force close the IDE. All unsaved changes will be lost. Continue?';
    if (!confirm(msg)) return;
    
    try {
      await invoke('kill_high_cpu_processes', { threshold: 50.0 });
    } catch (e) {
      console.error('Failed to kill processes:', e);
    }
    
    try {
      await invoke('force_close_app');
    } catch (e) {
      console.error('Failed to force close:', e);
    }
  };

  const handleInstallPyright = async () => {
    try {
      setPyrightStatus('loading');
      const success = await invoke<boolean>('check_and_install_pyright');
      if (success) {
        setPyrightInstalled(true);
        setPyrightStatus('ready');
      } else {
        setPyrightStatus('error');
      }
    } catch (e) {
      console.error('Failed to install pyright:', e);
      setPyrightStatus('error');
    }
  };

  const getSystemStatusColor = () => {
    if (!systemInfo) return theme.colors.textMuted;
    if (systemInfo.is_high_load) return theme.colors.error;
    if (systemInfo.cpu_usage > 50 || systemInfo.memory_usage > 70) return theme.colors.warning;
    return theme.colors.success;
  };

  const getSystemStatusIcon = () => {
    if (!systemInfo) return <Cpu size={11} />;
    if (systemInfo.is_high_load) return <AlertTriangle size={11} className="animate-pulse" />;
    return <Activity size={11} />;
  };

  return (
    <div
      className="flex items-center justify-between px-3 text-xs"
      style={{
        backgroundColor: theme.colors.bgSecondary,
        borderTop: `1px solid ${theme.colors.border}`,
        height: 28,
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Zap size={11} style={{ color: theme.colors.accent }} />
          <span className="font-bold" style={{ color: theme.colors.text }}>AK47</span>
        </div>
        <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
        <div className="flex items-center gap-1.5">
          <Box size={11} style={{ color: theme.colors.textMuted }} />
          <span style={{ color: theme.colors.textMuted }}>Python 3.x</span>
        </div>
        
        {systemInfo && (
          <>
            <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
            <div 
              className="flex items-center gap-1.5 cursor-pointer"
              title={`CPU: ${systemInfo.cpu_usage.toFixed(1)}% | RAM: ${systemInfo.memory_usage.toFixed(1)}% (${systemInfo.memory_used_mb}/${systemInfo.memory_total_mb}MB)`}
              style={{ color: getSystemStatusColor() }}
              onClick={showCpuWarning ? handleForceClose : undefined}
            >
              {getSystemStatusIcon()}
              <span>{labels.cpu}: {systemInfo.cpu_usage.toFixed(0)}%</span>
            </div>
            <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
            <div 
              className="flex items-center gap-1.5"
              title={`RAM: ${systemInfo.memory_used_mb}MB / ${systemInfo.memory_total_mb}MB`}
              style={{ color: systemInfo.memory_usage > 80 ? theme.colors.error : theme.colors.textMuted }}
            >
              <span>{labels.mem}: {systemInfo.memory_usage.toFixed(0)}%</span>
            </div>
          </>
        )}
        
        {activeTab && (
          <>
            <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
            <div className="flex items-center gap-1.5">
              <FileCode size={11} style={{ color: theme.colors.textMuted }} />
              <span style={{ color: theme.colors.textMuted }}>{labels.utf8}</span>
            </div>
            <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
            <span style={{ color: theme.colors.textMuted }}>
              {labels.tabSize}: {settings.appearance.tabSize}
            </span>
            {activeTab?.path.endsWith('.py') && (
              <>
                <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
                <div className="flex items-center gap-1.5" title="Pyright">
                  {pyrightStatus === 'ready' ? (
                    <CheckCircle size={11} style={{ color: theme.colors.success }} />
                  ) : pyrightStatus === 'error' ? (
                    <button 
                      onClick={handleInstallPyright}
                      className="flex items-center gap-1 hover:underline"
                      title="Click to install Pyright"
                    >
                      <XCircle size={11} style={{ color: theme.colors.error }} />
                    </button>
                  ) : pyrightStatus === 'loading' ? (
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.colors.warning }} />
                  ) : (
                    <Circle size={11} style={{ color: theme.colors.textMuted }} />
                  )}
                  <span style={{ color: theme.colors.textMuted }}>Pyright</span>
                </div>
              </>
            )}
            {activeTab.isDirty && (
              <>
                <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
                <Circle size={8} className="text-yellow-500 fill-current" />
                <span style={{ color: theme.colors.textMuted }}>{labels.modified}</span>
              </>
            )}
          </>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {activeTab && (
          <button
            onClick={handleRun}
            className="flex items-center gap-1 px-2 py-0.5 rounded transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: `${theme.colors.success}20`, color: theme.colors.success }}
            title="Run Code (F5)"
          >
            <Play size={10} className="fill-current" />
            <span className="font-semibold">{labels.run}</span>
          </button>
        )}
        <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
        
        <button
          onClick={() => setIsRu(!isRu)}
          className="flex items-center gap-1 px-2 py-0.5 rounded transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: `${theme.colors.accent}20`, color: theme.colors.accent }}
        >
          <Globe size={10} />
          <span className="font-semibold">{isRu ? 'RU' : 'EN'}</span>
        </button>
        
        <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
        <div className="flex items-center gap-1.5">
          <CheckCircle size={11} style={{ color: theme.colors.success }} />
          <span style={{ color: theme.colors.textMuted }}>{labels.ready}</span>
        </div>
        <div className="w-px h-3" style={{ backgroundColor: theme.colors.border }} />
        
        {showCpuWarning ? (
          <button
            onClick={handleForceClose}
            className="flex items-center gap-1 px-2 py-0.5 rounded transition-all duration-200 hover:scale-105 animate-pulse"
            style={{ backgroundColor: `${theme.colors.error}40`, color: theme.colors.error }}
            title={labels.forceClose}
          >
            <AlertTriangle size={10} />
            <span className="font-semibold">{labels.forceClose}</span>
          </button>
        ) : (
          <button
            onClick={handleCloseApp}
            className="flex items-center gap-1 px-2 py-0.5 rounded transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: `${theme.colors.error}20`, color: theme.colors.error }}
            title={labels.closeApp}
          >
            <Power size={10} />
            <span className="font-semibold">{labels.closeApp}</span>
          </button>
        )}
      </div>
    </div>
  );
}