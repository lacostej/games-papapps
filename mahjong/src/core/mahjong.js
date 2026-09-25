// Faces 0-33 come four times each: dots, bamboo and characters 1-9 (0-26), winds (27-30),
// dragons (31-33). Flowers (34-37) and seasons (38-41) are unique and match within their group.
export const FACES = 42;

export function matchKey(face) {
  return face < 34 ? face : face < 38 ? 'flower' : 'season';
}

export function matches(a, b) {
  return matchKey(a) === matchKey(b);
}

// All 72 pairs of a full set.
export function allPairs() {
  const pairs = [];
  for (let f = 0; f < 34; f++) pairs.push([f, f], [f, f]);
  pairs.push([34, 35], [36, 37], [38, 39], [40, 41]);
  return pairs;
}

const overlaps = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

// A tile is free when nothing lies on it and its left or right side is open.
export function isFree(tile, tiles) {
  let left = false;
  let right = false;
  for (const o of tiles) {
    if (o === tile || o.removed) continue;
    if (o.z > tile.z && overlaps(o, tile)) return false;
    if (o.z === tile.z && Math.abs(o.y - tile.y) < 2) {
      if (o.x === tile.x - 2) left = true;
      if (o.x === tile.x + 2) right = true;
    }
  }
  return !(left && right);
}

function shuffleInPlace(items, random) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Every way to take the positions off two free ones at a time, searched exhaustively: an order
// of index pairs, or null when none exists (e.g. two tiles stacked). Only for small sets.
export function clearingOrder(positions) {
  const tiles = positions.map((p) => ({ ...p, removed: false }));
  const dead = new Set();
  const rec = () => {
    const key = tiles.map((t) => +t.removed).join('');
    if (!key.includes('0')) return [];
    if (dead.has(key)) return null;
    const free = tiles.map((t, i) => i).filter((i) => !tiles[i].removed && isFree(tiles[i], tiles));
    for (let a = 0; a < free.length; a++) {
      for (let b = a + 1; b < free.length; b++) {
        tiles[free[a]].removed = tiles[free[b]].removed = true;
        const rest = rec();
        tiles[free[a]].removed = tiles[free[b]].removed = false;
        if (rest) return [[free[a], free[b]], ...rest];
      }
    }
    dead.add(key);
    return null;
  };
  return rec();
}

// Beyond this many positions the random attempts are relied on; below, a failure is confirmed
// exhaustively, so null really means no arrangement of faces can be cleared.
const EXHAUSTIVE = 20;

// Gives the positions faces so the deal can be cleared: pairs of free positions are taken off
// an imaginary full board and given matching faces; playing them in that order clears it.
// Retries when the removal gets stuck. Returns { faces, order }: the faces by position index,
// and the pairs of position indices in a clearing order; or null.
export function solvableFaces(positions, pairs, random = Math.random, attempts = 200) {
  for (let a = 0; a < attempts; a++) {
    const tiles = positions.map((p) => ({ ...p, removed: false }));
    const faces = new Array(positions.length);
    const order = [];
    let ok = true;
    for (const [fa, fb] of shuffleInPlace([...pairs], random)) {
      const free = tiles.filter((t) => !t.removed && isFree(t, tiles));
      if (free.length < 2) {
        ok = false;
        break;
      }
      shuffleInPlace(free, random);
      const [p, q] = free;
      for (const [t, f] of [[p, fa], [q, fb]]) {
        t.removed = true;
        faces[tiles.indexOf(t)] = f;
      }
      order.push([tiles.indexOf(p), tiles.indexOf(q)]);
    }
    if (ok) return { faces, order };
  }
  if (positions.length > EXHAUSTIVE) return null;
  const order = clearingOrder(positions);
  if (!order) return null;
  const faces = new Array(positions.length);
  const shuffledPairs = shuffleInPlace([...pairs], random);
  order.forEach(([i, j], k) => ([faces[i], faces[j]] = shuffledPairs[k]));
  return { faces, order };
}

export class Game {
  // `tiles`: [{ x, y, z, face, removed }]. Without tiles, deals a new solvable game.
  constructor({ layout, tiles, history = [], random = Math.random }) {
    this.random = random;
    if (tiles) {
      this.tiles = tiles.map((t) => ({ ...t }));
    } else {
      const pairs = shuffleInPlace(allPairs(), random).slice(0, layout.length / 2);
      const { faces } = solvableFaces(layout, pairs, random);
      this.tiles = layout.map((p, i) => ({ ...p, face: faces[i], removed: false }));
    }
    this.history = [...history];
  }

  get left() {
    return this.tiles.filter((t) => !t.removed).length;
  }

  get won() {
    return this.left === 0;
  }

  free(i) {
    const t = this.tiles[i];
    return !t.removed && isFree(t, this.tiles);
  }

  // Removes tiles i and j if both are free and match.
  remove(i, j) {
    if (i === j || !this.free(i) || !this.free(j) || !matches(this.tiles[i].face, this.tiles[j].face)) return false;
    this.tiles[i].removed = true;
    this.tiles[j].removed = true;
    this.history.push([i, j]);
    return true;
  }

  undo() {
    const last = this.history.pop();
    if (!last) return false;
    for (const i of last) this.tiles[i].removed = false;
    return true;
  }

  // A free matching pair, or null when stuck.
  hint() {
    const free = this.tiles.map((_, i) => i).filter((i) => this.free(i));
    for (let a = 0; a < free.length; a++) {
      for (let b = a + 1; b < free.length; b++) {
        if (matches(this.tiles[free[a]].face, this.tiles[free[b]].face)) return [free[a], free[b]];
      }
    }
    return null;
  }

  // Deals the remaining faces again so the rest of the game can still be cleared. Returns the
  // clearing order (tile indices) it was built from, or null. Undo history is cleared, since
  // earlier moves no longer apply to the new faces.
  shuffle() {
    const rest = this.tiles.filter((t) => !t.removed);
    const pairs = [];
    const byKey = new Map();
    for (const t of rest) {
      const key = matchKey(t.face);
      if (byKey.has(key)) pairs.push([byKey.get(key), t.face]), byKey.delete(key);
      else byKey.set(key, t.face);
    }
    const dealt = solvableFaces(rest, pairs, this.random);
    if (!dealt) return null;
    rest.forEach((t, i) => (t.face = dealt.faces[i]));
    this.history = [];
    return dealt.order.map(([i, j]) => [this.tiles.indexOf(rest[i]), this.tiles.indexOf(rest[j])]);
  }

  toJSON() {
    return { tiles: this.tiles, history: this.history };
  }
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
