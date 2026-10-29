import { state } from '../state';
import { mainCanvas } from '../utils/canvas';
import { scheduleRender } from './index';

// Persistent video element reused across loads
const video = document.createElement('video');
video.playsInline = true;
video.loop = true;
video.muted = true;

/**
 * Open the hidden file input.
 * Exposed on window.
 */
export function triggerUpload(): void {
  (document.getElementById('file-input') as HTMLInputElement).click();
}

/**
 * Handler for the hidden file input's change event.
 * Exposed on window so the HTML onchange attribute works.
 */
export function onFileInput(el: HTMLInputElement): void {
  const f = el.files?.[0];
  if (f) handleFile(f);
  el.value = '';
}

/**
 * Load a file as either an image or video source and notify when ready.
 */
export function handleFile(file: File): void {
  const isVid = file.type.startsWith('video/');
  state.sourceType = isVid ? 'video' : 'image';

  if (isVid) {
    video.src = URL.createObjectURL(file);
    video.play();
    state.currentSource = video;
    video.addEventListener('loadeddata', () => onSourceReady(), { once: true });
  } else {
    const img = new Image();
    img.onload = () => {
      state.currentSource = img;
      onSourceReady();
    };
    img.src = URL.createObjectURL(file);
  }
}

/**
 * Called once the source media has loaded.
 * Hides the drop zone, shows the canvas, and triggers a render.
 */
export function onSourceReady(): void {
  const dropZone   = document.getElementById('drop-zone')    as HTMLElement;
  const compareBtn = document.getElementById('compare-btn')  as HTMLButtonElement;
  dropZone.classList.add('hidden');
  mainCanvas.style.display = 'block';
  compareBtn.style.display = '';
  (document.getElementById('export-btn') as HTMLButtonElement).disabled = false;
  scheduleRender();
}

// Off-screen canvas holding the raw source frame for comparison
const compareCanvas = document.createElement('canvas');

/** Draw the current source into the compare canvas at the same size as mainCanvas. */
function captureOriginal(): void {
  const src = state.currentSource;
  if (!src) return;
  compareCanvas.width  = mainCanvas.width;
  compareCanvas.height = mainCanvas.height;
  const ctx = compareCanvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(src as CanvasImageSource, 0, 0, compareCanvas.width, compareCanvas.height);
}

/** Swap canvas content to the raw source; restore on release. */
export function initCompare(): void {
  const btn = document.getElementById('compare-btn') as HTMLButtonElement;
  let saved: ImageData | null = null;

  btn.addEventListener('mousedown', () => {
    if (!state.currentSource) return;
    captureOriginal();
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;
    saved = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    ctx.drawImage(compareCanvas, 0, 0);
    btn.classList.add('active');
  });

  const restore = () => {
    if (!saved) return;
    const ctx = mainCanvas.getContext('2d');
    if (ctx) ctx.putImageData(saved, 0, 0);
    saved = null;
    btn.classList.remove('active');
  };

  btn.addEventListener('mouseup',    restore);
  btn.addEventListener('mouseleave', restore);
}

/**
 * Attach drag-and-drop handlers to the canvas area.
 */
export function initUploader(): void {
  const canvasArea = document.getElementById('canvas-area') as HTMLElement;
  const dropZone   = document.getElementById('drop-zone')   as HTMLElement;

  canvasArea.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  canvasArea.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  canvasArea.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = e.dataTransfer?.files[0];
    if (f) handleFile(f);
  });
}
