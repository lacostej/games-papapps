// Builds words/<code>.json: every valid word of 2-10 letters, accents removed, plus letter
// weights for the vowel and consonant draws. Reads the same sources, settings and curation
// as Word Connect (see ../word-connect/tools/puzzle-sources.json).
// Usage: node tools/build-words.mjs [code ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { Language } from '../../word-connect/src/core/language.js';
import { parseWordList } from '../../word-connect/src/core/word-list.js';
import { LANGUAGES } from '../../word-connect/src/data/languages.js';
import { readDicollecte } from '../../word-connect/tools/sources/dicollecte.mjs';
import { readEnableScowl } from '../../word-connect/tools/sources/enable-scowl.mjs';
import { VOWELS } from '../src/core/letters.js';

const READERS = { dicollecte: readDicollecte, enableScowl: readEnableScowl };
const root = fileURLToPath(new URL('..', import.meta.url));
const wc = fileURLToPath(new URL('../../word-connect/', import.meta.url));
const sources = JSON.parse(readFileSync(`${wc}/tools/puzzle-sources.json`, 'utf8'));
const codes = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sources);

for (const code of codes) {
  const config = sources[code];
  const language = new Language(LANGUAGES.find((l) => l.code === code));
  const resolve = (p) => {
    const full = `${wc}/${p}`;
    if (!existsSync(full)) throw new Error(`${full} missing; see the download URLs in word-connect/tools/puzzle-sources.json`);
    return full;
  };
  const words = new Set();
  // Common words (Word Connect's required words) come first in the computer's answers.
  const common = new Set();
  for (const { word, target } of READERS[config.reader](resolve(config.path), config.options ?? {}, resolve)) {
    const w = language.normalize(word);
    if (!/^[A-Z]{2,10}$/.test(w)) continue;
    words.add(w);
    if (target) common.add(w);
  }
  const rejected = parseWordList(readFileSync(`${wc}/${config.rejected}`, 'utf8')).map((w) => language.normalize(w));
  for (const w of rejected) {
    words.delete(w);
    common.delete(w);
  }

  // Draw weights: how often each letter appears across the word list.
  const counts = {};
  for (const w of words) for (const l of w) counts[l] = (counts[l] ?? 0) + 1;
  const weights = (keep) => Object.fromEntries(Object.entries(counts).filter(([l]) => keep(l)).sort());
  const pack = {
    language: code,
    attribution: config.attribution,
    vowels: weights((l) => VOWELS.includes(l)),
    consonants: weights((l) => !VOWELS.includes(l)),
    words: [...words].sort().join(' '),
    common: [...common].sort().join(' '),
  };
  mkdirSync(`${root}/words`, { recursive: true });
  const json = JSON.stringify(pack);
  writeFileSync(`${root}/words/${code}.json`, json + '\n');
  console.log(`${code}: ${words.size} words (${common.size} common), ${(json.length / 1e6).toFixed(2)} MB, ${(gzipSync(json).length / 1024).toFixed(0)} KB gzip`);
}
