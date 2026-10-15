// LAN connections over WebRTC, with no server: the host shows an invite code, the player's
// device answers with a reply code, and the host reads it back. Both codes are shown as QR
// codes. With no ICE servers, only addresses on the local network are tried; pass
// { iceServers: [...] } to try more.
//
// Gives the same ends as memory.js: a listener with onconnection(conn), and conns with
// send(msg), close(), onmessage, onclose.

// How long to wait for the device's addresses before writing the code with what it has.
const GATHER_MS = 4000;

export class LanListener {
  #invite = null;

  constructor(config = { iceServers: [] }) {
    this.config = config;
    this.onconnection = null;
    // Called with a one-line status of the last accepted reply's connection, for diagnosis.
    this.onstatus = null;
    // Called before each invite gathers its addresses; may return a function to call after.
    this.reveal = null;
  }

  // A new invite code. An unanswered previous invite stops working.
  async invite() {
    this.#invite?.pc.close();
    const id = Math.random().toString(36).slice(2, 8);
    const pc = new RTCPeerConnection(this.config);
    const channel = pc.createDataChannel('game');
    channel.onopen = () => this.onconnection?.(wrap(pc, channel));
    this.#invite = { id, pc };
    const release = await this.reveal?.();
    try {
      await pc.setLocalDescription();
      await gathered(pc);
    } finally {
      release?.();
    }
    return encode({ i: id, s: pc.localDescription.sdp });
  }

  // A player's reply to the current invite. Throws if the reply is for an older invite.
  async accept(code) {
    const { i, s } = await decode(code);
    if (!this.#invite || this.#invite.id !== i) throw new Error('stale');
    const { pc } = this.#invite;
    this.#invite = null;
    watch(pc, (text) => this.onstatus?.(text));
    await pc.setRemoteDescription({ type: 'answer', sdp: s });
  }

  close() {
    this.#invite?.pc.close();
    this.#invite = null;
  }
}

// The player's side: the reply code to show the host, and the connection once it opens.
// onstatus gets a one-line status of the connection, for diagnosis.
export async function reply(inviteCode, config = { iceServers: [] }, onstatus = () => {}) {
  const { i, s } = await decode(inviteCode);
  const pc = new RTCPeerConnection(config);
  watch(pc, onstatus);
  const connection = new Promise((resolve, reject) => {
    pc.ondatachannel = ({ channel }) => {
      if (channel.readyState === 'open') resolve(wrap(pc, channel));
      else channel.onopen = () => resolve(wrap(pc, channel));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') reject(new Error('failed'));
    };
  });
  await pc.setRemoteDescription({ type: 'offer', sdp: s });
  await pc.setLocalDescription();
  await gathered(pc);
  return { code: await encode({ i, s: pc.localDescription.sdp }), connection };
}

function wrap(pc, channel) {
  let closed = false;
  const end = () => {
    if (closed) return;
    closed = true;
    pc.close();
    conn.onclose?.();
  };
  const conn = {
    onmessage: null,
    onclose: null,
    send(msg) {
      if (channel.readyState !== 'open') throw new Error('Connection closed');
      channel.send(JSON.stringify(msg));
    },
    close: end,
  };
  channel.onmessage = (e) => conn.onmessage?.(JSON.parse(e.data));
  channel.onclose = end;
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') end();
  };
  return conn;
}

// e.g. "checking 0s → connected 2s · here: 192.168.1.39 · there: name.local": the ICE states with
// seconds since the first, and the addresses each side offered. Names ending in .local are hidden
// addresses that the other device must resolve.
function watch(pc, onstatus) {
  const addresses = (desc) => [...new Set((desc?.sdp ?? '').split('\r\n').filter((l) => l.startsWith('a=candidate')).map((l) => l.split(' ')[4]))].join(', ') || '–';
  const states = [];
  let start;
  const report = () => {
    if (pc.iceConnectionState !== states.at(-1)?.state) {
      start ??= Date.now();
      states.push({ state: pc.iceConnectionState, at: Math.round((Date.now() - start) / 1000) });
    }
    const path = states.map((s) => `${s.state} ${s.at}s`).join(' → ');
    onstatus(`${path} · here: ${addresses(pc.localDescription)} · there: ${addresses(pc.remoteDescription)}`);
  };
  pc.addEventListener('iceconnectionstatechange', report);
  pc.addEventListener('signalingstatechange', report);
}

// Browsers hide this device's address behind a .local name unless the page may use the camera or
// microphone, and phones often can't resolve those names. Firefox counts a one-time permission only
// while the camera runs, so this starts it and returns the function that stops it, or null if refused.
export async function revealAddress() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    return () => stream.getTracks().forEach((track) => track.stop());
  } catch {
    return null;
  }
}

function gathered(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, GATHER_MS);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState !== 'complete') return;
      clearTimeout(timer);
      resolve();
    });
  });
}

// Codes are compressed JSON in URL-safe base64, short enough for a QR code.
export async function encode(value) {
  const stream = new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export async function decode(code) {
  const b64 = code.trim().replaceAll('-', '+').replaceAll('_', '/');
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(stream).text());
}
