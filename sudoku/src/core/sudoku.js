// Grids are flat arrays of n*n values, row by row: 0 for an empty cell, 1..n for a symbol.
// Candidates are bitmasks: bit v-1 set means v is still possible.

export const BOXES = { 4: { rows: 2, cols: 2 }, 6: { rows: 2, cols: 3 }, 9: { rows: 3, cols: 3 } };

const geometries = new Map();

export function geometry(n) {
  if (geometries.has(n)) return geometries.get(n);
  const box = BOXES[n];
  if (!box) throw new Error(`Unsupported size ${n}`);
  const range = (k) => [...Array(k).keys()];
  const across = n / box.cols;
  const rowOf = range(n * n).map((i) => Math.floor(i / n));
  const colOf = range(n * n).map((i) => i % n);
  const boxOf = range(n * n).map((i) => Math.floor(rowOf[i] / box.rows) * across + Math.floor(colOf[i] / box.cols));
  const rows = range(n).map((r) => range(n).map((c) => r * n + c));
  const cols = range(n).map((c) => range(n).map((r) => r * n + c));
  const boxes = range(n).map((b) => range(n * n).filter((i) => boxOf[i] === b));
  const units = [...rows, ...cols, ...boxes];
  const peers = range(n * n).map((i) =>
    range(n * n).filter((j) => j !== i && (rowOf[j] === rowOf[i] || colOf[j] === colOf[i] || boxOf[j] === boxOf[i])),
  );
  const g = { n, box, full: (1 << n) - 1, rowOf, colOf, boxOf, rows, cols, boxes, units, peers };
  geometries.set(n, g);
  return g;
}

const bitCount = (m) => {
  let c = 0;
  for (; m; m &= m - 1) c++;
  return c;
};
const bitValue = (m) => 31 - Math.clz32(m) + 1;

// Backtracking search, fewest candidates first. Stops after `limit` solutions and returns
// how many it found; `random` shuffles the order values are tried in.
export function solve(grid, n, { limit = 1, random, onSolution } = {}) {
  const g = geometry(n);
  const cells = grid.slice();
  const rowUsed = new Array(n).fill(0);
  const colUsed = new Array(n).fill(0);
  const boxUsed = new Array(n).fill(0);
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i]) continue;
    const bit = 1 << (cells[i] - 1);
    if ((rowUsed[g.rowOf[i]] | colUsed[g.colOf[i]] | boxUsed[g.boxOf[i]]) & bit) return 0;
    rowUsed[g.rowOf[i]] |= bit;
    colUsed[g.colOf[i]] |= bit;
    boxUsed[g.boxOf[i]] |= bit;
  }
  let count = 0;
  const search = () => {
    let best = -1;
    let bestMask = 0;
    let fewest = n + 1;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue;
      const mask = g.full & ~(rowUsed[g.rowOf[i]] | colUsed[g.colOf[i]] | boxUsed[g.boxOf[i]]);
      const k = bitCount(mask);
      if (k < fewest) [best, bestMask, fewest] = [i, mask, k];
      if (k === 0) return false;
    }
    if (best === -1) {
      count++;
      onSolution?.(cells.slice());
      return count >= limit;
    }
    const values = [];
    for (let m = bestMask; m; m &= m - 1) values.push(bitValue(m & -m));
    if (random) shuffleInPlace(values, random);
    const [r, c, b] = [g.rowOf[best], g.colOf[best], g.boxOf[best]];
    for (const v of values) {
      const bit = 1 << (v - 1);
      cells[best] = v;
      rowUsed[r] |= bit;
      colUsed[c] |= bit;
      boxUsed[b] |= bit;
      if (search()) return true;
      rowUsed[r] &= ~bit;
      colUsed[c] &= ~bit;
      boxUsed[b] &= ~bit;
    }
    cells[best] = 0;
    return false;
  };
  search();
  return count;
}

export const TECHNIQUES = { singles: 1, intermediate: 2, advanced: 3 };

// Hardest step a person needs, solving by logic alone:
// 1: naked and hidden singles; 2: also locked candidates and naked pairs;
// 3: anything beyond (X-wings, chains, trial and error).
export function grade(grid, n) {
  return solveLogically(grid, n).level;
}

// Returns { level, values }: the grid as far as logic got, and the hardest step it took.
export function solveLogically(grid, n) {
  const g = geometry(n);
  const values = grid.slice();
  const cand = values.map(() => g.full);
  const place = (i, v) => {
    values[i] = v;
    cand[i] = 0;
    for (const j of g.peers[i]) cand[j] &= ~(1 << (v - 1));
  };
  values.forEach((v, i) => v && place(i, v));
  let level = TECHNIQUES.singles;
  for (;;) {
    if (!values.includes(0)) return { level, values };
    if (singles(g, values, cand, place)) continue;
    if (lockedCandidates(g, cand) || nakedPairs(g, cand)) {
      level = TECHNIQUES.intermediate;
      continue;
    }
    return { level: TECHNIQUES.advanced, values };
  }
}

function singles(g, values, cand, place) {
  let progress = false;
  for (let i = 0; i < values.length; i++) {
    if (!values[i] && bitCount(cand[i]) === 1) {
      place(i, bitValue(cand[i]));
      progress = true;
    }
  }
  for (const unit of g.units) {
    for (let v = 1; v <= g.n; v++) {
      const bit = 1 << (v - 1);
      let only = -1;
      let seen = 0;
      for (const i of unit) {
        if (values[i] === v) seen = 2;
        else if (cand[i] & bit) [only, seen] = [i, seen + 1];
        if (seen > 1) break;
      }
      if (seen === 1) {
        place(only, v);
        progress = true;
      }
    }
  }
  return progress;
}

// A value confined to one line within a box leaves the rest of that line, and vice versa.
function lockedCandidates(g, cand) {
  let progress = false;
  const pairs = [
    ...g.boxes.flatMap((box) => [[box, g.rowOf, g.rows], [box, g.colOf, g.cols]]),
    ...g.rows.map((row) => [row, g.boxOf, g.boxes]),
    ...g.cols.map((col) => [col, g.boxOf, g.boxes]),
  ];
  for (const [unit, keyOf, targets] of pairs) {
    for (let bit = 1; bit <= g.full; bit <<= 1) {
      const holders = unit.filter((i) => cand[i] & bit);
      if (holders.length === 0) continue;
      const key = keyOf[holders[0]];
      if (!holders.every((i) => keyOf[i] === key)) continue;
      for (const j of targets[key]) {
        if (!unit.includes(j) && cand[j] & bit) {
          cand[j] &= ~bit;
          progress = true;
        }
      }
    }
  }
  return progress;
}

function nakedPairs(g, cand) {
  let progress = false;
  for (const unit of g.units) {
    const twos = unit.filter((i) => bitCount(cand[i]) === 2);
    for (let a = 0; a < twos.length; a++) {
      for (let b = a + 1; b < twos.length; b++) {
        const mask = cand[twos[a]];
        if (cand[twos[b]] !== mask) continue;
        for (const j of unit) {
          if (j !== twos[a] && j !== twos[b] && cand[j] & mask) {
            cand[j] &= ~mask;
            progress = true;
          }
        }
      }
    }
  }
  return progress;
}

// `keep` stops removing clues at that share of the cells; `max` caps the technique needed;
// `need` is the technique the finished puzzle must require.
export const LEVELS = {
  easy: { keep: 0.5, max: TECHNIQUES.singles },
  medium: { max: TECHNIQUES.singles },
  hard: { max: TECHNIQUES.intermediate, need: TECHNIQUES.intermediate },
  expert: { max: TECHNIQUES.advanced, need: TECHNIQUES.advanced },
};

// 4x4 grids never need more than singles.
export const LEVELS_BY_SIZE = { 4: ['easy', 'medium'], 6: Object.keys(LEVELS), 9: Object.keys(LEVELS) };

// Returns { n, level, givens, solution }, or null if `attempts` grids all came out too easy.
// 6x6 hard is the rarest: up to ~2000 attempts, ~200 ms.
export function generate(n, level, { random = Math.random, attempts = 3000 } = {}) {
  const plan = LEVELS[level];
  if (!plan) throw new Error(`Unknown level ${level}`);
  for (let a = 0; a < attempts; a++) {
    let solution;
    solve(new Array(n * n).fill(0), n, { random, onSolution: (s) => (solution = s) });
    const givens = dig(solution, n, plan, random);
    if (!plan.need || grade(givens, n) >= plan.need) return { n, level, givens, solution };
  }
  return null;
}

// Empties cells in random order, keeping each removal only if the solution stays unique
// and within the technique cap.
function dig(solution, n, { keep = 0, max }, random) {
  const givens = solution.slice();
  const floor = Math.round(keep * n * n);
  let clues = n * n;
  for (const i of shuffleInPlace([...givens.keys()], random)) {
    if (clues <= floor) break;
    givens[i] = 0;
    if (solve(givens, n, { limit: 2 }) === 1 && grade(givens, n) <= max) clues--;
    else givens[i] = solution[i];
  }
  return givens;
}

function shuffleInPlace(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Small deterministic generator for tests.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
