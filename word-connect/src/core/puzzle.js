// Picks a puzzle from a pack (see tools/build-puzzles.mjs) and scrambles its tiles.
export function dealPuzzle(pack, { rng = Math.random, avoid } = {}) {
  const indices = pack.puzzles.map((_, i) => i);
  const choices = indices.length > 1 ? indices.filter((i) => i !== avoid) : indices;
  const index = choices[Math.floor(rng() * choices.length)];
  const { tiles, words, bonus } = pack.puzzles[index];
  let order = shuffle(tiles, rng);
  // Don't hand over a full-length word in reading order.
  for (let i = 0; i < 5 && words.includes(order.join('')); i++) order = shuffle(tiles, rng);
  return { index, tiles: order, words, bonus, minWordLength: pack.minWordLength };
}

export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Small deterministic generator for tests and reproducible builds.
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
