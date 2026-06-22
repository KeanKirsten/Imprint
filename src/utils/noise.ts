/**
 * Deterministic pseudo-random noise based on a 3-component hash.
 * Returns a value in the range [0, 1).
 */
export function hashNoise(x: number, y: number, s: number): number {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7 + s * 74.3) * 43758.5453) % 1;
}
