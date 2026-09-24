import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseLetter, Hangman, pickWord, seededRandom } from '../src/core/hangman.js';

test('baseLetter strips accents and upper-cases', () => {
  assert.deepEqual(['é', 'è', 'ê', 'ç', 'î', 'a'].map(baseLetter), ['E', 'E', 'E', 'C', 'I', 'A']);
});

test('a plain letter reveals every accented form of it', () => {
  const g = new Hangman({ word: 'fenêtre', lives: 6 });
  assert.equal(g.guess('e'), 'hit');
  assert.deepEqual([...g.word].map((_, i) => g.isRevealed(i)), [false, true, false, true, false, false, true]);
});

test('guesses count misses once and end the game on a win', () => {
  const g = new Hangman({ word: 'zebra', lives: 6 });
  assert.equal(g.guess('x'), 'miss');
  assert.equal(g.guess('X'), 'repeat');
  assert.equal(g.misses, 1);
  for (const l of 'zebr') assert.equal(g.guess(l), 'hit');
  assert.equal(g.won, false);
  assert.equal(g.guess('a'), 'hit');
  assert.equal(g.won, true);
  assert.equal(g.guess('q'), 'over');
  assert.equal(g.misses, 1);
});

test('running out of lives loses, and the last right letter cannot rescue it', () => {
  const g = new Hangman({ word: 'lion', lives: 3 });
  g.guess('l');
  for (const l of 'xyz') g.guess(l);
  assert.equal(g.lost, true);
  assert.equal(g.guess('i'), 'over');
});

test('a saved game replays its guesses', () => {
  const g = new Hangman({ word: 'tiger', category: 'animals', lives: 8 });
  g.guess('t');
  g.guess('q');
  const copy = new Hangman(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(copy.guesses, ['T', 'Q']);
  assert.equal(copy.misses, 1);
  assert.equal(copy.category, 'animals');
});

test('pickWord never repeats the previous word', () => {
  const categories = [{ id: 'a', en: ['one', 'two'] }];
  const random = seededRandom(1);
  for (let i = 0; i < 20; i++) assert.equal(pickWord(categories, 'en', { random, avoid: 'one' }).word, 'two');
  assert.deepEqual(pickWord(categories, 'en', { random: () => 0 }), { word: 'one', category: 'a' });
});
