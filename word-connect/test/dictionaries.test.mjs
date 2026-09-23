import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadLanguagePack } from '../src/data/loader.js';
import { LANGUAGES } from '../src/data/languages.js';

for (const { code } of LANGUAGES) {
  test(`${code}: every seed is a dictionary word with at least 5 findable words`, async () => {
    const { language, dictionary, seeds } = await loadLanguagePack(code, (url) => readFile(url, 'utf8'));
    assert.ok(seeds.length > 0);
    for (const seed of seeds) {
      assert.ok(dictionary.has(seed), `${seed} missing from ${code} dictionary`);
      const tiles = language.tiles(seed);
      assert.ok(tiles.length >= 4 && tiles.length <= 7, `${seed} has ${tiles.length} tiles`);
      assert.ok(dictionary.wordsFrom(tiles).length >= 5, `${seed} yields too few words`);
    }
    for (const size of [4, 5, 6, 7]) {
      assert.ok(seeds.some((s) => language.tiles(s).length === size), `no ${size}-letter seed`);
    }
  });
}
