// Joining by scanning from the page: from the start page, then again after the connection drops.
// The player's camera is a canvas showing whatever image window.__qr holds, so the scanner, the
// QR reader and the join flow are real; only the lens is fake.
// Usage: node multi/e2e/scan.mjs <outDir> [lang] [width]   (serve the repo on :8791 first)
import { addReply, launch } from './browser.mjs';

const [, , outDir, lang = 'en', width = '375'] = process.argv;
const fr = lang === 'fr';
const browser = await launch({ outDir, lang, width: Number(width) });

const fakeCamera = `navigator.mediaDevices.getUserMedia = async () => {
  const c = Object.assign(document.createElement('canvas'), { width: 640, height: 640 });
  const x = c.getContext('2d');
  setInterval(async () => {
    x.fillStyle = '#888'; x.fillRect(0, 0, 640, 640);
    if (window.__qr) { const i = new Image(); i.src = window.__qr; await i.decode(); x.drawImage(i, 70, 70, 500, 500); }
  }, 100);
  return c.captureStream(10);
};
// Keeps the data channels so the test can drop the connection without closing the page.
window.__channels = [];
const Native = RTCPeerConnection;
window.RTCPeerConnection = class extends Native {
  constructor(...a) { super(...a); this.addEventListener('datachannel', (e) => window.__channels.push(e.channel)); }
};`;
const qrImage = async (H) => {
  await H.until(`document.querySelector('.invite .qr svg')`, 'invite QR');
  return H.ev(`'data:image/svg+xml;base64,' + btoa(document.querySelector('.invite .qr svg').outerHTML)`);
};
const scanHost = fr ? 'Scanner le code' : 'Scan the host';

const H = await browser.page('host');
const P = await browser.page('player');
await P.inject(fakeCamera);
await H.go();
await H.setName('Hosty');
await H.click(fr ? 'Créer' : 'Host');

// 1. Join from the start page by scanning.
await P.go();
await P.setName('Ann');
await P.click(scanHost);
await P.until(`document.querySelector('video')?.srcObject`, 'camera running');
await P.ev(`window.__qr = ${JSON.stringify(await qrImage(H))}`);
const reply1 = await P.until(`document.querySelector('textarea.code')?.value`, 'reply after scan');
console.log('camera stopped after scan:', await P.ev(`!document.querySelector('video')?.srcObject`));
await addReply(H, reply1);
await H.until(`document.querySelectorAll('.players li').length === 2`, 'two players');
await H.click(fr ? 'Commencer' : 'Start');
await P.until(`document.querySelectorAll('.plates .plate').length > 0`, 'round');
console.log('joined by scan, in', await P.ev(`document.getElementById('round').textContent`));

// 2. The connection drops; the player scans again from the lost message.
await P.ev(`window.__qr = null; window.__channels.forEach((c) => c.close())`);
await P.until(`document.querySelector('.alert')`, 'lost message');
console.log('P lost:', await P.stage());
await P.click(scanHost);
await P.until(`document.querySelector('video')?.srcObject`, 'camera running again');
await P.ev(`window.__qr = ${JSON.stringify(await qrImage(H))}`);
const reply2 = await P.until(`document.querySelector('textarea.code')?.value`, 'reply after rescan');
await addReply(H, reply2);
await P.until(`document.querySelectorAll('.plates .plate').length > 0 && !document.querySelector('.alert')`, 'back in the round');
await H.until(`!document.querySelector('.invite')`, 'host invite closed');
console.log('P back in', await P.ev(`document.getElementById('round').textContent`));
console.log('errors', JSON.stringify(browser.errors));
browser.exit(browser.errors.length ? 1 : 0);
