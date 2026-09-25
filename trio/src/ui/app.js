import { pickUiLanguage, translateDom, translator } from './i18n.js';
import { features, Game } from '../core/trio.js';

const STORAGE_KEY = 'trio';
const HINT_SECONDS = 10;
const SVG = 'http://www.w3.org/2000/svg';
// Shapes are drawn upright, centred on 0,0, 18 wide and 44 tall.
const SHAPES = [
  'M0 -22 L9 0 L0 22 L-9 0 Z',
  'M-3 -22 C7 -24 12 -15 7 -6 C3 1 9 6 8 13 C6 22 -4 24 -8 19 C-12 14 -6 8 -7 2 C-8 -5 -13 -10 -10 -16 C-8 -20 -6 -21 -3 -22 Z',
  'M-9 -13 A9 9 0 0 1 9 -13 L9 13 A9 9 0 0 1 -9 13 Z',
];
const $ = (id) => document.getElementById(id);
const ui = { time: $('time'), found: $('found'), deck: $('deck'), status: $('status'), table: $('table'), hint: $('hint') };

const t = translator(pickUiLanguage(navigator.languages ?? [navigator.language]));
const saved = loadSaved();
let game;
let clock;
let selected = [];
let hinted = [];
// The buttons on screen and the cards they show; rebuilt only when the table changes, so
// hint and selection animations aren't restarted by every tap.
let buttons = [];
let shown = [];

document.documentElement.lang = t.code;
translateDom(document, t);
$('hint-cost').textContent = t('hintCost', { seconds: HINT_SECONDS });
ui.hint.addEventListener('click', hint);
$('new').addEventListener('click', () => newGame());
// The clock only runs while the game is on screen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
  else resume();
});
setInterval(renderTime, 500);

if (saved.game) {
  game = new Game(saved.game);
  clock = { before: saved.elapsed, since: null };
  resume();
  render();
  if (game.over) showResult(elapsed(), saved.best);
  else say(t('rules'), '');
} else {
  newGame();
}

function newGame() {
  game = new Game();
  shown = [];
  clock = { before: 0, since: Date.now() };
  selected = [];
  hinted = [];
  ui.status.className = 'status';
  ui.status.textContent = t('rules');
  render();
  save();
}

function elapsed() {
  return clock.before + (clock.since ? Date.now() - clock.since : 0);
}

function pause() {
  if (!clock.since) return;
  clock.before = elapsed();
  clock.since = null;
  save();
}

function resume() {
  if (!clock.since && !game.over && !document.hidden) clock.since = Date.now();
}

function tap(i) {
  if (game.over) return;
  selected = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
  if (selected.length < 3) return render();
  const picked = selected;
  selected = [];
  if (!game.claim(picked)) {
    navigator.vibrate?.(40);
    say(t('notTrio'), 'bad');
    render({ wrong: picked });
    return;
  }
  hinted = [];
  navigator.vibrate?.([15, 40, 15]);
  say(game.added ? t('added') : '', '');
  if (game.over) finish();
  render({ fresh: picked });
  save();
}

function hint() {
  if (game.over) return;
  const trio = game.hint();
  const next = trio.find((i) => !hinted.includes(i));
  if (next === undefined) return;
  hinted = [...hinted, next];
  clock.before += HINT_SECONDS * 1000;
  renderTime();
  render();
  save();
}

function finish() {
  pause();
  const time = elapsed();
  const previous = saved.best;
  saved.best = previous ? Math.min(previous, time) : time;
  showResult(time, previous);
}

// `previous` is the best time before this game, if any.
function showResult(time, previous) {
  const record = !previous || time < previous;
  say(`${t('done', { time: format(time) })} · ${record ? t('newBest') : t('best', { time: format(previous) })}`, 'done');
}

function say(text, kind) {
  ui.status.textContent = text;
  ui.status.className = `status ${kind}`;
}

function format(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderTime() {
  ui.time.textContent = format(elapsed());
}

// `wrong` shakes the cards of a refused claim; `fresh` animates newly dealt positions.
function render({ wrong = [], fresh = [] } = {}) {
  renderTime();
  ui.found.textContent = t.number(game.found);
  ui.deck.textContent = t.number(game.deck.length);
  ui.hint.disabled = game.over;
  ui.table.style.setProperty('--rows', Math.ceil(game.table.length / 3));
  if (buttons.length !== game.table.length) {
    buttons = game.table.map((_, i) => {
      const button = document.createElement('button');
      button.addEventListener('click', () => tap(i));
      return button;
    });
    shown = [];
    ui.table.replaceChildren(...buttons);
  }
  game.table.forEach((c, i) => {
    const button = buttons[i];
    if (shown[i] !== c) {
      button.replaceChildren(drawCard(c));
      button.setAttribute('aria-label', label(c));
      shown[i] = c;
    }
    button.className = 'card';
    button.classList.toggle('selected', selected.includes(i));
    button.classList.toggle('hinted', hinted.includes(i));
    button.setAttribute('aria-pressed', String(selected.includes(i)));
    // One-off animations restart only for the cards they concern.
    for (const [name, on] of [['wrong', wrong.includes(i)], ['fresh', fresh.includes(i)]]) {
      if (!on) continue;
      void button.offsetWidth;
      button.classList.add(name);
    }
  });
}

function label(c) {
  const [n, shape, shading, color] = features(c);
  return t('card', { count: n + 1, shape: t(`shape${shape}`), shading: t(`shading${shading}`), color: t(`color${color}`) });
}

function drawCard(c) {
  const [n, shape, shading, color] = features(c);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 64');
  svg.setAttribute('aria-hidden', 'true');
  const xs = [[50], [37, 63], [24, 50, 76]][n];
  for (const x of xs) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', SHAPES[shape]);
    path.setAttribute('transform', `translate(${x} 32)`);
    path.setAttribute('class', `shape c${color} s${shading}`);
    if (shading === 1) path.setAttribute('fill', `url(#stripes-${color})`);
    svg.append(path);
  }
  return svg;
}

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const valid = Array.isArray(s.game?.deck) && Array.isArray(s.game?.table);
    return { game: valid ? s.game : null, elapsed: Number(s.elapsed) || 0, best: Number(s.best) || null };
  } catch {
    return { game: null, elapsed: 0, best: null };
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, elapsed: elapsed(), best: saved.best }));
  } catch {
    // Private mode: nothing persists.
  }
}
