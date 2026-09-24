import { geometry } from './sudoku.js';

// A puzzle being played: the givens are fixed, the player fills the other cells.
// Notes are candidate bitmasks per cell (bit v-1 for v), shown only in empty cells.
export class Board {
  constructor({ n, level, givens, solution, values = givens, notes = new Array(n * n).fill(0) }) {
    this.n = n;
    this.level = level;
    this.givens = givens.slice();
    this.solution = solution.slice();
    this.values = values.slice();
    this.notes = notes.slice();
    this.geometry = geometry(n);
  }

  isGiven(i) {
    return this.givens[i] !== 0;
  }

  // Returns whether the cell changed. Placing a value drops it from the peers' notes.
  set(i, v) {
    if (this.isGiven(i) || this.values[i] === v) return false;
    this.values[i] = v;
    if (v) {
      this.notes[i] = 0;
      for (const j of this.geometry.peers[i]) this.notes[j] &= ~(1 << (v - 1));
    }
    return true;
  }

  // Empties a filled cell, or else drops its notes.
  clear(i) {
    if (this.values[i]) return this.set(i, 0);
    if (!this.notes[i]) return false;
    this.notes[i] = 0;
    return true;
  }

  hasNote(i, v) {
    return (this.notes[i] & (1 << (v - 1))) !== 0;
  }

  toggleNote(i, v) {
    if (this.values[i]) return false;
    this.notes[i] ^= 1 << (v - 1);
    return true;
  }

  restart() {
    this.values = this.givens.slice();
    this.notes.fill(0);
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
    const { n, level, givens, solution, values, notes } = this;
    return { n, level, givens, solution, values, notes };
  }
}
