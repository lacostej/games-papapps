# Word Connect

Prototype of the letter-wheel manipulative: swipe across 4–7 letters to form a word, one point per new valid word. Each puzzle has required words (common ones) and bonus words (rare but valid).

```
npm start                      # serves on :8080 and prints the LAN URL to open on a phone
npm test
npm run build:puzzles [en|fr]  # rebuilds puzzles/<code>/<size>.json
```

No dependencies, no build step for the app: plain ES modules.

## Layout

- `src/core/`: platform-free logic. `Language` (normalization, tiles), `WordIndex` (words a set of tiles can spell, used by the build), `Selection` (swipe path with backtrack), `dealPuzzle`, `FreePlay` (scoring, required and bonus words).
- `src/ui/wheel.js`: the swipe component. It emits the swiped tiles on release and knows nothing about scoring, so other modes (word grid, "find N words") can reuse it.
- `src/data/languages.js`: language registry.
- `puzzles/<code>/<size>.json`: what players download, 100 puzzles each with their required and bonus words (2–14 KB gzip). The full word source is only needed to build them.
- `src/ui/i18n.js`: interface strings (en, fr). The interface language follows the browser and is separate from the word language.
- The ⋯ button opens a settings and test panel: interface language, a hit-size slider, swipe stats, and the puzzle's full word list.

## Word sources

Configured in `tools/puzzle-sources.json`. Sources are build inputs, never shipped.

- **fr**: Lexique Dicollecte 6.4.1 (Grammalecte, MPL 2.0), from [openlexicon](https://github.com/chrplr/openlexicon). Download it into `sources/fr/` (gitignored); the build prints the URL if it is missing. Required words: frequency index ≥ 6, ≥ 100 occurrences in its literature corpus, no register/regional note, no passé simple or imperfect subjunctive. Everything else in the standard spellings is a bonus word.
- **en**: [ENABLE](https://github.com/dolph/dictionary) (public domain) decides what is valid; [SCOWL/ESDB](https://github.com/en-wl/wordlist) size levels (MIT-like, Kevin Atkinson) decide what is required: ENABLE words at SCOWL size ≤ 50 ("medium"). Common words newer than ENABLE (SCOWL ≤ 60, e.g. "email") are bonus words. Put `enable1.txt` and `scowl-pre.txt` in `sources/en/`.
- `tools/curation/`: words demoted to bonus or rejected by hand. The build fails if a listed word isn't in the source, so typos can't go unnoticed.
