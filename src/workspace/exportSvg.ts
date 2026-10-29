import { state } from '../state';
import { getDispSize, drawToOff, mainCanvas } from '../utils/canvas';
import { hexToRgb, isDarkColor } from '../utils/color';
import { hashNoise } from '../utils/noise';

function dl(svg: string, effect: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.download = `imprint-${effect}-${Date.now()}.svg`;
  a.href = URL.createObjectURL(blob);
  a.click();
}

function esc(ch: string): string {
  return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : ch;
}

export function exportSvg(): void {
  if (!state.currentSource || !state.currentEffect) return;
  if (state.currentEffect === 'corpus')   corpusSvg();
  else if (state.currentEffect === 'halftone') halftoneSvg();
  else inkSvg();
}

// ─── Corpus ─────────────────────────────────────────────────────────────────

function corpusSvg(): void {
  const { dispW, dispH } = getDispSize();
  const fontSize  = parseInt((document.getElementById('c-size')      as HTMLInputElement).value);
  const threshold = parseInt((document.getElementById('c-threshold') as HTMLInputElement).value);
  const contrast  = parseInt((document.getElementById('c-contrast')  as HTMLInputElement).value);
  const bgHex     = (document.getElementById('c-bg')    as HTMLInputElement).value;
  const colA      = (document.getElementById('c-col-a') as HTMLInputElement).value;
  const colB      = (document.getElementById('c-col-b') as HTMLInputElement).value;
  const skipSp    = (document.getElementById('c-skip-spaces') as HTMLInputElement).checked;
  const scStr     = parseInt((document.getElementById('c-sc-str') as HTMLInputElement).value);
  const scRad     = parseInt((document.getElementById('c-sc-rad') as HTMLInputElement).value);

  const { data: pixels } = drawToOff(dispW, dispH, contrast);

  const PRESETS: Record<string, string> = {
    hex:    '0123456789ABCDEF',
    binary: '01',
    base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
  };
  const charSet = state.corpusCharSet;
  let chars: string[];
  if (charSet === 'custom') {
    const raw = (document.getElementById('c-text') as HTMLTextAreaElement).value.trim() || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';
    chars = skipSp ? raw.replace(/\s+/g, '').split('') : raw.split('');
    if (!chars.length) chars = ['?'];
  } else {
    chars = PRESETS[charSet].split('');
  }

  const charW = fontSize * 0.58;
  const charH = fontSize;
  const dark  = isDarkColor(bgHex);
  const rgbA  = hexToRgb(colA);
  const rgbB  = hexToRgb(colB);
  const pts   = state.corpusScatterPoints;

  const parts: string[] = [];
  let li = 0;

  for (let row = 0; row < dispH; row += charH) {
    for (let col = 0; col < dispW; col += charW) {
      const px  = Math.min(Math.floor(col + charW / 2), dispW - 1);
      const py  = Math.min(Math.floor(row + charH / 2), dispH - 1);
      const ii  = (py * dispW + px) * 4;
      const r   = pixels[ii], g = pixels[ii + 1], b = pixels[ii + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      let ch: string;
      if (charSet === 'custom') {
        ch = chars[li % chars.length];
      } else {
        const idx = Math.min(chars.length - 1, Math.floor(hashNoise(col * 0.01, row * 0.01, 7) * chars.length));
        ch = chars[idx];
      }
      li++;

      let dx = 0, dy = 0;
      for (const pt of pts) {
        const ex = col - pt.x, ey = row - pt.y;
        const dist = Math.hypot(ex, ey);
        if (dist < scRad && dist > 0.5) {
          const f = Math.pow(1 - dist / scRad, 1.8) * scStr;
          dx += (ex / dist) * f + Math.cos(hashNoise(col * 0.009, row * 0.009, pt.id) * Math.PI * 2) * f * 0.4;
          dy += (ey / dist) * f + Math.sin(hashNoise(col * 0.009, row * 0.009, pt.id) * Math.PI * 2) * f * 0.4;
        }
      }

      const wx = col + dx;
      const wy = row + dy;

      if (state.corpusRenderStyle === 'threshold') {
        if (dark ? lum <= threshold : lum >= 255 - threshold) continue;
        const fill = colorFill(state.corpusColorMode, r, g, b, lum, rgbA, rgbB, colA, colB, 1);
        parts.push(`<text x="${wx.toFixed(1)}" y="${(wy + fontSize).toFixed(1)}" fill="${fill}">${esc(ch)}</text>`);
      } else {
        const rawA = dark ? lum / 255 : (255 - lum) / 255;
        const a    = Math.pow(rawA, 0.7);
        const fill = colorFill(state.corpusColorMode, r, g, b, lum, rgbA, rgbB, colA, colB, a);
        parts.push(`<text x="${wx.toFixed(1)}" y="${(wy + fontSize).toFixed(1)}" fill="${fill}">${esc(ch)}</text>`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dispW}" height="${dispH}" viewBox="0 0 ${dispW} ${dispH}">
<style>text { font-family: 'DM Mono', monospace; font-size: ${fontSize}px; }</style>
${parts.join('\n')}
</svg>`;

  dl(svg, 'ascii');
}

function colorFill(
  mode: string,
  r: number, g: number, b: number, lum: number,
  rgbA: [number, number, number], rgbB: [number, number, number],
  colA: string, colB: string,
  a: number,
): string {
  const af = a.toFixed(3);
  if (mode === 'image')  return `rgba(${r},${g},${b},${af})`;
  if (mode === 'invert') return `rgba(${255 - r},${255 - g},${255 - b},${af})`;
  if (mode === 'duotone') {
    const t = lum / 255;
    return `rgba(${Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t)},${Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t)},${Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t)},${af})`;
  }
  // gradient: approximate with colA for simplicity (SVG gradients need defs)
  return colA;
}

// ─── Halftone ────────────────────────────────────────────────────────────────

function halftoneSvg(): void {
  const { dispW, dispH } = getDispSize();
  const spacing  = parseInt((document.getElementById('h-spacing') as HTMLInputElement).value);
  const minSize  = parseFloat((document.getElementById('h-min')     as HTMLInputElement).value);
  const maxSize  = parseFloat((document.getElementById('h-max')     as HTMLInputElement).value);
  const scatter  = parseFloat((document.getElementById('h-scatter') as HTMLInputElement).value);
  const contrast = parseInt((document.getElementById('h-contrast') as HTMLInputElement).value);
  const bgHex    = (document.getElementById('h-bg')    as HTMLInputElement).value;
  const colA     = (document.getElementById('h-col-a') as HTMLInputElement).value;
  const colB     = (document.getElementById('h-col-b') as HTMLInputElement).value;
  const angle    = state.halftoneAngle;

  const { data: pixels } = drawToOff(dispW, dispH, contrast);
  const dark  = isDarkColor(bgHex);
  const rgbA  = hexToRgb(colA);
  const rgbB  = hexToRgb(colB);

  const infRadEl = document.getElementById('h-inf-rad') as HTMLInputElement | null;
  const infStrEl = document.getElementById('h-inf-str') as HTMLInputElement | null;
  const infRad   = infRadEl ? parseFloat(infRadEl.value) : 100;
  const infStr   = infStrEl ? parseFloat(infStrEl.value) / 100 : 0.8;

  const shape = state.halftoneShape;
  const isCmyk = state.halftoneColorMode === 'cmyk';

  const cmykPasses = isCmyk
    ? [
        { color: '#00ffff', offset: 15 },
        { color: '#ff00ff', offset: 75 },
        { color: '#ffff00', offset:  0 },
        { color: '#000000', offset: 45 },
      ]
    : [{ color: null as string | null, offset: 0 }];

  const groups: string[] = [];

  for (const pass of cmykPasses) {
    const angleDeg = angle + pass.offset;
    const rad      = (angleDeg * Math.PI) / 180;
    const cx = dispW / 2, cy = dispH / 2;

    const dots: string[] = [];

    for (let y = spacing / 2; y < dispH + spacing * 2; y += spacing) {
      for (let x = spacing / 2; x < dispW + spacing * 2; x += spacing) {
        // sample pixel from rotated grid position (approximate: sample at screen position)
        const cosA = Math.cos(-rad), sinA = Math.sin(-rad);
        const rx   = cx + (x - cx) * cosA - (y - cy) * sinA;
        const ry   = cy + (x - cx) * sinA + (y - cy) * cosA;
        const px   = Math.min(Math.max(Math.floor(rx), 0), dispW - 1);
        const py   = Math.min(Math.max(Math.floor(ry), 0), dispH - 1);
        const ii   = (py * dispW + px) * 4;
        const r    = pixels[ii], g = pixels[ii + 1], b = pixels[ii + 2];
        const lum  = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const lumT = dark ? lum / 255 : (255 - lum) / 255;
        let radius = minSize + (maxSize - minSize) * lumT;

        for (const pt of state.halftoneInfluencePoints) {
          const dist = Math.hypot(x - pt.x, y - pt.y);
          if (dist < infRad) radius *= 1 - (1 - dist / infRad) * infStr;
        }

        if (radius < 0.25) continue;

        const sx = scatter > 0 ? (hashNoise(x * 0.01, y * 0.01, 0) - 0.5) * scatter * spacing : 0;
        const sy = scatter > 0 ? (hashNoise(x * 0.01, y * 0.01, 1) - 0.5) * scatter * spacing : 0;
        const wx = x + sx, wy = y + sy;

        let fill: string;
        if (pass.color) {
          fill = pass.color;
        } else if (state.halftoneColorMode === 'image') {
          fill = `rgb(${r},${g},${b})`;
        } else if (state.halftoneColorMode === 'duotone') {
          const t = lum / 255;
          fill = `rgb(${Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t)},${Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t)},${Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t)})`;
        } else {
          fill = colA;
        }

        if (shape === 'circle') {
          dots.push(`<circle cx="${wx.toFixed(1)}" cy="${wy.toFixed(1)}" r="${radius.toFixed(2)}" fill="${fill}"/>`);
        } else if (shape === 'square') {
          const s = radius * 2;
          dots.push(`<rect x="${(wx - radius).toFixed(1)}" y="${(wy - radius).toFixed(1)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="${fill}"/>`);
        } else {
          const th = Math.max(1, radius * 0.38);
          dots.push(`<rect x="${(wx - radius).toFixed(1)}" y="${(wy - th).toFixed(1)}" width="${(radius * 2).toFixed(2)}" height="${(th * 2).toFixed(2)}" fill="${fill}"/>`);
          dots.push(`<rect x="${(wx - th).toFixed(1)}" y="${(wy - radius).toFixed(1)}" width="${(th * 2).toFixed(2)}" height="${(radius * 2).toFixed(2)}" fill="${fill}"/>`);
        }
      }
    }

    if (isCmyk) {
      const rot = angleDeg !== 0 ? ` transform="rotate(${angleDeg} ${cx} ${cy})"` : '';
      groups.push(`<g style="mix-blend-mode:multiply"${rot}>\n${dots.join('\n')}\n</g>`);
    } else {
      groups.push(dots.join('\n'));
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dispW}" height="${dispH}" viewBox="0 0 ${dispW} ${dispH}">
${groups.join('\n')}
</svg>`;

  dl(svg, 'halftone');
}

// ─── Ink ─────────────────────────────────────────────────────────────────────

function inkSvg(): void {
  if (state.inkMode === 'stipple') {
    stippleSvg();
  } else {
    // Bleed is raster-based; embed current canvas as PNG
    bleedSvgFallback();
  }
}

function stippleSvg(): void {
  const { dispW, dispH } = getDispSize();
  const threshold = parseInt((document.getElementById('i-threshold') as HTMLInputElement).value);
  const contrast  = parseInt((document.getElementById('i-contrast')  as HTMLInputElement).value);
  const inkHex    = (document.getElementById('i-ink')     as HTMLInputElement).value;
  const spacing   = parseFloat((document.getElementById('i-spacing') as HTMLInputElement).value);
  const minR      = parseFloat((document.getElementById('i-minr')    as HTMLInputElement).value);
  const maxR      = parseFloat((document.getElementById('i-maxr')    as HTMLInputElement).value);
  const scatterV  = parseFloat((document.getElementById('i-scatter') as HTMLInputElement).value);
  const grain     = parseInt((document.getElementById('i-sgrain')    as HTMLInputElement).value) / 100;

  const { data: src } = drawToOff(dispW, dispH, contrast);
  const thr = threshold / 255;

  const dots: string[] = [];

  for (let gy = spacing * 0.5; gy < dispH + spacing; gy += spacing) {
    for (let gx = spacing * 0.5; gx < dispW + spacing; gx += spacing) {
      const sx  = Math.min(dispW - 1, Math.max(0, gx | 0));
      const sy  = Math.min(dispH - 1, Math.max(0, gy | 0));
      const k   = (sy * dispW + sx) * 4;
      const lum = (0.2126 * src[k] + 0.7152 * src[k + 1] + 0.0722 * src[k + 2]) / 255;

      if (lum > thr) continue;

      const density = 1 - lum / thr;
      if (hashNoise(gx * 0.05, gy * 0.05, 13) > density * 0.95 + 0.05) continue;

      const r  = minR + (maxR - minR) * (1 - lum / thr);
      const ns = hashNoise(gx * 0.07, gy * 0.07, 3);
      const d  = ns * scatterV * spacing;
      const ang = hashNoise(gx * 0.04, gy * 0.04, 9) * Math.PI * 2;

      const gn  = grain > 0 ? (hashNoise(gx * 1.1, gy * 2.3, 44) < grain * 0.3 ? (hashNoise(gx, gy, 55) - 0.5) * r * 0.6 : 0) : 0;
      const px  = gx + Math.cos(ang) * d + gn;
      const py  = gy + Math.sin(ang) * d + gn;

      dots.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(2)}" fill="${inkHex}"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dispW}" height="${dispH}" viewBox="0 0 ${dispW} ${dispH}">
${dots.join('\n')}
</svg>`;

  dl(svg, 'ink-stipple');
}

function bleedSvgFallback(): void {
  // Bleed effect is raster; embed the current canvas as a PNG image inside SVG
  const { dispW, dispH } = getDispSize();
  const pngDataUrl = mainCanvas.toDataURL('image/png');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${dispW}" height="${dispH}" viewBox="0 0 ${dispW} ${dispH}">
<image href="${pngDataUrl}" width="${dispW}" height="${dispH}"/>
</svg>`;
  dl(svg, 'ink-bleed');
}
