import { shuffle } from './puzzle.js';

// Lays out a subset of a puzzle's words as a crossword: every word crosses another, and
// no two words touch except where they cross, so the grid spells nothing unintended.
// Returns { width, height, entries: [{ word, cells: [[row, col], …] }], letters: Map }.
export function buildCrossword(words, { tiles, maxWords = 12, maxWidth = 10, maxHeight = 8, attempts = 40, rng = Math.random } = {}) {
  const split = splitter(tiles);
  const longest = Math.max(...words.map((w) => split(w).length));
  let best;
  for (let i = 0; i < attempts; i++) {
    // Longest words first, so short ones fill in around them; shuffle within a length.
    const order = shuffle(words, rng).sort((a, b) => split(b).length - split(a).length);
    const layout = place(order.filter((w) => split(w).length <= Math.max(maxWidth, maxHeight)), split, { maxWords, maxWidth, maxHeight, longest });
    if (layout && (!best || score(layout) > score(best))) best = layout;
  }
  return best && finish(best);
}

function score(layout) {
  // More words, then more crossings, then a tighter box.
  return layout.entries.length * 1000 + layout.crossings * 10 - (layout.box.width + layout.box.height);
}

function place(order, split, { maxWords, maxWidth, maxHeight, longest }) {
  const cells = new Map(); // "r,c" -> { letter, across, down }
  const entries = [];
  const box = { top: Infinity, left: Infinity, bottom: -Infinity, right: -Infinity };
  let crossings = 0;

  const put = (tiles, row, col, dir, word) => {
    const [dr, dc] = dir === 'across' ? [0, 1] : [1, 0];
    const at = tiles.map((_, k) => [row + dr * k, col + dc * k]);
    for (const [k, [r, c]] of at.entries()) {
      const cell = cells.get(`${r},${c}`) ?? { letter: tiles[k] };
      cell[dir] = true;
      cells.set(`${r},${c}`, cell);
    }
    entries.push({ word, dir, cells: at });
    extend(box, at);
  };

  const first = order.find((w) => split(w).length === longest);
  if (!first || split(first).length > Math.max(maxWidth, maxHeight)) return null;
  put(split(first), 0, 0, split(first).length <= maxWidth ? 'across' : 'down', first);

  for (const word of order) {
    if (entries.length >= maxWords) break;
    if (word === first) continue;
    const tiles = split(word);
    let pick;
    for (const [key, cell] of cells) {
      const [r0, c0] = key.split(',').map(Number);
      for (const dir of ['across', 'down']) {
        if (cell[dir]) continue;
        for (let k = 0; k < tiles.length; k++) {
          if (tiles[k] !== cell.letter) continue;
          const [row, col] = dir === 'across' ? [r0, c0 - k] : [r0 - k, c0];
          const fit = fits(cells, tiles, row, col, dir, box, maxWidth, maxHeight);
          if (fit !== null && (!pick || fit > pick.crosses)) pick = { row, col, dir, crosses: fit };
        }
      }
    }
    if (pick) {
      put(tiles, pick.row, pick.col, pick.dir, word);
      crossings += pick.crosses;
    }
  }
  return { entries, cells, box, crossings };
}

// Number of crossings if the word can go there, else null.
function fits(cells, tiles, row, col, dir, box, maxWidth, maxHeight) {
  const [dr, dc] = dir === 'across' ? [0, 1] : [1, 0];
  const at = (k) => cells.get(`${row + dr * k},${col + dc * k}`);
  if (at(-1) || at(tiles.length)) return null;
  let crosses = 0;
  for (let k = 0; k < tiles.length; k++) {
    const r = row + dr * k;
    const c = col + dc * k;
    const cell = at(k);
    if (cell) {
      if (cell.letter !== tiles[k] || cell[dir]) return null;
      crosses += 1;
    } else if (cells.get(`${r + dc},${c + dr}`) || cells.get(`${r - dc},${c - dr}`)) {
      return null; // would sit alongside a parallel word
    }
  }
  if (crosses === 0 || crosses === tiles.length) return null;
  const top = Math.min(box.top, row);
  const left = Math.min(box.left, col);
  const bottom = Math.max(box.bottom, row + dr * (tiles.length - 1));
  const right = Math.max(box.right, col + dc * (tiles.length - 1));
  if (right - left + 1 > maxWidth || bottom - top + 1 > maxHeight) return null;
  return crosses;
}

function extend(box, at) {
  for (const [r, c] of at) {
    box.top = Math.min(box.top, r);
    box.left = Math.min(box.left, c);
    box.bottom = Math.max(box.bottom, r);
    box.right = Math.max(box.right, c);
  }
  box.width = box.right - box.left + 1;
  box.height = box.bottom - box.top + 1;
}

// Shift to a zero origin and drop the placement bookkeeping.
function finish({ entries, cells, box }) {
  const letters = new Map();
  for (const [key, { letter }] of cells) {
    const [r, c] = key.split(',').map(Number);
    letters.set(`${r - box.top},${c - box.left}`, letter);
  }
  return {
    width: box.width,
    height: box.height,
    letters,
    entries: entries.map(({ word, dir, cells: at }) => ({ word, dir, cells: at.map(([r, c]) => [r - box.top, c - box.left]) })),
  };
}

// Splits a word into tiles, longest tile first, so digraph tiles land in one cell.
function splitter(tiles = []) {
  const multi = [...new Set(tiles.filter((t) => t.length > 1))].sort((a, b) => b.length - a.length);
  return (word) => {
    const out = [];
    for (let i = 0; i < word.length; ) {
      const tile = multi.find((t) => word.startsWith(t, i)) ?? word[i];
      out.push(tile);
      i += tile.length;
    }
    return out;
  };
}
