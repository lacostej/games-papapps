# Papapps

Small browser games, one folder each, published at https://lacostej.github.io/games-papapps/.

- [word-connect](word-connect/): swipe letters on a wheel to form words.
- [sudoku](sudoku/): 4×4, 6×6 and 9×9 grids in digits, letters or fruit, four difficulty levels.
- [hangman](hangman/): guess a word letter by letter, English or French, with a category hint.

```
npm start   # serves the whole site on :8080, with the LAN URL for phones
npm test    # every game's tests (what CI runs before deploying)
```

Adding a game: a folder with its own `index.html`, `icon.svg` (square) and `package.json`, an entry in `games.js`, and the folder in the root `workspaces`. Add `<nav data-game-nav="<id>">` plus `shared/game-nav.{js,css}` to show the game menu.

Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/pages.yml`).
