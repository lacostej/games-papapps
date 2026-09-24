import { LetterWheel } from './wheel.js';
import { pickUiLanguage, translateDom, translator, UI_LANGUAGES } from './i18n.js';
import { dealPuzzle } from '../core/puzzle.js';
import { FreePlay } from '../core/free-play.js';
import { buildCrossword } from '../core/crossword.js';
import { LANGUAGES } from '../data/languages.js';
import { loadPuzzlePack } from '../data/loader.js';

const SIZES = [4, 5, 6, 7];
// Smallest readable cell and the most words a grid shows.
const MIN_CELL = 30;
const MAX_GRID_WORDS = 15;
const $ = (id) => document.getElementById(id);
const ui = {
  language: $('language'),
  uiLanguage: $('ui-language'),
  size: $('size'),
  score: $('score'),
  progress: $('progress'),
  foundList: $('found-list'),
  gridBox: $('grid-box'),
  grid: $('grid'),
  crossword: $('crossword'),
  preview: $('preview'),
  panel: $('panel'),
  stats: $('stats'),
  targetWords: $('target-words'),
  bonusWords: $('bonus-words'),
  credits: $('credits'),
  hitScale: $('hit-scale'),
  hitScaleValue: $('hit-scale-value'),
};

const packs = new Map();
const prefs = loadPrefs();
let t;
let pack;
let game;
let dealt;
let crossword;
// Counters for usability sessions, shown in the test panel.
let stats;

const wheel = new LetterWheel($('wheel'), {
  onChange: (tiles) => {
    if (tiles.length === 0) return;
    ui.preview.className = 'preview active';
    ui.preview.textContent = tiles.join('');
  },
  onStep: (change) => {
    if (change === 'backtrack') stats.backtracks += 1;
    navigator.vibrate?.(8);
  },
  onRelease: (tiles) => submit(tiles),
});

for (const { code, name } of LANGUAGES) ui.language.add(new Option(name, code));
for (const { code, name } of UI_LANGUAGES) ui.uiLanguage.add(new Option(name, code));
for (const n of SIZES) ui.size.add(new Option(String(n), String(n)));
ui.language.value = prefs.language;
ui.uiLanguage.value = prefs.uiLanguage;
ui.size.value = String(prefs.size);
ui.crossword.setAttribute('aria-pressed', String(prefs.crossword));
ui.language.addEventListener('change', () => savePrefs() && start());
ui.size.addEventListener('change', () => savePrefs() && start());
ui.uiLanguage.addEventListener('change', () => savePrefs() && applyUiLanguage());
ui.crossword.addEventListener('click', () => {
  ui.crossword.setAttribute('aria-pressed', String(!crosswordOn()));
  savePrefs();
  switchMode();
});
$('shuffle').addEventListener('click', () => { stats.shuffles += 1; wheel.shuffle(); });
$('new').addEventListener('click', () => start());
$('open-panel').addEventListener('click', () => { renderPanel(); ui.panel.showModal(); });
// Close on a backdrop tap; require the press to start there too, so a drag out of the panel doesn't close it.
let pressedBackdrop = false;
ui.panel.addEventListener('pointerdown', (e) => { pressedBackdrop = onBackdrop(e); });
ui.panel.addEventListener('click', (e) => { if (pressedBackdrop && onBackdrop(e)) ui.panel.close(); });
ui.hitScale.addEventListener('input', () => {
  wheel.setDragHitScale(Number(ui.hitScale.value));
  renderHitScale();
});

applyUiLanguage();
start();

function applyUiLanguage() {
  t = translator(ui.uiLanguage.value);
  document.documentElement.lang = t.code;
  translateDom(document, t);
  for (const option of ui.size.options) option.textContent = t('letters', { count: Number(option.value) });
  if (game) {
    renderScore();
    if (ui.panel.open) renderPanel();
  }
}

async function start() {
  const code = ui.language.value;
  const key = `${code}/${ui.size.value}`;
  if (!packs.has(key)) packs.set(key, await loadPuzzlePack(code, Number(ui.size.value)));
  const previous = pack === packs.get(key) ? game?.puzzle.index : undefined;
  pack = packs.get(key);
  dealt = dealPuzzle(pack, { avoid: previous });
  stats = { swipes: 0, found: 0, bonus: 0, invalid: 0, duplicate: 0, tooShort: 0, taps: 0, backtracks: 0, shuffles: 0, started: Date.now() };
  // Letters and words are in the word language, which may differ from the interface.
  for (const el of [$('wheel'), ui.grid, ui.foundList, ui.preview, ui.targetWords, ui.bonusWords]) el.lang = code;
  wheel.setTiles(dealt.tiles);
  ui.preview.className = 'preview';
  newGame(dealt);
}

// In crossword mode the grid's words are the targets and every other word is a bonus.
function newGame(puzzle) {
  ui.gridBox.hidden = !crosswordOn();
  ui.gridBox.parentElement.classList.toggle('with-grid', crosswordOn());
  // Kept on the puzzle so toggling the mode off and on brings back the same grid.
  if (crosswordOn()) puzzle.crossword ??= layOutGrid(puzzle);
  crossword = crosswordOn() ? puzzle.crossword : null;
  if (crossword) {
    const inGrid = crossword.entries.map((e) => e.word);
    game = new FreePlay({ ...puzzle, words: inGrid, bonus: [...puzzle.words.filter((w) => !inGrid.includes(w)), ...puzzle.bonus] });
  } else {
    game = new FreePlay(puzzle);
  }
  ui.foundList.replaceChildren();
  renderGrid();
  renderScore();
}

// Keeps the words found so far when the mode changes mid-puzzle.
function switchMode() {
  const found = [...game.found, ...game.bonusFound];
  newGame(dealt);
  for (const word of found) {
    const { result } = game.submit([...word]);
    if (result === 'bonus' || !crossword) addFound(word, result);
  }
  renderGrid();
  renderScore();
}

function crosswordOn() {
  return ui.crossword.getAttribute('aria-pressed') === 'true';
}

function layOutGrid(puzzle) {
  const { width, height } = ui.gridBox.getBoundingClientRect();
  return buildCrossword(puzzle.words, {
    tiles: puzzle.tiles,
    maxWords: MAX_GRID_WORDS,
    // The longest word goes across, so only the width must hold it.
    maxWidth: Math.max(puzzle.tiles.length, Math.floor(width / MIN_CELL)),
    maxHeight: Math.max(3, Math.floor(height / MIN_CELL)),
  });
}

function submit(tiles) {
  const { result, word } = game.submit(tiles);
  stats.swipes += 1;
  const counter = { found: 'found', bonus: 'bonus', invalid: 'invalid', duplicate: 'duplicate', 'too-short': 'tooShort', ignored: 'taps' }[result];
  stats[counter] += 1;

  if (result === 'ignored') {
    ui.preview.className = 'preview';
    return;
  }
  const style = { found: 'good', bonus: 'bonus', duplicate: 'dup' }[result] ?? 'bad';
  ui.preview.textContent = word;
  ui.preview.className = `preview ${style}`;
  void ui.preview.offsetWidth; // let the colour show before fading out
  ui.preview.classList.add('fade');

  if (result === 'found' || result === 'bonus') {
    if (crossword && result === 'found') renderGrid(word, 'new');
    else addFound(word, result, 'new');
    renderScore(true);
    navigator.vibrate?.([15, 40, 15]);
  } else if (result === 'duplicate') {
    const inGrid = crossword?.entries.some((e) => e.word === word);
    if (inGrid) renderGrid(word, 'again');
    const li = [...ui.foundList.children].find((n) => n.textContent === word);
    replay(li, 'again');
  } else {
    navigator.vibrate?.(40);
  }
}

function addFound(word, result, className = '') {
  const li = document.createElement('li');
  li.textContent = word;
  li.className = `${className} ${result === 'bonus' ? 'bonus' : ''}`.trim();
  ui.foundList.prepend(li);
}

function replay(el, className) {
  el?.classList.remove(className);
  void el?.getBoundingClientRect();
  el?.classList.add(className);
}

// Draws the grid with found words filled in; `animate` flags the cells of `word`.
function renderGrid(word, animate) {
  if (!crossword) return ui.grid.replaceChildren();
  const { width, height, letters, entries } = crossword;
  const shown = new Set(entries.filter((e) => game.found.includes(e.word)).flatMap((e) => e.cells.map(String)));
  const flagged = new Set(entries.find((e) => e.word === word)?.cells.map(String));
  const svg = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => setAttrs(document.createElementNS(svg, tag), attrs);
  ui.grid.setAttribute('viewBox', `-0.05 -0.05 ${width + 0.1} ${height + 0.1}`);
  ui.grid.setAttribute('aria-label', t('progress', { found: t.number(game.found.length), total: t.number(game.total), count: game.total }));
  ui.grid.classList.toggle('complete', game.found.length === game.total);
  ui.grid.replaceChildren(
    ...[...letters].map(([key, letter]) => {
      const [r, c] = key.split(',').map(Number);
      const classes = ['cell', shown.has(key) && 'shown', flagged.has(key) && animate].filter(Boolean);
      // The animated group sits inside the positioned one: a CSS transform would replace the translate.
      const cell = make('g', { class: classes.join(' ') });
      cell.append(make('rect', { x: -0.45, y: -0.45, width: 0.9, height: 0.9, rx: 0.12 }));
      if (shown.has(key)) {
        const text = make('text', { 'font-size': 0.6 });
        text.textContent = letter;
        cell.append(text);
      }
      const at = make('g', { transform: `translate(${c + 0.5} ${r + 0.5})` });
      at.append(cell);
      return at;
    }),
  );
}

function setAttrs(el, attrs) {
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  return el;
}

function renderScore(bump = false) {
  ui.score.textContent = t.number(game.score);
  ui.progress.textContent = t('progress', { found: t.number(game.found.length), total: t.number(game.total), count: game.total });
  if (bump) {
    const box = ui.score.parentElement;
    box.classList.remove('bump');
    void box.offsetWidth;
    box.classList.add('bump');
  }
}

function renderHitScale() {
  const percent = (n) => t.number(n, { style: 'percent', maximumFractionDigits: 0 });
  ui.hitScaleValue.textContent = t('hitSizeValue', {
    set: percent(Number(ui.hitScale.value)),
    used: percent(wheel.dragHitRadius / wheel.tileRadius),
  });
}

// Padding clicks also target the dialog itself, so test against its box.
function onBackdrop(e) {
  if (e.target !== ui.panel) return false;
  const r = ui.panel.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

function renderPanel() {
  renderHitScale();
  const minutes = t.number((Date.now() - stats.started) / 60000, { maximumFractionDigits: 1 });
  const rows = [
    ['statSwipes', t.number(stats.swipes)],
    ['statFound', t.number(stats.found)],
    ['statBonus', t.number(stats.bonus)],
    ['statInvalid', t.number(stats.invalid)],
    ['statDuplicate', t.number(stats.duplicate)],
    ['statTooShort', t.number(stats.tooShort)],
    ['statTaps', t.number(stats.taps)],
    ['statBacktracks', t.number(stats.backtracks)],
    ['statShuffles', t.number(stats.shuffles)],
    ['statMinutes', minutes],
    ['statPuzzle', `${t.number(game.puzzle.index + 1)} / ${t.number(pack.puzzles.length)}`],
  ];
  ui.stats.replaceChildren(
    ...rows.flatMap(([key, value]) => [
      Object.assign(document.createElement('dt'), { textContent: t(key) }),
      Object.assign(document.createElement('dd'), { textContent: value }),
    ]),
  );
  const listWords = (el, words, found) =>
    el.replaceChildren(
      ...words.flatMap((w) => {
        const span = Object.assign(document.createElement('span'), { textContent: w });
        if (found.includes(w)) span.className = 'got';
        return [span, ' '];
      }),
    );
  listWords(ui.targetWords, game.puzzle.words, game.found);
  listWords(ui.bonusWords, game.puzzle.bonus, game.bonusFound);
  ui.credits.textContent = t('credits', { source: pack.attribution });
}

function loadPrefs() {
  const uiLanguage = pickUiLanguage(navigator.languages ?? [navigator.language]);
  const defaults = {
    uiLanguage,
    language: LANGUAGES.some((l) => l.code === uiLanguage) ? uiLanguage : LANGUAGES[0].code,
    size: 5,
    crossword: false,
  };
  try {
    const saved = JSON.parse(localStorage.getItem('word-connect') ?? '{}');
    return {
      uiLanguage: UI_LANGUAGES.some((l) => l.code === saved.uiLanguage) ? saved.uiLanguage : defaults.uiLanguage,
      language: LANGUAGES.some((l) => l.code === saved.language) ? saved.language : defaults.language,
      size: SIZES.includes(saved.size) ? saved.size : defaults.size,
      crossword: typeof saved.crossword === 'boolean' ? saved.crossword : defaults.crossword,
    };
  } catch {
    return defaults;
  }
}

function savePrefs() {
  try {
    localStorage.setItem(
      'word-connect',
      JSON.stringify({
        uiLanguage: ui.uiLanguage.value,
        language: ui.language.value,
        size: Number(ui.size.value),
        crossword: crosswordOn(),
      }),
    );
  } catch {
    // Private mode: preferences just don't persist.
  }
  return true;
}
