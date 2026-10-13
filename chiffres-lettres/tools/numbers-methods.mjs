// Every exact solution of numbers-round draws, grouped into methods (see docs/numbers-methods.md).
// Usage: node tools/numbers-methods.mjs <normal|kids> <seed> <draws>   (Markdown on stdout)
import { drawNumbers, LEVELS } from '../src/core/numbers.js';

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

// The last step as values: the largest member of the final sum or product against all the rest.
export function lastStep(e) {
  if (e.kind === 'n') return String(e.v);
  const members = [...e.plus.map((x) => [x.v, 1]), ...e.minus.map((x) => [x.v, -1])];
  const [main] = members.filter(([, s]) => s > 0).sort((a, b) => b[0] - a[0]);
  const rest = members.filter((t) => t !== main);
  if (e.kind === '+') {
    const r = rest.reduce((a, [v, s]) => a + s * v, 0);
    return r >= 0 ? `${main[0]} + ${r}` : `${main[0]} − ${-r}`;
  }
  const num = rest.filter(([, s]) => s > 0).reduce((a, [v]) => a * v, 1);
  const den = rest.filter(([, s]) => s < 0).reduce((a, [v]) => a * v, 1);
  return den === 1 ? `${main[0]} × ${num}` : num === 1 ? `${main[0]} ÷ ${den}` : `${main[0]} × ${num} ÷ ${den}`;
}

export function solutions(plates, target) {
  const n = plates.length;
  const maps = new Array(1 << n);
  const add = (map, v, e) => {
    let list = map.get(v);
    if (!list) map.set(v, (list = []));
    if (list.some((x) => x.key === e.key)) return;
    list.push(e);
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
  return [...found.values()].sort((x, y) => x.ops - y.ops).map((e) => ({ ops: e.ops, text: show(e), key: e.key, family: family(e), last: lastStep(e) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [level, seedArg, count] = process.argv.slice(2);
  let seed = Number(seedArg);
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  let shown = 0;
  while (shown < Number(count)) {
    const { plates, target } = drawNumbers(random, LEVELS[level]);
    const sols = solutions(plates, target);
    const methods = new Map();
    for (const x of sols) methods.set(x.family, [...(methods.get(x.family) ?? []), x]);
    if (methods.size < 3 || methods.size > 12) continue;
    shown++;
    const lasts = new Map();
    for (const [f, list] of methods) lasts.set(list[0].last, [...(lasts.get(list[0].last) ?? []), [f, list]]);
    console.log(`\n### ${level === 'kids' ? 'Kids' : 'Normal'} ${shown}: ${plates.join(' ')} → ${target}\n`);
    console.log(`${sols.length} solutions, ${methods.size} methods, ${lasts.size} last steps.\n`);
    console.log('| Last step | Method | Solutions | Example |\n| --- | --- | --- | --- |');
    const order = [...lasts].sort((a, b) => b[1].length - a[1].length || Math.min(...a[1].map(([, l]) => l[0].ops)) - Math.min(...b[1].map(([, l]) => l[0].ops)));
    for (const [last, group] of order)
      group.forEach(([f, list], i) => console.log(`| ${i ? '' : (group.length > 1 ? `**${last}**` : last)} | ${f} | ${list.length} | ${list[0].text} |`));
  }
}
