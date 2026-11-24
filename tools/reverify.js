// Re-solves every level in src/levels.json with the current rules and refreshes opt / move limits.
// Usage: node tools/reverify.js [from] [to]   -> writes report lines to stdout as JSON
const CS = require('../src/engine.js'); const fs = require('fs');
const levels = JSON.parse(fs.readFileSync(__dirname + '/../src/levels.json', 'utf8'));
const from = +(process.argv[2] || 0), to = +(process.argv[3] || levels.length);
for (let i = from; i < to; i++) {
  const l = levels[i]; const t = Date.now();
  const r = CS.solve(l, null, 600000);
  console.log(JSON.stringify({ i, tier: l.tier, ok: !!(r && !r.unsolvable), unsolvable: !!(r && r.unsolvable), relocs: r && r.relocs, old: l.relocs, ms: Date.now() - t }));
}
