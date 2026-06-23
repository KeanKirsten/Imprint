import { state } from '../../state';
import { getDispSize, drawToOff, mainCanvas, mainCtx } from '../../utils/canvas';
import { hexToRgb, isDarkColor } from '../../utils/color';
import { hashNoise } from '../../utils/noise';

/**
 * Render the Corpus effect onto the main canvas.
 * Each character cell samples luminance from the source image and draws
 * a text character sized/coloured accordingly.
 */
export function renderCorpus(): void {
  const { dispW, dispH } = getDispSize();
  const fontSize  = parseInt((document.getElementById('c-size') as HTMLInputElement).value);
  const threshold = parseInt((document.getElementById('c-threshold') as HTMLInputElement).value);
  const contrast  = parseInt((document.getElementById('c-contrast') as HTMLInputElement).value);
  const bgHex     = (document.getElementById('c-bg') as HTMLInputElement).value;
  const colA      = (document.getElementById('c-col-a') as HTMLInputElement).value;
  const colB      = (document.getElementById('c-col-b') as HTMLInputElement).value;
  const skipSp    = (document.getElementById('c-skip-spaces') as HTMLInputElement).checked;
  const scStr     = parseInt((document.getElementById('c-sc-str') as HTMLInputElement).value);
  const scRad     = parseInt((document.getElementById('c-sc-rad') as HTMLInputElement).value);

  const { data: pixels } = drawToOff(dispW, dispH, contrast);

  const charSet = state.corpusCharSet;
  const PRESETS: Record<'hex' | 'binary' | 'base64', string> = {
    hex:    '0123456789ABCDEF',
    binary: '01',
    base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
  };

  let chars: string[];
  if (charSet === 'custom') {
    const rawText = (document.getElementById('c-text') as HTMLTextAreaElement).value.trim() ||
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';
    chars = skipSp ? rawText.replace(/\s+/g, '').split('') : rawText.split('');
    if (!chars.length) chars = ['?'];
  } else {
    chars = PRESETS[charSet].split('');
  }

  mainCanvas.width  = dispW;
  mainCanvas.height = dispH;
  const ctx = mainCtx;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, dispW, dispH);
  ctx.font = `${fontSize}px 'DM Mono',monospace`;
  ctx.textBaseline = 'top';

  const charW = fontSize * 0.58;
  const charH = fontSize;
  const dark  = isDarkColor(bgHex);

  let rgbA: [number, number, number] | null = null;
  let rgbB: [number, number, number] | null = null;
  let grad: CanvasGradient | null = null;

  if (state.corpusColorMode === 'duotone') {
    rgbA = hexToRgb(colA);
    rgbB = hexToRgb(colB);
  } else if (state.corpusColorMode === 'gradient') {
    grad = ctx.createLinearGradient(0, 0, dispW, dispH);
    grad.addColorStop(0, colA);
    grad.addColorStop(1, colB);
  }

  const pts = state.corpusScatterPoints;

  let li = 0;
  for (let row = 0; row < dispH; row += charH) {
    for (let col = 0; col < dispW; col += charW) {
      const px = Math.min(Math.floor(col + charW / 2), dispW - 1);
      const py = Math.min(Math.floor(row + charH / 2), dispH - 1);
      const ii = (py * dispW + px) * 4;
      const r  = pixels[ii];
      const g  = pixels[ii + 1];
      const b  = pixels[ii + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      let ch: string;
      if (charSet === 'custom') {
        ch = chars[li % chars.length];
      } else {
        const idx = Math.min(chars.length - 1, Math.floor(hashNoise(col * 0.01, row * 0.01, 7) * chars.length));
        ch = chars[idx];
      }
      li++;

      // Calculate scatter displacement from placed points
      let dx = 0, dy = 0;
      if (pts.length > 0) {
        for (const pt of pts) {
          const ex   = col - pt.x;
          const ey   = row - pt.y;
          const dist = Math.hypot(ex, ey);
          if (dist < scRad && dist > 0.5) {
            const f = Math.pow(1 - dist / scRad, 1.8) * scStr;
            dx += (ex / dist) * f + Math.cos(hashNoise(col * 0.009, row * 0.009, pt.id) * Math.PI * 2) * f * 0.4;
            dy += (ey / dist) * f + Math.sin(hashNoise(col * 0.009, row * 0.009, pt.id) * Math.PI * 2) * f * 0.4;
          }
        }
      }

      const wx = col + dx;
      const wy = row + dy;

      if (state.corpusRenderStyle === 'threshold') {
        // Only draw characters that pass the luminance threshold
        if (dark ? lum <= threshold : lum >= 255 - threshold) continue;
        applyColorThreshold(ctx, state.corpusColorMode, r, g, b, lum, rgbA, rgbB, grad);
        ctx.fillText(ch, wx, wy);
      } else {
        // Mosaic: vary opacity by luminance
        const rawA = dark ? lum / 255 : (255 - lum) / 255;
        const a    = Math.pow(rawA, 0.7);
        applyColorMosaic(ctx, state.corpusColorMode, r, g, b, lum, a, rgbA, rgbB, grad);
        ctx.fillText(ch, wx, wy);
        if (state.corpusColorMode === 'gradient') ctx.globalAlpha = 1;
      }
    }
  }

  // Draw scatter point indicators when placement mode is active
  if (state.corpusScatterOn && pts.length > 0) {
    ctx.save();
    for (const pt of pts) {
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#d4ff00';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, scRad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha  = 0.85;
      ctx.fillStyle    = '#d4ff00';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#d4ff00';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(pt.x - 9, pt.y); ctx.lineTo(pt.x + 9, pt.y);
      ctx.moveTo(pt.x, pt.y - 9); ctx.lineTo(pt.x, pt.y + 9);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Apply fill colour for threshold mode
function applyColorThreshold(
  ctx: CanvasRenderingContext2D,
  mode: string,
  r: number, g: number, b: number,
  lum: number,
  rgbA: [number, number, number] | null,
  rgbB: [number, number, number] | null,
  grad: CanvasGradient | null
): void {
  if (mode === 'image') {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
  } else if (mode === 'invert') {
    ctx.fillStyle = `rgb(${255 - r},${255 - g},${255 - b})`;
  } else if (mode === 'duotone' && rgbA && rgbB) {
    const t = lum / 255;
    ctx.fillStyle = `rgb(${Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t)},${Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t)},${Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t)})`;
  } else if (grad) {
    ctx.fillStyle = grad;
  }
}

// Apply fill colour for mosaic mode (with alpha)
function applyColorMosaic(
  ctx: CanvasRenderingContext2D,
  mode: string,
  r: number, g: number, b: number,
  lum: number,
  a: number,
  rgbA: [number, number, number] | null,
  rgbB: [number, number, number] | null,
  grad: CanvasGradient | null
): void {
  if (mode === 'image') {
    ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
  } else if (mode === 'invert') {
    ctx.fillStyle = `rgba(${255 - r},${255 - g},${255 - b},${a.toFixed(3)})`;
  } else if (mode === 'duotone' && rgbA && rgbB) {
    const t = lum / 255;
    ctx.fillStyle = `rgba(${Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t)},${Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t)},${Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t)},${a.toFixed(3)})`;
  } else if (grad) {
    ctx.globalAlpha = a;
    ctx.fillStyle   = grad;
  }
}
