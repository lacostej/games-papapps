// Solutions explorer: every solution of the last numbers round (or of ?cards=…&target=…), browsed
// as last step → method → solution, with the chosen one drawn as a tree. The player's and the
// computer's answers are marked at every level.
import { pickUiLanguage, translateDom, translator } from './i18n.js';
import { describe, fromMoves, fromSteps, solutions } from '../core/methods.js';
import { solve } from '../core/numbers.js';

const SIGN = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const SVG = 'http://www.w3.org/2000/svg';
const t = translator(pickUiLanguage(navigator.languages ?? [navigator.language]));
const main = document.getElementById('explore');

document.documentElement.lang = t.code;
document.title = t('exploreTitle');
translateDom(document, t);

const draw = loadDraw();
if (!draw) main.replaceChildren(el('p', { className: 'hint' }, t('noDraw')));
else start(draw);

function loadDraw() {
  const params = new URLSearchParams(location.search);
  const cards = params.get('cards')?.split(',').map(Number);
  const target = Number(params.get('target'));
  if (cards?.length && cards.every((c) => c > 0) && target > 0) {
    const best = solve(cards, target);
    return { plates: cards, target, computer: { value: best.value, steps: best.steps } };
  }
  try {
    return JSON.parse(localStorage.getItem('chiffres-lettres') ?? '{}').lastNumbers ?? null;
  } catch {
    return null;
  }
}

function start({ plates, target, you, computer }) {
  const answers = [];
  if (you) {
    const tree = fromMoves(plates, you.moves, you.value);
    if (tree) answers.push({ who: 'you', ...describe(tree) });
  }
  if (computer) answers.push({ who: 'computer', ...describe(fromSteps(plates, computer.steps, computer.value)) });

  // Every solution as close to the target as the computer got, plus the answers themselves.
  const gap = computer ? Math.abs(computer.value - target) : 0;
  const values = gap ? [target - gap, target + gap].filter((v) => v > 0) : [target];
  const all = values.flatMap((v) => solutions(plates, v));
  for (const a of answers) if (!all.some((s) => s.key === a.key)) all.push(a);

  // last step → method → solutions, each level knowing which answers it holds.
  const lastKey = (s) => `${s.v}|${s.last}`;
  const lasts = new Map();
  for (const s of all) {
    const methods = lasts.get(lastKey(s)) ?? new Map();
    methods.set(s.family, [...(methods.get(s.family) ?? []), s]);
    lasts.set(lastKey(s), methods);
  }
  const holders = (test) => answers.filter(test).map((a) => a.who);
  const first = answers.find((a) => a.who === 'you') ?? answers[0] ?? all[0];
  const sel = first ? { last: lastKey(first), family: first.family, key: first.key } : {};

  const render = () => {
    const methods = lasts.get(sel.last) ?? new Map();
    const list = methods.get(sel.family) ?? [];
    const chosen = list.find((s) => s.key === sel.key) ?? list[0];
    main.replaceChildren(
      el('div', { className: 'target small' }, el('span', {}, t('target')), el('b', {}, String(target))),
      cardsRow(plates, chosen),
      el('div', { className: 'answers' }, ...answers.map((a) => {
        const b = el('button', { className: `answer-pick ${a.who}` }, el('span', { className: 'who' }, t(a.who === 'you' ? 'yourAnswer' : 'computerAnswer')), `${a.text} = ${a.v}`);
        b.addEventListener('click', () => {
          Object.assign(sel, { last: lastKey(a), family: a.family, key: a.key });
          render();
        });
        return b;
      })),
      section(t('lastStep'), [...lasts].map(([key, m]) => {
        const [v, last] = key.split('|');
        const sols = [...m.values()].flat();
        return chip(`${last}${Number(v) === target ? '' : ` = ${v}`}`, t('methodCount', { count: m.size }), holders((a) => lastKey(a) === key), key === sel.last, () => {
          const [family, list] = [...m][0];
          Object.assign(sel, { last: key, family, key: list[0].key });
          render();
        }, sols[0].ops);
      })),
      section(t('method'), [...methods].map(([family, list]) =>
        chip(family, String(list.length), holders((a) => lastKey(a) === sel.last && a.family === family), family === sel.family, () => {
          Object.assign(sel, { family, key: list[0].key });
          render();
        }, list[0].ops),
      )),
      section(t('solutions'), list.map((s) =>
        chip(s.text, '', holders((a) => a.key === s.key), s.key === chosen?.key, () => {
          sel.key = s.key;
          render();
        }, s.ops),
      )),
      chosen ? treeView(chosen.tree, holders((a) => a.key === chosen.key)) : '',
    );
  };
  render();
}

// Marks the cards the chosen solution uses.
function cardsRow(plates, chosen) {
  const left = chosen ? leaves(chosen.tree) : [];
  return el('div', { className: 'cards' }, ...plates.map((p) => {
    const i = left.indexOf(p);
    if (i >= 0) left.splice(i, 1);
    return el('span', { className: `plate ${i >= 0 ? '' : 'unused'}` }, String(p));
  }));
}

function leaves(x) {
  return x.kind === 'n' ? [x.v] : [...x.plus, ...x.minus].flatMap(leaves);
}

function section(title, chips) {
  return el('section', { className: 'level' }, el('h2', {}, title), el('div', { className: 'chips' }, ...chips.sort((a, b) => b.rank - a.rank)));
}

// Chips holding an answer come first, then the shortest solutions.
function chip(label, note, who, selected, onClick, ops) {
  const b = el('button', { className: `chip ${selected ? 'selected' : ''}` }, label, note ? el('small', {}, note) : '', ...who.map((w) => el('i', { className: `dot ${w}` })));
  b.rank = who.length * 100 - ops;
  b.setAttribute('aria-pressed', String(selected));
  b.addEventListener('click', onClick);
  return b;
}

// The tree top-down: the result at the top, cards at the bottom, each member's sign on its branch.
function treeView(tree, who) {
  const X = 52, Y = 72, M = 26;
  let slot = 0;
  const nodes = [];
  const place = (x, depth, sign) => {
    const kids = x.kind === 'n' ? [] : [...x.plus.map((c) => [c, '+']), ...x.minus.map((c) => [c, '-'])].sort((a, b) => (a[1] === b[1] ? b[0].v - a[0].v : a[1] === '+' ? -1 : 1));
    const placed = kids.map(([c, s]) => place(c, depth + 1, x.kind === '+' ? s : s === '+' ? '*' : '/'));
    const node = { x, depth, sign, kids: placed, cx: placed.length ? (placed[0].cx + placed.at(-1).cx) / 2 : M + X * slot++ };
    nodes.push(node);
    return node;
  };
  const root = place(tree, 0, null);
  const depth = Math.max(...nodes.map((n) => n.depth));
  const width = M * 2 + X * (slot - 1);
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${Y * depth + 44}`, class: `tree ${who.join(' ')}`, role: 'img', 'aria-label': `${root.x.v}` });
  svg.style.maxWidth = `${width * 1.2}px`;
  const y = (n) => 22 + n.depth * Y;
  for (const n of nodes)
    for (const k of n.kids) {
      svg.append(svgEl('line', { x1: n.cx, y1: y(n) + 14, x2: k.cx, y2: y(k) - 14, class: 'branch' }));
      const mx = (n.cx + k.cx) / 2, my = (y(n) + 14 + y(k) - 14) / 2;
      svg.append(svgEl('circle', { cx: mx, cy: my, r: 9, class: 'op-dot' }), svgText(SIGN[k.sign], mx, my, 'op-sign'));
    }
  for (const n of nodes) {
    const w = Math.max(36, String(n.x.v).length * 10 + 16);
    svg.append(svgEl('rect', { x: n.cx - w / 2, y: y(n) - 14, width: w, height: 28, rx: 8, class: n.x.kind === 'n' ? 'node-card' : n === root ? 'node-root' : 'node-value' }));
    svg.append(svgText(String(n.x.v), n.cx, y(n), n.x.kind === 'n' ? 'node-card-text' : 'node-value-text'));
  }
  return el('div', { className: 'tree-box' }, svg);
}

function svgText(text, x, y, cls) {
  const node = svgEl('text', { x, y, class: cls, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
  node.textContent = text;
  return node;
}

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function el(tag, props, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
