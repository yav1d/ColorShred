// Usage: node tools/build.js [levels json files...]
// Merges generated level files (if given) into src/levels.json, then inlines engine + levels into the game page.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const files = process.argv.slice(2);
let levels;
if (files.length) {
  const seen = new Set(); levels = [];
  for (const f of files) for (const l of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const k = JSON.stringify([l.w, l.h, l.walls, l.gates, l.blocks]);
    if (!seen.has(k)) { seen.add(k); delete l.__ctx; levels.push(l); }
  }
  const order = { medium: 0, hard: 1, superhard: 2 };
  levels.sort((a, b) => order[a.tier] - order[b.tier] || a.relocs - b.relocs || a.blocks.length - b.blocks.length);
  fs.writeFileSync(path.join(root, 'src/levels.json'), JSON.stringify(levels));
} else levels = JSON.parse(fs.readFileSync(path.join(root, 'src/levels.json'), 'utf8'));

const engine = fs.readFileSync(path.join(root, 'src/engine.js'), 'utf8');
let page = fs.readFileSync(path.join(root, 'src/game.html'), 'utf8')
  .replace('<script>/*ENGINE*/</script>', () => `<script>\n${engine}</script>`)
  .replace('<script>/*LEVELS*/</script>', () => `<script>window.CS_LEVELS = ${JSON.stringify(levels)};</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/artifact.html'), page); // fragment: artifact host adds the document skeleton
fs.writeFileSync(path.join(root, 'index.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">\n` +
  page.replace('<div id="home"', '</head>\n<body>\n<div id="home"') + '\n</body>\n</html>\n');
const counts = levels.reduce((m, l) => (m[l.tier] = (m[l.tier] || 0) + 1, m), {});
console.log('Built', levels.length, 'levels', counts);
