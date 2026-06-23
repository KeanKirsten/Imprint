# Corpus Character Sets Design

**Date:** 2026-06-23
**Status:** Approved

---

## Overview

Restore preset character-set modes to the Corpus effect. Currently the only text
source is a freeform textarea. This adds a mode selector with four options:

| Mode | Alphabet | Character selection |
|------|----------|---------------------|
| **Hex** (default) | `0123456789ABCDEF` | pseudo-random per cell |
| **Binary** | `01` | pseudo-random per cell |
| **Base64** | `A–Z a–z 0–9 + / =` | pseudo-random per cell |
| **Custom** | user-typed text | sequential (existing behaviour) |

The textarea is shown only when **Custom** is selected; the three presets hide it.

---

## Behaviour

### Character selection

- **Presets (Hex / Binary / Base64):** each grid cell picks a character from the
  mode's alphabet using the existing `hashNoise` function, seeded by the cell's
  grid position. This produces a varied, scattered "data dump" texture and stays
  deterministic so the output does not flicker on re-render.
- **Custom:** keeps the current sequential mapping — characters from the textarea
  are laid out in reading order (`chars[li % chars.length]`), so typed words still
  render legibly. The "Skip spaces" checkbox continues to apply to Custom only.

### Alphabets

```
hex:    0123456789ABCDEF
binary: 01
base64: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
```

---

## State & Types

**`src/types.ts`** — add:
```ts
export type CorpusCharSet = 'hex' | 'binary' | 'base64' | 'custom';
```

**`src/state.ts`** — add field (default `'hex'`):
```ts
corpusCharSet: 'hex' as CorpusCharSet,
```

---

## UI (`index.html`)

In the Corpus sidebar "Text source" section, add a button row above the textarea:
```html
<div class="s-btns" style="margin-bottom:10px">
  <button class="s-btn active" id="cs-hex"    onclick="setCorpusCharSet('hex')">Hex</button>
  <button class="s-btn"        id="cs-binary" onclick="setCorpusCharSet('binary')">Binary</button>
  <button class="s-btn"        id="cs-base64" onclick="setCorpusCharSet('base64')">Base64</button>
  <button class="s-btn"        id="cs-custom" onclick="setCorpusCharSet('custom')">Custom</button>
</div>
```

The textarea and "Skip spaces" label are wrapped so they can be shown/hidden as a
group (`id="c-custom-text"`), visible only in Custom mode. Default Hex → hidden on load.

---

## Logic (`src/effects/corpus/sidebar.ts`)

Add `setCorpusCharSet(mode: CorpusCharSet)`:
- Sets `state.corpusCharSet`
- Toggles `active` class across `cs-hex`, `cs-binary`, `cs-base64`, `cs-custom`
- Shows `c-custom-text` only when `mode === 'custom'`
- Calls `scheduleRender()`

Exported and exposed on `window` via `main.ts`.

---

## Renderer (`src/effects/corpus/renderer.ts`)

Replace the current text-building block. Build the character pool from the mode:
- Custom: existing textarea logic (trim, skip-spaces, fallback)
- Presets: the fixed alphabet string for that mode

Selection inside the grid loop:
- Custom: `chars[li % chars.length]` (unchanged)
- Presets: `pool[Math.floor(hashNoise(col * 0.01, row * 0.01, 7) * pool.length)]`,
  clamped to a valid index.

---

## File Changes

| File | Change |
|------|--------|
| `src/types.ts` | Add `CorpusCharSet` type |
| `src/state.ts` | Add `corpusCharSet` field, import type |
| `src/effects/corpus/sidebar.ts` | Add `setCorpusCharSet` |
| `src/effects/corpus/renderer.ts` | Build pool by mode; per-cell selection by mode |
| `src/main.ts` | Import + expose `setCorpusCharSet` |
| `index.html` | Char-set button row; wrap textarea group |
