# Corpus Character Sets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Restore Hex/Binary/Base64/Custom character-set modes to the Corpus effect, default Hex.

**Architecture:** A `CorpusCharSet` state value drives both the sidebar UI (mode buttons + conditional textarea) and the renderer (per-mode character pool and selection). Presets pick characters pseudo-randomly per grid cell via `hashNoise`; Custom keeps the existing sequential textarea mapping.

**Tech Stack:** TypeScript, Vite, Canvas 2D — no new dependencies.

---

### Task 1: Types and state

**Files:** Modify `src/types.ts`, `src/state.ts`

- [ ] **Step 1:** In `src/types.ts`, add after `CorpusRenderStyle`:
```ts
export type CorpusCharSet = 'hex' | 'binary' | 'base64' | 'custom';
```

- [ ] **Step 2:** In `src/state.ts`, add `CorpusCharSet` to the type import list from `./types`.

- [ ] **Step 3:** In `src/state.ts`, add this field after `corpusRenderStyle`:
```ts
  // Corpus character set source
  corpusCharSet: 'hex' as CorpusCharSet,
```

- [ ] **Step 4:** Verify: `cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit` → no errors.

- [ ] **Step 5:** Commit:
```
git -C "C:\Users\keana\Tools\Imprint" add src/types.ts src/state.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(corpus): add CorpusCharSet type and state field"
```

---

### Task 2: Sidebar handler

**Files:** Modify `src/effects/corpus/sidebar.ts`

- [ ] **Step 1:** Add the import type. At the top, add:
```ts
import type { CorpusCharSet } from '../../types';
```

- [ ] **Step 2:** Add this exported function (after `setCorpusColor`):
```ts
/**
 * Switch the corpus character-set mode and show/hide the custom text group.
 * Exposed on window.
 */
export function setCorpusCharSet(mode: CorpusCharSet): void {
  state.corpusCharSet = mode;
  (['hex', 'binary', 'base64', 'custom'] as const).forEach(m => {
    (document.getElementById(`cs-${m}`) as HTMLElement).classList.toggle('active', m === mode);
  });
  (document.getElementById('c-custom-text') as HTMLElement).style.display =
    mode === 'custom' ? 'block' : 'none';
  scheduleRender();
}
```

- [ ] **Step 3:** Verify: `cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit` → no errors.

- [ ] **Step 4:** Commit:
```
git -C "C:\Users\keana\Tools\Imprint" add src/effects/corpus/sidebar.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(corpus): add setCorpusCharSet handler"
```

---

### Task 3: Renderer character pool

**Files:** Modify `src/effects/corpus/renderer.ts`

Current text-building block (lines ~25-28):
```ts
  let rawText = (document.getElementById('c-text') as HTMLTextAreaElement).value.trim() ||
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';
  let chars = skipSp ? rawText.replace(/\s+/g, '').split('') : rawText.split('');
  if (!chars.length) chars = ['?'];
```

- [ ] **Step 1:** Replace that block with:
```ts
  const charSet = state.corpusCharSet;
  const PRESETS: Record<'hex' | 'binary' | 'base64', string> = {
    hex:    '0123456789ABCDEF',
    binary: '01',
    base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
  };

  let chars: string[];
  if (charSet === 'custom') {
    const rawText = (document.getElementById('c-text') as HTMLTextAreaElement).value.trim() ||
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';
    chars = skipSp ? rawText.replace(/\s+/g, '').split('') : rawText.split('');
    if (!chars.length) chars = ['?'];
  } else {
    chars = PRESETS[charSet].split('');
  }
```

- [ ] **Step 2:** Find the character selection in the grid loop:
```ts
      const ch  = chars[li % chars.length];
      li++;
```

Replace with:
```ts
      let ch: string;
      if (charSet === 'custom') {
        ch = chars[li % chars.length];
      } else {
        const idx = Math.min(chars.length - 1, Math.floor(hashNoise(col * 0.01, row * 0.01, 7) * chars.length));
        ch = chars[idx];
      }
      li++;
```

(`hashNoise` is already imported in this file.)

- [ ] **Step 3:** Verify: `cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit` → no errors.

- [ ] **Step 4:** Commit:
```
git -C "C:\Users\keana\Tools\Imprint" add src/effects/corpus/renderer.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(corpus): build character pool and selection by char-set mode"
```

---

### Task 4: Wire up main.ts

**Files:** Modify `src/main.ts`

- [ ] **Step 1:** Update the corpus sidebar import to include `setCorpusCharSet`:
```ts
import {
  setRenderStyle,
  setCorpusColor,
  setCorpusCharSet,
  toggleCorpusScatter,
  clearCorpusScatter,
  initCorpusSidebar,
} from './effects/corpus/sidebar';
```

- [ ] **Step 2:** In the `Window` interface, add after `setCorpusColor`:
```ts
    setCorpusCharSet:     typeof setCorpusCharSet;
```

- [ ] **Step 3:** After `window.setCorpusColor = setCorpusColor;`, add:
```ts
window.setCorpusCharSet    = setCorpusCharSet;
```

- [ ] **Step 4:** Verify: `cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit` → no errors.

- [ ] **Step 5:** Commit:
```
git -C "C:\Users\keana\Tools\Imprint" add src/main.ts
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(corpus): expose setCorpusCharSet on window"
```

---

### Task 5: HTML controls

**Files:** Modify `index.html`

Current Corpus "Text source" section:
```html
      <div class="s-section">
        <span class="s-label">Text source</span>
        <textarea class="s-textarea" id="c-text"
          placeholder="Enter any text&hellip;" oninput="scheduleRender()">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,;:!?</textarea>
        <div style="margin-top:10px">
          <label style="font-size:8.5px; color:var(--muted); display:flex; align-items:center; gap:7px; cursor:pointer; letter-spacing:0.04em;">
            <input type="checkbox" id="c-skip-spaces" onchange="scheduleRender()"> Skip spaces
          </label>
        </div>
      </div>
```

- [ ] **Step 1:** Replace that entire section with:
```html
      <div class="s-section">
        <span class="s-label">Character set</span>
        <div class="s-btns" style="margin-bottom:10px">
          <button class="s-btn active" id="cs-hex"    onclick="setCorpusCharSet('hex')">Hex</button>
          <button class="s-btn"        id="cs-binary" onclick="setCorpusCharSet('binary')">Binary</button>
          <button class="s-btn"        id="cs-base64" onclick="setCorpusCharSet('base64')">Base64</button>
          <button class="s-btn"        id="cs-custom" onclick="setCorpusCharSet('custom')">Custom</button>
        </div>
        <div id="c-custom-text" style="display:none">
          <textarea class="s-textarea" id="c-text"
            placeholder="Enter any text&hellip;" oninput="scheduleRender()">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,;:!?</textarea>
          <div style="margin-top:10px">
            <label style="font-size:8.5px; color:var(--muted); display:flex; align-items:center; gap:7px; cursor:pointer; letter-spacing:0.04em;">
              <input type="checkbox" id="c-skip-spaces" onchange="scheduleRender()"> Skip spaces
            </label>
          </div>
        </div>
      </div>
```

- [ ] **Step 2:** Verify build: `cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit`. Then `npm run dev`, open `http://localhost:5173`, upload an image, enter Corpus. Confirm:
  - Default is Hex; textarea hidden
  - Hex/Binary/Base64 produce varied dense character textures
  - Custom shows the textarea and renders typed text sequentially
  - Switching back and forth updates live

- [ ] **Step 3:** Commit:
```
git -C "C:\Users\keana\Tools\Imprint" add index.html
git -C "C:\Users\keana\Tools\Imprint" commit -m "feat(corpus): add character-set buttons and conditional text group"
```
