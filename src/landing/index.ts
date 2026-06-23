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
      const dir = 1; // both columns push the same way (to the right); use -1 for left
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
