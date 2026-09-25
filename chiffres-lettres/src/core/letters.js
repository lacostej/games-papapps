export const VOWELS = ['A', 'E', 'I', 'O', 'U'];
// Letters per draw; 9 as in the original show, 10 as a harder option.
export const LETTER_COUNTS = [9, 10];

// A random letter, weighted by how often it appears in the language's words.
export function drawLetter(weights, random = Math.random) {
  const entries = Object.entries(weights);
  let r = random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [letter, w] of entries) {
    r -= w;
    if (r < 0) return letter;
  }
  return entries.at(-1)[0];
}

function tally(letters) {
  const counts = {};
  for (const l of letters) counts[l] = (counts[l] ?? 0) + 1;
  return counts;
}

// Whether `word` can be made from `letters`, each used at most once.
export function canSpell(word, letters) {
  const left = tally(letters);
  for (const l of word) {
    if (!left[l]) return false;
    left[l]--;
  }
  return true;
}

// Common words first, keeping each group's order.
export function commonFirst(words, common) {
  return [...words.filter((w) => common.has(w)), ...words.filter((w) => !common.has(w))];
}

// The longest words the letters make, all of the same length.
export function bestWords(words, letters) {
  let best = [];
  for (const w of words) {
    if (w.length < (best[0]?.length ?? 0) || !canSpell(w, letters)) continue;
    if (w.length > (best[0]?.length ?? 0)) best = [];
    best.push(w);
  }
  return best;
}
