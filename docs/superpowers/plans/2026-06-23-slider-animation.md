# Slider Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a From→To slider-animation system to all three effects, with an editable bezier easing curve, looping live preview, and GIF export.

**Architecture:** A self-contained `src/animation/` module. Each effect has an independent `EffectAnimation` (set of armed sliders + timing) held in `state`. A stopwatch icon next to each numeric slider arms/disarms it. Playback drives the real slider inputs via a `requestAnimationFrame` loop (ping-pong progress eased through a per-slider cubic bezier), so the existing renderers need no changes. A bottom panel hosts transport controls and per-slider From/To fields plus a canvas curve editor. Export steps frame-by-frame and encodes a GIF with `gifenc`.

**Tech Stack:** TypeScript, Vite, Canvas 2D, `gifenc` (new runtime dependency). No test framework exists in this project; verification is `npx tsc --noEmit` plus targeted manual browser checks, consistent with prior plans.

**Note on verification:** This project has no unit-test runner. Each task verifies with `cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit` (expect no errors) and, where noted, a manual browser check via `npm run dev`.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/animation/types.ts` | `SliderAnim`, `EffectAnimation` interfaces |
| `src/animation/easing.ts` | Cubic-bezier solver + named presets |
| `src/animation/registry.ts` | Discover animatable range sliders in an effect's sidebar |
| `src/animation/playback.ts` | Ping-pong progress, apply eased values, play/pause loop |
| `src/animation/stopwatch.ts` | Inject stopwatch icons, arm/disarm sliders |
| `src/animation/editor.ts` | Bottom panel: transport + track rows + curve editor |
| `src/animation/export.ts` | GIF export via gifenc |
| `src/animation/index.ts` | Init + effect-change wiring |
| `src/state.ts` | `animations`, `animPanelOpen`, `animPlaying` |
| `src/workspace/index.ts` | `renderNow`, `renderFrameAsync`; dispatch effect-change event |
| `src/effects/ink/renderer.ts` | Make `renderBleedInk` return a `Promise<void>` |
| `src/main.ts` | Expose `toggleAnimPanel`; call `initAnimation` |
| `index.html` | Timeline button + bottom panel markup |
| `src/styles/workspace.css` | Panel / transport / track / curve / stopwatch styles |
| `package.json` | Add `gifenc` |

---

### Task 1: Dependency, types, and state

**Files:** Modify `package.json` (via npm), Create `src/animation/types.ts`, Modify `src/state.ts`

- [ ] **Step 1: Install gifenc**

```
cd C:\Users\keana\Tools\Imprint && npm install gifenc
```
Expected: `package.json` gains a `dependencies` block with `gifenc`, and `package-lock.json` updates.

- [ ] **Step 2: Create `src/animation/types.ts`**

```ts
import type { Effect } from '../types';

// One animated slider: drives `sliderId` from `from` to `to`, eased by a cubic bezier.
export interface SliderAnim {
  sliderId: string;                         // existing DOM id, e.g. 'h-spacing'
  label: string;                            // display label from the sidebar row
  min: number;                              // slider min (from element)
  max: number;                              // slider max (from element)
  from: number;
  to: number;
  ease: [number, number, number, number];  // cubic-bezier control points x1,y1,x2,y2
}

// Per-effect animation: armed sliders + shared timing.
export interface EffectAnimation {
  durationMs: number;   // full A->B->A loop length; default 3000
  fps: number;          // default 30
  sliders: SliderAnim[];
}

// Convenience alias for the per-effect map.
export type AnimationMap = Record<Effect, EffectAnimation>;
```

- [ ] **Step 3: Add animation state to `src/state.ts`**

Add `EffectAnimation` (and `AnimationMap`) to the imports. At the top import block from local files, add:
```ts
import type { EffectAnimation } from './animation/types';
```

Add these fields to the `state` object (after the corpus fields, before the closing brace):
```ts
  // Animation per effect, keyed by effect name
  animations: {
    corpus:   { durationMs: 3000, fps: 30, sliders: [] },
    halftone: { durationMs: 3000, fps: 30, sliders: [] },
    ink:      { durationMs: 3000, fps: 30, sliders: [] },
  } as Record<'corpus' | 'halftone' | 'ink', EffectAnimation>,

  // Whether the timeline panel is open
  animPanelOpen: false,

  // Whether preview playback is running
  animPlaying: false,
```

- [ ] **Step 4: Verify**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add package.json package-lock.json src/animation/types.ts src/state.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): add gifenc dep, animation types and state"
```

---

### Task 2: Easing solver and presets

**Files:** Create `src/animation/easing.ts`

- [ ] **Step 1: Create `src/animation/easing.ts`**

```ts
// Cubic-bezier easing matching CSS cubic-bezier(p1x,p1y,p2x,p2y), with P0=(0,0), P3=(1,1).
// Returns a function mapping input t in [0,1] to eased output (may exceed [0,1] for overshoot).
export function cubicBezier(
  p1x: number, p1y: number, p2x: number, p2y: number
): (t: number) => number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x: number): number => {
    // Newton-Raphson
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Bisection fallback
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      if (err < 0) lo = t; else hi = t;
      const next = (lo + hi) / 2;
      if (next === t) break;
      t = next;
    }
    return t;
  };

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solveT(t));
  };
}

export type EasePreset = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export const PRESETS: Record<EasePreset, [number, number, number, number]> = {
  linear:    [0,    0, 1,    1],
  easeIn:    [0.42, 0, 1,    1],
  easeOut:   [0,    0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

export const PRESET_LABELS: Record<EasePreset, string> = {
  linear:    'Linear',
  easeIn:    'In',
  easeOut:   'Out',
  easeInOut: 'In-Out',
};
```

- [ ] **Step 2: Verify**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Sanity-check the solver numerically**

Run this throwaway check (does not modify the repo):
```
cd C:\Users\keana\Tools\Imprint && node -e "const cx=3*0.42,bx=3*(0.58-0.42)-cx,ax=1-cx-bx,cy=0,by=3*(1-0)-cy,ay=1-cy-by;const sx=t=>((ax*t+bx)*t+cx)*t,sy=t=>((ay*t+by)*t+cy)*t,sdx=t=>(3*ax*t+2*bx)*t+cx;function s(x){let t=x;for(let i=0;i<8;i++){const e=sx(t)-x;if(Math.abs(e)<1e-6)return t;const d=sdx(t);if(Math.abs(d)<1e-6)break;t-=e/d;}return t;}const f=t=>sy(s(t));console.log('f(0)=',f(0).toFixed(3),'f(0.5)=',f(0.5).toFixed(3),'f(1)=',f(1).toFixed(3));"
```
Expected: `f(0)= 0.000 f(0.5)= 0.500 f(1)= 1.000` (ease-in-out is symmetric, so the midpoint is 0.5).

- [ ] **Step 4: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/animation/easing.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): cubic-bezier easing solver and presets"
```

---

### Task 3: Slider registry

**Files:** Create `src/animation/registry.ts`

- [ ] **Step 1: Create `src/animation/registry.ts`**

```ts
import type { Effect } from '../types';

export interface AnimatableSlider {
  id: string;
  label: string;
  min: number;
  max: number;
}

// Discover every numeric range slider in the given effect's sidebar.
// Reads id, label (from the sibling .s-row-lbl), and min/max from the element.
export function getAnimatableSliders(effect: Effect): AnimatableSlider[] {
  const sidebar = document.getElementById(`sidebar-${effect}`);
  if (!sidebar) return [];
  const inputs = Array.from(
    sidebar.querySelectorAll('input[type="range"]')
  ) as HTMLInputElement[];

  return inputs
    .filter(input => input.id)
    .map(input => {
      const row = input.closest('.s-row');
      const lbl = row?.querySelector('.s-row-lbl');
      return {
        id: input.id,
        label: lbl?.textContent?.trim() || input.id,
        min: parseFloat(input.min) || 0,
        max: parseFloat(input.max) || 100,
      };
    });
}
```

- [ ] **Step 2: Verify**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/animation/registry.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): animatable slider registry"
```

---

### Task 4: Render integration (workspace + ink renderer)

**Files:** Modify `src/effects/ink/renderer.ts`, Modify `src/workspace/index.ts`

The playback loop and exporter need an immediate (non-debounced) render, and the exporter must be able to await async (worker-based) ink-bleed frames. This task makes `renderBleedInk` return a promise and adds `renderNow` / `renderFrameAsync` to the workspace.

- [ ] **Step 1: Make `renderBleedInk` return a `Promise<void>`**

In `src/effects/ink/renderer.ts`, change the `renderBleedInk` signature and both branches to return promises. Replace the existing `renderBleedInk` function with:
```ts
export function renderBleedInk(): Promise<void> {
  const { dispW, dispH } = getDispSize();
  const threshold = parseInt((document.getElementById('i-threshold') as HTMLInputElement).value);
  const contrast  = parseInt((document.getElementById('i-contrast') as HTMLInputElement).value);
  const inkHex    = (document.getElementById('i-ink') as HTMLInputElement).value;
  const paperHex  = (document.getElementById('i-paper') as HTMLInputElement).value;
  const [iR, iG, iB] = hexToRgb(inkHex);
  const [pR, pG, pB] = hexToRgb(paperHex);

  drawToOff(dispW, dispH, contrast);
  const src = offCtx.getImageData(0, 0, dispW, dispH).data;

  mainCanvas.width  = dispW;
  mainCanvas.height = dispH;
  const ctx = mainCtx;

  if (state.inkMode === 'stipple') {
    renderStipple(ctx, src, dispW, dispH, threshold, inkHex, paperHex);
    return Promise.resolve();
  } else {
    return renderBleed(ctx, src, dispW, dispH, threshold, iR, iG, iB, pR, pG, pB);
  }
}
```

- [ ] **Step 2: Make `renderBleed` return a promise that resolves when the worker posts back**

In the same file, replace the `renderBleed` function with:
```ts
// Bleed mode: offloads heavy pixel work to the ink worker.
// Resolves once the worker result has been drawn to the canvas.
function renderBleed(
  ctx: CanvasRenderingContext2D,
  src: Uint8ClampedArray,
  W: number, H: number,
  threshold: number,
  iR: number, iG: number, iB: number,
  pR: number, pG: number, pB: number
): Promise<void> {
  const bleedAmt = parseInt((document.getElementById('i-bleed') as HTMLInputElement).value);
  const spread   = parseInt((document.getElementById('i-spread') as HTMLInputElement).value) / 100;
  const grain    = parseInt((document.getElementById('i-bgrain') as HTMLInputElement).value) / 100;
  const spatter  = parseInt((document.getElementById('i-spatter') as HTMLInputElement).value);

  const srcBuffer = src.buffer.slice(0);
  const worker = getInkWorker();

  return new Promise<void>(resolve => {
    worker.onmessage = (e: MessageEvent<InkWorkerResult>) => {
      const { pixels, width, height } = e.data;
      const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer as ArrayBuffer), width, height);
      ctx.putImageData(imageData, 0, 0);
      resolve();
    };
    worker.postMessage(
      { srcBuffer, width: W, height: H, threshold, bleedAmt, spread, grain, spatter, inkR: iR, inkG: iG, inkB: iB, paperR: pR, paperG: pG, paperB: pB },
      [srcBuffer]
    );
  });
}
```

- [ ] **Step 3: Update `doRender` and add `renderNow` / `renderFrameAsync` in `src/workspace/index.ts`**

Replace the existing `doRender` function with:
```ts
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
```

(The existing `scheduleRender` calls `setTimeout(doRender, 80)`; `doRender` now returning a promise is harmless there.)

- [ ] **Step 4: Dispatch an effect-change event from `enterEffect`**

In `src/workspace/index.ts`, inside `enterEffect`, just before the final `if (state.currentSource) scheduleRender();` line, add:
```ts
  window.dispatchEvent(new CustomEvent('imprint:effectchange', { detail: effect }));
```

- [ ] **Step 5: Verify**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/effects/ink/renderer.ts src/workspace/index.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): awaitable render path and effect-change event"
```

---

### Task 5: Playback engine

**Files:** Create `src/animation/playback.ts`

- [ ] **Step 1: Create `src/animation/playback.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/animation/playback.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): playback loop and value application"
```

---

### Task 6: Stopwatch arming

**Files:** Create `src/animation/stopwatch.ts`

- [ ] **Step 1: Create `src/animation/stopwatch.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors. (`editor.ts` does not exist yet, so this will error on the `./editor` import — that is expected until Task 7. If you are running tasks in order, defer the tsc check to the end of Task 7. Commit anyway so the history stays bite-sized.)

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/animation/stopwatch.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): stopwatch arming for sliders"
```

---

### Task 7: Editor panel and curve editor

**Files:** Create `src/animation/editor.ts`

- [ ] **Step 1: Create `src/animation/editor.ts`**

```ts
import { state } from '../state';
import { PRESETS, PRESET_LABELS, type EasePreset } from './easing';
import { disarmSlider } from './stopwatch';
import { play, pause } from './playback';
import { exportGif } from './export';
import type { Effect } from '../types';
import type { SliderAnim } from './types';

export function togglePanel(): void {
  state.animPanelOpen = !state.animPanelOpen;
  const panel = document.getElementById('anim-panel') as HTMLElement;
  panel.style.display = state.animPanelOpen ? 'flex' : 'none';
  document.getElementById('anim-toggle')?.classList.toggle('active', state.animPanelOpen);
  if (state.animPanelOpen) refreshEditor();
}

export function refreshEditor(): void {
  if (!state.animPanelOpen) return;
  const effect = state.currentEffect;
  renderTransport(effect);
  renderTracks(effect);
}

function renderTransport(effect: Effect | null): void {
  const el = document.getElementById('anim-transport') as HTMLElement;
  el.innerHTML = '';
  if (!effect) return;
  const anim = state.animations[effect];

  const playBtn = document.createElement('button');
  playBtn.className = 'anim-play';
  const setLabel = () => { playBtn.textContent = state.animPlaying ? '❚❚ Pause' : '▶ Play'; };
  setLabel();
  playBtn.addEventListener('click', () => {
    if (state.animPlaying) pause(); else play(effect);
    setLabel();
  });
  el.appendChild(playBtn);

  const durWrap = document.createElement('label');
  durWrap.className = 'anim-dur';
  durWrap.textContent = 'Duration ';
  const dur = document.createElement('input');
  dur.type = 'number'; dur.min = '0.2'; dur.step = '0.1';
  dur.value = (anim.durationMs / 1000).toFixed(1);
  dur.addEventListener('input', () => {
    const v = parseFloat(dur.value);
    if (v > 0) anim.durationMs = v * 1000;
  });
  durWrap.appendChild(dur);
  const unit = document.createElement('span'); unit.textContent = 's';
  durWrap.appendChild(unit);
  el.appendChild(durWrap);

  const fps = document.createElement('span');
  fps.className = 'anim-fps';
  fps.textContent = `${anim.fps}fps`;
  el.appendChild(fps);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'anim-export';
  exportBtn.textContent = '↓ Export GIF';
  exportBtn.addEventListener('click', async () => {
    if (anim.sliders.length === 0) return;
    const original = exportBtn.textContent;
    exportBtn.disabled = true;
    try {
      await exportGif(effect, (done, total) => {
        exportBtn.textContent = `Encoding ${done}/${total}`;
      });
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = original;
    }
  });
  el.appendChild(exportBtn);
}

function renderTracks(effect: Effect | null): void {
  const wrap = document.getElementById('anim-tracks') as HTMLElement;
  wrap.innerHTML = '';
  if (!effect) return;
  const anim = state.animations[effect];
  if (anim.sliders.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'anim-empty';
    empty.textContent = 'Click the ◷ icon next to any slider to animate it.';
    wrap.appendChild(empty);
    return;
  }
  for (const s of anim.sliders) wrap.appendChild(buildTrackRow(effect, s));
}

function buildTrackRow(effect: Effect, s: SliderAnim): HTMLElement {
  const row = document.createElement('div');
  row.className = 'anim-track';

  const head = document.createElement('div');
  head.className = 'anim-track-head';
  const name = document.createElement('span');
  name.className = 'anim-track-name';
  name.textContent = s.label;
  head.appendChild(name);
  const rm = document.createElement('button');
  rm.className = 'anim-track-rm';
  rm.textContent = '✕';
  rm.title = 'Remove';
  rm.addEventListener('click', () => disarmSlider(effect, s.sliderId));
  head.appendChild(rm);
  row.appendChild(head);

  const fields = document.createElement('div');
  fields.className = 'anim-track-fields';
  fields.appendChild(makeNumField('From', s.from, s.min, s.max, v => { s.from = v; }));
  fields.appendChild(makeNumField('To',   s.to,   s.min, s.max, v => { s.to   = v; }));
  row.appendChild(fields);

  row.appendChild(buildCurveEditor(s));
  return row;
}

function makeNumField(
  label: string, value: number, min: number, max: number, onChange: (v: number) => void
): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'anim-numfield';
  wrap.textContent = label + ' ';
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.value = String(value);
  inp.min = String(min);
  inp.max = String(max);
  inp.step = 'any';
  inp.addEventListener('input', () => {
    let v = parseFloat(inp.value);
    if (isNaN(v)) return;
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  });
  wrap.appendChild(inp);
  return wrap;
}

function buildCurveEditor(s: SliderAnim): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'anim-curve';

  const SIZE = 120;
  const PAD = 30;
  const span = SIZE - PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.className = 'anim-curve-canvas';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const toPx = (x: number, y: number): [number, number] => [PAD + x * span, SIZE - PAD - y * span];
  const toCurve = (px: number, py: number): [number, number] => [(px - PAD) / span, (SIZE - PAD - py) / span];

  function draw(): void {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, span, span);

    const [c1x, c1y] = toPx(s.ease[0], s.ease[1]);
    const [c2x, c2y] = toPx(s.ease[2], s.ease[3]);
    const [p0x, p0y] = toPx(0, 0);
    const [p3x, p3y] = toPx(1, 1);

    ctx.strokeStyle = 'rgba(212,255,0,0.4)';
    ctx.beginPath(); ctx.moveTo(p0x, p0y); ctx.lineTo(c1x, c1y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p3x, p3y); ctx.lineTo(c2x, c2y); ctx.stroke();

    ctx.strokeStyle = '#d4ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p3x, p3y);
    ctx.stroke();

    ctx.fillStyle = '#d4ff00';
    for (const [hx, hy] of [[c1x, c1y], [c2x, c2y]] as [number, number][]) {
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  draw();

  let dragging: 0 | 1 | null = null;
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (SIZE / rect.width);
    const py = (e.clientY - rect.top) * (SIZE / rect.height);
    const [c1x, c1y] = toPx(s.ease[0], s.ease[1]);
    const [c2x, c2y] = toPx(s.ease[2], s.ease[3]);
    const d1 = Math.hypot(px - c1x, py - c1y);
    const d2 = Math.hypot(px - c2x, py - c2y);
    if (d1 < 12 || d2 < 12) {
      dragging = d1 <= d2 ? 0 : 1;
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (dragging === null) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (SIZE / rect.width);
    const py = (e.clientY - rect.top) * (SIZE / rect.height);
    let [cx, cy] = toCurve(px, py);
    cx = Math.max(0, Math.min(1, cx));        // x stays in [0,1]
    cy = Math.max(-0.5, Math.min(1.5, cy));   // y may overshoot
    if (dragging === 0) { s.ease[0] = cx; s.ease[1] = cy; }
    else { s.ease[2] = cx; s.ease[3] = cy; }
    draw();
  });
  const endDrag = () => { dragging = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const presets = document.createElement('div');
  presets.className = 'anim-presets';
  (Object.keys(PRESETS) as EasePreset[]).forEach(key => {
    const b = document.createElement('button');
    b.className = 'anim-preset';
    b.textContent = PRESET_LABELS[key];
    b.addEventListener('click', () => {
      s.ease = [...PRESETS[key]] as [number, number, number, number];
      draw();
    });
    presets.appendChild(b);
  });
  wrap.appendChild(presets);

  return wrap;
}
```

- [ ] **Step 2: Verify (both editor and stopwatch now resolve)**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors. (`./export` is imported here and created in Task 8; if running strictly in order, this import will error until Task 8 — defer the clean tsc pass to end of Task 8.)

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/animation/editor.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): editor panel, track rows, and curve editor"
```

---

### Task 8: GIF export

**Files:** Create `src/animation/export.ts`

- [ ] **Step 1: Create `src/animation/export.ts`**

```ts
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { state } from '../state';
import { renderFrameAsync } from '../workspace/index';
import { applyAnimationAtProgress } from './playback';
import { mainCanvas, mainCtx } from '../utils/canvas';
import type { Effect } from '../types';

// Step the animation frame by frame and encode a looping GIF, then download it.
export async function exportGif(
  effect: Effect,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const anim = state.animations[effect];
  const total = Math.max(1, Math.round((anim.durationMs / 1000) * anim.fps));
  const delay = Math.round(1000 / anim.fps);
  const gif = GIFEncoder();

  for (let i = 0; i < total; i++) {
    // Apply values without rendering, then await the real (possibly async) frame.
    applyAnimationAtProgress(effect, i / total, false);
    await renderFrameAsync();

    const w = mainCanvas.width;
    const h = mainCanvas.height;
    const { data } = mainCtx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay });

    onProgress?.(i + 1, total);
    // Yield so the progress label can paint and the UI stays responsive.
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  gif.finish();
  const blob = new Blob([gif.bytes()], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `imprint-${effect}-anim-${Date.now()}.gif`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify (full module now compiles)**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/animation/export.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): GIF export via gifenc"
```

---

### Task 9: Module init, main wiring, HTML, and styles

**Files:** Create `src/animation/index.ts`, Modify `src/main.ts`, Modify `index.html`, Modify `src/styles/workspace.css`

- [ ] **Step 1: Create `src/animation/index.ts`**

```ts
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
```

- [ ] **Step 2: Wire into `src/main.ts`**

Add these imports after the existing effect imports:
```ts
// Animation system
import { initAnimation, togglePanel } from './animation/index';
```

In the `declare global { interface Window { ... } }` block, add:
```ts
    toggleAnimPanel:      typeof togglePanel;
```

After the other `window.*` assignments, add:
```ts
window.toggleAnimPanel = togglePanel;
```

In the init section (after `initPreviews();`), add:
```ts
initAnimation();
```

- [ ] **Step 3: Add the Timeline button and panel to `index.html`**

In the header, after the Export button (`<button class="ws-btn primary" id="export-btn" ...>`), add:
```html
    <button class="ws-btn" id="anim-toggle" onclick="toggleAnimPanel()">&#9202; Timeline</button>
```

Immediately after the closing `</div>` of `<div class="ws-body">` and before the closing `</div>` of `#view-workspace`, add:
```html
  <section id="anim-panel" class="anim-panel" style="display:none">
    <div class="anim-transport" id="anim-transport"></div>
    <div class="anim-tracks" id="anim-tracks"></div>
  </section>
```

- [ ] **Step 4: Add styles to `src/styles/workspace.css`**

Append:
```css
/* ── Animation: stopwatch icon on slider rows ───────────────────── */
.anim-stopwatch {
  flex: 0 0 auto;
  width: 18px; height: 18px;
  margin-left: 6px;
  border: 1px solid var(--line, #333);
  border-radius: 50%;
  background: transparent;
  color: var(--muted, #888);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.anim-stopwatch:hover { color: #d4ff00; border-color: #d4ff00; }
.anim-stopwatch.active { color: #d4ff00; border-color: #d4ff00; box-shadow: 0 0 0 1px #d4ff00 inset; }

/* ── Animation: bottom panel ────────────────────────────────────── */
.anim-panel {
  flex-direction: column;
  gap: 10px;
  max-height: 38vh;
  overflow-y: auto;
  padding: 12px 16px;
  border-top: 1px solid var(--line, #333);
  background: var(--panel, #141414);
}
.anim-transport {
  display: flex; align-items: center; gap: 14px;
  flex-wrap: wrap;
}
.anim-transport button {
  padding: 5px 12px;
  border: 1px solid var(--line, #333);
  background: transparent;
  color: var(--fg, #eee);
  font-size: 10px;
  letter-spacing: 0.04em;
  cursor: pointer;
}
.anim-transport button:hover:not(:disabled) { border-color: #d4ff00; color: #d4ff00; }
.anim-transport button:disabled { opacity: 0.5; cursor: default; }
.anim-dur, .anim-fps { font-size: 9px; color: var(--muted, #888); letter-spacing: 0.04em; display: flex; align-items: center; gap: 4px; }
.anim-dur input { width: 48px; background: transparent; border: 1px solid var(--line, #333); color: var(--fg, #eee); font-size: 10px; padding: 3px 5px; }

.anim-tracks { display: flex; flex-wrap: wrap; gap: 14px; }
.anim-empty { font-size: 9px; color: var(--muted, #888); letter-spacing: 0.04em; padding: 6px 0; }
.anim-track {
  border: 1px solid var(--line, #333);
  padding: 10px;
  width: 200px;
  display: flex; flex-direction: column; gap: 8px;
}
.anim-track-head { display: flex; align-items: center; justify-content: space-between; }
.anim-track-name { font-size: 10px; color: var(--fg, #eee); letter-spacing: 0.04em; }
.anim-track-rm { background: transparent; border: none; color: var(--muted, #888); cursor: pointer; font-size: 10px; }
.anim-track-rm:hover { color: #e03d6a; }
.anim-track-fields { display: flex; gap: 8px; }
.anim-numfield { font-size: 9px; color: var(--muted, #888); display: flex; align-items: center; gap: 4px; }
.anim-numfield input { width: 56px; background: transparent; border: 1px solid var(--line, #333); color: var(--fg, #eee); font-size: 10px; padding: 3px 5px; }

.anim-curve { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.anim-curve-canvas { border: 1px solid var(--line, #333); touch-action: none; cursor: crosshair; }
.anim-presets { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
.anim-preset {
  font-size: 8px; padding: 2px 6px;
  border: 1px solid var(--line, #333);
  background: transparent; color: var(--muted, #888);
  cursor: pointer; letter-spacing: 0.03em;
}
.anim-preset:hover { border-color: #d4ff00; color: #d4ff00; }
```

(Colour fallbacks are included in case the exact CSS variable names differ; the panel still renders if a variable is absent.)

- [ ] **Step 5: Verify build and manual check**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

Then:
```
cd C:\Users\keana\Tools\Imprint && npm run dev
```
Open `http://localhost:5173`, upload an image, enter an effect. Confirm:
- A `◷` stopwatch icon appears on each slider row.
- Clicking the header `⏲ Timeline` button opens the bottom panel.
- Clicking a stopwatch arms that slider → a track card appears with From/To fields and a curve editor.
- Pressing **Play** loops the effect; the armed slider visibly animates and the canvas updates.
- Dragging curve handles and clicking presets changes the easing; **Pause** stops playback.
- **Export GIF** downloads a looping `.gif` (test on Halftone or Corpus first; Ink-bleed is slower).
- Switching effects shows that effect's own (empty) animation and its stopwatches.

- [ ] **Step 6: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/animation/index.ts src/main.ts index.html src/styles/workspace.css
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(anim): init wiring, Timeline button, panel markup and styles"
```

---

## Self-Review Notes

- **Spec coverage:** data model (T1), easing presets + bezier (T2), auto-discovery registry (T3), render integration incl. async ink (T4), ping-pong playback (T5), stopwatch arming (T6), bottom panel + curve editor (T7), GIF export (T8), Timeline toggle + wiring + styles + dependency (T1/T9). All spec sections map to a task.
- **Build-order caveat:** `stopwatch.ts` (T6) imports `editor.ts` (T7), and `editor.ts` imports `export.ts` (T8). Intermediate tsc checks in T6/T7 will report the not-yet-created import; the first fully clean `tsc --noEmit` is at the end of T8. This is called out in those tasks. Runtime is fine — these are circular-safe (used inside functions, not at module top level).
- **Type consistency:** `SliderAnim.ease` is `[number,number,number,number]` everywhere; `applyAnimationAtProgress(effect, p, render?)`, `exportGif(effect, onProgress?)`, `togglePanel()`, `refreshEditor()`, `injectStopwatches/updateStopwatchState(effect)` signatures are consistent across tasks.
