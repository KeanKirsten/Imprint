# Halftone Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add angled grid rotation, CMYK layered colour mode, and click-to-place dot size influence zones to the Halftone effect.

**Architecture:** A shared `renderHalftonePass(ctx, pixels, dispW, dispH, params, angleDeg)` helper handles a single grid pass; `renderHalftone` calls it once for standard modes and four times for CMYK. Influence zone logic runs inside the pass helper, reducing computed dot radius based on proximity to placed points. Canvas click handling for influence zones mirrors the existing Corpus scatter point pattern.

**Tech Stack:** TypeScript, Vite, Canvas 2D API — no new dependencies.

---

## File Map

| File | Change |
|------|--------|
| `src/types.ts` | Add `HalftoneColorMode` union member `'cmyk'`; add `HalftoneInfluencePoint` interface |
| `src/state.ts` | Add `halftoneInfluencePoints`, `halftoneInfluencePlacing`, `halftoneInfluenceNextId` |
| `src/effects/halftone/renderer.ts` | Extract `renderHalftonePass`; add angle transform; CMYK branching; influence zone size reduction; draw zone indicators |
| `src/effects/halftone/sidebar.ts` | Add `setHalftoneColor('cmyk')` branch; add `toggleHalftoneInfluence`, `clearHalftoneInfluence`; export both |
| `index.html` | Add angle slider, CMYK colour button, influence zone section to halftone sidebar; wire canvas click for influence placement |

---

### Task 1: Extend types and state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/state.ts`

- [ ] **Step 1: Update `HalftoneColorMode` in `src/types.ts`**

Replace:
```ts
export type HalftoneColorMode = 'image' | 'duotone' | 'single';
```
With:
```ts
export type HalftoneColorMode = 'image' | 'duotone' | 'single' | 'cmyk';
```

Then add below the `ScatterPoint` interface:
```ts
export interface HalftoneInfluencePoint {
  x: number;
  y: number;
  id: number;
}
```

- [ ] **Step 2: Add new state fields in `src/state.ts`**

Add this import at the top alongside the existing imports:
```ts
import type {
  Effect,
  SourceType,
  InkMode,
  HalftoneShape,
  HalftoneColorMode,
  HalftoneInfluencePoint,
  CorpusColorMode,
  CorpusRenderStyle,
  ScatterPoint,
} from './types';
```

Add these three fields to the `state` object (after `halftoneColorMode`):
```ts
  // Halftone grid angle in degrees
  halftoneAngle: 0,

  // Whether influence-zone placement mode is active
  halftoneInfluencePlacing: false,

  // Placed influence zone points
  halftoneInfluencePoints: [] as HalftoneInfluencePoint[],

  // Counter for unique influence point IDs
  halftoneInfluenceNextId: 0,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\keana\Tools\Imprint
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\keana\Tools\Imprint" add src/types.ts src/state.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(halftone): add cmyk type, influence point type and state fields"
```

---

### Task 2: Refactor renderer — extract `renderHalftonePass`

**Files:**
- Modify: `src/effects/halftone/renderer.ts`

The goal here is to isolate the grid-drawing loop into a reusable helper before adding new features on top of it.

- [ ] **Step 1: Replace `src/effects/halftone/renderer.ts` with the refactored version**

```ts
import { state } from '../../state';
import { getDispSize, drawToOff, mainCanvas, mainCtx } from '../../utils/canvas';
import { hexToRgb, isDarkColor } from '../../utils/color';
import { hashNoise } from '../../utils/noise';

interface PassParams {
  spacing: number;
  minSize: number;
  maxSize: number;
  scatter: number;
  bgHex: string;
  colA: string;
  colB: string;
}

/**
 * Draw one halftone pass onto `ctx` using already-sampled pixel data.
 * `angleDeg` rotates the grid around the canvas centre.
 * `forceFill` overrides the colour mode with a fixed CSS colour string (used by CMYK).
 */
function renderHalftonePass(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  dispW: number,
  dispH: number,
  params: PassParams,
  angleDeg: number,
  forceFill: string | null
): void {
  const { spacing, minSize, maxSize, scatter, colA, colB } = params;
  const dark  = isDarkColor(params.bgHex);
  const rgbA  = hexToRgb(colA);
  const rgbB  = hexToRgb(colB);

  const cx = dispW / 2;
  const cy = dispH / 2;
  const rad = (angleDeg * Math.PI) / 180;

  ctx.save();
  if (angleDeg !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.translate(-cx, -cy);
  }

  for (let y = spacing / 2; y < dispH + spacing * 2; y += spacing) {
    for (let x = spacing / 2; x < dispW + spacing * 2; x += spacing) {
      // Sample pixel in un-rotated space
      const px = Math.min(Math.floor(x), dispW - 1);
      const py = Math.min(Math.floor(y), dispH - 1);
      const ii = (py * dispW + px) * 4;
      const r  = pixels[ii];
      const g  = pixels[ii + 1];
      const b  = pixels[ii + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      const lumT  = dark ? lum / 255 : (255 - lum) / 255;
      let radius  = minSize + (maxSize - minSize) * lumT;

      // Apply influence zone size reduction
      for (const pt of state.halftoneInfluencePoints) {
        const dist = Math.hypot(x - pt.x, y - pt.y);
        const infRad = parseFloat((document.getElementById('h-inf-rad') as HTMLInputElement).value);
        const infStr = parseFloat((document.getElementById('h-inf-str') as HTMLInputElement).value) / 100;
        if (dist < infRad) {
          const proximity = 1 - dist / infRad;
          radius = radius * (1 - proximity * infStr);
        }
      }

      if (radius < 0.25) continue;

      const sx = scatter > 0 ? (hashNoise(x * 0.01, y * 0.01, 0) - 0.5) * scatter * spacing : 0;
      const sy = scatter > 0 ? (hashNoise(x * 0.01, y * 0.01, 1) - 0.5) * scatter * spacing : 0;
      const wx = x + sx;
      const wy = y + sy;

      if (forceFill) {
        ctx.fillStyle = forceFill;
      } else if (state.halftoneColorMode === 'image') {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else if (state.halftoneColorMode === 'duotone') {
        const t = lum / 255;
        ctx.fillStyle = `rgb(${Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t)},${Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t)},${Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t)})`;
      } else {
        ctx.fillStyle = colA;
      }

      if (state.halftoneShape === 'circle') {
        ctx.beginPath();
        ctx.arc(wx, wy, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (state.halftoneShape === 'square') {
        ctx.fillRect(wx - radius, wy - radius, radius * 2, radius * 2);
      } else {
        const th = Math.max(1, radius * 0.38);
        ctx.fillRect(wx - radius, wy - th, radius * 2, th * 2);
        ctx.fillRect(wx - th, wy - radius, th * 2, radius * 2);
      }
    }
  }

  ctx.restore();
}

export function renderHalftone(): void {
  const { dispW, dispH } = getDispSize();
  const spacing  = parseInt((document.getElementById('h-spacing') as HTMLInputElement).value);
  const minSize  = parseFloat((document.getElementById('h-min') as HTMLInputElement).value);
  const maxSize  = parseFloat((document.getElementById('h-max') as HTMLInputElement).value);
  const scatter  = parseFloat((document.getElementById('h-scatter') as HTMLInputElement).value);
  const contrast = parseInt((document.getElementById('h-contrast') as HTMLInputElement).value);
  const bgHex    = (document.getElementById('h-bg') as HTMLInputElement).value;
  const colA     = (document.getElementById('h-col-a') as HTMLInputElement).value;
  const colB     = (document.getElementById('h-col-b') as HTMLInputElement).value;
  const angle    = state.halftoneAngle;

  const { data: pixels } = drawToOff(dispW, dispH, contrast);

  mainCanvas.width  = dispW;
  mainCanvas.height = dispH;
  const ctx = mainCtx;

  const params: PassParams = { spacing, minSize, maxSize, scatter, bgHex, colA, colB };

  if (state.halftoneColorMode === 'cmyk') {
    // White background for CMYK multiply blend
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, dispW, dispH);

    const cmykPasses: Array<{ color: string; offset: number }> = [
      { color: '#00ffff', offset: 15 },
      { color: '#ff00ff', offset: 75 },
      { color: '#ffff00', offset:  0 },
      { color: '#000000', offset: 45 },
    ];

    ctx.globalCompositeOperation = 'multiply';
    for (const pass of cmykPasses) {
      renderHalftonePass(ctx, pixels, dispW, dispH, params, angle + pass.offset, pass.color);
    }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, dispW, dispH);
    renderHalftonePass(ctx, pixels, dispW, dispH, params, angle, null);
  }

  // Draw influence zone indicators when placement mode is active
  if (state.halftoneInfluencePlacing && state.halftoneInfluencePoints.length > 0) {
    const infRad = parseFloat((document.getElementById('h-inf-rad') as HTMLInputElement).value);
    ctx.save();
    for (const pt of state.halftoneInfluencePoints) {
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#d4ff00';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, infRad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.85;
      ctx.fillStyle   = '#d4ff00';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#d4ff00';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(pt.x - 9, pt.y); ctx.lineTo(pt.x + 9, pt.y);
      ctx.moveTo(pt.x, pt.y - 9); ctx.lineTo(pt.x, pt.y + 9);
      ctx.stroke();
    }
    ctx.restore();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\keana\Tools\Imprint
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\keana\Tools\Imprint" add src/effects/halftone/renderer.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(halftone): extract renderHalftonePass, add angle, CMYK, influence zone rendering"
```

---

### Task 3: Update sidebar logic

**Files:**
- Modify: `src/effects/halftone/sidebar.ts`

- [ ] **Step 1: Replace `src/effects/halftone/sidebar.ts` with the updated version**

```ts
import { state } from '../../state';
import { scheduleRender } from '../../workspace/index';
import { mainCanvas } from '../../utils/canvas';

export function setHalftoneShape(shape: 'circle' | 'square' | 'cross'): void {
  state.halftoneShape = shape;
  (['circle', 'square', 'cross'] as const).forEach(s => {
    (document.getElementById(`hs-${s}`) as HTMLElement).classList.toggle('active', s === shape);
  });
  scheduleRender();
}

export function setHalftoneColor(mode: 'image' | 'duotone' | 'single' | 'cmyk'): void {
  state.halftoneColorMode = mode;
  (['image', 'duotone', 'single', 'cmyk'] as const).forEach(m => {
    (document.getElementById(`hc-${m}`) as HTMLElement).classList.toggle('active', m === mode);
  });
  const showA = mode === 'duotone' || mode === 'single';
  const showB = mode === 'duotone';
  (document.getElementById('h-col-a-row') as HTMLElement).style.display = showA ? 'flex' : 'none';
  (document.getElementById('h-col-b-row') as HTMLElement).style.display = showB ? 'flex' : 'none';
  scheduleRender();
}

export function toggleHalftoneInfluence(): void {
  state.halftoneInfluencePlacing = !state.halftoneInfluencePlacing;
  const btn = document.getElementById('h-inf-btn') as HTMLElement;
  btn.classList.toggle('active', state.halftoneInfluencePlacing);
  mainCanvas.style.cursor = state.halftoneInfluencePlacing ? 'crosshair' : '';
  scheduleRender();
}

export function clearHalftoneInfluence(): void {
  state.halftoneInfluencePoints = [];
  scheduleRender();
}

export function setHalftoneAngle(deg: number): void {
  state.halftoneAngle = deg;
  scheduleRender();
}

export function onHalftoneCanvasClick(e: MouseEvent): void {
  if (!state.halftoneInfluencePlacing) return;
  const rect = mainCanvas.getBoundingClientRect();
  const scaleX = mainCanvas.width  / rect.width;
  const scaleY = mainCanvas.height / rect.height;
  state.halftoneInfluencePoints.push({
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY,
    id: state.halftoneInfluenceNextId++,
  });
  scheduleRender();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\keana\Tools\Imprint
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\keana\Tools\Imprint" add src/effects/halftone/sidebar.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(halftone): add CMYK, influence zone, and angle sidebar handlers"
```

---

### Task 4: Wire up in `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update the halftone import line**

Replace line 44:
```ts
import { setHalftoneShape, setHalftoneColor } from './effects/halftone/sidebar';
```
With:
```ts
import { setHalftoneShape, setHalftoneColor, setHalftoneAngle, toggleHalftoneInfluence, clearHalftoneInfluence, onHalftoneCanvasClick } from './effects/halftone/sidebar';
```

- [ ] **Step 2: Extend the Window interface declaration**

In the `declare global { interface Window { ... } }` block, add after `setHalftoneColor`:
```ts
    setHalftoneAngle:         typeof setHalftoneAngle;
    toggleHalftoneInfluence:  typeof toggleHalftoneInfluence;
    clearHalftoneInfluence:   typeof clearHalftoneInfluence;
```

- [ ] **Step 3: Assign the new functions to window**

After `window.setHalftoneColor = setHalftoneColor;` (line 79), add:
```ts
window.setHalftoneAngle        = setHalftoneAngle;
window.toggleHalftoneInfluence = toggleHalftoneInfluence;
window.clearHalftoneInfluence  = clearHalftoneInfluence;
```

- [ ] **Step 4: Import state and mainCanvas, then wire the canvas click listener**

At the top of `main.ts`, add these imports (after the workspace imports):
```ts
import { state } from './state';
import { mainCanvas } from './utils/canvas';
```

Then at the bottom of the file, after the `initPreviews()` call, add:
```ts
mainCanvas.addEventListener('click', (e: MouseEvent) => {
  if (state.currentEffect === 'halftone') onHalftoneCanvasClick(e);
});
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:\Users\keana\Tools\Imprint
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git -C "C:\Users\keana\Tools\Imprint" add src/main.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(halftone): expose influence zone handlers and wire canvas click"
```

---

### Task 5: Update `index.html` — halftone sidebar controls

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the angle slider to the Dot settings section**

Inside `<aside class="ws-sidebar" id="sidebar-halftone">`, in the "Dot settings" `<div class="s-section">`, add this row after the Contrast row (line ~191):
```html
<div class="s-row">
  <span class="s-row-lbl">Angle</span>
  <input type="range" min="0" max="90" value="0" id="h-angle"
    oninput="document.getElementById('h-an').textContent=this.value+'°'; setHalftoneAngle(parseInt(this.value))">
  <span class="s-val" id="h-an">0°</span>
</div>
```

- [ ] **Step 2: Add CMYK button to the Colour section**

Find the colour buttons group in the halftone sidebar (around line 205):
```html
<div class="s-btns" style="margin-bottom:12px">
  <button class="s-btn active" id="hc-image"   onclick="setHalftoneColor('image')">Image</button>
  <button class="s-btn"        id="hc-duotone" onclick="setHalftoneColor('duotone')">Duotone</button>
  <button class="s-btn"        id="hc-single"  onclick="setHalftoneColor('single')">Single</button>
</div>
```

Replace with:
```html
<div class="s-btns" style="margin-bottom:12px">
  <button class="s-btn active" id="hc-image"   onclick="setHalftoneColor('image')">Image</button>
  <button class="s-btn"        id="hc-duotone" onclick="setHalftoneColor('duotone')">Duotone</button>
  <button class="s-btn"        id="hc-single"  onclick="setHalftoneColor('single')">Single</button>
  <button class="s-btn"        id="hc-cmyk"    onclick="setHalftoneColor('cmyk')">CMYK</button>
</div>
```

- [ ] **Step 3: Add influence zones section**

After the closing `</div>` of the Colour section in the halftone sidebar, add:
```html
<div class="s-section">
  <span class="s-label">Size influence</span>
  <button class="s-scatter-btn" id="h-inf-btn" onclick="toggleHalftoneInfluence()">&oplus; Place zones</button>
  <div class="s-row">
    <span class="s-row-lbl">Radius</span>
    <input type="range" min="10" max="300" value="100" id="h-inf-rad"
      oninput="document.getElementById('h-ir').textContent=this.value+'px'; scheduleRender()">
    <span class="s-val" id="h-ir">100px</span>
  </div>
  <div class="s-row">
    <span class="s-row-lbl">Strength</span>
    <input type="range" min="0" max="100" value="80" id="h-inf-str"
      oninput="document.getElementById('h-is').textContent=this.value+'%'; scheduleRender()">
    <span class="s-val" id="h-is">80%</span>
  </div>
  <button class="s-btn" style="width:100%; margin-top:4px" onclick="clearHalftoneInfluence()">Clear zones</button>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles and dev server starts**

```bash
cd C:\Users\keana\Tools\Imprint
npx tsc --noEmit
npm run dev
```

Open `http://localhost:5173`, upload an image, enter Halftone. Verify:
- Angle slider rotates the grid
- CMYK button produces a four-colour composite
- "Place zones" toggle activates crosshair cursor; clicking the canvas shrinks dots in that area
- Clear zones button removes all points

- [ ] **Step 5: Commit**

```bash
git -C "C:\Users\keana\Tools\Imprint" add index.html
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(halftone): add angle slider, CMYK button, and influence zone controls to sidebar"
```
