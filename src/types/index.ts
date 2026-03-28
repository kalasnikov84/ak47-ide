export interface FileTab {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface ProjectSettings {
  autoVenv: boolean;
  autoInstall: boolean;
}

export interface Settings {
  appearance: {
    theme: string;
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    lineHeight: number;
    wordWrap: boolean;
    minimap: boolean;
  };
  editor: {
    autoSave: boolean;
    autoSaveDelay: number;
    formatOnSave: boolean;
    bracketPairColorization: boolean;
  };
  autoVenv: ProjectSettings;
  shortcuts: Record<string, string>;
  recentProjects: string[];
}

export type ThemeName = 'github-light' | 'github-dark' | 'monokai' | 'dracula' | 'nord' | 'one-dark' | 'tokyo-night' | 'catppuccin' | 'solarized-dark' | 'gruvbox' | 'ayu-dark' | 'night-owl';

export const FONT_FAMILIES = [
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'Cascadia Code',
  'Consolas',
  'Monaco',
  'Menlo',
  'Ubuntu Mono',
  'Roboto Mono',
  'Anonymous Pro',
];

export interface Theme {
  name: string;
  displayName: string;
  colors: {
    bg: string;
    bgSecondary: string;
    bgTertiary: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    border: string;
    error: string;
    warning: string;
    success: string;
  };
  editor: {
    bg: string;
    text: string;
    selection: string;
    cursor: string;
    lineNumber: string;
    lineNumberActive: string;
    gutter: string;
  };
}
