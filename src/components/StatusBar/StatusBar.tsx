import { useState } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useEditorStore } from '../../stores/editorStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { FileCode, CheckCircle, Circle, Zap, Box, Play, Globe, Power } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export function StatusBar() {
  const theme = useThemeStore((s) => s.currentTheme);
  const activeTab = useEditorStore((s) => s.getActiveTab());
  const settings = useSettingsStore((s) => s.settings);
  const [isRu, setIsRu] = useState(false);

  const labels = {
    ready: isRu ? 'Готов' : 'Ready',
    modified: isRu ? 'Изменено' : 'Modified',
    run: isRu ? 'Запустить' : 'Run',
    closeApp: isRu ? 'Выход' : 'Exit',
    tabSize: isRu ? 'Табуляция' : 'Tab Size',
    utf8: 'UTF-8',
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
        
        <button
          onClick={handleCloseApp}
          className="flex items-center gap-1 px-2 py-0.5 rounded transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: `${theme.colors.error}20`, color: theme.colors.error }}
          title={labels.closeApp}
        >
          <Power size={10} />
          <span className="font-semibold">{labels.closeApp}</span>
        </button>
      </div>
    </div>
  );
}
