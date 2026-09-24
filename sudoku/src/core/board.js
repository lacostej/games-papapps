import { geometry } from './sudoku.js';

// A puzzle being played: the givens are fixed, the player fills the other cells.
export class Board {
  constructor({ n, level, givens, solution, values = givens }) {
    this.n = n;
    this.level = level;
    this.givens = givens.slice();
    this.solution = solution.slice();
    this.values = values.slice();
    this.geometry = geometry(n);
  }

  isGiven(i) {
    return this.givens[i] !== 0;
  }

  // Returns whether the cell changed.
  set(i, v) {
    if (this.isGiven(i) || this.values[i] === v) return false;
    this.values[i] = v;
    return true;
  }

  clear(i) {
    return this.set(i, 0);
  }

  restart() {
    this.values = this.givens.slice();
  }

  // Cells whose value repeats in a row, column or box.
  conflicts() {
    const out = new Set();
    for (const unit of this.geometry.units) {
      const seen = new Map();
      for (const i of unit) {
        const v = this.values[i];
        if (!v) continue;
        if (seen.has(v)) out.add(i).add(seen.get(v));
        else seen.set(v, i);
      }
    }
    return out;
  }

  // How many times each value 1..n is placed, at index v.
  counts() {
    const counts = new Array(this.n + 1).fill(0);
    for (const v of this.values) counts[v]++;
    return counts;
  }

  get filled() {
    return !this.values.includes(0);
  }

  // A full grid without conflicts is the solution, since the solution is unique.
  get solved() {
    return this.filled && this.conflicts().size === 0;
  }

  toJSON() {
    const { n, level, givens, solution, values } = this;
    return { n, level, givens, solution, values };
  }
}
