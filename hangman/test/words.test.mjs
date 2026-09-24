import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../src/data/words.js';
import { baseLetter } from '../src/core/hangman.js';
import { MESSAGES } from '../src/ui/i18n.js';

for (const code of ['en', 'fr']) {
  test(`${code} words are single words of 4-12 letters typable on A-Z, without repeats`, () => {
    const all = CATEGORIES.flatMap((c) => c[code]);
    for (const word of all) assert.match([...word].map(baseLetter).join(''), /^[A-Z]{4,12}$/, word);
    assert.equal(new Set(all).size, all.length);
    for (const c of CATEGORIES) assert.ok(c[code].length >= 20, `${c.id}: ${c[code].length}`);
  });
}

test('every category has a name in each interface language', () => {
  for (const messages of Object.values(MESSAGES)) {
    for (const c of CATEGORIES) assert.ok(messages[`category_${c.id}`], c.id);
  }
});
