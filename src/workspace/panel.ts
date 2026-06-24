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
  if (x < SNAP_THRESHOLD)               return 'left';
  if (x + panelW > vw - SNAP_THRESHOLD) return 'right';
  if (y < 80 + SNAP_THRESHOLD)          return 'top';
  if (y + panelH > vh - SNAP_THRESHOLD) return 'bottom';
  return null;
}

export function initPanel(): void {
  const panel  = document.getElementById('ws-panel')        as HTMLElement;
  const handle = document.getElementById('ws-panel-handle') as HTMLElement;

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
    dragging = true;
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

  handle.addEventListener('pointerup', (_e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const rect = panel.getBoundingClientRect();
    const snap = detectSnap(rect.left, rect.top, rect.width, rect.height);
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
