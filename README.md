# Papapps

Small browser games, one folder each, published at https://lacostej.github.io/games-papapps/.

- [word-connect](word-connect/): swipe letters on a wheel to form words.
- [sudoku](sudoku/): 4×4, 6×6 and 9×9 grids in digits, letters or fruit, four difficulty levels.
- [hangman](hangman/): guess a word letter by letter, English or French, with a category hint.
- [chiffres-lettres](chiffres-lettres/): Des chiffres et des lettres: longest word from 10 letters, reach a target from 6 numbers, against the computer.

```
npm start   # serves the whole site on :8080, with the LAN URL for phones
npm test    # every game's tests (what CI runs before deploying)
```

Design goal: every game stays clean and usable on a phone (320–414 px wide), including at the end of a long game. What grows while playing (found words, bonus words, notes) scrolls, collapses or is counted; it never shrinks or pushes out the playing surface (wheel, grid, board, keyboard). Check new UI with a late-game state, not just a fresh one.

Adding a game: a folder with its own `index.html`, `icon.svg` (square) and `package.json`, an entry in `games.js`, and the folder in the root `workspaces`. Add `<nav data-game-nav="<id>">` plus `shared/game-nav.{js,css}` to show the game menu.

Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/pages.yml`).

The site installs as one app (`manifest.webmanifest`, opening on the game menu). `shared/install.js` adds an install button to the menu: Chromium browsers show their install prompt, Safari and Firefox on Android get the steps, and it is hidden inside the installed app. `sw.js` is network first, so updates need no version bump; pages opened once also work offline. `tools/render-icons.sh` renders `icons/*.png` from `icon.svg`.
