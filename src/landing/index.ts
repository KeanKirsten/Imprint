import { enterEffect } from '../workspace/index';
import type { Effect } from '../types';

interface LabelDef { text: string; effect: Effect; tag: string; img: string; }

// Ordered cycle of labels → effects. Each repeats down the columns.
const LABELS: LabelDef[] = [
  { text: 'Bleed/Ink', effect: 'ink',      tag: 'INK',      img: '/previews/bleed.jpg' },
  { text: 'Halftone',  effect: 'halftone', tag: 'HALFTONE', img: '/previews/halftone.webp' },
  { text: 'Ascii',     effect: 'corpus',   tag: 'CORPUS',   img: '/previews/ascii.png' },
];

// Fallback colour per effect if a thumbnail is missing.
const ACCENT: Record<Effect, string> = {
  ink: '#62b0c8', halftone: '#e03d6a', corpus: '#c8a05a',
};

const GLOW_ACCENT: Record<Effect, string> = {
  ink:      'rgba(98,176,200,0.10)',
  halftone: 'rgba(224,61,106,0.10)',
  corpus:   'rgba(200,160,90,0.10)',
};

// Tunables
const ROW_H     = 45;   // label line height (px)
const COLS      = 1;
const SIGMA_PX  = 95;   // vertical reach of the attraction around the cursor (px)
const PULL      = 0.7;  // how far the nearest label reaches toward the cursor (0–1)
const STIFFNESS = 0.08; // spring pull toward target (lower = lazier, more "attraction")
const DAMPING   = 0.82; // velocity damping (higher = less bounce)

const MARQUEE_SPEED = 0.25;
const EMPHASIS      = 0.14;
const CYCLE_H       = LABELS.length * ROW_H;

interface LabelRec {
  el: HTMLElement;
  col: number;
  row: number;
  def: LabelDef;
  x: number;       // current spring offset
  v: number;       // spring velocity
  baseX: number;   // natural centre X (client coords, at rest)
  baseY: number;   // natural centre Y (client coords; unaffected by translateX)
  s: number;       // current scale, spring toward targetScale
}

let labels: LabelRec[] = [];
let landingEl: HTMLElement | null = null;
let scrollOffset = 0;
let hovered: { col: number; row: number } | null = null;
let pointerActive = false;
let pointerX = 0;
let pointerY = 0;
let activeCol = 0;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let loopStarted = false;

export function initLanding(): void {
  landingEl = document.getElementById('view-landing') as HTMLElement;
  landingEl.addEventListener('mousemove', (e: MouseEvent) => {
    landingEl!.style.setProperty('--mx', `${e.clientX}px`);
    landingEl!.style.setProperty('--my', `${e.clientY}px`);
  });

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
      const rec: LabelRec = { el, col, row, def, x: 0, v: 0, baseX: 0, baseY: 0, s: 1 };
      el.addEventListener('click', () => enterEffect(rec.def.effect));
      colEl.appendChild(el);
      labels.push(rec);
    }
    attachColumnHover(colEl, col, columnsEl);
    columnsEl.appendChild(colEl);
  }

  // Capture each label's natural centre once layout has settled.
  requestAnimationFrame(measureBases);
}

// Record the at-rest centre of every label (used as the spring's anchor).
function measureBases(): void {
  for (const l of labels) {
    const r = l.el.getBoundingClientRect();
    l.baseX = r.left + r.width / 2 - l.x; // subtract current offset to get the true base
    l.baseY = r.top + r.height / 2;
  }
}

// Detect the hovered label by vertical position within the column, not by the
// labels' own hit-boxes — those slide sideways on hover, which would otherwise
// cause enter/leave churn and jittery motion. Y is unaffected by translateX.
function attachColumnHover(colEl: HTMLElement, col: number, columnsEl: HTMLElement): void {
  colEl.addEventListener('mousemove', (e: MouseEvent) => {
    // Continuous pointer position drives the magnetic pull in the spring loop.
    pointerActive = true;
    activeCol = col;
    pointerX = e.clientX;
    pointerY = e.clientY;

    // Update the preview card / active label by the nearest row.
    const rect = colEl.getBoundingClientRect();
    const row  = Math.floor((e.clientY - rect.top) / ROW_H);
    const rec  = labels.find(l => l.col === col && l.row === row);
    if (!rec) return;
    columnsEl.classList.add('hovering');
    if (hovered && hovered.col === col && hovered.row === row) return;
    hovered = { col, row };
    for (const l of labels) l.el.classList.toggle('active', l === rec);
    showCard(rec);
    landingEl?.style.setProperty('--glow-tint', GLOW_ACCENT[rec.def.effect]);
  });
  colEl.addEventListener('mouseleave', () => {
    pointerActive = false;
    hovered = null;
    columnsEl.classList.remove('hovering');
    for (const l of labels) l.el.classList.remove('active');
    hideCard();
    landingEl?.style.setProperty('--glow-tint', 'rgba(255,255,255,0.5)');
  });
}

function springLoop(): void {
  for (const l of labels) {
    let target = 0;
    if (pointerActive && l.col === activeCol) {
      // Vertical nearness to the cursor → how strongly this label reaches.
      const dy = pointerY - l.baseY;
      const falloff = Math.exp(-(dy * dy) / (2 * SIGMA_PX * SIGMA_PX));
      // Pull horizontally toward the cursor's X, scaled by nearness.
      target = (pointerX - l.baseX) * falloff * PULL;
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

  // Anchor horizontally to the stable column edge and vertically to the label's
  // unmoving Y, so the card doesn't drift as the label springs sideways.
  const colRect   = (rec.el.parentElement as HTMLElement).getBoundingClientRect();
  const labelRect = rec.el.getBoundingClientRect();
  const cardW = 168;
  const cardH = 168 + 44;
  let left = rec.col === 0 ? colRect.right + 16 : colRect.left - cardW - 16;
  let top  = labelRect.top + labelRect.height / 2 - cardH / 2;
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
