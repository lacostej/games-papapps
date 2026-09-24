import { pickUiLanguage, translateDom, translator } from './i18n.js';
import { Board } from '../core/board.js';
import { BOXES, generate, LEVELS_BY_SIZE } from '../core/sudoku.js';
import { SYMBOL_SETS } from '../data/symbols.js';

const SIZES = [4, 6, 9];
const STORAGE_KEY = 'sudoku';
const $ = (id) => document.getElementById(id);
const ui = {
  size: $('size'),
  symbols: $('symbols'),
  level: $('level'),
  status: $('status'),
  board: $('board'),
  pad: $('pad'),
  notes: $('notes'),
};

const t = translator(pickUiLanguage(navigator.languages ?? [navigator.language]));
const saved = loadSaved();
let board;
let cells = [];
let selected = -1;
// Value highlighted while a pad key is held with no cell selected.
let peek = 0;

document.documentElement.lang = t.code;
translateDom(document, t);
for (const n of SIZES) ui.size.add(new Option(`${n}×${n}`, String(n)));
for (const set of SYMBOL_SETS) ui.symbols.add(new Option(set.symbols.slice(0, 3).join(' '), set.id));
ui.size.value = String(saved.size);
ui.symbols.value = saved.symbols;
fillLevels(saved.level);

ui.size.addEventListener('change', () => {
  fillLevels(ui.level.value);
  newGame();
});
ui.level.addEventListener('change', () => newGame());
ui.symbols.addEventListener('change', () => {
  buildPad();
  render();
  save();
});
$('new').addEventListener('click', () => newGame());
ui.notes.addEventListener('click', () => setNoting(!noting()));
$('restart').addEventListener('click', () => {
  const entered = board.values.some((v, i) => v && !board.isGiven(i));
  if (entered && !confirm(t('confirmRestart'))) return;
  board.restart();
  render();
  save();
});
document.addEventListener('keydown', onKey);

if (saved.board) startBoard(saved.board);
else newGame();

// Levels a size can't produce (4x4 hard) fall back to the hardest it has.
function fillLevels(wanted) {
  const levels = LEVELS_BY_SIZE[ui.size.value];
  ui.level.replaceChildren(...levels.map((level) => new Option(t(level), level)));
  ui.level.value = levels.includes(wanted) ? wanted : levels.at(-1);
}

function newGame() {
  const n = Number(ui.size.value);
  startBoard(generate(n, ui.level.value));
  save();
}

function startBoard(state) {
  board = new Board(state);
  selected = -1;
  buildBoard();
  buildPad();
  render();
}

function symbols() {
  return SYMBOL_SETS.find((s) => s.id === ui.symbols.value).symbols;
}

function buildBoard() {
  const { n } = board;
  const box = BOXES[n];
  ui.board.style.setProperty('--n', n);
  ui.board.style.setProperty('--across', n / box.cols);
  ui.board.style.setProperty('--down', n / box.rows);
  ui.board.style.setProperty('--box-rows', box.rows);
  ui.board.style.setProperty('--box-cols', box.cols);
  const boxes = board.geometry.boxes.map(() => Object.assign(document.createElement('div'), { className: 'box' }));
  cells = board.values.map((_, i) => {
    const cell = Object.assign(document.createElement('button'), { className: 'cell', tabIndex: -1 });
    cell.addEventListener('click', () => select(i === selected ? -1 : i));
    boxes[board.geometry.boxOf[i]].append(cell);
    return cell;
  });
  ui.board.replaceChildren(...boxes);
}

function buildPad() {
  const erase = Object.assign(document.createElement('button'), { className: 'erase', textContent: '⌫' });
  erase.setAttribute('aria-label', t('erase'));
  erase.addEventListener('click', () => enter(0));
  ui.pad.style.setProperty('--keys', board.n + 1);
  ui.pad.replaceChildren(
    ...symbols().slice(0, board.n).map((symbol, k) => {
      const key = Object.assign(document.createElement('button'), { textContent: symbol });
      key.addEventListener('click', () => enter(k + 1));
      key.addEventListener('pointerdown', () => selected < 0 && setPeek(k + 1));
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) key.addEventListener(type, () => setPeek(0));
      // A long press would otherwise open the context menu and cancel the pointer.
      key.addEventListener('contextmenu', (e) => e.preventDefault());
      return key;
    }),
    erase,
  );
}

function select(i, focus = false) {
  selected = i;
  render();
  if (focus) cells[i].focus();
  // Otherwise the focus ring looks like a selection.
  else if (i < 0 && cells.includes(document.activeElement)) document.activeElement.blur();
}

function noting() {
  return ui.notes.getAttribute('aria-pressed') === 'true';
}

function setNoting(on) {
  ui.notes.setAttribute('aria-pressed', String(on));
  ui.pad.classList.toggle('noting', on);
}

function setPeek(v) {
  if (peek === v) return;
  peek = v;
  render();
}

// Tapping the value a cell already holds clears it.
// `note` toggles v as a note instead; v = 0 erases.
function enter(v, note = noting()) {
  if (selected < 0 || board.solved) return;
  let changed;
  if (!v) changed = board.clear(selected);
  else if (note) changed = board.toggleNote(selected, v);
  else changed = board.set(selected, board.values[selected] === v ? 0 : v);
  if (!changed) return;
  render();
  save();
  if (board.solved) navigator.vibrate?.([15, 40, 15, 40, 60]);
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'SELECT') return;
  const { n, geometry: g } = board;
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (moves[e.key]) {
    e.preventDefault();
    if (selected < 0) return select(0, true);
    const [dr, dc] = moves[e.key];
    const r = (g.rowOf[selected] + dr + n) % n;
    const c = (g.colOf[selected] + dc + n) % n;
    return select(r * n + c, true);
  }
  if (e.key === 'Escape') return select(-1);
  if (e.key.toUpperCase() === 'N') return setNoting(!noting());
  if (['Backspace', 'Delete', '0', ' '].includes(e.key)) {
    e.preventDefault();
    return enter(0);
  }
  // Digits work with every symbol set; letters too. Shift flips between value and note;
  // with Shift held, e.key is a punctuation mark, so digits come from e.code.
  const digit = Number(e.code.match(/^(?:Digit|Numpad)(\d)$/)?.[1] ?? e.key);
  const letter = e.key.length === 1 ? e.key.toUpperCase().charCodeAt(0) - 64 : 0;
  const v = digit >= 1 && digit <= n ? digit : letter >= 1 && letter <= n ? letter : 0;
  if (v) enter(v, noting() !== e.shiftKey);
}

function render() {
  const { n, values, geometry: g } = board;
  const shown = symbols();
  const conflicts = board.conflicts();
  const value = selected >= 0 ? values[selected] : peek;
  const near = (i) =>
    selected >= 0 && (g.rowOf[i] === g.rowOf[selected] || g.colOf[i] === g.colOf[selected] || g.boxOf[i] === g.boxOf[selected]);
  cells.forEach((cell, i) => {
    const v = values[i];
    if (v || !board.notes[i]) cell.textContent = v ? shown[v - 1] : '';
    else cell.replaceChildren(renderNotes(i, shown, value));
    cell.className = [
      'cell',
      board.isGiven(i) ? 'given' : v && 'entered',
      i === selected ? 'selected' : v && v === value ? 'same' : near(i) && 'near',
      conflicts.has(i) && 'conflict',
    ]
      .filter(Boolean)
      .join(' ');
    cell.tabIndex = i === selected || (selected < 0 && i === 0) ? 0 : -1;
    const noted = shown.slice(0, n).filter((_, k) => board.hasNote(i, k + 1));
    const content = v ? shown[v - 1] : noted.length ? t('notesList', { list: noted.join(' ') }) : t('empty');
    cell.setAttribute('aria-label', t('cell', { row: g.rowOf[i] + 1, col: g.colOf[i] + 1, value: content }));
  });

  const counts = board.counts();
  [...ui.pad.children].slice(0, n).forEach((key, k) => {
    key.classList.toggle('done', counts[k + 1] >= n);
    key.disabled = board.solved;
  });
  ui.pad.lastElementChild.disabled = board.solved;

  ui.board.classList.toggle('complete', board.solved);
  ui.status.classList.toggle('solved', board.solved);
  ui.status.textContent = board.solved ? t('solved') : t('cellsLeft', { level: t(board.level), count: counts[0] });
}

// One slot per value, laid out like a box, so each note keeps its place.
function renderNotes(i, shown, highlighted) {
  const notes = Object.assign(document.createElement('span'), { className: 'notes' });
  notes.setAttribute('aria-hidden', 'true');
  for (let v = 1; v <= board.n; v++) {
    const on = board.hasNote(i, v);
    const note = Object.assign(document.createElement('span'), { textContent: on ? shown[v - 1] : '' });
    if (on && v === highlighted) note.className = 'same';
    notes.append(note);
  }
  return notes;
}

function loadSaved() {
  const defaults = { size: 9, symbols: SYMBOL_SETS[0].id, level: 'easy', board: null };
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const size = SIZES.includes(s.size) ? s.size : defaults.size;
    return {
      size,
      symbols: SYMBOL_SETS.some((set) => set.id === s.symbols) ? s.symbols : defaults.symbols,
      level: typeof s.level === 'string' ? s.level : defaults.level,
      board: s.board?.n === size && Array.isArray(s.board.values) ? s.board : null,
    };
  } catch {
    return defaults;
  }
}

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ size: board.n, symbols: ui.symbols.value, level: ui.level.value, board }),
    );
  } catch {
    // Private mode: the game just doesn't persist.
  }
}
