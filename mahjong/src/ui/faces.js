// Tile faces as SVG markup in a 60x80 box. Every tile carries a small corner index so it can
// be matched without reading Chinese.
const RED = '#c8302c';
const GREEN = '#1f7a45';
const BLUE = '#1f4e8c';
const INK = '#2b2622';

const DOT_LAYOUTS = [
  [[30, 40]],
  [[30, 24], [30, 56]],
  [[16, 18], [30, 40], [44, 62]],
  [[19, 24], [41, 24], [19, 56], [41, 56]],
  [[18, 20], [42, 20], [30, 40], [18, 60], [42, 60]],
  [[19, 18], [41, 18], [19, 40], [41, 40], [19, 62], [41, 62]],
  [[14, 13], [30, 21], [46, 29], [20, 50], [40, 50], [20, 67], [40, 67]],
  [[19, 13], [41, 13], [19, 31], [41, 31], [19, 49], [41, 49], [19, 67], [41, 67]],
  [[15, 16], [30, 16], [45, 16], [15, 40], [30, 40], [45, 40], [15, 64], [30, 64], [45, 64]],
];
const DOT_COLORS = [BLUE, GREEN, RED];

function dots(n) {
  const r = n === 1 ? 15 : n <= 4 ? 9 : n <= 6 ? 8 : 7;
  return DOT_LAYOUTS[n - 1]
    .map(([x, y], i) => {
      const c = n === 1 ? RED : DOT_COLORS[(i + n) % 3];
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${r * 0.25}" fill="${c}"/>`;
    })
    .join('');
}

// Bamboo sticks: columns of x positions per row.
const BAMBOO_LAYOUTS = [
  [[30]],
  [[30], [30]],
  [[30], [20, 40]],
  [[20, 40], [20, 40]],
  [[18, 42], [30], [18, 42]],
  [[16, 30, 44], [16, 30, 44]],
  [[30], [16, 30, 44], [16, 30, 44]],
  [[12, 24, 36, 48], [12, 24, 36, 48]],
  [[16, 30, 44], [16, 30, 44], [16, 30, 44]],
];

function bamboo(n) {
  const rows = BAMBOO_LAYOUTS[n - 1];
  const h = n === 1 ? 50 : rows.length === 2 ? 26 : 19;
  const w = n === 1 ? 10 : 6;
  const gap = (72 - rows.length * h) / (rows.length + 1);
  return rows
    .map((xs, r) => {
      const y = 4 + gap + r * (h + gap);
      return xs
        .map((x, i) => {
          const red = (n === 5 && r === 1) || (n === 9 && i === 1) || (n === 7 && r === 0);
          const c = red ? RED : GREEN;
          return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${c}"/><line x1="${x - w / 2}" x2="${x + w / 2}" y1="${y + h / 2}" y2="${y + h / 2}" stroke="#fff" stroke-width="1.2"/>`;
        })
        .join('');
    })
    .join('');
}

const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WINDS = ['東', '南', '西', '北'];

function glyph(text, y, size, color) {
  return `<text x="30" y="${y}" font-size="${size}" fill="${color}" text-anchor="middle" dominant-baseline="central" font-weight="700" font-family="'Noto Serif CJK SC','Songti SC','SimSun',serif">${text}</text>`;
}

function corner(text, color = INK) {
  return `<text x="5" y="11" font-size="11" font-weight="700" fill="${color}" font-family="system-ui,sans-serif">${text}</text>`;
}

// Flowers: five petals in the flower's colour.
function flower(color) {
  const petals = [0, 72, 144, 216, 288]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      return `<circle cx="${30 + 11 * Math.sin(rad)}" cy="${42 - 11 * Math.cos(rad)}" r="8" fill="${color}"/>`;
    })
    .join('');
  return `${petals}<circle cx="30" cy="42" r="5" fill="#f2c230"/>`;
}

const SEASON_ICONS = [
  // Spring: a sprout.
  `<path d="M30 64 V40" stroke="${GREEN}" stroke-width="3"/><path d="M30 46 C18 46 14 36 16 28 C26 28 31 36 30 46 Z" fill="#5bb04a"/><path d="M30 42 C40 42 46 34 44 24 C34 24 29 32 30 42 Z" fill="#7cc35f"/>`,
  // Summer: the sun.
  `<circle cx="30" cy="42" r="10" fill="#f0a020"/>${[0, 45, 90, 135, 180, 225, 270, 315]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      return `<line x1="${30 + 14 * Math.cos(rad)}" y1="${42 + 14 * Math.sin(rad)}" x2="${30 + 20 * Math.cos(rad)}" y2="${42 + 20 * Math.sin(rad)}" stroke="#f0a020" stroke-width="3" stroke-linecap="round"/>`;
    })
    .join('')}`,
  // Autumn: a leaf.
  `<path d="M30 22 C44 30 46 50 30 64 C14 50 16 30 30 22 Z" fill="#d2691e"/><path d="M30 26 V66" stroke="#8b3a0f" stroke-width="2"/>`,
  // Winter: a snowflake.
  `${[0, 60, 120]
    .map((a) => `<line x1="30" y1="22" x2="30" y2="62" stroke="#3b8fd0" stroke-width="3" stroke-linecap="round" transform="rotate(${a} 30 42)"/>`)
    .join('')}<circle cx="30" cy="42" r="4" fill="#3b8fd0"/>`,
];
const FLOWER_COLORS = ['#e05a8a', '#9b59b6', '#e67e22', '#27ae60'];

// `windLetters`: the corner letters for east, south, west, north in the interface language.
export function faceSvg(face, windLetters) {
  let body;
  let background = '';
  // Patterns are shrunk towards the bottom right, leaving the corner index clear.
  if (face < 9) body = `<g transform="translate(7 11) scale(0.82)">${dots(face + 1)}</g>` + corner(face + 1, BLUE);
  else if (face < 18) body = `<g transform="translate(7 11) scale(0.82)">${bamboo(face - 8)}</g>` + corner(face - 8, GREEN);
  else if (face < 27) body = glyph(NUMERALS[face - 18], 26, 26, INK) + glyph('萬', 58, 26, RED) + corner(face - 17, RED);
  else if (face < 31) body = glyph(WINDS[face - 27], 42, 38, INK) + corner(windLetters[face - 27]);
  else if (face === 31) body = glyph('中', 42, 42, RED);
  else if (face === 32) body = glyph('發', 42, 40, GREEN);
  else if (face === 33) body = `<rect x="12" y="14" width="36" height="52" rx="4" fill="none" stroke="${BLUE}" stroke-width="3"/><rect x="18" y="20" width="24" height="40" rx="2" fill="none" stroke="${BLUE}" stroke-width="1.5"/>`;
  else if (face < 38) {
    background = '#fbe3ec';
    body = flower(FLOWER_COLORS[face - 34]) + corner(face - 33, '#b0306a');
  } else {
    background = '#e1effa';
    body = SEASON_ICONS[face - 38] + corner(face - 37, '#1f5f99');
  }
  const bg = background ? `<rect width="60" height="80" rx="6" fill="${background}"/>` : '';
  return `<svg viewBox="0 0 60 80" aria-hidden="true">${bg}${body}</svg>`;
}
