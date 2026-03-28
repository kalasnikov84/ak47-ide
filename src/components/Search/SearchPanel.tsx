import { useState, useEffect, useRef, useCallback } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { Search, X, Replace, ReplaceAll } from 'lucide-react';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string, options: SearchOptions) => void;
  isGlobal?: boolean;
}

interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  replace?: string;
}

export function SearchPanel({ isOpen, onClose, onSearch, isGlobal = false }: SearchPanelProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const [query, setQuery] = useState('');
  const [replace, setReplace] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    onSearch?.(query, { matchCase, wholeWord, useRegex, replace });
  }, [query, matchCase, wholeWord, useRegex, replace, onSearch]);

  const toggleButton = (value: boolean, setter: (v: boolean) => void) => {
    setter(!value);
  };

  if (!isOpen) return null;

  return (
    <div
      className="border-b animate-slideIn"
      style={{ 
        backgroundColor: theme.colors.bgSecondary, 
        borderColor: theme.colors.border 
      }}
    >
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.colors.textMuted }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={isGlobal ? "Search in all files..." : "Find..."}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{ 
                backgroundColor: theme.colors.bg,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
              }}
            />
          </div>
          <button
            onClick={handleSearch}
            className="p-2 rounded-lg transition-colors hover:opacity-90"
            style={{ 
              backgroundColor: theme.colors.accent,
              color: '#fff',
            }}
          >
            <Search size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[--bg-tertiary]"
            style={{ color: theme.colors.textMuted }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => toggleButton(matchCase, setMatchCase)}
              className="px-2.5 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ 
                backgroundColor: matchCase ? theme.colors.accent : theme.colors.bg,
                color: matchCase ? '#fff' : theme.colors.textMuted,
                border: `1px solid ${matchCase ? theme.colors.accent : theme.colors.border}`,
              }}
              title="Match Case"
            >
              Aa
            </button>
            <button
              onClick={() => toggleButton(wholeWord, setWholeWord)}
              className="px-2.5 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ 
                backgroundColor: wholeWord ? theme.colors.accent : theme.colors.bg,
                color: wholeWord ? '#fff' : theme.colors.textMuted,
                border: `1px solid ${wholeWord ? theme.colors.accent : theme.colors.border}`,
              }}
              title="Whole Word"
            >
              "w"
            </button>
            <button
              onClick={() => toggleButton(useRegex, setUseRegex)}
              className="px-2.5 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ 
                backgroundColor: useRegex ? theme.colors.accent : theme.colors.bg,
                color: useRegex ? '#fff' : theme.colors.textMuted,
                border: `1px solid ${useRegex ? theme.colors.accent : theme.colors.border}`,
              }}
              title="Use Regex"
            >
              .*
            </button>
          </div>

          {!isGlobal && (
            <div className="flex items-center gap-2 flex-1">
              <Replace size={14} style={{ color: theme.colors.textMuted }} />
              <input
                type="text"
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder="Replace with..."
                className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                style={{ 
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                }}
              />
              <button
                className="p-1.5 rounded-lg transition-colors hover:bg-[--bg-tertiary]"
                style={{ color: theme.colors.textMuted }}
                title="Replace"
              >
                <Replace size={14} />
              </button>
              <button
                className="p-1.5 rounded-lg transition-colors hover:bg-[--bg-tertiary]"
                style={{ color: theme.colors.textMuted }}
                title="Replace All"
              >
                <ReplaceAll size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
