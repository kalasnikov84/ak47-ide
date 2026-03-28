import { create } from 'zustand';
import { FileTab } from '../types';

interface EditorState {
  tabs: FileTab[];
  activeTabId: string | null;
  projectPath: string | null;
  openTabs: (tabs: FileTab[]) => void;
  addTab: (tab: FileTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string) => void;
  markTabDirty: (id: string, isDirty: boolean) => void;
  getActiveTab: () => FileTab | undefined;
  setProjectPath: (path: string | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  projectPath: null,

  openTabs: (tabs: FileTab[]) => {
    const existingIds = get().tabs.map(t => t.id);
    const newTabs = tabs.filter(t => !existingIds.includes(t.id));
    set((state) => ({
      tabs: [...state.tabs, ...newTabs],
      activeTabId: newTabs.length > 0 ? newTabs[newTabs.length - 1].id : state.activeTabId,
    }));
  },

  addTab: (tab: FileTab) => {
    const existing = get().tabs.find(t => t.id === tab.id);
    if (existing) {
      set({ activeTabId: tab.id });
    } else {
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    }
  },

  closeTab: (id: string) => {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id);
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;
      
      if (state.activeTabId === id) {
        if (newTabs.length === 0) {
          newActiveId = null;
        } else if (index >= newTabs.length) {
          newActiveId = newTabs[newTabs.length - 1].id;
        } else {
          newActiveId = newTabs[index].id;
        }
      }
      
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  updateTabContent: (id: string, content: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, content, isDirty: true } : t
      ),
    }));
  },

  updateTabLanguage: (id: string, language: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, language } : t
      ),
    }));
  },

  markTabDirty: (id: string, isDirty: boolean) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, isDirty } : t
      ),
    }));
  },

  getActiveTab: () => {
    const state = get();
    return state.tabs.find((t) => t.id === state.activeTabId);
  },

  setProjectPath: (path: string | null) => {
    set({ projectPath: path });
  },
}));
