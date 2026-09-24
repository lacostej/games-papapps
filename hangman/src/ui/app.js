import { pickUiLanguage, translateDom, translator, WORD_LANGUAGES } from './i18n.js';
import { Hangman, LEVELS, PARTS, pickWord } from '../core/hangman.js';
import { CATEGORIES } from '../data/words.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STORAGE_KEY = 'hangman';
const $ = (id) => document.getElementById(id);
const ui = {
  language: $('language'),
  level: $('level'),
  wins: $('wins'),
  winsUnit: $('wins-unit'),
  hint: $('hint'),
  drawing: $('drawing'),
  word: $('word'),
  status: $('status'),
  keyboard: $('keyboard'),
};

const t = translator(pickUiLanguage(navigator.languages ?? [navigator.language]));
const saved = loadSaved();
const stats = saved.stats;
let game;

document.documentElement.lang = t.code;
translateDom(document, t);
for (const { code, name } of WORD_LANGUAGES) ui.language.add(new Option(name, code));
for (const level of Object.keys(LEVELS)) ui.level.add(new Option(t(level), level));
ui.language.value = saved.language;
ui.level.value = saved.level;

const keys = [...LETTERS].map((letter) => {
  const key = Object.assign(document.createElement('button'), { textContent: letter });
  key.addEventListener('click', () => guess(letter));
  return key;
});
ui.keyboard.replaceChildren(...keys);

ui.language.addEventListener('change', () => newGame());
ui.level.addEventListener('change', () => newGame());
$('new').addEventListener('click', () => newGame());
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'SELECT') return;
  if (e.key === 'Enter' && game.over) return newGame();
  if (/^[a-z]$/i.test(e.key)) guess(e.key.toUpperCase());
});

if (saved.game) {
  game = new Hangman(saved.game);
  render();
} else {
  newGame();
}

// Leaving a game that has started breaks the streak, so skipping hard words doesn't pay.
function newGame() {
  if (game && !game.over && game.guesses.length) {
    stats.played += 1;
    stats.streak = 0;
  }
  const { word, category } = pickWord(CATEGORIES, ui.language.value, { avoid: game?.word });
  game = new Hangman({ word, category, lives: LEVELS[ui.level.value].lives });
  ui.word.lang = ui.language.value;
  render();
  save();
}

function guess(letter) {
  const result = game.guess(letter);
  if (result === 'over' || result === 'repeat') return;
  if (game.over) {
    stats.played += 1;
    stats.wins += game.won ? 1 : 0;
    stats.streak = game.won ? stats.streak + 1 : 0;
  }
  navigator.vibrate?.(result === 'hit' ? 8 : game.lost ? [40, 60, 40] : 40);
  render(letter);
  save();
}

// `flash` is the letter just played, to animate its slots or the new drawing part.
function render(flash) {
  const { lives } = game;
  // The level select always matches the game: changing it deals a new word.
  const { hint } = LEVELS[ui.level.value];
  ui.hint.textContent = hint ? t('hint', { category: t(`category_${game.category}`) }) : t('noHint');
  ui.hint.classList.toggle('none', !hint);

  // With fewer lives the first parts are drawn from the start.
  const shown = PARTS - lives + game.misses;
  [...ui.drawing.children].forEach((part, i) => {
    part.classList.toggle('shown', i < shown);
    part.classList.toggle('new', flash !== undefined && i === shown - 1 && !game.letters.includes(flash));
  });
  ui.drawing.classList.toggle('lost', game.lost);
  ui.drawing.classList.toggle('won', game.won);
  ui.drawing.setAttribute('aria-label', t('drawing', { count: lives - game.misses }));

  const locale = ui.language.value;
  ui.word.replaceChildren(
    ...[...game.word].map((ch, i) => {
      const revealed = game.isRevealed(i);
      const slot = document.createElement('span');
      slot.textContent = revealed || game.lost ? ch.toLocaleUpperCase(locale) : '';
      slot.className = [!revealed && game.lost && 'missed', revealed && game.letters[i] === flash && 'new'].filter(Boolean).join(' ');
      return slot;
    }),
  );
  ui.word.style.setProperty('--length', game.word.length);
  ui.word.classList.toggle('won', game.won);
  const pattern = [...game.word].map((ch, i) => (game.isRevealed(i) ? ch : t('blank'))).join(', ');
  ui.word.setAttribute('aria-label', t('word', { pattern }));

  ui.keyboard.classList.toggle('over', game.over);
  keys.forEach((key, k) => {
    const letter = LETTERS[k];
    const played = game.guesses.includes(letter);
    key.className = played ? (game.letters.includes(letter) ? 'hit' : 'miss') : '';
    key.disabled = played || game.over;
  });

  ui.status.className = `status ${game.won ? 'won' : game.lost ? 'lost' : ''}`;
  if (game.won) ui.status.textContent = stats.streak > 1 ? t('streak', { count: stats.streak }) : t('won');
  else if (game.lost) ui.status.textContent = t('lost', { word: game.word.toLocaleUpperCase(locale) });
  else ui.status.textContent = t('drawing', { count: lives - game.misses });
  $('new').classList.toggle('primary', game.over);

  ui.wins.textContent = t.number(stats.wins);
  ui.winsUnit.textContent = t('wins', { count: stats.wins });
}

function loadSaved() {
  const uiLanguage = pickUiLanguage(navigator.languages ?? [navigator.language]);
  const defaults = {
    language: WORD_LANGUAGES.some((l) => l.code === uiLanguage) ? uiLanguage : WORD_LANGUAGES[0].code,
    level: 'easy',
    game: null,
    stats: { wins: 0, played: 0, streak: 0 },
  };
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const language = WORD_LANGUAGES.some((l) => l.code === s.language) ? s.language : defaults.language;
    const known = s.game && CATEGORIES.some((c) => c.id === s.game.category && c[language].includes(s.game.word));
    return {
      language,
      level: LEVELS[s.level] ? s.level : defaults.level,
      game: known ? s.game : null,
      stats: { ...defaults.stats, ...s.stats },
    };
  } catch {
    return defaults;
  }
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ language: ui.language.value, level: ui.level.value, game, stats }),
    );
  } catch {
    // Private mode: the game just doesn't persist.
  }
}
