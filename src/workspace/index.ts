import { state } from '../state';
import { mainCanvas } from '../utils/canvas';
import { renderCorpus } from '../effects/corpus/renderer';
import { renderHalftone } from '../effects/halftone/renderer';
import { renderBleedInk } from '../effects/ink/renderer';
import type { Effect } from '../types';

/**
 * Transition from the landing to the workspace for the given effect.
 * Exposed on window so HTML onclick attributes can call it.
 */
export function enterEffect(effect: Effect): void {
  state.currentEffect = effect;
  state.landingActive = false;

  const badge = document.getElementById('ws-badge') as HTMLElement;
  const badgeNames: Record<Effect, string> = {
    corpus:   'Corpus',
    halftone: 'Halftone',
    ink:      'Bleed & Ink',
  };
  badge.textContent = badgeNames[effect];
  badge.setAttribute('data-effect', effect);

  (['corpus', 'halftone', 'ink'] as Effect[]).forEach(e => {
    const sb = document.getElementById(`sidebar-${e}`) as HTMLElement;
    sb.classList.toggle('active', e === effect);
  });

  const ws = document.getElementById('view-workspace') as HTMLElement;
  const ld = document.getElementById('view-landing')   as HTMLElement;

  ws.style.display = 'flex';
  ld.style.pointerEvents = 'none';

  requestAnimationFrame(() => {
    ws.classList.add('visible');
    ld.style.opacity = '0';
  });

  if (state.currentSource) scheduleRender();
}

/**
 * Return from the workspace to the landing view.
 * Exposed on window.
 */
export function goToLanding(): void {
  const ws = document.getElementById('view-workspace') as HTMLElement;
  const ld = document.getElementById('view-landing')   as HTMLElement;

  ws.classList.remove('visible');
  ld.style.opacity = '1';
  ld.style.pointerEvents = 'all';

  setTimeout(() => {
    ws.style.display = 'none';
    state.landingActive = true;
  }, 450);

  mainCanvas.style.display = 'none';
}

/**
 * Debounced render trigger (80 ms).
 * Exposed on window.
 */
export function scheduleRender(): void {
  if (!state.currentSource || !state.currentEffect) return;
  if (state.renderTimer !== null) clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(doRender, 80);
}

/**
 * Dispatch rendering to the correct effect renderer.
 */
function doRender(): void {
  if (!state.currentSource || !state.currentEffect) return;
  if (state.currentEffect === 'corpus')   renderCorpus();
  if (state.currentEffect === 'halftone') renderHalftone();
  if (state.currentEffect === 'ink')      renderBleedInk();
}

/**
 * Export the current canvas as a PNG download.
 * Exposed on window.
 */
export function exportImg(): void {
  if (!state.currentSource) return;
  const a = document.createElement('a');
  a.download = `imprint-${state.currentEffect ?? 'export'}-${Date.now()}.png`;
  a.href = mainCanvas.toDataURL('image/png');
  a.click();
}

/**
 * Initialise workspace: hide the workspace view until an effect is chosen.
 */
export function initWorkspace(): void {
  const ws = document.getElementById('view-workspace') as HTMLElement;
  ws.style.display = 'none';
  mainCanvas.style.display = 'none';
}
