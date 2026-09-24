// Drawing steps, in order: base, post, beam, rope, head, body, two arms, two legs.
export const PARTS = 10;

// Easier levels start from an empty drawing; harder ones start with the gallows up.
export const LEVELS = {
  easy: { lives: 10, hint: true },
  medium: { lives: 8, hint: true },
  hard: { lives: 6, hint: false },
};

// "é" -> "E": the keyboard has plain letters only.
export function baseLetter(ch) {
  return ch.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
}

export class Hangman {
  constructor({ word, category, lives, guesses = [] }) {
    this.word = word;
    this.category = category;
    this.lives = lives;
    this.letters = [...word].map(baseLetter);
    this.guesses = [];
    for (const letter of guesses) this.guess(letter);
  }

  // Returns 'hit', 'miss', 'repeat', or 'over' once the game has ended.
  guess(letter) {
    if (this.over) return 'over';
    const l = baseLetter(letter);
    if (this.guesses.includes(l)) return 'repeat';
    this.guesses.push(l);
    return this.letters.includes(l) ? 'hit' : 'miss';
  }

  isRevealed(i) {
    return this.guesses.includes(this.letters[i]);
  }

  get misses() {
    return this.guesses.filter((l) => !this.letters.includes(l)).length;
  }

  get won() {
    return this.letters.every((l) => this.guesses.includes(l));
  }

  get lost() {
    return !this.won && this.misses >= this.lives;
  }

  get over() {
    return this.won || this.lost;
  }

  toJSON() {
    const { word, category, lives, guesses } = this;
    return { word, category, lives, guesses };
  }
}

// A random word of the language, not `avoid` (the previous one).
export function pickWord(categories, code, { random = Math.random, avoid } = {}) {
  const all = categories.flatMap((c) => c[code].map((word) => ({ word, category: c.id })));
  const choices = all.length > 1 ? all.filter((e) => e.word !== avoid) : all;
  return choices[Math.floor(random() * choices.length)];
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
