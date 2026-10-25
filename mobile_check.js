// Prova su telefono emulato: tempi di disegno, memoria delle tessere, click sulla casella giusta.
// uso: node mobile_check.js [gioco.html]
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(process.argv[2] || "piccoli_imperi.html"));
  await page.waitForTimeout(800);
  for (const taglia of ['piccola', 'media', 'gigante']) {
    const r = await page.evaluate(async (taglia) => {
      if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
      const t0 = performance.now();
      setMapSize(taglia); newGame();
      if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese(); // il menu dei paesi coprirebbe la mappa
      if (placing && !players.p.country) cambiaPaese('IT'); // il paese si sceglie toccandolo sulla mappa
      if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
      const tGen = performance.now() - t0;
      const w = document.getElementById('mapwrap');
      const times = {};
      const frame = () => { const a = performance.now(); render(); return Math.round(performance.now() - a); };
      applyZoom(1); scrollToTile(pCapital(), false); times.primo = frame(); times.ripetuto = frame();
      w.scrollLeft += 300; times.scroll = frame();
      zoomFit(); times.fitPrimo = frame(); times.fitRipetuto = frame();
      applyZoom(0.4); scrollToTile(pCapital(), false); times.zoom04 = frame();
      // click: tocca il centro della capitale e verifica che venga selezionata
      applyZoom(1); scrollToTile(pCapital(), false); render();
      deselect();
      const cap = pCapital(), p = center(cap), rr = w.getBoundingClientRect();
      const cx = rr.left + p.x * zoom - viewX(w), cy = rr.top + p.y * zoom - viewY(w);
      return { taglia, COLS, ROWS, mondo: WORLD_W + 'x' + WORLD_H, canvas: cv.width + 'x' + cv.height,
               tessere: tileCache.size, tGen: Math.round(tGen), times, cx, cy };
    }, taglia);
    await page.mouse.click(r.cx, r.cy);
    await page.waitForTimeout(100);
    r.clickOk = await page.evaluate(() => selected === pCapital());
    delete r.cx; delete r.cy;
    console.log(JSON.stringify(r));
  }
  console.log('errori:', errors);
  await browser.close();
})();
