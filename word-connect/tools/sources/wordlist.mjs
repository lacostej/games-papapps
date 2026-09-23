// Reader for a plain one-word-per-line list; every word is a target.
import { readFileSync } from 'node:fs';
import { parseWordList } from '../../src/core/word-list.js';

export function* readWordList(path, { skipCapitalized = false, addSPlurals = false }) {
  for (const word of parseWordList(readFileSync(path, 'utf8'))) {
    if (skipCapitalized && /^\p{Lu}/u.test(word)) continue;
    yield { word, target: true };
    // Lists without plurals (e.g. web2): guessed plurals are accepted, never required.
    if (addSPlurals && !/[sxz]$/i.test(word)) yield { word: `${word}s`, target: false };
  }
}
