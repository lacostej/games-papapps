import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Host, Player } from '../src/core/session.js';
import { memoryListener } from '../src/core/memory.js';
import { GAMES } from '../src/games/index.js';
import { findTrio, isTrio, seededRandom } from '../../trio/src/core/trio.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

async function setup(options = {}) {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const host = new Host({ games: GAMES, random: seededRandom(3) });
  const listener = memoryListener();
  host.listen(listener);
  const ann = new Player(listener.connect(), { id: 'a', name: 'Ann' });
  const bob = new Player(listener.connect(), { id: 'b', name: 'Bob' });
  await flush();
  host.start([{ game: 'trio', options }]);
  await flush();
  return { host, ann, bob };
}

const table = (player) => player.state.round.deal.table;
const aTrio = (player) => findTrio(table(player)).map((i) => table(player)[i]);
const notATrio = (player) => {
  const cards = table(player).filter((c) => c !== null);
  for (const a of cards) for (const b of cards) for (const c of cards) if (a < b && b < c && !isTrio(a, b, c)) return [a, b, c];
};
const me = (player) => player.state.players.find((p) => p.id === player.id);

test('players see the table but not the order of the deck', async (t) => {
  t.after(() => mock.timers.reset());
  const { ann } = await setup();
  assert.equal(table(ann).length, 12);
  assert.equal(ann.state.round.deal.deck, 69);
  assert.equal(ann.state.round.seconds, 180);
});

test('the first claim scores; the same cards a moment later are too late', async (t) => {
  t.after(() => mock.timers.reset());
  const { ann, bob } = await setup();
  const cards = aTrio(ann);
  ann.submit({ cards });
  bob.submit({ cards });
  await flush();
  assert.equal(me(ann).score, 1);
  assert.equal(me(bob).score, 0);
  assert.equal(bob.state.round.last.result, 'late');
  assert.ok(cards.every((c) => !table(bob).includes(c)), 'the cards left the table');
  assert.equal(bob.state.round.deal.deck, 66);
});

test('a wrong claim freezes the player for 3 s, then claims count again', async (t) => {
  t.after(() => mock.timers.reset());
  const { ann } = await setup();
  ann.submit({ cards: notATrio(ann) });
  await flush();
  assert.equal(ann.state.round.last.result, 'wrong');
  assert.equal(me(ann).frozen, 3000);
  ann.submit({ cards: aTrio(ann) });
  await flush();
  assert.equal(me(ann).score, 0, 'ignored while frozen');
  mock.timers.tick(3000);
  ann.submit({ cards: aTrio(ann) });
  await flush();
  assert.equal(me(ann).score, 1);
});

test('the other penalties: a point, or nothing', async (t) => {
  t.after(() => mock.timers.reset());
  for (const [wrong, score] of [['point', -1], ['none', 0]]) {
    const { host, ann } = await setup({ wrong });
    ann.submit({ cards: notATrio(ann) });
    await flush();
    assert.equal(me(ann).score, score, wrong);
    assert.equal(me(ann).frozen, 0, wrong);
    host.close();
    mock.timers.reset();
  }
});

test('the time limit ends the round; points join the scores', async (t) => {
  t.after(() => mock.timers.reset());
  const { ann } = await setup({ end: 'time-2' });
  ann.submit({ cards: aTrio(ann) });
  await flush();
  mock.timers.tick(120_000);
  await flush();
  assert.equal(ann.state.phase, 'results');
  const answer = ann.state.results.answers.find((a) => a.id === 'a');
  assert.deepEqual([answer.found, answer.wrong, answer.score], [1, 0, 1]);
  assert.equal(me(ann).score, 1);
});

test('first to N trios ends the round', async (t) => {
  t.after(() => mock.timers.reset());
  const { ann, bob } = await setup({ end: 'first-5' });
  assert.equal(ann.state.round.seconds, null);
  for (let i = 0; i < 4; i++) {
    ann.submit({ cards: aTrio(ann) });
    await flush();
  }
  bob.submit({ cards: aTrio(bob) });
  await flush();
  assert.equal(ann.state.phase, 'round');
  ann.submit({ cards: aTrio(ann) });
  await flush();
  assert.equal(ann.state.phase, 'results');
  assert.deepEqual(ann.state.players.map((p) => [p.name, p.score]), [['Ann', 5], ['Bob', 1]]);
});

test('with no limit the round ends when the deck is cleared', async (t) => {
  t.after(() => mock.timers.reset());
  const { ann } = await setup({ end: 'deck' });
  let claims = 0;
  while (ann.state.phase === 'round') {
    ann.submit({ cards: aTrio(ann) });
    await flush();
    claims++;
  }
  assert.equal(ann.state.phase, 'results');
  assert.equal(me(ann).score, claims);
  assert.ok(claims >= 20 && claims <= 27, `${claims} trios`);
});

test('a player who drops out keeps the round points on rejoining', async (t) => {
  t.after(() => mock.timers.reset());
  const { host, bob } = await setup();
  bob.submit({ cards: aTrio(bob) });
  await flush();
  bob.conn.close();
  await flush();
  const listener = memoryListener();
  host.listen(listener);
  const back = new Player(listener.connect(), { id: 'b', name: 'Bob' });
  await flush();
  assert.equal(me(back).score, 1);
  assert.equal(me(back).found, 1);
});

test('malformed claims change nothing', async (t) => {
  t.after(() => mock.timers.reset());
  const { ann } = await setup();
  const before = JSON.stringify(ann.state.round);
  for (const answer of [null, {}, { cards: [1, 2] }, { cards: [1, 1, 2] }, { cards: 'abc' }]) ann.submit(answer);
  await flush();
  assert.equal(JSON.stringify(ann.state.round), before);
});
