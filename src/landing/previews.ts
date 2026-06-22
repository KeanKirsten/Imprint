/**
 * Animated preview canvases shown on the landing cards.
 * Each preview runs its own RAF loop and never stops.
 */

export function initPreviews(): void {
  initCorpusPreview();
  initHalftonePreview();
  initInkPreview();
}

// Corpus card: animated text wave in amber
function initCorpusPreview(): void {
  const cv = document.getElementById('prev-corpus') as HTMLCanvasElement;
  const cx = cv.getContext('2d')!;
  const W = 230, H = 230;
  cv.width = W; cv.height = H;

  const chars = 'CORPUS ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789'.split('');
  const amber: [number, number, number] = [200, 160, 90];
  let t = 0;

  (function draw(): void {
    cx.fillStyle = '#0a0a0a';
    cx.fillRect(0, 0, W, H);

    const fs = 7;
    cx.font = `${fs}px 'DM Mono',monospace`;
    cx.textBaseline = 'top';
    const cw = fs * 0.58;
    let idx = 0;

    for (let row = 0; row < H; row += fs) {
      for (let col = 0; col < W; col += cw) {
        const dist = Math.hypot(col - W / 2, row - H / 2);
        const wave = Math.sin(dist * 0.045 - t) * 0.5 + 0.5;
        const a    = Math.pow(wave, 1.4);
        cx.fillStyle = `rgba(${amber[0]},${amber[1]},${amber[2]},${a.toFixed(3)})`;
        cx.fillText(chars[idx % chars.length], col, row);
        idx++;
      }
    }

    t += 0.035;
    requestAnimationFrame(draw);
  })();
}

// Halftone card: animated dot-wave in pink/red
function initHalftonePreview(): void {
  const cv = document.getElementById('prev-halftone') as HTMLCanvasElement;
  const cx = cv.getContext('2d')!;
  const W = 230, H = 230;
  cv.width = W; cv.height = H;

  let t = 0;

  (function draw(): void {
    cx.fillStyle = '#f0eeeb';
    cx.fillRect(0, 0, W, H);

    const sp = 11;
    for (let y = sp / 2; y < H; y += sp) {
      for (let x = sp / 2; x < W; x += sp) {
        const dist = Math.hypot(x - W / 2, y - H / 2) / (Math.hypot(W, H) / 2);
        const wave = Math.sin(dist * 5 - t * 1.4) * 0.5 + 0.5;
        const r    = Math.max(0.2, (1 - dist) * wave * sp * 0.48);
        cx.fillStyle = '#e03d6a';
        cx.beginPath();
        cx.arc(x, y, r, 0, Math.PI * 2);
        cx.fill();
      }
    }

    t += 0.028;
    requestAnimationFrame(draw);
  })();
}

// Ink card: animated stipple portrait silhouette
function initInkPreview(): void {
  const cv = document.getElementById('prev-ink') as HTMLCanvasElement;
  const cx = cv.getContext('2d')!;
  const W = 230, H = 230;
  cv.width = W; cv.height = H;

  let t = 0;

  // Simple procedural luminance function that approximates a head silhouette
  function fakeLum(x: number, y: number, time: number): number {
    const nx = (x / W) * 2 - 1;
    const ny = (y / H) * 2 - 1;
    const headDist = Math.hypot(nx * 0.9, (ny + 0.15) * 1.2);
    const wave     = Math.sin(headDist * 8 - time * 0.8) * 0.08;
    return Math.max(0, Math.min(1, 1 - headDist * 1.35 + wave));
  }

  (function draw(): void {
    cx.fillStyle = '#f5f4f0';
    cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#0a0a0a';

    const sp = 5;
    for (let y = sp * 0.5; y < H; y += sp) {
      for (let x = sp * 0.5; x < W; x += sp) {
        const lum = fakeLum(x, y, t);
        if (lum < 0.05) continue;
        const r  = lum * 2.8;
        const jx = (Math.sin(x * 1.3 + t * 0.4) * 0.5 + Math.cos(y * 0.9) * 0.5) * 1.2;
        const jy = (Math.cos(y * 1.1 + t * 0.3) * 0.5 + Math.sin(x * 0.7) * 0.5) * 1.2;
        cx.beginPath();
        cx.arc(x + jx, y + jy, Math.max(0.2, r), 0, Math.PI * 2);
        cx.fill();
      }
    }

    t += 0.018;
    requestAnimationFrame(draw);
  })();
}
