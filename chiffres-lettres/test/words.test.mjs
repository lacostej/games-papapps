import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOWELS } from '../src/core/letters.js';

const load = (code) => JSON.parse(readFileSync(new URL(`../words/${code}.json`, import.meta.url), 'utf8'));

for (const [code, present, absent] of [
  ['fr', ['MAISONS', 'CHANTAIENT', 'ETE', 'COEUR'], ['PPP', 'ANTICONSTITUTIONNELLEMENT']],
  ['en', ['QUEEN', 'JUMPED', 'EMAIL', 'ZEBRAS'], ['FAG', 'XQZ']],
]) {
  test(`${code} word list holds inflected forms, without accents, within 2-10 letters`, () => {
    const pack = load(code);
    const words = pack.words.split(' ');
    const set = new Set(words);
    for (const w of present) assert.ok(set.has(w), w);
    for (const w of absent) assert.ok(!set.has(w), w);
    assert.ok(words.every((w) => /^[A-Z]{2,10}$/.test(w)));
    assert.deepEqual(Object.keys(pack.vowels), VOWELS);
    assert.ok(Object.keys(pack.consonants).every((l) => !VOWELS.includes(l)));
    assert.equal(Object.keys(pack.vowels).length + Object.keys(pack.consonants).length, 26);
    assert.ok(pack.attribution);
    const common = pack.common.split(' ');
    assert.ok(common.length > 10000 && common.every((w) => set.has(w)));
  });
}
