import { useState, useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { FolderPlus, FolderOpen, ChevronLeft, ChevronRight, Play, Terminal, Code2, Package, Settings, FolderTree, Zap, FileCode, Sparkles, Moon, Sun, Wand2, ExternalLink, Heart, Book, Send, Coins, Copy, Keyboard } from 'lucide-react';

interface WelcomeScreenProps {
  onOpenProject: () => void;
  onCreateProject: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

const infoCards = [
  { icon: FolderOpen, title: 'Открытие проекта', content: 'Нажмите "Открыть проект" и выберите папку с вашим Python проектом. Все файлы отобразятся в боковой панели.' },
  { icon: FileCode, title: 'Редактор кода', content: 'Открывайте файлы кликом. Поддержка Python с подсветкой синтаксиса. Сохраняйте через Ctrl+S или кнопку.' },
  { icon: Play, title: 'Запуск кода', content: 'Нажмите F5 или кнопку Run для запуска. Автоматически используется виртуальное окружение venv.' },
  { icon: Terminal, title: 'Встроенный терминал', content: 'Смотрите вывод программы в терминале. Вводите "pip install <модуль>" для установки библиотек.' },
  { icon: Package, title: 'Управление библиотеками', content: 'При ошибке ModuleNotFoundError появится кнопка для установки. Или введите "pip install {название}" в терминале.' },
  { icon: Settings, title: 'Настройки', content: 'Нажмите ESC для открытия настроек. Измените тему, шрифт, интервал автосохранения.' },
  { icon: FolderTree, title: 'Работа с файлами', content: 'Правый клик по папке в.sidebar для создания новых файлов и папок. Удаление - там же.' },
  { icon: Zap, title: 'Авто-окружение', content: 'При первом запуске .py файла автоматически создаётся venv. Зависимости из requirements.txt установятся сами.' },
];

const docs = [
  { name: 'Python', url: 'https://docs.python.org/3/', color: '#3776AB' },
  { name: 'FastAPI', url: 'https://fastapi.tiangolo.com/', color: '#009688' },
  { name: 'Django', url: 'https://docs.djangoproject.com/', color: '#092E20' },
  { name: 'Aiogram', url: 'https://docs.aiogram.dev/', color: '#FF612F' },
  { name: 'Flask', url: 'https://flask.palletsprojects.com/', color: '#000000' },
  { name: 'Pandas', url: 'https://pandas.pydata.org/docs/', color: '#150458' },
  { name: 'NumPy', url: 'https://numpy.org/doc/', color: '#013243' },
  { name: 'Requests', url: 'https://docs.python-requests.org/', color: '#002654' },
];

const links = [
  { icon: Send, label: 'Канал проекта', url: 'https://t.me/web9project', color: '#0088cc' },
  { icon: Send, label: 'Основатель', url: 'https://t.me/kalasnikov_web9', color: '#0088cc' },
  { icon: Send, label: 'GitHub', url: 'https://github.com/kalasnikov84', color: '#333' },
];

const cryptoAddresses = [
  { name: 'Bitcoin (BTC)', address: 'bc1qrdsqr9wdg05vrkdylpuy8t45e2v6wqfhs3dhk6', color: '#F7931A' },
  { name: 'USDT (TRC20)', address: 'TK8hQwsqij7gKAi68LbMKL1X2EyJpioK4Z', color: '#26A17B' },
  { name: 'TON', address: 'UQA_hnEqO3z1e1n4LkgR_gv92YhxUHoJ-V1Jc2FiE198bgcK', color: '#0098EE' },
];

interface Comet {
  id: number;
  x: number;
  delay: number;
  duration: number;
}

function generateComets(count: number): Comet[] {
  return Array.from({ length: count }, (_, i) => ({ id: i, x: Math.random() * 100, delay: Math.random() * 10, duration: 4 + Math.random() * 3 }));
}

function Comet({ comet, color }: { comet: Comet; color: string }) {
  return (
    <div className="absolute pointer-events-none" style={{ left: `${comet.x}%`, top: '-10%', animation: `fall ${comet.duration}s linear infinite`, animationDelay: `${comet.delay}s` }}>
      <div style={{ display: 'flex', alignItems: 'center', transform: 'rotate(15deg)' }}>
        <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#fff', boxShadow: `0 0 8px 2px ${color}, 0 0 15px 4px ${color}80` }} />
        <div style={{ width: 20, height: 1, marginLeft: 2, background: `linear-gradient(to right, ${color}80, transparent)`, borderRadius: 1 }} />
      </div>
    </div>
  );
}

export function WelcomeScreen({ onOpenProject, onCreateProject, onOpenSettings, onToggleTheme, isDark }: WelcomeScreenProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const [currentCard, setCurrentCard] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [comets] = useState(() => generateComets(5));

  const nextCard = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => { setCurrentCard((prev) => (prev + 1) % infoCards.length); setIsAnimating(false); }, 150);
  };

  const prevCard = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => { setCurrentCard((prev) => (prev - 1 + infoCards.length) % infoCards.length); setIsAnimating(false); }, 150);
  };

  useEffect(() => { const interval = setInterval(() => { if (!isAnimating) nextCard(); }, 5000); return () => clearInterval(interval); }, [isAnimating]);

  const copyAddress = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const Icon = infoCards[currentCard].icon;

  return (
    <div className="h-full flex items-center justify-center p-8 relative overflow-hidden" style={{ backgroundColor: theme.colors.bg }}>
      <style>{`
        @keyframes fall { 0% { transform: translateY(-20px) rotate(15deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(120vh) rotate(15deg); opacity: 0; } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 80px ${theme.colors.accent}50; } 50% { box-shadow: 0 0 120px ${theme.colors.accent}70; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {effectsEnabled && comets.map((comet) => <Comet key={comet.id} comet={comet} color={theme.colors.accent} />)}

      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={() => setEffectsEnabled(!effectsEnabled)} className={`p-3 rounded-xl transition-all hover:scale-110 ${effectsEnabled ? '' : 'opacity-50'}`} style={{ backgroundColor: effectsEnabled ? theme.colors.accent : theme.colors.bgSecondary, color: effectsEnabled ? '#fff' : theme.colors.textMuted }}><Wand2 size={20} /></button>
        <button onClick={onToggleTheme} className="p-3 rounded-xl transition-all hover:scale-110" style={{ backgroundColor: theme.colors.bgSecondary, color: theme.colors.text }}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
        <button onClick={onOpenSettings} className="p-3 rounded-xl transition-all hover:scale-110" style={{ backgroundColor: theme.colors.bgSecondary, color: theme.colors.text }}><Settings size={20} /></button>
      </div>

      <div className="w-full max-w-[1400px] flex gap-10 items-stretch">
        <div className="w-80 flex flex-col gap-4">
          <div className="p-6 rounded-3xl border flex-1 flex flex-col" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border, animation: 'float 4s ease-in-out infinite' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.error}20` }}><Heart size={24} style={{ color: theme.colors.error }} /></div>
              <span className="font-bold text-xl" style={{ color: theme.colors.text }}>Поддержать проект</span>
            </div>
            <div className="space-y-3 flex-1">
              {cryptoAddresses.map((crypto, i) => (
                <div key={i} className="p-4 rounded-xl border" style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Coins size={16} style={{ color: crypto.color }} />
                    <span className="font-bold" style={{ color: theme.colors.text }}>{crypto.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs flex-1 break-all" style={{ color: theme.colors.textMuted }}>{crypto.address}</code>
                    <button onClick={() => copyAddress(crypto.address, i)} className="p-1.5 rounded-lg transition-all hover:bg-white/10 shrink-0" style={{ color: theme.colors.textMuted }}>{copiedIndex === i ? <Sparkles size={16} /> : <Copy size={16} />}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl border" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border, animation: 'float 4s ease-in-out infinite', animationDelay: '0.5s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}><Send size={24} style={{ color: theme.colors.accent }} /></div>
              <span className="font-bold text-xl" style={{ color: theme.colors.text }}>Ссылки</span>
            </div>
            <div className="space-y-2">
              {links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:scale-[1.02]" style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border }}>
                  <link.icon size={22} style={{ color: link.color }} />
                  <span className="font-medium text-base" style={{ color: theme.colors.text }}>{link.label}</span>
                  <ExternalLink size={16} style={{ color: theme.colors.textMuted, marginLeft: 'auto' }} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <div className="relative mb-10">
            <div className="w-32 h-32 rounded-[2rem] flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accent}dd 100%)`, animation: 'pulse-glow 2s ease-in-out infinite' }}>
              <Code2 size={64} className="text-white" />
            </div>
            <div className="absolute -top-3 -right-3" style={{ animation: 'sparkle 2s ease-in-out infinite' }}><Sparkles size={28} style={{ color: theme.colors.warning }} /></div>
          </div>

          <h1 className="text-7xl font-black mb-4 tracking-tight" style={{ color: theme.colors.text }}>AK47 <span style={{ color: theme.colors.accent }}>IDE</span></h1>
          <p className="text-2xl mb-12 font-medium" style={{ color: theme.colors.textMuted }}>Среда разработки для Python</p>

          <div className="flex gap-8 mb-16">
            <button onClick={onOpenProject} onMouseEnter={() => setHoveredBtn('open')} onMouseLeave={() => setHoveredBtn(null)} className="group flex items-center gap-4 px-14 py-7 rounded-3xl font-bold text-2xl transition-all" style={{ background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accent}dd)`, color: '#fff', boxShadow: hoveredBtn === 'open' ? `0 20px 60px ${theme.colors.accent}60` : `0 10px 40px ${theme.colors.accent}40`, transform: hoveredBtn === 'open' ? 'scale(1.1) translateY(-4px)' : 'scale(1)' }}>
              <FolderOpen size={32} className="group-hover:animate-bounce" /> Открыть проект
            </button>
            <button onClick={onCreateProject} onMouseEnter={() => setHoveredBtn('create')} onMouseLeave={() => setHoveredBtn(null)} className="group flex items-center gap-4 px-14 py-7 rounded-3xl font-bold text-2xl transition-all" style={{ backgroundColor: 'transparent', border: `4px solid ${theme.colors.border}`, color: theme.colors.text, transform: hoveredBtn === 'create' ? 'scale(1.1) translateY(-4px)' : 'scale(1)' }}>
              <FolderPlus size={32} className="group-hover:animate-bounce" /> Создать проект
            </button>
          </div>

          <div className="w-full max-w-xl">
            <div className="text-center mb-6"><span className="text-base font-bold uppercase tracking-widest" style={{ color: theme.colors.textMuted }}>Как пользоваться</span></div>
            <div className="flex items-center justify-center gap-6 mb-6">
              <button onClick={prevCard} className="p-5 rounded-2xl transition-all hover:scale-115 hover:bg-white/10" style={{ backgroundColor: theme.colors.bgSecondary, color: theme.colors.textMuted }}><ChevronLeft size={32} /></button>
              <div className="flex-1 p-8 rounded-3xl border-2 transition-all duration-300" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border, transform: isAnimating ? 'scale(0.97)' : 'scale(1)', opacity: isAnimating ? 0.6 : 1 }}>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}25` }}><Icon size={32} style={{ color: theme.colors.accent }} /></div>
                  <div className="flex-1"><h3 className="font-bold text-2xl mb-2" style={{ color: theme.colors.text }}>{infoCards[currentCard].title}</h3><p className="text-lg" style={{ color: theme.colors.textMuted }}>{infoCards[currentCard].content}</p></div>
                </div>
              </div>
              <button onClick={nextCard} className="p-5 rounded-2xl transition-all hover:scale-115 hover:bg-white/10" style={{ backgroundColor: theme.colors.bgSecondary, color: theme.colors.textMuted }}><ChevronRight size={32} /></button>
            </div>
            <div className="flex justify-center gap-3">{infoCards.map((_, i) => <button key={i} onClick={() => { if (!isAnimating) setCurrentCard(i); }} className="transition-all duration-300" style={{ width: i === currentCard ? 40 : 12, height: 12, borderRadius: 6, backgroundColor: i === currentCard ? theme.colors.accent : theme.colors.border }} />)}</div>
          </div>
        </div>

        <div className="w-80 flex flex-col gap-4">
          <div className="p-6 rounded-3xl border flex-1 flex flex-col" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border, animation: 'float 4s ease-in-out infinite', animationDelay: '1s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.success}20` }}><Book size={24} style={{ color: theme.colors.success }} /></div>
              <span className="font-bold text-xl" style={{ color: theme.colors.text }}>Документация</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {docs.map((doc) => <a key={doc.name} href={doc.url} target="_blank" rel="noopener noreferrer" className="px-5 py-3.5 rounded-2xl text-lg font-bold text-center transition-all hover:scale-105 hover:brightness-110" style={{ backgroundColor: doc.color, color: '#fff', boxShadow: `0 4px 20px ${doc.color}50` }}>{doc.name}</a>)}
            </div>
          </div>

          <div className="p-6 rounded-3xl border" style={{ backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border, animation: 'float 4s ease-in-out infinite', animationDelay: '1.5s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.colors.accent}20` }}><Keyboard size={24} style={{ color: theme.colors.accent }} /></div>
              <span className="font-bold text-xl" style={{ color: theme.colors.text }}>Горячие клавиши</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.colors.bg }}>
                <span className="text-sm" style={{ color: theme.colors.textMuted }}>Сохранить</span>
                <kbd className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: theme.colors.bgTertiary, color: theme.colors.text }}>Ctrl+S</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.colors.bg }}>
                <span className="text-sm" style={{ color: theme.colors.textMuted }}>Запустить</span>
                <kbd className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: theme.colors.bgTertiary, color: theme.colors.text }}>F5</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.colors.bg }}>
                <span className="text-sm" style={{ color: theme.colors.textMuted }}>Настройки</span>
                <kbd className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: theme.colors.bgTertiary, color: theme.colors.text }}>ESC</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.colors.bg }}>
                <span className="text-sm" style={{ color: theme.colors.textMuted }}>Сменить тему</span>
                <kbd className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: theme.colors.bgTertiary, color: theme.colors.text }}>Ctrl+Shift+T</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.colors.bg }}>
                <span className="text-sm" style={{ color: theme.colors.textMuted }}>Открыть файл</span>
                <kbd className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: theme.colors.bgTertiary, color: theme.colors.text }}>Ctrl+O</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
