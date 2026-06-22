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
  const dropZone = document.getElementById('drop-zone') as HTMLElement;
  dropZone.classList.add('hidden');
  mainCanvas.style.display = 'block';
  (document.getElementById('export-btn') as HTMLButtonElement).disabled = false;
  scheduleRender();
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
