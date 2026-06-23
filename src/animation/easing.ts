// Cubic-bezier easing matching CSS cubic-bezier(p1x,p1y,p2x,p2y), with P0=(0,0), P3=(1,1).
// Returns a function mapping input t in [0,1] to eased output (may exceed [0,1] for overshoot).
export function cubicBezier(
  p1x: number, p1y: number, p2x: number, p2y: number
): (t: number) => number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x: number): number => {
    // Newton-Raphson
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Bisection fallback
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) break;
      if (err < 0) lo = t; else hi = t;
      const next = (lo + hi) / 2;
      if (next === t) break;
      t = next;
    }
    return t;
  };

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solveT(t));
  };
}

export type EasePreset = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export const PRESETS: Record<EasePreset, [number, number, number, number]> = {
  linear:    [0,    0, 1,    1],
  easeIn:    [0.42, 0, 1,    1],
  easeOut:   [0,    0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

export const PRESET_LABELS: Record<EasePreset, string> = {
  linear:    'Linear',
  easeIn:    'In',
  easeOut:   'Out',
  easeInOut: 'In-Out',
};
