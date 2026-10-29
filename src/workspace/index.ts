import { state } from '../state';
import { mainCanvas } from '../utils/canvas';
import { renderCorpus } from '../effects/corpus/renderer';
import { renderHalftone } from '../effects/halftone/renderer';
import { renderBleedInk } from '../effects/ink/renderer';
import type { Effect } from '../types';
import { initPanel } from './panel';
import { showMacroSection } from './macros';

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

  // Show correct macro section and make panel visible
  showMacroSection(effect);
  const panel = document.getElementById('ws-panel') as HTMLElement;
  panel.classList.add('panel-visible');

  // Toggle active sidebar within advanced section
  (['corpus', 'halftone', 'ink'] as Effect[]).forEach(e => {
    const sb = document.getElementById(`sidebar-${e}`);
    if (sb) sb.classList.toggle('active', e === effect);
  });

  const ws = document.getElementById('view-workspace') as HTMLElement;
  const ld = document.getElementById('view-landing')   as HTMLElement;

  ws.style.display = 'flex';
  ld.style.pointerEvents = 'none';

  requestAnimationFrame(() => {
    ws.classList.add('visible');
    ld.style.opacity = '0';
  });

  window.dispatchEvent(new CustomEvent('imprint:effectchange', { detail: effect }));
  if (state.currentSource) scheduleRender();
}

/**
 * Return from the workspace to the landing view.
 * Exposed on window.
 */
export function toggleAdvanced(): void {
  const adv    = document.getElementById('ws-advanced')        as HTMLElement;
  const toggle = document.getElementById('ws-advanced-toggle') as HTMLElement;
  const open   = adv.classList.toggle('expanded');
  toggle.textContent = open ? 'Advanced ⌃' : 'Advanced ⌄';
  toggle.classList.toggle('open', open);
}

/**
 * Switch active effect without leaving the workspace.
 */
export function switchEffect(effect: Effect): void {
  state.currentEffect = effect;

  const badge = document.getElementById('ws-badge') as HTMLElement;
  const badgeNames: Record<Effect, string> = { corpus: 'Corpus', halftone: 'Halftone', ink: 'Bleed & Ink' };
  badge.textContent = badgeNames[effect];
  badge.setAttribute('data-effect', effect);

  showMacroSection(effect);

  (['corpus', 'halftone', 'ink'] as Effect[]).forEach(e => {
    const sb = document.getElementById(`sidebar-${e}`);
    if (sb) sb.classList.toggle('active', e === effect);
  });

  document.querySelectorAll<HTMLElement>('.ws-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.effect === effect);
  });

  if (state.currentSource) scheduleRender();
}

export function goToLanding(): void {
  const ws = document.getElementById('view-workspace') as HTMLElement;
  const ld = document.getElementById('view-landing')   as HTMLElement;

  ws.classList.remove('visible');
  ld.style.opacity = '1';
  ld.style.pointerEvents = 'all';

  document.querySelectorAll<HTMLElement>('.lp-label.leaving').forEach(el => {
    el.classList.remove('leaving');
    el.style.transform = '';
  });

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
 * Returns a promise that resolves when the frame is on the canvas
 * (synchronous effects resolve immediately; ink-bleed awaits its worker).
 */
function doRender(): Promise<void> {
  if (!state.currentSource || !state.currentEffect) return Promise.resolve();
  if (state.currentEffect === 'corpus')   { renderCorpus();   return Promise.resolve(); }
  if (state.currentEffect === 'halftone') { renderHalftone(); return Promise.resolve(); }
  if (state.currentEffect === 'ink')      return renderBleedInk();
  return Promise.resolve();
}

/**
 * Immediate render bypassing the debounce — used by animation playback.
 */
export function renderNow(): void {
  void doRender();
}

/**
 * Awaitable render used by GIF export — resolves once the canvas is updated.
 */
export function renderFrameAsync(): Promise<void> {
  return doRender();
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
  initPanel();

  // Accordion: clicking any section label collapses/expands that section
  document.querySelectorAll('.ws-advanced .s-section .s-label').forEach(label => {
    label.addEventListener('click', () => {
      (label.parentElement as HTMLElement).classList.toggle('collapsed');
    });
  });
}
