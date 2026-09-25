// Round order per mode: "both" plays one numbers round, then two letters rounds, and repeats.
export const MODES = {
  both: ['numbers', 'letters', 'letters'],
  numbers: ['numbers'],
  letters: ['letters'],
};

export const ROUND_SECONDS = 60;

export function roundKind(mode, index) {
  const cycle = MODES[mode];
  return cycle[index % cycle.length];
}

// A letters answer scores its length when it is a word the letters make.
export function lettersScore(word, letters, isWord, canSpell) {
  return word && isWord(word) && canSpell(word, letters) ? word.length : 0;
}
