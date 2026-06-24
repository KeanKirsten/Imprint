# Landing Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ambient motion and texture to the typographic landing: cursor glow, reactive tint, grain, upward marquee drift, scale emphasis on hover, Ken Burns card, and a click-to-workspace pop transition.

**Architecture:** All changes are isolated to three files: `index.html` (DOM), `src/styles/landing.css` (visual), and `src/landing/index.ts` (behaviour). No new files, no new dependencies. The marquee and spring run in the same `requestAnimationFrame` loop. CSS custom properties (`--mx`, `--my`, `--glow-tint`) bridge JS pointer state to the CSS glow layer.

**Tech Stack:** Vanilla TypeScript, CSS custom properties, `requestAnimationFrame`, CSS keyframes.

---

## File Map

| File | What changes |
|------|-------------|
| `index.html` | Add `<div class="lp-glow">` before `.lp-grain` inside `#view-landing` |
| `src/styles/landing.css` | `.lp-glow` rule; grain opacity bump; `.lp-col` overflow fix; Ken Burns keyframe + `.lp-card-img` animation; `.lp-card::after` grain; `.lp-label.leaving` pop rule |
| `src/landing/index.ts` | New constants; `scrollOffset` state + marquee column `translateY`; live-Y in spring falloff; `s` scale field on `LabelRec`; `--mx`/`--my`/`--glow-tint` CSS var writes; pause-on-hover; click `.leaving` class |

---

### Task 1: Add glow DOM element

**Files:**
- Modify: `index.html` (line 15 — before `.lp-grain`)

- [ ] **Step 1: Insert the glow div**

In `index.html`, add `<div class="lp-glow" aria-hidden="true"></div>` as the first child of `#view-landing`, before the existing `.lp-grain` div. Result:

```html
<div id="view-landing">

  <div class="lp-glow" aria-hidden="true"></div>
  <div class="lp-grain" aria-hidden="true"></div>

  <header class="lp-header">
```

- [ ] **Step 2: Verify HTML is valid**

Run `npx tsc --noEmit` in `C:\Users\keana\Tools\Imprint`. Expect 0 errors (HTML is not type-checked but this confirms the TS side is still clean).

- [ ] **Step 3: Commit**

```
git add index.html
git commit -m "feat(landing): add lp-glow DOM element"
```

---

### Task 2: CSS — glow layer + grain tune + marquee overflow

**Files:**
- Modify: `src/styles/landing.css`

- [ ] **Step 1: Add `.lp-glow` rule and tune grain**

Add this block after the `#view-landing` rule (before `.lp-grain`):

```css
/* Cursor-following radial glow */
.lp-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle 620px at var(--mx, 50%) var(--my, 40%), var(--glow-tint, rgba(255,255,255,0.5)), transparent 70%);
  transition: background 0.4s ease;
  z-index: 1;
}
```

Then update the `.lp-grain` opacity from `0.05` to `0.07`:

```css
.lp-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.07;
  mix-blend-mode: multiply;
  ...
}
```

And set `.lp-grain` to `z-index: 2` so it sits above the glow:

```css
.lp-grain {
  ...
  z-index: 2;
}
```

- [ ] **Step 2: Allow `.lp-columns` and `.lp-col` to overflow for marquee**

The column wrapper must clip the scrolling labels. Add to `.lp-columns`:

```css
.lp-columns {
  ...
  overflow: hidden;
}
```

`.lp-col` needs `overflow: visible` (default) so labels aren't clipped — no change needed there. But ensure `.lp-col` has no explicit height set (it should be flex column already, which is fine).

- [ ] **Step 3: Commit**

```
git add src/styles/landing.css
git commit -m "feat(landing): glow layer CSS, grain opacity, overflow clip"
```

---

### Task 3: CSS — Ken Burns card animation + card grain overlay

**Files:**
- Modify: `src/styles/landing.css`

- [ ] **Step 1: Add Ken Burns keyframe and apply to `.lp-card-img`**

Append to `src/styles/landing.css`:

```css
/* Ken Burns slow drift on card thumbnail */
@keyframes kenBurns {
  0%   { transform: scale(1)    translate(0px, 0px); }
  33%  { transform: scale(1.04) translate(-3px, -2px); }
  66%  { transform: scale(1.07) translate(2px, -4px); }
  100% { transform: scale(1.08) translate(-1px, 2px); }
}

.lp-card-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
  background-color: #1a1a1a;
  animation: kenBurns 8s ease-in-out infinite alternate;
}
```

(This replaces/augments the existing `.lp-card-img` rule — merge the animation property in.)

- [ ] **Step 2: Add grain overlay on the card via `::after`**

```css
.lp-card {
  position: relative; /* ensure stacking context for ::after */
  ...
}

.lp-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.08;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  border-radius: 5px;
  z-index: 5;
}
```

- [ ] **Step 3: Commit**

```
git add src/styles/landing.css
git commit -m "feat(landing): Ken Burns card animation + card grain overlay"
```

---

### Task 4: CSS — `.lp-label.leaving` click pop transition

**Files:**
- Modify: `src/styles/landing.css`

- [ ] **Step 1: Add the `.leaving` style**

Append to `src/styles/landing.css`:

```css
/* Click → workspace: the clicked word pops as the landing fades */
.lp-label.leaving {
  transform: scale(1.4) !important;
  opacity: 0 !important;
  transition: transform 0.35s ease, opacity 0.35s ease !important;
}
```

The `!important` overrides the inline `transform` set by the spring loop.

- [ ] **Step 2: Commit**

```
git add src/styles/landing.css
git commit -m "feat(landing): lp-label leaving pop transition CSS"
```

---

### Task 5: TypeScript — constants, state, and `LabelRec` scale field

**Files:**
- Modify: `src/landing/index.ts`

- [ ] **Step 1: Add new constants at the top of the file**

After the existing constants block (after `DAMPING = 0.82`), add:

```ts
const MARQUEE_SPEED = 0.25;            // px/frame upward drift
const EMPHASIS      = 0.14;            // max scale bump at the cursor
const CYCLE_H       = LABELS.length * ROW_H; // seamless marquee wrap height
```

- [ ] **Step 2: Add `s` (scale) and `scrollOffset` state**

Add `scrollOffset` as a module-level variable alongside `pointerX`, `pointerY`, etc.:

```ts
let scrollOffset = 0;
```

Add `s: number` to the `LabelRec` interface:

```ts
interface LabelRec {
  el: HTMLElement;
  col: number;
  row: number;
  def: LabelDef;
  x: number;
  v: number;
  baseX: number;
  baseY: number;
  s: number;   // current scale (spring toward targetScale)
}
```

- [ ] **Step 3: Initialise `s: 1` in `buildColumns`**

In `buildColumns`, where `LabelRec` is constructed, add `s: 1`:

```ts
const rec: LabelRec = { el, col, row, def, x: 0, v: 0, baseX: 0, baseY: 0, s: 1 };
```

Also clear the `.leaving` class on rebuild by resetting the label element class (it already gets a fresh element so this is automatic — no extra step needed).

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```
git add src/landing/index.ts
git commit -m "feat(landing): add marquee/emphasis constants and LabelRec scale field"
```

---

### Task 6: TypeScript — cursor glow CSS vars (`--mx`, `--my`, `--glow-tint`)

**Files:**
- Modify: `src/landing/index.ts`

- [ ] **Step 1: Write `--mx`/`--my` on `mousemove`**

In `initLanding()`, add a `mousemove` listener on the `#view-landing` element that writes the cursor position as CSS custom properties:

```ts
const landingEl = document.getElementById('view-landing') as HTMLElement;
landingEl.addEventListener('mousemove', (e: MouseEvent) => {
  landingEl.style.setProperty('--mx', `${e.clientX}px`);
  landingEl.style.setProperty('--my', `${e.clientY}px`);
});
```

Place this inside `initLanding()` after the `buildColumns` call.

- [ ] **Step 2: Write `--glow-tint` on label hover/leave**

The accent colours per effect are already defined in the `ACCENT` record. Add a helper:

```ts
const GLOW_ACCENT: Record<Effect, string> = {
  ink:      'rgba(98,176,200,0.10)',
  halftone: 'rgba(224,61,106,0.10)',
  corpus:   'rgba(200,160,90,0.10)',
};
```

In `attachColumnHover`, inside the `mousemove` handler where `showCard(rec)` is called, also set the tint:

```ts
landingEl.style.setProperty('--glow-tint', GLOW_ACCENT[rec.def.effect]);
```

In the `mouseleave` handler, reset it:

```ts
landingEl.style.setProperty('--glow-tint', 'rgba(255,255,255,0.5)');
```

`landingEl` must be accessible from `attachColumnHover`. Pass it as a parameter or capture it at module level. The cleanest approach: store it as a module-level variable set in `initLanding`:

```ts
let landingEl: HTMLElement | null = null;
```

Set in `initLanding()`:

```ts
landingEl = document.getElementById('view-landing') as HTMLElement;
```

Then use `landingEl!` in `attachColumnHover`.

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```
git add src/landing/index.ts
git commit -m "feat(landing): cursor glow CSS vars and reactive tint on hover"
```

---

### Task 7: TypeScript — marquee drift with pause-on-hover

**Files:**
- Modify: `src/landing/index.ts`

The marquee advances `scrollOffset` each frame and applies `translateY(-(scrollOffset % CYCLE_H))` to each `.lp-col` element. It freezes while `pointerActive` is true.

- [ ] **Step 1: Store column element references**

In `buildColumns`, keep a reference to each column element in a module-level array:

```ts
let colEls: HTMLElement[] = [];
```

In `buildColumns`, before the loop, reset: `colEls = [];`

In the loop after `colEl.className = 'lp-col'`, push: `colEls.push(colEl);`

- [ ] **Step 2: Advance `scrollOffset` in `springLoop` and apply translateY**

In `springLoop`, at the very top, before the label loop:

```ts
function springLoop(): void {
  // Advance marquee
  if (!pointerActive) {
    scrollOffset += MARQUEE_SPEED;
  }
  const yShift = -(scrollOffset % CYCLE_H);
  for (const colEl of colEls) {
    colEl.style.transform = `translateY(${yShift.toFixed(2)}px)`;
  }

  // existing spring logic below ...
```

- [ ] **Step 3: Generate enough buffer rows**

The marquee wraps at `CYCLE_H = LABELS.length * ROW_H`. To keep labels filling the screen after the column shifts up by up to `CYCLE_H` pixels, the column must be tall enough. The current row count is `Math.ceil(window.innerHeight / ROW_H) + 4`. Change the buffer to `LABELS.length * 2` extra rows (enough for one extra cycle):

```ts
const rowCount = Math.ceil(window.innerHeight / ROW_H) + LABELS.length * 2;
```

- [ ] **Step 4: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```
git add src/landing/index.ts
git commit -m "feat(landing): marquee drift with pause-on-hover"
```

---

### Task 8: TypeScript — live-Y attraction and scale emphasis

**Files:**
- Modify: `src/landing/index.ts`

The spring's vertical falloff must use each label's *current* screen Y (after the marquee shift), not the static `baseY`. And each label gets a scale spring toward `1 + EMPHASIS * falloff`.

- [ ] **Step 1: Update spring loop to use live Y and drive scale**

Replace the spring loop body (the `for (const l of labels)` block) with:

```ts
for (const l of labels) {
  let target = 0;
  let targetScale = 1;

  if (pointerActive && l.col === activeCol) {
    // Live screen Y: baseY is captured at scrollOffset=0; subtract current shift
    const liveY = l.baseY - (scrollOffset % CYCLE_H);
    const dy = pointerY - liveY;
    const falloff = Math.exp(-(dy * dy) / (2 * SIGMA_PX * SIGMA_PX));
    target = (pointerX - l.baseX) * falloff * PULL;
    targetScale = 1 + EMPHASIS * falloff;
  }

  // Horizontal spring
  l.v += (target - l.x) * STIFFNESS;
  l.v *= DAMPING;
  l.x += l.v;

  // Scale spring (eased toward targetScale)
  l.s += (targetScale - l.s) * 0.15;

  l.el.style.transform = `translateX(${l.x.toFixed(2)}px) scale(${l.s.toFixed(4)})`;
}
```

Also set `transform-origin: left center` on `.lp-label` in CSS so scale grows toward the cursor side. Add to `src/styles/landing.css`:

```css
.lp-label {
  ...
  transform-origin: left center;
}
```

- [ ] **Step 2: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```
git add src/landing/index.ts src/styles/landing.css
git commit -m "feat(landing): live-Y attraction and scale emphasis on hover"
```

---

### Task 9: TypeScript — click `.leaving` pop + `enterEffect`

**Files:**
- Modify: `src/landing/index.ts`

- [ ] **Step 1: Replace the existing click listener with the leaving transition**

In `buildColumns`, the current click listener is:

```ts
el.addEventListener('click', () => enterEffect(rec.def.effect));
```

Replace it with:

```ts
el.addEventListener('click', () => {
  rec.el.classList.add('leaving');
  enterEffect(rec.def.effect);
});
```

The `.leaving` CSS class handles the scale pop + fade. `enterEffect` immediately begins fading `#view-landing` to opacity 0 (existing behaviour), so the word pops as the whole landing crossfades.

- [ ] **Step 2: Clear `.leaving` on rebuild**

In `buildColumns`, labels are created fresh each time (new `el` elements), so `.leaving` is inherently cleared. Confirm by checking that `el = document.createElement('div')` is called per label — it is. No extra cleanup needed.

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```
git add src/landing/index.ts
git commit -m "feat(landing): click leaving pop transition before enterEffect"
```

---

### Task 10: Visual QA checklist

No code changes — verification only.

- [ ] Run `npm run dev` in `C:\Users\keana\Tools\Imprint` and open `http://localhost:5173`.
- [ ] Glow: move the cursor around `#view-landing`. A soft radial glow follows the cursor.
- [ ] Reactive tint: hover a label. The glow shifts to a faint colour wash matching the effect accent (blueish for Ink, pinkish for Halftone, warm for Ascii). Resets on mouse-out.
- [ ] Grain: the page has even fine grain. It's subtle, not intrusive.
- [ ] Marquee: labels drift upward slowly. Pauses immediately when the cursor enters the column. Resumes on mouse-out. No visible seam/jump on wrap.
- [ ] Scale emphasis: hovering causes the nearest label to grow slightly. Labels further away are unaffected.
- [ ] Card: the thumbnail image has a slow Ken Burns drift (scale + gentle translate). A faint grain sits over it.
- [ ] Click transition: click any label. The clicked word briefly pops (scales up + fades) as the landing fades into the workspace.
- [ ] Resize: resize the browser window. The layout rebuilds without broken state.
- [ ] TypeScript clean: `npx tsc --noEmit` — 0 errors.

- [ ] **Final commit (if any tweaks were made during QA)**

```
git add -A
git commit -m "fix(landing): QA tweaks post-elevation"
```
