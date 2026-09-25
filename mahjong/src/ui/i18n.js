// Interface strings. Values are strings with {param} slots, or plural forms keyed by
// Intl.PluralRules category and selected by the `count` param.
export const MESSAGES = {
  en: {
    layout: 'Layout',
    easy: 'Easy · {count}',
    medium: 'Medium · {count}',
    hard: 'Hard · {count}',
    time: 'Time',
    pairs: 'Pairs left',
    board: 'Tiles',
    hint: 'Hint',
    undo: 'Undo',
    shuffle: 'Shuffle',
    newGame: 'New',
    rules: 'Remove matching pairs of free tiles: nothing on top, and an open left or right side.',
    stuck: 'No more pairs. Shuffle, undo, or start again.',
    impossible: 'No pair left, and no shuffle can help. Undo or start again.',
    won: 'Cleared in {time}',
    best: 'Best: {time}',
    newBest: 'New best time!',
    winds: 'ESWN',
    tile: 'Tile {n}',
  },
  fr: {
    layout: 'Disposition',
    easy: 'Facile · {count}',
    medium: 'Moyen · {count}',
    hard: 'Difficile · {count}',
    time: 'Temps',
    pairs: 'Paires',
    board: 'Tuiles',
    hint: 'Indice',
    undo: 'Annuler',
    shuffle: 'Mélanger',
    newGame: 'Nouveau',
    rules: 'Retirez les paires de tuiles libres : rien dessus, et un côté gauche ou droit dégagé.',
    stuck: 'Plus de paires. Mélangez, annulez ou recommencez.',
    impossible: 'Plus de paires, et aucun mélange ne peut aider. Annulez ou recommencez.',
    won: 'Terminé en {time}',
    best: 'Record : {time}',
    newBest: 'Nouveau record !',
    winds: 'ESON',
    tile: 'Tuile {n}',
  },
};

// First supported language in the browser's preference list, else English.
export function pickUiLanguage(preferred = []) {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (MESSAGES[base]) return base;
  }
  return 'en';
}

export function translator(code) {
  const messages = MESSAGES[code] ?? MESSAGES.en;
  const plural = new Intl.PluralRules(code);
  const t = (key, params = {}) => {
    let message = messages[key] ?? MESSAGES.en[key] ?? key;
    if (typeof message === 'object') message = message[plural.select(params.count)] ?? message.other;
    return message.replace(/\{(\w+)\}/g, (slot, name) => params[name] ?? slot);
  };
  t.code = code;
  t.number = (n, options) => n.toLocaleString(code, options);
  return t;
}

// Fill elements marked data-i18n (text) and data-i18n-label (aria-label).
export function translateDom(root, t) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel));
}
