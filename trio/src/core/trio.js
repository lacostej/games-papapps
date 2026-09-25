// Cards are 0..80; their base-3 digits are the four features (number, shape, shading, colour),
// each 0, 1 or 2. Three cards are a trio when every feature is all same or all different,
// which is exactly when each feature's values add up to a multiple of 3.
export const FEATURES = ['number', 'shape', 'shading', 'color'];
export const TABLE_SIZE = 12;

export function feature(card, f) {
  return Math.floor(card / 3 ** f) % 3;
}

export function features(card) {
  return FEATURES.map((_, f) => feature(card, f));
}

export function isTrio(a, b, c) {
  if (a === b || b === c || a === c) return false;
  return FEATURES.every((_, f) => (feature(a, f) + feature(b, f) + feature(c, f)) % 3 === 0);
}

// The only card that makes a trio with a and b.
export function third(a, b) {
  let card = 0;
  for (let f = 0; f < FEATURES.length; f++) card += ((6 - feature(a, f) - feature(b, f)) % 3) * 3 ** f;
  return card;
}

// Positions of one trio among the cards (nulls are empty slots), or null.
export function findTrio(cards) {
  const at = new Map(cards.map((c, i) => [c, i]).filter(([c]) => c !== null));
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i] === null || cards[j] === null) continue;
      const k = at.get(third(cards[i], cards[j]));
      if (k !== undefined && k > j) return [i, j, k];
    }
  }
  return null;
}

export function shuffled(random = Math.random) {
  const deck = [...Array(81).keys()];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// One solo game through the deck. The table keeps its layout: found cards are replaced in
// place, and extra rows added when there was no trio are removed first.
export class Game {
  constructor({ deck = shuffled(), table = [], found = 0 } = {}) {
    this.deck = [...deck];
    this.table = [...table];
    this.found = found;
    if (!this.table.length) this.#deal();
  }

  get over() {
    return !this.deck.length && !findTrio(this.table);
  }

  // Returns true and updates the table when the three positions hold a trio.
  claim(positions) {
    const [a, b, c] = positions.map((i) => this.table[i]);
    if (new Set(positions).size !== 3 || !isTrio(a, b, c)) return false;
    this.found++;
    const extra = this.table.length > TABLE_SIZE;
    for (const i of positions) this.table[i] = extra || !this.deck.length ? null : this.deck.pop();
    // Close the gaps: the last cards move into the emptied slots, so no hole remains.
    for (const i of [...positions].sort((x, y) => x - y)) {
      if (this.table[i] !== null) continue;
      while (this.table.length && this.table.at(-1) === null) this.table.pop();
      if (i < this.table.length) this.table[i] = this.table.pop();
    }
    this.#deal();
    return true;
  }

  hint() {
    return findTrio(this.table);
  }

  // Fill to twelve, then add three at a time while there is no trio and cards remain.
  // `added` counts the cards dealt beyond twelve by the last deal.
  #deal() {
    while (this.table.length < TABLE_SIZE && this.deck.length) this.table.push(this.deck.pop());
    this.added = 0;
    while (!findTrio(this.table) && this.deck.length) {
      for (let n = 0; n < 3 && this.deck.length; n++, this.added++) this.table.push(this.deck.pop());
    }
  }

  toJSON() {
    const { deck, table, found } = this;
    return { deck, table, found };
  }
}

// Small deterministic generator for tests.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
