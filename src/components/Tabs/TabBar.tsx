import { useThemeStore } from '../../stores/themeStore';
import { useEditorStore } from '../../stores/editorStore';
import { getFileName } from '../../utils/helpers';
import { X, FileCode, Circle } from 'lucide-react';

export function TabBar() {
  const theme = useThemeStore((s) => s.currentTheme);
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center overflow-x-auto mx-2 mt-1 rounded-t-lg"
      style={{
        backgroundColor: theme.colors.bgSecondary,
        height: 38,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        
        return (
          <div
            key={tab.id}
            className="group flex items-center gap-2 h-full px-4 cursor-pointer transition-all duration-150"
            style={{
              backgroundColor: isActive ? theme.colors.bg : 'transparent',
              borderBottom: isActive ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
              minWidth: 140,
              maxWidth: 200,
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <FileCode 
              size={14} 
              style={{ 
                color: isActive ? '#3FB950' : theme.colors.textMuted 
              }} 
            />
            <span
              className="text-sm truncate"
              style={{ 
                color: isActive ? theme.colors.text : theme.colors.textMuted,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {getFileName(tab.name)}
            </span>
            
            {tab.isDirty && (
              <Circle 
                size={6} 
                className="fill-current animate-pulse"
                style={{ color: theme.colors.warning }} 
              />
            )}
            
            <button
              className="ml-auto p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110 active:scale-90"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X size={14} style={{ color: theme.colors.textMuted }} />
            </button>
          </div>
        );
      })}
      
      <div 
        className="flex-1 h-full"
        style={{ borderBottom: `1px solid ${theme.colors.border}` }}
      />
    </div>
  );
}
