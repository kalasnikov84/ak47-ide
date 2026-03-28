import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Settings } from '../types';

const defaultSettings: Settings = {
  appearance: {
    theme: 'ayu-dark',
    fontSize: 15,
    fontFamily: 'JetBrains Mono',
    tabSize: 4,
    lineHeight: 1.6,
    wordWrap: false,
    minimap: false,
  },
  editor: {
    autoSave: true,
    autoSaveDelay: 1000,
    formatOnSave: false,
    bracketPairColorization: true,
  },
  autoVenv: {
    autoVenv: false,
    autoInstall: false,
  },
  shortcuts: {
    save: 'Ctrl+S',
    run: 'F5',
    newTab: 'Ctrl+N',
    closeTab: 'Ctrl+W',
    findInFiles: 'Ctrl+Shift+F',
    find: 'Ctrl+F',
    settings: 'ESC',
    toggleTheme: 'Ctrl+Shift+T',
  },
  recentProjects: [],
};

interface SettingsState {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  updateAppearance: (partial: Partial<Settings['appearance']>) => void;
  updateEditor: (partial: Partial<Settings['editor']>) => void;
  updateAutoVenv: (partial: Partial<Settings['autoVenv']>) => void;
  addRecentProject: (path: string) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (partial: Partial<Settings>) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
      },

      updateAppearance: (partial: Partial<Settings['appearance']>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: { ...state.settings.appearance, ...partial },
          },
        }));
      },

      updateEditor: (partial: Partial<Settings['editor']>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            editor: { ...state.settings.editor, ...partial },
          },
        }));
      },

      updateAutoVenv: (partial: Partial<Settings['autoVenv']>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            autoVenv: { ...state.settings.autoVenv, ...partial },
          },
        }));
      },

      addRecentProject: (path: string) => {
        set((state) => {
          const filtered = state.settings.recentProjects.filter((p) => p !== path);
          return {
            settings: {
              ...state.settings,
              recentProjects: [path, ...filtered].slice(0, 10),
            },
          };
        });
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: 'ak47-ide-settings',
    }
  )
);
