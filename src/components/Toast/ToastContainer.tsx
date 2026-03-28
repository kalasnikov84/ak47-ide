import { create } from 'zustand';
import { X, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export type ToastType = 'success' | 'error' | 'info' | 'action';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export function ToastContainer() {
  const theme = useThemeStore((s) => s.currentTheme);
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-in"
          style={{
            backgroundColor: theme.colors.bg,
            borderColor: toast.type === 'error' ? theme.colors.error : toast.type === 'success' ? theme.colors.success : theme.colors.accent,
            boxShadow: `0 4px 20px ${toast.type === 'error' ? theme.colors.error : toast.type === 'success' ? theme.colors.success : theme.colors.accent}30`,
          }}
        >
          {toast.type === 'success' && <CheckCircle size={18} style={{ color: theme.colors.success }} />}
          {toast.type === 'error' && <AlertCircle size={18} style={{ color: theme.colors.error }} />}
          {toast.type === 'info' && <Info size={18} style={{ color: theme.colors.accent }} />}
          {toast.type === 'action' && <Sparkles size={18} style={{ color: theme.colors.warning }} />}
          
          <span className="flex-1 text-sm font-medium" style={{ color: theme.colors.text }}>
            {toast.message}
          </span>
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{ backgroundColor: theme.colors.accent, color: '#fff' }}
            >
              {toast.action.label}
            </button>
          )}
          
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded-lg transition-all hover:bg-white/10"
            style={{ color: theme.colors.textMuted }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
