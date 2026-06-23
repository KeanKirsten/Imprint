# Figma Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the scattered-card landing with the Figma typographic landing — two columns of repeating effect labels with an elastic cursor cascade, a static preview card per effect, and click-to-enter navigation.

**Architecture:** A full rewrite of `src/landing/index.ts` builds the label columns, runs a vanilla rAF spring that displaces labels horizontally by gaussian falloff from the hovered row, and drives a floating preview card. `landing.css` is rewritten for the light layout; the real trial fonts are embedded via `@font-face`. The old `previews.ts` canvas previews are removed.

**Tech Stack:** TypeScript, Vite, vanilla DOM/Canvas. No new dependencies. Verification: `npx tsc --noEmit` + manual browser check.

---

### Task 1: Fonts — copy files and add @font-face

**Files:** add `public/fonts/*.otf`, Modify `src/styles/base.css`

- [ ] **Step 1: Copy the two Medium font files into the project**

```
cd C:\Users\keana\Tools\Imprint && mkdir -p public/fonts && cp "C:/Users/keana/Downloads/2026/03 Resources/Fonts/Lay Grotesk-Trial/LayGrotesk-Trial-Medium.otf" public/fonts/ && cp "C:/Users/keana/Downloads/2026/03 Resources/Fonts/NT-Trial-Fonts-2025/NT Trial Fonts 2025/Azurio Trials/AzurioTrial-Medium.otf" public/fonts/ && ls public/fonts/
```
Expected: `AzurioTrial-Medium.otf  LayGrotesk-Trial-Medium.otf`

- [ ] **Step 2: Add `@font-face` to the top of `src/styles/base.css`** (before the reset block)

```css
@font-face {
  font-family: 'Lay Grotesk Trial';
  src: url('/fonts/LayGrotesk-Trial-Medium.otf') format('opentype');
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'Azurio Trial';
  src: url('/fonts/AzurioTrial-Medium.otf') format('opentype');
  font-weight: 500;
  font-display: swap;
}

```

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add public/fonts src/styles/base.css
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(landing): embed Lay Grotesk and Azurio trial fonts"
```

---

### Task 2: Landing markup in `index.html`

**Files:** Modify `index.html`

- [ ] **Step 1: Replace the entire inner content of `<div id="view-landing">`**

Find the `<div id="view-landing">` block (it contains `.brand-center`, `.cards-scatter` with three `.effect-card`s, and `.landing-footer`). Replace everything BETWEEN the opening `<div id="view-landing">` tag and its matching closing `</div>` with:

```html

  <div class="lp-grain" aria-hidden="true"></div>

  <header class="lp-header">
    <div class="lp-wordmark">Imprint</div>
    <div class="lp-meta"><span>Visual Effects Tool</span><span>2025</span></div>
  </header>

  <div class="lp-columns" id="lp-columns"></div>

  <div class="lp-card" id="lp-card" aria-hidden="true">
    <div class="lp-card-img" id="lp-card-img"></div>
    <div class="lp-card-bottom">
      <div class="lp-card-text">
        <span class="lp-card-tag"  id="lp-card-tag"></span>
        <span class="lp-card-name" id="lp-card-name"></span>
      </div>
      <span class="lp-card-more">···</span>
    </div>
  </div>

```

Keep the opening `<div id="view-landing">` and its closing `</div>` exactly as they are.

- [ ] **Step 2: Verify build**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors (HTML doesn't affect tsc, but confirm nothing else broke). Note: `landing/index.ts` still references the OLD `.effect-card` elements at this point — that's fine; it's rewritten in Task 4. App may look broken between tasks.

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add index.html
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(landing): new typographic landing markup"
```

---

### Task 3: Landing styles `src/styles/landing.css` (full rewrite)

**Files:** Modify `src/styles/landing.css`

- [ ] **Step 1: Replace the ENTIRE contents of `src/styles/landing.css` with:**

```css
/* Landing view — typographic, light */

#view-landing {
  position: fixed;
  inset: 0;
  background: linear-gradient(160deg, #eef0ee 0%, #e6e8e6 100%);
  overflow: hidden;
  transition: opacity 0.5s ease;
}

/* Subtle noise grain overlay */
.lp-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Header */
.lp-header {
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40px;
  color: #0e0e0f;
  z-index: 20;
}
.lp-wordmark {
  font-family: 'Azurio Trial', sans-serif;
  font-size: 24px;
  letter-spacing: -1.44px;
  line-height: 1;
}
.lp-meta {
  display: flex;
  gap: 24px;
  font-family: 'Lay Grotesk Trial', sans-serif;
  font-size: 14px;
  line-height: 1;
}

/* Columns */
.lp-columns {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 120px;
  padding-top: 31px;
  overflow: hidden;
}
.lp-col {
  display: flex;
  flex-direction: column;
  width: 150px;
}

/* Labels */
.lp-label {
  font-family: 'Lay Grotesk Trial', sans-serif;
  font-size: 24px;
  letter-spacing: -1px;
  line-height: 45px;
  color: #0e0e0f;
  cursor: pointer;
  white-space: nowrap;
  will-change: transform;
  transition: opacity 0.25s ease;
}
.lp-columns.hovering .lp-label:not(.active) { opacity: 0.55; }

/* Preview card */
.lp-card {
  position: fixed;
  width: 168px;
  border-radius: 5px;
  overflow: hidden;
  background: #2a282f;
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;
  z-index: 30;
  box-shadow: 0 18px 50px rgba(0,0,0,0.28);
}
.lp-card.visible { opacity: 1; transform: scale(1); }
.lp-card-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
  background-color: #1a1a1a;
}
.lp-card-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 9px;
  background: linear-gradient(to bottom, rgba(42,40,47,0) 0%, #2a282f 80%);
  margin-top: -34px;
  position: relative;
}
.lp-card-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lp-card-tag {
  font-family: 'Lay Grotesk Trial', sans-serif;
  font-size: 8px;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.5);
}
.lp-card-name {
  font-family: 'Lay Grotesk Trial', sans-serif;
  font-size: 13px;
  letter-spacing: -0.3px;
  color: #fff;
}
.lp-card-more { color: #fff; font-size: 12px; line-height: 1; flex-shrink: 0; }
```

- [ ] **Step 2: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/styles/landing.css
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(landing): light typographic landing styles"
```

---

### Task 4: Landing behaviour `src/landing/index.ts` (full rewrite)

**Files:** Modify `src/landing/index.ts`

- [ ] **Step 1: Replace the ENTIRE contents of `src/landing/index.ts` with:**

```ts
import { enterEffect } from '../workspace/index';
import type { Effect } from '../types';

interface LabelDef { text: string; effect: Effect; tag: string; img: string; }

// Ordered cycle of labels → effects. Each repeats down the columns.
const LABELS: LabelDef[] = [
  { text: 'Bleed/Ink', effect: 'ink',      tag: 'INK',      img: '/previews/bleed.png' },
  { text: 'Particle',  effect: 'halftone', tag: 'HALFTONE', img: '/previews/particle.png' },
  { text: 'Ascii',     effect: 'corpus',   tag: 'CORPUS',   img: '/previews/ascii.png' },
];

// Fallback colour per effect if a thumbnail is missing.
const ACCENT: Record<Effect, string> = {
  ink: '#62b0c8', halftone: '#e03d6a', corpus: '#c8a05a',
};

// Tunables
const ROW_H     = 45;   // label line height (px)
const COLS      = 2;
const MAX_DISP  = 90;   // max horizontal push at the hovered row (px)
const SIGMA     = 2.2;  // gaussian falloff width (rows)
const STIFFNESS = 0.14; // spring pull toward target
const DAMPING   = 0.72; // velocity damping

interface LabelRec {
  el: HTMLElement;
  col: number;
  row: number;
  def: LabelDef;
  x: number;
  v: number;
}

let labels: LabelRec[] = [];
let hovered: { col: number; row: number } | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let loopStarted = false;

export function initLanding(): void {
  const columnsEl = document.getElementById('lp-columns') as HTMLElement;
  buildColumns(columnsEl);

  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => buildColumns(columnsEl), 200);
  });

  if (!loopStarted) {
    loopStarted = true;
    requestAnimationFrame(springLoop);
  }
}

function buildColumns(columnsEl: HTMLElement): void {
  columnsEl.innerHTML = '';
  columnsEl.classList.remove('hovering');
  labels = [];
  hovered = null;
  hideCard();

  const rowCount = Math.ceil(window.innerHeight / ROW_H) + 4;

  for (let col = 0; col < COLS; col++) {
    const colEl = document.createElement('div');
    colEl.className = 'lp-col';
    for (let row = 0; row < rowCount; row++) {
      const def = LABELS[(row + col) % LABELS.length]; // per-column offset for a staggered feel
      const el = document.createElement('div');
      el.className = 'lp-label';
      el.textContent = def.text;
      const rec: LabelRec = { el, col, row, def, x: 0, v: 0 };
      attachHandlers(rec, columnsEl);
      colEl.appendChild(el);
      labels.push(rec);
    }
    columnsEl.appendChild(colEl);
  }
}

function attachHandlers(rec: LabelRec, columnsEl: HTMLElement): void {
  rec.el.addEventListener('mouseenter', () => {
    hovered = { col: rec.col, row: rec.row };
    columnsEl.classList.add('hovering');
    for (const l of labels) l.el.classList.toggle('active', l === rec);
    showCard(rec);
  });
  rec.el.addEventListener('mouseleave', () => {
    if (hovered && hovered.col === rec.col && hovered.row === rec.row) {
      hovered = null;
      columnsEl.classList.remove('hovering');
      for (const l of labels) l.el.classList.remove('active');
      hideCard();
    }
  });
  rec.el.addEventListener('click', () => enterEffect(rec.def.effect));
}

function springLoop(): void {
  for (const l of labels) {
    let target = 0;
    if (hovered && hovered.col === l.col) {
      const d = l.row - hovered.row;
      const falloff = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
      const dir = l.col === 0 ? -1 : 1; // push outward, away from centre
      target = dir * MAX_DISP * falloff;
    }
    l.v += (target - l.x) * STIFFNESS;
    l.v *= DAMPING;
    l.x += l.v;
    l.el.style.transform = `translateX(${l.x.toFixed(2)}px)`;
  }
  requestAnimationFrame(springLoop);
}

function showCard(rec: LabelRec): void {
  const card  = document.getElementById('lp-card')      as HTMLElement;
  const imgEl = document.getElementById('lp-card-img')  as HTMLElement;
  const tagEl = document.getElementById('lp-card-tag')  as HTMLElement;
  const nameEl = document.getElementById('lp-card-name') as HTMLElement;

  tagEl.textContent  = rec.def.tag;
  nameEl.textContent = rec.def.text;

  // Load thumbnail; fall back to a flat accent fill if the file is missing.
  imgEl.style.backgroundImage = '';
  imgEl.style.backgroundColor = '#1a1a1a';
  const probe = new Image();
  probe.onload  = () => { imgEl.style.backgroundImage = `url('${rec.def.img}')`; };
  probe.onerror = () => { imgEl.style.backgroundColor = ACCENT[rec.def.effect]; };
  probe.src = rec.def.img;

  // Position beside the label, clamped to the viewport.
  const r = rec.el.getBoundingClientRect();
  const cardW = 168;
  const cardH = 168 + 44;
  let left = rec.col === 0 ? r.right + 16 : r.left - cardW - 16;
  let top  = r.top + r.height / 2 - cardH / 2;
  left = Math.max(12, Math.min(window.innerWidth  - cardW - 12, left));
  top  = Math.max(12, Math.min(window.innerHeight - cardH - 12, top));
  card.style.left = `${left}px`;
  card.style.top  = `${top}px`;
  card.classList.add('visible');
}

function hideCard(): void {
  const card = document.getElementById('lp-card');
  card?.classList.remove('visible');
}
```

- [ ] **Step 2: Verify build**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors. (`src/main.ts` still imports `initPreviews` from `previews.ts`, which still exists — that's removed in Task 5. No error yet.)

- [ ] **Step 3: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/landing/index.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(landing): cascade spring, preview card, click-to-enter"
```

---

### Task 5: Remove old previews, finalise wiring, verify

**Files:** Delete `src/landing/previews.ts`, Modify `src/main.ts`

- [ ] **Step 1: Remove the `initPreviews` import line from `src/main.ts`**

Delete these lines:
```ts
// Landing card previews
import { initPreviews } from './landing/previews';
```

- [ ] **Step 2: Remove the `initPreviews();` call from the init section of `src/main.ts`**

Delete the line:
```ts
initPreviews();
```

- [ ] **Step 3: Delete the obsolete previews file**

```
git -C "C:\Users\keana\Tools\Imprint" rm src/landing/previews.ts
```

- [ ] **Step 4: Verify build**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Manual browser check**

```
cd C:\Users\keana\Tools\Imprint && npm run dev
```
Open `http://localhost:5173`. Confirm:
- Light landing with "Imprint" wordmark (Azurio) top-left, "Visual Effects Tool / 2025" (Lay Grotesk) top-right.
- Two columns of repeating Bleed/Ink / Particle / Ascii in Lay Grotesk.
- Hovering a label bows that column outward elastically and settles springily on mouse-out.
- A preview card fades/scales in beside the hovered label showing the effect thumbnail (or a flat accent fallback if the image file is missing), with tag + name + "···".
- Clicking a label opens that effect's workspace; Back returns to the landing intact.
- Resizing the window refits the columns.

- [ ] **Step 6: Commit**

```
git -C "C:\Users\keana\Tools\Imprint" add src/main.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(landing): remove old canvas previews, finalise wiring"
```

---

## Self-Review Notes

- **Spec coverage:** fonts (T1), markup (T2), styles (T3), cascade spring + preview card + click nav (T4), removal of old previews + wiring (T5). All spec sections mapped.
- **Placeholder scan:** none — all code blocks complete.
- **Type consistency:** `LabelDef`/`LabelRec`, `enterEffect(effect: Effect)`, element ids (`lp-columns`, `lp-card`, `lp-card-img/tag/name`) match the markup in Task 2 and the spec. `ACCENT` keyed by `Effect`.
- **Inter-task build order:** between T2 and T4 the app's landing is visually broken (old `index.ts` references removed `.effect-card`s) but tsc stays clean; resolved by T4. T5 removes the last dangling reference (`previews.ts`).
