# Presets & Project Save/Load

**Date:** 2026-06-25
**Status:** Approved
**Spec 2 of 2** — Depends on `2026-06-25-floating-panel-macros.md` being implemented first.

---

## Overview

Add a localStorage-based preset system and a `.imprint` project file format. Presets let users save and recall named parameter states per effect. Project save/load stores the full working state — image, effect, parameters, animation config — as a portable JSON file.

---

## 1. Preset system

### What a preset contains

A preset captures the complete sidebar state for one effect at a specific moment:

```ts
interface Preset {
  id: string;         // uuid or timestamp-based
  name: string;
  effect: Effect;     // 'corpus' | 'halftone' | 'ink'
  params: Record<string, string>;  // input id → value (all sidebar inputs)
  builtIn: boolean;   // built-in presets cannot be deleted
}
```

`params` is a flat map of every `<input>` and `<select>` id in the effect's sidebar to its current `.value`. This is effect-agnostic — no need to know what each parameter means.

### Storage

All presets stored under one `localStorage` key: `imprint-presets` as a JSON array. Built-in presets are hard-coded in TypeScript and merged with user presets on load — they are never written to localStorage.

### Built-in presets (3 per effect)

**Halftone:** "Editorial", "Newspaper", "Fine Screen"
**Corpus:** "Dense Hex", "Sparse Binary", "Full Coverage"
**Ink:** "Stipple Light", "Stipple Heavy", "Bleed"

Each built-in preset has a specific hand-tuned `params` map defined in the source.

### Panel UI

Presets sit between the "Add footage" button and the Quick Adjust section in the floating panel.

```
[ Editorial ] [ Newspaper ] [ Fine Screen ] [ My Preset ✕ ] [ + Save ]
```

- Chips are horizontally scrollable if they overflow
- Built-in chips: no ✕, slightly different visual (muted border, no delete)
- User chips: ✕ on hover deletes after confirmation (window.confirm, no custom modal)
- "+ Save" button: replaces itself inline with a text input + confirm button; pressing Enter or confirm saves the preset and reverts the button
- Clicking a chip: reads the preset's `params` map, sets each input's `.value`, dispatches `input` event on each — triggering the existing render path. Macro sliders reset to 50 (midpoint) since presets don't track macro state.
- Only presets matching the current effect are shown

### Preset section is per-effect

When the effect changes (via Back → landing → new effect), the preset chip row re-renders with the new effect's presets.

---

## 2. Project save

### File format

A `.imprint` file is a UTF-8 JSON file with the extension `.imprint`:

```json
{
  "version": 1,
  "effect": "halftone",
  "params": { "h-spacing": "12", "h-contrast": "180", ... },
  "imageDataUrl": "data:image/jpeg;base64,...",
  "animation": {
    "duration": 2000,
    "fps": 12,
    "tracks": [
      { "sliderId": "h-spacing", "from": 8, "to": 20, "easing": [0.42, 0, 0.58, 1] }
    ]
  }
}
```

`animation` is `null` if no tracks are armed. `imageDataUrl` is the original uploaded image as base64 (not the rendered canvas output).

### Save behaviour

"Save Project" button in the panel (below Export GIF):
1. Reads current effect from state
2. Collects all sidebar input values into `params`
3. Reads the original image data URL from uploader state (the raw uploaded image, not the canvas)
4. Reads animation config from animation module
5. Serialises to JSON, creates a Blob, triggers download
6. Filename: `imprint-{effect}-{YYYY-MM-DD}.imprint`

### Load behaviour

Two entry points:

**Drag onto canvas:** The canvas drop zone's `dragover`/`drop` handlers check the file extension. If `.imprint`, parse JSON, restore state (see below). If image file, existing upload path as before.

**Add footage button:** The existing file input's `change` handler checks the extension. Same branching.

**Restore sequence:**
1. Parse JSON, validate `version === 1`
2. Load `imageDataUrl` into the uploader's image state (set `<img>` src, store data URL)
3. Call `enterEffect(data.effect)` to switch effect and re-init the sidebar
4. After sidebar init, iterate `params` and set each input `.value` + dispatch `input` event
5. If `data.animation` is non-null, call `loadAnimationConfig(data.animation)` (new function in animation module that accepts the config object directly)
6. Call `scheduleRender()`

---

## 3. File changes

| File | Change |
|------|--------|
| `index.html` | Add preset chip row container and Save Project button inside `.ws-panel` |
| `src/styles/workspace.css` | Add preset chip, chip delete button, save-inline-input styles |
| `src/workspace/presets.ts` | New file: preset CRUD (load, save, delete from localStorage), built-in preset definitions, `applyPreset(preset)` |
| `src/workspace/project.ts` | New file: `saveProject()`, `loadProject(file)`, `loadAnimationConfig(config)` |
| `src/workspace/index.ts` | Wire preset chip row render on effect change; wire Save Project button; extend drop/upload handlers to detect `.imprint` files |
| `src/animation/index.ts` | Export `loadAnimationConfig(config)` function |

---

## Non-goals

- Cloud sync or accounts
- Shareable preset links
- Preset reordering
- Preset thumbnails
- Import/export of preset collections
- Version migration for `.imprint` format (v1 only)
