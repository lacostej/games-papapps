import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Language } from '../src/core/language.js';
import { WordIndex } from '../src/core/word-index.js';

const fr = new Language({ code: 'fr' });

function index(targets, bonus = []) {
  const idx = new WordIndex(fr);
  for (const w of targets) idx.add(fr.normalize(w), { target: true });
  for (const w of bonus) idx.add(fr.normalize(w));
  return idx;
}

test('lookup splits words spellable from the tiles into targets and bonus', () => {
  const idx = index(['rame', 'mare', 'arme', 'amer', 'mer'], ['ramé', 'mar', 'marée']);
  assert.deepEqual(idx.lookup(['R', 'A', 'M', 'E']), {
    words: ['MER', 'AMER', 'ARME', 'MARE', 'RAME'],
    bonus: ['MAR'],
  });
});

test('lookup uses each tile at most once and honours repeated tiles', () => {
  const idx = index(['été', 'tee', 'tete']);
  assert.deepEqual(idx.lookup(['E', 'T', 'E']).words, ['ETE', 'TEE']);
  assert.deepEqual(idx.lookup(['E', 'T', 'E', 'T']).words, ['ETE', 'TEE', 'TETE']);
});

test('a word stays a target when also added as bonus', () => {
  const idx = index(['trie'], ['trié', 'triées']);
  assert.deepEqual(idx.get('TRIE'), { target: true });
  assert.deepEqual(idx.get('TRIEES'), { target: false });
});

test('add rejects words that cannot go on a wheel', () => {
  const idx = new WordIndex(fr);
  assert.equal(idx.add('LE'), false);
  assert.equal(idx.add('ANTICONSTITUTION'), false);
  assert.equal(idx.add("AUJOURD'HUI"), false);
  assert.equal(idx.add('TRIEES'), true);
});
