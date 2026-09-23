const PUZZLES = new URL('../../puzzles/', import.meta.url);

// A pack holds every puzzle of one language and letter count, with its words.
export async function loadPuzzlePack(code, size, readText = fetchText) {
  return JSON.parse(await readText(new URL(`${code}/${size}.json`, PUZZLES)));
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}
