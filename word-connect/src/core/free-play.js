// Scoring mode: one point per distinct valid word, whether required or bonus. Other
// modes (word grid, "find N words") can consume the same wheel output with other rules.
export class FreePlay {
  #words;
  #bonus;

  constructor(puzzle) {
    this.puzzle = puzzle;
    this.found = [];
    this.bonusFound = [];
    this.score = 0;
    this.#words = new Set(puzzle.words);
    this.#bonus = new Set(puzzle.bonus);
  }

  // result: 'found' | 'bonus' | 'duplicate' | 'invalid' | 'too-short' | 'ignored'
  submit(tiles) {
    const word = tiles.join('');
    if (tiles.length <= 1) return { result: 'ignored', word, points: 0 };
    if (tiles.length < this.puzzle.minWordLength) return { result: 'too-short', word, points: 0 };
    if (this.found.includes(word) || this.bonusFound.includes(word)) {
      return { result: 'duplicate', word, points: 0 };
    }
    if (this.#words.has(word)) {
      this.found.push(word);
    } else if (this.#bonus.has(word)) {
      this.bonusFound.push(word);
    } else {
      return { result: 'invalid', word, points: 0 };
    }
    this.score += 1;
    return { result: this.#words.has(word) ? 'found' : 'bonus', word, points: 1 };
  }

  get total() {
    return this.puzzle.words.length;
  }
}
