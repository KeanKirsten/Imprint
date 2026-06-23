import type { Effect } from '../types';

// One animated slider: drives `sliderId` from `from` to `to`, eased by a cubic bezier.
export interface SliderAnim {
  sliderId: string;                         // existing DOM id, e.g. 'h-spacing'
  label: string;                            // display label from the sidebar row
  min: number;                              // slider min (from element)
  max: number;                              // slider max (from element)
  from: number;
  to: number;
  ease: [number, number, number, number];  // cubic-bezier control points x1,y1,x2,y2
}

// Per-effect animation: armed sliders + shared timing.
export interface EffectAnimation {
  durationMs: number;   // full A->B->A loop length; default 3000
  fps: number;          // default 30
  sliders: SliderAnim[];
}

// Convenience alias for the per-effect map.
export type AnimationMap = Record<Effect, EffectAnimation>;
