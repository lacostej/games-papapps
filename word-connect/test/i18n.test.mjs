import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MESSAGES, UI_LANGUAGES, pickUiLanguage, translator } from '../src/ui/i18n.js';

test('every interface language translates every key with the same plural shape', () => {
  const reference = MESSAGES.en;
  for (const { code } of UI_LANGUAGES) {
    const messages = MESSAGES[code];
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(reference).sort(), code);
    for (const [key, value] of Object.entries(reference)) {
      assert.equal(typeof messages[key], typeof value, `${code}.${key}`);
    }
  }
});

test('every key used by the page exists', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-label)?="(\w+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 5);
  for (const key of keys) assert.ok(key in MESSAGES.en, key);
});

test('translator fills slots and picks plural forms', () => {
  const en = translator('en');
  const fr = translator('fr');
  assert.equal(en('letters', { count: 5 }), '5 letters');
  assert.equal(fr('letters', { count: 5 }), '5 lettres');
  assert.equal(en('progress', { found: 0, total: 1, count: 1 }), '0 / 1 word');
  assert.equal(fr('progress', { found: 2, total: 23, count: 23 }), '2 / 23 mots');
  assert.equal(fr('shuffle'), 'Mélanger');
});

test('unknown interface language falls back to English', () => {
  assert.equal(translator('de')('shuffle'), 'Shuffle');
});

test('pickUiLanguage uses the first supported browser language', () => {
  assert.equal(pickUiLanguage(['fr-CA', 'en-US']), 'fr');
  assert.equal(pickUiLanguage(['de-DE', 'en-GB']), 'en');
  assert.equal(pickUiLanguage(['de-DE']), 'en');
  assert.equal(pickUiLanguage([]), 'en');
});
