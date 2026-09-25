# Trio

The rules of the card game Set (Marsha Falco, published by Set Enterprises; "SET" is their trademark, hence another name here). 81 cards, each with a number (1-3), a shape (diamond, squiggle, oval), a shading (solid, striped, open) and a colour (red, green, purple). Three cards are a trio when every feature is all the same or all different.

Solo race through the deck: twelve cards are dealt, three more whenever the table holds no trio, and the game ends when the deck is empty and no trio remains. The clock pauses while the app is hidden; a hint shows one card of a trio and adds 10 s. The best time is kept.

```
npm start   # serves on :8080
npm test
```

Cards are the numbers 0-80; their base-3 digits are the features, so three cards are a trio exactly when each feature's values sum to a multiple of 3 (`src/core/trio.js`).
