// ColorShred engine: rules + solver. Shared by the browser game and the Node level generator.
(function (root) {
  'use strict';

  // Shapes as cell offsets [dx, dy]
  const SHAPES = [
    [[0,0]],                          // 0  1x1
    [[0,0],[1,0]],                    // 1  2x1
    [[0,0],[0,1]],                    // 2  1x2
    [[0,0],[1,0],[2,0]],              // 3  3x1
    [[0,0],[0,1],[0,2]],              // 4  1x3
    [[0,0],[1,0],[0,1],[1,1]],        // 5  2x2
    [[0,0],[0,1],[1,1]],              // 6  L small
    [[1,0],[0,1],[1,1]],              // 7
    [[0,0],[1,0],[0,1]],              // 8
    [[0,0],[1,0],[1,1]],              // 9
    [[0,0],[0,1],[0,2],[1,2]],        // 10 L
    [[0,0],[1,0],[2,0],[1,1]],        // 11 T
    [[0,0],[1,0],[2,0],[0,1]],        // 12 L flat
    [[1,0],[1,1],[1,2],[0,2]],        // 13 J
    [[0,0],[1,0],[1,1],[2,1]],        // 14 Z
    [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]], // 15 3x2
    [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]], // 16 2x3
  ];
  const shapeInfo = SHAPES.map(cells => {
    let w = 0, h = 0;
    for (const [x, y] of cells) { w = Math.max(w, x + 1); h = Math.max(h, y + 1); }
    return { cells, w, h };
  });

  // axis: 0 = free, 1 = horizontal only, 2 = vertical only
  // Level: {w,h,walls:[idx], gates:[{s:'L'|'R'|'T'|'B', p, n, c}], blocks:[{c,sh,x,y,ax,ice}]}

  function makeCtx(level) {
    const { w, h } = level;
    const wall = new Uint8Array(w * h);
    for (const i of level.walls || []) wall[i] = 1;
    const blocks = level.blocks.map(b => ({ ...b, ax: b.ax || 0, ice: b.ice || 0 }));
    // Precompute for each block: list of valid anchors (fits inside & not on walls), and exit flags
    const per = blocks.map(b => {
      const si = shapeInfo[b.sh];
      const anchors = new Int32Array(w * h).fill(-1);
      const list = [];
      for (let y = 0; y + si.h <= h; y++) for (let x = 0; x + si.w <= w; x++) {
        let ok = true;
        for (const [dx, dy] of si.cells) if (wall[(y + dy) * w + x + dx]) { ok = false; break; }
        if (ok) { anchors[y * w + x] = list.length; list.push(y * w + x); }
      }
      const exitSide = list.map(a => exitAt(level, b, si, a % w, (a / w) | 0));
      return { si, anchors, list, exitSide };
    });
    return { level, w, h, wall, blocks, per };
  }

  // Returns gate side letter if block anchored at (x,y) can exit through a matching gate, else ''
  function exitAt(level, b, si, x, y) {
    for (const g of level.gates) {
      if (g.c !== b.c) continue;
      if (g.s === 'L' && x === 0 && b.ax !== 2 && y >= g.p && y + si.h <= g.p + g.n) return 'L';
      if (g.s === 'R' && x + si.w === level.w && b.ax !== 2 && y >= g.p && y + si.h <= g.p + g.n) return 'R';
      if (g.s === 'T' && y === 0 && b.ax !== 1 && x >= g.p && x + si.w <= g.p + g.n) return 'T';
      if (g.s === 'B' && y + si.h === level.h && b.ax !== 1 && x >= g.p && x + si.w <= g.p + g.n) return 'B';
    }
    return '';
  }

  // occupancy grid from positions (pos[i] = anchor index or -1 removed)
  function occupancy(ctx, pos) {
    const occ = new Int16Array(ctx.w * ctx.h).fill(-1);
    for (let i = 0; i < pos.length; i++) {
      if (pos[i] < 0) continue;
      const x = pos[i] % ctx.w, y = (pos[i] / ctx.w) | 0;
      for (const [dx, dy] of ctx.per[i].si.cells) occ[(y + dy) * ctx.w + x + dx] = i;
    }
    return occ;
  }

  function fits(ctx, occ, i, x, y) {
    const p = ctx.per[i];
    if (x < 0 || y < 0 || x + p.si.w > ctx.w || y + p.si.h > ctx.h) return false;
    if (p.anchors[y * ctx.w + x] < 0) return false;
    for (const [dx, dy] of p.si.cells) {
      const o = occ[(y + dy) * ctx.w + x + dx];
      if (o !== -1 && o !== i) return false;
    }
    return true;
  }

  function removedCount(pos) { let n = 0; for (const p of pos) if (p < 0) n++; return n; }
  function frozen(ctx, pos, i) { return ctx.blocks[i].ice > removedCount(pos); }

  // BFS reachable anchors for block i
  function reachable(ctx, occ, pos, i) {
    const w = ctx.w, start = pos[i], ax = ctx.blocks[i].ax;
    const seen = new Set([start]); const q = [start];
    const dirs = [];
    if (ax !== 2) dirs.push([1, 0], [-1, 0]);
    if (ax !== 1) dirs.push([0, 1], [0, -1]);
    for (let qi = 0; qi < q.length; qi++) {
      const a = q[qi], x = a % w, y = (a / w) | 0;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (!fits(ctx, occ, i, nx, ny)) continue;
        const na = ny * w + nx;
        if (!seen.has(na)) { seen.add(na); q.push(na); }
      }
    }
    return q;
  }

  function canExitFrom(ctx, i, a) {
    const p = ctx.per[i]; const k = p.anchors[a];
    return k >= 0 && p.exitSide[k] !== '';
  }

  // Remove every block that can currently reach an exit; repeat until stable.
  function closure(ctx, pos) {
    pos = pos.slice(); let exits = 0, changed = true;
    const occ = occupancy(ctx, pos);
    while (changed) {
      changed = false;
      for (let i = 0; i < pos.length; i++) {
        if (pos[i] < 0 || frozen(ctx, pos, i)) continue;
        const r = reachable(ctx, occ, pos, i);
        if (r.some(a => canExitFrom(ctx, i, a))) {
          const x = pos[i] % ctx.w, y = (pos[i] / ctx.w) | 0;
          for (const [dx, dy] of ctx.per[i].si.cells) occ[(y + dy) * ctx.w + x + dx] = -1;
          pos[i] = -1; exits++; changed = true;
        }
      }
    }
    return { pos, exits };
  }

  // Min relocations BFS. Returns {relocs, plan:[{i, to}], states} or null if unsolvable/capped.
  function solve(level, startPos, cap) {
    cap = cap || 200000;
    const ctx = level.__ctx || makeCtx(level);
    const p0 = startPos ? startPos.slice() : ctx.blocks.map(b => b.y * ctx.w + b.x);
    const c0 = closure(ctx, p0).pos;
    const key = p => p.join(',');
    if (c0.every(v => v < 0)) return { relocs: 0, plan: [], states: 1 };
    const parent = new Map([[key(c0), null]]);
    const W = ctx.w, N = c0.length;
    let frontier = [c0], depth = 0, states = 1;
    while (frontier.length) {
      depth++;
      const next = [];
      for (const s of frontier) {
        const occ = occupancy(ctx, s);
        const R = [], F = [];
        for (let j = 0; j < N; j++) {
          if (s[j] < 0 || frozen(ctx, s, j)) { R.push(null); F.push(null); continue; }
          const r = reachable(ctx, occ, s, j); R.push(r);
          const f = new Uint8Array(W * ctx.h); const ax = ctx.blocks[j].ax;
          for (const a of r) {
            const x = a % W, y = (a / W) | 0;
            for (const [dx, dy] of ctx.per[j].si.cells) {
              const cx = x + dx, cy = y + dy;
              if (ax !== 2) { if (cx > 0) f[cy * W + cx - 1] = 1; if (cx < W - 1) f[cy * W + cx + 1] = 1; }
              if (ax !== 1) { if (cy > 0) f[(cy - 1) * W + cx] = 1; if (cy < ctx.h - 1) f[(cy + 1) * W + cx] = 1; }
            }
          }
          F.push(f);
        }
        for (let i = 0; i < N; i++) {
          if (!R[i]) continue;
          const ox = s[i] % W, oy = (s[i] / W) | 0, cells = ctx.per[i].si.cells;
          for (const a of R[i]) {
            if (a === s[i]) continue;
            const t = s.slice(); t[i] = a;
            const nx = a % W, ny = (a / W) | 0;
            const occ2 = occ.slice();
            const freed = [];
            for (const [dx, dy] of cells) occ2[(oy + dy) * W + ox + dx] = -1;
            for (const [dx, dy] of cells) occ2[(ny + dy) * W + nx + dx] = i;
            for (const [dx, dy] of cells) { const c = (oy + dy) * W + ox + dx; if (occ2[c] === -1) freed.push(c); }
            let opens = false;
            for (let j = 0; j < N && !opens; j++) {
              if (j === i || !F[j]) continue;
              if (!freed.some(c => F[j][c])) continue;
              const r = reachable(ctx, occ2, t, j);
              if (r.some(b => canExitFrom(ctx, j, b))) opens = true;
            }
            const c = opens ? closure(ctx, t).pos : t;
            const k = key(c);
            if (parent.has(k)) continue;
            parent.set(k, { from: key(s), i, to: a });
            states++;
            if (c.every(v => v < 0)) {
              const plan = []; let cur = k;
              while (parent.get(cur)) { const e = parent.get(cur); plan.unshift({ i: e.i, to: e.to }); cur = e.from; }
              return { relocs: depth, plan, states };
            }
            if (states > cap) return null;
            next.push(c);
          }
        }
      }
      frontier = next;
    }
    return { unsolvable: true };
  }

  root.CS = { SHAPES, shapeInfo, makeCtx, occupancy, fits, reachable, closure, solve, frozen, canExitFrom, exitAt, removedCount };
  if (typeof module !== 'undefined') module.exports = root.CS;
})(typeof window !== 'undefined' ? window : globalThis);
