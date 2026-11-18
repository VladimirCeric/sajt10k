// Zvukožder: čista logika igre lavirinta (bez React-a i bez browser API-ja).
// Sopstveni lavirint, likovi i pravila.
export const W = 15, H = 17;
// '#' zid · '.' tačkica · 'o' pojačanje (🔊) · 'm' mute (🔇) · ' ' prazan prolaz · 'G' prostor samo za neprijatelje
export const MAZE = [
  '###############',
  '#o...........o#',
  '#.###.#.#.###.#',
  '#.............#',
  '#.###.#G#.###.#',
  '#.....#G#.....#',
  '#.#####G#####.#',
  '    .#GGG#.    ',
  '####.#####.####',
  '#.............#',
  '#.###.#.#.###.#',
  '#m..#.....#..m#',
  '###.#.###.#.###',
  '#.............#',
  '#.###.#.#.###.#',
  '#.............#',
  '###############',
];
export const DIRS = { left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }, up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 } };
export const OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
export const ORDER = ['up', 'left', 'down', 'right'];
export const HOME = { c: 7, r: 7 };
export const DOOR = { c: 7, r: 4 };
export const EXIT = { c: 7, r: 3 };
export const SPAWN = { c: 7, r: 15 };
export const BONUS_TILE = { c: 7, r: 9 };
export const CORNERS = [{ c: 13, r: 1 }, { c: 1, r: 1 }, { c: 13, r: 15 }, { c: 1, r: 15 }];
export const PLAYER_SPEED = 4.4;
export const TYPES = { fire: { emoji: '🔥', speed: 1 }, bolt: { emoji: '⚡', speed: 1.22 } };
export const WARN_TIME = 0.9;

export function levelEnemies(level) {
  const types = level <= 1 ? ['fire', 'fire'] : level === 2 ? ['fire', 'fire', 'bolt'] : ['fire', 'fire', 'bolt', 'bolt'];
  const base = [3, 9, 15, 21];
  return types.map((type, i) => ({ type, release: Math.max(2 + 2.5 * i, base[i] - (level - 1)) }));
}
export const scaredTime = level => Math.max(3, 7 - 0.6 * (level - 1));
export const muteTime = level => Math.max(2.5, 4.5 - 0.4 * (level - 1));
export function enemySpeed(level, type = 'fire') {
  const mult = TYPES[type].speed, s = (3.3 + 0.15 * (level - 1)) * mult;
  return Math.min(s, mult > 1 ? 4.3 : 3.8);
}

const wrapC = c => (c + W) % W;
export function passable(c, r, enemy) {
  if (r < 0 || r >= H) return false;
  const ch = MAZE[r][wrapC(c)];
  if (ch === '#') return false;
  return enemy || ch !== 'G';
}
export const canGo = (c, r, dir, enemy) => passable(c + DIRS[dir].dx, r + DIRS[dir].dy, enemy);
export const stepFrom = (c, r, dir) => ({ c: wrapC(c + DIRS[dir].dx), r: r + DIRS[dir].dy });

export function distMap(tc, tr, enemy) {
  const dm = new Int16Array(W * H).fill(9999);
  const q = [[tc, tr]]; dm[tr * W + tc] = 0;
  for (let i = 0; i < q.length; i++) {
    const [c, r] = q[i];
    for (const d of ORDER) if (canGo(c, r, d, enemy)) {
      const n = stepFrom(c, r, d);
      if (dm[n.r * W + n.c] === 9999) { dm[n.r * W + n.c] = dm[r * W + c] + 1; q.push([n.c, n.r]); }
    }
  }
  return dm;
}

export function pos(e) {
  const d = e.dir ? DIRS[e.dir] : { dx: 0, dy: 0 };
  return { x: (((e.c + d.dx * e.p) % W) + W) % W, y: e.r + d.dy * e.p };
}

export function resetPositions(g) {
  g.player = { c: SPAWN.c, r: SPAWN.r, dir: null, next: null, p: 0 };
  g.enemies = levelEnemies(g.level).map((d, i) => ({ id: 'e' + i, idx: i, type: d.type, emoji: TYPES[d.type].emoji, c: HOME.c, r: HOME.r, dir: null, p: 0, mode: 'house', release: d.release, warn: false }));
  g.scared = 0; g.mute = 0; g.combo = 0; g.wave = 0; g.bonus = null;
  g.status = 'ready';
}
export function resetLevel(g) {
  g.pellets = new Uint8Array(W * H); g.remaining = 0; g.dots = 0;
  const kinds = { '.': 1, o: 2, m: 3 };
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const v = kinds[MAZE[r][c]];
    if (v) { g.pellets[r * W + c] = v; g.remaining++; }
  }
  resetPositions(g);
}
export function createGame() {
  const g = { level: 1, score: 0, lives: 3, extra: false, time: 0, timer: 0, events: [], dots: 0 };
  resetLevel(g);
  return g;
}

function reverse(e) {
  if (!e.dir) return;
  const n = stepFrom(e.c, e.r, e.dir);
  e.c = n.c; e.r = n.r; e.p = 1 - e.p; e.dir = OPP[e.dir];
}

export function setDirection(g, dir) {
  if (!DIRS[dir] || g.status === 'over' || g.status === 'dying' || g.status === 'clear') return;
  const pl = g.player;
  pl.next = dir;
  if (g.status === 'ready') g.status = 'playing';
  if (pl.dir === OPP[dir]) { reverse(pl); pl.next = null; }
}

export function dirFromKey(key, code = '') {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
  return map[key] || map[code] || null;
}

function eat(g, c, r) {
  if (g.bonus && g.bonus.c === c && g.bonus.r === r) { g.score += 200 + 100 * (g.level - 1); g.bonus = null; g.events.push('bonus'); }
  const i = r * W + c, v = g.pellets[i];
  if (v) {
    g.pellets[i] = 0; g.remaining--; g.dots++;
    if (v === 1) {
      g.score += 10; g.events.push('dot');
      if ((g.dots === 50 || g.dots === 130) && !g.bonus) g.bonus = { c: BONUS_TILE.c, r: BONUS_TILE.r, t: 9 };
    } else if (v === 2) {
      g.score += 50; g.events.push('amp');
      g.scared = scaredTime(g.level); g.mute = 0; g.combo = 0;
      for (const e of g.enemies) if (e.mode === 'normal') { e.mode = 'scared'; reverse(e); }
    } else {
      g.score += 50; g.events.push('mute');
      g.mute = muteTime(g.level); g.scared = 0; g.combo = 0;
      for (const e of g.enemies) if (e.mode === 'scared') e.mode = 'normal';
    }
  }
  if (!g.extra && g.score >= 5000) { g.extra = true; g.lives++; g.events.push('extra'); }
}

function movePlayer(g, dt) {
  const pl = g.player; let dist = PLAYER_SPEED * dt;
  let guard = 0;
  while (dist > 1e-9 && guard++ < 50) {
    if (!pl.dir) {
      if (pl.next && canGo(pl.c, pl.r, pl.next, false)) { pl.dir = pl.next; pl.next = null; } else break;
    }
    const step = Math.min(dist, 1 - pl.p);
    pl.p += step; dist -= step;
    if (pl.p >= 1 - 1e-9) {
      const n = stepFrom(pl.c, pl.r, pl.dir);
      pl.c = n.c; pl.r = n.r; pl.p = 0;
      eat(g, pl.c, pl.r);
      if (pl.next && canGo(pl.c, pl.r, pl.next, false)) { pl.dir = pl.next; pl.next = null; }
      else if (!canGo(pl.c, pl.r, pl.dir, false)) pl.dir = null;
    }
  }
}

function playerTile(g) {
  const pl = g.player;
  return pl.dir && pl.p >= 0.5 ? stepFrom(pl.c, pl.r, pl.dir) : { c: pl.c, r: pl.r };
}

function targetFor(g, e, rand) {
  if ((g.wave % 26) > 20) return CORNERS[e.idx % 4];
  const pt = playerTile(g);
  const style = e.type === 'bolt' ? (e.idx % 2 ? 'wild' : 'ambush') : (e.idx % 2 ? 'ambush' : 'chase');
  if (style === 'chase') return pt;
  if (style === 'ambush') {
    let t = { ...pt };
    const dir = g.player.dir;
    for (let i = 0; i < 4 && dir && canGo(t.c, t.r, dir, false); i++) t = stepFrom(t.c, t.r, dir);
    return t;
  }
  if (rand() < 0.5) return pt;
  for (let k = 0; k < 20; k++) { const c = Math.floor(rand() * W), r = Math.floor(rand() * H); if (passable(c, r, false)) return { c, r }; }
  return pt;
}

function chooseDir(g, e, rand) {
  const all = ORDER.filter(d => canGo(e.c, e.r, d, true));
  if (!all.length) return null;
  const fwd = all.filter(d => d !== OPP[e.dir]);
  const list = fwd.length ? fwd : all;
  if (list.length === 1) return list[0];
  if (e.mode === 'scared') return list[Math.floor(rand() * list.length)];
  const t = e.mode === 'eaten' ? HOME : targetFor(g, e, rand);
  const dm = distMap(t.c, t.r, true);
  let best = list[0], bd = Infinity;
  for (const d of list) { const n = stepFrom(e.c, e.r, d), v = dm[n.r * W + n.c]; if (v < bd) { bd = v; best = d; } }
  return best;
}

function moveEnemy(g, e, dt, rand) {
  if (e.mode === 'house' || g.mute > 0) return;
  const speed = e.mode === 'eaten' ? 9 : e.mode === 'scared' ? 2.2 : enemySpeed(g.level, e.type);
  let dist = speed * dt, guard = 0;
  while (dist > 1e-9 && guard++ < 50) {
    if (!e.dir) { e.dir = chooseDir(g, e, rand); if (!e.dir) break; }
    const step = Math.min(dist, 1 - e.p);
    e.p += step; dist -= step;
    if (e.p >= 1 - 1e-9) {
      const n = stepFrom(e.c, e.r, e.dir);
      e.c = n.c; e.r = n.r; e.p = 0;
      if (e.mode === 'eaten' && e.c === HOME.c && e.r === HOME.r) { e.mode = 'house'; e.release = 1.5; e.warn = false; e.dir = null; return; }
      e.dir = chooseDir(g, e, rand);
    }
  }
}

function exitBlocked(g) {
  const p = playerTile(g);
  if (Math.abs(p.c - EXIT.c) + Math.abs(p.r - EXIT.r) <= 1) return true;
  return g.enemies.some(e => e.mode !== 'house' && ((e.c === DOOR.c && e.r === DOOR.r) || (e.c === EXIT.c && e.r === EXIT.r)));
}

function tick(g, dt, rand) {
  g.time += dt;
  if (g.status === 'dying') {
    g.timer -= dt;
    if (g.timer <= 0) {
      if (g.lives <= 0) { g.status = 'over'; g.events.push('over'); } else resetPositions(g);
    }
    return;
  }
  if (g.status === 'clear') {
    g.timer -= dt;
    if (g.timer <= 0) { g.level++; resetLevel(g); }
    return;
  }
  if (g.status !== 'playing') return;
  g.wave += dt;
  if (g.mute > 0) g.mute = Math.max(0, g.mute - dt);
  if (g.bonus) { g.bonus.t -= dt; if (g.bonus.t <= 0) g.bonus = null; }
  if (g.scared > 0) {
    g.scared -= dt;
    if (g.scared <= 0) { g.scared = 0; g.combo = 0; for (const e of g.enemies) if (e.mode === 'scared') e.mode = 'normal'; }
  }
  for (const e of g.enemies) if (e.mode === 'house') {
    e.release = Math.max(0, e.release - dt);
    if (e.release <= WARN_TIME && !e.warn) { e.warn = true; g.events.push('warn'); }
    if (e.release <= 0 && !exitBlocked(g)) {
      e.mode = g.scared > 0 ? 'scared' : 'normal'; e.warn = false;
      e.c = DOOR.c; e.r = DOOR.r; e.dir = null; e.p = 0;
    }
  }
  movePlayer(g, dt);
  for (const e of g.enemies) moveEnemy(g, e, dt, rand);
  if (g.mute <= 0) {
    const p = pos(g.player);
    for (const e of g.enemies) {
      if (e.mode === 'house' || e.mode === 'eaten') continue;
      const q = pos(e);
      if (Math.hypot(p.x - q.x, p.y - q.y) < 0.6) {
        if (e.mode === 'scared') { e.mode = 'eaten'; g.score += 200 * 2 ** Math.min(g.combo, 3); g.combo++; g.events.push('eat'); }
        else { g.lives--; g.status = 'dying'; g.timer = 1.4; g.events.push('die'); break; }
      }
    }
  }
  if (g.status === 'playing' && g.remaining === 0) { g.status = 'clear'; g.timer = 1.6; g.events.push('clear'); }
}

export function update(g, dt, rand = Math.random) {
  dt = Math.min(Math.max(dt, 0), 0.1);
  while (dt > 1e-9) { const h = Math.min(dt, 1 / 60); tick(g, h, rand); dt -= h; }
}
