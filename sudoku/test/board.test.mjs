import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../src/core/board.js';

const solution = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
const givens = [1, 0, 0, 4, 0, 0, 1, 0, 0, 1, 0, 0, 4, 0, 0, 1];

test('givens cannot be changed', () => {
  const b = new Board({ n: 4, givens, solution });
  assert.equal(b.set(0, 2), false);
  assert.equal(b.clear(0), false);
  assert.equal(b.values[0], 1);
  assert.equal(b.set(1, 2), true);
  assert.equal(b.set(1, 2), false);
});

test('conflicts flag both cells of a repeat in a row, column or box', () => {
  const b = new Board({ n: 4, givens, solution });
  b.set(1, 4);
  assert.deepEqual([...b.conflicts()].sort((x, y) => x - y), [1, 3]);
  b.set(1, 3);
  b.set(5, 3);
  assert.deepEqual([...b.conflicts()].sort((x, y) => x - y), [1, 5]);
});

test('solved needs every cell filled without conflicts; restart keeps only the givens', () => {
  const b = new Board({ n: 4, givens, solution });
  solution.forEach((v, i) => b.set(i, v));
  assert.equal(b.solved, true);
  assert.deepEqual(b.counts(), [0, 4, 4, 4, 4]);
  b.set(1, 3);
  assert.equal(b.filled, true);
  assert.equal(b.solved, false);
  b.restart();
  assert.deepEqual(b.values, givens);
});

test('a saved board restores its progress', () => {
  const b = new Board({ n: 4, level: 'easy', givens, solution });
  b.set(1, 2);
  const copy = new Board(JSON.parse(JSON.stringify(b)));
  assert.deepEqual(copy.values, b.values);
  assert.deepEqual(copy.givens, givens);
  assert.equal(copy.level, 'easy');
});

test('notes toggle on empty cells only', () => {
  const b = new Board({ n: 4, givens, solution });
  assert.equal(b.toggleNote(0, 2), false);
  assert.equal(b.toggleNote(1, 2), true);
  b.toggleNote(1, 3);
  assert.equal(b.hasNote(1, 2), true);
  b.toggleNote(1, 2);
  assert.equal(b.hasNote(1, 2), false);
  assert.equal(b.hasNote(1, 3), true);
  b.set(1, 2);
  assert.equal(b.toggleNote(1, 4), false);
});

test('placing a value clears its cell notes and that value from peer notes only', () => {
  const b = new Board({ n: 4, givens, solution });
  for (const i of [1, 2, 5, 13, 10]) {
    b.toggleNote(i, 2);
    b.toggleNote(i, 3);
  }
  b.set(1, 2);
  assert.equal(b.notes[1], 0);
  // 2 (same row), 5 (same box), 13 (same column) are peers; 10 is not.
  for (const i of [2, 5, 13]) assert.deepEqual([b.hasNote(i, 2), b.hasNote(i, 3)], [false, true]);
  assert.deepEqual([b.hasNote(10, 2), b.hasNote(10, 3)], [true, true]);
});

test('erase empties a value first, then the notes; restart drops notes', () => {
  const b = new Board({ n: 4, givens, solution });
  b.toggleNote(1, 3);
  b.toggleNote(2, 3);
  b.set(2, 2);
  assert.equal(b.clear(2), true);
  assert.equal(b.values[2], 0);
  assert.equal(b.clear(1), true);
  assert.equal(b.notes[1], 0);
  assert.equal(b.clear(1), false);
  b.toggleNote(1, 4);
  b.restart();
  assert.ok(b.notes.every((m) => m === 0));
});

test('notes survive a save, and saves without notes still load', () => {
  const b = new Board({ n: 4, givens, solution });
  b.toggleNote(1, 3);
  assert.equal(new Board(JSON.parse(JSON.stringify(b))).hasNote(1, 3), true);
  const { notes, ...old } = b.toJSON();
  assert.equal(new Board(old).notes.length, 16);
});
