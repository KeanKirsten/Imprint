import type { Effect } from '../types';

export interface AnimatableSlider {
  id: string;
  label: string;
  min: number;
  max: number;
}

// Discover every numeric range slider in the given effect's sidebar.
// Reads id, label (from the sibling .s-row-lbl), and min/max from the element.
export function getAnimatableSliders(effect: Effect): AnimatableSlider[] {
  const sidebar = document.getElementById(`sidebar-${effect}`);
  if (!sidebar) return [];
  const inputs = Array.from(
    sidebar.querySelectorAll('input[type="range"]')
  ) as HTMLInputElement[];

  return inputs
    .filter(input => input.id)
    .map(input => {
      const row = input.closest('.s-row');
      const lbl = row?.querySelector('.s-row-lbl');
      return {
        id: input.id,
        label: lbl?.textContent?.trim() || input.id,
        min: parseFloat(input.min) || 0,
        max: parseFloat(input.max) || 100,
      };
    });
}
