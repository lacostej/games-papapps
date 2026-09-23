// Reader for Grammalecte's "Lexique Dicollecte" (all inflected French forms + frequencies).
import { readFileSync } from 'node:fs';

// Sub-dictionaries holding standard spellings (classic, 1990-reform, both); X and A are
// rare or loose variants such as "seinen" or "restau".
const STANDARD = new Set(['*', 'C', 'M', 'R']);
// Proper nouns, first names, surnames, titles, affixes, known errors.
const EXCLUDED_CLASSES = new Set(['npr', 'prn', 'patr', 'titr', 'pfx', 'sfx', 'err', 'div']);
// Acronyms, symbols, abbreviations.
const EXCLUDED_NOTES = new Set(['sig', 'symb', 'abr', 'abty']);
// Notes that label rather than restrict: colours ("noir"), ordinals ("premier"),
// "pel" ("haute", "hasard"). Any other note (register, region, domain) keeps a word out of targets.
const NEUTRAL_NOTES = new Set(['pel', 'col', 'ord', '(nf)']);
// Passé simple and imperfect subjunctive: valid, but never required.
const LITERARY_TENSES = new Set(['ipsi', 'simp']);

export function* readDicollecte(path, { minTargetIndex, minTargetLiterature }) {
  const [headerLine, ...lines] = readFileSync(path, 'utf8').split('\n');
  const header = headerLine.split('\t');
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`${path}: no "${name}" column`);
    return i;
  };
  const FORM = col('Flexion');
  const TAGS = col('Étiquettes');
  const NOTES = col('Notes');
  const SUBDICT = col('Sous-dictionnaire');
  const INDEX = col('Indice de fréquence');
  // Google 1-grams inflate web English and abbreviations ("boy", "www"); literature doesn't.
  const LITERATURE = col('Littérature');

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = line.split('\t');
    const word = fields[FORM];
    const tags = fields[TAGS].split(' ');
    const notes = fields[NOTES].split(' ').filter(Boolean);
    const subdicts = fields[SUBDICT].split('/');
    if (!/^\p{Ll}/u.test(word)) continue;
    if (!subdicts.every((s) => STANDARD.has(s))) continue;
    if (EXCLUDED_CLASSES.has(tags[0]) || tags[0].startsWith('loc.')) continue;
    if (notes.some((n) => EXCLUDED_NOTES.has(n))) continue;
    const target =
      Number(fields[INDEX]) >= minTargetIndex &&
      Number(fields[LITERATURE]) >= minTargetLiterature &&
      subdicts.every((s) => s === '*') &&
      notes.every((n) => NEUTRAL_NOTES.has(n)) &&
      !tags.some((t) => LITERARY_TENSES.has(t));
    yield { word, target };
  }
}
