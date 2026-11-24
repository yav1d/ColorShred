// Usage: node tools/build.js [levels json files...]
// Merges generated level files (if given) into src/levels.json, then inlines engine + levels into the game page.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const files = process.argv.slice(2);
const levelId = l => { let h = 0x811c9dc5; for (const ch of JSON.stringify([l.w, l.h, l.walls, l.gates, l.blocks])) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
// Level ids of the first release (60 levels), in their original order, so old saves keep their stars.
const legacyPath = path.join(root, 'src/legacy.json');
if (!fs.existsSync(legacyPath)) fs.writeFileSync(legacyPath, JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'src/levels.json'), 'utf8')).map(levelId)));
const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
let levels;
if (files.length) {
  const seen = new Set(); levels = [];
  for (const f of files) for (const l of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const k = JSON.stringify([l.w, l.h, l.walls, l.gates, l.blocks]);
    if (!seen.has(k)) { seen.add(k); delete l.__ctx; levels.push(l); }
  }
  const PER_TIER = 50, count = {};
  levels = levels.filter(l => (count[l.tier] = (count[l.tier] || 0) + 1) <= PER_TIER);
  const order = { easy: 0, medium: 1, hard: 2, superhard: 3 };
  levels.sort((a, b) => order[a.tier] - order[b.tier] || a.relocs - b.relocs || a.blocks.length - b.blocks.length);
  fs.writeFileSync(path.join(root, 'src/levels.json'), JSON.stringify(levels));
} else levels = JSON.parse(fs.readFileSync(path.join(root, 'src/levels.json'), 'utf8'));
for (const l of levels) l.id = levelId(l);

const engine = fs.readFileSync(path.join(root, 'src/engine.js'), 'utf8');
const gen = fs.readFileSync(path.join(root, 'src/gen.js'), 'utf8');
let page = fs.readFileSync(path.join(root, 'src/game.html'), 'utf8')
  .replace('<script id="src-engine">/*ENGINE*/</script>', () => `<script id="src-engine">\n${engine}</script>`)
  .replace('<script id="src-gen">/*GEN*/</script>', () => `<script id="src-gen">\n${gen}</script>`)
  .replace('<script>/*LEVELS*/</script>', () => `<script>window.CS_LEVELS = ${JSON.stringify(levels)};\nwindow.CS_LEGACY = ${JSON.stringify(legacy)};</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/artifact.html'), page); // fragment: artifact host adds the document skeleton
fs.writeFileSync(path.join(root, 'index.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">\n` +
  page.replace('<div id="home"', '</head>\n<body>\n<div id="home"') + '\n</body>\n</html>\n');
const counts = levels.reduce((m, l) => (m[l.tier] = (m[l.tier] || 0) + 1, m), {});
console.log('Built', levels.length, 'levels', counts);
