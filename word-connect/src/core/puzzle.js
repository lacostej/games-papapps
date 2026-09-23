// A puzzle is a set of tiles plus every dictionary word they can spell.
export function createPuzzle({ dictionary, seeds, size, rng = Math.random }) {
  const { language } = dictionary;
  const ofSize = (words) => words.filter((w) => language.tiles(w).length === size);
  let candidates = ofSize(seeds.filter((w) => dictionary.has(w)));
  if (candidates.length === 0) candidates = ofSize([...dictionary.words()]);
  if (candidates.length === 0) {
    throw new Error(`No ${size}-letter word available in ${language.code}`);
  }

  const seed = candidates[Math.floor(rng() * candidates.length)];
  const seedTiles = language.tiles(seed);
  let tiles = shuffle(seedTiles, rng);
  // Don't hand the answer over in reading order.
  for (let i = 0; i < 5 && tiles.join('') === seed; i++) tiles = shuffle(seedTiles, rng);

  return { seed, tiles, words: dictionary.wordsFrom(tiles) };
}

export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Small deterministic generator for tests and reproducible puzzles.
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
