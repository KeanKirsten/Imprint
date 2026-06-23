# Landing Elevation Design

**Date:** 2026-06-23
**Status:** Approved

---

## Overview

Elevate the existing single-column typographic landing with ambient motion and
texture, while keeping its clean, tool-like restraint. Six additions:

1. Cursor-following radial glow (the soft centre light from the reference, made interactive)
2. Reactive accent tint on that glow when a label is hovered
3. Fine procedural film grain across the page
4. Slow upward marquee drift of the label column, paused on hover
5. Active-word scale emphasis layered on the existing magnetic pull
6. Ken Burns drift on the preview card thumbnail
7. Click → workspace crossfade transition (the clicked word pops as the view fades)

Reference look: soft light-grey field, gentle radial glow, even fine grain.

All additions build on the current `src/landing/index.ts` (magnetic attraction) and
`src/styles/landing.css`. No new dependencies; texture is procedural.

---

## 1. Cursor-following radial glow + 2. reactive tint

- Add a full-screen element `<div class="lp-glow">` inside `#view-landing` (behind the
  columns, above the base gradient).
- A `mousemove` listener on `#view-landing` writes the cursor position into CSS custom
  properties `--mx` / `--my` (px).
- `.lp-glow` paints `radial-gradient(circle 620px at var(--mx) var(--my), var(--glow-tint), transparent 70%)`.
- Default `--glow-tint` is a soft near-white (`rgba(255,255,255,0.5)`). On label hover,
  `--glow-tint` transitions to a very low-saturation wash of the hovered effect's accent
  (e.g. `rgba(r,g,b,0.10)`), reset on mouse-out. Transition `background 0.4s ease` for smoothness.
- The base `#view-landing` keeps its light grey gradient beneath the glow.

Accent per effect: ink `#62b0c8`, halftone `#e03d6a`, corpus `#c8a05a`.

---

## 3. Film grain

- Keep the existing `.lp-grain` SVG-noise overlay; tune `opacity` to ~0.07 and confirm
  `mix-blend-mode: multiply`. Even, fine, faint — matches the reference. No asset.

---

## 4. Marquee drift (paused on hover)

- The single column scrolls upward continuously. Implement with a `scrollOffset` (px)
  advanced each frame by `MARQUEE_SPEED` (≈0.25 px/frame).
- The label pattern repeats every `LABELS.length` rows, so one seamless cycle is
  `CYCLE_H = LABELS.length * ROW_H`. Apply `translateY(-(scrollOffset % CYCLE_H))` to the
  column element. Build enough rows to cover viewport + `2 * LABELS.length` buffer so the
  wrap is invisible.
- **Pause on hover:** while `pointerActive`, freeze `scrollOffset` (do not advance). Resume
  on mouse-out. This keeps positions stable while the user interacts.
- **Live-position attraction:** the magnetic math must use each label's *live* screen Y:
  `liveY = baseY - (scrollOffset % CYCLE_H)`. The spring's vertical falloff uses
  `dy = pointerY - liveY`. `baseY`/`baseX` are still measured once at rest (scrollOffset 0).
- Column vertical transform (marquee) and per-label horizontal transform (magnetic spring)
  occupy different axes and compose cleanly.

---

## 5. Active-word emphasis

- Each label gets an eased `scale` toward a target:
  `targetScale = 1 + EMPHASIS * falloff` (same gaussian `falloff` used for the pull),
  `EMPHASIS ≈ 0.14`. Ease per frame: `l.s += (targetScale - l.s) * 0.15`.
- Label transform becomes `translateX(x) scale(s)` (origin left so it grows toward the
  cursor side naturally). Added fields `s` (current scale) on the label record, init 1.

---

## 6. Preview card Ken Burns

- `.lp-card-img` gets a slow CSS keyframe drift (scale 1 → 1.08 with a few px translate)
  on a long ease-in-out loop, running only while the card is visible.
- A faint grain overlay (`::after` reusing the noise data-URI at low opacity) sits over the
  card image so it reads as alive/analog. The fade/scale-in of the card itself is unchanged.

---

## 7. Click → workspace transition

- On label click: add a `.leaving` class to the clicked label (CSS: `transform: scale(1.4)`,
  `opacity: 0`, `transition: 0.35s ease`), then call `enterEffect(effect)` immediately. The
  existing `enterEffect` fades `#view-landing` opacity to 0 over ~0.5s, so the word pops as
  the whole landing crossfades into the dark workspace. Clean, no hard cut.
- `goToLanding` already restores the landing; ensure the `.leaving` class is cleared when
  the landing is rebuilt or shown again (clear on `buildColumns`).

---

## State / constants (top of `src/landing/index.ts`)

Add:
```
MARQUEE_SPEED = 0.25   // px/frame upward drift
EMPHASIS      = 0.14   // max scale bump at the cursor
CYCLE_H       = LABELS.length * ROW_H   // seamless marquee wrap height
GLOW_RADIUS   = 620    // px (in CSS)
```
Module state: `scrollOffset` (number), and `LabelRec` gains `s` (scale, init 1).

---

## File Changes Summary

| File | Change |
|------|--------|
| `index.html` | Add `<div class="lp-glow">` inside `#view-landing` (before `.lp-columns`) |
| `src/styles/landing.css` | `.lp-glow` glow + `--glow-tint` var; grain tune; card Ken Burns keyframes + grain `::after`; `.lp-label.leaving`; column overflow for marquee |
| `src/landing/index.ts` | Marquee `scrollOffset` + column translateY; live-Y attraction; scale emphasis; `--mx/--my` + `--glow-tint` updates; pause-on-hover; click `.leaving` + transition; extra buffer rows |

---

## Non-goals (explicitly excluded)

- Entrance/load animation (idea #6 — declined)
- Live effect-engine rendering in the card (using static processed image + Ken Burns instead)
- Before→after crossfade (no before-images)
- Sound, multi-column return
