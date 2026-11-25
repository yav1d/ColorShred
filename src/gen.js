// ColorShred level generator, shared by tools/generate.js (Node) and the in-game Unstoppable mode (Web Worker).
(function (root) {
'use strict';
const CS = root.CS || (typeof require !== 'undefined' ? require('./engine.js') : null);
let seed = 1234567, capOverride = 0, tierName = '';
function setSeed(s) { seed = s | 0; }
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const CAP = () => capOverride || (['superhard', 'master', 'legend'].includes(tierName) ? 9000 : 5000);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = arr => arr[Math.floor(rnd() * arr.length)];

const TIERS = {
  easy:      { w: [5, 6], h: [6, 7], colors: [3, 4], walls: [0, 1], shapes: [0,1,2,3,4,5], axisP: 0, iceP: 0, fill: [0.6, 0.75], target: [0, 1], tries: 20 },
  medium:    { count: 20, w: [6, 6], h: [7, 8], colors: [4, 5], walls: [0, 2], shapes: [0,1,2,3,4,5,6,7,8,9], axisP: 0.15, iceP: 0.0, fill: [0.78, 0.86], target: [2, 4], tries: 120 },
  hard:      { count: 20, w: [6, 7], h: [8, 9], colors: [5, 6], walls: [0, 3], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12], axisP: 0.25, iceP: 0.08, fill: [0.82, 0.9], target: [4, 5], tries: 160 },
  superhard: { count: 20, w: [7, 7], h: [9, 10], colors: [6, 8], walls: [1, 4], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], axisP: 0.3, iceP: 0.1, fill: [0.86, 0.93], target: [6, 99], tries: 200 },
  expert:    { w: [7, 7], h: [8, 9], colors: [5, 7], walls: [1, 3], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14], axisP: 0.25, iceP: 0.1, fill: [0.84, 0.9], target: [5, 7], tries: 160 },
  master:    { w: [7, 7], h: [9, 10], colors: [6, 8], walls: [1, 4], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], axisP: 0.3, iceP: 0.1, fill: [0.86, 0.93], target: [6, 99], tries: 200 },
  legend:    { w: [7, 7], h: [9, 10], colors: [7, 8], walls: [2, 4], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], axisP: 0.35, iceP: 0.14, fill: [0.88, 0.94], target: [7, 99], tries: 240 },
  blitz:     { w: [6, 7], h: [8, 9], colors: [5, 6], walls: [0, 3], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12], axisP: 0.25, iceP: 0.06, fill: [0.82, 0.9], target: [4, 6], tries: 140 },
  frozen:    { w: [7, 7], h: [8, 9], colors: [5, 6], walls: [0, 3], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14], axisP: 0.2, iceP: 0.4, fill: [0.82, 0.9], target: [4, 7], tries: 160 },
  mythic:    { w: [7, 7], h: [8, 9], colors: [5, 7], walls: [1, 3], shapes: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14], axisP: 0.6, iceP: 0.08, fill: [0.82, 0.9], target: [5, 9], tries: 180 },
};

function soloOk(lvl, b) {
  const l = { ...lvl, blocks: [b] }; const ctx = CS.makeCtx(l);
  const pos = [b.y * l.w + b.x]; const occ = CS.occupancy(ctx, pos);
  return CS.reachable(ctx, occ, pos, 0).some(a => CS.canExitFrom(ctx, 0, a, occ));
}
function randomLevel(T) {
  const w = ri(...T.w), h = ri(...T.h);
  const nColors = ri(...T.colors);
  const colors = []; const all = [0,1,2,3,4,5,6,7,8,9];
  while (colors.length < nColors) { const c = pick(all); if (!colors.includes(c)) colors.push(c); }
  // gates
  const gates = []; const used = { L: [], R: [], T: [], B: [] };
  const sideLen = s => (s === 'L' || s === 'R') ? h : w;
  for (const c of colors) {
    const nG = rnd() < 0.25 ? 2 : 1;
    for (let k = 0; k < nG; k++) {
      for (let t = 0; t < 30; t++) {
        const s = pick(['L', 'R', 'T', 'B']); const n = ri(1, 3); const L = sideLen(s);
        const p = ri(0, L - n);
        if (used[s].some(([a, b]) => p < b + 1 && a < p + n + 1)) continue; // keep 1-cell spacing
        used[s].push([p, p + n]); gates.push({ s, p, n, c }); break;
      }
    }
  }
  const walls = [];
  const nW = ri(...T.walls);
  for (let k = 0; k < nW; k++) { const x = ri(1, w - 2), y = ri(1, h - 2); const i = y * w + x; if (!walls.includes(i)) walls.push(i); }
  const lvl = { w, h, walls, gates, blocks: [] };
  // blocks
  const occ = new Int8Array(w * h); for (const i of walls) occ[i] = 1;
  const free = w * h - walls.length; const target = Math.floor(free * (T.fill[0] + rnd() * (T.fill[1] - T.fill[0])));
  let filled = 0;
  for (let t = 0; t < 3000 && filled < target; t++) {
    const sh = pick(T.shapes); const si = CS.shapeInfo[sh];
    const x = ri(0, w - si.w), y = ri(0, h - si.h);
    if (si.cells.some(([dx, dy]) => occ[(y + dy) * w + x + dx])) continue;
    let ax = 0; if (rnd() < T.axisP) ax = rnd() < 0.5 ? 1 : 2;
    // colors whose gates could accept this shape+axis
    const okC = colors.filter(c => gates.some(g => g.c === c && (
      ((g.s === 'L' || g.s === 'R') && ax !== 2 && g.n >= si.h) || ((g.s === 'T' || g.s === 'B') && ax !== 1 && g.n >= si.w))));
    if (!okC.length) continue;
    const c = pick(okC);
    const b = { c, sh, x, y };
    if (ax) b.ax = ax;
    if (!soloOk(lvl, b)) continue;
    if (rnd() < T.iceP) b.ice = ri(2, 5);
    for (const [dx, dy] of si.cells) occ[(y + dy) * w + x + dx] = 1;
    lvl.blocks.push(b); filled += si.cells.length;
  }
  // ice can't exceed blocks-1
  for (const b of lvl.blocks) if (b.ice && b.ice >= lvl.blocks.length) delete b.ice;
  return lvl;
}

// Necessary condition: every block can reach an exit on a board with only walls.
function precheck(lvl) {
  const ctx = CS.makeCtx(lvl);
  for (let i = 0; i < ctx.blocks.length; i++) {
    const pos = ctx.blocks.map(() => -1); const b = ctx.blocks[i]; pos[i] = b.y * ctx.w + b.x;
    const occ = CS.occupancy(ctx, pos);
    if (!CS.reachable(ctx, occ, pos, i).some(a => CS.canExitFrom(ctx, i, a, occ))) return false;
  }
  return true;
}
function score(lvl) {
  if (!precheck(lvl)) return -1;
  const r = CS.solve(lvl, null, CAP());
  if (!r || r.unsolvable) return -1;
  return r.relocs;
}

function mutate(lvl, T) {
  const L = JSON.parse(JSON.stringify(lvl));
  const occ = new Int8Array(L.w * L.h); for (const i of L.walls) occ[i] = 1;
  for (const b of L.blocks) for (const [dx, dy] of CS.shapeInfo[b.sh].cells) occ[(b.y + dy) * L.w + b.x + dx] = 1;
  const op = rnd();
  if (op < 0.5 && L.blocks.length) { // move a block to a random free spot
    const b = pick(L.blocks); const si = CS.shapeInfo[b.sh];
    for (const [dx, dy] of si.cells) occ[(b.y + dy) * L.w + b.x + dx] = 0;
    for (let t = 0; t < 50; t++) {
      const x = ri(0, L.w - si.w), y = ri(0, L.h - si.h);
      if (!si.cells.some(([dx, dy]) => occ[(y + dy) * L.w + x + dx])) { b.x = x; b.y = y; break; }
    }
  } else if (op < 0.75 && L.blocks.length) { // toggle axis
    const b = pick(L.blocks); b.ax = b.ax ? 0 : (rnd() < 0.5 ? 1 : 2); if (!b.ax) delete b.ax;
  } else if (op < 0.9) { // move a gate
    const g = pick(L.gates); const len = (g.s === 'L' || g.s === 'R') ? L.h : L.w;
    const np = ri(0, len - g.n);
    if (!L.gates.some(o => o !== g && o.s === g.s && np < o.p + o.n + 1 && o.p < np + g.n + 1)) g.p = np;
  } else { // shrink/grow gate
    const g = pick(L.gates); g.n = Math.max(1, Math.min(3, g.n + (rnd() < 0.5 ? -1 : 1)));
    const len = (g.s === 'L' || g.s === 'R') ? L.h : L.w; if (g.p + g.n > len) g.p = len - g.n;
    if (L.gates.some(o => o !== g && o.s === g.s && g.p < o.p + o.n + 1 && o.p < g.p + g.n + 1)) return lvl;
  }
  return L;
}

function makeLevel(T) {
  let best = null, bestS = -1;
  for (let t = 0; t < 400 && bestS < 0; t++) { const l = randomLevel(T); const s = score(l); if (s >= 0) { best = l; bestS = s; } }
  if (!best) return { lvl: null, relocs: -1 };
  for (let it = 0; it < T.tries && bestS < T.target[0]; it++) {
    const m = mutate(best, T); const s = score(m);
    if (s >= bestS && s <= T.target[1]) { best = m; bestS = s; }
  }
  return { lvl: best, relocs: bestS };
}


// Unstoppable: a board recipe for difficulty d (0 = easiest, 1 = superhard). The game decides d from the stage;
// a little randomness keeps runs different, kept inside [lo, hi] so a warm-up board never turns hard by chance.
function unstoppableTier(d0, lo, hi) {
  lo = lo == null ? 0 : lo; hi = hi == null ? 1 : hi;
  let d = Math.max(lo, Math.min(hi, d0 + (rnd() - 0.5) * 0.2));
  const r = x => Math.round(x);
  return { w: [5 + r(d * 2), 5 + r(d * 2)], h: [6 + r(d * 3), 6 + r(d * 3)], colors: [3 + r(d * 3), 3 + r(d * 4)],
    walls: [0, r(d * 3)], shapes: Array.from({ length: 6 + r(d * 11) }, (_, i) => i), axisP: 0.3 * d, iceP: 0.1 * d,
    fill: [0.6 + 0.24 * d, 0.7 + 0.22 * d], target: [Math.floor(d * 5 + rnd() * 1.5), 99], tries: 40, d };
}
function generate(T, opts) {
  opts = opts || {};
  if (opts.seed != null) setSeed(opts.seed);
  capOverride = opts.cap || 0; tierName = opts.tier || '';
  return makeLevel(T);
}
root.CSGen = { TIERS, setSeed, generate, unstoppableTier, rnd };
if (typeof module !== 'undefined') module.exports = root.CSGen;
})(typeof window !== 'undefined' ? window : globalThis);
