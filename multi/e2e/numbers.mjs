// A numbers series between two headless devices over real WebRTC: join, play a round, results,
// a dropout, the host's invite opening by itself, and a rejoin into the same seat.
// Usage: node multi/e2e/numbers.mjs <outDir> [lang] [width]   (serve the repo on :8791 first)
import { addReply, hostAndJoin, launch, sleep } from './browser.mjs';

const [, , outDir, lang = 'en', width = '375'] = process.argv;
const fr = lang === 'fr';
const browser = await launch({ outDir, lang, width: Number(width) });
const t0 = Date.now();
const { H, P, invite, reply } = await hostAndJoin(browser, { lang });
console.log(`connected in ${Date.now() - t0} ms`);
console.log('host status:', await H.ev(`document.querySelector('.invite .diag')?.textContent`));

// The QR code decodes back to the invite link.
await H.until(`document.querySelector('.invite .qr svg')`, 'next invite');
const decoded = await H.ev(`(async () => {
  await new Promise((r, j) => { const s = document.createElement('script'); s.src = 'vendor/jsQR.js'; s.onload = r; s.onerror = j; document.head.append(s); });
  const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(document.querySelector('.invite .qr svg').outerHTML); await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 600; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 600); x.drawImage(img, 0, 0, 600, 600);
  return jsQR(x.getImageData(0, 0, 600, 600).data, 600, 600)?.data ?? null; })()`);
console.log('a QR code decodes to an invite link:', decoded?.includes('#join='));

// The same reply again: stale.
await addReply(H, reply);
await sleep(300);
console.log('stale reply:', await H.ev(`document.querySelector('.invite .alert')?.textContent`));

await H.ev(`(() => { const [r, l, th] = document.querySelectorAll('.settings select'); r.value = '3'; r.dispatchEvent(new Event('change')); l.value = 'kids'; l.dispatchEvent(new Event('change')); th.value = '15'; th.dispatchEvent(new Event('change')); })()`);
await H.click(fr ? 'Commencer' : 'Start');
await P.until(`document.querySelectorAll('.plates .plate').length === 5`, 'round');
console.log('P think:', await P.stage());
await H.click(fr ? 'Passer' : 'End');
await P.until(`document.querySelectorAll('.ops button').length === 4`, 'answer phase');
const tap = (X, i) => X.ev(`document.querySelectorAll('.plates > *')[${i}].click()`);
await tap(P, 0);
await P.click('+');
await tap(P, 1);
await P.click(fr ? 'Annoncer' : 'Announce');
await P.until(`document.querySelector('.players li.answered')`, 'own answer counted');
await tap(H, 2);
await H.click('×');
await tap(H, 3);
await H.click(fr ? 'Annoncer' : 'Announce');
await P.until(`document.querySelectorAll('.result').length === 3`, 'results');
console.log('P results:', await P.stage());
await P.shot('numbers-results');

// The player's tab closes mid-round; the host's invite opens by itself, naming her.
await H.click(fr ? 'Manche' : 'Next');
await P.until(`document.querySelectorAll('.plates .plate').length === 5`, 'round 2');
await browser.close(P.targetId);
await H.until(`document.querySelector('.roster li.offline')`, 'host sees offline', 40000);
console.log('host invite after the drop:', await H.ev(`document.querySelector('.invite .hint')?.textContent`));
const invite2 = await H.until(`document.querySelector('.invite textarea.code')?.value`, 'invite 2');
const P2 = await browser.page('player2', { context: P.browserContextId });
await P2.go(invite2);
console.log('name prefilled:', await P2.ev(`document.querySelector('.name-field input').value`));
await P2.click(fr ? 'Rejoindre' : 'Join');
const reply2 = await P2.until(`document.querySelector('textarea.code')?.value`, 'reply 2');
await addReply(H, reply2);
await P2.until(`document.querySelectorAll('.plates .plate').length === 5`, 'rejoined into round 2');
await H.until(`!document.querySelector('.invite')`, 'invite closed after rejoin');
console.log('P2 after rejoin:', await P2.ev(`document.getElementById('round').textContent`), '| invite closed, new invite:', invite2 !== invite);
console.log('layout H', JSON.stringify(await H.layout()));
console.log('errors', JSON.stringify(browser.errors));
browser.exit(browser.errors.length ? 1 : 0);
