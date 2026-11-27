// Generates verified-solvable levels. Usage: node tools/generate.js <tier> <count> <seed> <out.json>
const CS = require('../src/engine.js');
const G = require('../src/gen.js');
const fs = require('fs');
const [,, TIER, COUNT, SEED, OUT] = process.argv;
G.setSeed(+SEED || 1234567);
const makeLevel = T => G.generate(T, { tier: TIER });
const TIERS = G.TIERS;
// Resume: keep levels already in the output file and continue with a fresh seed, so a restart never loses work.
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
if (out.length) G.setSeed((+SEED || 1234567) + out.length * 104729);
const name = TIER, T = { ...TIERS[TIER], count: +COUNT };
let made = out.length;
while (made < T.count) {
  const { lvl, relocs } = makeLevel(T);
  if (!lvl || relocs < T.target[0] || relocs > T.target[1]) { process.stderr.write('.'); continue; }
  const full = CS.solve(lvl, null, 400000);
  if (!full || full.unsolvable) continue;
  const opt = lvl.blocks.length + full.relocs;
  const slack = { easy: 8, medium: 5, hard: 3, superhard: 1, expert: 3, master: 2, legend: 1, blitz: 3, frozen: 3, mythic: 0, maze: 3, arrows: 3, easy2: 8, medium2: 5 }[name];
  const level = { tier: name, ...lvl, opt, moves: opt + slack, relocs: full.relocs };
  if (['superhard', 'master', 'legend'].includes(name)) level.time = 60 + lvl.blocks.length * 7;
  if (name === 'blitz') level.time = 25 + lvl.blocks.length * 3;   // a short clock
  if (name === 'mythic') level.time = 60 + lvl.blocks.length * 6;
  out.push(level); made++;
  process.stderr.write(`\n${name} #${made}: ${lvl.w}x${lvl.h} blocks=${lvl.blocks.length} relocs=${full.relocs} states=${full.states}`);
  fs.writeFileSync(OUT, JSON.stringify(out));
}
