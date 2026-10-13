// Solutions of a numbers draw as trees, and the method each one uses (see docs/numbers-methods.md).
// A tree is a card { kind: 'n', v } or a group { kind: '+' | '*', plus, minus, v }: a sum of added and
// subtracted members, or a product of multiplied and divided ones. Order and grouping are merged
// away, so 37 × 6 × 2 is one tree however it was computed.

const SMALL = 10;

const leaf = (v) => ({ kind: 'n', v, key: String(v), ops: 0 });

function group(kind, plus, minus, v, ops) {
  const sort = (xs) => xs.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  plus = sort(plus);
  minus = sort(minus);
  const [p, m] = kind === '+' ? ['+', '-'] : ['*', '/'];
  const key = `${kind}(${plus.map((x) => x.key).join(p)}${minus.length ? m + minus.map((x) => x.key).join(m) : ''})`;
  return { kind, plus, minus, v, ops, key };
}

const parts = (x, kind) => (x.kind === kind ? [x.plus, x.minus] : [[x], []]);
const VALUE = { '+': (a, b) => a + b, '-': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };

export function combine(a, op, b) {
  const kind = op === '+' || op === '-' ? '+' : '*';
  const [ap, am] = parts(a, kind);
  const [bp, bm] = parts(b, kind);
  const same = op === '+' || op === '×';
  return group(kind, [...ap, ...(same ? bp : bm)], [...am, ...(same ? bm : bp)], VALUE[op](a.v, b.v), a.ops + b.ops + 1);
}

// The game's rules, minus moves that change nothing (× 1, ÷ 1, a − b = b, a ÷ b = b).
function apply(a, op, b) {
  if (op === '+') return a + b;
  if (op === '×') return a === 1 || b === 1 ? null : a * b;
  if (op === '-') return a > b && a - b !== b ? a - b : null;
  if (op === '÷') return b > 1 && a % b === 0 && a / b !== b ? a / b : null;
  return null;
}

export function show(x, parent) {
  if (x.kind === 'n') return String(x.v);
  const [p, m] = x.kind === '+' ? [' + ', ' − '] : [' × ', ' ÷ '];
  const s = x.plus.map((c) => show(c, x.kind)).join(p) + x.minus.map((c) => m + show(c, x.kind === '+' ? '+-' : '*/')).join('');
  return (parent === '*' || parent === '*/' || parent === '+-') && (x.kind === '+' || parent === '*/') ? `(${s})` : s;
}

// The method: in each sum or product, the largest member above 10 is described by how it was
// built, recursively; the other members are merged into one value. A group of small values is a value.
export function family(e, top = true) {
  if (e.kind === 'n') return String(e.v);
  const members = [...e.plus.map((x) => [x, 1]), ...e.minus.map((x) => [x, -1])];
  const [main] = members.filter(([x, s]) => s > 0 && (top || x.v > SMALL)).sort((a, b) => b[0].v - a[0].v);
  if (!main || (main[0].v <= SMALL && !top)) return String(e.v);
  const inner = family(main[0], false);
  return join(e.kind, inner.includes(' ') ? `(${inner})` : inner, members.filter((t) => t !== main).map(([x, s]) => [x.v, s]));
}

// The last step as values: the largest member of the final sum or product against all the rest.
export function lastStep(e) {
  if (e.kind === 'n') return String(e.v);
  const members = [...e.plus.map((x) => [x.v, 1]), ...e.minus.map((x) => [x.v, -1])];
  const [main] = members.filter(([, s]) => s > 0).sort((a, b) => b[0] - a[0]);
  return join(e.kind, String(main[0]), members.filter((t) => t !== main));
}

function join(kind, head, rest) {
  if (kind === '+') {
    const r = rest.reduce((a, [v, s]) => a + s * v, 0);
    return r >= 0 ? `${head} + ${r}` : `${head} − ${-r}`;
  }
  const num = rest.filter(([, s]) => s > 0).reduce((a, [v]) => a * v, 1);
  const den = rest.filter(([, s]) => s < 0).reduce((a, [v]) => a * v, 1);
  return den === 1 ? `${head} × ${num}` : num === 1 ? `${head} ÷ ${den}` : `${head} × ${num} ÷ ${den}`;
}

export function describe(e) {
  return { tree: e, v: e.v, ops: e.ops, key: e.key, text: show(e), family: family(e), last: lastStep(e) };
}

// Every solution reaching `target`, fewest operations first.
export function solutions(plates, target) {
  const n = plates.length;
  const maps = new Array(1 << n);
  const found = new Map();
  for (let mask = 1; mask < 1 << n; mask++) {
    const map = new Map();
    const add = (e) => {
      const list = map.get(e.v) ?? [];
      if (!list.some((x) => x.key === e.key)) map.set(e.v, [...list, e]);
    };
    const bits = [...Array(n).keys()].filter((i) => mask & (1 << i));
    if (bits.length === 1) add(leaf(plates[bits[0]]));
    for (let a = (mask - 1) & mask; a > 0; a = (a - 1) & mask) {
      const b = mask ^ a;
      if (a < b) continue;
      for (const [va, ea] of maps[a])
        for (const [vb, eb] of maps[b])
          for (const [x, y, ex, ey] of [[va, vb, ea, eb], [vb, va, eb, ea]])
            for (const op of ['+', '-', '×', '÷']) {
              if ((op === '+' || op === '×') && x === vb && y === va && va !== vb) continue;
              if (apply(x, op, y) === null) continue;
              for (const e1 of ex) for (const e2 of ey) add(combine(e1, op, e2));
            }
    }
    maps[mask] = map;
    for (const e of map.get(target) ?? []) found.set(e.key, e);
  }
  return [...found.values()].sort((x, y) => x.ops - y.ops).map(describe);
}

// The player's answer: moves by number id ([aId, op, bId], ids as in Calculation), ending on the
// announced value. The latest number with that value is the one announced.
export function fromMoves(plates, moves, value) {
  const trees = plates.map(leaf);
  for (const [a, op, b] of moves) {
    // Saves from before undo reused ids can name a number that was never made.
    if (!trees[a] || !trees[b]) return undefined;
    trees.push(combine(trees[a], op, trees[b]));
  }
  const used = new Set(moves.flatMap(([a, , b]) => [a, b]));
  return [...trees.keys()].reverse().filter((id) => !used.has(id) && trees[id].v === value).map((id) => trees[id])[0];
}

// The computer's answer: steps by value ({ a, op, b, result }), ending on `value`.
export function fromSteps(plates, steps, value) {
  let pool = plates.map(leaf);
  for (const { a, op, b } of steps) {
    const i = pool.findIndex((x) => x.v === a);
    const j = pool.findIndex((x, k) => k !== i && x.v === b);
    const made = combine(pool[i], op, pool[j]);
    pool = [...pool.filter((_, k) => k !== i && k !== j), made];
  }
  return pool.findLast((x) => x.v === value);
}
