import { state } from '../state';
import { renderNow } from '../workspace/index';
import { cubicBezier } from './easing';
import type { Effect } from '../types';

// Map linear progress p in [0,1] to a ping-pong position 0->1->0.
export function progressToPosition(p: number): number {
  return 1 - Math.abs(1 - 2 * p);
}

// Apply each armed slider's eased value at progress p.
// When `render` is true (preview), triggers an immediate render; the exporter
// passes false and awaits its own render afterwards.
export function applyAnimationAtProgress(effect: Effect, p: number, render = true): void {
  const anim = state.animations[effect];
  const pos = progressToPosition(p);
  for (const s of anim.sliders) {
    const eased = cubicBezier(s.ease[0], s.ease[1], s.ease[2], s.ease[3])(pos);
    const value = s.from + (s.to - s.from) * eased;
    const input = document.getElementById(s.sliderId) as HTMLInputElement | null;
    if (!input) continue;
    input.value = String(value);
    // Fire the slider's own oninput so its value label updates (its scheduleRender is debounced/harmless).
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (render) renderNow();
}

let rafId: number | null = null;
let startTime = 0;

export function play(effect: Effect): void {
  if (state.animPlaying) return;
  const anim = state.animations[effect];
  if (anim.sliders.length === 0) return;
  state.animPlaying = true;
  startTime = performance.now();

  const tick = (now: number): void => {
    if (!state.animPlaying) return;
    const elapsed = (now - startTime) % anim.durationMs;
    applyAnimationAtProgress(effect, elapsed / anim.durationMs);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

export function pause(): void {
  state.animPlaying = false;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}
