// A multiplayer session: the host deals, runs the clock, checks answers and keeps the scores;
// players only send their name and their answers. Neither side knows how the messages travel
// (see memory.js for the connection interface).
//
// Messages, player → host: { type: 'hello', id, name } · { type: 'submit', round, answer }
//           host → player: { type: 'state', state } after every change, so a player who
//           rejoins is up to date at once.

export class Host {
  #timer;

  constructor({ games, random = Math.random, now = () => Date.now() }) {
    this.games = games;
    this.random = random;
    this.now = now;
    this.players = new Map();
    this.phase = 'lobby';
    this.series = [];
    this.round = null;
    this.results = null;
    this.onchange = null;
  }

  listen(listener) {
    listener.onconnection = (conn) => this.accept(conn);
  }

  accept(conn) {
    conn.onmessage = (msg) => this.#receive(conn, msg);
    conn.onclose = () => {
      const player = this.#playerOf(conn);
      if (!player) return;
      player.conn = null;
      this.#broadcast();
    };
  }

  // series: [{ game, options }]; options missing from an entry take the game's defaults.
  start(series) {
    clearTimeout(this.#timer);
    this.series = series.map(({ game, options }) => ({ game, options: { ...this.games[game].defaults, ...options } }));
    for (const p of this.players.values()) p.score = 0;
    this.round = null;
    this.results = null;
    this.#play(0);
  }

  // From the results to the next round, or to the end of the series.
  next() {
    if (this.phase === 'results') this.#play(this.round.index + 1);
  }

  // Ends the current phase now, e.g. when everyone has finished thinking.
  skip() {
    if (this.phase === 'round') this.#advance();
  }

  remove(id) {
    const player = this.players.get(id);
    if (!player) return;
    this.players.delete(id);
    if (player.conn) {
      player.conn.onclose = null;
      player.conn.close();
    }
    this.#broadcast();
  }

  close() {
    clearTimeout(this.#timer);
    for (const p of this.players.values()) p.conn?.close();
  }

  // What every player sees. Answers stay hidden until the results.
  view() {
    const round = this.phase === 'round' ? this.round : null;
    const step = round?.phases[round.step];
    return {
      phase: this.phase,
      total: this.series.length,
      players: [...this.players.values()].map((p) => ({ id: p.id, name: p.name, score: p.score, connected: Boolean(p.conn), answered: Boolean(p.answer) })),
      round: round && { index: round.index, game: round.game, options: round.options, deal: round.deal, phase: step.name, open: Boolean(step.open), seconds: step.seconds, left: Math.max(0, round.endsAt - this.now()) },
      results: this.phase === 'round' ? null : this.results,
    };
  }

  #receive(conn, msg) {
    if (msg?.type === 'hello') return this.#join(conn, msg);
    const player = this.#playerOf(conn);
    if (player && msg?.type === 'submit') this.#submit(player, msg);
  }

  // A known id takes its seat back, score and answer included.
  #join(conn, { id, name }) {
    if (typeof id !== 'string' || !id) return;
    const known = this.players.get(id);
    if (known?.conn && known.conn !== conn) {
      known.conn.onclose = null;
      known.conn.close();
    }
    const player = known ?? { id, score: 0, answer: null };
    player.name = String(name ?? '').trim().slice(0, 20) || '?';
    player.conn = conn;
    this.players.set(id, player);
    this.#broadcast();
  }

  #submit(player, { round, answer }) {
    const current = this.round;
    if (this.phase !== 'round' || round !== current.index || player.answer || !current.phases[current.step].open) return;
    player.answer = this.games[current.game].check(current.deal, answer);
    const connected = [...this.players.values()].filter((p) => p.conn);
    if (connected.every((p) => p.answer)) this.#finish();
    else this.#broadcast();
  }

  #play(index) {
    clearTimeout(this.#timer);
    if (index >= this.series.length) {
      this.phase = 'end';
      return this.#broadcast();
    }
    const { game, options } = this.series[index];
    const rules = this.games[game];
    this.round = { index, game, options, deal: rules.deal(options, this.random), phases: rules.phases(options), step: 0 };
    for (const p of this.players.values()) p.answer = null;
    this.phase = 'round';
    this.#schedule();
  }

  #schedule() {
    const { seconds } = this.round.phases[this.round.step];
    this.round.endsAt = this.now() + seconds * 1000;
    this.#timer = setTimeout(() => this.#advance(), seconds * 1000);
    this.#broadcast();
  }

  #advance() {
    clearTimeout(this.#timer);
    this.round.step++;
    if (this.round.step < this.round.phases.length) this.#schedule();
    else this.#finish();
  }

  #finish() {
    clearTimeout(this.#timer);
    const { index, game, deal } = this.round;
    const answers = [...this.players.values()].map((p) => ({ id: p.id, name: p.name, ...(p.answer ?? { valid: false, score: 0, missing: true }) }));
    for (const p of this.players.values()) p.score += p.answer?.score ?? 0;
    this.results = { index, game, deal, answers, ...this.games[game].summary(deal) };
    this.phase = 'results';
    this.#broadcast();
  }

  #playerOf(conn) {
    return [...this.players.values()].find((p) => p.conn === conn);
  }

  #broadcast() {
    const state = this.view();
    for (const p of this.players.values()) {
      try {
        p.conn?.send({ type: 'state', state });
      } catch {
        p.conn = null;
      }
    }
    this.onchange?.(state);
  }
}

export class Player {
  constructor(conn, { id, name }, now = () => Date.now()) {
    this.conn = conn;
    this.id = id;
    this.now = now;
    this.state = null;
    this.connected = true;
    this.onchange = null;
    conn.onmessage = (msg) => {
      if (msg?.type !== 'state') return;
      this.state = msg.state;
      this.receivedAt = this.now();
      this.onchange?.(this.state);
    };
    conn.onclose = () => {
      this.connected = false;
      this.onchange?.(this.state);
    };
    conn.send({ type: 'hello', id, name });
  }

  get me() {
    return this.state?.players.find((p) => p.id === this.id);
  }

  // Milliseconds left in the current phase, counted on this device's clock.
  get left() {
    const round = this.state?.round;
    return round ? Math.max(0, round.left - (this.now() - this.receivedAt)) : 0;
  }

  submit(answer) {
    this.conn.send({ type: 'submit', round: this.state.round.index, answer });
  }
}
