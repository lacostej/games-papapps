import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Language } from '../src/core/language.js';
import { Dictionary } from '../src/core/dictionary.js';
import { Selection } from '../src/core/selection.js';
import { createPuzzle, seededRandom, shuffle } from '../src/core/puzzle.js';
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

test('dictionary ignores comments, non-letters and words longer than maxTiles', () => {
  const d = Dictionary.fromText(en, '# header\nstar\n\nit\'s\nwaterfalls\nrats\n');
  assert.equal(d.size, 2);
  assert.ok(d.has('STAR'));
  assert.ok(!d.has('WATERFALLS'));
});

test('wordsFrom uses each tile at most once and respects duplicates', () => {
  const d = new Dictionary(en, ['tea', 'eat', 'tee', 'teeth', 'ate', 'at', 'seat']);
  assert.deepEqual(d.wordsFrom(['T', 'E', 'A']), ['ATE', 'EAT', 'TEA']);
  assert.deepEqual(d.wordsFrom(['T', 'E', 'A', 'E']), ['ATE', 'EAT', 'TEA', 'TEE']);
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

test('free play scores each distinct word once', () => {
  const d = new Dictionary(en, ['tea', 'eat', 'ate']);
  const game = new FreePlay(d, { words: d.wordsFrom(['T', 'E', 'A']) });
  assert.equal(game.submit(['T', 'E', 'A']).result, 'found');
  assert.equal(game.submit(['T', 'E', 'A']).result, 'duplicate');
  assert.equal(game.submit(['A', 'E', 'T']).result, 'invalid');
  assert.equal(game.submit(['T', 'E']).result, 'too-short');
  assert.equal(game.submit(['T']).result, 'ignored');
  assert.equal(game.submit([]).result, 'ignored');
  assert.equal(game.score, 1);
  assert.equal(game.total, 3);
});

test('createPuzzle picks a seed of the requested size and scrambles it', () => {
  const d = new Dictionary(en, ['stone', 'notes', 'tone', 'note', 'one', 'toe', 'cat']);
  for (let i = 0; i < 20; i++) {
    const p = createPuzzle({ dictionary: d, seeds: ['STONE', 'CAT'], size: 5, rng: seededRandom(i) });
    assert.equal(p.seed, 'STONE');
    assert.notEqual(p.tiles.join(''), 'STONE');
    assert.deepEqual([...p.tiles].sort(), [...'STONE'].sort());
    assert.deepEqual(p.words, ['ONE', 'TOE', 'NOTE', 'TONE', 'NOTES', 'STONE']);
  }
});

test('createPuzzle falls back to dictionary words when no seed fits', () => {
  const d = new Dictionary(en, ['cats', 'cat']);
  assert.equal(createPuzzle({ dictionary: d, seeds: [], size: 4 }).seed, 'CATS');
  assert.throws(() => createPuzzle({ dictionary: d, seeds: [], size: 6 }));
});

test('shuffle keeps every item', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(shuffle(items, seededRandom(3)).sort(), items);
});
