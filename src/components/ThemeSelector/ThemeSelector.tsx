import { useThemeStore } from '../../stores/themeStore';
import { themes, ThemeKey } from '../../themes';
import { Check } from 'lucide-react';

const themeList: ThemeKey[] = ['github-light', 'github-dark', 'monokai', 'dracula', 'nord', 'one-dark'];

export function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-2">
      {themeList.map((key) => {
        const theme = themes[key];
        const isActive = currentTheme.name === key;
        
        return (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className="relative w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 group"
            style={{
              backgroundColor: theme.editor.bg,
              borderColor: isActive ? theme.colors.accent : theme.colors.border,
              boxShadow: isActive ? `0 0 0 2px ${theme.colors.accent}40` : 'none',
            }}
            title={theme.displayName}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {isActive && (
                <Check 
                  size={12} 
                  style={{ color: '#fff' }}
                />
              )}
            </div>
            {!isActive && (
              <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
