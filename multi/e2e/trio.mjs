// A Trio race between two headless devices over real WebRTC: the same table on both, a claim
// scoring for the first player, the same cards claimed a moment later, a wrong claim's freeze,
// and the round ending at "first to 5".
// Usage: node multi/e2e/trio.mjs <outDir> [lang] [width]   (serve the repo on :8791 first)
import { hostAndJoin, launch, sleep } from './browser.mjs';

const [, , outDir, lang = 'en', width = '375'] = process.argv;
const fr = lang === 'fr';
const browser = await launch({ outDir, lang, width: Number(width) });

const H0 = await browser.page('home');
await H0.go();
await H0.ev(`document.querySelector('.games [data-game=trio]').click()`);
await H0.shot('trio-home');

const { H, P } = await hostAndJoin(browser, { lang, game: 'trio' });
console.log('lobby:', await H.stage());
await H.ev(`(() => { const [end] = document.querySelectorAll('.settings select'); end.value = 'first-5'; end.dispatchEvent(new Event('change')); })()`);
await H.ev(`document.getElementById('app').scrollTop = 1e6`);
await H.shot('trio-lobby');
await H.click(fr ? 'Commencer' : 'Start');
await P.until(`document.querySelectorAll('.trio-table .card').length >= 12`, 'table');

const table = (X) => X.ev(`[...document.querySelectorAll('.trio-table .card')].map((b) => Number(b.dataset.card))`);
console.log('same table on both:', JSON.stringify(await table(H)) === JSON.stringify(await table(P)));
const core = `await import(new URL('../trio/src/core/trio.js', location.href))`;
const findTrio = (X) => X.ev(`(async () => { const { findTrio } = ${core}; const cards = [...document.querySelectorAll('.trio-table .card')].map((b) => Number(b.dataset.card)); return findTrio(cards).map((i) => cards[i]); })()`);
const notATrio = (X) => X.ev(`(async () => { const { isTrio } = ${core}; const c = [...document.querySelectorAll('.trio-table .card')].map((b) => Number(b.dataset.card));
  for (const a of c) for (const b of c) for (const d of c) if (a < b && b < d && !isTrio(a, b, d)) return [a, b, d]; })()`);
// Taps the cards still on the table; returns how many were there.
const tap = (X, cards) => X.ev(`${JSON.stringify(cards)}.filter((c) => { const b = document.querySelector('.trio-table [data-card="' + c + '"]'); b?.click(); return Boolean(b); }).length`);
const status = (X) => X.ev(`document.querySelector('.trio-status').textContent`);
const scores = (X) => X.ev(`document.querySelector('.scores-line').innerText.replace(/\\s+/g, ' ')`);

// 1. Ann claims a trio.
const first = await findTrio(P);
await tap(P, first);
await H.until(`document.querySelector('.trio-status').textContent.includes('Ann')`, 'host sees Ann found it');
console.log('P:', await status(P), '| H:', await status(H), '| scores:', await scores(H));
console.log('cards left both tables:', !(await table(P)).some((c) => first.includes(c)) && !(await table(H)).some((c) => first.includes(c)));
await P.shot('trio-found');

// 2. Both claim the same trio at once. The host has no network delay, so it wins; the player's
// claim is either too late, or the cards vanish from the player's table before the last tap.
const race = await findTrio(P);
const [, tapped] = await Promise.all([tap(H, race), tap(P, race)]);
await sleep(500);
console.log(`race: player got ${tapped} of 3 taps in | H`, await status(H), '| P', await status(P), '| P selected:', await P.ev(`document.querySelectorAll('.trio-table .selected').length`), '| scores:', await scores(P));

// 3. A wrong claim freezes Ann for 3 s.
await tap(P, await notATrio(P));
await P.until(`document.querySelector('.trio-table.frozen')`, 'frozen');
console.log('wrong:', await status(P));
await P.shot('trio-wrong');
const during = await findTrio(P);
await tap(P, during);
await sleep(300);
console.log('claim while frozen ignored:', (await scores(P)).includes('Ann 1'), await scores(P));
await P.until(`!document.querySelector('.trio-table.frozen')`, 'unfrozen', 5000);
console.log('unfrozen after ~3 s');

// 4. Ann reaches 5 trios: the round ends.
while (await P.ev(`Boolean(document.querySelector('.trio-table'))`)) {
  await tap(P, await findTrio(P));
  await sleep(400);
}
await P.until(`document.querySelectorAll('.result').length === 2`, 'results');
console.log('P results:', await P.stage());
await P.shot('trio-results');
await H.shot('trio-host-results');
console.log('layout P', JSON.stringify(await P.layout()));
console.log('errors', JSON.stringify(browser.errors));
browser.exit(browser.errors.length ? 1 : 0);
