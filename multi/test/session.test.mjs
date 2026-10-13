import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Host, Player } from '../src/core/session.js';
import { memoryListener } from '../src/core/memory.js';
import { GAMES } from '../src/games/index.js';

// A game where the answer is a guess of the dealt number: 5 points if right.
const guess = {
  defaults: { think: 10, answer: 20 },
  phases: ({ think, answer }) => [{ name: 'think', seconds: think }, { name: 'answer', seconds: answer, open: true }],
  deal: () => ({ n: 7 }),
  check: (deal, { n }) => ({ valid: true, value: n, score: n === deal.n ? 5 : 0 }),
  summary: (deal) => ({ best: deal.n }),
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(games = { guess }) {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const host = new Host({ games });
  const listener = memoryListener();
  host.listen(listener);
  const join = (id, name = id) => new Player(listener.connect(), { id, name });
  return { host, join };
}

test('players who join see each other in the lobby', async (t) => {
  t.after(() => mock.timers.reset());
  const { join } = setup();
  const ann = join('a', 'Ann');
  const bob = join('b', 'Bob');
  await flush();
  assert.deepEqual(ann.state.players.map((p) => p.name), ['Ann', 'Bob']);
  assert.equal(bob.state.phase, 'lobby');
});

test('a round: look, answer, results, scores, then the end of the series', async (t) => {
  t.after(() => mock.timers.reset());
  const { host, join } = setup();
  const ann = join('a');
  const bob = join('b');
  await flush();
  host.start([{ game: 'guess' }]);
  await flush();
  assert.equal(ann.state.round.phase, 'think');
  assert.deepEqual(ann.state.round.deal, { n: 7 });

  // Answers before the answer phase are ignored.
  ann.submit({ n: 7 });
  await flush();
  assert.equal(host.view().players[0].answered, false);

  mock.timers.tick(10_000);
  await flush();
  assert.equal(bob.state.round.phase, 'answer');
  assert.equal(bob.left, 20_000);
  mock.timers.tick(5_000);
  assert.equal(bob.left, 15_000);

  ann.submit({ n: 7 });
  await flush();
  assert.deepEqual(bob.state.players.map((p) => p.answered), [true, false]);
  assert.equal(bob.state.results, null, 'answers stay hidden during the round');

  bob.submit({ n: 3 });
  await flush();
  assert.equal(ann.state.phase, 'results', 'the round ends once everyone has answered');
  assert.deepEqual(ann.state.results.answers.map((a) => [a.id, a.score]), [['a', 5], ['b', 0]]);
  assert.equal(ann.state.results.best, 7);
  assert.deepEqual(ann.state.players.map((p) => p.score), [5, 0]);

  host.next();
  await flush();
  assert.equal(ann.state.phase, 'end');
});

test('the clock ends a round without answers, and a second answer is ignored', async (t) => {
  t.after(() => mock.timers.reset());
  const { host, join } = setup();
  const ann = join('a');
  join('b');
  await flush();
  host.start([{ game: 'guess', options: { think: 1, answer: 2 } }, { game: 'guess' }]);
  mock.timers.tick(1_000);
  await flush();
  ann.submit({ n: 7 });
  ann.submit({ n: 1 });
  await flush();
  mock.timers.tick(2_000);
  await flush();
  assert.equal(ann.state.phase, 'results');
  assert.deepEqual(ann.state.results.answers.map((a) => [a.score, Boolean(a.missing)]), [[5, false], [0, true]]);

  host.next();
  await flush();
  assert.equal(ann.state.round.index, 1);
  assert.equal(ann.state.round.seconds, 10, 'options left out take the defaults');
});

test('a player who drops out keeps their seat and score when they come back', async (t) => {
  t.after(() => mock.timers.reset());
  const { host, join } = setup();
  const ann = join('a');
  const bob = join('b');
  await flush();
  host.start([{ game: 'guess' }, { game: 'guess' }]);
  host.skip();
  await flush();

  bob.conn.close();
  await flush();
  assert.equal(bob.connected, false);
  assert.deepEqual(ann.state.players.map((p) => p.connected), [true, false]);

  // Bob never answered, but everyone still connected has: the round ends without him.
  ann.submit({ n: 7 });
  await flush();
  assert.equal(ann.state.phase, 'results');
  host.next();
  await flush();

  const back = join('b', 'Bobby');
  await flush();
  assert.equal(back.state.round.index, 1, 'a rejoining player gets the current round');
  assert.deepEqual(back.state.players.map((p) => [p.name, p.score, p.connected]), [['a', 5, true], ['Bobby', 0, true]]);
});

test('joining again from a second connection replaces the first', async (t) => {
  t.after(() => mock.timers.reset());
  const { host, join } = setup();
  const first = join('a');
  await flush();
  const second = join('a');
  await flush();
  assert.equal(first.connected, false);
  assert.equal(second.connected, true);
  assert.equal(host.view().players.length, 1);
  assert.equal(host.view().players[0].connected, true);
});

test('a removed player leaves the list and is disconnected', async (t) => {
  t.after(() => mock.timers.reset());
  const { host, join } = setup();
  const ann = join('a');
  const bob = join('b');
  await flush();
  host.remove('b');
  await flush();
  assert.equal(bob.connected, false);
  assert.deepEqual(ann.state.players.map((p) => p.id), ['a']);
});

test('numbers: the host replays the moves and scores the closest number made', async (t) => {
  t.after(() => mock.timers.reset());
  const { host, join } = setup(GAMES);
  const ann = join('a');
  const bob = join('b');
  await flush();
  host.start([{ game: 'numbers', options: { level: 'kids' } }]);
  host.skip();
  await flush();
  const { plates, target } = ann.state.round.deal;
  assert.equal(plates.length, 5);

  ann.submit({ moves: [[0, '+', 1]] });
  bob.submit({ moves: [[0, '+', 9]] });
  await flush();
  const [a, b] = ann.state.results.answers;
  const made = [plates[0] + plates[1], ...plates.slice(2)];
  const closest = made.reduce((x, y) => (Math.abs(y - target) < Math.abs(x - target) ? y : x));
  assert.equal(a.value, closest);
  assert.equal(a.score, Math.max(0, 10 - Math.abs(closest - target)));
  assert.deepEqual([b.valid, b.score], [false, 0], 'a move naming a missing number scores nothing');
  assert.ok(Number.isInteger(ann.state.results.best.value));
});
