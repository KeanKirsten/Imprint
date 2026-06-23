import { state } from '../state';
import { injectStopwatches, updateStopwatchState } from './stopwatch';
import { refreshEditor, togglePanel } from './editor';

// Wire animation to effect changes: inject stopwatches and refresh the panel
// whenever the active effect changes.
export function initAnimation(): void {
  window.addEventListener('imprint:effectchange', () => {
    const effect = state.currentEffect;
    if (!effect) return;
    injectStopwatches(effect);
    updateStopwatchState(effect);
    refreshEditor();
  });
}

export { togglePanel };
