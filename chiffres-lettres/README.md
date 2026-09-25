# Des chiffres et des lettres

The TV game against the computer, 60 seconds a round. "Both" plays one numbers round, then two letters rounds, and repeats.

- **Letters**: tap Vowel or Consonant nine times (as in the original show; ten is an option on the draw screen) (letters are weighted by how often they appear in the language's words), think, then spell the longest word you found. French or English; accents are ignored. The computer shows the longest words, common ones first.
- **Numbers** ("le compte est bon"): six plates from 1-10 (two of each) and 25, 50, 75, 100; a target of 100-999; + − × ÷ on whole positive numbers, each plate once. Enter your working by tapping; you announce the closest number you made. The computer searches every combination (under 30 ms).
- **Score** (ours, not the show's): a word scores its length; numbers score 10 when exact, one less per unit away.

```
npm start             # serves on :8080
npm test
npm run build:words   # rebuilds words/<code>.json
```

`words/<code>.json` holds every word of 2-10 letters (fr 222,691 from Dicollecte 6.4.1; en 128,053 from ENABLE + SCOWL), the common subset, and the draw weights. It is built from Word Connect's sources and settings (`../word-connect/tools/puzzle-sources.json`), so both games accept the same words.
