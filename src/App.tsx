import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { useThemeStore } from './stores/themeStore';
import { useEditorStore } from './stores/editorStore';
import { useSettingsStore } from './stores/settingsStore';
import { useToastStore } from './components/Toast/ToastContainer';
import { Sidebar } from './components/Sidebar';
import { CodeEditor } from './components/Editor';
import { TabBar } from './components/Tabs';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/Toast/ToastContainer';
import { LoadingScreen } from './components/Loading/LoadingScreen';
import { WelcomeScreen } from './components/Welcome/WelcomeScreen';
import { FileTab } from './types';
import { getFileName, generateId } from './utils/helpers';
import { Code2, FolderOpen, Settings as SettingsIcon, Moon, Sun, Play, Square, Keyboard, Sparkles, Cpu } from 'lucide-react';

function App() {
  const theme = useThemeStore((s) => s.currentTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const settings = useSettingsStore((s) => s.settings);
  
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const addTab = useEditorStore((s) => s.addTab);
  const updateTabContent = useEditorStore((s) => s.updateTabContent);
  const markTabDirty = useEditorStore((s) => s.markTabDirty);
  const getActiveTab = useEditorStore((s) => s.getActiveTab);
  const addToast = useToastStore((s) => s.addToast);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const activeTab = getActiveTab();
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const { setTheme: applyTheme } = useThemeStore.getState();
    applyTheme(settings.appearance.theme as Parameters<typeof applyTheme>[0]);
    
    const unlisten = listen<{ is_done: boolean }>('terminal:output', (event) => {
      if (event.payload.is_done) {
        setIsRunning(false);
      }
    });

    const unlistenMissing = listen<{ module_name: string }>('terminal:missing-module', () => {
      // Missing module events are handled in Terminal
    });
    
    return () => {
      unlisten.then(fn => fn());
      unlistenMissing.then(fn => fn());
    };
  }, []);

  const handleOpenProject = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Open Project Folder' });
      if (selected && typeof selected === 'string') {
        useEditorStore.getState().setProjectPath(selected);
        setShowWelcome(false);
      }
    } catch (e) {
      console.error('Failed to open project:', e);
    }
  }, []);

  const handleCreateProject = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Folder for New Project' });
      if (selected && typeof selected === 'string') {
        const projectName = prompt('Введите название проекта:', 'my-project');
        if (!projectName) return;
        const newPath = `${selected}/${projectName}`;
        await invoke('create_directory', { path: newPath });
        useEditorStore.getState().setProjectPath(newPath);
        setShowWelcome(false);
        addToast({ type: 'success', message: `Проект ${projectName} создан!` });
      }
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  }, [addToast]);

  const openFileDialog = useCallback(async () => {
    try {
      const selected = await open({ multiple: true, title: 'Open Python File', filters: [{ name: 'Python', extensions: ['py'] }] });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        for (const path of paths) {
          if (typeof path === 'string') handleOpenFile(path);
        }
      }
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }, []);

  const handleOpenFile = useCallback(async (path: string) => {
    try {
      const content = await invoke<string>('read_file', { path });
      const tab: FileTab = { id: generateId(), path, name: getFileName(path), content, language: 'python', isDirty: false };
      addTab(tab);
      
      if (settings.autoVenv.autoVenv && path.endsWith('.py')) {
        const projectPath = path.substring(0, path.lastIndexOf('/'));
        try {
          const venvStatus = await invoke<{ python_venv_exists: boolean; requirements_exists: boolean }>('check_venv_status', { projectPath });
          if (!venvStatus.python_venv_exists) {
            addToast({ type: 'info', message: 'Creating virtual environment...' });
            await invoke('create_python_venv', { projectPath });
            addToast({ type: 'success', message: 'Virtual environment created!' });
            if (settings.autoVenv.autoInstall && venvStatus.requirements_exists) {
              addToast({ type: 'info', message: 'Installing dependencies...' });
              await invoke('install_python_deps', { projectPath });
              addToast({ type: 'success', message: 'Dependencies installed!' });
            }
          }
        } catch (e) {
          console.error('Auto venv error:', e);
        }
      }
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  }, [addTab, settings.autoVenv, addToast]);

  const handleContentChange = useCallback((content: string) => {
    if (activeTabId) updateTabContent(activeTabId, content);
  }, [activeTabId, updateTabContent]);

  const handleSave = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab) return;
    try {
      await invoke('write_file', { path: tab.path, content: tab.content });
      markTabDirty(tab.id, false);
    } catch (e) {
      console.error('Failed to save:', e);
    }
  }, [getActiveTab, markTabDirty]);

  const handleRunCode = useCallback(async () => {
    const tab = getActiveTab();
    if (!tab) return;
    if (tab.isDirty) {
      await invoke('write_file', { path: tab.path, content: tab.content });
      markTabDirty(tab.id, false);
    }
    setIsRunning(true);
    invoke('run_file', { path: tab.path, autoVenv: settings.autoVenv.autoVenv, autoInstall: settings.autoVenv.autoInstall }).catch(e => {
      console.error('Error running file:', e);
      setIsRunning(false);
    });
  }, [getActiveTab, markTabDirty, settings.autoVenv]);

  useEffect(() => {
    if (!settings.editor.autoSave || !activeTab || !activeTab.isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      invoke('write_file', { path: activeTab.path, content: activeTab.content }).then(() => markTabDirty(activeTab.id, false)).catch(console.error);
    }, settings.editor.autoSaveDelay || 1000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [activeTab?.content, activeTab?.isDirty, settings.editor.autoSave, settings.editor.autoSaveDelay, activeTab, markTabDirty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setIsSettingsOpen(p => !p); }
      if (e.key === 'F5') { e.preventDefault(); handleRunCode(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
      if (e.ctrlKey && e.key === ',') { e.preventDefault(); setIsSettingsOpen(true); }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); openFileDialog(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        const allThemes = ['github-light', 'github-dark', 'monokai', 'dracula', 'nord', 'one-dark', 'tokyo-night', 'catppuccin', 'solarized-dark', 'gruvbox', 'ayu-dark', 'night-owl'] as const;
        const idx = allThemes.indexOf(settings.appearance.theme as typeof allThemes[number]);
        const next = allThemes[(idx + 1) % allThemes.length];
        setTheme(next);
        useSettingsStore.getState().updateAppearance({ theme: next });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunCode, handleSave, settings.appearance.theme, setTheme, openFileDialog]);

  const handleLoadingComplete = useCallback(() => setIsLoading(false), []);

  if (isLoading) return <LoadingScreen duration={2500} onComplete={handleLoadingComplete} />;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: theme.colors.bg }}>
      <div className="flex flex-1 overflow-hidden">
        {!showWelcome && <Sidebar onOpenFile={handleOpenFile} />}
        <div className={`flex-1 flex flex-col overflow-hidden ${showWelcome ? 'ml-0' : ''}`}>
          {showWelcome ? (
            <WelcomeScreen 
              onOpenProject={handleOpenProject} 
              onCreateProject={handleCreateProject} 
              onOpenSettings={() => setIsSettingsOpen(true)}
              onToggleTheme={() => {
                const t = settings.appearance.theme === 'github-dark' ? 'github-light' : 'github-dark';
                setTheme(t);
                useSettingsStore.getState().updateAppearance({ theme: t });
              }}
              isDark={settings.appearance.theme === 'github-dark'}
            />
          ) : (
            <>
              <TabBar />
              <div className="flex-1 overflow-hidden mx-2 my-1 relative">
                {activeTab && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    {!isRunning ? (
                      <button onClick={handleRunCode} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105" style={{ backgroundColor: theme.colors.success, color: '#fff', boxShadow: `0 4px 20px ${theme.colors.success}50` }}>
                        <Play size={16} className="fill-current" /> Run
                      </button>
                    ) : (
                      <button onClick={async () => { await invoke('kill_process').catch(console.error); setIsRunning(false); }} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm" style={{ backgroundColor: theme.colors.error, color: '#fff' }}>
                        <Square size={16} /> Stop
                      </button>
                    )}
                  </div>
                )}
                <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border" style={{ borderColor: theme.colors.border }}>
                  {activeTab ? (
                    <CodeEditor key={activeTab.id} content={activeTab.content} language={activeTab.language} onChange={handleContentChange} onSave={handleSave} />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: theme.editor.bg }}>
                      <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 30%, ${theme.colors.accent}20 0%, transparent 50%)` }} />
                      <div className="max-w-2xl w-full space-y-8 relative z-10">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: `linear-gradient(135deg, ${theme.colors.accent}30, ${theme.colors.accent}10)`, border: `2px solid ${theme.colors.accent}50`, boxShadow: `0 0 60px ${theme.colors.accent}30` }}>
                            <Code2 size={48} style={{ color: theme.colors.accent }} />
                          </div>
                          <h1 className="text-4xl font-black" style={{ color: theme.colors.text }}>AK47 <span style={{ color: theme.colors.accent }}>Python</span></h1>
                          <p className="text-base" style={{ color: theme.colors.textMuted }}>Fast • Lightweight • Python Only</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col items-center p-4 rounded-2xl border" style={{ backgroundColor: `${theme.colors.accent}10`, borderColor: theme.colors.border }}><Cpu size={24} style={{ color: theme.colors.accent }} /><span className="text-xs font-bold mt-2" style={{ color: theme.colors.text }}>Python 3.x</span></div>
                          <div className="flex flex-col items-center p-4 rounded-2xl border" style={{ backgroundColor: `${theme.colors.success}10`, borderColor: theme.colors.border }}><Sparkles size={24} style={{ color: theme.colors.success }} /><span className="text-xs font-bold mt-2" style={{ color: theme.colors.text }}>Auto venv</span></div>
                          <div className="flex flex-col items-center p-4 rounded-2xl border" style={{ backgroundColor: `${theme.colors.warning}10`, borderColor: theme.colors.border }}><Keyboard size={24} style={{ color: theme.colors.warning }} /><span className="text-xs font-bold mt-2" style={{ color: theme.colors.text }}>F5</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={openFileDialog} className="flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all hover:scale-[1.03]" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}><FolderOpen size={22} style={{ color: theme.colors.accent }} /></div>
                            <div className="text-left"><div className="text-sm font-bold" style={{ color: theme.colors.text }}>Open File</div><div className="text-xs" style={{ color: theme.colors.textMuted }}>Ctrl+O</div></div>
                          </button>
                          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all hover:scale-[1.03]" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.warning}20` }}><SettingsIcon size={22} style={{ color: theme.colors.warning }} /></div>
                            <div className="text-left"><div className="text-sm font-bold" style={{ color: theme.colors.text }}>Settings</div><div className="text-xs" style={{ color: theme.colors.textMuted }}>ESC</div></div>
                          </button>
                        </div>
                        <div className="flex justify-center">
                          <button onClick={() => { const t = settings.appearance.theme === 'github-dark' ? 'github-light' : 'github-dark'; setTheme(t); useSettingsStore.getState().updateAppearance({ theme: t }); }} className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }}>
                            <div>{settings.appearance.theme === 'github-dark' ? <Sun size={18} style={{ color: theme.colors.warning }} /> : <Moon size={18} style={{ color: theme.colors.accent }} />}</div>
                            <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>{settings.appearance.theme === 'github-dark' ? 'Light Mode' : 'Dark Mode'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Terminal />
            </>
          )}
        </div>
      </div>
      <StatusBar />
      <ToastContainer />
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onGoHome={() => setShowWelcome(true)} />
    </div>
  );
}

export default App;
