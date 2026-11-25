// Renders the app icons into assets/. Dev-only: needs Playwright (node tools/icons.js).
const { chromium } = require('playwright');
const path = require('path');
const html = `<html><body style="margin:0"><div id="i" style="width:512px;height:512px;position:relative;overflow:hidden;
  background:radial-gradient(120% 100% at 30% 10%,#34366a 0%,#1b1c36 65%)">
  <div style="position:absolute;left:28px;top:28px;right:28px;bottom:28px;border-radius:70px;background:linear-gradient(180deg,#3a3d63,#2b2d4a);box-shadow:inset 0 4px 0 #ffffff18"></div>
  <div style="position:absolute;left:62px;top:62px;width:330px;height:388px;border-radius:28px;background:#1d1e34;box-shadow:inset 0 6px 14px #0009"></div>
  <!-- gate -->
  <div style="position:absolute;left:404px;top:150px;width:46px;height:212px;border-radius:16px;background:repeating-linear-gradient(0deg,#ffc93c 0 14px,#d9a21a 14px 19px)"></div>
  <!-- L block heading into the gate -->
  ${cell(230,150,'#FF8A3D')}${cell(310,150,'#FF8A3D')}${cell(310,230,'#FF8A3D')}
  ${cell(82,82,'#9A5BE8')}${cell(82,162,'#9A5BE8')}
  ${cell(82,290,'#1FB5B0')}${cell(162,290,'#1FB5B0')}${cell(162,370,'#E9509F')}
  <!-- shreds -->
  ${[0,1,2,3,4].map(k => `<div style="position:absolute;left:${458 + (k%2)*12}px;top:${168 + k*38}px;width:40px;height:9px;border-radius:3px;background:${k%2?'#fff':'#FF8A3D'};transform:rotate(${(k-2)*9}deg)"></div>`).join('')}
</div></body></html>`;
function cell(x, y, c) {
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:76px;height:76px;border-radius:18px;background:${c};
    box-shadow:inset 0 -9px 0 #0003, inset 0 5px 0 #ffffff40"><div style="position:absolute;left:23px;top:20px;width:30px;height:30px;border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#ffffffc0,#ffffff22 45%,transparent 70%)"></div></div>`;
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.setContent(html);
  for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await p.setViewportSize({ width: 512, height: 512 });
    await p.evaluate(s => { document.body.style.zoom = s / 512; }, size);
    await p.locator('#i').screenshot({ path: path.join(__dirname, '../assets', name) });
  }
  await b.close();
})();
