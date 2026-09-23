// Adding a language: add an entry here and a dictionaries/<code>/ folder
// (words.txt + seeds.txt), see tools/build-dictionary.mjs.
export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en' },
  { code: 'fr', name: 'Français', locale: 'fr', replacements: { 'œ': 'oe', 'æ': 'ae' } },
];
