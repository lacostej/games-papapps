// Interface strings. Values are strings with {param} slots, or plural forms keyed by
// Intl.PluralRules category and selected by the `count` param.
export const MESSAGES = {
  en: {
    title: 'Numbers & Letters',
    mode: 'Rounds',
    modeBoth: 'Both',
    modeNumbers: 'Numbers',
    modeLetters: 'Letters',
    wordLanguage: 'Word language',
    you: 'You',
    computer: 'CPU',
    roundNumbers: 'Round {n} · Numbers',
    roundLetters: 'Round {n} · Letters',
    vowel: 'Vowel',
    consonant: 'Consonant',
    pickLetters: { one: 'Pick {count} more letter', other: 'Pick {count} more letters' },
    target: 'Target',
    answer: 'Answer',
    timeUp: 'Time’s up!',
    yourWord: 'Your word',
    noWord: 'No word',
    submit: 'Submit',
    clear: 'Clear',
    undo: 'Undo',
    reset: 'Start over',
    yourNumbers: 'Tap a number, an operation, then another number.',
    announce: 'Announce {value}',
    notAllowed: 'Not allowed: whole positive numbers only.',
    notAWord: 'Not in the dictionary',
    cantSpell: 'Uses letters you don’t have',
    points: { one: '{count} pt', other: '{count} pts' },
    away: { one: '{count} away', other: '{count} away' },
    exact: 'Exact!',
    computerFound: 'The computer found',
    computerWords: { one: 'and {count} other word of that length', other: 'and {count} other words of that length' },
    computerNone: 'No word at all.',
    next: 'Next round',
    loading: 'Loading the dictionary…',
    loadFailed: 'Could not load the dictionary. Check the connection and try again.',
    retry: 'Try again',
    resetScore: 'Reset score',
    credits: 'Words: {source}',
  },
  fr: {
    title: 'Des chiffres et des lettres',
    mode: 'Manches',
    modeBoth: 'Les deux',
    modeNumbers: 'Chiffres',
    modeLetters: 'Lettres',
    wordLanguage: 'Langue des mots',
    you: 'Vous',
    computer: 'Ordi',
    roundNumbers: 'Manche {n} · Chiffres',
    roundLetters: 'Manche {n} · Lettres',
    vowel: 'Voyelle',
    consonant: 'Consonne',
    pickLetters: { one: 'Encore {count} lettre', other: 'Encore {count} lettres' },
    target: 'À trouver',
    answer: 'Répondre',
    timeUp: 'Temps écoulé !',
    yourWord: 'Votre mot',
    noWord: 'Pas de mot',
    submit: 'Valider',
    clear: 'Effacer',
    undo: 'Annuler',
    reset: 'Recommencer',
    yourNumbers: 'Touchez un nombre, une opération, puis un autre nombre.',
    announce: 'Annoncer {value}',
    notAllowed: 'Interdit : nombres entiers positifs seulement.',
    notAWord: 'Absent du dictionnaire',
    cantSpell: 'Utilise des lettres absentes du tirage',
    points: { one: '{count} pt', other: '{count} pts' },
    away: { one: 'à {count}', other: 'à {count}' },
    exact: 'Le compte est bon !',
    computerFound: 'L’ordinateur a trouvé',
    computerWords: { one: 'et {count} autre mot de cette longueur', other: 'et {count} autres mots de cette longueur' },
    computerNone: 'Aucun mot.',
    next: 'Manche suivante',
    loading: 'Chargement du dictionnaire…',
    loadFailed: 'Impossible de charger le dictionnaire. Vérifiez la connexion et réessayez.',
    retry: 'Réessayer',
    resetScore: 'Remettre à zéro',
    credits: 'Mots : {source}',
  },
};

// Short labels: the toolbar also holds the mode and the score on a 320 px screen.
export const WORD_LANGUAGES = [
  { code: 'fr', name: 'FR' },
  { code: 'en', name: 'EN' },
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
