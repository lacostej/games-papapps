# Numbers round: when are two solutions the same method?

Two solutions are the same method when they make the same big values with the same operations; the order of the operations, and how small values or the final adjustment are made, do not matter. `node tools/numbers-methods.mjs normal 11 3` lists every solution of example draws grouped this way.

## The rule

1. **Order and grouping are free.** 1 + 3 is 3 + 1, and 37 × 6 × 2 is the same whether computed as 74 × 6 or 37 × 12.
2. **In each sum or product, the largest member above 10 is described by how it was built**, and the same rule applies inside it. 112 as 28 × 4 and 112 as 16 × 7 are different methods.
3. **The other members of that sum or product are merged into one value.** The 13 in 200 − 13 is 13 whether it is 6 + 7 or anything else.
4. **A sum or product of values of 10 or less is just its value.** 3 × 4 × 6 × 6 and 9 × 2 × 4 × 6 are both 432.
5. **Distributing is a different method:** (100 + 6) × 8 is not 100 × 8 + 48.

## Examples

Draw 10 5 3 8 1 100, target 848:

| Method | Solutions | Example |
| --- | --- | --- |
| (100 + 6) × 8 | 8 | (1 + 100 + 5) × 8 |
| (100 × 8) + 48 | 3 | (1 + 10 + 5) × 3 + 100 × 8 |
| ((100 + 5) × 8) + 8 | 2 | (100 + 5) × 8 + 1 + 10 − 3 |
| ((100 − 5) × 9) − 7 | 1 | (1 + 8) × (100 − 5) + 3 − 10 |
| ((100 − 16) × 10) + 8 | 1 | (100 − 3 × 5 − 1) × 10 + 8 |

Draw 7 9 1 5 50 6, target 187: 16 solutions in 10 methods. The three ways to reach 180 + 7 are three methods, because 20 × 9, 36 × 5 and 45 × 4 are different multiplications:

| Method | Solutions | Example |
| --- | --- | --- |
| (50 × 5) − 63 | 3 | 5 × 50 − 7 × 9 |
| (50 × 4) − 13 | 2 | (9 − 5) × 50 − 6 − 7 |
| ((50 − 10) × 5) − 13 | 1 | (50 − 1 − 9) × 5 − 6 − 7 |
| ((50 − 30) × 9) + 7 | 1 | (50 − 5 × 6) × 9 + 7 |
| ((50 − 14) × 5) + 7 | 2 | (1 + 50 − 6 − 9) × 5 + 7 |
| ((50 − 5) × 4) + 7 | 2 | (1 + 50 − 6) × (9 − 5) + 7 |
| 17 × 11 | 1 | (1 + 7 + 9) × (5 + 6) |
| ((50 − 1) × 4) − 9 | 2 | (5 − 1) × (50 + 6 − 7) − 9 |
| ((50 − 7) × 4) + 15 | 1 | (5 − 1) × (50 − 7) + 6 + 9 |
| ((50 + 12) × 3) + 1 | 1 | (5 + 50 + 7) × (9 − 6) + 1 |

The search lists every exact solution; more examples are in [numbers-methods-examples.md](numbers-methods-examples.md).
