import { state } from '../state';

// Persistent off-screen canvas used for image sampling
export const offCanvas = document.createElement('canvas');
export const offCtx = offCanvas.getContext('2d')!;

// The main output canvas
export const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
export const mainCtx = mainCanvas.getContext('2d')!;

/**
 * Calculate the display dimensions that fit the current source into the
 * available canvas area.
 *
 * The header is 50 px tall and the sidebar is 290 px wide, leaving a
 * 48 px gutter on each edge of the canvas area.
 */
export function getDispSize(): { dispW: number; dispH: number } {
  const area = document.getElementById('canvas-area') as HTMLElement;
  const maxW = area.clientWidth - 48;
  const maxH = area.clientHeight - 48;

  const src = state.currentSource!;
  const natW =
    (src as HTMLVideoElement).videoWidth ||
    (src as HTMLImageElement).naturalWidth ||
    800;
  const natH =
    (src as HTMLVideoElement).videoHeight ||
    (src as HTMLImageElement).naturalHeight ||
    600;

  const scale = Math.min(maxW / natW, maxH / natH, 1);
  return {
    dispW: Math.floor(natW * scale),
    dispH: Math.floor(natH * scale),
  };
}

/**
 * Draw the current source into the off-screen canvas at the given display
 * dimensions, optionally applying a CSS contrast filter.
 * Returns the resulting ImageData.
 */
export function drawToOff(
  dispW: number,
  dispH: number,
  contrast?: number
): ImageData {
  offCanvas.width = dispW;
  offCanvas.height = dispH;
  offCtx.filter =
    contrast && contrast !== 100 ? `contrast(${contrast}%)` : 'none';
  offCtx.drawImage(state.currentSource!, 0, 0, dispW, dispH);
  offCtx.filter = 'none';
  return offCtx.getImageData(0, 0, dispW, dispH);
}
