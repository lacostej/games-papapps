// The ordered path of tile indices swiped so far. Each tile is used at most once;
// sliding back onto the previous tile undoes the last one.
export class Selection {
  #path = [];

  get path() {
    return [...this.#path];
  }

  get length() {
    return this.#path.length;
  }

  has(index) {
    return this.#path.includes(index);
  }

  // Returns 'add', 'backtrack', or null when nothing changed.
  enter(index) {
    const p = this.#path;
    if (p.length >= 2 && p[p.length - 2] === index) {
      p.pop();
      return 'backtrack';
    }
    if (p.includes(index)) return null;
    p.push(index);
    return 'add';
  }

  clear() {
    this.#path = [];
  }
}
