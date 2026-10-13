import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combine, describe, fromMoves, fromSteps, solutions } from '../src/core/methods.js';

const card = (v) => fromMoves([v], [], v);
const PLATES = [7, 9, 1, 5, 50, 6];

test('regrouping the same cards gives the same tree', () => {
  const [a, b, c] = [25, 4, 2].map(card);
  const keys = [combine(combine(a, '×', b), '×', c), combine(combine(a, '×', c), '×', b), combine(a, '×', combine(b, '×', c))].map((e) => e.key);
  assert.equal(new Set(keys).size, 1);
});

test('solutions are grouped into methods: 7 9 1 5 50 6 → 187', () => {
  const sols = solutions(PLATES, 187);
  assert.equal(sols.length, 16);
  assert.equal(new Set(sols.map((s) => s.family)).size, 10);
  const methods = (last) => [...new Set(sols.filter((s) => s.last === last).map((s) => s.family))].sort();
  assert.deepEqual(methods('180 + 7'), ['((50 − 14) × 5) + 7', '((50 − 30) × 9) + 7', '((50 − 5) × 4) + 7']);
  assert.ok(sols.every((s) => s.v === 187));
});

test('making the small part differently stays one method; distributing does not', () => {
  const families = new Map();
  for (const s of solutions([10, 5, 3, 8, 1, 100], 848)) families.set(s.family, (families.get(s.family) ?? 0) + 1);
  assert.equal(families.get('(100 + 6) × 8'), 8);
  assert.equal(families.get('(100 × 8) + 48'), 3);
});

test("the player's moves and the computer's steps rebuild the same solution", () => {
  // Ids: plates 0-5, then one per move.
  const player = fromMoves(PLATES, [[1, '-', 3], [6, '×', 4], [7, '-', 5], [8, '-', 0]], 187);
  const computer = fromSteps(PLATES, [{ a: 9, op: '-', b: 5 }, { a: 4, op: '×', b: 50 }, { a: 200, op: '-', b: 6 }, { a: 194, op: '-', b: 7 }], 187);
  assert.equal(player.key, computer.key);
  assert.equal(describe(player).family, '(50 × 4) − 13');
  assert.ok(solutions(PLATES, 187).some((s) => s.key === player.key));
});

test('an announced number is the one left over, or a card', () => {
  // 50 + 6 = 56 is announced; 56 − 1 = 55 was made from an earlier 56 and is not.
  assert.equal(fromMoves(PLATES, [[4, '+', 5]], 56).v, 56);
  assert.equal(fromMoves(PLATES, [[4, '+', 5], [6, '-', 2]], 56), undefined);
  assert.equal(fromMoves(PLATES, [], 50).key, '50');
});
