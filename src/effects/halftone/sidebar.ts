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

export function setHalftoneAngle(deg: number): void {
  state.halftoneAngle = deg;
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

export function onHalftoneCanvasClick(e: MouseEvent): void {
  if (!state.halftoneInfluencePlacing) return;
  const rect   = mainCanvas.getBoundingClientRect();
  const scaleX = mainCanvas.width  / rect.width;
  const scaleY = mainCanvas.height / rect.height;
  state.halftoneInfluencePoints.push({
    x:  (e.clientX - rect.left) * scaleX,
    y:  (e.clientY - rect.top)  * scaleY,
    id: state.halftoneInfluenceNextId++,
  });
  scheduleRender();
}
