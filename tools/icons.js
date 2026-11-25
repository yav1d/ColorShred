// Renders the app icons into assets/ using the game's own look (colors, joined blocks, symbols, matching gate).
// Dev-only: needs Playwright (node tools/icons.js).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const game = fs.readFileSync(path.join(__dirname, '../src/game.html'), 'utf8');
const COLORS = JSON.parse(game.match(/const COLORS = (\[.*?\]);/)[1].replace(/'/g, '"'));
const SYMBOLS = [...game.match(/const SYMBOLS = \[([\s\S]*?)\];/)[1].matchAll(/'(<[^']+>)'/g)].map(m => m[1]);
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f))})`; };

const CS = 92, OX = 48, OY = 64; // cell size and board origin (4 x 4 board)
function block(cells, c) {
  const has = (x, y) => cells.some(([a, b]) => a === x && b === y);
  const m = 5, r = 20; let h = '';
  for (const [x, y] of cells) {
    const up = has(x, y - 1), dn = has(x, y + 1), lf = has(x - 1, y), rt = has(x + 1, y);
    const shd = []; if (!dn) shd.push(`inset 0 -8px 0 ${shade(COLORS[c], .68)}`); if (!up) shd.push('inset 0 5px 0 #ffffff40');
    h += `<div style="position:absolute;left:${OX + x * CS + (lf ? 0 : m)}px;top:${OY + y * CS + (up ? 0 : m)}px;
      width:${CS - (lf ? 0 : m) - (rt ? 0 : m)}px;height:${CS - (up ? 0 : m) - (dn ? 0 : m)}px;background:${COLORS[c]};
      border-radius:${!up && !lf ? r : 0}px ${!up && !rt ? r : 0}px ${!dn && !rt ? r : 0}px ${!dn && !lf ? r : 0}px;box-shadow:${shd.join(',') || 'none'}"></div>`;
  }
  for (const [x, y] of cells) h += `<svg viewBox="0 0 24 24" style="position:absolute;left:${OX + x * CS + 23}px;top:${OY + y * CS + 21}px;width:46px;height:46px;
    fill:${shade(COLORS[c], .68)};filter:drop-shadow(0 2px 0 #ffffff59);overflow:visible">${SYMBOLS[c]}</svg>`;
  return h;
}
const ORANGE = 1, YELLOW = 2, TEAL = 5, VIOLET = 8, PINK = 9;
const html = `<html><body style="margin:0"><div id="i" style="width:512px;height:512px;position:relative;overflow:hidden;background:#16172a">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,#3a3d63,#2b2d4a)"></div>
  <div style="position:absolute;left:${OX}px;top:${OY}px;width:${4 * CS}px;height:${4 * CS}px;border-radius:14px;background:#1d1e34;
    background-image:linear-gradient(#ffffff10 1px,transparent 1px),linear-gradient(90deg,#ffffff10 1px,transparent 1px);background-size:${CS}px ${CS}px;box-shadow:inset 0 4px 10px #0008"></div>
  ${block([[0, 0], [0, 1]], VIOLET)}${block([[1, 0]], YELLOW)}${block([[2, 1], [3, 1], [3, 2]], ORANGE)}
  ${block([[0, 3], [1, 3]], TEAL)}${block([[2, 3]], PINK)}
  <div style="position:absolute;left:${OX + 4 * CS + 6}px;top:${OY + CS + 6}px;width:34px;height:${2 * CS - 12}px;border-radius:12px;overflow:hidden;
    background:${COLORS[ORANGE]};box-shadow:inset 0 0 0 2px #0003;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
    <div style="position:absolute;inset:0;opacity:.55;background:repeating-linear-gradient(0deg,transparent 0 9px,#0005 9px 12px)"></div>
    <svg viewBox="0 0 24 24" style="position:relative;width:24px;height:24px;fill:#fff;filter:drop-shadow(0 1px 0 #0006)">${SYMBOLS[ORANGE]}</svg>
    <svg viewBox="0 0 24 24" style="position:relative;width:24px;height:24px" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
  </div>
  ${[[0, -14], [1, 6], [0, 2], [1, -4], [0, 12]].map(([w, rot], k) => `<div style="position:absolute;left:${OX + 4 * CS + 50 + (k % 2) * 10}px;top:${OY + CS + 18 + k * 34}px;
    width:30px;height:8px;border-radius:3px;background:${w ? '#fff' : COLORS[ORANGE]};transform:rotate(${rot}deg)"></div>`).join('')}
</div></body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.setContent(html);
  for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await p.evaluate(s => { document.body.style.zoom = s / 512; }, size);
    await p.locator('#i').screenshot({ path: path.join(__dirname, '../assets', name) });
  }
  await b.close();
})();
