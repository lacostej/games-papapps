# Hangman

Guess a word letter by letter, in English or French. Words come from ten themed lists in `src/data/words.js` (animals, food, the house, nature, jobs, sports, transport, the body, clothes, music), about 410 per language; the category is the hint. French words keep their accents and are guessed with plain A-Z: E reveals É, È and Ê.

```
npm start   # serves on :8080
npm test
```

Difficulty sets the tries: Easy 10 (the whole drawing, with hint), Medium 8 (hint), Hard 6 (gallows already up, no hint). Every word was checked against ENABLE (English) and Dicollecte 6.4.1 (French) when the lists were written.
