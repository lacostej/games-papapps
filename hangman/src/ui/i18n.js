// Interface strings. Values are strings with {param} slots, or plural forms keyed by
// Intl.PluralRules category and selected by the `count` param.
export const MESSAGES = {
  en: {
    wordLanguage: 'Word language',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    wins: { one: 'win', other: 'wins' },
    drawing: { one: '{count} try left', other: '{count} tries left' },
    word: 'Word: {pattern}',
    blank: 'blank',
    keyboard: 'Letters',
    newWord: 'New word',
    hint: 'Hint: {category}',
    noHint: 'No hint',
    won: 'Well done!',
    streak: 'Well done! {count} in a row',
    lost: 'The word was {word}',
    category_animals: 'Animals',
    category_food: 'Food',
    category_home: 'Around the house',
    category_nature: 'Nature',
    category_jobs: 'Jobs',
    category_sports: 'Sports',
    category_transport: 'Transport',
    category_body: 'The body',
    category_clothes: 'Clothes',
    category_music: 'Music',
  },
  fr: {
    wordLanguage: 'Langue des mots',
    difficulty: 'Difficulté',
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
    wins: { one: 'victoire', other: 'victoires' },
    drawing: { one: '{count} essai restant', other: '{count} essais restants' },
    word: 'Mot : {pattern}',
    blank: 'vide',
    keyboard: 'Lettres',
    newWord: 'Nouveau mot',
    hint: 'Indice : {category}',
    noHint: 'Pas d’indice',
    won: 'Bravo !',
    streak: 'Bravo ! {count} d’affilée',
    lost: 'Le mot était {word}',
    category_animals: 'Animaux',
    category_food: 'Nourriture',
    category_home: 'La maison',
    category_nature: 'Nature',
    category_jobs: 'Métiers',
    category_sports: 'Sports',
    category_transport: 'Transports',
    category_body: 'Le corps',
    category_clothes: 'Vêtements',
    category_music: 'Musique',
  },
};

export const WORD_LANGUAGES = [
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
