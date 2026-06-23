import { state } from '../state';
import { getAnimatableSliders } from './registry';
import { PRESETS } from './easing';
import { refreshEditor } from './editor';
import type { Effect } from '../types';

export function isArmed(effect: Effect, id: string): boolean {
  return state.animations[effect].sliders.some(s => s.sliderId === id);
}

export function armSlider(effect: Effect, id: string): void {
  if (isArmed(effect, id)) return;
  const meta = getAnimatableSliders(effect).find(s => s.id === id);
  if (!meta) return;
  const input = document.getElementById(id) as HTMLInputElement | null;
  const current = input ? parseFloat(input.value) : meta.min;
  state.animations[effect].sliders.push({
    sliderId: id,
    label: meta.label,
    min: meta.min,
    max: meta.max,
    from: current,
    to: meta.max,
    ease: [...PRESETS.easeInOut] as [number, number, number, number],
  });
  updateStopwatchState(effect);
  refreshEditor();
}

export function disarmSlider(effect: Effect, id: string): void {
  const arr = state.animations[effect].sliders;
  const idx = arr.findIndex(s => s.sliderId === id);
  if (idx >= 0) arr.splice(idx, 1);
  updateStopwatchState(effect);
  refreshEditor();
}

export function toggleArm(effect: Effect, id: string): void {
  if (isArmed(effect, id)) disarmSlider(effect, id);
  else armSlider(effect, id);
}

// Insert a stopwatch button into each animatable slider's row. Idempotent.
export function injectStopwatches(effect: Effect): void {
  for (const s of getAnimatableSliders(effect)) {
    const input = document.getElementById(s.id);
    const row = input?.closest('.s-row');
    if (!row || row.querySelector('.anim-stopwatch')) continue;
    const btn = document.createElement('button');
    btn.className = 'anim-stopwatch';
    btn.type = 'button';
    btn.title = 'Animate this slider';
    btn.textContent = '◷';
    btn.addEventListener('click', () => toggleArm(effect, s.id));
    row.appendChild(btn);
  }
  updateStopwatchState(effect);
}

// Sync each stopwatch button's active state to whether its slider is armed.
export function updateStopwatchState(effect: Effect): void {
  for (const s of getAnimatableSliders(effect)) {
    const input = document.getElementById(s.id);
    const row = input?.closest('.s-row');
    const btn = row?.querySelector('.anim-stopwatch');
    if (btn) btn.classList.toggle('active', isArmed(effect, s.id));
  }
}
