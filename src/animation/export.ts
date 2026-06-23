import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { state } from '../state';
import { renderFrameAsync } from '../workspace/index';
import { applyAnimationAtProgress } from './playback';
import { mainCanvas, mainCtx } from '../utils/canvas';
import type { Effect } from '../types';

// Step the animation frame by frame and encode a looping GIF, then download it.
export async function exportGif(
  effect: Effect,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const anim = state.animations[effect];
  const total = Math.max(1, Math.round((anim.durationMs / 1000) * anim.fps));
  const delay = Math.round(1000 / anim.fps);
  const gif = GIFEncoder();

  for (let i = 0; i < total; i++) {
    // Apply values without rendering, then await the real (possibly async) frame.
    applyAnimationAtProgress(effect, i / total, false);
    await renderFrameAsync();

    const w = mainCanvas.width;
    const h = mainCanvas.height;
    const { data } = mainCtx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay });

    onProgress?.(i + 1, total);
    // Yield so the progress label can paint and the UI stays responsive.
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  gif.finish();
  const blob = new Blob([gif.bytes()], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `imprint-${effect}-anim-${Date.now()}.gif`;
  a.click();
  URL.revokeObjectURL(url);
}
