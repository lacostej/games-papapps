import { pickUiLanguage, translateDom, translator } from './i18n.js';
import { faceSvg } from './faces.js';
import { Game } from '../core/mahjong.js';
import { LAYOUTS } from '../core/layouts.js';

const STORAGE_KEY = 'mahjong';
// Tile width : height, and how far each layer is lifted up-left, as a share of tile width.
const ASPECT = 4 / 3;
const LIFT = 0.16;
const $ = (id) => document.getElementById(id);
const ui = {
  layout: $('layout'),
  time: $('time'),
  pairs: $('pairs'),
  status: $('status'),
  boardBox: $('board-box'),
  board: $('board'),
  hint: $('hint'),
  undo: $('undo'),
  shuffle: $('shuffle'),
};

const t = translator(pickUiLanguage(navigator.languages ?? [navigator.language]));
const winds = [...t('winds')];
const saved = loadSaved();
let game;
let clock;
let selected = null;
let hinted = [];
let tiles = [];

document.documentElement.lang = t.code;
translateDom(document, t);
for (const [name, layout] of Object.entries(LAYOUTS)) ui.layout.add(new Option(t(name, { count: layout.length }), name));
ui.layout.value = saved.layout;
ui.layout.addEventListener('change', () => newGame());
$('new').addEventListener('click', () => newGame());
ui.hint.addEventListener('click', hint);
ui.undo.addEventListener('click', undo);
ui.shuffle.addEventListener('click', shuffle);
document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
new ResizeObserver(() => place()).observe(ui.boardBox);
setInterval(renderTime, 500);

if (saved.game) {
  game = new Game(saved.game);
  clock = { before: saved.elapsed, since: null };
  build();
  resume();
  if (game.won) showResult(saved.elapsed, saved.best[ui.layout.value]);
  else report();
} else {
  newGame();
}

function newGame() {
  game = new Game({ layout: LAYOUTS[ui.layout.value] });
  clock = { before: 0, since: null };
  selected = null;
  hinted = [];
  build();
  resume();
  say(t('rules'), '');
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
  if (!clock.since && !game.won && !document.hidden) clock.since = Date.now();
}

// One button per tile, created once per game; render() only updates classes.
function build() {
  tiles = game.tiles.map((tile, i) => {
    const b = document.createElement('button');
    b.className = `tile z${tile.z}`;
    b.innerHTML = faceSvg(tile.face, winds);
    b.style.zIndex = String(tile.z * 1000 + tile.y * 20 + tile.x);
    b.setAttribute('aria-label', t('tile', { n: i + 1 }));
    b.addEventListener('click', () => tap(i));
    return b;
  });
  ui.board.replaceChildren(...tiles);
  place();
  render();
}

// Largest tile size that fits the box, then absolute positions.
function place() {
  if (!game) return;
  const layout = game.tiles;
  const cols = Math.max(...layout.map((p) => p.x)) / 2 + 1;
  const rows = Math.max(...layout.map((p) => p.y)) / 2 + 1;
  const layers = Math.max(...layout.map((p) => p.z));
  const { width, height } = ui.boardBox.getBoundingClientRect();
  const w = Math.min(width / (cols + layers * LIFT + 0.1), height / (rows * ASPECT + layers * LIFT + 0.1));
  const h = w * ASPECT;
  const lift = w * LIFT;
  ui.board.style.width = `${cols * w + layers * lift}px`;
  ui.board.style.height = `${rows * h + layers * lift}px`;
  ui.board.style.setProperty('--w', `${w}px`);
  game.tiles.forEach((tile, i) => {
    const el = tiles[i];
    el.style.left = `${(tile.x / 2) * w + (layers - tile.z) * lift}px`;
    el.style.top = `${(tile.y / 2) * h + (layers - tile.z) * lift}px`;
  });
}

function tap(i) {
  if (game.won) return;
  if (!game.free(i)) {
    // A small shake says the tile is blocked.
    tiles[i].classList.remove('nope');
    void tiles[i].offsetWidth;
    tiles[i].classList.add('nope');
    return;
  }
  if (selected === null || selected === i) {
    selected = selected === i ? null : i;
  } else if (game.remove(selected, i)) {
    selected = null;
    hinted = [];
    navigator.vibrate?.(15);
    if (game.won) finish();
    else report();
    save();
  } else {
    selected = i;
  }
  render();
}

function hint() {
  const pair = game.hint();
  if (!pair) return report();
  hinted = pair;
  render();
}

function undo() {
  if (!game.undo()) return;
  selected = null;
  hinted = [];
  resume();
  report();
  render();
  save();
}

function shuffle() {
  if (game.won || !game.shuffle()) return report();
  selected = null;
  hinted = [];
  game.tiles.forEach((tile, i) => (tiles[i].innerHTML = faceSvg(tile.face, winds)));
  report();
  render();
  save();
}

// The status line: rules while pairs remain, or what to do when stuck.
function report() {
  if (game.hint()) return say(t('rules'), '');
  const rest = game.tiles.filter((x) => !x.removed);
  // Try a shuffle on a copy to know whether one can help.
  const probe = new Game({ tiles: game.tiles });
  say(probe.shuffle() ? t('stuck') : t('impossible'), 'bad');
  ui.shuffle.classList.toggle('primary', rest.length > 0);
}

function finish() {
  pause();
  const time = elapsed();
  const previous = saved.best[ui.layout.value];
  saved.best[ui.layout.value] = previous ? Math.min(previous, time) : time;
  showResult(time, previous);
}

function showResult(time, previous) {
  const record = !previous || time < previous;
  say(`${t('won', { time: format(time) })} · ${record ? t('newBest') : t('best', { time: format(previous) })}`, 'done');
}

function say(text, kind) {
  ui.status.textContent = text;
  ui.status.className = `status ${kind}`;
  if (kind !== 'bad') ui.shuffle.classList.remove('primary');
}

function format(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderTime() {
  ui.time.textContent = format(elapsed());
}

function render() {
  renderTime();
  ui.pairs.textContent = t.number(game.left / 2);
  ui.undo.disabled = !game.history.length;
  ui.hint.disabled = game.won;
  ui.shuffle.disabled = game.won;
  game.tiles.forEach((tile, i) => {
    const el = tiles[i];
    el.hidden = tile.removed;
    el.classList.toggle('blocked', !tile.removed && !game.free(i));
    el.classList.toggle('selected', i === selected);
    el.classList.toggle('hinted', hinted.includes(i));
  });
}

function loadSaved() {
  const defaults = { layout: 'easy', game: null, elapsed: 0, best: {} };
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const layout = LAYOUTS[s.layout] ? s.layout : defaults.layout;
    const valid = Array.isArray(s.game?.tiles) && s.game.tiles.length === LAYOUTS[layout].length;
    return { layout, game: valid ? s.game : null, elapsed: Number(s.elapsed) || 0, best: s.best && typeof s.best === 'object' ? s.best : {} };
  } catch {
    return defaults;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: ui.layout.value, game, elapsed: elapsed(), best: saved.best }));
  } catch {
    // Private mode: nothing persists.
  }
}
