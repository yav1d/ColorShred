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
  const PER_TIER = { easy: 50, medium: 50, hard: 50, superhard: 50, expert: 100, maze: 100, frozen: 100, arrows: 100, blitz: 100 }, count = {};
  levels = levels.filter(l => (count[l.tier] = (count[l.tier] || 0) + 1) <= (PER_TIER[l.tier] || 0));
  const order = { easy: 0, medium: 1, hard: 2, superhard: 3, expert: 4, maze: 5, frozen: 6, arrows: 7, blitz: 8 };
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
// Standalone web app (site/): host this folder anywhere (GitHub Pages workflow included) and add it to the iPhone home screen.
const site = path.join(root, 'site');
fs.mkdirSync(site, { recursive: true });
const hash = require('crypto').createHash('sha1').update(page).digest('hex').slice(0, 10);
const head = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n` +
  `<meta name="description" content="Slide every block into its matching shredder. 200 puzzle levels and an endless mode.">\n` +
  `<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="icon" type="image/png" href="icon-192.png">\n`;
const swReg = `<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>\n`;
fs.writeFileSync(path.join(site, 'index.html'), head + page.replace('<!-- Welcome -->', '</head>\n<body>\n<!-- Welcome -->') + '\n' + swReg + '</body>\n</html>\n');
for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) fs.copyFileSync(path.join(root, 'assets', f), path.join(site, f));
fs.writeFileSync(path.join(site, 'manifest.webmanifest'), JSON.stringify({
  name: 'ColorShred', short_name: 'ColorShred', description: 'Slide every block into its matching shredder.',
  start_url: './', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#16172a', theme_color: '#16172a',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
}, null, 2));
fs.writeFileSync(path.join(site, 'sw.js'), `// Offline support. The page is fetched fresh when online (so updates arrive) and served from cache when offline.
const CACHE = 'colorshred-${hash}';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
`);
const counts = levels.reduce((m, l) => (m[l.tier] = (m[l.tier] || 0) + 1, m), {});
console.log('Built', levels.length, 'levels', counts);
