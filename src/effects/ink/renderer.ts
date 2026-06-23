import { state } from '../../state';
import { getDispSize, drawToOff, mainCanvas, mainCtx, offCanvas, offCtx } from '../../utils/canvas';
import { hexToRgb } from '../../utils/color';
import { hashNoise } from '../../utils/noise';
import type { InkWorkerResult } from '../../types';

// Worker is created once and reused for all bleed renders
let inkWorker: Worker | null = null;

function getInkWorker(): Worker {
  if (!inkWorker) {
    inkWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  }
  return inkWorker;
}

/**
 * Render the Bleed & Ink effect.
 * Stipple mode runs inline (fast); bleed mode offloads to a Web Worker.
 */
export function renderBleedInk(): Promise<void> {
  const { dispW, dispH } = getDispSize();
  const threshold = parseInt((document.getElementById('i-threshold') as HTMLInputElement).value);
  const contrast  = parseInt((document.getElementById('i-contrast') as HTMLInputElement).value);
  const inkHex    = (document.getElementById('i-ink') as HTMLInputElement).value;
  const paperHex  = (document.getElementById('i-paper') as HTMLInputElement).value;
  const [iR, iG, iB] = hexToRgb(inkHex);
  const [pR, pG, pB] = hexToRgb(paperHex);

  drawToOff(dispW, dispH, contrast);
  const src = offCtx.getImageData(0, 0, dispW, dispH).data;

  mainCanvas.width  = dispW;
  mainCanvas.height = dispH;
  const ctx = mainCtx;

  if (state.inkMode === 'stipple') {
    renderStipple(ctx, src, dispW, dispH, threshold, inkHex, paperHex);
    return Promise.resolve();
  } else {
    return renderBleed(ctx, src, dispW, dispH, threshold, iR, iG, iB, pR, pG, pB);
  }
}

// Stipple: organic dot portrait, runs synchronously
function renderStipple(
  ctx: CanvasRenderingContext2D,
  src: Uint8ClampedArray,
  W: number, H: number,
  threshold: number,
  inkHex: string,
  paperHex: string
): void {
  const spacing = parseFloat((document.getElementById('i-spacing') as HTMLInputElement).value);
  const minR    = parseFloat((document.getElementById('i-minr') as HTMLInputElement).value);
  const maxR    = parseFloat((document.getElementById('i-maxr') as HTMLInputElement).value);
  const scatter = parseFloat((document.getElementById('i-scatter') as HTMLInputElement).value);
  const grain   = parseInt((document.getElementById('i-sgrain') as HTMLInputElement).value) / 100;

  ctx.fillStyle = paperHex;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = inkHex;

  const thr = threshold / 255;

  for (let gy = spacing * 0.5; gy < H + spacing; gy += spacing) {
    for (let gx = spacing * 0.5; gx < W + spacing; gx += spacing) {
      const sx  = Math.min(W - 1, Math.max(0, gx | 0));
      const sy  = Math.min(H - 1, Math.max(0, gy | 0));
      const k   = (sy * W + sx) * 4;
      const lum = (0.2126 * src[k] + 0.7152 * src[k + 1] + 0.0722 * src[k + 2]) / 255;

      const darkness = Math.max(0, 1 - lum / thr);
      const r = minR + (maxR - minR) * darkness;
      if (r < 0.15) continue;

      // Organic scatter via noise
      const n1  = hashNoise(gx, gy, 1);
      const n2  = hashNoise(gx, gy, 2);
      const ang = n1 * Math.PI * 2;
      const d   = n2 * scatter;
      const px  = gx + Math.cos(ang) * d;
      const py  = gy + Math.sin(ang) * d;

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Fine grain overlay
  if (grain > 0) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (hashNoise(x * 1.7, y * 3.9, 42) < grain * 0.018) {
          ctx.beginPath();
          ctx.arc(x, y, 0.4 + hashNoise(x, y, 77) * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

// Bleed mode: offloads heavy pixel work to the ink worker.
// Resolves once the worker result has been drawn to the canvas.
function renderBleed(
  ctx: CanvasRenderingContext2D,
  src: Uint8ClampedArray,
  W: number, H: number,
  threshold: number,
  iR: number, iG: number, iB: number,
  pR: number, pG: number, pB: number
): Promise<void> {
  const bleedAmt = parseInt((document.getElementById('i-bleed') as HTMLInputElement).value);
  const spread   = parseInt((document.getElementById('i-spread') as HTMLInputElement).value) / 100;
  const grain    = parseInt((document.getElementById('i-bgrain') as HTMLInputElement).value) / 100;
  const spatter  = parseInt((document.getElementById('i-spatter') as HTMLInputElement).value);

  const srcBuffer = src.buffer.slice(0);
  const worker = getInkWorker();

  return new Promise<void>(resolve => {
    worker.onmessage = (e: MessageEvent<InkWorkerResult>) => {
      const { pixels, width, height } = e.data;
      const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer as ArrayBuffer), width, height);
      ctx.putImageData(imageData, 0, 0);
      resolve();
    };
    worker.postMessage(
      { srcBuffer, width: W, height: H, threshold, bleedAmt, spread, grain, spatter, inkR: iR, inkG: iG, inkB: iB, paperR: pR, paperG: pG, paperB: pB },
      [srcBuffer]
    );
  });
}
