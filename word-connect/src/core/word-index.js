// Words indexed by their sorted tiles, so the words a wheel can spell are found by
// looking up each sub-multiset of its tiles (at most 2^7 lookups) instead of scanning.
export class WordIndex {
  #bySignature = new Map(); // signature -> Map(word -> { target })

  constructor(language) {
    this.language = language;
  }

  // Adds a normalized word; returns false when it can't go on a wheel.
  // A word added as a target stays a target even if later added as bonus.
  add(word, { target = false } = {}) {
    if (!this.language.isPlayable(word)) return false;
    const tiles = this.language.tiles(word);
    if (tiles.length < this.language.minWordLength || tiles.length > this.language.maxTiles) return false;
    const signature = signatureOf(tiles);
    let words = this.#bySignature.get(signature);
    if (!words) this.#bySignature.set(signature, (words = new Map()));
    const entry = words.get(word);
    if (entry) entry.target ||= target;
    else words.set(word, { target });
    return true;
  }

  // Keep a word playable but never required (rare, foreign, rude...).
  demote(word) {
    const entry = this.get(word);
    if (entry) entry.target = false;
    return Boolean(entry);
  }

  delete(word) {
    return this.#bySignature.get(signatureOf(this.language.tiles(word)))?.delete(word) ?? false;
  }

  get(word) {
    return this.#bySignature.get(signatureOf(this.language.tiles(word)))?.get(word);
  }

  *entries() {
    for (const words of this.#bySignature.values()) yield* words;
  }

  // Every word spellable with the tiles (each used at most once), split by tier.
  lookup(tiles) {
    const targets = [];
    const bonus = [];
    for (const signature of subSignatures(tiles, this.language.minWordLength)) {
      for (const [word, { target }] of this.#bySignature.get(signature) ?? []) {
        (target ? targets : bonus).push(word);
      }
    }
    return { words: this.#sort(targets), bonus: this.#sort(bonus) };
  }

  #sort(words) {
    const { language } = this;
    return words.sort(
      (a, b) => language.tiles(a).length - language.tiles(b).length || a.localeCompare(b, language.locale),
    );
  }
}

function signatureOf(tiles) {
  return [...tiles].sort().join('|');
}

function subSignatures(tiles, minLength) {
  const counts = new Map();
  for (const t of tiles) counts.set(t, (counts.get(t) ?? 0) + 1);
  const distinct = [...counts.keys()].sort();
  const out = [];
  const walk = (i, picked) => {
    if (i === distinct.length) {
      if (picked.length >= minLength) out.push(picked.join('|'));
      return;
    }
    for (let n = 0; n <= counts.get(distinct[i]); n++) {
      walk(i + 1, [...picked, ...Array(n).fill(distinct[i])]);
    }
  };
  walk(0, []);
  return out;
}
