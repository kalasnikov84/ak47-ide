import { Theme } from '../types';

export function generateThemePalette(baseColor: string, name: string): Theme {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 88, g: 166, b: 255 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const adjustBrightness = (hex: string, factor: number) => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(
      Math.round(r * factor),
      Math.round(g * factor),
      Math.round(b * factor)
    );
  };

  const accent = baseColor;
  const accentLight = adjustBrightness(accent, 1.2);

  return {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    displayName: name,
    colors: {
      bg: adjustBrightness(accent, 0.1),
      bgSecondary: adjustBrightness(accent, 0.15),
      bgTertiary: adjustBrightness(accent, 0.25),
      text: adjustBrightness(accent, 4),
      textMuted: adjustBrightness(accent, 2),
      accent: accent,
      accentHover: accentLight,
      border: adjustBrightness(accent, 0.3),
      error: '#f85149',
      warning: '#d29922',
      success: '#3fb950',
    },
    editor: {
      bg: adjustBrightness(accent, 0.08),
      text: adjustBrightness(accent, 3.5),
      selection: adjustBrightness(accent, 0.4),
      cursor: accent,
      lineNumber: adjustBrightness(accent, 1.5),
      lineNumberActive: adjustBrightness(accent, 4),
      gutter: adjustBrightness(accent, 0.12),
    },
  };
}
