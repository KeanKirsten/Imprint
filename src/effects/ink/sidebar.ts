import { state } from '../../state';
import { scheduleRender } from '../../workspace/index';

/**
 * Switch between stipple and bleed ink modes.
 * Exposed on window.
 */
export function setInkMode(mode: 'stipple' | 'bleed'): void {
  state.inkMode = mode;
  (document.getElementById('im-stipple') as HTMLElement).classList.toggle('active', mode === 'stipple');
  (document.getElementById('im-bleed') as HTMLElement).classList.toggle('active',   mode === 'bleed');
  (document.getElementById('ink-stipple-section') as HTMLElement).style.display = mode === 'stipple' ? '' : 'none';
  (document.getElementById('ink-bleed-section') as HTMLElement).style.display   = mode === 'bleed'   ? '' : 'none';
  scheduleRender();
}
