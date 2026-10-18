// Headless Chrome driven over the DevTools protocol. Each page() is a separate browser context, so
// pages behave like separate devices: own storage, own profile id, real WebRTC between them.
// Env: BASE (page URL, default http://127.0.0.1:8791/multi/), CHROME (binary), CHROME_FLAGS,
// GRANT=1 (camera allowed for the host, as after a one-time Allow).
import { spawn } from 'node:child_process';
import fs from 'node:fs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ outDir, lang = 'en', width = 375, port = 9334 }) {
  const base = process.env.BASE ?? 'http://127.0.0.1:8791/multi/';
  fs.mkdirSync(outDir, { recursive: true });
  const profile = `${outDir}/profile`;
  fs.rmSync(profile, { recursive: true, force: true });
  const binary = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const flags = (process.env.CHROME_FLAGS ?? '').split(' ').filter(Boolean);
  const chrome = spawn(binary, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--lang=${lang}`, ...flags, 'about:blank'], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 50 && !version; i++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    } catch {
      await sleep(200);
    }
  }
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params, sessionId }));
    });

  // name is used in error messages and screenshots; context reuses another page's storage.
  async function page(name, { context, camera = name === 'host' && process.env.GRANT, scheme } = {}) {
    const browserContextId = context ?? (await send('Target.createBrowserContext')).result.browserContextId;
    if (camera) await send('Browser.grantPermissions', { browserContextId, origin: new URL(base).origin, permissions: ['videoCapture'] });
    const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
    const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    await s('Emulation.setDeviceMetricsOverride', { width, height: 720, deviceScaleFactor: 2, mobile: true });
    await s('Emulation.setLocaleOverride', { locale: lang });
    await s('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile', acceptLanguage: lang });
    if (scheme) await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
    await s('Runtime.enable');
    await s('Page.enable');
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error(`${name}: ${JSON.stringify(r.result.exceptionDetails).slice(0, 400)}`);
      return r.result.result.value;
    };
    const stage = () => ev(`(document.getElementById('app') ?? document.body).innerText.replace(/\\s+/g, ' ').slice(0, 300)`);
    const until = async (expr, label, ms = 15000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const v = await ev(expr);
        if (v) return v;
        await sleep(150);
      }
      throw new Error(`${name}: timed out waiting for ${label}; errors = ${JSON.stringify(errors)}; stage = ${await stage()}`);
    };
    return {
      name,
      s,
      ev,
      until,
      stage,
      targetId,
      browserContextId,
      // Runs before every page script, e.g. to fake the camera or fix Math.random.
      inject: (source) => s('Page.addScriptToEvaluateOnNewDocument', { source }),
      go: async (url = base) => {
        await s('Page.navigate', { url });
        await sleep(1200);
      },
      click: (text) => ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.innerText.trim().startsWith(${JSON.stringify(text)}) && !b.disabled); if (!b) throw new Error('no button ' + ${JSON.stringify(text)}); b.click(); })()`),
      setName: (n) => ev(`(() => { const i = document.querySelector('.name-field input'); i.value = ${JSON.stringify(n)}; i.dispatchEvent(new Event('input')); })()`),
      layout: () => ev(`({ scrollW: document.documentElement.scrollWidth, innerW: innerWidth, scrollH: document.documentElement.scrollHeight, innerH: innerHeight })`),
      shot: async (file) => {
        const r = await s('Page.captureScreenshot', { captureBeyondViewport: true });
        const path = `${outDir}/${file}-${lang}-${width}.png`;
        fs.writeFileSync(path, Buffer.from(r.result.data, 'base64'));
        return path;
      },
    };
  }

  return {
    base,
    errors,
    send,
    page,
    close: (targetId) => send('Target.closeTarget', { targetId }),
    exit(code = 0) {
      chrome.kill();
      process.exit(code);
    },
  };
}

// Host and player screens share these steps.
export async function hostAndJoin(browser, { lang, playerName = 'Ann', hostName = 'Hosty', game, player: P }) {
  const H = await browser.page('host');
  P ??= await browser.page('player');
  await H.go();
  await H.setName(hostName);
  if (game) await H.ev(`document.querySelector('.games [data-game=${game}]').click()`);
  await H.click(lang === 'fr' ? 'Créer' : 'Host');
  const invite = await H.until(`document.querySelector('.invite textarea.code')?.value`, 'invite');
  await P.go(invite);
  await P.setName(playerName);
  await P.click(lang === 'fr' ? 'Rejoindre' : 'Join');
  const reply = await P.until(`document.querySelector('textarea.code')?.value`, 'reply code');
  await addReply(H, reply);
  await H.until(`document.querySelectorAll('.players li').length === 2`, 'two players');
  await P.until(`document.querySelectorAll('.players li').length === 2`, 'player sees lobby');
  return { H, P, invite, reply };
}

export function addReply(H, code) {
  return H.ev(`(() => { const f = document.querySelector('.invite .paste-form'); f.querySelector('input').value = ${JSON.stringify(code)}; f.requestSubmit(); })()`);
}
