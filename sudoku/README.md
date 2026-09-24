# Sudoku

4×4, 6×6 and 9×9 grids (2×2, 2×3 and 3×3 boxes), drawn as digits, letters or fruit. Grids are generated in the browser; progress is kept in `localStorage`.

```
npm start   # serves on :8080
npm test
```

## Difficulty

`src/core/sudoku.js` digs a random full grid, keeping each removal only if the solution stays unique, then grades what a person needs to solve it:

- **Easy**: naked and hidden singles; half the cells are given.
- **Medium**: singles only, as few givens as that allows.
- **Hard**: needs locked candidates or naked pairs.
- **Expert**: needs more than that (X-wings, chains, trial and error).

4×4 grids never need more than singles, so they offer Easy and Medium only. 6×6 Hard is the slowest to generate: up to ~2000 attempts, ~200 ms.
