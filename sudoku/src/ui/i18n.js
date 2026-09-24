// Interface strings. Values are strings with {param} slots, or plural forms keyed by
// Intl.PluralRules category and selected by the `count` param.
export const MESSAGES = {
  en: {
    gridSize: 'Grid size',
    symbols: 'Symbols',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert',
    board: 'Sudoku grid',
    pad: 'Symbols to place',
    erase: 'Erase',
    notes: 'Notes',
    notesList: 'notes {list}',
    restart: 'Restart',
    newGrid: 'New grid',
    confirmRestart: 'Clear your entries and start this grid again?',
    cellsLeft: { one: '{level} · {count} cell left', other: '{level} · {count} cells left' },
    solved: 'Solved!',
    cell: 'Row {row}, column {col}: {value}',
    empty: 'empty',
  },
  fr: {
    gridSize: 'Taille de la grille',
    symbols: 'Symboles',
    difficulty: 'Difficulté',
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
    expert: 'Expert',
    board: 'Grille de sudoku',
    pad: 'Symboles à placer',
    erase: 'Effacer',
    notes: 'Notes',
    notesList: 'notes {list}',
    restart: 'Recommencer',
    newGrid: 'Nouvelle grille',
    confirmRestart: 'Effacer vos cases et recommencer cette grille ?',
    cellsLeft: { one: '{level} · {count} case restante', other: '{level} · {count} cases restantes' },
    solved: 'Résolu !',
    cell: 'Ligne {row}, colonne {col} : {value}',
    empty: 'vide',
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
