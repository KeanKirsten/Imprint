import type { Effect } from '../types';

function setInput(id: string, value: number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.value = String(value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function lerp(t: number, min: number, max: number): number {
  return Math.round((min + (t / 100) * (max - min)) * 10) / 10;
}

// ── Corpus macros ────────────────────────────────────────────────
function applyCorpusScale(v: number): void {
  // c-size: 4–60px
  setInput('c-size', lerp(v, 4, 60));
}

function applyCorpusIntensity(v: number): void {
  // c-contrast: 50–300%
  setInput('c-contrast', lerp(v, 50, 300));
}

function applyCorpusCoverage(v: number): void {
  // c-threshold: 0–250
  setInput('c-threshold', lerp(v, 0, 250));
}

// ── Halftone macros ──────────────────────────────────────────────
function applyHalftoneDensity(v: number): void {
  // h-spacing: 50px (sparse) at v=0, 4px (dense) at v=100 — inverse mapping
  const spacing = Math.round(lerp(v, 50, 4));
  setInput('h-spacing', spacing);
  setInput('h-min', 0);
  setInput('h-max', Math.min(40, Math.round(spacing * 0.5)));
}

function applyHalftoneIntensity(v: number): void {
  // h-contrast: 50–300%
  setInput('h-contrast', lerp(v, 50, 300));
}

// ── Ink macros ───────────────────────────────────────────────────
function applyInkDensity(v: number): void {
  // i-spacing: 20px (sparse) at v=0, 2px (dense) at v=100 — inverse mapping
  const spacing = Math.round(lerp(v, 20, 2));
  setInput('i-spacing', spacing);
  setInput('i-minr', Math.min(5, Math.round(spacing * 0.04 * 10) / 10));
  setInput('i-maxr', Math.min(12, Math.round(spacing * 0.7 * 10) / 10));
}

function applyInkIntensity(v: number): void {
  // i-contrast: 50–300%
  setInput('i-contrast', lerp(v, 50, 300));
}

// ── Public API ───────────────────────────────────────────────────
export function onMacro(effect: Effect, macro: string, rawValue: string): void {
  const v = parseFloat(rawValue);

  const spanId = `m-${effect[0]}-${macro}-v`;
  const span = document.getElementById(spanId);
  if (span) span.textContent = String(Math.round(v));

  if (effect === 'corpus') {
    if (macro === 'scale')     applyCorpusScale(v);
    if (macro === 'intensity') applyCorpusIntensity(v);
    if (macro === 'coverage')  applyCorpusCoverage(v);
  } else if (effect === 'halftone') {
    if (macro === 'density')   applyHalftoneDensity(v);
    if (macro === 'intensity') applyHalftoneIntensity(v);
  } else if (effect === 'ink') {
    if (macro === 'density')   applyInkDensity(v);
    if (macro === 'intensity') applyInkIntensity(v);
  }
}

export function showMacroSection(effect: Effect): void {
  (['corpus', 'halftone', 'ink'] as Effect[]).forEach(e => {
    const el = document.getElementById(`macro-${e}`);
    if (el) el.style.display = e === effect ? 'block' : 'none';
  });
}
