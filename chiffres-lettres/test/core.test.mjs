import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestWords, canSpell, commonFirst, drawLetter } from '../src/core/letters.js';
import { apply, Calculation, drawNumbers, numbersScore, PLATES, solve } from '../src/core/numbers.js';
import { lettersScore, roundKind } from '../src/core/session.js';

const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('canSpell uses each letter at most once', () => {
  assert.equal(canSpell('BALLE', [...'ABELLX']), true);
  assert.equal(canSpell('BALLE', [...'ABELX']), false);
});

test('bestWords returns every word of the greatest length', () => {
  assert.deepEqual(bestWords(['AB', 'BAC', 'CAB', 'ABCD', 'ZZZ'], [...'ABC']), ['BAC', 'CAB']);
  assert.deepEqual(bestWords(['XY'], [...'ABC']), []);
});

test('commonFirst puts common words ahead, keeping their order', () => {
  assert.deepEqual(commonFirst(['KAMSEENS', 'MANTISES', 'EMPRIZES', 'MISTAKEN'], new Set(['MISTAKEN', 'MANTISES'])), ['MANTISES', 'MISTAKEN', 'KAMSEENS', 'EMPRIZES']);
});

test('drawLetter follows the weights', () => {
  const random = seeded(7);
  const counts = { A: 0, B: 0 };
  for (let i = 0; i < 4000; i++) counts[drawLetter({ A: 3, B: 1 }, random)]++;
  assert.ok(counts.A / counts.B > 2.5 && counts.A / counts.B < 3.5, JSON.stringify(counts));
});

test('apply refuses negative, zero and fractional results', () => {
  assert.equal(apply(7, '-', 3), 4);
  assert.equal(apply(3, '-', 7), null);
  assert.equal(apply(3, '-', 3), null);
  assert.equal(apply(9, '÷', 3), 3);
  assert.equal(apply(10, '÷', 4), null);
  assert.equal(apply(6, '×', 7), 42);
});

test('drawNumbers takes six plates from the pool and a target of 100-999', () => {
  const random = seeded(3);
  for (let k = 0; k < 200; k++) {
    const { plates, target } = drawNumbers(random);
    assert.equal(plates.length, 6);
    assert.ok(target >= 100 && target <= 999);
    const pool = [...PLATES];
    for (const p of plates) pool.splice(pool.indexOf(p), 1);
    assert.equal(pool.length, PLATES.length - 6, `plates drawn more often than they exist: ${plates}`);
  }
});

// Replays a solution with the plates it may use, so an illegal or wrong step fails.
function replay(plates, steps) {
  const left = [...plates];
  let last;
  for (const { a, op, b, result } of steps) {
    for (const n of [a, b]) {
      const i = left.indexOf(n);
      assert.ok(i >= 0, `${n} not available in ${left}`);
      left.splice(i, 1);
    }
    assert.equal(apply(a, op, b), result);
    left.push(result);
    last = result;
  }
  return last;
}

test('solve finds the famous 952, with legal steps', () => {
  const plates = [25, 50, 75, 100, 3, 6];
  const { value, steps } = solve(plates, 952);
  assert.equal(value, 952);
  assert.equal(replay(plates, steps), 952);
});

test('solve prefers the shortest exact answer', () => {
  assert.deepEqual(solve([100, 2, 1, 1, 1, 1], 200).steps.length, 1);
  assert.deepEqual(solve([500, 1, 1, 1, 1, 1], 500), { value: 500, steps: [] });
});

test('solve results replay correctly on random draws, and are never beaten by a plate', () => {
  const random = seeded(11);
  for (let k = 0; k < 40; k++) {
    const { plates, target } = drawNumbers(random);
    const { value, steps } = solve(plates, target);
    if (steps.length) assert.equal(replay(plates, steps), value);
    for (const p of plates) assert.ok(Math.abs(value - target) <= Math.abs(p - target));
  }
});

test('an impossible target gives the closest value', () => {
  // Six ones reach at most (1+1+1)×(1+1+1).
  const { value } = solve([1, 1, 1, 1, 1, 1], 999);
  assert.equal(value, 9);
});

test('a calculation combines, undoes and announces the closest number', () => {
  const calc = new Calculation([25, 50, 3]);
  assert.equal(calc.combine(0, '-', 1), null);
  const made = calc.combine(1, '+', 0);
  assert.equal(made.value, 75);
  assert.equal(calc.combine(made.id, '×', 2).value, 225);
  assert.equal(calc.closest(200), 225);
  calc.undo();
  assert.deepEqual(calc.numbers.map((n) => n.value).sort((a, b) => a - b), [3, 75]);
  calc.undo();
  assert.deepEqual(calc.numbers.map((n) => n.value), [25, 50, 3]);
  assert.equal(calc.closest(20), 25);
});

test('numbers score 10 when exact, one less per unit away', () => {
  assert.equal(numbersScore(500, 500), 10);
  assert.equal(numbersScore(497, 500), 7);
  assert.equal(numbersScore(400, 500), 0);
});

test('both mode plays one numbers round then two letters rounds', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => roundKind('both', i)), ['numbers', 'letters', 'letters', 'numbers', 'letters', 'letters']);
  assert.equal(roundKind('letters', 4), 'letters');
});

test('a letters answer scores its length only if it is a word the letters make', () => {
  const words = new Set(['MAISON']);
  const isWord = (w) => words.has(w);
  assert.equal(lettersScore('MAISON', [...'MAISONXYZW'], isWord, canSpell), 6);
  assert.equal(lettersScore('MAISON', [...'MAISXYZWQT'], isWord, canSpell), 0);
  assert.equal(lettersScore('MOISAN', [...'MAISONXYZW'], isWord, canSpell), 0);
  assert.equal(lettersScore('', [...'MAISONXYZW'], isWord, canSpell), 0);
});
