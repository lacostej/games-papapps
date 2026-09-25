import { pickUiLanguage, translateDom, translator, WORD_LANGUAGES } from './i18n.js';
import { bestWords, canSpell, commonFirst, drawLetter, LETTER_COUNT } from '../core/letters.js';
import { Calculation, drawNumbers, numbersScore, OPS, solve } from '../core/numbers.js';
import { lettersScore, MODES, ROUND_SECONDS, roundKind } from '../core/session.js';

const STORAGE_KEY = 'chiffres-lettres';
// How many of the computer's best words to show; the rest are counted.
const SHOWN_WORDS = 3;
// Typographic signs for display; the core uses plain '-'.
const SIGN = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
const $ = (id) => document.getElementById(id);
const ui = { mode: $('mode'), language: $('language'), score: $('score'), round: $('round'), timer: $('timer'), stage: $('stage') };

const t = translator(pickUiLanguage(navigator.languages ?? [navigator.language]));
const saved = loadSaved();
const score = saved.score;
const packs = new Map();
let round;
let timerId;

document.documentElement.lang = t.code;
document.title = t('title');
translateDom(document, t);
const MODE_LABELS = { both: 'modeBoth', numbers: 'modeNumbers', letters: 'modeLetters' };
for (const mode of Object.keys(MODES)) ui.mode.add(new Option(t(MODE_LABELS[mode]), mode));
for (const { code, name } of WORD_LANGUAGES) ui.language.add(new Option(name, code));
ui.mode.value = saved.mode;
ui.language.value = saved.language;

ui.mode.addEventListener('change', () => {
  save();
  startRound(saved.index);
});
ui.language.addEventListener('change', () => {
  save();
  if (round.kind === 'letters') startRound(round.index);
});
ui.score.addEventListener('click', () => {
  if (!confirm(t('resetScore') + ' ?')) return;
  score.you = 0;
  score.computer = 0;
  save();
  renderScore();
});
document.addEventListener('keydown', onKey);

renderScore();
startRound(saved.index);

function startRound(index) {
  stopTimer();
  const kind = roundKind(ui.mode.value, index);
  round = { index, kind, phase: 'draw' };
  saved.index = index;
  save();
  ui.round.textContent = t(kind === 'numbers' ? 'roundNumbers' : 'roundLetters', { n: t.number(index + 1) });
  if (kind === 'numbers') {
    Object.assign(round, drawNumbers());
    round.calc = new Calculation(round.plates);
    startThinking();
  } else {
    round.letters = [];
    round.picked = [];
    waitForPack();
  }
}

// Letters can't be drawn before the dictionary (with the draw weights) has arrived.
function waitForPack() {
  const current = round;
  round.pack = 'loading';
  render();
  loadPack(ui.language.value).then(
    () => (current.pack = 'ready'),
    () => (current.pack = 'failed'),
  ).then(() => current === round && render());
}

function loadPack(code) {
  if (!packs.has(code)) {
    const url = new URL(`../../words/${code}.json`, import.meta.url);
    const pending = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((pack) => {
        const words = pack.words.split(' ');
        return { ...pack, words, set: new Set(words), common: new Set(pack.common.split(' ')) };
      });
    packs.set(code, pending);
    pending.catch(() => packs.delete(code));
  }
  return packs.get(code);
}

function startThinking() {
  round.phase = 'think';
  round.deadline = Date.now() + ROUND_SECONDS * 1000;
  ui.timer.hidden = false;
  tick();
  timerId = setInterval(tick, 250);
  render();
}

function tick() {
  const left = Math.max(0, round.deadline - Date.now());
  ui.timer.firstElementChild.textContent = t.number(Math.ceil(left / 1000));
  ui.timer.querySelector('.bar > div').style.width = `${(left / (ROUND_SECONDS * 1000)) * 100}%`;
  ui.timer.classList.toggle('low', left <= 10000);
  if (left === 0) {
    navigator.vibrate?.([80, 60, 80]);
    toAnswer(true);
  }
}

function stopTimer() {
  clearInterval(timerId);
  timerId = undefined;
}

function toAnswer(timeUp = false) {
  stopTimer();
  round.phase = 'answer';
  round.timeUp = timeUp;
  ui.timer.hidden = true;
  render();
}

async function pickLetter(kind) {
  if (round.pack !== 'ready' || round.phase !== 'draw' || round.letters.length >= LETTER_COUNT) return;
  const pack = await loadPack(ui.language.value);
  round.letters.push(drawLetter(kind === 'vowel' ? pack.vowels : pack.consonants));
  if (round.letters.length === LETTER_COUNT) startThinking();
  else render();
}

async function submitLetters(word) {
  round.phase = 'result';
  const pack = await loadPack(ui.language.value);
  const you = lettersScore(word, round.letters, (w) => pack.set.has(w), canSpell);
  const best = commonFirst(bestWords(pack.words, round.letters), pack.common);
  const computer = best[0]?.length ?? 0;
  round.result = { word, you, best, computer, reason: !word || you ? '' : pack.set.has(word) ? 'cantSpell' : 'notAWord', source: pack.attribution };
  finish(you, computer);
}

function submitNumbers() {
  round.phase = 'result';
  const value = round.calc.closest(round.target);
  const best = solve(round.plates, round.target);
  round.result = { value, steps: round.calc.steps, best, you: numbersScore(value, round.target), computer: numbersScore(best.value, round.target) };
  finish(round.result.you, round.result.computer);
}

function finish(you, computer) {
  score.you += you;
  score.computer += computer;
  saved.index = round.index + 1;
  save();
  renderScore(true);
  render();
}

function renderScore(bump = false) {
  ui.score.replaceChildren(
    el('span', { className: 'who' }, t('you')),
    el('b', {}, t.number(score.you)),
    el('span', { className: 'sep' }, '·'),
    el('b', {}, t.number(score.computer)),
    el('span', { className: 'who' }, t('computer')),
  );
  if (bump) {
    ui.score.classList.remove('bump');
    void ui.score.offsetWidth;
    ui.score.classList.add('bump');
  }
}

function render() {
  const view = round.kind === 'numbers' ? renderNumbers() : renderLetters();
  ui.stage.replaceChildren(...view);
}

// Letters -----------------------------------------------------------------------------

function tiles(onTap) {
  return el(
    'div',
    { className: 'tiles' },
    ...Array.from({ length: LETTER_COUNT }, (_, i) => {
      const letter = round.letters[i];
      const used = round.picked?.includes(i);
      const tile = el(onTap && letter ? 'button' : 'span', { className: `tile ${letter ? '' : 'empty'} ${used ? 'used' : ''}` }, letter ?? '');
      if (onTap && letter) {
        tile.disabled = used;
        tile.addEventListener('click', () => onTap(i));
      }
      return tile;
    }),
  );
}

function renderLetters() {
  if (round.phase === 'draw') {
    if (round.pack === 'failed') {
      return [tiles(), el('p', { className: 'hint alert' }, t('loadFailed')), el('div', { className: 'choices' }, button(t('retry'), waitForPack, 'big primary'))];
    }
    const loading = round.pack !== 'ready';
    const left = LETTER_COUNT - round.letters.length;
    return [
      tiles(),
      el('p', { className: 'hint' }, loading ? t('loading') : t('pickLetters', { count: left })),
      el(
        'div',
        { className: 'choices' },
        button(t('vowel'), () => pickLetter('vowel'), 'big', undefined, loading),
        button(t('consonant'), () => pickLetter('consonant'), 'big', undefined, loading),
      ),
    ];
  }
  if (round.phase === 'think') {
    return [tiles(), el('div', { className: 'choices' }, button(t('answer'), () => toAnswer(), 'big primary'))];
  }
  if (round.phase === 'answer') {
    const word = round.picked.map((i) => round.letters[i]).join('');
    return [
      round.timeUp ? el('p', { className: 'hint alert' }, t('timeUp')) : el('p', { className: 'hint' }, t('yourWord')),
      el('p', { className: 'word' }, word || ' '),
      tiles((i) => {
        round.picked.push(i);
        render();
      }),
      el(
        'div',
        { className: 'choices' },
        button('⌫', () => {
          round.picked.pop();
          render();
        }, 'icon', t('clear')),
        button(t('noWord'), () => submitLetters('')),
        button(t('submit'), () => submitLetters(word), 'primary', undefined, !word),
      ),
    ];
  }
  const { word, you, best, computer, reason, source } = round.result;
  return [
    tiles(),
    resultRow(t('you'), word || '—', you, reason ? t(reason) : ''),
    resultRow(
      t('computer'),
      best.slice(0, SHOWN_WORDS).join(' · ') || '—',
      computer,
      best.length > SHOWN_WORDS ? t('computerWords', { count: best.length - SHOWN_WORDS }) : best.length ? '' : t('computerNone'),
    ),
    el('div', { className: 'choices' }, button(t('next'), () => startRound(round.index + 1), 'big primary')),
    el('p', { className: 'credits' }, t('credits', { source })),
  ];
}

// Numbers -----------------------------------------------------------------------------

function renderNumbers() {
  const target = el('div', { className: 'target' }, el('span', {}, t('target')), el('b', {}, String(round.target)));
  if (round.phase === 'think') {
    return [
      target,
      el('div', { className: 'plates' }, ...round.plates.map((p) => el('span', { className: 'plate' }, String(p)))),
      el('div', { className: 'choices' }, button(t('answer'), () => toAnswer(), 'big primary')),
    ];
  }
  if (round.phase === 'answer') {
    const { calc } = round;
    const pick = round.pick ?? {};
    const tapNumber = (n) => {
      if (pick.a === undefined || pick.op === undefined) round.pick = { a: n.id };
      else if (n.id === pick.a) round.pick = {};
      else {
        const made = calc.combine(pick.a, pick.op, n.id);
        round.pick = made ? { a: made.id } : { a: pick.a, op: pick.op };
        round.error = !made;
        if (!made) navigator.vibrate?.(40);
      }
      render();
    };
    const value = calc.closest(round.target);
    return [
      target,
      el('p', { className: `hint ${round.error ? 'alert' : ''}` }, round.error ? t('notAllowed') : round.timeUp ? t('timeUp') : t('yourNumbers')),
      el(
        'div',
        { className: 'plates' },
        ...calc.numbers.map((n) => {
          const b = button(String(n.value), () => tapNumber(n), `plate ${n.id === pick.a ? 'selected' : ''} ${n.id >= round.plates.length ? 'made' : ''}`);
          return b;
        }),
      ),
      el(
        'div',
        { className: 'ops' },
        ...OPS.map((op) =>
          button(SIGN[op], () => {
            if (pick.a === undefined) return;
            round.pick = { a: pick.a, op };
            round.error = false;
            render();
          }, `op ${pick.op === op ? 'selected' : ''}`, undefined, pick.a === undefined),
        ),
      ),
      stepsList(calc.steps.map(({ a, op, b, made }) => ({ a: a.value, op, b: b.value, result: made.value }))),
      el(
        'div',
        { className: 'choices' },
        button(t('undo'), () => {
          calc.undo();
          round.pick = {};
          round.error = false;
          render();
        }, '', undefined, !calc.steps.length),
        button(t('announce', { value: t.number(value) }), submitNumbers, 'primary'),
      ),
    ];
  }
  const { value, steps, best, you, computer } = round.result;
  const distance = (v) => (v === round.target ? t('exact') : t('away', { count: Math.abs(v - round.target) }));
  target.classList.add('small');
  return [
    target,
    resultRow(t('you'), `${value}`, you, distance(value), stepsList(steps.map(({ a, op, b, made }) => ({ a: a.value, op, b: b.value, result: made.value })))),
    resultRow(t('computer'), `${best.value}`, computer, distance(best.value), stepsList(best.steps)),
    el('div', { className: 'choices' }, button(t('next'), () => startRound(round.index + 1), 'big primary')),
  ];
}

function stepsList(steps) {
  return el('ol', { className: 'steps' }, ...steps.map(({ a, op, b, result }) => el('li', {}, `${a} ${SIGN[op]} ${b} = ${result}`)));
}

// Shared ------------------------------------------------------------------------------

function resultRow(who, answer, points, note, extra = '') {
  return el(
    'div',
    { className: 'result' },
    el('span', { className: 'who' }, who),
    el('b', { className: `answer ${points ? 'good' : 'bad'}` }, answer),
    el('span', { className: 'points' }, t('points', { count: points })),
    note ? el('span', { className: 'note' }, note) : '',
    extra,
  );
}

function button(label, onClick, className = '', ariaLabel, disabled = false) {
  const b = el('button', { className, disabled }, label);
  if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
  b.addEventListener('click', onClick);
  return b;
}

function el(tag, props, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'SELECT') return;
  if (round.kind !== 'letters') return;
  const key = e.key.toUpperCase();
  if (round.phase === 'draw' && (key === 'V' || key === 'C')) pickLetter(key === 'V' ? 'vowel' : 'consonant');
  else if (round.phase === 'think' && e.key === 'Enter') toAnswer();
  else if (round.phase === 'answer') {
    if (e.key === 'Backspace') round.picked.pop();
    else if (e.key === 'Enter') return submitLetters(round.picked.map((i) => round.letters[i]).join(''));
    else if (/^[A-Z]$/.test(key)) {
      const i = round.letters.findIndex((l, k) => l === key && !round.picked.includes(k));
      if (i < 0) return;
      round.picked.push(i);
    } else return;
    e.preventDefault();
    render();
  }
}

function loadSaved() {
  const uiLanguage = pickUiLanguage(navigator.languages ?? [navigator.language]);
  const defaults = { mode: 'both', language: uiLanguage, index: 0, score: { you: 0, computer: 0 } };
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      mode: MODES[s.mode] ? s.mode : defaults.mode,
      language: WORD_LANGUAGES.some((l) => l.code === s.language) ? s.language : defaults.language,
      index: Number.isInteger(s.index) && s.index >= 0 ? s.index : defaults.index,
      score: { ...defaults.score, ...s.score },
    };
  } catch {
    return defaults;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: ui.mode.value, language: ui.language.value, index: saved.index, score }));
  } catch {
    // Private mode: nothing persists.
  }
}
