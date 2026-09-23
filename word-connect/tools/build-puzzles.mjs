// Builds puzzles/<code>/<size>.json from a full word source. The source stays on the
// build machine; players download only the packs.  Usage: node tools/build-puzzles.mjs [code ...]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { Language } from '../src/core/language.js';
import { WordIndex } from '../src/core/word-index.js';
import { parseWordList } from '../src/core/word-list.js';
import { seededRandom, shuffle } from '../src/core/puzzle.js';
import { LANGUAGES } from '../src/data/languages.js';
import { readDicollecte } from './sources/dicollecte.mjs';
import { readEnableScowl } from './sources/enable-scowl.mjs';

const READERS = { dicollecte: readDicollecte, enableScowl: readEnableScowl };
const root = fileURLToPath(new URL('..', import.meta.url));
const sources = JSON.parse(readFileSync(`${root}/tools/puzzle-sources.json`, 'utf8'));
const codes = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sources);

for (const code of codes) {
  const config = sources[code];
  const definition = LANGUAGES.find((l) => l.code === code);
  if (!config || !definition) throw new Error(`No source or language definition for ${code}`);
  const language = new Language(definition);
  const resolve = (p) => {
    const full = p.startsWith('/') ? p : `${root}/${p}`;
    if (!existsSync(full)) throw new Error(`${full} missing; see the download URLs in tools/puzzle-sources.json`);
    return full;
  };
  const path = resolve(config.path);

  const index = new WordIndex(language);
  for (const { word, target } of READERS[config.reader](path, config.options ?? {}, resolve)) {
    index.add(language.normalize(word), { target });
  }

  const curated = (key, apply) => {
    if (!config[key]) return;
    const words = parseWordList(readFileSync(`${root}/${config[key]}`, 'utf8'));
    const missing = words.filter((raw) => !apply(language.normalize(raw)));
    if (missing.length) throw new Error(`${config[key]}: not playable in the ${code} source: ${missing.join(' ')}`);
  };
  curated('rejected', (w) => index.delete(w));
  curated('notTargets', (w) => index.demote(w));

  // Every puzzle contains at least one required word using all its letters.
  const candidates = [...index.entries()].filter(([, e]) => e.target).map(([w]) => w);

  mkdirSync(`${root}/puzzles/${code}`, { recursive: true });
  console.log(`${code}:`);
  for (const [sizeKey, limits] of Object.entries(config.sizes)) {
    const size = Number(sizeKey);
    const rng = seededRandom(size);
    const puzzles = [];
    const seen = new Set();
    for (const word of shuffle(candidates.filter((w) => language.tiles(w).length === size), rng)) {
      const tiles = language.tiles(word).sort();
      const key = tiles.join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const { words, bonus } = index.lookup(tiles);
      if (words.length < limits.minWords || words.length > (limits.maxWords ?? Infinity)) continue;
      puzzles.push({ tiles, words, bonus });
      if (puzzles.length === limits.count) break;
    }

    const pack = {
      language: code,
      size,
      minWordLength: language.minWordLength,
      attribution: config.attribution,
      puzzles,
    };
    const json = JSON.stringify(pack);
    writeFileSync(`${root}/puzzles/${code}/${size}.json`, json + '\n');
    const counts = (key) => puzzles.map((p) => p[key].length);
    console.log(
      `  ${size} letters: ${puzzles.length} puzzles, words ${range(counts('words'))}, bonus ${range(counts('bonus'))}, ` +
        `${(gzipSync(json).length / 1024).toFixed(1)} KB gzip`,
    );
  }
}

function range(values) {
  const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  return `${Math.min(...values)}-${Math.max(...values)} (avg ${avg.toFixed(0)})`;
}
