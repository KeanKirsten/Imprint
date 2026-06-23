import { state } from '../state';
import { PRESETS, PRESET_LABELS, type EasePreset } from './easing';
import { disarmSlider } from './stopwatch';
import { play, pause } from './playback';
import { exportGif } from './export';
import type { Effect } from '../types';
import type { SliderAnim } from './types';

export function togglePanel(): void {
  state.animPanelOpen = !state.animPanelOpen;
  const panel = document.getElementById('anim-panel') as HTMLElement;
  panel.style.display = state.animPanelOpen ? 'flex' : 'none';
  document.getElementById('anim-toggle')?.classList.toggle('active', state.animPanelOpen);
  if (state.animPanelOpen) refreshEditor();
}

export function refreshEditor(): void {
  if (!state.animPanelOpen) return;
  const effect = state.currentEffect;
  renderTransport(effect);
  renderTracks(effect);
}

function renderTransport(effect: Effect | null): void {
  const el = document.getElementById('anim-transport') as HTMLElement;
  el.innerHTML = '';
  if (!effect) return;
  const anim = state.animations[effect];

  const playBtn = document.createElement('button');
  playBtn.className = 'anim-play';
  const setLabel = () => { playBtn.textContent = state.animPlaying ? '❚❚ Pause' : '▶ Play'; };
  setLabel();
  playBtn.addEventListener('click', () => {
    if (state.animPlaying) pause(); else play(effect);
    setLabel();
  });
  el.appendChild(playBtn);

  const durWrap = document.createElement('label');
  durWrap.className = 'anim-dur';
  durWrap.textContent = 'Duration ';
  const dur = document.createElement('input');
  dur.type = 'number'; dur.min = '0.2'; dur.step = '0.1';
  dur.value = (anim.durationMs / 1000).toFixed(1);
  dur.addEventListener('input', () => {
    const v = parseFloat(dur.value);
    if (v > 0) anim.durationMs = v * 1000;
  });
  durWrap.appendChild(dur);
  const unit = document.createElement('span'); unit.textContent = 's';
  durWrap.appendChild(unit);
  el.appendChild(durWrap);

  const fps = document.createElement('span');
  fps.className = 'anim-fps';
  fps.textContent = `${anim.fps}fps`;
  el.appendChild(fps);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'anim-export';
  exportBtn.textContent = '↓ Export GIF';
  exportBtn.addEventListener('click', async () => {
    if (anim.sliders.length === 0) return;
    const original = exportBtn.textContent;
    exportBtn.disabled = true;
    try {
      await exportGif(effect, (done, total) => {
        exportBtn.textContent = `Encoding ${done}/${total}`;
      });
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = original;
    }
  });
  el.appendChild(exportBtn);
}

function renderTracks(effect: Effect | null): void {
  const wrap = document.getElementById('anim-tracks') as HTMLElement;
  wrap.innerHTML = '';
  if (!effect) return;
  const anim = state.animations[effect];
  if (anim.sliders.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'anim-empty';
    empty.textContent = 'Click the ◷ icon next to any slider to animate it.';
    wrap.appendChild(empty);
    return;
  }
  for (const s of anim.sliders) wrap.appendChild(buildTrackRow(effect, s));
}

function buildTrackRow(effect: Effect, s: SliderAnim): HTMLElement {
  const row = document.createElement('div');
  row.className = 'anim-track';

  const head = document.createElement('div');
  head.className = 'anim-track-head';
  const name = document.createElement('span');
  name.className = 'anim-track-name';
  name.textContent = s.label;
  head.appendChild(name);
  const rm = document.createElement('button');
  rm.className = 'anim-track-rm';
  rm.textContent = '✕';
  rm.title = 'Remove';
  rm.addEventListener('click', () => disarmSlider(effect, s.sliderId));
  head.appendChild(rm);
  row.appendChild(head);

  const fields = document.createElement('div');
  fields.className = 'anim-track-fields';
  fields.appendChild(makeNumField('From', s.from, s.min, s.max, v => { s.from = v; }));
  fields.appendChild(makeNumField('To',   s.to,   s.min, s.max, v => { s.to   = v; }));
  row.appendChild(fields);

  row.appendChild(buildCurveEditor(s));
  return row;
}

function makeNumField(
  label: string, value: number, min: number, max: number, onChange: (v: number) => void
): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'anim-numfield';
  wrap.textContent = label + ' ';
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.value = String(value);
  inp.min = String(min);
  inp.max = String(max);
  inp.step = 'any';
  inp.addEventListener('input', () => {
    let v = parseFloat(inp.value);
    if (isNaN(v)) return;
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  });
  wrap.appendChild(inp);
  return wrap;
}

function buildCurveEditor(s: SliderAnim): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'anim-curve';

  const SIZE = 120;
  const PAD = 30;
  const span = SIZE - PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.className = 'anim-curve-canvas';
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const toPx = (x: number, y: number): [number, number] => [PAD + x * span, SIZE - PAD - y * span];
  const toCurve = (px: number, py: number): [number, number] => [(px - PAD) / span, (SIZE - PAD - py) / span];

  function draw(): void {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, span, span);

    const [c1x, c1y] = toPx(s.ease[0], s.ease[1]);
    const [c2x, c2y] = toPx(s.ease[2], s.ease[3]);
    const [p0x, p0y] = toPx(0, 0);
    const [p3x, p3y] = toPx(1, 1);

    ctx.strokeStyle = 'rgba(212,255,0,0.4)';
    ctx.beginPath(); ctx.moveTo(p0x, p0y); ctx.lineTo(c1x, c1y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p3x, p3y); ctx.lineTo(c2x, c2y); ctx.stroke();

    ctx.strokeStyle = '#d4ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p3x, p3y);
    ctx.stroke();

    ctx.fillStyle = '#d4ff00';
    for (const [hx, hy] of [[c1x, c1y], [c2x, c2y]] as [number, number][]) {
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  draw();

  let dragging: 0 | 1 | null = null;
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (SIZE / rect.width);
    const py = (e.clientY - rect.top) * (SIZE / rect.height);
    const [c1x, c1y] = toPx(s.ease[0], s.ease[1]);
    const [c2x, c2y] = toPx(s.ease[2], s.ease[3]);
    const d1 = Math.hypot(px - c1x, py - c1y);
    const d2 = Math.hypot(px - c2x, py - c2y);
    if (d1 < 12 || d2 < 12) {
      dragging = d1 <= d2 ? 0 : 1;
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (dragging === null) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (SIZE / rect.width);
    const py = (e.clientY - rect.top) * (SIZE / rect.height);
    let [cx, cy] = toCurve(px, py);
    cx = Math.max(0, Math.min(1, cx));        // x stays in [0,1]
    cy = Math.max(-0.5, Math.min(1.5, cy));   // y may overshoot
    if (dragging === 0) { s.ease[0] = cx; s.ease[1] = cy; }
    else { s.ease[2] = cx; s.ease[3] = cy; }
    draw();
  });
  const endDrag = () => { dragging = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const presets = document.createElement('div');
  presets.className = 'anim-presets';
  (Object.keys(PRESETS) as EasePreset[]).forEach(key => {
    const b = document.createElement('button');
    b.className = 'anim-preset';
    b.textContent = PRESET_LABELS[key];
    b.addEventListener('click', () => {
      s.ease = [...PRESETS[key]] as [number, number, number, number];
      draw();
    });
    presets.appendChild(b);
  });
  wrap.appendChild(presets);

  return wrap;
}
