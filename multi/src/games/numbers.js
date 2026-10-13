// "Le compte est bon" for a group: everyone gets the same draw, looks at it, then builds and
// announces an answer. The host replays each player's moves, so only reachable values score.
import { Calculation, drawNumbers, LEVELS, numbersScore, solve } from '../../../chiffres-lettres/src/core/numbers.js';

export default {
  id: 'numbers',
  defaults: { level: 'normal', think: 45, answer: 30 },

  // Players may answer in the phases marked open; the round ends after the last one.
  phases: ({ think, answer }) => [
    { name: 'think', seconds: think },
    { name: 'answer', seconds: answer, open: true },
  ],

  deal: ({ level }, random) => drawNumbers(random, LEVELS[level] ?? LEVELS.normal),

  // answer: { moves: [[aId, op, bId]] }; the announced value is the closest number they made.
  check(deal, answer) {
    try {
      const calc = Calculation.from({ plates: deal.plates, moves: answer.moves });
      const value = calc.closest(deal.target);
      return { valid: true, value, moves: answer.moves, score: numbersScore(value, deal.target) };
    } catch {
      return { valid: false, score: 0 };
    }
  },

  // Shown with the results: the computer's best.
  summary(deal) {
    const best = solve(deal.plates, deal.target);
    return { best: { value: best.value, steps: best.steps } };
  },
};
