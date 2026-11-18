// Čista logika igre 2048: bez React-a i bez browser API-ja, zato se lako testira.
export const SIZE = 4;
export const WIN_VALUE = 2048;
export const MAX_VALUE = 131072;

const line = (dir, i) => {
  const out = [];
  for (let k = 0; k < SIZE; k++) {
    const j = dir === 'right' || dir === 'down' ? SIZE - 1 - k : k;
    out.push(dir === 'left' || dir === 'right' ? { r: i, c: j } : { r: j, c: i });
  }
  return out;
};

export function emptyCells(tiles) {
  const taken = new Set(tiles.map(t => t.r * SIZE + t.c));
  const out = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) out.push({ r: Math.floor(i / SIZE), c: i % SIZE });
  return out;
}

export function canMove(tiles) {
  if (tiles.length < SIZE * SIZE) return true;
  const grid = new Map(tiles.map(t => [t.r * SIZE + t.c, t.v]));
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const v = grid.get(r * SIZE + c);
    if (c + 1 < SIZE && grid.get(r * SIZE + c + 1) === v) return true;
    if (r + 1 < SIZE && grid.get((r + 1) * SIZE + c) === v) return true;
  }
  return false;
}

export const maxTile = tiles => tiles.reduce((m, t) => Math.max(m, t.v), 0);

function spawn(state, rand) {
  const cells = emptyCells(state.tiles);
  if (!cells.length) return state;
  const cell = cells[Math.min(cells.length - 1, Math.floor(rand() * cells.length))];
  const v = rand() < 0.9 ? 2 : 4;
  const tiles = [...state.tiles, { id: state.nextId, v, r: cell.r, c: cell.c, born: true }];
  return { ...state, tiles, nextId: state.nextId + 1, over: !canMove(tiles) };
}

export function newGame(rand) {
  const base = { tiles: [], ghosts: [], score: 0, nextId: 1, won: false, keepGoing: false, over: false };
  return spawn(spawn(base, rand), rand);
}

// Jedan potez. Pločice koje se spajaju ostaju u `ghosts` (klize do cilja i nestaju),
// a nova, spojena pločica dobija novi id. Ako se ništa ne pomeri, potez se ne računa.
export function move(state, dir, rand) {
  if (!['left', 'right', 'up', 'down'].includes(dir) || state.over) return { state, moved: false, gained: 0 };
  const grid = new Map(state.tiles.map(t => [t.r * SIZE + t.c, t]));
  let nextId = state.nextId, moved = false, gained = 0, reached = false;
  const tiles = [], ghosts = [];
  for (let i = 0; i < SIZE; i++) {
    const cells = line(dir, i);
    const entries = [];
    let k = 0;
    for (const p of cells) {
      const t = grid.get(p.r * SIZE + p.c);
      if (!t) continue;
      const last = entries[entries.length - 1];
      if (last && !last.merged && last.v === t.v) {
        last.merged = true; last.v *= 2; last.parts.push(t);
      } else entries.push({ v: t.v, pos: cells[k++], parts: [t], merged: false });
    }
    for (const e of entries) {
      if (e.merged) {
        moved = true; gained += e.v; if (e.v === WIN_VALUE) reached = true;
        tiles.push({ id: nextId++, v: e.v, r: e.pos.r, c: e.pos.c, merged: true });
        for (const part of e.parts) ghosts.push({ id: part.id, v: part.v, r: e.pos.r, c: e.pos.c });
      } else {
        const t = e.parts[0];
        if (t.r !== e.pos.r || t.c !== e.pos.c) moved = true;
        tiles.push({ id: t.id, v: t.v, r: e.pos.r, c: e.pos.c });
      }
    }
  }
  if (!moved) return { state, moved: false, gained: 0 };
  const next = spawn({ ...state, tiles, ghosts, nextId, score: state.score + gained, won: state.won || reached }, rand);
  return { state: next, moved: true, gained };
}

export function keyToDir(key, code = '') {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
  return map[key] || map[code] || null;
}

export const stripTransient = state => ({ ...state, ghosts: [], tiles: state.tiles.map(({ id, v, r, c }) => ({ id, v, r, c })) });

export function serialize(state) {
  const s = stripTransient(state);
  return JSON.stringify({ tiles: s.tiles, score: s.score, nextId: s.nextId, won: s.won, keepGoing: s.keepGoing });
}

const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const isPow2 = v => Number.isInteger(v) && v >= 2 && v <= MAX_VALUE && (v & (v - 1)) === 0;

// Sačuvano stanje se proverava; sve što nije potpuno ispravno vraća null (nova igra).
export function restore(raw) {
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!d || !Array.isArray(d.tiles) || d.tiles.length < 1 || d.tiles.length > SIZE * SIZE) return null;
    const ids = new Set(), pos = new Set();
    let maxId = 0;
    const tiles = [];
    for (const t of d.tiles) {
      if (!t || !isInt(t.id, 1, 1e9) || !isPow2(t.v) || !isInt(t.r, 0, SIZE - 1) || !isInt(t.c, 0, SIZE - 1)) return null;
      const p = t.r * SIZE + t.c;
      if (ids.has(t.id) || pos.has(p)) return null;
      ids.add(t.id); pos.add(p); maxId = Math.max(maxId, t.id);
      tiles.push({ id: t.id, v: t.v, r: t.r, c: t.c });
    }
    if (!isInt(d.score, 0, 1e9) || !isInt(d.nextId, maxId + 1, 1e9)) return null;
    return { tiles, ghosts: [], score: d.score, nextId: d.nextId, won: d.won === true || maxTile(tiles) >= WIN_VALUE, keepGoing: d.keepGoing === true, over: !canMove(tiles) };
  } catch { return null; }
}
