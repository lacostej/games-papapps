import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Language } from '../src/core/language.js';
import { Selection } from '../src/core/selection.js';
import { dealPuzzle, seededRandom, shuffle } from '../src/core/puzzle.js';
import { FreePlay } from '../src/core/free-play.js';

const en = new Language({ code: 'en' });
const fr = new Language({ code: 'fr', replacements: { 'œ': 'oe' } });

test('normalize strips diacritics, expands ligatures and upper-cases', () => {
  assert.equal(fr.normalize(' Été '), 'ETE');
  assert.equal(fr.normalize('cœur'), 'COEUR');
  assert.equal(fr.normalize('planète'), 'PLANETE');
});

test('normalize keeps diacritics and locale casing when asked', () => {
  const tr = new Language({ code: 'tr', stripDiacritics: false });
  assert.equal(tr.normalize('istanbul'), 'İSTANBUL');
  assert.equal(tr.normalize('şeker'), 'ŞEKER');
});

test('tiles split digraphs greedily', () => {
  const nl = new Language({ code: 'nl', digraphs: ['ij'] });
  assert.deepEqual(nl.tiles(nl.normalize('ijs')), ['IJ', 'S']);
  assert.deepEqual(nl.tiles(nl.normalize('bij')), ['B', 'IJ']);
  assert.deepEqual(en.tiles('CAT'), ['C', 'A', 'T']);
});

test('selection adds, refuses reuse, and backtracks onto the previous tile', () => {
  const s = new Selection();
  assert.equal(s.enter(0), 'add');
  assert.equal(s.enter(1), 'add');
  assert.equal(s.enter(2), 'add');
  assert.equal(s.enter(0), null);
  assert.deepEqual(s.path, [0, 1, 2]);
  assert.equal(s.enter(1), 'backtrack');
  assert.deepEqual(s.path, [0, 1]);
  assert.equal(s.enter(0), 'backtrack');
  assert.deepEqual(s.path, [0]);
  assert.equal(s.enter(0), null);
});

test('free play scores each distinct word once, required or bonus', () => {
  const game = new FreePlay({ words: ['EAT', 'TEA'], bonus: ['ETA'], minWordLength: 3 });
  assert.equal(game.submit(['T', 'E', 'A']).result, 'found');
  assert.equal(game.submit(['T', 'E', 'A']).result, 'duplicate');
  assert.equal(game.submit(['E', 'T', 'A']).result, 'bonus');
  assert.equal(game.submit(['E', 'T', 'A']).result, 'duplicate');
  assert.equal(game.submit(['A', 'E', 'T']).result, 'invalid');
  assert.equal(game.submit(['T', 'E']).result, 'too-short');
  assert.equal(game.submit(['T']).result, 'ignored');
  assert.equal(game.submit([]).result, 'ignored');
  assert.equal(game.score, 2);
  assert.deepEqual(game.found, ['TEA']);
  assert.deepEqual(game.bonusFound, ['ETA']);
  assert.equal(game.total, 2);
});

test('dealPuzzle scrambles the tiles and avoids the previous puzzle', () => {
  const pack = {
    minWordLength: 3,
    puzzles: [
      { tiles: ['E', 'N', 'O', 'S', 'T'], words: ['NOTE', 'STONE', 'TONES'], bonus: ['ONSET'] },
      { tiles: ['A', 'C', 'T'], words: ['CAT'], bonus: [] },
    ],
  };
  for (let i = 0; i < 20; i++) {
    const p = dealPuzzle(pack, { rng: seededRandom(i), avoid: 1 });
    assert.equal(p.index, 0);
    assert.ok(!p.words.includes(p.tiles.join('')), p.tiles.join(''));
    assert.deepEqual([...p.tiles].sort(), ['E', 'N', 'O', 'S', 'T']);
    assert.deepEqual(p.bonus, ['ONSET']);
    assert.equal(p.minWordLength, 3);
  }
  assert.equal(dealPuzzle({ ...pack, puzzles: [pack.puzzles[1]] }, { avoid: 0 }).index, 0);
});

test('shuffle keeps every item', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(shuffle(items, seededRandom(3)).sort(), items);
});
