// Kids' pool 1-10 plus every subset of 12, 15, 20, 25: how often the target is reachable, and in
// how few operations. Seeded per configuration.
// Usage: node tools/numbers-extras.mjs [draws per configuration=2000]
import { drawNumbers, solve } from '../src/core/numbers.js';
const N = Number(process.argv[2] ?? 2000);
const BASE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const EXTRAS = [12, 15, 20, 25];
const subsets = [];
for (let m = 0; m < 16; m++) subsets.push(EXTRAS.filter((_, i) => m & (1 << i)));
const pct = (n) => `${((100 * n) / N).toFixed(1)}%`;
console.log(['extras', 'cards', 'targets', 'exact', 'within 1', 'within 5', 'mean dist', '<=1 op', '<=2 ops', '<=3 ops', 'has an extra'].join('\t'));
for (const count of [5, 4]) for (const [min, max] of count === 5 ? [[10, 200], [50, 200]] : [[10, 100], [10, 50]]) for (const extras of subsets) {
  let seed = 20261013;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rows = [];
  for (let k = 0; k < N; k++) {
    const { plates, target } = drawNumbers(random, { pool: [...BASE, ...extras], count, min, max });
    const best = solve(plates, target);
    rows.push({ d: Math.abs(best.value - target), steps: best.steps.length, extra: plates.some((p) => p > 10) });
  }
  const ex = (s) => pct(rows.filter((r) => !r.d && r.steps <= s).length);
  console.log([extras.join(' ') || '(none)', count, `${min}-${max}`, pct(rows.filter((r) => !r.d).length), pct(rows.filter((r) => r.d <= 1).length), pct(rows.filter((r) => r.d <= 5).length),
    (rows.reduce((a, r) => a + r.d, 0) / N).toFixed(2), ex(1), ex(2), ex(3), pct(rows.filter((r) => r.extra).length)].join('\t'));
}
