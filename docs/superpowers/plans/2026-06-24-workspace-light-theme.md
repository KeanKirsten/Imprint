# Workspace Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the workspace (effect panel) to match the landing page's light grey aesthetic — same palette, Lay Grotesk typography, larger readable type, no dark surfaces.

**Architecture:** Two CSS files only. `base.css` gets updated custom property values and a font-family switch. `workspace.css` gets updated font sizes, letter-spacing, and hardcoded colour fixes. No TypeScript changes.

**Tech Stack:** CSS custom properties, `@font-face` (Lay Grotesk Trial already loaded).

---

## File Map

| File | Change |
|------|--------|
| `src/styles/base.css` | Update `:root` token values to light palette; switch global `font-family` to Lay Grotesk |
| `src/styles/workspace.css` | Update font sizes, letter-spacing, replace hardcoded hex colours in drop zone |

---

### Task 1: Update CSS custom properties and global font

**Files:**
- Modify: `src/styles/base.css`

- [ ] **Step 1: Read the current file**

Read `src/styles/base.css` to confirm current `:root` values before editing.

- [ ] **Step 2: Replace the `:root` token block**

Replace the existing `:root` block (lines 27–38) with:

```css
:root {
  --bg:               #eef0ee;
  --surface:          #e6e8e6;
  --surface-2:        #dddedd;
  --border:           #d8dad8;
  --border-hi:        #b4b6b4;
  --text:             #0e0e0f;
  --muted:            #888888;
  --panel:            #eef0ee;
  --line:             #d8dad8;
  --fg:               #0e0e0f;
  --accent-corpus:    #c8a05a;
  --accent-halftone:  #e03d6a;
  --accent-ink:       #62b0c8;
}
```

- [ ] **Step 3: Switch global font-family to Lay Grotesk**

In the `html, body` rule (the second one, lines 40–48), change:
```css
font-family: 'DM Mono', monospace;
```
to:
```css
font-family: 'Lay Grotesk Trial', sans-serif;
```

Also update the `button` rule (lines 51–53):
```css
button {
  font-family: 'Lay Grotesk Trial', sans-serif;
}
```

- [ ] **Step 4: Verify**

Run `npx tsc --noEmit` in `C:\Users\keana\Tools\Imprint`. Expected: 0 errors.

- [ ] **Step 5: Commit**

```
git add src/styles/base.css
git commit -m "feat(workspace): light palette tokens and Lay Grotesk global font"
```

---

### Task 2: Update sidebar typography — labels, rows, values

**Files:**
- Modify: `src/styles/workspace.css`

The current sidebar uses 8.5px DM Mono throughout. This task bumps all sidebar text to legible sizes with Lay Grotesk.

- [ ] **Step 1: Read `src/styles/workspace.css`**

Read the full file to confirm current rules before editing.

- [ ] **Step 2: Update `.s-label`**

Find:
```css
.s-label {
  display: block;
  font-size: 8.5px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 13px;
}
```

Replace with:
```css
.s-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 13px;
}
```

- [ ] **Step 3: Update `.s-row-lbl`**

Find:
```css
.s-row-lbl {
  font-size: 8.5px;
  color: var(--muted);
  width: 58px;
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
```

Replace with:
```css
.s-row-lbl {
  font-size: 12px;
  color: var(--muted);
  width: 68px;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
```

- [ ] **Step 4: Update `.s-val`**

Find:
```css
.s-val {
  font-size: 8.5px;
  color: var(--muted);
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}
```

Replace with:
```css
.s-val {
  font-size: 12px;
  color: var(--muted);
  width: 42px;
  text-align: right;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Commit**

```
git add src/styles/workspace.css
git commit -m "feat(workspace): larger sidebar label, row, and value typography"
```

---

### Task 3: Update button and badge typography

**Files:**
- Modify: `src/styles/workspace.css`

- [ ] **Step 1: Update `.ws-back`**

Find the `.ws-back` rule. Change:
```css
font-family: 'DM Mono', monospace;
font-size: 9px;
letter-spacing: 0.14em;
```
To:
```css
font-family: 'Lay Grotesk Trial', sans-serif;
font-size: 12px;
letter-spacing: 0.04em;
```

- [ ] **Step 2: Update `.ws-effect-badge`**

Find:
```css
.ws-effect-badge {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 3px;
  border: 1px solid;
}
```

Replace with:
```css
.ws-effect-badge {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 3px;
  border: 1px solid;
}
```

- [ ] **Step 3: Update `.ws-btn`**

Find the `.ws-btn` rule. Change:
```css
font-family: 'DM Mono', monospace;
font-size: 9px;
letter-spacing: 0.12em;
```
To:
```css
font-family: 'Lay Grotesk Trial', sans-serif;
font-size: 12px;
letter-spacing: 0.04em;
```

- [ ] **Step 4: Update `.s-btn`**

Find the `.s-btn` rule. Change:
```css
font-family: 'DM Mono', monospace;
font-size: 8.5px;
letter-spacing: 0.08em;
```
To:
```css
font-family: 'Lay Grotesk Trial', sans-serif;
font-size: 11px;
letter-spacing: 0.04em;
```

- [ ] **Step 5: Update `.s-scatter-btn`**

Find the `.s-scatter-btn` rule. Change:
```css
font-family: 'DM Mono', monospace;
font-size: 8.5px;
letter-spacing: 0.14em;
```
To:
```css
font-family: 'Lay Grotesk Trial', sans-serif;
font-size: 11px;
letter-spacing: 0.04em;
```

- [ ] **Step 6: Commit**

```
git add src/styles/workspace.css
git commit -m "feat(workspace): Lay Grotesk and larger sizes on buttons and badge"
```

---

### Task 4: Update textarea and fix hardcoded drop-zone colours

**Files:**
- Modify: `src/styles/workspace.css`

- [ ] **Step 1: Update `.s-textarea`**

Find the `.s-textarea` rule. Change:
```css
font-family: 'DM Mono', monospace;
font-size: 8.5px;
```
To:
```css
font-family: 'Lay Grotesk Trial', sans-serif;
font-size: 12px;
```

- [ ] **Step 2: Fix hardcoded drop-zone colours**

Find `.dz-cross::before, .dz-cross::after`:
```css
.dz-cross::before,
.dz-cross::after {
  content: '';
  position: absolute;
  background: #282828;
  border-radius: 1px;
}
```

Replace `background: #282828` with `background: var(--border)`.

Find `.dz-text`:
```css
.dz-text {
  font-size: 9px;
  letter-spacing: 0.22em;
  color: #282828;
  text-transform: uppercase;
}
```

Replace with:
```css
.dz-text {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--muted);
  text-transform: uppercase;
}
```

Find `.dz-sub`:
```css
.dz-sub {
  font-size: 8px;
  letter-spacing: 0.12em;
  color: #1e1e1e;
  text-transform: uppercase;
}
```

Replace with:
```css
.dz-sub {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}
```

- [ ] **Step 3: Update `.s-color-lbl`**

Find:
```css
.s-color-lbl {
  font-size: 8.5px;
  color: var(--muted);
  width: 68px;
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
```

Replace with:
```css
.s-color-lbl {
  font-size: 12px;
  color: var(--muted);
  width: 72px;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
```

- [ ] **Step 4: Commit**

```
git add src/styles/workspace.css
git commit -m "feat(workspace): fix textarea font, drop-zone colours, colour label sizes"
```

---

### Task 5: Update animation panel typography

**Files:**
- Modify: `src/styles/workspace.css`

The animation panel has its own set of font rules using DM Mono and small sizes. Update them to match.

- [ ] **Step 1: Update animation panel font rules**

Find and update these rules in the animation panel section (search for `.anim-`):

`.anim-dur, .anim-fps`: change `font-size: 9px` → `font-size: 11px`. Remove any `font-family: 'DM Mono'` if present (inherits from global now).

`.anim-dur input`: change `font-size: 10px` → `font-size: 12px`.

`.anim-empty`: change `font-size: 9px` → `font-size: 11px`.

`.anim-track-name`: change `font-size: 10px` → `font-size: 12px`.

`.anim-numfield`: change `font-size: 9px` → `font-size: 11px`.

`.anim-numfield input`: change `font-size: 10px` → `font-size: 12px`.

`.anim-preset`: change `font-size: 8px` → `font-size: 10px`.

`.anim-transport button`: change `font-size: 10px` → `font-size: 12px`.

Full updated rules to apply:

```css
.anim-transport button {
  padding: 5px 12px;
  border: 1px solid var(--line, #d8dad8);
  background: transparent;
  color: var(--fg, #0e0e0f);
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
}
.anim-dur, .anim-fps {
  font-size: 11px;
  color: var(--muted, #888);
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 4px;
}
.anim-dur input {
  width: 48px;
  background: transparent;
  border: 1px solid var(--line, #d8dad8);
  color: var(--fg, #0e0e0f);
  font-size: 12px;
  padding: 3px 5px;
}
.anim-empty {
  font-size: 11px;
  color: var(--muted, #888);
  letter-spacing: 0.04em;
  padding: 6px 0;
  line-height: 1.5;
}
.anim-track-name {
  font-size: 12px;
  color: var(--fg, #0e0e0f);
  letter-spacing: 0.04em;
}
.anim-numfield {
  font-size: 11px;
  color: var(--muted, #888);
  display: flex;
  align-items: center;
  gap: 4px;
}
.anim-numfield input {
  width: 56px;
  background: transparent;
  border: 1px solid var(--line, #d8dad8);
  color: var(--fg, #0e0e0f);
  font-size: 12px;
  padding: 3px 5px;
}
.anim-preset {
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid var(--line, #d8dad8);
  background: transparent;
  color: var(--muted, #888);
  cursor: pointer;
  letter-spacing: 0.03em;
}
```

- [ ] **Step 2: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```
git add src/styles/workspace.css
git commit -m "feat(workspace): animation panel typography updated to light theme"
```

---

### Task 6: Visual QA

No code changes — manual verification only.

- [ ] Run `npm run dev` in `C:\Users\keana\Tools\Imprint`, open `http://localhost:5173`.
- [ ] Click any label on the landing to enter the workspace. Confirm: light grey background throughout (header, sidebar, canvas area).
- [ ] Sidebar text is readable — labels ~10px, slider labels ~12px, values ~12px.
- [ ] Buttons (Back, Upload, Export, Timeline) use Lay Grotesk and are legible.
- [ ] Effect badge (INK / HALFTONE / CORPUS) shows in its accent colour on the light header.
- [ ] Drop image zone shows a grey cross and muted text (not black `#282828`).
- [ ] Toggle buttons (Circle/Square/Cross etc.) render correctly — inactive: light border; active: dark fill.
- [ ] Slider thumbs are dark dots on light tracks.
- [ ] Animation panel (click Timeline button) uses the same light palette.
- [ ] `npx tsc --noEmit` — 0 errors.

- [ ] **Final commit if any QA tweaks were needed**

```
git add -A
git commit -m "fix(workspace): QA tweaks post light theme"
```
