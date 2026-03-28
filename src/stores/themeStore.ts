import { create } from 'zustand';
import { Theme } from '../types';
import { themes, githubDark, ThemeKey } from '../themes';

interface ThemeState {
  currentTheme: Theme;
  customThemes: Record<string, Theme>;
  setTheme: (themeKey: ThemeKey | string) => void;
  setCustomTheme: (key: string, theme: Theme) => void;
  deleteCustomTheme: (key: string) => void;
  getAllThemes: () => Record<string, Theme>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: githubDark,
  customThemes: {},

  setTheme: (themeKey: ThemeKey | string) => {
    const allThemes = get().getAllThemes();
    const theme = allThemes[themeKey];
    if (theme) {
      set({ currentTheme: theme });
      applyThemeToDOM(theme);
    }
  },

  setCustomTheme: (key: string, theme: Theme) => {
    set((state) => ({
      customThemes: { ...state.customThemes, [key]: theme },
    }));
    applyThemeToDOM(theme);
  },

  deleteCustomTheme: (key: string) => {
    set((state) => {
      const { [key]: _, ...rest } = state.customThemes;
      return { customThemes: rest };
    });
  },

  getAllThemes: () => {
    return { ...themes, ...get().customThemes };
  },
}));

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty('--bg', theme.colors.bg);
  root.style.setProperty('--bg-secondary', theme.colors.bgSecondary);
  root.style.setProperty('--bg-tertiary', theme.colors.bgTertiary);
  root.style.setProperty('--text', theme.colors.text);
  root.style.setProperty('--text-muted', theme.colors.textMuted);
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--accent-hover', theme.colors.accentHover);
  root.style.setProperty('--border', theme.colors.border);
  root.style.setProperty('--error', theme.colors.error);
  root.style.setProperty('--warning', theme.colors.warning);
  root.style.setProperty('--success', theme.colors.success);
  root.style.setProperty('--editor-bg', theme.editor.bg);
  root.style.setProperty('--editor-text', theme.editor.text);
  root.style.setProperty('--editor-selection', theme.editor.selection);
  root.style.setProperty('--editor-cursor', theme.editor.cursor);
  root.style.setProperty('--editor-line-number', theme.editor.lineNumber);
  root.style.setProperty('--editor-gutter', theme.editor.gutter);
}

export function initializeTheme(themeKey: string) {
  const allThemes = { ...themes };
  const theme = allThemes[themeKey as ThemeKey] || githubDark;
  applyThemeToDOM(theme);
  useThemeStore.setState({ currentTheme: theme });
}
