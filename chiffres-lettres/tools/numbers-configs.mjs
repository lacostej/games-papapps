// Compares candidate numbers-round configurations (plates, how many are drawn, target range) by
// how often the target is reachable and in how few operations. Seeded per configuration.
// Usage: node tools/numbers-configs.mjs [draws per configuration=2000]
import { drawNumbers, PLATES, solve } from '../src/core/numbers.js';

const N = Number(process.argv[2] ?? 2000);
const SMALL = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
const POOLS = {
  'current (1-10 x2, 25 50 75 100)': PLATES,
  '1-10 x2': SMALL,
  '1-10 x2, 25': [...SMALL, 25],
  '1-10 x2, 15 20 25': [...SMALL, 15, 20, 25],
  '1-10 once': SMALL.filter((_, i) => i % 2 === 0),
};
const CONFIGS = [{ pool: 'current (1-10 x2, 25 50 75 100)', count: 6, min: 100, max: 999 }];
for (const pool of Object.keys(POOLS).slice(1))
  for (const count of [4, 5])
    for (const [min, max] of [[10, 100], [20, 100], [10, 200], [50, 200], [100, 200]]) CONFIGS.push({ pool, count, min, max });

const pct = (n) => `${((100 * n) / N).toFixed(1)}%`;
const header = ['plates', 'cards', 'target', 'exact', 'within 1', 'within 5', 'mean dist', 'p99 dist', 'exact in <=1 op', '<=2 ops', '<=3 ops'];
console.log(header.join('\t'));
for (const { pool, count, min, max } of CONFIGS) {
  let seed = 20261013;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rows = [];
  for (let k = 0; k < N; k++) {
    const { plates, target } = drawNumbers(random, { pool: POOLS[pool], count, min, max });
    const best = solve(plates, target);
    rows.push({ distance: Math.abs(best.value - target), steps: best.steps.length });
  }
  const sorted = rows.map((r) => r.distance).sort((a, b) => a - b);
  const exactIn = (s) => pct(rows.filter((r) => !r.distance && r.steps <= s).length);
  console.log(
    [pool, count, `${min}-${max}`, pct(sorted.filter((d) => d === 0).length), pct(sorted.filter((d) => d <= 1).length), pct(sorted.filter((d) => d <= 5).length),
      (sorted.reduce((a, d) => a + d, 0) / N).toFixed(2), sorted[Math.floor(0.99 * (N - 1))], exactIn(1), exactIn(2), exactIn(3)].join('\t'),
  );
}
