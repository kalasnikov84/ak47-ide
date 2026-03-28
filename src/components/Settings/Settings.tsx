import { useThemeStore } from '../../stores/themeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { themes, ThemeKey } from '../../themes';
import { FONT_FAMILIES } from '../../types';
import { X, Terminal, Keyboard, Sliders, Moon, Zap, Package, FileCode, Save } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
}

export function Settings({ isOpen, onClose, onGoHome }: SettingsProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const settings = useSettingsStore((s) => s.settings);
  const updateAppearance = useSettingsStore((s) => s.updateAppearance);
  const updateEditor = useSettingsStore((s) => s.updateEditor);
  const updateAutoVenv = useSettingsStore((s) => s.updateAutoVenv);
  const setTheme = useThemeStore((s) => s.setTheme);

  if (!isOpen) return null;

  const themeList: ThemeKey[] = ['github-light', 'github-dark', 'monokai', 'dracula', 'nord', 'one-dark', 'tokyo-night', 'catppuccin', 'solarized-dark', 'gruvbox', 'ayu-dark', 'night-owl'];

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-colors duration-200"
      style={{ 
        backgroundColor: checked ? theme.colors.accent : theme.colors.bgTertiary,
      }}
    >
      <div 
        className="absolute top-0.5 w-5 h-5 rounded-full shadow-lg transition-all duration-200"
        style={{ left: checked ? '22px' : '2px', backgroundColor: checked ? '#fff' : theme.colors.textMuted }}
      />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: theme.colors.bg }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${theme.colors.accent}20` }}
            >
              <Sliders size={20} style={{ color: theme.colors.accent }} />
            </div>
            <div>
              <h2 className="text-xl font-black" style={{ color: theme.colors.text }}>
                AK47 Settings
              </h2>
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                Customize your Python IDE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[--bg-tertiary] transition-colors"
            style={{ color: theme.colors.textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="p-6 space-y-8">
            
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                  <Moon size={14} style={{ color: theme.colors.accent }} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                  Appearance
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: theme.colors.text }}>
                    Color Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {themeList.map((key) => {
                      const t = themes[key];
                      const isSelected = settings.appearance.theme === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setTheme(key);
                            updateAppearance({ theme: key });
                          }}
                          className="relative overflow-hidden p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02]"
                          style={{
                            backgroundColor: t.editor.bg,
                            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                            boxShadow: isSelected ? `0 0 0 2px ${theme.colors.accent}40` : 'none',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                            <span className="text-xs font-bold" style={{ color: t.editor.text }}>
                              {t.displayName}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: t.colors.bg }} />
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: t.colors.text }} />
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: t.colors.accent }} />
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: t.colors.error }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm font-medium" style={{ color: theme.colors.text }}>
                      Font Size
                      <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: theme.colors.bgTertiary, color: theme.colors.accent }}>
                        {settings.appearance.fontSize}px
                      </span>
                    </label>
                    <input
                      type="range"
                      min={12}
                      max={24}
                      value={settings.appearance.fontSize}
                      onChange={(e) => updateAppearance({ fontSize: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ backgroundColor: theme.colors.bgTertiary, accentColor: theme.colors.accent }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                      Tab Size
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map((size) => (
                        <button
                          key={size}
                          onClick={() => updateAppearance({ tabSize: size })}
                          className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                          style={{
                            backgroundColor: settings.appearance.tabSize === size ? theme.colors.accent : theme.colors.bgSecondary,
                            color: settings.appearance.tabSize === size ? '#fff' : theme.colors.text,
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: theme.colors.text }}>
                    Font Family
                  </label>
                  <select
                    value={settings.appearance.fontFamily}
                    onChange={(e) => updateAppearance({ fontFamily: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl text-sm font-medium border transition-all"
                    style={{ 
                      backgroundColor: theme.colors.bgSecondary, 
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    {FONT_FAMILIES.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font, backgroundColor: theme.colors.bgSecondary, color: theme.colors.text }}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                  <FileCode size={14} style={{ color: theme.colors.accent }} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                  Editor
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[--bg-tertiary] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.colors.success}20` }}>
                      <Zap size={18} style={{ color: theme.colors.success }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: theme.colors.text }}>
                        Auto Save
                      </div>
                      <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                        Automatically save changes
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.editor.autoSave} onChange={() => updateEditor({ autoSave: !settings.editor.autoSave })} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[--bg-tertiary] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.colors.warning}20` }}>
                      <Package size={18} style={{ color: theme.colors.warning }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: theme.colors.text }}>
                        Minimap
                      </div>
                      <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                        Code overview on the right
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.appearance.minimap} onChange={() => updateAppearance({ minimap: !settings.appearance.minimap })} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                  <Terminal size={14} style={{ color: theme.colors.accent }} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                  Python Environment
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[--bg-tertiary] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                      <Zap size={18} style={{ color: theme.colors.accent }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: theme.colors.text }}>
                        Auto Virtual Env
                      </div>
                      <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                        Auto-create venv/ when opening a new Python project
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.autoVenv.autoVenv} onChange={() => updateAutoVenv({ autoVenv: !settings.autoVenv.autoVenv })} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl hover:bg-[--bg-tertiary] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.colors.success}20` }}>
                      <Package size={18} style={{ color: theme.colors.success }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: theme.colors.text }}>
                        Auto Install deps
                      </div>
                      <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                        Automatically install from requirements.txt when venv is created
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch checked={settings.autoVenv.autoInstall} onChange={() => updateAutoVenv({ autoInstall: !settings.autoVenv.autoInstall })} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}>
                  <Keyboard size={14} style={{ color: theme.colors.accent }} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                  Shortcuts
                </h3>
              </div>
              
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: theme.colors.border }}>
                {[
                  { action: 'Run Code', key: 'F5' },
                  { action: 'Save', key: 'Ctrl+S' },
                  { action: 'Open File', key: 'Ctrl+O' },
                  { action: 'Settings', key: 'ESC / Ctrl+,' },
                  { action: 'Toggle Theme', key: 'Ctrl+Shift+T' },
                ].map((item, index) => (
                  <div 
                    key={item.action}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ 
                      backgroundColor: index % 2 === 0 ? 'transparent' : theme.colors.bgSecondary,
                      borderBottom: index < 4 ? `1px solid ${theme.colors.border}` : 'none',
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
                      {item.action}
                    </span>
                    <kbd 
                      className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono"
                      style={{ backgroundColor: theme.colors.bgTertiary, color: theme.colors.text }}
                    >
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </section>
          </div>
          
          <div className="px-6 pb-6">
            <button
              onClick={() => { onClose(); if (onGoHome) onGoHome(); }}
              className="w-full py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
              style={{ 
                backgroundColor: 'transparent',
                borderColor: theme.colors.error,
                color: theme.colors.error,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.colors.error}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Save size={16} />
              Save and Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
