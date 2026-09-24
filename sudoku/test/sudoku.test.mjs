import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, geometry, grade, LEVELS, LEVELS_BY_SIZE, seededRandom, solve, solveLogically, TECHNIQUES } from '../src/core/sudoku.js';

const parse = (s) => [...s].map(Number);

test('geometry lays out 2x3 boxes on 6x6 grids', () => {
  const g = geometry(6);
  assert.deepEqual(g.boxes[0], [0, 1, 2, 6, 7, 8]);
  assert.deepEqual(g.boxes[1], [3, 4, 5, 9, 10, 11]);
  assert.deepEqual(g.boxes[5], [27, 28, 29, 33, 34, 35]);
  assert.equal(g.peers[0].length, 6 - 1 + 6 - 1 + 2);
});

test('solve counts solutions up to the limit and rejects clashing givens', () => {
  assert.equal(solve(new Array(16).fill(0), 4, { limit: 2 }), 2);
  assert.equal(solve(parse('1100' + '0'.repeat(12)), 4, { limit: 2 }), 0);
  const wikipedia = parse('530070000600195000098000060800060003400803001700020006060000280000419005000080079');
  let solution;
  assert.equal(solve(wikipedia, 9, { limit: 2, onSolution: (s) => (solution = s) }), 1);
  assert.equal(solution.join(''), '534678912672195348198342567859761423426853791713924856961537284287419635345286179');
});

test('grade separates singles from puzzles that need more', () => {
  const wikipedia = parse('530070000600195000098000060800060003400803001700020006060000280000419005000080079');
  assert.equal(grade(wikipedia, 9), TECHNIQUES.singles);
  const inkala = parse('800000000003600000070090200050007000000045700000100030001000068008500010090000400');
  assert.equal(solve(inkala, 9, { limit: 2 }), 1);
  assert.equal(grade(inkala, 9), TECHNIQUES.advanced);
});

for (const n of [4, 6, 9]) {
  for (const level of LEVELS_BY_SIZE[n]) {
    test(`${n}x${n} ${level} puzzles are unique, graded at their level, and solved correctly by logic`, () => {
      const random = seededRandom(n * 100 + level.length);
      for (let k = 0; k < 5; k++) {
        const p = generate(n, level, { random });
        assert.ok(p, 'generated');
        assert.equal(solve(p.givens, n, { limit: 2 }), 1);
        assert.ok(p.givens.every((v, i) => v === 0 || v === p.solution[i]));
        const { level: needed, values } = solveLogically(p.givens, n);
        const plan = LEVELS[level];
        assert.ok(needed <= plan.max, `needs ${needed}`);
        if (plan.need) assert.equal(needed, plan.need);
        // Any wrong elimination would show up as a wrong placement.
        assert.ok(values.every((v, i) => v === 0 || v === p.solution[i]));
        if (needed < TECHNIQUES.advanced) assert.deepEqual(values, p.solution);
        if (plan.keep) assert.equal(p.givens.filter(Boolean).length, Math.round(plan.keep * n * n));
      }
    });
  }
}

test('generate gives up on levels a size cannot reach', () => {
  assert.equal(generate(4, 'hard', { random: seededRandom(1), attempts: 20 }), null);
});
