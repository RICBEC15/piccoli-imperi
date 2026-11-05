// Prova nel browser (solo computer) della v90: tutta l'Asia. Per ogni grandezza misura quanto ci mette una
// partita nuova (e quanta memoria usa), poi fa le foto dell'Asia intera oggi e nel 1700, e un primo piano
// giocando dalla Cina (Pechino). Controlla che non ci siano errori nella pagina.
// uso: node asia_check.js [gioco.html] [cartella per le immagini]
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  let tuttoOk = true;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', e => errori.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  const t0 = Date.now();
  await page.goto(file);
  await page.waitForFunction(() => typeof newGame === 'function');
  console.log('pagina aperta in', Date.now() - t0, 'ms');
  await page.waitForTimeout(800);
  // i tempi di una partita nuova (calcolo e primo disegno), per grandezza
  for (const taglia of ['piccola', 'media', 'gigante']) {
    const r = await page.evaluate((taglia) => {
      if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
      annoScelto = ANNO_MAX; epocaScelta = 'oggi';
      const t0 = performance.now();
      setMapSize(taglia); newGame(); terrainDirty = true; render();
      const ms = Math.round(performance.now() - t0);
      if (window.gc) gc();
      return { ms, mb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, caselle: ROWS * COLS };
    }, taglia);
    console.log(taglia, 'partita nuova in', r.ms, 'ms,', r.mb, 'MB di memoria JS,', r.caselle, 'caselle');
  }
  for (const anno of [null, 1700]) {
    const esito = await page.evaluate((anno) => {
      if (anno) { annoScelto = anno; epocaScelta = epocaDellAnno(anno); } else { annoScelto = ANNO_MAX; epocaScelta = 'oggi'; }
      setMapSize('piccola'); newGame();
      const g = geoSetup(), pechino = tileAtGeo(116.4, 39.9, g);
      applyZoom(0.09); scrollToTile(tileAtGeo(110, 40, g), false); terrainDirty = true; render();
      const asia = map.flat().filter(t => t.country && t.terrain !== 'water' && tileLonLat(t, g).lon > 63.55);
      return { caselle: asia.length, stati: new Set(asia.map(t => t.country)).size,
               pechino: pechino.country ? nomePaese(pechino.country) : null };
    }, anno);
    await page.waitForTimeout(800);
    const img = path.join(out, `asia_computer${anno ? '_' + anno : ''}.png`);
    await page.screenshot({ path: img });
    const ok = esito.caselle > 50000 && esito.stati >= (anno ? 20 : 30) && esito.pechino === (anno ? 'Impero Qing' : 'Cina');
    console.log(anno || 'oggi', JSON.stringify(esito), ok ? 'OK' : 'FALLITO', img);
    tuttoOk = tuttoOk && ok;
  }
  // giocare dalla Cina: un primo piano su Pechino
  const gioco = await page.evaluate(() => {
    annoScelto = ANNO_MAX; epocaScelta = 'oggi';
    setMapSize('media'); newGame();
    onTileClick(map.flat().find(t => t.country === 'CN' && passable(t) && !t.city));
    if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
    placePlayerCapital(placeSet[0]);
    applyZoom(0.9); scrollToTile(pCapital(), false); terrainDirty = true; render();
    const t0 = performance.now();
    endTurn();
    return { paese: players.p.country, capitale: pCapital() && pCapital().city.n, imperi: imperiIA().length, turno: Math.round(performance.now() - t0) };
  });
  await page.waitForFunction(() => current === 'p', null, { timeout: 120000 });
  await page.waitForTimeout(800);
  const img = path.join(out, 'asia_computer_pechino.png');
  await page.screenshot({ path: img });
  const ok = gioco.paese === 'CN' && gioco.capitale === 'Pechino';
  console.log('Cina', JSON.stringify(gioco), ok ? 'OK' : 'FALLITO', img);
  tuttoOk = tuttoOk && ok;
  // la gigante: si gioca anche li' (un turno)
  const gig = await page.evaluate(() => {
    annoScelto = ANNO_MAX; epocaScelta = 'oggi';
    setMapSize('gigante'); newGame();
    onTileClick(map.flat().find(t => t.country === 'IN' && passable(t) && !t.city));
    if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
    placePlayerCapital(placeSet[0]);
    const t0 = performance.now();
    endTurn();
    return { capitale: pCapital() && pCapital().city.n, ms: Math.round(performance.now() - t0) };
  });
  await page.waitForFunction(() => current === 'p', null, { timeout: 300000 });
  console.log('gigante, India', JSON.stringify(gig));
  if (errori.length) { console.log('errori:', errori); tuttoOk = false; }
  await browser.close();
  console.log(tuttoOk ? 'TUTTO OK' : 'QUALCOSA NON VA');
  process.exit(tuttoOk ? 0 : 1);
})();
