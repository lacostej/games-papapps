// English: ENABLE (public domain) decides what is valid, SCOWL/ESDB size levels
// (35 small ... 50 medium ... 85 valid) decide what is common enough to require.
import { readFileSync } from 'node:fs';
import { parseWordList } from '../../src/core/word-list.js';

// Size floor for forms marked less common (-), archaic (@), inapplicable (~), nearly unused (!).
const ANNOTATION_SIZE = { '-': 70, '@': 70, '~': 80, '!': 85 };

export function* readEnableScowl(enablePath, { scowl, maxTargetSize, maxExtraSize }, resolve) {
  const enable = new Set(parseWordList(readFileSync(enablePath, 'utf8')));
  const sizes = scowlSizes(resolve(scowl));
  for (const word of enable) {
    yield { word, target: (sizes.get(word) ?? Infinity) <= maxTargetSize };
  }
  // Common words newer than ENABLE ("email") are accepted, never required.
  for (const [word, size] of sizes) {
    if (size <= maxExtraSize && !enable.has(word)) yield { word, target: false };
  }
}

// Abbreviations, prefixes, names and capitalised words.
const EXCLUDED_POS = /<(abbr|pre|suf)|\/(upper|name)/;

// Smallest SCOWL size of every lowercase single-word form in scowl-pre.txt.
export function scowlSizes(path) {
  const sizes = new Map();
  const note = (word, size) => {
    if (!/^[a-z]+$/.test(word)) return;
    if (size < (sizes.get(word) ?? Infinity)) sizes.set(word, size);
  };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!/^\d/.test(line) || EXCLUDED_POS.test(line)) continue;
    const size = Number(line.match(/^\d+/)[0]);
    // SCOWL_INFO ': ' [VARIANT_INFO ': '] LEMMA_INFO [': ' ENTRY, ...]
    const parts = line.split(': ').slice(1);
    if (parts.length && /^[ABZCD_+]/.test(parts[0]) && !/</.test(parts[0])) parts.shift();
    const [lemmaInfo = '', entries = ''] = parts;
    const lemma = lemmaInfo.split(' ')[0];
    if (lemma !== '-') note(lemma.replace(/^[-@!]/, ''), size);
    for (const entry of entries.split(/, |\|/)) {
      const form = entry.replace(/^\(|\)$/g, '').replace(/^[^:]*: /, '').trim();
      const annotation = form.match(/[*\-@~!†]$/)?.[0];
      const word = form.replace(/[*\-@~!†]+$/, '');
      note(word, Math.max(size, ANNOTATION_SIZE[annotation] ?? 0));
    }
  }
  return sizes;
}
