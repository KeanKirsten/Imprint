# Halftone Enhancements Design

**Date:** 2026-06-23  
**Status:** Approved

---

## Overview

Three additions to the existing Halftone effect in Imprint:

1. Angled grid
2. CMYK layered mode
3. Size influence zones

---

## 1. Angled Grid

A single slider (`h-angle`, range 0–90°) controls the rotation of the entire dot grid.

**Implementation:** Before the grid loop, translate the canvas context to the centre, rotate by the angle, then translate back. The grid loops run as normal but paint into the rotated coordinate space. After drawing, the context transform is reset. No changes to the grid logic itself.

**Sidebar addition:** One range input labelled "Angle" under the existing spacing control.

---

## 2. CMYK Layered Mode

A new entry — "CMYK" — added to the existing colour mode picker (`state.halftoneColorMode`).

When active, `renderHalftone` runs four passes:

| Channel | Colour | Angle offset |
|---------|--------|--------------|
| Cyan | `#00FFFF` | 15° |
| Magenta | `#FF00FF` | 75° |
| Yellow | `#FFFF00` | 0° |
| Black | `#000000` | 45° |

Each pass renders to a separate offscreen canvas using `multiply` composite blending, then all four are composited onto the main canvas. The user-facing angle slider offsets all four angles together (e.g. slider at 10° → 25°, 85°, 10°, 55°).

A shared `renderHalftonePass(angle: number, color: string)` helper handles the grid loop for a single pass, returning an `HTMLCanvasElement`. `renderHalftone` calls it four times in CMYK mode, once in all other modes.

---

## 3. Size Influence Zones

Click-to-place points on the canvas that shrink dot size within a radius. No opacity change — purely size reduction.

**Interaction:** Same pattern as Corpus scatter points. A toggle button activates placement mode. Clicking the canvas places a point. Each point stores `{ x, y, id }`. Points persist in `state.halftoneInfluencePoints`.

**Effect:** For each grid cell, iterate over all influence points. If the cell falls within a point's radius, reduce the computed dot radius proportionally to distance from the centre (closest = smallest, edge of radius = normal size). Multiple overlapping zones stack additively, clamped so dots never go below zero.

**Controls:**
- Radius slider (`h-inf-rad`, range 10–300px)
- Strength slider (`h-inf-str`, range 0–100) — how aggressively size reduces at the zone centre
- Clear button to remove all points
- Visual indicator (dashed circle + crosshair) drawn over the canvas in placement mode, matching the Corpus style

**State additions to `state.ts`:**
- `halftoneInfluencePoints: { x: number; y: number; id: number }[]`
- `halftoneInfluencePlacing: boolean`

---

## File Changes

| File | Change |
|------|--------|
| `src/effects/halftone/renderer.ts` | Extract `renderHalftonePass`, add angle transform, CMYK branching, influence zone size calculation |
| `src/effects/halftone/sidebar.ts` | Add angle slider, CMYK mode option, influence zone controls and toggle |
| `src/state.ts` | Add `halftoneInfluencePoints`, `halftoneInfluencePlacing` |
| `src/types.ts` | Add `HalftoneInfluencePoint` type if needed |
