// 将十六进制颜色转换为HSL格式（用于CSS变量）
export function hexToHSL(hex: string): string {
  // 移除可能的 # 前缀
  hex = hex.replace(/^#/, '');
  // 将 hex 转换为 RGB
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  // 将 RGB 转换为 HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  // 转换为CSS HSL格式（格式：H S% L%）
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  // 返回格式为 "H S% L%" 的字符串，用于CSS变量
  return `${h} ${s}% ${l}%`;
}
// 将HSL格式转换为十六进制颜色
export function hslToHex(hsl: string): string {
  // 解析HSL字符串 "H S% L%"
  const [h, s, l] = hsl.split(' ').map(val => 
    parseFloat(val.replace('%', ''))
  );
  const hNormalized = h / 360;
  const sNormalized = s / 100;
  const lNormalized = l / 100;
  let r, g, b;
  if (sNormalized === 0) {
    r = g = b = lNormalized;
  } else {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = lNormalized < 0.5 
      ? lNormalized * (1 + sNormalized) 
      : lNormalized + sNormalized - lNormalized * sNormalized;
    const p = 2 * lNormalized - q;
    r = hueToRgb(p, q, hNormalized + 1/3);
    g = hueToRgb(p, q, hNormalized);
    b = hueToRgb(p, q, hNormalized - 1/3);
  }
  // 转换为十六进制
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
} 