import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Language } from '../src/core/language.js';
import { loadPuzzlePack } from '../src/data/loader.js';
import { LANGUAGES } from '../src/data/languages.js';

const readText = (url) => readFile(url, 'utf8');

for (const definition of LANGUAGES) {
  const language = new Language(definition);
  for (const size of [4, 5, 6, 7]) {
    test(`${definition.code}/${size}: every word is spellable from its puzzle's tiles`, async () => {
      const pack = await loadPuzzlePack(definition.code, size, readText);
      assert.equal(pack.size, size);
      assert.ok(pack.attribution);
      assert.ok(pack.puzzles.length > 0);
      for (const { tiles, words, bonus } of pack.puzzles) {
        assert.equal(tiles.length, size);
        assert.ok(words.some((w) => language.tiles(w).length === size), `${tiles} has no full-length word`);
        assert.ok(!words.some((w) => bonus.includes(w)), `${tiles} lists a word in both tiers`);
        for (const word of [...words, ...bonus]) {
          const left = [...tiles];
          for (const tile of language.tiles(word)) {
            const i = left.indexOf(tile);
            assert.ok(i >= 0, `${word} can't be spelled from ${tiles.join('')}`);
            left.splice(i, 1);
          }
          assert.ok(language.tiles(word).length >= pack.minWordLength, word);
        }
      }
    });
  }
}
