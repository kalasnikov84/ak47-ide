import { useEffect, useState, useMemo } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { Sparkles, Code2, Loader2, Zap } from 'lucide-react';

interface LoadingScreenProps {
  duration?: number;
  onComplete: () => void;
}

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 3,
    size: Math.random() * 10 + 5,
  }));
}

export function LoadingScreen({ duration = 3000, onComplete }: LoadingScreenProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [isExiting, setIsExiting] = useState(false);

  const particles = useMemo(() => generateParticles(20), []);

  useEffect(() => {
    const statuses = [
      'Loading components...',
      'Building workspace...',
      'Preparing terminal...',
      'Loading themes...',
      'Configuring editor...',
      'Almost ready...',
    ];

    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += Math.random() * 10 + 5;
      if (progressValue >= 100) {
        progressValue = 100;
        clearInterval(interval);
      }
      setProgress(progressValue);
    }, 400);

    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      if (statusIndex < statuses.length) {
        setStatus(statuses[statusIndex]);
        statusIndex++;
      }
    }, 400);

    const timeout = setTimeout(() => {
      setProgress(100);
      setStatus('Ready!');
      setIsExiting(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    }, duration);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
      clearTimeout(timeout);
    };
  }, [duration, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.bg} 0%, ${theme.colors.bgSecondary} 100%)`,
        animation: isExiting ? 'fadeOut 0.6s ease-out forwards' : 'fadeIn 0.5s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.05); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
          50% { transform: translateY(-10px) rotate(180deg); opacity: 0.2; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 40px ${theme.colors.accent}40, 0 0 80px ${theme.colors.accent}20; }
          50% { box-shadow: 0 0 60px ${theme.colors.accent}60, 0 0 100px ${theme.colors.accent}30; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `particleFloat 3s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          >
            <Sparkles size={p.size} style={{ color: theme.colors.accent, opacity: 0.15 }} />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-10">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accent}dd 100%)`,
              animation: 'glow 2s ease-in-out infinite',
            }}
          >
            <Code2 size={48} className="text-white animate-pulse" style={{ animationDuration: '2s' }} />
          </div>
          <div
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: theme.colors.success,
              animation: 'float 2s ease-in-out infinite',
            }}
          >
            <Zap size={16} className="text-white" />
          </div>
        </div>

        <h1
          className="text-4xl font-bold mb-2 tracking-wide"
          style={{
            color: theme.colors.text,
            animation: 'glow 3s ease-in-out infinite',
          }}
        >
          AK47 IDE
        </h1>

        <p className="text-sm mb-8" style={{ color: theme.colors.textMuted, animation: 'pulse 2s ease-in-out infinite' }}>
          Python Development Environment
        </p>

        <div className="w-64 h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: theme.colors.bgSecondary }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.success})`,
              boxShadow: `0 0 15px ${theme.colors.accent}`,
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>

        <div className="flex items-center gap-2" style={{ color: theme.colors.textMuted }}>
          <Loader2 size={14} className="animate-spin" style={{ animationDuration: '1.5s' }} />
          <span className="text-xs">{status}</span>
        </div>
      </div>

      <div className="absolute bottom-8 text-xs" style={{ color: theme.colors.textMuted }}>
        Version 0.1.0 • Made with ⚡
      </div>
    </div>
  );
}
