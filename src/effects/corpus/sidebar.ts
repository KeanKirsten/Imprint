import { state } from '../../state';
import { scheduleRender } from '../../workspace/index';
import { mainCanvas } from '../../utils/canvas';
import type { CorpusCharSet } from '../../types';

/**
 * Switch between mosaic and threshold render styles.
 * Exposed on window.
 */
export function setRenderStyle(mode: 'mosaic' | 'threshold'): void {
  state.corpusRenderStyle = mode;
  (document.getElementById('rs-mosaic') as HTMLElement).classList.toggle('active', mode === 'mosaic');
  (document.getElementById('rs-threshold') as HTMLElement).classList.toggle('active', mode === 'threshold');
  scheduleRender();
}

/**
 * Switch the corpus colour mode and show/hide the custom colour inputs.
 * Exposed on window.
 */
export function setCorpusColor(mode: 'image' | 'duotone' | 'gradient' | 'invert'): void {
  state.corpusColorMode = mode;
  (['image', 'duotone', 'gradient', 'invert'] as const).forEach(m => {
    (document.getElementById(`cc-${m}`) as HTMLElement).classList.toggle('active', m === mode);
  });
  (document.getElementById('c-custom-cols') as HTMLElement).style.display =
    (mode === 'duotone' || mode === 'gradient') ? 'block' : 'none';
  scheduleRender();
}

/**
 * Switch the corpus character-set mode and show/hide the custom text group.
 * Exposed on window.
 */
export function setCorpusCharSet(mode: CorpusCharSet): void {
  state.corpusCharSet = mode;
  (['hex', 'binary', 'base64', 'custom'] as const).forEach(m => {
    (document.getElementById(`cs-${m}`) as HTMLElement).classList.toggle('active', m === mode);
  });
  (document.getElementById('c-custom-text') as HTMLElement).style.display =
    mode === 'custom' ? 'block' : 'none';
  scheduleRender();
}

/**
 * Toggle scatter-point placement mode on/off.
 * Exposed on window.
 */
export function toggleCorpusScatter(): void {
  state.corpusScatterOn = !state.corpusScatterOn;
  const btn = document.getElementById('c-scatter-btn') as HTMLButtonElement;
  btn.classList.toggle('active', state.corpusScatterOn);
  btn.textContent = state.corpusScatterOn ? '⊕ Done' : '⊕ Place points';
  mainCanvas.style.cursor = state.corpusScatterOn ? 'crosshair' : '';
}

/**
 * Remove all scatter points and re-render.
 * Exposed on window.
 */
export function clearCorpusScatter(): void {
  state.corpusScatterPoints.length = 0;
  scheduleRender();
}

/**
 * Attach mouse event listeners on the main canvas for placing/dragging/
 * right-click-removing scatter points.
 */
export function initCorpusSidebar(): void {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    if (state.currentEffect !== 'corpus' || !state.corpusScatterOn) return;
    e.stopPropagation();

    const rect = canvas.getBoundingClientRect();
    const cx   = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const cy   = (e.clientY - rect.top)  * (canvas.height / rect.height);

    const pts = state.corpusScatterPoints;
    let hit   = -1;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (Math.hypot(cx - pts[i].x, cy - pts[i].y) < 18) { hit = i; break; }
    }

    if (hit >= 0) {
      state.corpusDrag = { idx: hit };
    } else {
      pts.push({ x: cx, y: cy, id: state.corpusScatterNextId++ });
      scheduleRender();
    }
  });

  canvas.addEventListener('contextmenu', (e: MouseEvent) => {
    if (state.currentEffect !== 'corpus' || !state.corpusScatterOn) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const cx   = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const cy   = (e.clientY - rect.top)  * (canvas.height / rect.height);

    const pts = state.corpusScatterPoints;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (Math.hypot(cx - pts[i].x, cy - pts[i].y) < 18) {
        pts.splice(i, 1);
        scheduleRender();
        break;
      }
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!state.corpusDrag) return;
    const rect = canvas.getBoundingClientRect();
    state.corpusScatterPoints[state.corpusDrag.idx].x =
      (e.clientX - rect.left) * (canvas.width  / rect.width);
    state.corpusScatterPoints[state.corpusDrag.idx].y =
      (e.clientY - rect.top)  * (canvas.height / rect.height);
    if (state.currentSource) scheduleRender();
  });

  window.addEventListener('mouseup', () => {
    state.corpusDrag = null;
  });
}
