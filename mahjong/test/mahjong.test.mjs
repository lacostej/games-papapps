import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allPairs, clearingOrder, Game, isFree, matches, seededRandom, solvableFaces } from '../src/core/mahjong.js';
import { LAYOUTS } from '../src/core/layouts.js';

test('flowers match flowers and seasons match seasons, other tiles only themselves', () => {
  assert.ok(matches(5, 5));
  assert.ok(!matches(5, 6));
  assert.ok(matches(34, 37));
  assert.ok(matches(38, 41));
  assert.ok(!matches(37, 38));
});

test('a full set is 144 tiles in 72 matching pairs, each face 4 times or once', () => {
  const pairs = allPairs();
  assert.equal(pairs.length, 72);
  assert.ok(pairs.every(([a, b]) => matches(a, b)));
  const counts = {};
  for (const f of pairs.flat()) counts[f] = (counts[f] ?? 0) + 1;
  for (let f = 0; f < 42; f++) assert.equal(counts[f], f < 34 ? 4 : 1, `face ${f}`);
});

test('a tile is blocked from above, or on both sides at once', () => {
  const t = (x, y, z) => ({ x, y, z, removed: false });
  const centre = t(2, 0, 0);
  const left = t(0, 0, 0);
  const right = t(4, 1, 0); // half a tile lower still touches
  assert.ok(isFree(centre, [centre, left]));
  assert.ok(!isFree(centre, [centre, left, right]));
  assert.ok(isFree(centre, [centre, left, { ...right, removed: true }]));
  const above = t(3, 1, 1); // overlaps a quarter
  assert.ok(!isFree(centre, [centre, above]));
  assert.ok(isFree(centre, [centre, t(4, 0, 1)]));
});

test('every layout is even, with no two tiles on the same spot of a layer', () => {
  for (const [name, layout] of Object.entries(LAYOUTS)) {
    assert.equal(layout.length % 2, 0, name);
    for (const a of layout) {
      for (const b of layout) {
        if (a !== b && a.z === b.z) assert.ok(Math.abs(a.x - b.x) >= 2 || Math.abs(a.y - b.y) >= 2, `${name} overlap`);
      }
    }
  }
});

// Plays a game to the end with random choices among free pairs, undoing nothing.
function playRandomly(game, random) {
  for (;;) {
    const free = game.tiles.map((_, i) => i).filter((i) => game.free(i));
    const pairs = [];
    for (let a = 0; a < free.length; a++) for (let b = a + 1; b < free.length; b++) if (matches(game.tiles[free[a]].face, game.tiles[free[b]].face)) pairs.push([free[a], free[b]]);
    if (!pairs.length) return game.won;
    assert.ok(game.remove(...pairs[Math.floor(random() * pairs.length)]));
  }
}

// Replays a clearing order: every pair must be free and matching when its turn comes.
function replays(tiles, order) {
  for (const [i, j] of order) {
    if (tiles[i].removed || tiles[j].removed || !isFree(tiles[i], tiles) || !isFree(tiles[j], tiles)) return false;
    if (!matches(tiles[i].face, tiles[j].face)) return false;
    tiles[i].removed = tiles[j].removed = true;
  }
  return tiles.every((t) => t.removed);
}

for (const [name, layout] of Object.entries(LAYOUTS)) {
  test(`${name} deals come with an order that clears them`, () => {
    const random = seededRandom(name.length);
    for (let k = 0; k < 200; k++) {
      const pairs = allPairs().slice(0, layout.length / 2);
      const { faces, order } = solvableFaces(layout, pairs, random);
      assert.equal(order.length, layout.length / 2);
      assert.ok(replays(layout.map((p, i) => ({ ...p, face: faces[i], removed: false })), order), `${name} deal ${k}`);
    }
  });
}

test('two stacked tiles can never be cleared; side by side they can', () => {
  assert.equal(clearingOrder([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]), null);
  assert.deepEqual(clearingOrder([{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }]), [[0, 1]]);
});

test('remove needs two free matching tiles; undo puts them back', () => {
  const g = new Game({ layout: LAYOUTS.easy, random: seededRandom(4) });
  const [i, j] = g.hint();
  const blocked = g.tiles.findIndex((_, k) => !g.free(k));
  assert.equal(g.remove(i, blocked), false);
  assert.equal(g.remove(i, i), false);
  assert.equal(g.remove(i, j), true);
  assert.equal(g.left, 70);
  assert.equal(g.undo(), true);
  assert.equal(g.left, 72);
  assert.equal(g.undo(), false);
});

test('shuffle when stuck keeps the remaining faces and makes the rest clearable', () => {
  const random = seededRandom(8);
  let stuck = 0;
  let impossible = 0;
  for (let k = 0; k < 60; k++) {
    const g = new Game({ layout: LAYOUTS.medium, random });
    playRandomly(g, random);
    if (g.won) continue;
    stuck++;
    const before = g.tiles.filter((t) => !t.removed).map((t) => t.face).sort((a, b) => a - b);
    const order = g.shuffle();
    if (!order) {
      // Only allowed when no arrangement at all can be cleared.
      assert.equal(clearingOrder(g.tiles.filter((t) => !t.removed)), null);
      impossible++;
      continue;
    }
    const after = g.tiles.filter((t) => !t.removed).map((t) => t.face).sort((a, b) => a - b);
    assert.deepEqual(after, before);
    assert.ok(replays(g.tiles.map((t) => ({ ...t })), order), 'still stuck after shuffle');
  }
  assert.ok(stuck > impossible, 'no stuck game was shuffled, so shuffle was not exercised');
});

test('a saved game resumes with its removed tiles and history', () => {
  const g = new Game({ layout: LAYOUTS.easy, random: seededRandom(2) });
  g.remove(...g.hint());
  const copy = new Game(JSON.parse(JSON.stringify(g)));
  assert.equal(copy.left, 70);
  assert.deepEqual(copy.history, g.history);
  assert.ok(copy.undo());
  assert.equal(copy.left, 72);
});
