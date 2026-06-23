# Slider Animation Design

**Date:** 2026-06-23
**Status:** Approved

---

## Overview

A lightweight animation system that drives any numeric slider in any effect from a
**From** value to a **To** value over time, shaped by an editable easing curve, with
live preview and GIF export for handing motion to Figma.

Deliberately **not** a full keyframe timeline. Each armed slider gets a simple
From → To motion plus a bezier easing curve (with named presets). The animation
ping-pongs (A→B→A) so it loops seamlessly.

Works across all three effects (Corpus, Halftone, Ink), each with its own
independent animation.

---

## Decisions (locked)

- **Model:** per armed slider — `From` value, `To` value, easing curve. No keyframes, no timeline scrubbing.
- **Animatable:** numeric range sliders only. No colours, no mode buttons.
- **Easing:** cubic bezier with draggable handles + presets (Linear, Ease In, Ease Out, Ease In-Out).
- **Arming:** stopwatch icon next to each slider (After Effects style); auto-discovered, not hardcoded.
- **Duration:** adjustable, default 3000ms = one full A→B→A loop. **fps:** 30. **Loop:** ping-pong, seamless.
- **Output:** live preview (looping) + GIF export via `gifenc`.
- **Layout:** collapsible bottom panel, toggled by a Timeline button in the header.
- **Scope:** per-effect animations; switching effects swaps the shown animation.

---

## Data Model

`src/animation/types.ts`:

```ts
// One animated slider: drives `sliderId` from `from` to `to`, eased by a cubic bezier.
export interface SliderAnim {
  sliderId: string;          // existing DOM id, e.g. 'h-spacing'
  label: string;             // display label from the sidebar row
  min: number;               // slider min (from element)
  max: number;               // slider max (from element)
  from: number;
  to: number;
  ease: [number, number, number, number];  // cubic-bezier control points x1,y1,x2,y2
}

// Per-effect animation: the set of armed sliders + shared timing.
export interface EffectAnimation {
  durationMs: number;        // full A->B->A loop length; default 3000
  fps: number;               // default 30
  sliders: SliderAnim[];     // armed sliders (empty = nothing animated)
}
```

### Easing presets

```ts
linear     = [0,    0, 1,    1]
easeIn     = [0.42, 0, 1,    1]
easeOut    = [0,    0, 0.58, 1]
easeInOut  = [0.42, 0, 0.58, 1]
```

Applying a preset sets `ease` to these values; the handles remain draggable afterwards.

---

## State (`src/state.ts`)

Add:

```ts
// Animation per effect, keyed by effect name
animations: {
  corpus:   { durationMs: 3000, fps: 30, sliders: [] },
  halftone: { durationMs: 3000, fps: 30, sliders: [] },
  ink:      { durationMs: 3000, fps: 30, sliders: [] },
} as Record<Effect, EffectAnimation>,

// Whether the timeline panel is open
animPanelOpen: false,

// Whether preview playback is running
animPlaying: false,
```

(`EffectAnimation` imported from `./animation/types`.)

---

## Modules (`src/animation/`)

### `registry.ts`
- `getAnimatableSliders(effect: Effect): { id, label, min, max }[]`
- Queries `#sidebar-<effect> input[type="range"]`. For each, reads `id`, `min`, `max`,
  and the label text from the sibling `.s-row-lbl` element.
- This auto-covers all current and future sliders with no maintenance.

### `easing.ts`
- `cubicBezier(p1x, p1y, p2x, p2y): (t: number) => number` — standard cubic-bezier
  solver (Newton-Raphson on x to find the parametric t, then evaluate y), matching CSS
  `cubic-bezier` semantics.
- `PRESETS: Record<'linear'|'easeIn'|'easeOut'|'easeInOut', [number,number,number,number]>`.

### `stopwatch.ts`
- `injectStopwatches(effect: Effect): void` — inserts a small stopwatch button into each
  animatable slider's `.s-row`, with a data attribute carrying the slider id. Re-run when
  the effect changes; idempotent (skips rows that already have one).
- `armSlider(effect, id)` / `disarmSlider(effect, id)` — add/remove a `SliderAnim` in
  `state.animations[effect].sliders`. On arm, seed `from` = current slider value,
  `to` = slider max, `ease` = easeInOut. Toggle the stopwatch active class. Refresh the editor panel.
- `isArmed(effect, id): boolean`.

### `playback.ts`
- `progressToPosition(p: number): number` — ping-pong: `1 - Math.abs(1 - 2*p)` (0→1→0).
- `applyAnimationAtProgress(effect, p): void` — for each armed slider: `pos = progressToPosition(p)`,
  `eased = cubicBezier(...ease)(pos)`, `value = from + (to - from) * eased`. Write to the input
  (`input.value`), dispatch its display-label update, then call `renderNow()`.
- `play(effect)` / `pause()` — rAF loop. Tracks elapsed time; `p = (elapsed % durationMs) / durationMs`.
  Sets `state.animPlaying`. Uses a monotonically increasing timestamp from `performance.now()`
  captured inside the rAF callback (allowed — not module-load time).
- On pause, leaves sliders at their current animated value.

### `editor.ts`
- Renders the bottom panel contents into `#anim-panel`:
  - **Transport:** play/pause button, duration input (seconds, default 3.0), fps label (30), Export GIF button.
  - **Armed slider rows:** for each `SliderAnim`: label, From input, To input (both numeric, clamped to min/max),
    a disarm button, and an **easing curve editor**.
  - **Easing curve editor:** a small `<canvas>` drawing the bezier curve in a unit box, with two draggable
    handle points and the four preset buttons. Dragging a handle updates `ease` and re-renders the curve
    and (if playing/scrubbed) the effect.
- `refreshEditor()` — rebuilds the panel for the current effect; called on arm/disarm/effect-switch.
- `togglePanel()` — show/hide `#anim-panel`, set `state.animPanelOpen`, toggle header button active.

### `export.ts`
- `exportGif(effect): Promise<void>`:
  - Frame count = `round(durationMs / 1000 * fps)`.
  - For each frame i: `p = i / frameCount`, `applyAnimationAtProgress(effect, p)`, render the frame,
    read `mainCanvas` pixels, add to the `gifenc` encoder with delay `1000/fps`.
  - **Async effects:** for Ink-bleed (worker), `applyAnimationAtProgress` must await the worker round-trip.
    A `renderFrameAsync()` helper resolves once the canvas is updated; synchronous effects resolve immediately.
  - Encode with `gifenc` (`GIFEncoder`, `quantize`, `applyPalette` per frame), build a Blob, trigger download
    `imprint-<effect>-anim-<timestamp>.gif` (timestamp passed in / stamped after, since `Date.now()` is fine in app code).
  - Disable the Export button and show simple progress text while encoding.

### `index.ts`
- `initAnimation(): void` — wires the header Timeline toggle, injects stopwatches for the current effect,
  and refreshes the editor. Called from `main.ts` and re-run on effect entry.

---

## Render integration (`src/workspace/index.ts`)

- Add `export function renderNow(): void` that calls the active effect's renderer immediately
  (the current `doRender` body), bypassing the 80ms debounce — needed for smooth playback.
- Add `export function renderFrameAsync(): Promise<void>` for export: resolves after a synchronous
  render, or after the ink worker posts back for bleed mode.

`enterEffect()` already runs on effect switch; extend it to re-inject stopwatches and refresh the editor
for the newly active effect.

---

## UI (`index.html`)

- **Header:** add a `Timeline` toggle button next to Export:
  ```html
  <button class="ws-btn" id="anim-toggle" onclick="toggleAnimPanel()">◷ Timeline</button>
  ```
- **Bottom panel:** a new collapsible region after `.ws-body`, hidden by default:
  ```html
  <section id="anim-panel" class="anim-panel" style="display:none">
    <div class="anim-transport" id="anim-transport"><!-- play, duration, fps, export --></div>
    <div class="anim-tracks" id="anim-tracks"><!-- armed slider rows, built by editor.ts --></div>
  </section>
  ```
- Stopwatch buttons are injected by `stopwatch.ts`, not authored in HTML.
- Styling added to `src/styles/workspace.css` (panel, transport, track rows, curve canvas, stopwatch icon),
  matching the existing sidebar visual language.

---

## Window exposure (`src/main.ts`)

Import and expose: `toggleAnimPanel`, and any onclick handlers the panel/stopwatches use that are
referenced from HTML attributes. Internal pointer interactions (handle dragging, canvas clicks) are
attached via `addEventListener` in the modules, not via inline attributes.

Call `initAnimation()` during startup.

---

## Dependency

Add `gifenc` (small, modern, no worker required) to `package.json` dependencies.
This is the project's first runtime dependency.

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/animation/types.ts` | New — `SliderAnim`, `EffectAnimation` |
| `src/animation/registry.ts` | New — discover animatable sliders |
| `src/animation/easing.ts` | New — cubic-bezier solver + presets |
| `src/animation/stopwatch.ts` | New — inject icons, arm/disarm |
| `src/animation/playback.ts` | New — play loop, apply values |
| `src/animation/editor.ts` | New — bottom panel + curve editor |
| `src/animation/export.ts` | New — GIF export via gifenc |
| `src/animation/index.ts` | New — init + wiring |
| `src/state.ts` | Add `animations`, `animPanelOpen`, `animPlaying` |
| `src/workspace/index.ts` | Add `renderNow`, `renderFrameAsync`; extend `enterEffect` |
| `src/main.ts` | Expose `toggleAnimPanel`; call `initAnimation` |
| `index.html` | Timeline button + bottom panel markup |
| `src/styles/workspace.css` | Panel, transport, track, curve, stopwatch styles |
| `package.json` | Add `gifenc` dependency |

---

## Non-goals (possible later)

- Multi-keyframe timelines / scrubbing playhead
- Colour and mode-button animation
- WebM/MP4 export
- Per-effect differing fps or easing-per-segment
