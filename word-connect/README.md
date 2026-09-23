# Word Connect

Prototype of the letter-wheel manipulative: swipe across 4–7 letters to form a word, one point per new dictionary word.

```
npm start      # serves on :8080 and prints the LAN URL to open on a phone
npm test
npm run build:dict [en|fr]
```

No dependencies, no build step: plain ES modules.

## Layout

- `src/core/`: platform-free logic. `Language` (normalization, tiles), `Dictionary`, `Selection` (swipe path with backtrack), `createPuzzle`, `FreePlay` (scoring mode).
- `src/ui/wheel.js`: the swipe component. It emits the swiped tiles on release and knows nothing about scoring, so other modes (word grid, "find N words") can reuse it.
- `src/data/languages.js`: language registry. `dictionaries/<code>/words.txt` holds the valid words, `seeds.txt` the words used to pick letter sets.
- `src/ui/i18n.js`: interface strings (en, fr). The interface language follows the browser and is separate from the word language.
- The ⋯ button opens a settings and test panel: interface language, a hit-size slider, swipe stats, and the puzzle's full word list.

## Dictionaries

- **en**: built from macOS `/usr/share/dict/words` (web2, public domain). That list has no plurals, so the build adds `+S` forms, which accepts some non-words. It also contains many obscure words.
- **fr**: a small hand-made sample (~300 words) to exercise accents and ligatures.

For real play, put a proper list in `tools/dictionary-sources.json` and rebuild. The build fails if a seed is missing from the dictionary.
