// Spostarsi nella mappa a qualunque zoom: trascinamento col mouse, frecce, dito sul telefono.
// uso: node pantest.js [gioco.html]
const { chromium, devices } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
let falliti = 0;
const ok = (cond, txt) => { console.log((cond ? 'OK: ' : 'ERRORE: ') + txt); if (!cond) falliti++; };
async function prepara(page) {
  await page.goto(file);
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    try { closeIntro(); } catch (e) {}
    setMapSize('piccola'); newGame();
    try { chiudiSceltaPaese(); } catch (e) {}
    if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
    deselect();
    const r = document.getElementById('mapwrap').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
}
const vista = page => page.evaluate(() => { const w = document.getElementById('mapwrap'); return { x: viewX(w), y: viewY(w), zoom }; });
(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // --- computer ---
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  const c = await prepara(page);
  await page.evaluate(() => zoomFit());
  let v0 = await vista(page);
  ok(v0.x < 0 || v0.y < 0, `tutta la mappa: centrata nello schermo (vista ${Math.round(v0.x)},${Math.round(v0.y)})`);
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.mouse.move(c.x - 150, c.y - 100, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(100);
  let v1 = await vista(page);
  ok(Math.abs(v1.x - v0.x - 150) <= 1 && Math.abs(v1.y - v0.y - 100) <= 1, `trascinamento a zoom minimo sposta la vista (${Math.round(v1.x - v0.x)},${Math.round(v1.y - v0.y)})`);
  ok(await page.evaluate(() => selected === null), 'il trascinamento non seleziona nulla');

  await page.evaluate(() => applyZoom(1));
  v0 = await vista(page);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  v1 = await vista(page);
  ok(v1.x > v0.x && v1.y > v0.y, `frecce spostano la vista (${Math.round(v1.x - v0.x)},${Math.round(v1.y - v0.y)})`);

  // un click normale seleziona ancora la capitale
  const cap = await page.evaluate(() => {
    scrollToTile(pCapital(), false); render();
    const w = document.getElementById('mapwrap'), rr = w.getBoundingClientRect(), p = center(pCapital());
    return { x: rr.left + p.x * zoom - viewX(w), y: rr.top + p.y * zoom - viewY(w) };
  });
  await page.mouse.click(cap.x, cap.y); await page.waitForTimeout(100);
  ok(await page.evaluate(() => selected === pCapital()), 'click sulla capitale la seleziona');
  // caselle sul bordo: si possono portare al centro dello schermo
  const bordo = await page.evaluate(() => {
    const w = document.getElementById('mapwrap');
    scrollToTile(map[0][0], false);
    const p = center(map[0][0]);
    return { dx: Math.round(p.x * zoom - viewX(w) - w.clientWidth / 2), dy: Math.round(p.y * zoom - viewY(w) - w.clientHeight / 2) };
  });
  ok(Math.abs(bordo.dx) <= 1 && Math.abs(bordo.dy) <= 1, `la casella in alto a sinistra va al centro (scarto ${bordo.dx},${bordo.dy})`);

  // --- telefono ---
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const tel = await ctx.newPage();
  tel.on('pageerror', e => errors.push(e.message));
  const t = await prepara(tel);
  await tel.evaluate(() => zoomFit());
  v0 = await vista(tel);
  const cdp = await ctx.newCDPSession(tel);
  const tocco = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await tocco('touchStart', t.x, t.y);
  for (let i = 1; i <= 10; i++) await tocco('touchMove', t.x - 10 * i, t.y - 8 * i);
  await tocco('touchEnd');
  await tel.waitForTimeout(600);
  v1 = await vista(tel);
  ok(Math.abs(v1.x - v0.x) > 50 && Math.abs(v1.y - v0.y) > 40, `dito a zoom minimo sposta la vista (${Math.round(v1.x - v0.x)},${Math.round(v1.y - v0.y)})`);

  ok(errors.length === 0, 'nessun errore nella pagina ' + JSON.stringify(errors));
  await browser.close();
  console.log(falliti ? `${falliti} TEST FALLITI` : 'TUTTI I TEST SPOSTAMENTO SUPERATI');
  process.exit(falliti ? 1 : 0);
})();
