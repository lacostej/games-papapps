// Interface strings. Values are strings with {param} slots, or plural forms keyed by
// Intl.PluralRules category and selected by the `count` param.
export const MESSAGES = {
  en: {
    wordLanguage: 'Word language',
    letterCount: 'Number of letters',
    letters: { one: '{count} letter', other: '{count} letters' },
    points: 'pts',
    openPanel: 'Settings and test panel',
    progress: { one: '{found} / {total} word', other: '{found} / {total} words' },
    wheel: 'Letter wheel: swipe across letters to form a word',
    shuffle: 'Shuffle',
    newLetters: 'New letters',
    panelTitle: 'Settings & test',
    interfaceLanguage: 'Interface language',
    hitSize: 'Swipe hit size',
    hitSizeValue: '{set} (uses {used})',
    wordsToFind: 'Words to find',
    bonusWords: 'Bonus words',
    credits: 'Words: {source}',
    close: 'Close',
    statSwipes: 'Swipes',
    statFound: 'Words found',
    statBonus: 'Bonus words',
    statInvalid: 'Not a word',
    statDuplicate: 'Already found',
    statTooShort: 'Too short',
    statTaps: 'Single-letter taps',
    statBacktracks: 'Backtracks',
    statShuffles: 'Shuffles',
    statMinutes: 'Minutes on puzzle',
    statPuzzle: 'Puzzle',
  },
  fr: {
    wordLanguage: 'Langue des mots',
    letterCount: 'Nombre de lettres',
    letters: { one: '{count} lettre', other: '{count} lettres' },
    points: 'pts',
    openPanel: 'Réglages et panneau de test',
    progress: { one: '{found} / {total} mot', other: '{found} / {total} mots' },
    wheel: 'Roue de lettres : glissez sur les lettres pour former un mot',
    shuffle: 'Mélanger',
    newLetters: 'Nouvelles lettres',
    panelTitle: 'Réglages et test',
    interfaceLanguage: 'Langue de l’interface',
    hitSize: 'Zone de détection',
    hitSizeValue: '{set} (effectif {used})',
    wordsToFind: 'Mots à trouver',
    bonusWords: 'Mots bonus',
    credits: 'Mots : {source}',
    close: 'Fermer',
    statSwipes: 'Glissés',
    statFound: 'Mots trouvés',
    statBonus: 'Mots bonus',
    statInvalid: 'Mots inconnus',
    statDuplicate: 'Déjà trouvés',
    statTooShort: 'Trop courts',
    statTaps: 'Appuis sur une lettre',
    statBacktracks: 'Retours en arrière',
    statShuffles: 'Mélanges',
    statMinutes: 'Minutes sur la grille',
    statPuzzle: 'Grille',
  },
};

export const UI_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
];

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
