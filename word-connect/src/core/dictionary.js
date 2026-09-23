export class Dictionary {
  #entries = new Map(); // normalized word -> tiles

  constructor(language, rawWords = []) {
    this.language = language;
    for (const raw of rawWords) this.add(raw);
  }

  // One word per line; blank lines and "#" comments are ignored.
  static fromText(language, text) {
    return new Dictionary(language, parseWordList(text));
  }

  add(raw) {
    const word = this.language.normalize(raw);
    if (!this.language.isPlayable(word)) return;
    const tiles = this.language.tiles(word);
    if (tiles.length > this.language.maxTiles) return;
    this.#entries.set(word, tiles);
  }

  get size() {
    return this.#entries.size;
  }

  has(word) {
    return this.#entries.has(word);
  }

  words() {
    return this.#entries.keys();
  }

  // Every word spellable with the given tiles, each tile used at most once.
  wordsFrom(tiles, minLength = this.language.minWordLength) {
    const available = countTiles(tiles);
    const found = [];
    for (const [word, wordTiles] of this.#entries) {
      if (wordTiles.length < minLength || wordTiles.length > tiles.length) continue;
      if (fits(wordTiles, available)) found.push(word);
    }
    const locale = this.language.locale;
    return found.sort(
      (a, b) =>
        this.#entries.get(a).length - this.#entries.get(b).length ||
        a.localeCompare(b, locale),
    );
  }
}

export function parseWordList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function countTiles(tiles) {
  const counts = new Map();
  for (const t of tiles) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

function fits(wordTiles, available) {
  const used = new Map();
  for (const t of wordTiles) {
    const n = (used.get(t) ?? 0) + 1;
    if (n > (available.get(t) ?? 0)) return false;
    used.set(t, n);
  }
  return true;
}
