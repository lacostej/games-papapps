// Multiplayer page. One device hosts (and may play too); the others join by scanning its code.
// The host's own player talks to the session through an in-memory connection, the others over
// the LAN, so both play the same way.
import { Host, Player } from '../core/session.js';
import { memoryPair } from '../core/memory.js';
import { GAMES } from '../games/index.js';
import { LanListener, reply, revealAddress } from '../net/lan.js';
import { ENDS, FREEZE_MS, PENALTIES } from '../games/trio.js';
import { Calculation, OPS } from '../../../chiffres-lettres/src/core/numbers.js';
import { features } from '../../../trio/src/core/trio.js';
import { drawCard, stripeDefs } from '../../../trio/src/ui/cards.js';
import { translator as trioTranslator } from '../../../trio/src/ui/i18n.js';
import { canScan, qrSvg, scan } from './qr.js';
import { translator } from './i18n.js';

const STORAGE_KEY = 'multi';
const SIGN = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
const ROUNDS = [3, 5, 10];
const THINK = [15, 30, 45, 60];
const ANSWER = [20, 30, 45, 60];
const t = translator(navigator.languages ?? [navigator.language]);
// Trio's own strings, for the cards' spoken labels.
const tt = trioTranslator(t.code);
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
  netStatus: '',
  replyCode: null,
  error: '',
  // ?game=trio picks the game before hosting.
  settings: { game: new URLSearchParams(location.search).get('game') === 'trio' ? 'trio' : 'numbers', rounds: 5, level: 'normal', think: 45, answer: 30, end: 'time-3', wrong: 'freeze', hostPlays: true },
  play: null,
};

document.documentElement.lang = t.code;
document.title = t('title');
document.getElementById('back').textContent = t('allGames');
document.body.append(stripeDefs());

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

async function startHosting() {
  app.host = new Host({ games: GAMES });
  app.listener = new LanListener(iceConfig());
  // Asks once: after a refusal, invites go out with hidden addresses.
  if (canScan()) app.listener.reveal = async () => (await revealAddress()) ?? void (app.listener.reveal = null);
  app.host.listen(app.listener);
  app.listener.onstatus = (text) => {
    app.netStatus = text;
    render();
  };
  // During a game the invite opens when someone drops out and closes when everyone is back.
  let offline = 0;
  let online = 0;
  app.host.onchange = () => {
    if (app.status === t('connecting')) app.status = '';
    const players = app.host.view().players;
    const now = { offline: players.filter((p) => !p.connected).length, online: players.filter((p) => p.connected).length };
    if (now.offline > offline) {
      app.inviteOpen = true;
      app.status = '';
    }
    else if (now.online > online && !now.offline) app.inviteOpen = false;
    ({ offline, online } = now);
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
    ({ code: app.replyCode, connection } = await reply(app.invite, iceConfig(), (text) => {
      app.netStatus = text;
      if (app.screen === 'reply') render();
    }));
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

// Scans with the page's camera until a code is read; onCode gets its text.
async function toggleScan(onCode) {
  if (app.stopScan) {
    app.stopScan();
    app.stopScan = null;
    return render();
  }
  try {
    app.stopScan = await scan(video, (text) => {
      app.stopScan?.();
      app.stopScan = null;
      onCode(text);
    });
    app.status = '';
  } catch {
    app.status = t('cameraFailed');
  }
  render();
}

function startSeries() {
  const { game, rounds, level, think, answer, end, wrong } = app.settings;
  if (game === 'trio') return app.host.start([{ game, options: { end, wrong } }]);
  app.host.start(Array.from({ length: rounds }, () => ({ game: 'numbers', options: { level, think, answer } })));
}

// Rendering ---------------------------------------------------------------------------

function render() {
  const view = { home, joinName, reply: replyScreen, host: hostScreen, player: playerScreen }[app.screen]();
  main.replaceChildren(...view);
  if (app.stopScan) video.play().catch(() => {});
  const state = currentState();
  roundLabel.textContent = state?.round && state.total > 1 ? t('round', { n: state.round.index + 1, total: state.total }) : '';
  main.classList.toggle('trio-stage', state?.phase === 'round' && state.round.game === 'trio' && !app.inviteOpen);
  tick();
}

function home() {
  return [
    el('h1', {}, t('title')),
    nameField(),
    gamePicker(),
    button(t('host'), startHosting, 'big primary'),
    el('p', { className: 'hint' }, t('joinHint')),
    ...scanHost(),
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

// The game the host will run; players get whatever the host picked.
function gamePicker() {
  const choices = ['numbers', 'trio'].map((game) => {
    const b = button(t(`game_${game}`), () => {
      app.settings.game = game;
      render();
    }, app.settings.game === game ? 'selected' : '');
    b.dataset.game = game;
    b.setAttribute('aria-pressed', String(app.settings.game === game));
    return b;
  });
  return el('div', { className: 'games', role: 'group', ariaLabel: t('game') }, ...choices);
}

// Joining from this page instead of the camera app, where the page may use the camera.
function scanHost() {
  if (!canScan()) return [];
  const join = (text) => {
    app.invite = codeFrom(text);
    startJoining();
  };
  return [
    app.stopScan ? video : '',
    button(app.stopScan ? t('stopScan') : t('scanHost'), () => toggleScan(join), app.stopScan ? '' : 'primary'),
    app.status ? el('p', { className: 'hint alert' }, app.status) : '',
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
    el('p', { className: 'diag' }, app.netStatus),
  ];
}

function hostScreen() {
  const { host } = app;
  if (host.phase === 'lobby') return [invitePanel(), playersList(host.view(), true), el('h2', {}, t(`game_${app.settings.game}`)), settingsForm(), button(t('start'), startSeries, 'big primary', !host.players.size)];
  const bar = el(
    'div',
    { className: 'host-bar' },
    button(t('invite'), () => {
      app.inviteOpen = !app.inviteOpen;
      render();
    }, app.inviteOpen ? 'selected' : ''),
    host.phase === 'round' ? button(host.round.game === 'trio' ? t('endRound') : t('skip'), () => host.skip()) : '',
    host.phase === 'results' ? button(host.round.index + 1 < host.series.length ? t('next') : t('seeFinal'), () => host.next(), 'primary') : '',
    host.phase === 'end' ? button(t('playAgain'), () => host.start(host.series), 'primary') : '',
  );
  const game = app.me ? playerScreen() : boardScreen(host.view());
  return [bar, app.inviteOpen ? invitePanel() : '', ...game];
}

function invitePanel() {
  const url = app.invite && `${inviteBase()}#join=${app.invite}`;
  const gone = app.host.phase === 'lobby' ? [] : app.host.view().players.filter((p) => !p.connected).map((p) => p.name);
  return el(
    'section',
    { className: 'invite' },
    el('p', { className: 'hint' }, gone.length ? t('rejoinHint', { names: gone.join(', ') }) : t('inviteHint')),
    url ? qrBox(url) : el('div', { className: 'qr' }, '…'),
    url ? el('details', { className: 'paste' }, el('summary', {}, t('asText')), codeField(url)) : '',
    app.stopScan ? video : '',
    canScan() ? button(app.stopScan ? t('stopScan') : t('scanReply'), () => toggleScan(acceptReply), app.stopScan ? '' : 'primary') : '',
    pasteForm(t('add'), acceptReply, t('pasteReply')),
    app.status ? el('p', { className: 'hint alert' }, app.status) : '',
    app.netStatus ? el('p', { className: 'diag' }, app.netStatus) : '',
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
  if (s.game === 'trio') {
    return el(
      'div',
      { className: 'settings single' },
      select(t('ends'), 'end', ENDS, (v) => {
        const [kind, n] = v.split('-');
        return t(`end_${kind}`, { n });
      }),
      select(t('wrongClaim'), 'wrong', PENALTIES, (v) => t(`wrong_${v}`, { n: FREEZE_MS / 1000 })),
      el('label', { className: 'check' }, plays, el('span', {}, t('hostPlays'))),
    );
  }
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
  const lost = me && !me.connected ? el('div', { className: 'code-box' }, el('p', { className: 'hint alert' }, t('lost')), ...scanHost()) : '';
  const state = me?.state;
  if (!state) return [lost || el('p', { className: 'hint' }, t('connecting'))];
  if (state.phase === 'lobby') return [lost, el('p', { className: 'hint' }, t('waitingHost')), playersList(state)];
  if (state.phase === 'round') return [lost, ...roundView(state)];
  if (state.phase === 'results') return [lost, ...resultsView(state)];
  return [lost, el('h2', {}, t('finalScores')), playersList(state)];
}

// The host's screen when not playing: the draw, the clock and who has answered.
function boardScreen(state) {
  if (state.phase === 'round' && state.round.game === 'trio') return trioRound(state, false);
  if (state.phase === 'round') return [target(state.round.deal.target), plates(state.round.deal.plates), el('p', { className: 'hint' }, state.round.open ? t('watching') : t('lookHint')), playersList(state, false, true)];
  if (state.phase === 'results') return resultsView(state);
  return [el('h2', {}, t('finalScores')), playersList(state)];
}

function roundView(state) {
  if (state.round.game === 'trio') return trioRound(state, true);
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
  if (state.results.game === 'trio') return trioResults(state);
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

// Trio: everyone races on the same table. Claims name the cards, so a card someone else just
// took drops out of your selection, and a claim for it comes back as too late.
function trioRound(state, playing) {
  const { round } = state;
  const cards = round.deal.table;
  if (app.play?.game !== 'trio' || app.play.index !== round.index) app.play = { game: 'trio', index: round.index, selected: [], seq: 0, shown: cards, message: '', kind: '' };
  const play = app.play;
  play.selected = play.selected.filter((c) => cards.includes(c));
  const fresh = cards.filter((c) => !play.shown.includes(c));
  play.shown = cards;
  let wrong = [];
  const last = round.last;
  if (last && last.seq !== play.seq) {
    play.seq = last.seq;
    const mine = playing && last.id === profile.id;
    play.kind = '';
    if (last.result === 'found') {
      play.message = mine ? t('trioYours') : t('trioTheirs', { name: last.name });
      play.kind = mine ? 'good' : '';
      if (mine) navigator.vibrate?.([15, 40, 15]);
    } else if (mine && last.result === 'wrong') {
      play.message = t(`notTrio_${round.options.wrong}`, { n: FREEZE_MS / 1000 });
      play.kind = 'bad';
      wrong = last.answer.cards;
      navigator.vibrate?.(40);
    } else if (mine && last.result === 'late') {
      play.message = t('tooLate');
      play.kind = 'bad';
    }
  }
  const self = playing && state.players.find((p) => p.id === profile.id);
  const frozen = self ? Math.max(0, self.frozen - (Date.now() - app.me.receivedAt)) : 0;
  if (frozen) setTimeout(render, frozen + 50);
  const tap = (card) => {
    if (frozen) return;
    play.selected = play.selected.includes(card) ? play.selected.filter((c) => c !== card) : [...play.selected, card];
    if (play.selected.length === 3) {
      app.me.submit({ cards: play.selected });
      play.selected = [];
    }
    render();
  };
  const table = el('div', { className: `trio-table ${frozen ? 'frozen' : ''}` }, ...cards.map((c) => {
    if (c === null) return el('span');
    const card = el('button', { type: 'button', className: `card ${play.selected.includes(c) ? 'selected' : ''} ${fresh.includes(c) ? 'fresh' : ''} ${wrong.includes(c) ? 'wrong' : ''}`, disabled: !playing }, drawCard(c));
    card.dataset.card = c;
    card.setAttribute('aria-label', cardLabel(c));
    card.setAttribute('aria-pressed', String(play.selected.includes(c)));
    if (playing) card.addEventListener('click', () => tap(c));
    return card;
  }));
  table.style.setProperty('--rows', Math.ceil(cards.length / 3));
  return [
    scoreLine(state, t('deckLeft', { n: round.deal.deck })),
    el('p', { className: `trio-status ${play.kind}` }, play.message || t('trioHint')),
    table,
  ];
}

function trioResults(state) {
  const rows = [...state.results.answers].sort((a, b) => (b.found ?? 0) - (a.found ?? 0) || b.score - a.score || a.name.localeCompare(b.name)).map((a) => {
    const name = a.id === profile.id ? `${a.name} (${t('you')})` : a.name;
    if (a.missing) return resultRow(name, '—', 0, t('noTrio'));
    return resultRow(name, t('trios', { count: a.found }), a.score, a.wrong ? t('wrongCount', { count: a.wrong }) : '');
  });
  return [...rows, el('h2', {}, t('scores')), playersList(state)];
}

// Names and scores on one line, then e.g. the cards left.
function scoreLine(state, extra) {
  const players = [...state.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return el(
    'ul',
    { className: 'roster scores-line' },
    ...players.map((p) => el('li', { className: `${p.connected ? '' : 'offline'} ${p.id === profile.id ? 'me' : ''}` }, `${p.name} ${p.score}`)),
    el('li', { className: 'extra' }, extra),
  );
}

function cardLabel(c) {
  const [n, shape, shading, color] = features(c);
  return tt('card', { count: n + 1, shape: tt(`shape${shape}`), shading: tt(`shading${shading}`), color: tt(`color${color}`) });
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
  const round = state?.phase === 'round' && state.round.seconds ? state.round : null;
  timer.hidden = !round;
  if (!round) return;
  const left = app.me ? app.me.left : round.left;
  const s = Math.ceil(left / 1000);
  timer.firstElementChild.textContent = round.seconds > 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);
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

// The page players open. ?base=<url> replaces it when hosting from localhost, which phones can't
// reach but which is the only plain-http address where the camera works.
function inviteBase() {
  const params = new URLSearchParams(location.search);
  const base = params.get('base');
  params.delete('base');
  const rest = params.size ? `?${params}` : '';
  return base ? `${base}${rest}` : `${location.origin}${location.pathname}${rest}`;
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
