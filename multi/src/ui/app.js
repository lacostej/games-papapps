// Multiplayer page. One device hosts (and may play too); the others join by scanning its code.
// The host's own player talks to the session through an in-memory connection, the others over
// the LAN, so both play the same way.
import { Host, Player } from '../core/session.js';
import { memoryPair } from '../core/memory.js';
import { GAMES } from '../games/index.js';
import { LanListener, reply } from '../net/lan.js';
import { Calculation, OPS } from '../../../chiffres-lettres/src/core/numbers.js';
import { canScan, qrSvg, scan } from './qr.js';
import { translator } from './i18n.js';

const STORAGE_KEY = 'multi';
const SIGN = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
const ROUNDS = [3, 5, 10];
const THINK = [15, 30, 45, 60];
const ANSWER = [20, 30, 45, 60];
const t = translator(navigator.languages ?? [navigator.language]);
const main = document.getElementById('app');
const timer = document.getElementById('timer');
const roundLabel = document.getElementById('round');
const profile = loadProfile();
// Moved between renders while the camera runs, so the stream keeps playing.
const video = document.createElement('video');

const app = {
  screen: 'home', // home · joinName · reply · host · player
  host: null,
  listener: null,
  me: null,
  invite: null,
  inviteOpen: false,
  status: '',
  stopScan: null,
  replyCode: null,
  error: '',
  settings: { rounds: 5, level: 'normal', think: 45, answer: 30, hostPlays: true },
  play: null,
};

document.documentElement.lang = t.code;
document.title = t('title');
document.getElementById('back').textContent = t('allGames');

const joinCode = new URLSearchParams(location.hash.slice(1)).get('join');
if (joinCode) {
  history.replaceState(null, '', location.pathname + location.search);
  app.invite = joinCode;
  app.screen = 'joinName';
}
addEventListener('beforeunload', (e) => {
  if (app.host || app.me) e.preventDefault();
});
render();
setInterval(tick, 250);

// Starting ----------------------------------------------------------------------------

function startHosting() {
  app.host = new Host({ games: GAMES });
  app.listener = new LanListener(iceConfig());
  app.host.listen(app.listener);
  app.host.onchange = () => {
    if (app.status === t('connecting')) app.status = '';
    render();
  };
  if (app.settings.hostPlays) hostJoins();
  app.screen = 'host';
  keepAwake();
  newInvite();
}

function hostJoins() {
  const [hostEnd, playerEnd] = memoryPair();
  app.host.accept(hostEnd);
  app.me = new Player(playerEnd, profile);
  app.me.onchange = render;
}

async function startJoining() {
  app.screen = 'reply';
  app.replyCode = null;
  app.error = '';
  render();
  let connection;
  try {
    ({ code: app.replyCode, connection } = await reply(app.invite, iceConfig()));
  } catch {
    app.error = t('badCode');
    return render();
  }
  render();
  try {
    app.me = new Player(await connection, profile);
    app.me.onchange = render;
    app.screen = 'player';
    keepAwake();
  } catch {
    app.error = t('failed');
  }
  render();
}

async function newInvite() {
  app.invite = null;
  render();
  app.invite = await app.listener.invite();
  render();
}

async function acceptReply(text) {
  try {
    await app.listener.accept(codeFrom(text));
    app.status = t('connecting');
    newInvite();
  } catch (e) {
    app.status = e.message === 'stale' ? t('staleReply') : t('badCode');
  }
  render();
}

async function toggleScan() {
  if (app.stopScan) {
    app.stopScan();
    app.stopScan = null;
    return render();
  }
  try {
    app.stopScan = await scan(video, (text) => {
      app.stopScan?.();
      app.stopScan = null;
      acceptReply(text);
    });
    app.status = '';
  } catch {
    app.status = t('cameraFailed');
  }
  render();
}

function startSeries() {
  const { rounds, level, think, answer } = app.settings;
  app.host.start(Array.from({ length: rounds }, () => ({ game: 'numbers', options: { level, think, answer } })));
}

// Rendering ---------------------------------------------------------------------------

function render() {
  const view = { home, joinName, reply: replyScreen, host: hostScreen, player: playerScreen }[app.screen]();
  main.replaceChildren(...view);
  if (app.stopScan) video.play().catch(() => {});
  const state = currentState();
  roundLabel.textContent = state?.round ? t('round', { n: state.round.index + 1, total: state.total }) : '';
  tick();
}

function home() {
  return [
    el('h1', {}, t('title')),
    nameField(),
    button(t('host'), startHosting, 'big primary'),
    el('p', { className: 'hint' }, t('joinHint')),
    el(
      'details',
      { className: 'paste' },
      el('summary', {}, t('joinWithCode')),
      pasteForm(t('join'), (text) => {
        app.invite = codeFrom(text);
        startJoining();
      }),
    ),
  ];
}

function joinName() {
  return [nameField(), button(t('join'), startJoining, 'big primary')];
}

function replyScreen() {
  if (app.error) {
    return [
      el('p', { className: 'hint alert' }, app.error),
      button(t('close'), () => {
        app.screen = 'home';
        render();
      }),
    ];
  }
  if (!app.replyCode) return [el('p', { className: 'hint' }, t('connecting'))];
  return [
    el('p', { className: 'hint' }, t('showHost')),
    qrBox(app.replyCode),
    codeField(app.replyCode),
  ];
}

function hostScreen() {
  const { host } = app;
  if (host.phase === 'lobby') return [invitePanel(), playersList(host.view(), true), settingsForm(), button(t('start'), startSeries, 'big primary', !host.players.size)];
  const bar = el(
    'div',
    { className: 'host-bar' },
    button(t('invite'), () => {
      app.inviteOpen = !app.inviteOpen;
      render();
    }, app.inviteOpen ? 'selected' : ''),
    host.phase === 'round' ? button(t('skip'), () => host.skip()) : '',
    host.phase === 'results' ? button(host.round.index + 1 < host.series.length ? t('next') : t('seeFinal'), () => host.next(), 'primary') : '',
    host.phase === 'end' ? button(t('playAgain'), () => host.start(host.series), 'primary') : '',
  );
  const game = app.me ? playerScreen() : boardScreen(host.view());
  return [bar, app.inviteOpen ? invitePanel() : '', ...game];
}

function invitePanel() {
  const url = app.invite && `${location.origin}${location.pathname}${location.search}#join=${app.invite}`;
  return el(
    'section',
    { className: 'invite' },
    el('p', { className: 'hint' }, t('inviteHint')),
    url ? qrBox(url) : el('div', { className: 'qr' }, '…'),
    url ? el('details', { className: 'paste' }, el('summary', {}, t('asText')), codeField(url)) : '',
    app.stopScan ? video : '',
    canScan() ? button(app.stopScan ? t('stopScan') : t('scanReply'), toggleScan, app.stopScan ? '' : 'primary') : '',
    pasteForm(t('add'), acceptReply, t('pasteReply')),
    app.status ? el('p', { className: 'hint alert' }, app.status) : '',
  );
}

function settingsForm() {
  const s = app.settings;
  const select = (label, key, values, show = String) => {
    const sel = el('select', {}, ...values.map((v) => new Option(show(v), v)));
    sel.value = s[key];
    sel.addEventListener('change', () => (s[key] = typeof s[key] === 'number' ? Number(sel.value) : sel.value));
    return el('label', {}, el('span', {}, label), sel);
  };
  const plays = el('input', { type: 'checkbox', checked: s.hostPlays });
  plays.addEventListener('change', () => {
    s.hostPlays = plays.checked;
    if (plays.checked) hostJoins();
    else {
      app.host.remove(profile.id);
      app.me = null;
    }
  });
  return el(
    'div',
    { className: 'settings' },
    select(t('rounds'), 'rounds', ROUNDS),
    select(t('level'), 'level', ['normal', 'kids'], (v) => t(v === 'kids' ? 'levelKids' : 'levelNormal')),
    select(t('think'), 'think', THINK, (n) => t('seconds', { n })),
    select(t('answer'), 'answer', ANSWER, (n) => t('seconds', { n })),
    el('label', { className: 'check' }, plays, el('span', {}, t('hostPlays'))),
  );
}

function playerScreen() {
  const { me } = app;
  const lost = me && !me.connected ? el('p', { className: 'hint alert' }, t('lost')) : '';
  const state = me?.state;
  if (!state) return [lost || el('p', { className: 'hint' }, t('connecting'))];
  if (state.phase === 'lobby') return [lost, el('p', { className: 'hint' }, t('waitingHost')), playersList(state)];
  if (state.phase === 'round') return [lost, ...roundView(state)];
  if (state.phase === 'results') return [lost, ...resultsView(state)];
  return [lost, el('h2', {}, t('finalScores')), playersList(state)];
}

// The host's screen when not playing: the draw, the clock and who has answered.
function boardScreen(state) {
  if (state.phase === 'round') return [target(state.round.deal.target), plates(state.round.deal.plates), el('p', { className: 'hint' }, state.round.open ? t('watching') : t('lookHint')), playersList(state, false, true)];
  if (state.phase === 'results') return resultsView(state);
  return [el('h2', {}, t('finalScores')), playersList(state)];
}

function roundView(state) {
  const { round } = state;
  const { plates: cards, target: goal } = round.deal;
  if (app.play?.index !== round.index) app.play = { index: round.index, calc: new Calculation(cards), pick: {}, touched: false, error: false, sent: false };
  const play = app.play;
  if (!round.open) return [target(goal), plates(cards), el('p', { className: 'hint' }, t('lookHint')), playersList(state)];

  const value = play.calc.closest(goal);
  if (play.sent || app.me.me?.answered) {
    return [target(goal), el('p', { className: 'hint' }, t('announced', { value })), stepsList(play.calc.steps), playersList(state, false, true)];
  }
  const { calc } = play;
  const pick = play.pick;
  const tap = (n) => {
    play.touched = true;
    if (pick.a === undefined || pick.op === undefined) play.pick = { a: n.id };
    else if (n.id === pick.a) play.pick = {};
    else {
      const made = calc.combine(pick.a, pick.op, n.id);
      play.pick = made ? { a: made.id } : { a: pick.a, op: pick.op };
      play.error = !made;
      if (!made) navigator.vibrate?.(40);
    }
    render();
  };
  return [
    target(goal),
    roster(state),
    el('p', { className: `hint ${play.error ? 'alert' : ''}` }, play.error ? t('notAllowed') : t('yourNumbers')),
    el('div', { className: 'plates' }, ...calc.slots.map((n) => (n ? button(String(n.value), () => tap(n), `plate ${n.id === pick.a ? 'selected' : ''} ${n.id >= cards.length ? 'made' : ''}`) : el('span', { className: 'plate empty' })))),
    el(
      'div',
      { className: 'ops' },
      ...OPS.map((op) =>
        button(SIGN[op], () => {
          play.pick = { a: pick.a, op };
          play.error = false;
          render();
        }, `op ${pick.op === op ? 'selected' : ''}`, pick.a === undefined),
      ),
    ),
    stepsList(calc.steps),
    el(
      'div',
      { className: 'choices' },
      button(t('undo'), () => {
        calc.undo();
        play.pick = {};
        play.error = false;
        render();
      }, '', !calc.steps.length),
      button(t('announce', { value }), () => {
        play.sent = true;
        app.me.submit({ moves: calc.toJSON().moves });
        render();
      }, 'primary', !play.touched),
    ),
  ];
}

function resultsView(state) {
  const { deal, answers, best } = state.results;
  const distance = (v) => (v === deal.target ? t('exact') : t('away', { count: Math.abs(v - deal.target) }));
  const rows = [...answers].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).map((a) => {
    const name = a.id === profile.id ? `${a.name} (${t('you')})` : a.name;
    if (!a.valid) return resultRow(name, '—', 0, t('noAnswer'));
    const steps = Calculation.from({ plates: deal.plates, moves: a.moves }).steps;
    return resultRow(name, String(a.value), a.score, distance(a.value), stepsList(steps));
  });
  return [
    target(deal.target, true),
    plates(deal.plates, true),
    ...rows,
    resultRow(t('computer'), String(best.value), null, distance(best.value), stepsList(best.steps.map(({ a, op, b, result }) => ({ a: { value: a }, op, b: { value: b }, made: { value: result } })))),
    el('h2', {}, t('scores')),
    playersList(state),
  ];
}

// Pieces ------------------------------------------------------------------------------

function target(value, small = false) {
  return el('div', { className: `target ${small ? 'small' : ''}` }, el('span', {}, t('target')), el('b', {}, String(value)));
}

function plates(values, small = false) {
  return el('div', { className: small ? 'cards' : 'plates' }, ...values.map((v) => el('span', { className: 'plate' }, String(v))));
}

function stepsList(steps) {
  return el('ol', { className: 'steps' }, ...steps.map(({ a, op, b, made }) => el('li', {}, `${a.value} ${SIGN[op]} ${b.value} = ${made.value}`)));
}

function resultRow(who, answer, points, note, extra = '') {
  return el(
    'div',
    { className: 'result' },
    el('span', { className: 'who' }, who),
    el('b', { className: `answer ${points ? 'good' : points === 0 ? 'bad' : ''}` }, answer),
    el('span', { className: 'points' }, points === null ? '' : t('points', { count: points })),
    note ? el('span', { className: 'note' }, note) : '',
    extra,
  );
}

// Players by score; the host can remove a player from the lobby.
function playersList(state, removable = false, answered = false) {
  if (!state.players.length) return el('p', { className: 'hint' }, t('noPlayers'));
  const players = [...state.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return el(
    'ul',
    { className: 'players' },
    ...players.map((p) =>
      el(
        'li',
        { className: `${p.connected ? '' : 'offline'} ${answered && p.answered ? 'answered' : ''}` },
        el('span', { className: 'name' }, p.id === profile.id ? `${p.name} (${t('you')})` : p.name),
        el('b', {}, String(p.score)),
        removable && p.id !== profile.id ? button('×', () => app.host.remove(p.id), 'remove') : '',
      ),
    ),
  );
}

// One line of names during play: who has announced, who has dropped out.
function roster(state) {
  return el('ul', { className: 'roster' }, ...state.players.map((p) => el('li', { className: `${p.connected ? '' : 'offline'} ${p.answered ? 'answered' : ''}` }, p.name)));
}

function nameField() {
  const input = el('input', { type: 'text', value: profile.name, maxLength: 20, autocomplete: 'nickname', placeholder: t('yourName') });
  input.addEventListener('input', () => {
    profile.name = input.value.trim();
    saveProfile();
  });
  return el('label', { className: 'name-field' }, el('span', {}, t('yourName')), input);
}

function pasteForm(label, onSubmit, placeholder = '') {
  const input = el('input', { type: 'text', placeholder, autocomplete: 'off', spellcheck: false });
  const form = el('form', { className: 'paste-form' }, input, el('button', { type: 'submit' }, label));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim()) onSubmit(input.value.trim());
  });
  return form;
}

function qrBox(text) {
  const box = el('div', { className: 'qr' });
  box.innerHTML = qrSvg(text);
  return box;
}

// The code as text, for when the camera can't be used.
function codeField(code) {
  const field = el('textarea', { className: 'code', readOnly: true, rows: 3, value: code });
  field.addEventListener('focus', () => field.select());
  const copy = navigator.clipboard
    ? button(t('copy'), async (e) => {
        await navigator.clipboard.writeText(code);
        e.target.textContent = t('copied');
      })
    : '';
  return el('div', { className: 'code-box' }, field, copy);
}

function tick() {
  const state = currentState();
  const round = state?.phase === 'round' ? state.round : null;
  timer.hidden = !round;
  if (!round) return;
  const left = app.me ? app.me.left : round.left;
  timer.firstElementChild.textContent = String(Math.ceil(left / 1000));
  timer.querySelector('.bar > div').style.width = `${(left / (round.seconds * 1000)) * 100}%`;
  timer.classList.toggle('low', left <= 10000);
}

function currentState() {
  return app.me?.state ?? app.host?.view() ?? null;
}

function button(label, onClick, className = '', disabled = false) {
  const b = el('button', { type: 'button', className, disabled }, label);
  b.addEventListener('click', onClick);
  return b;
}

function el(tag, props, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// Shared ------------------------------------------------------------------------------

// Accepts a bare code or a whole invite link.
function codeFrom(text) {
  const hash = text.includes('#') ? text.slice(text.indexOf('#') + 1) : '';
  return new URLSearchParams(hash).get('join') ?? text.trim();
}

// ?ice=stun:host:port adds an ICE server; by default only the local network is tried.
function iceConfig() {
  const ice = new URLSearchParams(location.search).getAll('ice');
  return { iceServers: ice.map((urls) => ({ urls })) };
}

function keepAwake() {
  const request = () => navigator.wakeLock?.request('screen').catch(() => {});
  request();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && request());
}

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (typeof p.id === 'string' && p.id) return { id: p.id, name: typeof p.name === 'string' ? p.name : '' };
  } catch {
    // Fall through to a new profile.
  }
  const profile = { id: Math.random().toString(36).slice(2, 12), name: '' };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private mode: a new id each visit.
  }
  return profile;
}

function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private mode.
  }
}
