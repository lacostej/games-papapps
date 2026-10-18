// Drawing the cards, shared by the solo game and the multiplayer page.
import { features } from '../core/trio.js';

const SVG = 'http://www.w3.org/2000/svg';
// Shapes are drawn upright, centred on 0,0, 18 wide and 44 tall.
const SHAPES = [
  'M0 -22 L9 0 L0 22 L-9 0 Z',
  'M-3 -22 C7 -24 12 -15 7 -6 C3 1 9 6 8 13 C6 22 -4 24 -8 19 C-12 14 -6 8 -7 2 C-8 -5 -13 -10 -10 -16 C-8 -20 -6 -21 -3 -22 Z',
  'M-9 -13 A9 9 0 0 1 9 -13 L9 13 A9 9 0 0 1 -9 13 Z',
];

export function drawCard(c) {
  const [n, shape, shading, color] = features(c);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 64');
  svg.setAttribute('aria-hidden', 'true');
  const xs = [[50], [37, 63], [24, 50, 76]][n];
  for (const x of xs) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', SHAPES[shape]);
    path.setAttribute('transform', `translate(${x} 32)`);
    path.setAttribute('class', `shape c${color} s${shading}`);
    if (shading === 1) path.setAttribute('fill', `url(#stripes-${color})`);
    svg.append(path);
  }
  return svg;
}

// The stripe patterns the striped shading fills with, one per colour; once per page.
export function stripeDefs() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.innerHTML = `<defs>${[0, 1, 2].map((c) => `<pattern id="stripes-${c}" width="4" height="4" patternUnits="userSpaceOnUse"><path class="c${c}" d="M0 2H4" /></pattern>`).join('')}</defs>`;
  return svg;
}
