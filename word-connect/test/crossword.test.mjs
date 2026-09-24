import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildCrossword } from '../src/core/crossword.js';
import { seededRandom } from '../src/core/puzzle.js';
import { loadPuzzlePack } from '../src/data/loader.js';
import { LANGUAGES } from '../src/data/languages.js';

const readText = (url) => readFile(url, 'utf8');

// Every horizontal and vertical run of two or more letters, as "word@cells".
function runs({ width, height, letters }) {
  const out = [];
  for (const [dr, dc] of [[0, 1], [1, 0]]) {
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (letters.has(`${r - dr},${c - dc}`) || !letters.has(`${r},${c}`)) continue;
        const cells = [];
        for (let k = 0; letters.has(`${r + dr * k},${c + dc * k}`); k++) cells.push([r + dr * k, c + dc * k]);
        if (cells.length > 1) out.push(`${cells.map((x) => letters.get(String(x))).join('')}@${cells.join(';')}`);
      }
    }
  }
  return out.sort();
}

function connected({ letters }) {
  const [start] = letters.keys();
  const seen = new Set([start]);
  for (const key of seen) {
    const [r, c] = key.split(',').map(Number);
    for (const next of [`${r + 1},${c}`, `${r - 1},${c}`, `${r},${c + 1}`, `${r},${c - 1}`]) {
      if (letters.has(next)) seen.add(next);
    }
  }
  return seen.size === letters.size;
}

for (const { code } of LANGUAGES) {
  for (const size of [4, 5, 6, 7]) {
    test(`${code}/${size}: crosswords spell only their own words and fit the box`, async () => {
      const pack = await loadPuzzlePack(code, size, readText);
      for (const { tiles, words } of pack.puzzles) {
        const grid = buildCrossword(words, { tiles, maxWords: 12, maxWidth: 10, maxHeight: 7, rng: seededRandom(size) });
        assert.ok(grid, tiles.join(''));
        assert.ok(grid.width <= 10 && grid.height <= 7, tiles.join(''));
        assert.ok(grid.entries.length <= 12);
        assert.ok(grid.entries.some((e) => e.word.length === size), `${tiles.join('')} lacks the full-length word`);
        assert.equal(new Set(grid.entries.map((e) => e.word)).size, grid.entries.length);
        for (const { word } of grid.entries) assert.ok(words.includes(word), word);
        const expected = grid.entries.map((e) => `${e.word}@${e.cells.join(';')}`).sort();
        assert.deepEqual(runs(grid), expected, tiles.join(''));
        assert.ok(connected(grid), tiles.join(''));
      }
    });
  }
}

test('a short box still holds the longest word across', () => {
  const grid = buildCrossword(['VIPER', 'RIPE', 'PIER', 'VIE'], { tiles: [...'EIPRV'], maxWidth: 5, maxHeight: 3, rng: seededRandom(1) });
  assert.equal(grid.width, 5);
  assert.ok(grid.height <= 3);
  assert.equal(grid.entries[0].word, 'VIPER');
});

test('the same seed lays out the same grid', () => {
  const words = ['IRE', 'PER', 'PIE', 'REP', 'REV', 'RIP', 'VIE', 'PIER', 'RIPE', 'VIPER'];
  const a = buildCrossword(words, { tiles: [...'EIPRV'], rng: seededRandom(7) });
  const b = buildCrossword(words, { tiles: [...'EIPRV'], rng: seededRandom(7) });
  assert.deepEqual(a.entries, b.entries);
});

test('digraph tiles take one cell', () => {
  const grid = buildCrossword(['IJS', 'SIJ'], { tiles: ['IJ', 'S'], maxWidth: 3, maxHeight: 3, rng: seededRandom(1) });
  assert.equal(grid.entries[0].cells.length, 2);
});
