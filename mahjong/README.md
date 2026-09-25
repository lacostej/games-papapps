# Mahjong

Mahjong solitaire: remove matching pairs of free tiles (nothing on top, left or right side open). Flowers match any flower, seasons any season.

- Three portrait layouts, at most 7 tiles wide so tiles stay readable on a phone: Easy (72 tiles, 2 layers), Medium (94, 4 layers), Hard (132, 4 layers). On a 320x568 screen Hard's tiles are about 23x31 px; Easy suits small phones better.
- Every deal can be cleared: faces are given to pairs of free positions taken off a full board, so that order clears it (`solvableFaces` in `src/core/mahjong.js`).
- Shuffle re-deals the remaining faces the same way. With 20 tiles or fewer it confirms exhaustively; when nothing can help (e.g. two tiles stacked) the game says so.
- Hint, undo, a clock that pauses while hidden, and a best time per layout.
- Tile faces are SVG drawn in `src/ui/faces.js`, each with a corner index (numbers, wind letters), so no Chinese reading is needed.

```
npm start   # serves on :8080
npm test
```
