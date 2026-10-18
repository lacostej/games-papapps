// Trio as a race: everyone plays on the same table, and the first valid claim for three cards
// scores. A live game: the host applies each claim as it arrives instead of collecting one
// answer per player.
import { Game, shuffled } from '../../../trio/src/core/trio.js';

export const ENDS = ['time-2', 'time-3', 'time-5', 'first-5', 'first-10', 'deck'];
export const PENALTIES = ['freeze', 'point', 'none'];
export const FREEZE_MS = 3000;

// 'time-3' → ['time', 3]; 'deck' → ['deck', NaN].
const kind = (end) => [end.split('-')[0], Number(end.split('-')[1])];

export default {
  id: 'trio',
  live: true,
  defaults: { end: 'time-3', wrong: 'freeze' },

  // One open phase; with no time limit it lasts until ended() says so or the host ends it.
  phases: ({ end }) => {
    const [k, minutes] = kind(end);
    return [{ name: 'play', seconds: k === 'time' ? minutes * 60 : null, open: true }];
  },

  deal: (options, random) => new Game({ deck: shuffled(random) }).toJSON(),

  // What players see: the deck's order stays with the host.
  view: ({ table, deck, found }) => ({ table, deck: deck.length, found }),

  // answer: { cards: [a, b, c] }, the cards themselves, so a claim for cards another player
  // took first is "late" rather than a claim on whatever replaced them.
  act(deal, answer, { wrong }) {
    const cards = answer?.cards;
    if (!Array.isArray(cards) || cards.length !== 3 || new Set(cards).size !== 3) return { deal, result: 'invalid' };
    const game = new Game(deal);
    const positions = cards.map((c) => game.table.indexOf(c));
    if (positions.includes(-1)) return { deal, result: 'late' };
    if (!game.claim(positions)) return { deal, result: 'wrong', points: wrong === 'point' ? -1 : 0, freeze: wrong === 'freeze' ? FREEZE_MS : 0 };
    return { deal: game.toJSON(), result: 'found', points: 1 };
  },

  // players: [{ found }] for this round.
  ended(deal, { end }, players) {
    const [k, target] = kind(end);
    return new Game(deal).over || (k === 'first' && players.some((p) => p.found >= target));
  },

  summary: () => ({}),
};
