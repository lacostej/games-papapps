// Every exact solution of numbers-round draws, grouped into methods (see docs/numbers-methods.md).
// Usage: node tools/numbers-methods.mjs <normal|kids> <seed> <draws>
import { drawNumbers, LEVELS } from '../src/core/numbers.js';

const CAP = 12; // canonical forms kept per value per subset, fewest operations first
const leaf = (v) => ({ kind: 'n', v, key: String(v), ops: 0 });
function group(kind, plus, minus) {
  const sort = (xs) => xs.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  plus = sort(plus); minus = sort(minus);
  const sep = kind === '+' ? ['+', '-'] : ['*', '/'];
  return { kind, plus, minus, key: `${kind}(${plus.map((x) => x.key).join(sep[0])}${minus.length ? sep[1] + minus.map((x) => x.key).join(sep[1]) : ''})` };
}
const parts = (x, kind) => (x.kind === kind ? [x.plus, x.minus] : [[x], []]);
function combine(a, op, b) {
  const kind = op === '+' || op === '-' ? '+' : '*';
  const [ap, am] = parts(a, kind), [bp, bm] = parts(b, kind);
  const g = op === '+' || op === '×' ? group(kind, [...ap, ...bp], [...am, ...bm]) : group(kind, [...ap, ...bm], [...am, ...bp]);
  g.ops = a.ops + b.ops + 1;
  return g;
}
function apply(a, op, b) {
  if (op === '+') return a + b;
  if (op === '×') return a === 1 || b === 1 ? null : a * b;
  if (op === '-') return a > b && a - b !== b ? a - b : null;
  if (op === '÷') return b > 1 && a % b === 0 && a / b !== b ? a / b : null;
}
function show(x, parent) {
  if (x.kind === 'n') return String(x.v);
  const [p, m] = x.kind === '+' ? [' + ', ' − '] : [' × ', ' ÷ '];
  const s = x.plus.map((c) => show(c, x.kind)).join(p) + x.minus.map((c) => m + show(c, x.kind === '+' ? '+-' : '*/')).join('');
  return (parent === '*' || parent === '*/' || parent === '+-') && (x.kind === '+' || parent === '*/') ? `(${s})` : s;
}

// The method: in each sum or product, the largest member above 10 is described by how it was
// built, recursively; the other members are merged into one value. A group of small values is a value.
const SMALL = 10;
export function family(e, top = true) {
  if (e.kind === 'n') return String(e.v);
  const members = [...e.plus.map((x) => [x, 1]), ...e.minus.map((x) => [x, -1])];
  const [main] = members.filter(([x, s]) => s > 0 && (top || x.v > SMALL)).sort((a, b) => b[0].v - a[0].v);
  if (!main || main[0].v <= SMALL && !top) return String(e.v);
  const rest = members.filter((t) => t !== main);
  const inner = family(main[0], false);
  const head = inner.includes(' ') ? `(${inner})` : inner;
  if (e.kind === '+') {
    const r = rest.reduce((a, [x, s]) => a + s * x.v, 0);
    return r >= 0 ? `${head} + ${r}` : `${head} − ${-r}`;
  }
  const num = rest.filter(([, s]) => s > 0).reduce((a, [x]) => a * x.v, 1);
  const den = rest.filter(([, s]) => s < 0).reduce((a, [x]) => a * x.v, 1);
  return den === 1 ? `${head} × ${num}` : num === 1 ? `${head} ÷ ${den}` : `${head} × ${num} ÷ ${den}`;
}

export function solutions(plates, target) {
  const n = plates.length;
  const maps = new Array(1 << n);
  const add = (map, v, e) => {
    let list = map.get(v);
    if (!list) map.set(v, (list = []));
    if (list.some((x) => x.key === e.key)) return;
    list.push(e);
    list.sort((x, y) => x.ops - y.ops);
    if (list.length > CAP) list.pop();
  };
  const found = new Map();
  for (let mask = 1; mask < 1 << n; mask++) {
    const map = new Map();
    const bits = [...Array(n).keys()].filter((i) => mask & (1 << i));
    if (bits.length === 1) add(map, plates[bits[0]], leaf(plates[bits[0]]));
    for (let a = (mask - 1) & mask; a > 0; a = (a - 1) & mask) {
      const b = mask ^ a;
      if (a < b) continue;
      for (const [va, ea] of maps[a]) for (const [vb, eb] of maps[b]) for (const [x, y, ex, ey] of [[va, vb, ea, eb], [vb, va, eb, ea]]) for (const op of ['+', '-', '×', '÷']) {
        if ((op === '+' || op === '×') && x === vb && y === va && va !== vb) continue;
        const v = apply(x, op, y);
        if (v === null) continue;
        for (const e1 of ex) for (const e2 of ey) { const e = combine(e1, op, e2); e.v = v; add(map, v, e); }
      }
    }
    maps[mask] = map;
    for (const e of map.get(target) ?? []) found.set(e.key, e);
  }
  return [...found.values()].sort((x, y) => x.ops - y.ops).map((e) => ({ ops: e.ops, text: show(e), key: e.key, family: family(e) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [level, seedArg, count] = process.argv.slice(2);
  let seed = Number(seedArg);
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  let shown = 0;
  while (shown < Number(count)) {
    const { plates, target } = drawNumbers(random, LEVELS[level]);
    const sols = solutions(plates, target);
    const few = sols.filter((s) => s.ops <= sols[0]?.ops + 1);
    if (few.length < 4 || few.length > 9) continue;
    shown++;
    const families = new Map();
    for (const s of sols) families.set(s.family, [...(families.get(s.family) ?? []), s]);
    console.log(`\n${plates.join(' ')} → ${target}: ${sols.length} solutions, ${families.size} families`);
    for (const [f, list] of [...families].sort((a, b) => a[1][0].ops - b[1][0].ops))
      console.log(`  ${f.padEnd(26)} ${list.length} × e.g. ${list.slice(0, 3).map((s) => s.text).join('  |  ')}`);
  }
}
