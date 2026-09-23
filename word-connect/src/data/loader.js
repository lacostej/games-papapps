import { Language } from '../core/language.js';
import { Dictionary, parseWordList } from '../core/dictionary.js';
import { LANGUAGES } from './languages.js';

const DICTIONARIES = new URL('../../dictionaries/', import.meta.url);

export async function loadLanguagePack(code, readText = fetchText) {
  const definition = LANGUAGES.find((l) => l.code === code);
  if (!definition) throw new Error(`Unknown language ${code}`);
  const language = new Language(definition);
  const [words, seeds] = await Promise.all([
    readText(new URL(`${code}/words.txt`, DICTIONARIES)),
    readText(new URL(`${code}/seeds.txt`, DICTIONARIES)),
  ]);
  return {
    language,
    dictionary: Dictionary.fromText(language, words),
    seeds: parseWordList(seeds).map((w) => language.normalize(w)),
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}
