import { state } from '../state';

// Base positions for each card: [left%, top%]
export const CARD_BASES = [
  { left: 14, top: 16 },  // Corpus: upper-left
  { left: 66, top: 10 },  // Halftone: upper-right
  { left: 40, top: 62 },  // Ink: lower-centre
];

// Per-card animated and target offsets
const cardCx: number[] = [];
const cardCy: number[] = [];
const cardTx: number[] = [];
const cardTy: number[] = [];

let mouseX = window.innerWidth  / 2;
let mouseY = window.innerHeight / 2;

/**
 * Initialise landing parallax. Positions cards at their base coordinates,
 * attaches mouse and hover listeners, and starts the RAF loop.
 */
export function initLanding(): void {
  const scatterCards = Array.from(
    document.querySelectorAll<HTMLElement>('.effect-card')
  );

  scatterCards.forEach((card, i) => {
    const b = CARD_BASES[i];
    card.style.left = `${b.left}%`;
    card.style.top  = `${b.top}%`;
    card.style.transform = `translate(-50%,-50%) rotate(${card.dataset['rot'] ?? 0}deg)`;
    cardCx[i] = cardCy[i] = cardTx[i] = cardTy[i] = 0;
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Dim non-hovered cards when one is hovered
  scatterCards.forEach((card, i) => {
    card.addEventListener('mouseenter', () => {
      scatterCards.forEach((c, j) => {
        c.style.transition = 'border-color 0.3s, box-shadow 0.3s, opacity 0.3s';
        c.style.opacity = j === i ? '1' : '0.45';
      });
    });
    card.addEventListener('mouseleave', () => {
      scatterCards.forEach(c => {
        c.style.transition = 'border-color 0.3s, box-shadow 0.3s, opacity 0.3s';
        c.style.opacity = '1';
      });
    });
  });

  (function parallaxLoop(): void {
    if (state.landingActive) {
      const cx  = window.innerWidth  / 2;
      const cy  = window.innerHeight / 2;
      const ndx = (mouseX - cx) / cx;
      const ndy = (mouseY - cy) / cy;

      scatterCards.forEach((card, i) => {
        const depth = parseFloat(card.dataset['depth'] ?? '1');
        const rot   = parseFloat(card.dataset['rot']   ?? '0');

        cardTx[i] = ndx * 38 * depth;
        cardTy[i] = ndy * 28 * depth;

        // Lerp toward target
        cardCx[i] += (cardTx[i] - cardCx[i]) * 0.07;
        cardCy[i] += (cardTy[i] - cardCy[i]) * 0.07;

        // Subtle 3-D tilt toward cursor
        const tiltX = -ndy * 5 * depth;
        const tiltY =  ndx * 5 * depth;

        card.style.transform =
          `translate(calc(-50% + ${cardCx[i].toFixed(2)}px), calc(-50% + ${cardCy[i].toFixed(2)}px))` +
          ` rotate(${rot}deg) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
      });
    }

    requestAnimationFrame(parallaxLoop);
  })();
}
