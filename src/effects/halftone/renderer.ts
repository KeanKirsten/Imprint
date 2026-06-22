import { state } from '../../state';
import { getDispSize, drawToOff, mainCanvas, mainCtx } from '../../utils/canvas';
import { hexToRgb, isDarkColor } from '../../utils/color';
import { hashNoise } from '../../utils/noise';

interface PassParams {
  spacing: number;
  minSize: number;
  maxSize: number;
  scatter: number;
  bgHex: string;
  colA: string;
  colB: string;
}

function renderHalftonePass(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  dispW: number,
  dispH: number,
  params: PassParams,
  angleDeg: number,
  forceFill: string | null
): void {
  const { spacing, minSize, maxSize, scatter, colA, colB } = params;
  const dark = isDarkColor(params.bgHex);
  const rgbA = hexToRgb(colA);
  const rgbB = hexToRgb(colB);

  const cx = dispW / 2;
  const cy = dispH / 2;
  const rad = (angleDeg * Math.PI) / 180;

  const infRadEl  = document.getElementById('h-inf-rad') as HTMLInputElement | null;
  const infStrEl  = document.getElementById('h-inf-str') as HTMLInputElement | null;
  const infRad    = infRadEl  ? parseFloat(infRadEl.value)  : 100;
  const infStr    = infStrEl  ? parseFloat(infStrEl.value) / 100 : 0.8;

  ctx.save();
  if (angleDeg !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.translate(-cx, -cy);
  }

  for (let y = spacing / 2; y < dispH + spacing * 2; y += spacing) {
    for (let x = spacing / 2; x < dispW + spacing * 2; x += spacing) {
      const px = Math.min(Math.floor(x), dispW - 1);
      const py = Math.min(Math.floor(y), dispH - 1);
      const ii = (py * dispW + px) * 4;
      const r  = pixels[ii];
      const g  = pixels[ii + 1];
      const b  = pixels[ii + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      const lumT = dark ? lum / 255 : (255 - lum) / 255;
      let radius = minSize + (maxSize - minSize) * lumT;

      for (const pt of state.halftoneInfluencePoints) {
        const dist = Math.hypot(x - pt.x, y - pt.y);
        if (dist < infRad) {
          const proximity = 1 - dist / infRad;
          radius = radius * (1 - proximity * infStr);
        }
      }

      if (radius < 0.25) continue;

      const sx = scatter > 0 ? (hashNoise(x * 0.01, y * 0.01, 0) - 0.5) * scatter * spacing : 0;
      const sy = scatter > 0 ? (hashNoise(x * 0.01, y * 0.01, 1) - 0.5) * scatter * spacing : 0;
      const wx = x + sx;
      const wy = y + sy;

      if (forceFill) {
        ctx.fillStyle = forceFill;
      } else if (state.halftoneColorMode === 'image') {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else if (state.halftoneColorMode === 'duotone') {
        const t = lum / 255;
        ctx.fillStyle = `rgb(${Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t)},${Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t)},${Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t)})`;
      } else {
        ctx.fillStyle = colA;
      }

      if (state.halftoneShape === 'circle') {
        ctx.beginPath();
        ctx.arc(wx, wy, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (state.halftoneShape === 'square') {
        ctx.fillRect(wx - radius, wy - radius, radius * 2, radius * 2);
      } else {
        const th = Math.max(1, radius * 0.38);
        ctx.fillRect(wx - radius, wy - th, radius * 2, th * 2);
        ctx.fillRect(wx - th, wy - radius, th * 2, radius * 2);
      }
    }
  }

  ctx.restore();
}

export function renderHalftone(): void {
  const { dispW, dispH } = getDispSize();
  const spacing  = parseInt((document.getElementById('h-spacing') as HTMLInputElement).value);
  const minSize  = parseFloat((document.getElementById('h-min') as HTMLInputElement).value);
  const maxSize  = parseFloat((document.getElementById('h-max') as HTMLInputElement).value);
  const scatter  = parseFloat((document.getElementById('h-scatter') as HTMLInputElement).value);
  const contrast = parseInt((document.getElementById('h-contrast') as HTMLInputElement).value);
  const bgHex    = (document.getElementById('h-bg') as HTMLInputElement).value;
  const colA     = (document.getElementById('h-col-a') as HTMLInputElement).value;
  const colB     = (document.getElementById('h-col-b') as HTMLInputElement).value;
  const angle    = state.halftoneAngle;

  const { data: pixels } = drawToOff(dispW, dispH, contrast);

  mainCanvas.width  = dispW;
  mainCanvas.height = dispH;
  const ctx = mainCtx;

  const params: PassParams = { spacing, minSize, maxSize, scatter, bgHex, colA, colB };

  if (state.halftoneColorMode === 'cmyk') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, dispW, dispH);

    const cmykPasses: Array<{ color: string; offset: number }> = [
      { color: '#00ffff', offset: 15 },
      { color: '#ff00ff', offset: 75 },
      { color: '#ffff00', offset:  0 },
      { color: '#000000', offset: 45 },
    ];

    ctx.globalCompositeOperation = 'multiply';
    for (const pass of cmykPasses) {
      renderHalftonePass(ctx, pixels, dispW, dispH, params, angle + pass.offset, pass.color);
    }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, dispW, dispH);
    renderHalftonePass(ctx, pixels, dispW, dispH, params, angle, null);
  }

  if (state.halftoneInfluencePlacing && state.halftoneInfluencePoints.length > 0) {
    const infRadEl = document.getElementById('h-inf-rad') as HTMLInputElement | null;
    const infRad   = infRadEl ? parseFloat(infRadEl.value) : 100;
    ctx.save();
    for (const pt of state.halftoneInfluencePoints) {
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#d4ff00';
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, infRad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.85;
      ctx.fillStyle   = '#d4ff00';
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
