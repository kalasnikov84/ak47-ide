import { useEffect, useRef } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface MinimapProps {
  content: string;
  visibleLines: { start: number; end: number };
  onScroll?: (percentage: number) => void;
  isVisible?: boolean;
}

export function Minimap({ content, visibleLines, onScroll, isVisible = true }: MinimapProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const settings = useSettingsStore((s) => s.settings);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !content || !settings.appearance.minimap || !isVisible) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lines = content.split('\n');
    const totalLines = lines.length;
    const lineHeight = 2;
    const charWidth = 1.2;
    const minimapWidth = 80;
    const minimapHeight = Math.min(totalLines * lineHeight, 400);

    canvas.width = minimapWidth;
    canvas.height = minimapHeight;

    ctx.fillStyle = theme.editor.bg;
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);

    ctx.fillStyle = `${theme.editor.text}40`;
    ctx.font = `${lineHeight}px ${settings.appearance.fontFamily}`;

    let y = 0;
    for (let i = 0; i < lines.length && y < minimapHeight; i++) {
      const line = lines[i];
      const truncatedLine = line.substring(0, Math.floor(minimapWidth / charWidth));
      ctx.fillText(truncatedLine, 4, y + lineHeight);
      y += lineHeight;
    }

    const viewportHeight = visibleLines.end - visibleLines.start;
    const viewportY = (visibleLines.start / totalLines) * minimapHeight;
    const viewportHeightScaled = (viewportHeight / totalLines) * minimapHeight;

    ctx.fillStyle = `${theme.colors.accent}30`;
    ctx.fillRect(0, viewportY, minimapWidth, Math.max(viewportHeightScaled, 10));

    ctx.strokeStyle = theme.colors.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, viewportY, minimapWidth, Math.max(viewportHeightScaled, 10));
  }, [content, visibleLines, theme, settings.appearance.minimap, settings.appearance.fontFamily, isVisible]);

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !onScroll) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = y / rect.height;
    onScroll(percentage);
  };

  if (!settings.appearance.minimap || !isVisible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-0 h-full border-l cursor-pointer transition-opacity hover:opacity-100"
      style={{
        width: 80,
        backgroundColor: theme.editor.bg,
        borderColor: theme.colors.border,
        opacity: 0.8,
      }}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
