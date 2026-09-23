// Language rules: how raw dictionary words become the tiles shown on the wheel.
export class Language {
  constructor({
    code,
    name,
    locale = code,
    minWordLength = 3,
    maxTiles = 7,
    stripDiacritics = true,
    replacements = {},
    digraphs = [],
  }) {
    this.code = code;
    this.name = name;
    this.locale = locale;
    this.minWordLength = minWordLength;
    this.maxTiles = maxTiles;
    this.stripDiacritics = stripDiacritics;
    this.replacements = replacements;
    // Longest first so greedy tiling prefers e.g. "IJ" over "I".
    this.digraphs = digraphs
      .map((d) => this.normalize(d))
      .sort((a, b) => b.length - a.length);
  }

  // "Été" -> "ETE", "cœur" -> "COEUR"; Turkish keeps "İ" when stripDiacritics is false.
  normalize(raw) {
    let word = raw.trim().toLocaleLowerCase(this.locale);
    for (const [from, to] of Object.entries(this.replacements)) {
      word = word.replaceAll(from, to);
    }
    if (this.stripDiacritics) {
      word = word.normalize('NFD').replace(/\p{M}/gu, '');
    }
    return word.normalize('NFC').toLocaleUpperCase(this.locale);
  }

  isPlayable(normalized) {
    return /^[\p{L}\p{M}]+$/u.test(normalized);
  }

  // Split a normalized word into wheel tiles (one letter, or a digraph such as Dutch "IJ").
  tiles(normalized) {
    const chars = Array.from(normalized);
    const tiles = [];
    let i = 0;
    while (i < chars.length) {
      const rest = chars.slice(i).join('');
      const digraph = this.digraphs.find((d) => rest.startsWith(d));
      if (digraph) {
        tiles.push(digraph);
        i += Array.from(digraph).length;
      } else {
        tiles.push(chars[i]);
        i += 1;
      }
    }
    return tiles;
  }
}
