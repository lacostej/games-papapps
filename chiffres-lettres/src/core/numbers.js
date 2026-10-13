// "Le compte est bon": reach the target from six plates with + - × ÷, whole numbers only,
// each plate used at most once.
export const PLATES = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 25, 50, 75, 100];
export const OPS = ['+', '-', '×', '÷'];
// Draw settings per level. Kids: five cards from 1-10 and 25, targets 10-200 (see docs/numbers-stats.md).
export const LEVELS = {
  normal: {},
  kids: { pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25], count: 5, min: 10, max: 200 },
};

export function drawNumbers(random = Math.random, { pool: from = PLATES, count = 6, min = 100, max = 999 } = {}) {
  const pool = [...from];
  const plates = [];
  for (let i = 0; i < count; i++) plates.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return { plates, target: min + Math.floor(random() * (max - min + 1)) };
}

// The result of a op b, or null when the rules forbid it (negative, zero or fractional).
export function apply(a, op, b) {
  if (op === '+') return a + b;
  if (op === '×') return a * b;
  if (op === '-') return a > b ? a - b : null;
  if (op === '÷') return b > 0 && a % b === 0 ? a / b : null;
  return null;
}

// The closest reachable value to target, with the fewest steps: { value, steps: [{a, op, b, result}] }.
export function solve(plates, target) {
  let best = { value: plates.reduce((b, p) => (Math.abs(p - target) < Math.abs(b - target) ? p : b)), steps: [] };
  const better = (value, steps) => {
    const d = Math.abs(value - target);
    const bd = Math.abs(best.value - target);
    return d < bd || (d === bd && steps.length < best.steps.length);
  };
  // Fewest steps that reached each set of numbers; a set is explored again only if reached quicker.
  const seen = new Map();
  const search = (nums, steps) => {
    const key = [...nums].sort((x, y) => x - y).join(',');
    if (seen.get(key) <= steps.length) return;
    seen.set(key, steps.length);
    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length; j++) {
        if (i === j) continue;
        const [a, b] = [nums[i], nums[j]];
        for (const op of OPS) {
          // + and × commute, so try them once per pair; skip moves that change nothing.
          if ((op === '+' || op === '×') && i > j) continue;
          if ((op === '×' || op === '÷') && b === 1) continue;
          const result = apply(a, op, b);
          if (result === null || (op === '-' && result === b) || (op === '÷' && result === b)) continue;
          const next = [...steps, { a, op, b, result }];
          if (better(result, next)) best = { value: result, steps: next };
          if (result === target && next.length === 1) return;
          search([...nums.filter((_, k) => k !== i && k !== j), result], next);
        }
      }
    }
  };
  search(plates, []);
  return best;
}

// The player's working: numbers still available (plates and results) and the steps so far.
// Each number keeps its slot: a result takes the slot of its first number, the second's empties.
export class Calculation {
  constructor(plates) {
    this.plates = plates;
    this.reset();
  }

  reset() {
    this.slots = this.plates.map((value, id) => ({ id, value }));
    this.steps = [];
    this.nextId = this.plates.length;
  }

  get numbers() {
    return this.slots.filter(Boolean);
  }

  // Combines two available numbers by id; returns the new number, or null if not allowed.
  combine(aId, op, bId) {
    const aSlot = this.slots.findIndex((n) => n?.id === aId);
    const bSlot = this.slots.findIndex((n) => n?.id === bId);
    if (aSlot < 0 || bSlot < 0 || aSlot === bSlot) return null;
    const [a, b] = [this.slots[aSlot], this.slots[bSlot]];
    const result = apply(a.value, op, b.value);
    if (result === null) return null;
    const made = { id: this.nextId++, value: result };
    this.slots[aSlot] = made;
    this.slots[bSlot] = null;
    this.steps.push({ a, op, b, made, aSlot, bSlot });
    return made;
  }

  undo() {
    const step = this.steps.pop();
    if (!step) return;
    this.slots[step.aSlot] = step.a;
    this.slots[step.bSlot] = step.b;
  }

  // Saved as the moves by id; replaying them gives the same ids again.
  toJSON() {
    return { plates: this.plates, moves: this.steps.map(({ a, op, b }) => [a.id, op, b.id]) };
  }

  static from({ plates, moves }) {
    const calc = new Calculation(plates);
    for (const [a, op, b] of moves) if (!calc.combine(a, op, b)) throw new Error('Invalid saved move');
    return calc;
  }

  // What the player announces: the available number closest to the target.
  closest(target) {
    return this.numbers.reduce((best, n) => (Math.abs(n.value - target) < Math.abs(best.value - target) ? n : best)).value;
  }
}

export function numbersScore(value, target) {
  return Math.max(0, 10 - Math.abs(value - target));
}
