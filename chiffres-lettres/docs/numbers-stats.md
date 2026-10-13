# Numbers round: how often is the target reachable?

In 9,388 of 10,000 simulated draws (93.9%) the target can be reached exactly, and 98.2% are within 1. A perfect player would average 9.85 of the 10 points per round.

The draws use the game's own draw (6 of the 24 plates, target 100 to 999) and its solver, with a fixed seed: `node tools/numbers-stats.mjs 10000` reproduces every number here. An independent brute-force search agreed with the solver's closest value and its fewest operations on 300 draws each.

## Distance spread

The median distance is 0, the 95th percentile 1 and the 99th percentile 4. A tail of 73 draws (0.7%) misses by 10 or more and scores nothing, even for a perfect player.

| Closest distance | Draws | Share | Cumulative |
| --- | --- | --- | --- |
| 0 (exact) | 9,388 | 93.9% | 93.9% |
| 1 | 428 | 4.3% | 98.2% |
| 2 | 57 | 0.6% | 98.7% |
| 3 | 24 | 0.2% | 99.0% |
| 4 to 9 | 30 | 0.3% | 99.3% |
| 10 or more | 73 | 0.7% | 100% |

The worst draw was 1 1 2 2 4 5 for a target of 954: the closest reachable number is 180, a miss of 774. The mean distance, 1.37, is driven by such draws.

## By draw

Draws without a big plate (25, 50, 75 or 100) are 28.5% of all draws and account for nearly all the misses. With one to three big plates, at least 95% of draws are exact.

| Big plates | Share of draws | Exact | Within 5 | Mean distance |
| --- | --- | --- | --- | --- |
| 0 | 28.5% | 84.4% | 96.9% | 4.74 |
| 1 | 46.1% | 97.6% | 100% | 0.03 |
| 2 | 21.7% | 98.2% | 100% | 0.02 |
| 3 | 3.5% | 95.2% | 100% | 0.05 |
| 4 | 0.1% (13 draws) | 92.3% | 92.3% | 0.46 |

Higher targets are harder: 99.8% of targets from 100 to 299 are exact, against 84.9% from 900 to 999.

| Target | Draws | Exact | Mean distance |
| --- | --- | --- | --- |
| 100 to 299 | 2,240 | 99.8% | 0.09 |
| 300 to 499 | 2,217 | 97.2% | 0.39 |
| 500 to 699 | 2,224 | 93.3% | 0.65 |
| 700 to 899 | 2,178 | 89.7% | 2.91 |
| 900 to 999 | 1,141 | 84.9% | 4.26 |

Reachable is not easy: exact answers usually need four or five operations.

| Fewest operations for an exact answer | Share of all draws | Cumulative |
| --- | --- | --- |
| 0 or 1 | 0.4% | 0.4% |
| 2 | 6.7% | 7.1% |
| 3 | 30.1% | 37.2% |
| 4 | 39.5% | 76.6% |
| 5 | 17.3% | 93.9% |

## For a kids' version

The current draw almost always has an answer, so what makes a round hard is the number of operations. Only 7.1% of draws can be solved in two operations.

- Smaller targets help most: below 300, nearly every draw is exact (99.8%).
- Guaranteeing at least one big plate removes the hopeless draws: with one, the mean distance falls from 4.74 to 0.03.

## Kids' configurations

Five cards with targets up to 200 come closest to the current game's spread: 1 to 10 once, targets 10 to 200, gives 92.5% exact and 99.3% within 1, against 93.8% and 98.2% today. They are also much shorter to solve: about 30% of draws can be solved in two operations, against 6.3% today. `node tools/numbers-configs.mjs` reproduces these figures (2,000 draws per configuration, so about ±1.3 points on a share near 90%).

| Plates | Targets | Exact | Within 1 | Exact in ≤ 2 ops | Exact in ≤ 3 ops |
| --- | --- | --- | --- | --- | --- |
| current game, 6 cards | 100 to 999 | 93.8% | 98.2% | 6.3% | 37.1% |
| 1 to 10 once | 10 to 200 | 92.5% | 99.3% | 31.1% | 68.8% |
| 1 to 10 once | 50 to 200 | 91.4% | 99.1% | 18.6% | 60.5% |
| 1 to 10 twice, 15 20 25 | 10 to 200 | 90.2% | 98.1% | 30.9% | 70.5% |
| 1 to 10 twice, 15 20 25 | 50 to 200 | 89.2% | 97.5% | 21.4% | 64.2% |
| 1 to 10 twice, 25 | 10 to 200 | 89.6% | 97.3% | 30.3% | 66.0% |
| 1 to 10 twice | 10 to 200 | 87.0% | 96.7% | 27.3% | 61.9% |
| 1 to 10 once | 100 to 200 | 87.3% | 98.3% | 6.1% | 47.0% |

All rows except the first draw 5 cards.

- **Drawing each value once** works better than the current pairs: pairs can deal duplicates, which reach fewer numbers.
- **The 10 to 200 range** includes targets a child gets in one operation (6.8% with 1 to 10 once). Starting at 50 cuts that to 1.4% for one point less of exact draws.
- **With 5 cards and targets up to 100**, 97% to 99.9% of draws are exact, easier than the current game.
- **With 4 cards**, targets must stay at 30 or below to reach 90% exact. Up to 100, at most 69% of draws are exact.
