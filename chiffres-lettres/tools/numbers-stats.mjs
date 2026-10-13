// Simulates numbers-round draws with the game's own draw and solver, and prints how far the
// closest reachable number lands from the target. Seeded, so the same count gives the same draws.
// Usage: node tools/numbers-stats.mjs [draws=10000]
import { drawNumbers, solve } from '../src/core/numbers.js';

const N = Number(process.argv[2] ?? 10000);
let seed = 20261013;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const rows = [];
for (let k = 0; k < N; k++) {
  const { plates, target } = drawNumbers(random);
  const best = solve(plates, target);
  rows.push({ plates, target, best: best.value, distance: Math.abs(best.value - target), steps: best.steps.length, bigs: plates.filter((p) => p >= 25).length });
}

const pct = (n, d = N) => `${((100 * n) / d).toFixed(1)}%`;
const mean = (g) => (g.reduce((a, r) => a + r.distance, 0) / g.length).toFixed(2);
const sorted = rows.map((r) => r.distance).sort((a, b) => a - b);
const at = (p) => sorted[Math.floor(p * (N - 1))];

console.log(`${N} draws: ${pct(rows.filter((r) => !r.distance).length)} exact, mean distance ${mean(rows)}`);
console.log(`median ${at(0.5)}, p95 ${at(0.95)}, p99 ${at(0.99)}, max ${sorted.at(-1)}`);
for (const d of [0, 1, 2, 3, 5, 9]) console.log(`within ${d}: ${pct(rows.filter((r) => r.distance <= d).length)}`);
console.log(`perfect player's mean points: ${(rows.reduce((a, r) => a + Math.max(0, 10 - r.distance), 0) / N).toFixed(2)}`);
for (let b = 0; b <= 4; b++) {
  const g = rows.filter((r) => r.bigs === b);
  if (g.length) console.log(`${b} big plates: ${pct(g.length)} of draws, ${pct(g.filter((r) => !r.distance).length, g.length)} exact, mean ${mean(g)}`);
}
for (const [lo, hi] of [[100, 299], [300, 499], [500, 699], [700, 899], [900, 999]]) {
  const g = rows.filter((r) => r.target >= lo && r.target <= hi);
  console.log(`target ${lo}-${hi}: ${pct(g.filter((r) => !r.distance).length, g.length)} exact, mean ${mean(g)}`);
}
for (let s = 0; s <= 5; s++) console.log(`exact in ${s} operations or fewer: ${pct(rows.filter((r) => !r.distance && r.steps <= s).length)}`);
