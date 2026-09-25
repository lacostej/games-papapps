// Game menu: fills every <nav data-game-nav="<current game id>"> with square game
// buttons. Links resolve from this file's location, so the site works under any base path.
import { GAMES } from '../games.js';
import { installButton } from './install.js';

const root = new URL('../', import.meta.url);
const HOME_LABEL = { en: 'All games', fr: 'Tous les jeux' };

export function renderGameNav(nav, current) {
  const lang = (navigator.languages?.[0] ?? 'en').split('-')[0];
  nav.classList.add('game-nav');
  nav.setAttribute('aria-label', 'Games');

  const home = link(new URL('./', root), HOME_LABEL[lang] ?? HOME_LABEL.en);
  home.classList.add('game-nav-home');
  home.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>';

  const games = GAMES.map((game) => {
    const a = link(new URL(game.path, root), game.name);
    if (game.id === current) a.setAttribute('aria-current', 'page');
    a.append(Object.assign(document.createElement('img'), { src: new URL(game.icon, root).href, alt: '' }));
    return a;
  });
  nav.replaceChildren(home, ...games, installButton());
  // With more games than fit, keep the current one in view.
  const active = nav.querySelector('[aria-current="page"]');
  if (active) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
}

function link(url, label) {
  const a = document.createElement('a');
  a.href = url.href;
  a.title = label;
  a.setAttribute('aria-label', label);
  return a;
}

for (const nav of document.querySelectorAll('[data-game-nav]')) renderGameNav(nav, nav.dataset.gameNav);
