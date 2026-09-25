// Interface strings. Values are strings with {param} slots, or plural forms keyed by
// Intl.PluralRules category and selected by the `count` param.
export const MESSAGES = {
  en: {
    trios: 'Trios',
    deck: 'Deck',
    time: 'Time',
    hint: 'Hint',
    hintCost: '+{seconds} s',
    newGame: 'New game',
    table: 'Cards on the table',
    notTrio: 'Not a trio',
    added: 'No trio on the table: 3 cards added',
    done: 'Deck cleared in {time}',
    best: 'Best: {time}',
    newBest: 'New best time!',
    rules: 'Find three cards where each feature (number, shape, shading, colour) is all the same or all different.',
    card: '{count} × {color} {shading} {shape}',
    shape0: 'diamond',
    shape1: 'squiggle',
    shape2: 'oval',
    shading0: 'solid',
    shading1: 'striped',
    shading2: 'open',
    color0: 'red',
    color1: 'green',
    color2: 'purple',
  },
  fr: {
    trios: 'Trios',
    deck: 'Pioche',
    time: 'Temps',
    hint: 'Indice',
    hintCost: '+{seconds} s',
    newGame: 'Nouvelle partie',
    table: 'Cartes sur la table',
    notTrio: 'Pas un trio',
    added: 'Aucun trio sur la table : 3 cartes ajoutées',
    done: 'Pioche terminée en {time}',
    best: 'Record : {time}',
    newBest: 'Nouveau record !',
    rules: 'Trouvez trois cartes où chaque caractéristique (nombre, forme, remplissage, couleur) est soit identique, soit toute différente.',
    card: '{count} × {shape} {color} {shading}',
    shape0: 'losange',
    shape1: 'vague',
    shape2: 'ovale',
    shading0: 'plein',
    shading1: 'hachuré',
    shading2: 'vide',
    color0: 'rouge',
    color1: 'vert',
    color2: 'violet',
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
