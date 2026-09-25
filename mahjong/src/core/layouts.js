// Positions are in half-tile units: a tile at (x, y) covers x..x+2 and y..y+2 on its layer z.
// Layouts are at most 7 tiles wide so tiles stay readable on a portrait phone.
function rect(x, y, cols, rows, z) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: x + 2 * c, y: y + 2 * r, z });
  return out;
}

export const LAYOUTS = {
  // 72 tiles, 2 layers.
  easy: [...rect(0, 0, 6, 8, 0), ...rect(2, 2, 4, 6, 1)],
  // 94 tiles, 4 layers.
  medium: [...rect(0, 0, 6, 9, 0), ...rect(2, 2, 4, 7, 1), ...rect(4, 4, 2, 5, 2), ...rect(5, 7, 1, 2, 3)],
  // 132 tiles, 4 layers.
  hard: [...rect(0, 0, 7, 10, 0), ...rect(2, 2, 5, 8, 1), ...rect(4, 4, 3, 6, 2), ...rect(6, 6, 1, 4, 3)],
};
