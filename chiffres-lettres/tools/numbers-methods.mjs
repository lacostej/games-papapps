// Every exact solution of numbers-round draws, grouped into methods (see docs/numbers-methods.md).
// Usage: node tools/numbers-methods.mjs <normal|kids> <seed> <draws>   (Markdown on stdout)
import { solutions } from '../src/core/methods.js';
import { drawNumbers, LEVELS } from '../src/core/numbers.js';

const [level, seedArg, count] = process.argv.slice(2);
let seed = Number(seedArg);
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
let shown = 0;
while (shown < Number(count)) {
  const { plates, target } = drawNumbers(random, LEVELS[level]);
  const sols = solutions(plates, target);
  const methods = new Map();
  for (const x of sols) methods.set(x.family, [...(methods.get(x.family) ?? []), x]);
  if (methods.size < 3 || methods.size > 12) continue;
  shown++;
  const lasts = new Map();
  for (const [f, list] of methods) lasts.set(list[0].last, [...(lasts.get(list[0].last) ?? []), [f, list]]);
  console.log(`\n### ${level === 'kids' ? 'Kids' : 'Normal'} ${shown}: ${plates.join(' ')} → ${target}\n`);
  console.log(`${sols.length} solutions, ${methods.size} methods, ${lasts.size} last steps.\n`);
  console.log('| Last step | Method | Solutions | Example |\n| --- | --- | --- | --- |');
  const order = [...lasts].sort((a, b) => b[1].length - a[1].length || Math.min(...a[1].map(([, l]) => l[0].ops)) - Math.min(...b[1].map(([, l]) => l[0].ops)));
  for (const [last, group] of order)
    group.forEach(([f, list], i) => console.log(`| ${i ? '' : (group.length > 1 ? `**${last}**` : last)} | ${f} | ${list.length} | ${list[0].text} |`));
}
