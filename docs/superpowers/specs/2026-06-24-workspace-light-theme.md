# Workspace Light Theme Design

**Date:** 2026-06-24
**Status:** Approved

---

## Overview

Carry the landing page's light, typographic aesthetic into the workspace view — header, sidebar, canvas area, and animation panel all move to the same soft grey palette and Lay Grotesk typography. No dark surfaces remain in the workspace.

---

## 1. Colour system

Replace the current dark CSS custom property values with light equivalents. All workspace surfaces use the landing's palette:

| Token | Current (dark) | New (light) |
|-------|---------------|-------------|
| `--bg` | `#0e0e0f` | `#eef0ee` |
| `--surface` | `#141414` | `#e6e8e6` |
| `--border` | `#2a2a2a` | `#d8dad8` |
| `--border-hi` | `#444` | `#b4b6b4` |
| `--text` | `#ececec` | `#0e0e0f` |
| `--muted` | `#666` | `#888` |
| `--panel` | `#141414` | `#eef0ee` |
| `--line` | `#333` | `#d8dad8` |
| `--fg` | `#eee` | `#0e0e0f` |

These are defined in `src/styles/base.css` as CSS custom properties on `:root`.

Canvas area (`ws-canvas-area`) uses `--bg` — same light grey as the rest. No special framing for the canvas; the rendered effect has its own background set by sidebar colour controls.

Drop-zone cross and text: update hardcoded `#282828` / `#1e1e1e` colours to use `--border` and `--muted`.

---

## 2. Typography

Replace DM Mono with Lay Grotesk Trial throughout the workspace. The font is already loaded via `@font-face` in `base.css`.

| Element | Current | New |
|---------|---------|-----|
| Section labels (`.s-label`) | 8.5px, DM Mono, 0.28em | 10px, Lay Grotesk, 0.2em |
| Slider row labels (`.s-row-lbl`) | 8.5px, DM Mono | 12px, Lay Grotesk |
| Value readouts (`.s-val`) | 8.5px, DM Mono | 12px, Lay Grotesk |
| Toggle buttons (`.s-btn`) | 8.5px, DM Mono | 11px, Lay Grotesk |
| Header buttons (`.ws-btn`, `.ws-back`) | 9px, DM Mono | 12px, Lay Grotesk |
| Effect badge (`.ws-effect-badge`) | 9px, DM Mono | 10px, Lay Grotesk |
| Textarea (`.s-textarea`) | 8.5px, DM Mono | 12px, Lay Grotesk |
| Scatter btn (`.s-scatter-btn`) | 8.5px, DM Mono | 11px, Lay Grotesk |
| Animation panel labels | 9–10px, DM Mono | 11–12px, Lay Grotesk |
| Drop zone text | 9px, DM Mono | 11px, Lay Grotesk |

Letter-spacing: reduce from current wide values (0.12–0.28em) to more typographic values matching the landing (0.04–0.12em for most, 0.2em only for section labels).

---

## 3. Header

`.ws-header` mirrors the landing header:
- Background: `--bg` (`#eef0ee`)
- Border-bottom: `1px solid var(--border)`
- Back button: Lay Grotesk, `13px`, `color: var(--muted)` → hover `color: var(--text)`, border `var(--border)` → hover `var(--border-hi)`
- Effect badge: accent colours unchanged (ink `#62b0c8`, halftone `#e03d6a`, corpus `#c8a05a`) — now read clearly on the light bg
- Export/Upload/Timeline buttons: same structure, updated to light palette

---

## 4. Sidebar

`.ws-sidebar`:
- Background: `--bg`
- Border-right: `1px solid var(--border)`
- Section dividers: `1px solid var(--border)`

Slider thumb: `background: var(--text)` (black dot on light track). Track: `background: var(--border)`.

Toggle buttons active state: `background: var(--text); color: var(--bg); border-color: var(--text)` — unchanged in logic, now reads as black-on-light.

Colour picker inputs: border `var(--border)`.

---

## 5. Animation panel

`.anim-panel` (the left flyout):
- Background: `--bg` (`#eef0ee`)
- Border: `1px solid var(--border)`
- All text, inputs, and button colours updated to light palette via the token changes above

Animation highlight colour (`#d4ff00`) stays — it's a functional accent for armed sliders and active transport controls, reads fine on light.

---

## 6. Canvas / drop zone

`.ws-canvas-area`: background `--bg`. Continuous with the sidebar — no visual separation.

Drop zone:
- `.dz-cross::before/after`: `background: var(--border)` (replaces hardcoded `#282828`)
- `.dz-text`: `color: var(--muted)` (replaces `#282828`)
- `.dz-sub`: `color: var(--muted)` (replaces `#1e1e1e`)

---

## File changes summary

| File | Change |
|------|--------|
| `src/styles/base.css` | Update CSS custom property values on `:root` to light palette |
| `src/styles/workspace.css` | Update all `font-family`, `font-size`, `letter-spacing` to Lay Grotesk + new sizes; fix hardcoded drop-zone colours |

No TypeScript changes. No new files.

---

## Non-goals

- Dark mode toggle (not planned)
- Changing the effect accent colours (ink, halftone, corpus)
- Changing the animation highlight colour (`#d4ff00`)
- Modifying sidebar layout or control structure
