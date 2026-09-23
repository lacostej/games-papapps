// Adding a language: add an entry here, a source in tools/puzzle-sources.json, then run
// `npm run build:puzzles`.
export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en' },
  { code: 'fr', name: 'Français', locale: 'fr', replacements: { 'œ': 'oe', 'æ': 'ae' } },
];
