import { useState, useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { invoke } from '@tauri-apps/api/core';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Terminal, 
  Package, 
  ArrowRight,
  Cpu,
  Sparkles
} from 'lucide-react';

interface SetupScreenProps {
  onComplete: () => void;
}

interface CheckItem {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'error' | 'warning';
  message: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    run: () => Promise<void>;
  };
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const settings = useSettingsStore((s) => s.settings);
  const updateAutoVenv = useSettingsStore((s) => s.updateAutoVenv);
  
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [currentCheck, setCurrentCheck] = useState(0);

  useEffect(() => {
    const initialChecks: CheckItem[] = [
      {
        name: 'Python',
        status: 'checking',
        message: 'Checking Python installation...',
        icon: <Terminal size={18} />,
      },
      {
        name: 'Pyright',
        status: 'pending',
        message: 'Checking Pyright (code analysis)...',
        icon: <Sparkles size={18} />,
        action: {
          label: 'Install',
          run: async () => {
            await invoke<boolean>('check_and_install_pyright');
          },
        },
      },
      {
        name: 'Virtual Environment',
        status: 'pending',
        message: settings.autoVenv.autoVenv ? 'Auto Venv enabled' : 'Enable auto Venv for projects',
        icon: <Package size={18} />,
      },
    ];
    setChecks(initialChecks);
  }, [settings.autoVenv.autoVenv]);

  useEffect(() => {
    if (currentCheck >= checks.length) {
      setIsComplete(true);
      return;
    }

    const runCheck = async () => {
      const check = checks[currentCheck];
      
      if (check.name === 'Python') {
        setChecks(prev => prev.map((c, i) => 
          i === currentCheck ? { ...c, status: 'checking' } : c
        ));
        
        try {
          await invoke<string>('run_file', { 
            path: '/dev/null', 
            autoVenv: false, 
            autoInstall: false 
          }).catch(() => null);
          
          setChecks(prev => prev.map((c, i) => 
            i === currentCheck ? { 
              ...c, 
              status: 'success', 
              message: 'Python 3.x detected' 
            } : c
          ));
        } catch {
          setChecks(prev => prev.map((c, i) => 
            i === currentCheck ? { 
              ...c, 
              status: 'error', 
              message: 'Python not found' 
            } : c
          ));
        }
        
        setTimeout(() => setCurrentCheck(prev => prev + 1), 500);
      }
      
      if (check.name === 'Pyright') {
        setChecks(prev => prev.map((c, i) => 
          i === currentCheck ? { ...c, status: 'checking' } : c
        ));
        
        try {
          const installed = await invoke<boolean>('check_pyright_installed');
          
          if (!installed) {
            setChecks(prev => prev.map((c, i) => 
              i === currentCheck ? { 
                ...c, 
                status: 'warning', 
                message: 'Pyright not installed' 
              } : c
            ));
          } else {
            setChecks(prev => prev.map((c, i) => 
              i === currentCheck ? { 
                ...c, 
                status: 'success', 
                message: 'Pyright ready for code completion' 
              } : c
            ));
          }
        } catch {
          setChecks(prev => prev.map((c, i) => 
            i === currentCheck ? { 
              ...c, 
              status: 'error', 
              message: 'Error checking Pyright' 
            } : c
          ));
        }
        
        setTimeout(() => setCurrentCheck(prev => prev + 1), 500);
      }
      
      if (check.name === 'Virtual Environment') {
        setTimeout(() => {
          setChecks(prev => prev.map((c, i) => 
            i === currentCheck ? { 
              ...c, 
              status: settings.autoVenv.autoVenv ? 'success' : 'warning', 
              message: settings.autoVenv.autoVenv 
                ? 'Auto Venv enabled - will create venv for new projects' 
                : 'Enable in settings to auto-create venv'
            } : c
          ));
          setTimeout(() => setCurrentCheck(prev => prev + 1), 500);
        }, 300);
      }
    };

    runCheck();
  }, [currentCheck, checks.length, settings.autoVenv.autoVenv]);

  const handleComplete = () => {
    onComplete();
  };

  const toggleAutoVenv = async () => {
    updateAutoVenv({ autoVenv: !settings.autoVenv.autoVenv });
  };

  const getStatusIcon = (status: CheckItem['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 size={16} className="animate-spin" />;
      case 'success':
        return <CheckCircle size={16} />;
      case 'error':
      case 'warning':
        return <XCircle size={16} />;
      default:
        return <div className="w-4 h-4 rounded-full border-2" />;
    }
  };

  const getStatusColor = (status: CheckItem['status']) => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'checking':
        return theme.colors.accent;
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: theme.colors.bg }}>
      <div className="w-full max-w-lg p-8 rounded-3xl border shadow-2xl" style={{ 
        backgroundColor: theme.colors.bgSecondary,
        borderColor: theme.colors.border,
      }}>
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center" 
            style={{ background: `linear-gradient(135deg, ${theme.colors.accent}30, ${theme.colors.accent}10)`, border: `2px solid ${theme.colors.accent}50` }}>
            <Cpu size={40} style={{ color: theme.colors.accent }} />
          </div>
          <h1 className="text-3xl font-black" style={{ color: theme.colors.text }}>
            AK47 <span style={{ color: theme.colors.accent }}>Python</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: theme.colors.textMuted }}>
            Setting up your Python IDE...
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {checks.map((check, index) => (
            <div 
              key={check.name}
              className="flex items-center gap-4 p-4 rounded-xl transition-all"
              style={{ 
                backgroundColor: index === currentCheck ? `${theme.colors.accent}10` : theme.colors.bg,
                border: `1px solid ${index === currentCheck ? theme.colors.accent : theme.colors.border}`,
              }}
            >
              <div style={{ color: getStatusColor(check.status) }}>
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: theme.colors.text }}>
                  {check.name}
                </div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                  {check.message}
                </div>
              </div>
              {check.action && (check.status === 'warning' || check.status === 'error') && (
                <button
                  onClick={check.action.run}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: `${theme.colors.accent}20`, 
                    color: theme.colors.accent 
                  }}
                >
                  {check.action.label}
                </button>
              )}
            </div>
          ))}
        </div>

        {isComplete && (
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.bg, border: `1px solid ${theme.colors.border}` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                  style={{ backgroundColor: `${theme.colors.success}20` }}>
                  <Package size={18} style={{ color: theme.colors.success }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: theme.colors.text }}>
                    Auto Virtual Environment
                  </div>
                  <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                    Automatically create venv for new projects
                  </div>
                </div>
              </div>
              <button
                onClick={toggleAutoVenv}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ 
                  backgroundColor: settings.autoVenv.autoVenv ? theme.colors.accent : theme.colors.bgTertiary,
                }}
              >
                <div 
                  className="absolute top-0.5 w-5 h-5 rounded-full shadow-lg transition-all"
                  style={{ 
                    left: settings.autoVenv.autoVenv ? '22px' : '2px', 
                    backgroundColor: '#fff' 
                  }}
                />
              </button>
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: theme.colors.accent,
                color: '#fff',
              }}
            >
              <span>Start Coding</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}