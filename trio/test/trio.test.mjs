import { test } from 'node:test';
import assert from 'node:assert/strict';
import { features, findTrio, Game, isTrio, seededRandom, shuffled, TABLE_SIZE, third } from '../src/core/trio.js';

const card = (n, s, h, c) => n + 3 * s + 9 * h + 27 * c;

test('a trio is all same or all different on every feature', () => {
  assert.equal(isTrio(card(0, 0, 0, 0), card(1, 1, 1, 1), card(2, 2, 2, 2)), true);
  assert.equal(isTrio(card(0, 1, 2, 0), card(1, 1, 2, 1), card(2, 1, 2, 2)), true);
  assert.equal(isTrio(card(0, 0, 0, 0), card(0, 0, 0, 1), card(1, 0, 0, 2)), false);
  assert.equal(isTrio(5, 5, 5), false);
});

test('third completes every pair, and only that card does', () => {
  for (let a = 0; a < 81; a++) {
    for (let b = a + 1; b < 81; b++) {
      const c = third(a, b);
      assert.ok(isTrio(a, b, c), `${a} ${b} ${c}`);
      assert.deepEqual(features(c).length, 4);
    }
  }
  assert.equal([...Array(81).keys()].filter((c) => c !== 0 && c !== 1 && isTrio(0, 1, c)).length, 1);
});

test('findTrio finds one when present, skipping empty slots', () => {
  const table = [card(0, 0, 0, 0), null, card(1, 1, 1, 1), card(2, 0, 1, 0), card(2, 2, 2, 2)];
  const [i, j, k] = findTrio(table);
  assert.ok(isTrio(table[i], table[j], table[k]));
  // Four cards that differ in two features only in pairs: no trio.
  assert.equal(findTrio([card(0, 0, 0, 0), card(1, 0, 0, 0), card(0, 1, 0, 0), card(1, 1, 0, 0)]), null);
});

test('a new game deals twelve, or more only when those hold no trio', () => {
  for (let seed = 1; seed < 200; seed++) {
    const g = new Game({ deck: shuffled(seededRandom(seed)) });
    assert.ok(g.table.length >= TABLE_SIZE && g.table.length <= 21);
    assert.ok(findTrio(g.table));
    if (g.table.length > TABLE_SIZE) assert.equal(findTrio(g.table.slice(0, g.table.length - 3)), null);
    assert.equal(g.added, g.table.length - TABLE_SIZE);
  }
});

test('a wrong claim changes nothing; a right one replaces the cards in place', () => {
  const g = new Game({ deck: shuffled(seededRandom(3)) });
  const before = [...g.table];
  const [i, j, k] = g.hint();
  const wrong = [i, j, [...g.table.keys()].find((x) => x !== i && x !== j && x !== k)];
  assert.equal(g.claim(wrong), false);
  assert.deepEqual(g.table, before);
  assert.equal(g.claim([i, j, i]), false);
  const deckBefore = g.deck.length;
  assert.equal(g.claim([i, j, k]), true);
  assert.equal(g.found, 1);
  if (before.length === TABLE_SIZE) {
    // Same length, untouched cards kept their position.
    assert.equal(g.table.length, TABLE_SIZE);
    before.forEach((c, x) => ![i, j, k].includes(x) && assert.equal(g.table[x], c));
    assert.equal(g.deck.length, deckBefore - 3 - (g.table.length - TABLE_SIZE));
  }
});

test('whole games play out: 81 cards are all accounted for and the table never has holes', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const g = new Game({ deck: shuffled(seededRandom(seed)) });
    let turns = 0;
    while (!g.over) {
      assert.ok(g.table.every((c) => c !== null), 'hole in the table');
      assert.ok(g.table.length <= 21, `table of ${g.table.length}`);
      assert.ok(g.claim(g.hint()));
      assert.ok(++turns <= 27);
    }
    assert.equal(g.deck.length, 0);
    assert.equal(g.found * 3 + g.table.length, 81);
    assert.equal(findTrio(g.table), null);
    assert.ok(g.table.length <= 20);
  }
});

test('extra cards are absorbed: after a claim with more than twelve, no new cards are dealt unless needed', () => {
  // Find a seed whose opening deal needed extra cards.
  let g;
  for (let seed = 1; !g || g.table.length === TABLE_SIZE; seed++) g = new Game({ deck: shuffled(seededRandom(seed)) });
  const size = g.table.length;
  const deck = g.deck.length;
  g.claim(g.hint());
  assert.ok(g.table.length === size - 3 || g.deck.length < deck, `${size} -> ${g.table.length}`);
  assert.ok(g.table.every((c) => c !== null));
});

test('a saved game resumes where it was', () => {
  const g = new Game({ deck: shuffled(seededRandom(9)) });
  g.claim(g.hint());
  const copy = new Game(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(copy.table, g.table);
  assert.deepEqual(copy.deck, g.deck);
  assert.equal(copy.found, 1);
});
