# Floating Panel, Macro Controls & Advanced Collapse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed sidebar with a draggable floating panel that leads with Quick Adjust macro sliders and hides detail controls behind an Advanced toggle.

**Architecture:** The floating panel is a `position: fixed` div managed by a new `panel.ts` module (drag/snap/localStorage). Macro sliders live in `macros.ts` and write values directly to existing detail inputs, dispatching `input` events to trigger the existing render pipeline. The three sidebar content blocks move inside the panel's collapsible Advanced section. No renderer changes needed.

**Tech Stack:** Vanilla TypeScript, CSS custom properties, localStorage, pointer events API.

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Restructure workspace: simplify header, add `.ws-panel` with drag handle, macro sections, advanced toggle, advanced content, exports |
| `src/styles/workspace.css` | Add panel, snap, macro, advanced styles; update canvas area to fill viewport |
| `src/workspace/panel.ts` | New: drag/snap logic, localStorage persistence, `initPanel()` |
| `src/workspace/macros.ts` | New: macro definitions per effect, `initMacros(effect)`, macro event handlers |
| `src/workspace/index.ts` | Call `initPanel()`, `initMacros(effect)` on effect change, expose `toggleAdvanced()` |

---

### Task 1: Simplify the header and restructure workspace HTML

**Files:**
- Modify: `index.html`

This task rewrites the workspace section of `index.html`. The header loses Upload, Export PNG, and Timeline buttons. The three sidebar `<aside>` elements move into a new floating panel. The canvas area becomes the sole child of `.ws-body`.

- [ ] **Step 1: Replace the entire `#view-workspace` block**

In `index.html`, replace everything from `<!-- WORKSPACE -->` to the closing `</div>` of `#view-workspace` with:

```html
<!-- WORKSPACE -->
<div id="view-workspace">

  <header class="ws-header">
    <button class="ws-back" onclick="goToLanding()">&larr; Back</button>
    <div class="ws-effect-badge" id="ws-badge">Corpus</div>
    <div class="ws-spacer"></div>
  </header>

  <div class="ws-body">

    <!-- Floating control panel -->
    <div class="ws-panel" id="ws-panel">
      <div class="ws-panel-handle" id="ws-panel-handle"></div>

      <!-- Upload -->
      <button class="ws-panel-upload" onclick="triggerUpload()">&oplus; Add footage</button>
      <input type="file" id="file-input" accept="image/*,video/*" style="display:none" onchange="onFileInput(this)">

      <!-- Preset row — wired in spec 2 -->
      <div class="preset-row" id="preset-row"></div>

      <!-- Quick Adjust — corpus -->
      <div class="ws-macro-section" id="macro-corpus">
        <span class="s-label">Quick Adjust</span>
        <div class="s-row">
          <span class="s-row-lbl">Scale</span>
          <input type="range" min="0" max="100" value="11" id="m-c-scale"
            oninput="onMacro('corpus','scale',this.value)">
          <span class="s-val" id="m-c-scale-v">11</span>
        </div>
        <div class="s-row">
          <span class="s-row-lbl">Intensity</span>
          <input type="range" min="0" max="100" value="20" id="m-c-intensity"
            oninput="onMacro('corpus','intensity',this.value)">
          <span class="s-val" id="m-c-intensity-v">20</span>
        </div>
        <div class="s-row">
          <span class="s-row-lbl">Coverage</span>
          <input type="range" min="0" max="100" value="51" id="m-c-coverage"
            oninput="onMacro('corpus','coverage',this.value)">
          <span class="s-val" id="m-c-coverage-v">51</span>
        </div>
      </div>

      <!-- Quick Adjust — halftone -->
      <div class="ws-macro-section" id="macro-halftone" style="display:none">
        <span class="s-label">Quick Adjust</span>
        <div class="s-row">
          <span class="s-row-lbl">Density</span>
          <input type="range" min="0" max="100" value="65" id="m-h-density"
            oninput="onMacro('halftone','density',this.value)">
          <span class="s-val" id="m-h-density-v">65</span>
        </div>
        <div class="s-row">
          <span class="s-row-lbl">Intensity</span>
          <input type="range" min="0" max="100" value="20" id="m-h-intensity"
            oninput="onMacro('halftone','intensity',this.value)">
          <span class="s-val" id="m-h-intensity-v">20</span>
        </div>
      </div>

      <!-- Quick Adjust — ink -->
      <div class="ws-macro-section" id="macro-ink" style="display:none">
        <span class="s-label">Quick Adjust</span>
        <div class="s-row">
          <span class="s-row-lbl">Density</span>
          <input type="range" min="0" max="100" value="64" id="m-i-density"
            oninput="onMacro('ink','density',this.value)">
          <span class="s-val" id="m-i-density-v">64</span>
        </div>
        <div class="s-row">
          <span class="s-row-lbl">Intensity</span>
          <input type="range" min="0" max="100" value="40" id="m-i-intensity"
            oninput="onMacro('ink','intensity',this.value)">
          <span class="s-val" id="m-i-intensity-v">40</span>
        </div>
      </div>

      <!-- Advanced toggle -->
      <button class="ws-advanced-toggle" id="ws-advanced-toggle" onclick="toggleAdvanced()">Advanced &or;</button>

      <!-- Advanced — all existing detail controls -->
      <div class="ws-advanced" id="ws-advanced">

        <!-- Corpus detail controls -->
        <div class="ws-sidebar" id="sidebar-corpus">

          <div class="s-section">
            <span class="s-label">Render mode</span>
            <div class="s-btns">
              <button class="s-btn active" id="rs-mosaic"    onclick="setRenderStyle('mosaic')">Mosaic</button>
              <button class="s-btn"        id="rs-threshold" onclick="setRenderStyle('threshold')">Threshold</button>
            </div>
          </div>

          <div class="s-section">
            <span class="s-label">Size &amp; detail</span>
            <div class="s-row">
              <span class="s-row-lbl">Char size</span>
              <input type="range" min="4" max="60" value="9" id="c-size"
                oninput="document.getElementById('c-sz').textContent=this.value+'px'; scheduleRender()">
              <span class="s-val" id="c-sz">9px</span>
              <button class="anim-stopwatch" data-slider="c-size" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Threshold</span>
              <input type="range" min="0" max="250" value="128" id="c-threshold"
                oninput="document.getElementById('c-th').textContent=this.value; scheduleRender()">
              <span class="s-val" id="c-th">128</span>
              <button class="anim-stopwatch" data-slider="c-threshold" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Contrast</span>
              <input type="range" min="50" max="300" value="100" id="c-contrast"
                oninput="document.getElementById('c-co').textContent=this.value+'%'; scheduleRender()">
              <span class="s-val" id="c-co">100%</span>
              <button class="anim-stopwatch" data-slider="c-contrast" title="Animate">&#9201;</button>
            </div>
          </div>

          <div class="s-section">
            <span class="s-label">Colour</span>
            <div class="s-btns" style="margin-bottom:12px">
              <button class="s-btn active" id="cc-image"    onclick="setCorpusColor('image')">Image</button>
              <button class="s-btn"        id="cc-duotone"  onclick="setCorpusColor('duotone')">Duotone</button>
              <button class="s-btn"        id="cc-gradient" onclick="setCorpusColor('gradient')">Gradient</button>
              <button class="s-btn"        id="cc-invert"   onclick="setCorpusColor('invert')">Invert</button>
            </div>
            <div id="c-custom-cols" style="display:none">
              <div class="s-color-row">
                <span class="s-color-lbl">Colour A</span>
                <input type="color" id="c-col-a" value="#1a0800" oninput="scheduleRender()">
              </div>
              <div class="s-color-row">
                <span class="s-color-lbl">Colour B</span>
                <input type="color" id="c-col-b" value="#ff9500" oninput="scheduleRender()">
              </div>
            </div>
            <div class="s-color-row">
              <span class="s-color-lbl">Background</span>
              <input type="color" id="c-bg" value="#000000" oninput="scheduleRender()">
            </div>
          </div>

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
                <label style="font-size:16px; color:var(--muted); display:flex; align-items:center; gap:7px; cursor:pointer; letter-spacing:0.04em;">
                  <input type="checkbox" id="c-skip-spaces" onchange="scheduleRender()"> Skip spaces
                </label>
              </div>
            </div>
          </div>

          <div class="s-section">
            <span class="s-label">Scatter</span>
            <button class="s-scatter-btn" id="c-scatter-btn" onclick="toggleCorpusScatter()">&oplus; Place points</button>
            <div class="s-row">
              <span class="s-row-lbl">Strength</span>
              <input type="range" min="0" max="300" value="80" id="c-sc-str"
                oninput="document.getElementById('c-ss').textContent=this.value+'px'; scheduleRender()">
              <span class="s-val" id="c-ss">80px</span>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Radius</span>
              <input type="range" min="20" max="500" value="150" id="c-sc-rad"
                oninput="document.getElementById('c-sr').textContent=this.value+'px'; scheduleRender()">
              <span class="s-val" id="c-sr">150px</span>
            </div>
            <button class="s-btn" style="width:100%; margin-top:4px" onclick="clearCorpusScatter()">Clear points</button>
          </div>

        </div><!-- /#sidebar-corpus -->

        <!-- Halftone detail controls -->
        <div class="ws-sidebar" id="sidebar-halftone" style="display:none">

          <div class="s-section">
            <span class="s-label">Dot settings</span>
            <div class="s-row">
              <span class="s-row-lbl">Spacing</span>
              <input type="range" min="4" max="50" value="14" id="h-spacing"
                oninput="document.getElementById('h-sp').textContent=this.value+'px'; scheduleRender()">
              <span class="s-val" id="h-sp">14px</span>
              <button class="anim-stopwatch" data-slider="h-spacing" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Min size</span>
              <input type="range" min="0" max="20" value="0" step="0.5" id="h-min"
                oninput="document.getElementById('h-mn').textContent=this.value+'px'; scheduleRender()">
              <span class="s-val" id="h-mn">0px</span>
              <button class="anim-stopwatch" data-slider="h-min" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Max size</span>
              <input type="range" min="1" max="40" value="7" step="0.5" id="h-max"
                oninput="document.getElementById('h-mx').textContent=this.value+'px'; scheduleRender()">
              <span class="s-val" id="h-mx">7px</span>
              <button class="anim-stopwatch" data-slider="h-max" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Scatter</span>
              <input type="range" min="0" max="1" value="0" step="0.05" id="h-scatter"
                oninput="document.getElementById('h-sc').textContent=parseFloat(this.value).toFixed(2); scheduleRender()">
              <span class="s-val" id="h-sc">0.00</span>
              <button class="anim-stopwatch" data-slider="h-scatter" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Contrast</span>
              <input type="range" min="50" max="300" value="100" id="h-contrast"
                oninput="document.getElementById('h-co').textContent=this.value+'%'; scheduleRender()">
              <span class="s-val" id="h-co">100%</span>
              <button class="anim-stopwatch" data-slider="h-contrast" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Angle</span>
              <input type="range" min="0" max="90" value="0" id="h-angle"
                oninput="document.getElementById('h-an').textContent=this.value+'°'; setHalftoneAngle(parseInt(this.value))">
              <span class="s-val" id="h-an">0°</span>
            </div>
          </div>

          <div class="s-section">
            <span class="s-label">Shape</span>
            <div class="s-btns">
              <button class="s-btn active" id="hs-circle" onclick="setHalftoneShape('circle')">Circle</button>
              <button class="s-btn"        id="hs-square" onclick="setHalftoneShape('square')">Square</button>
              <button class="s-btn"        id="hs-cross"  onclick="setHalftoneShape('cross')">Cross</button>
            </div>
          </div>

          <div class="s-section">
            <span class="s-label">Colour</span>
            <div class="s-btns" style="margin-bottom:12px">
              <button class="s-btn active" id="hc-image"   onclick="setHalftoneColor('image')">Image</button>
              <button class="s-btn"        id="hc-duotone" onclick="setHalftoneColor('duotone')">Duotone</button>
              <button class="s-btn"        id="hc-single"  onclick="setHalftoneColor('single')">Single</button>
              <button class="s-btn"        id="hc-cmyk"    onclick="setHalftoneColor('cmyk')">CMYK</button>
            </div>
            <div id="h-col-a-row" class="s-color-row" style="display:none">
              <span class="s-color-lbl">Colour A</span>
              <input type="color" id="h-col-a" value="#e03d6a" oninput="scheduleRender()">
            </div>
            <div id="h-col-b-row" class="s-color-row" style="display:none">
              <span class="s-color-lbl">Colour B</span>
              <input type="color" id="h-col-b" value="#ff8844" oninput="scheduleRender()">
            </div>
            <div class="s-color-row">
              <span class="s-color-lbl">Background</span>
              <input type="color" id="h-bg" value="#f0eeeb" oninput="scheduleRender()">
            </div>
          </div>

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

        </div><!-- /#sidebar-halftone -->

        <!-- Ink detail controls -->
        <div class="ws-sidebar" id="sidebar-ink" style="display:none">

          <div class="s-section">
            <span class="s-label">Mode</span>
            <div class="s-btns">
              <button class="s-btn active" id="im-stipple" onclick="setInkMode('stipple')">Stipple</button>
              <button class="s-btn"        id="im-bleed"   onclick="setInkMode('bleed')">Bleed</button>
            </div>
          </div>

          <div class="s-section">
            <span class="s-label">Image</span>
            <div class="s-row">
              <span class="s-row-lbl">Threshold</span>
              <input type="range" min="1" max="255" value="140" id="i-threshold"
                oninput="document.getElementById('i-th').textContent=this.value; scheduleRender()">
              <span class="s-val" id="i-th">140</span>
              <button class="anim-stopwatch" data-slider="i-threshold" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Contrast</span>
              <input type="range" min="50" max="300" value="150" id="i-contrast"
                oninput="document.getElementById('i-co').textContent=this.value+'%'; scheduleRender()">
              <span class="s-val" id="i-co">150%</span>
              <button class="anim-stopwatch" data-slider="i-contrast" title="Animate">&#9201;</button>
            </div>
          </div>

          <div class="s-section" id="ink-stipple-section">
            <span class="s-label">Stipple</span>
            <div class="s-row">
              <span class="s-row-lbl">Spacing</span>
              <input type="range" min="2" max="20" value="5" id="i-spacing"
                oninput="document.getElementById('i-sp').textContent=this.value+'px'; scheduleRender()">
              <span class="s-val" id="i-sp">5px</span>
              <button class="anim-stopwatch" data-slider="i-spacing" title="Animate">&#9201;</button>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Min size</span>
              <input type="range" min="0" max="5" value="0.2" step="0.1" id="i-minr"
                oninput="document.getElementById('i-mn').textContent=parseFloat(this.value).toFixed(1)+'px'; scheduleRender()">
              <span class="s-val" id="i-mn">0.2px</span>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Max size</span>
              <input type="range" min="0.5" max="12" value="3.5" step="0.1" id="i-maxr"
                oninput="document.getElementById('i-mx').textContent=parseFloat(this.value).toFixed(1)+'px'; scheduleRender()">
              <span class="s-val" id="i-mx">3.5px</span>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Scatter</span>
              <input type="range" min="0" max="10" value="2" step="0.5" id="i-scatter"
                oninput="document.getElementById('i-sc').textContent=parseFloat(this.value).toFixed(1); scheduleRender()">
              <span class="s-val" id="i-sc">2.0</span>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Grain</span>
              <input type="range" min="0" max="100" value="20" id="i-sgrain"
                oninput="document.getElementById('i-sg').textContent=this.value+'%'; scheduleRender()">
              <span class="s-val" id="i-sg">20%</span>
            </div>
          </div>

          <div class="s-section" id="ink-bleed-section" style="display:none">
            <span class="s-label">Bleed</span>
            <div class="s-row">
              <span class="s-row-lbl">Amount</span>
              <input type="range" min="0" max="20" value="6" id="i-bleed"
                oninput="document.getElementById('i-bl').textContent=this.value; scheduleRender()">
              <span class="s-val" id="i-bl">6</span>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Spread</span>
              <input type="range" min="0" max="100" value="55" id="i-spread"
                oninput="document.getElementById('i-bsp').textContent=this.value+'%'; scheduleRender()">
              <span class="s-val" id="i-bsp">55%</span>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Grain</span>
              <input type="range" min="0" max="100" value="35" id="i-bgrain"
                oninput="document.getElementById('i-bg').textContent=this.value+'%'; scheduleRender()">
              <span class="s-val" id="i-bg">35%</span>
            </div>
            <div class="s-row">
              <span class="s-row-lbl">Spatter</span>
              <input type="range" min="0" max="60" value="12" id="i-spatter"
                oninput="document.getElementById('i-bst').textContent=this.value; scheduleRender()">
              <span class="s-val" id="i-bst">12</span>
            </div>
          </div>

          <div class="s-section">
            <span class="s-label">Colour</span>
            <div class="s-color-row">
              <span class="s-color-lbl">Ink</span>
              <input type="color" id="i-ink" value="#0a0a0a" oninput="scheduleRender()">
            </div>
            <div class="s-color-row">
              <span class="s-color-lbl">Paper</span>
              <input type="color" id="i-paper" value="#f5f4f0" oninput="scheduleRender()">
            </div>
          </div>

        </div><!-- /#sidebar-ink -->

      </div><!-- /.ws-advanced -->

      <!-- Export actions -->
      <div class="ws-panel-actions">
        <button class="ws-btn" id="export-btn" disabled onclick="exportImg()">&darr; Export PNG</button>
        <button class="ws-btn" id="export-gif-btn" disabled onclick="exportGif()">&darr; Export GIF</button>
      </div>

      <!-- Timeline -->
      <button class="ws-btn" id="anim-toggle" onclick="toggleAnimPanel()">&#9202; Timeline</button>

    </div><!-- /.ws-panel -->

    <!-- Canvas area — full viewport -->
    <main class="ws-canvas-area" id="canvas-area">
      <div class="drop-zone" id="drop-zone" onclick="triggerUpload()">
        <div class="dz-cross"></div>
        <div class="dz-text">Drop image here</div>
        <div class="dz-sub">or click to upload</div>
      </div>
      <canvas id="main-canvas"></canvas>
    </main>

  </div>

  <section id="anim-panel" class="anim-panel" style="display:none">
    <div class="anim-transport" id="anim-transport"></div>
    <div class="anim-tracks" id="anim-tracks"></div>
  </section>

</div>
```

- [ ] **Step 2: Verify TypeScript still compiles**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```

Expected: 0 errors (no TypeScript was changed yet).

- [ ] **Step 3: Commit**

```
git -C C:\Users\keana\Tools\Imprint add index.html
git -C C:\Users\keana\Tools\Imprint commit -m "feat(panel): restructure workspace HTML for floating panel"
```

---

### Task 2: Add floating panel CSS

**Files:**
- Modify: `src/styles/workspace.css`

Replace the sidebar layout rules and add panel, snap, macro, and advanced styles.

- [ ] **Step 1: Read `src/styles/workspace.css`**

Read the file to confirm current line numbers before editing.

- [ ] **Step 2: Remove sidebar layout rules**

Remove the `.ws-sidebar`, `.ws-sidebar.active`, and `.ws-sidebar::-webkit-scrollbar*` rules — the sidebar `<div>`s now live inside the panel and have their own display toggling via `style="display:none"` + JS.

Remove:
```css
.ws-sidebar {
  width: 400px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg);
  display: none;
  flex-direction: column;
}

.ws-sidebar.active { display: flex; }

.ws-sidebar::-webkit-scrollbar { width: 3px; }
.ws-sidebar::-webkit-scrollbar-track { background: transparent; }
.ws-sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
```

- [ ] **Step 3: Update `.ws-body` so the canvas fills the full space**

Find:
```css
/* Body layout */
.ws-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
```

Replace with:
```css
/* Body layout */
.ws-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  position: relative;
}
```

- [ ] **Step 4: Add floating panel styles**

After the `.ws-btn:disabled` rule, add:

```css
/* ── Floating panel ─────────────────────────────────────────────── */
.ws-panel {
  position: fixed;
  width: 340px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.10);
  z-index: 50;
  display: none;
  flex-direction: column;
  gap: 0;
}

.ws-panel.panel-visible { display: flex; }

.ws-panel::-webkit-scrollbar { width: 3px; }
.ws-panel::-webkit-scrollbar-track { background: transparent; }
.ws-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.ws-panel-handle {
  height: 28px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  border-radius: 8px 8px 0 0;
  cursor: grab;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ws-panel-handle::after {
  content: '';
  width: 32px;
  height: 3px;
  background: var(--border-hi);
  border-radius: 2px;
}

.ws-panel-handle:active { cursor: grabbing; }

/* Snap states */
.ws-panel.snap-left,
.ws-panel.snap-right {
  width: 400px;
  top: 80px;
  bottom: 0;
  max-height: none;
  border-radius: 0;
  overflow-y: auto;
}

.ws-panel.snap-left  { left: 0; right: auto; border-left: none; border-radius: 0 8px 8px 0; }
.ws-panel.snap-right { right: 0; left: auto; border-right: none; border-radius: 8px 0 0 8px; }

.ws-panel.snap-top,
.ws-panel.snap-bottom {
  width: 100%;
  left: 0;
  right: 0;
  max-height: 260px;
  border-radius: 0;
  overflow-y: auto;
}

.ws-panel.snap-top    { top: 80px; bottom: auto; border-top: none; }
.ws-panel.snap-bottom { bottom: 0; top: auto; border-bottom: none; }

/* Upload button */
.ws-panel-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: 'Lay Grotesk Trial', sans-serif;
  font-size: 16px;
  letter-spacing: 0.04em;
  padding: 16px 24px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.ws-panel-upload:hover { background: var(--surface); }

/* Preset row — spec 2 */
.preset-row {
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 0;
}

.preset-row:empty { display: none; }

/* Quick Adjust macro section */
.ws-macro-section {
  padding: 24px 24px 8px;
  border-bottom: 1px solid var(--border);
}

/* Advanced toggle */
.ws-advanced-toggle {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-family: 'Lay Grotesk Trial', sans-serif;
  font-size: 16px;
  letter-spacing: 0.04em;
  padding: 14px 24px;
  cursor: pointer;
  text-align: left;
  transition: color 0.12s, background 0.12s;
}

.ws-advanced-toggle:hover { color: var(--text); background: var(--surface); }
.ws-advanced-toggle.open  { color: var(--text); }

/* Advanced collapsible section */
.ws-advanced {
  display: none;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
}

.ws-advanced.expanded { display: flex; }

/* Sidebar content blocks inside advanced */
.ws-advanced .ws-sidebar {
  display: none;
  flex-direction: column;
}

.ws-advanced .ws-sidebar.active { display: flex; }

/* Export actions */
.ws-panel-actions {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
}

.ws-panel-actions .ws-btn { flex: 1; }

/* Timeline button inside panel */
#ws-panel #anim-toggle {
  width: 100%;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--border);
  text-align: left;
  padding: 14px 24px;
}
```

- [ ] **Step 5: Update `.ws-sidebar` class for use inside advanced**

The old `.ws-sidebar` CSS rules have been removed in Step 2. The `.ws-advanced .ws-sidebar` rules added in Step 4 handle display toggling. The `.s-section` padding (`48px 48px 48px`) remains. No further changes needed.

- [ ] **Step 6: Verify TypeScript compiles**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```
git -C C:\Users\keana\Tools\Imprint add src/styles/workspace.css
git -C C:\Users\keana\Tools\Imprint commit -m "feat(panel): floating panel, snap, macro, and advanced CSS"
```

---

### Task 3: Create `src/workspace/panel.ts` — drag, snap, and persistence

**Files:**
- Create: `src/workspace/panel.ts`

- [ ] **Step 1: Create the file**

Create `C:\Users\keana\Tools\Imprint\src\workspace\panel.ts` with:

```typescript
const SNAP_THRESHOLD = 60;
const STORAGE_KEY = 'imprint-panel-state';

interface PanelState {
  snap: 'left' | 'right' | 'top' | 'bottom' | null;
  x: number;
  y: number;
}

const SNAP_CLASSES = ['snap-left', 'snap-right', 'snap-top', 'snap-bottom'] as const;

function clearSnap(panel: HTMLElement): void {
  SNAP_CLASSES.forEach(c => panel.classList.remove(c));
  panel.style.left = '';
  panel.style.top  = '';
  panel.style.right  = '';
  panel.style.bottom = '';
}

function applySnap(panel: HTMLElement, snap: PanelState['snap']): void {
  clearSnap(panel);
  if (snap) panel.classList.add(`snap-${snap}`);
}

function applyFreePosition(panel: HTMLElement, x: number, y: number): void {
  clearSnap(panel);
  panel.style.left = `${x}px`;
  panel.style.top  = `${y}px`;
}

function saveState(state: PanelState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(): PanelState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PanelState) : null;
  } catch {
    return null;
  }
}

function detectSnap(x: number, y: number, panelW: number, panelH: number): PanelState['snap'] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (x < SNAP_THRESHOLD)             return 'left';
  if (x + panelW > vw - SNAP_THRESHOLD) return 'right';
  if (y < 80 + SNAP_THRESHOLD)        return 'top';
  if (y + panelH > vh - SNAP_THRESHOLD) return 'bottom';
  return null;
}

export function initPanel(): void {
  const panel  = document.getElementById('ws-panel')        as HTMLElement;
  const handle = document.getElementById('ws-panel-handle') as HTMLElement;

  // Restore saved state or default to center-bottom
  const saved = loadState();
  if (saved?.snap) {
    applySnap(panel, saved.snap);
  } else {
    const x = Math.round(window.innerWidth / 2 - 170);
    const y = Math.round(window.innerHeight - 400);
    applyFreePosition(panel, saved?.x ?? x, saved?.y ?? y);
  }

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop  = 0;

  handle.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    dragging  = true;
    handle.setPointerCapture(e.pointerId);
    clearSnap(panel);
    const rect = panel.getBoundingClientRect();
    originLeft = rect.left;
    originTop  = rect.top;
    startX = e.clientX;
    startY = e.clientY;
  });

  handle.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const nx = Math.max(0, originLeft + dx);
    const ny = Math.max(80, originTop  + dy);
    panel.style.left = `${nx}px`;
    panel.style.top  = `${ny}px`;
  });

  handle.addEventListener('pointerup', (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const rect  = panel.getBoundingClientRect();
    const snap  = detectSnap(rect.left, rect.top, rect.width, rect.height);
    if (snap) {
      applySnap(panel, snap);
      saveState({ snap, x: 0, y: 0 });
    } else {
      const x = parseFloat(panel.style.left);
      const y = parseFloat(panel.style.top);
      saveState({ snap: null, x, y });
    }
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```
git -C C:\Users\keana\Tools\Imprint add src/workspace/panel.ts
git -C C:\Users\keana\Tools\Imprint commit -m "feat(panel): drag, snap, and localStorage persistence"
```

---

### Task 4: Create `src/workspace/macros.ts` — macro event handlers

**Files:**
- Create: `src/workspace/macros.ts`

Macros write computed values to existing detail inputs and dispatch `input` events. The mapping from 0–100 to each parameter's range is linear: `value = min + (macro/100) * (max - min)`.

Default macro values are chosen to match each effect's default detail slider values:
- Corpus Scale 11 → c-size default 9px (≈ min 4 + 11/100 × 56 = 10.2, close enough)
- Corpus Intensity 20 → c-contrast default 100% (= 50 + 20/100 × 250 = 100 ✓)
- Corpus Coverage 51 → c-threshold default 128 (= 0 + 51/100 × 250 = 127.5 ✓)
- Halftone Density 65 → h-spacing default 14px (= 50 − 65/100 × 46 = 50−29.9 = 20.1; spacing is inverse: spacing = 50 − density/100 × 46)
- Halftone Intensity 20 → h-contrast default 100% (= 50 + 20/100 × 250 = 100 ✓)
- Ink Density 64 → i-spacing default 5px (= 20 − 64/100 × 18 = 20−11.5 = 8.5; close)
- Ink Intensity 40 → i-contrast default 150% (= 50 + 40/100 × 250 = 150 ✓)

- [ ] **Step 1: Create the file**

Create `C:\Users\keana\Tools\Imprint\src\workspace\macros.ts` with:

```typescript
import type { Effect } from '../types';

function setInput(id: string, value: number): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.value = String(value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function lerp(t: number, min: number, max: number): number {
  return Math.round((min + (t / 100) * (max - min)) * 10) / 10;
}

// ── Corpus macros ────────────────────────────────────────────────
function applyCorpusScale(v: number): void {
  // c-size: 4–60px
  setInput('c-size', lerp(v, 4, 60));
}

function applyCorpusIntensity(v: number): void {
  // c-contrast: 50–300%
  setInput('c-contrast', lerp(v, 50, 300));
}

function applyCorpusCoverage(v: number): void {
  // c-threshold: 0–250
  setInput('c-threshold', lerp(v, 0, 250));
}

// ── Halftone macros ──────────────────────────────────────────────
function applyHalftoneDensity(v: number): void {
  // h-spacing: 50px (sparse) at v=0, 4px (dense) at v=100 — inverse
  const spacing = Math.round(lerp(v, 50, 4));
  setInput('h-spacing', spacing);
  // h-min and h-max scale with spacing: min = spacing * 0, max = spacing * 0.5
  setInput('h-min', 0);
  setInput('h-max', Math.min(40, Math.round(spacing * 0.5)));
}

function applyHalftoneIntensity(v: number): void {
  // h-contrast: 50–300%
  setInput('h-contrast', lerp(v, 50, 300));
}

// ── Ink macros ───────────────────────────────────────────────────
function applyInkDensity(v: number): void {
  // i-spacing: 20px (sparse) at v=0, 2px (dense) at v=100 — inverse
  const spacing = Math.round(lerp(v, 20, 2));
  setInput('i-spacing', spacing);
  // i-minr and i-maxr scale proportionally
  setInput('i-minr', Math.min(5, Math.round(spacing * 0.04 * 10) / 10));
  setInput('i-maxr', Math.min(12, Math.round(spacing * 0.7 * 10) / 10));
}

function applyInkIntensity(v: number): void {
  // i-contrast: 50–300%
  setInput('i-contrast', lerp(v, 50, 300));
}

// ── Public API ───────────────────────────────────────────────────
export function onMacro(effect: Effect, macro: string, rawValue: string): void {
  const v = parseFloat(rawValue);

  // Update display span
  const spanId = `m-${effect[0]}-${macro}-v`;
  const span = document.getElementById(spanId);
  if (span) span.textContent = String(Math.round(v));

  if (effect === 'corpus') {
    if (macro === 'scale')     applyCorpusScale(v);
    if (macro === 'intensity') applyCorpusIntensity(v);
    if (macro === 'coverage')  applyCorpusCoverage(v);
  } else if (effect === 'halftone') {
    if (macro === 'density')   applyHalftoneDensity(v);
    if (macro === 'intensity') applyHalftoneIntensity(v);
  } else if (effect === 'ink') {
    if (macro === 'density')   applyInkDensity(v);
    if (macro === 'intensity') applyInkIntensity(v);
  }
}

export function showMacroSection(effect: Effect): void {
  (['corpus', 'halftone', 'ink'] as Effect[]).forEach(e => {
    const el = document.getElementById(`macro-${e}`);
    if (el) el.style.display = e === effect ? 'block' : 'none';
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```
git -C C:\Users\keana\Tools\Imprint add src/workspace/macros.ts
git -C C:\Users\keana\Tools\Imprint commit -m "feat(panel): macro control handlers for all three effects"
```

---

### Task 5: Wire everything in `src/workspace/index.ts` and `src/main.ts`

**Files:**
- Modify: `src/workspace/index.ts`
- Modify: `src/main.ts` (to import and expose new functions)

- [ ] **Step 1: Read `src/main.ts`**

Read `C:\Users\keana\Tools\Imprint\src/main.ts` to see what is currently imported and exposed on `window`.

- [ ] **Step 2: Update `src/workspace/index.ts`**

Add imports for `initPanel` and `showMacroSection` and update `enterEffect` and `initWorkspace`:

At the top of the file, add:
```typescript
import { initPanel } from './panel';
import { onMacro, showMacroSection } from './macros';
```

In `enterEffect`, after the badge and sidebar lines, add:
```typescript
  // Show correct macro section
  showMacroSection(effect);

  // Show the panel (first time)
  const panel = document.getElementById('ws-panel') as HTMLElement;
  panel.classList.add('panel-visible');

  // Update advanced sidebar visibility
  (['corpus', 'halftone', 'ink'] as Effect[]).forEach(e => {
    const sb = document.getElementById(`sidebar-${e}`) as HTMLElement;
    if (sb) sb.classList.toggle('active', e === effect);
  });
```

Remove the old sidebar toggle block (it's now replaced by the one above):
```typescript
  // DELETE THIS — the block that sets .active on ws-sidebar elements
  (['corpus', 'halftone', 'ink'] as Effect[]).forEach(e => {
    const sb = document.getElementById(`sidebar-${e}`) as HTMLElement;
    sb.classList.toggle('active', e === effect);
  });
```

In `initWorkspace`, add panel init:
```typescript
  initPanel();
```

- [ ] **Step 3: Expose `onMacro` and `toggleAdvanced` on `window`**

In `src/main.ts`, add these imports and window assignments alongside the existing ones:

```typescript
import { onMacro }         from './workspace/macros';
import { toggleAdvanced }  from './workspace/index';

// alongside existing window.* assignments:
(window as any).onMacro        = onMacro;
(window as any).toggleAdvanced = toggleAdvanced;
```

- [ ] **Step 4: Add `toggleAdvanced` to `src/workspace/index.ts`**

Add this function to `src/workspace/index.ts`:

```typescript
export function toggleAdvanced(): void {
  const adv    = document.getElementById('ws-advanced')        as HTMLElement;
  const toggle = document.getElementById('ws-advanced-toggle') as HTMLElement;
  const open   = adv.classList.toggle('expanded');
  toggle.textContent = open ? 'Advanced ∧' : 'Advanced ∨';
  toggle.classList.toggle('open', open);
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```
git -C C:\Users\keana\Tools\Imprint add src/workspace/index.ts src/main.ts
git -C C:\Users\keana\Tools\Imprint commit -m "feat(panel): wire panel init, macros, and advanced toggle"
```

---

### Task 6: Final verification

**Files:** none — verification only

- [ ] **Step 1: Full TypeScript check**

```
cd C:\Users\keana\Tools\Imprint && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Manual smoke test**

Start the dev server:
```
cd C:\Users\keana\Tools\Imprint && npm run dev
```

Open `http://localhost:5173`. Check:
- Landing page loads and labels scroll as before
- Clicking a label enters the workspace
- Floating panel appears at center-bottom of screen
- Panel handle is draggable — panel follows cursor
- Dropping panel near left/right/top/bottom edge snaps it
- Refreshing the page restores the panel's last position
- "Quick Adjust" sliders for the active effect are visible
- Moving a macro slider updates the corresponding detail slider in Advanced
- "Advanced ∨" button expands/collapses the detail controls
- Upload button in panel opens file picker
- Export PNG and Export GIF buttons are visible (disabled until image loaded)
- Timeline button opens animation panel

- [ ] **Step 3: Commit any QA fixes**

```
git -C C:\Users\keana\Tools\Imprint add -A
git -C C:\Users\keana\Tools\Imprint commit -m "fix(panel): QA fixes post-integration"
```
