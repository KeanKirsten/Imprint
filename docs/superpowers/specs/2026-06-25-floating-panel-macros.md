# Floating Panel, Macro Controls & Advanced Collapse

**Date:** 2026-06-25
**Status:** Approved
**Spec 1 of 2** — Presets + project save covered in `2026-06-25-presets-project-save.md`

---

## Overview

Replace the fixed sidebar with a floating, draggable panel that sits over a full-screen canvas. The panel leads with 2–3 high-level macro sliders per effect (Quick Adjust), with full detail controls hidden behind an Advanced toggle. The header simplifies to Back + effect badge only.

---

## 1. Layout changes

### Header

Remove: Upload button, Export button, Timeline button.
Keep: Back button (left), effect badge (left of spacer).
The panel takes over all control and export responsibilities.

### Canvas area

`.ws-canvas-area` expands to fill the full viewport (minus the 80px header). The fixed sidebar is removed. The drop zone occupies the full canvas area as before.

### Floating panel

A single `<div class="ws-panel">` positioned `fixed`, initially centred bottom (matching the reference mockup). Contains a drag handle at the top. Draggable anywhere on screen. Snaps to the nearest edge (left, right, top, bottom) when released within 60px of that edge.

**Snap behaviour:**
- Left/right snap: panel becomes a vertical strip, fixed to that edge, full height minus header
- Top/bottom snap: panel becomes a horizontal strip, fixed to that edge, full width
- No snap (free float): panel stays where dropped, remembers position in `localStorage`

Panel width when floating or left/right snapped: `340px`. When top/bottom snapped: `100%` width, auto height.

Panel state (position, snap edge) persists in `localStorage` key `imprint-panel-state`.

---

## 2. Panel content structure

Top to bottom when floating or left/right snapped:

```
[ ══ drag handle ══════════════════ ]

[ Add footage          ⊕ ]          ← upload button

[ — QUICK ADJUST ——————————————— ]
  Macro slider 1
  Macro slider 2
  (Macro slider 3 where applicable)

[ Advanced  ▾ ]                     ← toggle button

  (detail controls, collapsed by default)

[ Export PNG   ↓ ]  [ Export GIF  ↓ ]

[ Save Project ↓ ]                  ← placeholder, wired in spec 2
```

When top/bottom snapped the layout becomes horizontal flex rows, wrapping as needed.

---

## 3. Macro controls

### What macros do

Each macro slider (range 0–100) drives one or more underlying detail parameters via a linear mapping. When a macro moves, it writes the computed values directly to the underlying input elements (setting `.value` and dispatching an `input` event), which triggers the existing `scheduleRender()` path. No new render pipeline needed.

Underlying detail sliders update visually in real-time as macros move. Macro sliders do NOT read back from detail sliders — they are write-only. Moving a detail slider does not move the macro (one-way relationship, keeps implementation simple).

Macros are not animatable in this spec (animation system targets detail slider IDs only — unchanged).

### Macro mappings

**Halftone**

| Macro | Range | Drives |
|-------|-------|--------|
| Density | 0–100 | `h-spacing`: maps 100→4px (dense) to 0→50px (sparse) |
| | | `h-min-size` and `h-max-size`: scale proportionally with spacing |
| Intensity | 0–100 | `h-contrast`: maps 0→50% to 100→300% |

**Corpus**

| Macro | Range | Drives |
|-------|-------|--------|
| Scale | 0–100 | `c-size`: maps 0→4px to 100→60px |
| Intensity | 0–100 | `c-contrast`: maps 0→50% to 100→300% |
| Coverage | 0–100 | `c-threshold`: maps 0→0 (nothing renders) to 100→250 (everything renders) |

**Ink**

| Macro | Range | Drives |
|-------|-------|--------|
| Density | 0–100 | `i-spacing`: maps 100→2px to 0→20px; `i-min-r`/`i-max-r` scale proportionally |
| Intensity | 0–100 | `i-contrast`: maps 0→50% to 100→300% |

### Macro initial values

On effect load, macros initialise to 50 (midpoint). They do not read the current detail slider state on load — detail sliders retain their own defaults from the existing effect init code.

---

## 4. Advanced toggle

A single button labelled "Advanced ▾" / "Advanced ▲" sits below the macro section. Clicking it toggles a CSS class `.expanded` on a wrapper `<div class="ws-advanced">` that contains all existing detail controls.

```css
.ws-advanced { display: none; }
.ws-advanced.expanded { display: block; }
```

Default state: collapsed. State is NOT persisted — always collapsed on load.

The advanced section contains exactly the controls that currently live in the sidebar: all `.s-section` blocks per effect, the textarea, scatter buttons, colour pickers, etc. No controls are removed or restructured within advanced — they move as-is from the sidebar into this collapsible container.

---

## 5. Drag and snap implementation

Drag is implemented in vanilla TypeScript on the panel element.

- `pointerdown` on the drag handle: store offset between pointer and panel top-left
- `pointermove` on `window`: update panel `left`/`top` style
- `pointerup` on `window`: check proximity to each edge (60px threshold); if within threshold, apply snap class and remove absolute positioning

Snap CSS classes:

```css
.ws-panel.snap-left   { left: 0; top: 80px; bottom: 0; width: 340px; height: auto; }
.ws-panel.snap-right  { right: 0; top: 80px; bottom: 0; width: 340px; height: auto; left: auto; }
.ws-panel.snap-top    { top: 80px; left: 0; right: 0; width: 100%; height: auto; bottom: auto; }
.ws-panel.snap-bottom { bottom: 0; left: 0; right: 0; width: 100%; height: auto; top: auto; }
```

When a snap class is applied, inline `left`/`top` styles are cleared. When unsnapped (free float), snap classes are removed and `left`/`top` are set inline.

Panel position saved to `localStorage` on `pointerup`: `{ snap: 'left'|'right'|'top'|'bottom'|null, x: number, y: number }`.

---

## 6. File changes

| File | Change |
|------|--------|
| `index.html` | Remove `.ws-sidebar`, add `.ws-panel`. Move effect control sections into `.ws-advanced` inside panel. Simplify header to Back + badge only. |
| `src/styles/workspace.css` | Add `.ws-panel`, `.ws-panel .drag-handle`, `.ws-panel.snap-*`, `.ws-advanced`, `.ws-macro-section` rules. Remove sidebar-specific layout rules no longer needed. |
| `src/workspace/index.ts` | Add drag/snap logic. Add macro slider init and event handlers per effect. Wire upload and export buttons now inside panel. |
| `src/effects/halftone/sidebar.ts` | Export macro mapping constants or a `applyMacro(name, value)` function |
| `src/effects/corpus/sidebar.ts` | Same |
| `src/effects/ink/sidebar.ts` | Same |

No new files required. Animation system, effect renderers, and uploader are unchanged.

---

## Non-goals

- Preset system (spec 2)
- Project save/load (spec 2)
- Animatable macro sliders
- Resizable panel
- Multiple panels
- Undo/redo
