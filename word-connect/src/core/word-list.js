// One word per line; blank lines and "#" comments are ignored.
export function parseWordList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}
