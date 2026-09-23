import { Selection } from '../core/selection.js';
import { shuffle } from '../core/puzzle.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = 50;
const RING_RADIUS = 33;
const TRACE_STEP = 1; // SVG units between hit tests along a swipe segment

// The swipe manipulative: tiles on a circle, drawn in a 100x100 SVG viewBox.
// Emits the swiped tiles on release; knows nothing about dictionaries or scoring.
export class LetterWheel {
  constructor(svg, { onChange = () => {}, onRelease = () => {}, onStep = () => {}, dragHitScale = 1 } = {}) {
    this.svg = svg;
    this.dragHitScale = dragHitScale;
    this.onChange = onChange;
    this.onRelease = onRelease;
    this.onStep = onStep;
    this.selection = new Selection();
    this.tiles = [];
    this.slots = [];
    this.pointerId = null;

    svg.replaceChildren();
    svg.append(el('circle', { class: 'wheel-bg', cx: CENTER, cy: CENTER, r: 48 }));
    this.trail = el('polyline', { class: 'trail' });
    this.tail = el('line', { class: 'trail tail' });
    this.tileLayer = el('g');
    svg.append(this.trail, this.tail, this.tileLayer);

    svg.addEventListener('pointerdown', (e) => this.#down(e));
    svg.addEventListener('pointermove', (e) => this.#move(e));
    svg.addEventListener('pointerup', (e) => this.#up(e));
    svg.addEventListener('pointercancel', (e) => this.#cancel(e));
    svg.addEventListener('lostpointercapture', (e) => this.#cancel(e));
    svg.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setTiles(tiles) {
    this.#reset();
    this.tiles = [...tiles];
    this.slots = tiles.map((_, i) => i);
    const n = tiles.length;
    const halfChord = RING_RADIUS * Math.sin(Math.PI / n);
    this.tileRadius = Math.min(13, halfChord * 0.8);
    // Touch-down target: generous, but never overlapping a neighbour's.
    this.startHitRadius = Math.min(this.tileRadius * 1.25, halfChord * 0.95);
    this.setDragHitScale(this.dragHitScale);

    this.tileEls = tiles.map((tile) => {
      const g = el('g', { class: 'tile' });
      g.append(
        el('circle', { r: this.tileRadius }),
        el('text', { 'font-size': this.tileRadius * (tile.length > 1 ? 0.8 : 1.15) }, tile),
      );
      return g;
    });
    this.tileLayer.replaceChildren(...this.tileEls);
    this.#layout();
  }

  // While dragging, a straight swipe between two tiles must not graze the tile between
  // them: at 7 letters that chord passes 12.4 units from its centre.
  setDragHitScale(scale) {
    this.dragHitScale = scale;
    const n = this.tiles.length;
    if (!n) return;
    const skipOneGap = RING_RADIUS * (1 - Math.cos((2 * Math.PI) / n));
    this.dragHitRadius = Math.min(this.tileRadius * scale, skipOneGap * 0.8);
  }

  shuffle(rng = Math.random) {
    if (this.tiles.length < 2) return;
    this.#reset();
    const before = this.slots.join();
    do this.slots = shuffle(this.slots, rng);
    while (this.slots.join() === before);
    this.#layout();
  }

  center(index) {
    const angle = -Math.PI / 2 + (this.slots[index] * 2 * Math.PI) / this.tiles.length;
    return {
      x: CENTER + RING_RADIUS * Math.cos(angle),
      y: CENTER + RING_RADIUS * Math.sin(angle),
    };
  }

  hitTest(point, radius) {
    for (let i = 0; i < this.tiles.length; i++) {
      const c = this.center(i);
      if (Math.hypot(point.x - c.x, point.y - c.y) <= radius) return i;
    }
    return null;
  }

  get selectedTiles() {
    return this.selection.path.map((i) => this.tiles[i]);
  }

  #down(e) {
    if (this.pointerId !== null || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const point = this.#toSvg(e);
    const hit = this.hitTest(point, this.startHitRadius);
    if (hit === null) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.svg.setPointerCapture?.(e.pointerId);
    this.hover = hit;
    this.last = point;
    this.finger = point;
    this.selection.clear();
    this.selection.enter(hit);
    this.onStep('add');
    this.#render();
  }

  #move(e) {
    if (e.pointerId !== this.pointerId) return;
    // Coalesced events keep fast swipes from skipping over a tile.
    const events = e.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e]) this.#trace(this.#toSvg(ev));
    this.#render();
  }

  #up(e) {
    if (e.pointerId !== this.pointerId) return;
    this.#trace(this.#toSvg(e));
    const tiles = this.selectedTiles;
    const indices = this.selection.path;
    this.#reset();
    this.onRelease(tiles, indices);
  }

  #cancel(e) {
    if (e.pointerId !== this.pointerId) return;
    this.#reset();
    this.onRelease([], []);
  }

  // Walk the segment from the previous point so every tile crossed is entered in order.
  #trace(point) {
    const from = this.last;
    const steps = Math.max(1, Math.ceil(Math.hypot(point.x - from.x, point.y - from.y) / TRACE_STEP));
    for (let s = 1; s <= steps; s++) {
      const hit = this.hitTest(
        {
          x: from.x + ((point.x - from.x) * s) / steps,
          y: from.y + ((point.y - from.y) * s) / steps,
        },
        this.dragHitRadius,
      );
      if (hit === this.hover) continue;
      this.hover = hit;
      if (hit === null) continue;
      const change = this.selection.enter(hit);
      if (change) this.onStep(change);
    }
    this.last = point;
    this.finger = point;
  }

  #reset() {
    if (this.pointerId !== null) {
      const id = this.pointerId;
      this.pointerId = null;
      if (this.svg.hasPointerCapture?.(id)) this.svg.releasePointerCapture(id);
    }
    this.selection.clear();
    this.hover = null;
    this.finger = null;
    this.#render();
  }

  #layout() {
    this.tileEls.forEach((g, i) => {
      const { x, y } = this.center(i);
      g.style.transform = `translate(${x}px, ${y}px)`;
    });
    this.#render();
  }

  #render() {
    const path = this.selection.path;
    this.tileEls?.forEach((g, i) => g.classList.toggle('selected', path.includes(i)));
    const points = path.map((i) => this.center(i));
    this.trail.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
    const last = points.at(-1);
    if (last && this.finger) {
      setAttrs(this.tail, { x1: last.x, y1: last.y, x2: this.finger.x, y2: this.finger.y });
      this.tail.style.visibility = 'visible';
    } else {
      this.tail.style.visibility = 'hidden';
    }
    this.onChange(this.selectedTiles);
  }

  #toSvg(e) {
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(this.svg.getScreenCTM().inverse());
  }
}

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  setAttrs(node, attrs);
  if (text !== undefined) node.textContent = text;
  return node;
}

function setAttrs(node, attrs) {
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
}
