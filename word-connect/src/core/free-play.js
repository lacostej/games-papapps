// Scoring mode: one point per distinct dictionary word. Other modes (word grid,
// "find N words") can consume the same wheel output with different rules.
export class FreePlay {
  constructor(dictionary, puzzle) {
    this.dictionary = dictionary;
    this.puzzle = puzzle;
    this.found = [];
    this.score = 0;
  }

  // result: 'found' | 'duplicate' | 'invalid' | 'too-short' | 'ignored'
  submit(tiles) {
    const word = tiles.join('');
    if (tiles.length <= 1) return { result: 'ignored', word, points: 0 };
    if (tiles.length < this.dictionary.language.minWordLength) {
      return { result: 'too-short', word, points: 0 };
    }
    if (!this.dictionary.has(word)) return { result: 'invalid', word, points: 0 };
    if (this.found.includes(word)) return { result: 'duplicate', word, points: 0 };
    this.found.push(word);
    this.score += 1;
    return { result: 'found', word, points: 1 };
  }

  get total() {
    return this.puzzle.words.length;
  }
}
