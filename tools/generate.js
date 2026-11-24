// Generates verified-solvable levels. Usage: node tools/generate.js <tier> <count> <seed> <out.json>
const CS = require('../src/engine.js');
const G = require('../src/gen.js');
const fs = require('fs');
const [,, TIER, COUNT, SEED, OUT] = process.argv;
G.setSeed(+SEED || 1234567);
const makeLevel = T => G.generate(T, { tier: TIER });
const TIERS = G.TIERS;
const out = [];
const name = TIER, T = { ...TIERS[TIER], count: +COUNT };
let made = 0;
while (made < T.count) {
  const { lvl, relocs } = makeLevel(T);
  if (!lvl || relocs < T.target[0] || relocs > T.target[1]) { process.stderr.write('.'); continue; }
  const full = CS.solve(lvl, null, 400000);
  if (!full || full.unsolvable) continue;
  const opt = lvl.blocks.length + full.relocs;
  const slack = { easy: 8, medium: 5, hard: 3, superhard: 1 }[name];
  const level = { tier: name, ...lvl, opt, moves: opt + slack, relocs: full.relocs };
  if (name === 'superhard') level.time = 60 + lvl.blocks.length * 7;
  out.push(level); made++;
  process.stderr.write(`\n${name} #${made}: ${lvl.w}x${lvl.h} blocks=${lvl.blocks.length} relocs=${full.relocs} states=${full.states}`);
  fs.writeFileSync(OUT, JSON.stringify(out));
}
