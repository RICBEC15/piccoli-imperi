// Prova nel browser (solo computer) della v89: tutta l'Africa. Per ogni grandezza misura quanto ci mette una
// partita nuova, poi gioca dal Kenya (Nairobi) e fa le foto dell'Africa intera e di un primo piano, oggi e
// nel 1920 (le colonie). Controlla che non ci siano errori nella pagina.
// uso: node africa_check.js [gioco.html] [cartella per le immagini]
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch();
  let tuttoOk = true;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', e => errori.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  await page.goto(file);
  await page.waitForTimeout(800);
  // i tempi di una partita nuova (calcolo e primo disegno), per grandezza
  for (const taglia of ['piccola', 'media', 'gigante']) {
    const ms = await page.evaluate((taglia) => {
      if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
      annoScelto = ANNO_MAX; epocaScelta = 'oggi';
      const t0 = performance.now();
      setMapSize(taglia); newGame(); terrainDirty = true; render();
      return Math.round(performance.now() - t0);
    }, taglia);
    console.log(taglia, 'partita nuova in', ms, 'ms');
  }
  for (const anno of [null, 1920]) {
    const esito = await page.evaluate((anno) => {
      if (anno) { annoScelto = anno; epocaScelta = epocaDellAnno(anno); } else { annoScelto = ANNO_MAX; epocaScelta = 'oggi'; }
      setMapSize('piccola'); newGame();
      const g = geoSetup(), nairobi = tileAtGeo(36.82, -1.29, g);
      applyZoom(0.12); scrollToTile(tileAtGeo(20, -8, g), false); terrainDirty = true; render();
      const africa = map.flat().filter(t => t.country && t.terrain !== 'water' && tileLonLat(t, g).lat < 11.5);
      return { caselle: africa.length, stati: new Set(africa.map(t => t.country)).size,
               kenya: nairobi.country ? nomePaese(nairobi.country) : null };
    }, anno);
    await page.waitForTimeout(800);
    const img = path.join(out, `africa_computer${anno ? '_' + anno : ''}.png`);
    await page.screenshot({ path: img });
    const ok = esito.caselle > 20000 && esito.stati >= (anno ? 15 : 40) && esito.kenya === (anno ? 'Colonia del Kenya' : 'Kenya');
    console.log(anno || 'oggi', JSON.stringify(esito), ok ? 'OK' : 'FALLITO', img);
    tuttoOk = tuttoOk && ok;
  }
  // giocare dal Kenya: un primo piano su Nairobi e il lago Vittoria
  const gioco = await page.evaluate(() => {
    annoScelto = ANNO_MAX; epocaScelta = 'oggi';
    setMapSize('media'); newGame();
    const g = geoSetup();
    onTileClick(map.flat().find(t => t.country === 'KE' && passable(t) && !t.city));
    if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
    placePlayerCapital(placeSet[0]);
    applyZoom(0.9); scrollToTile(pCapital(), false); terrainDirty = true; render();
    return { paese: players.p.country, capitale: pCapital() && pCapital().city.n };
  });
  await page.waitForTimeout(800);
  const img = path.join(out, 'africa_computer_nairobi.png');
  await page.screenshot({ path: img });
  const ok = gioco.paese === 'KE' && gioco.capitale === 'Nairobi';
  console.log('Kenya', JSON.stringify(gioco), ok ? 'OK' : 'FALLITO', img);
  tuttoOk = tuttoOk && ok;
  if (errori.length) { console.log('errori:', errori); tuttoOk = false; }
  await browser.close();
  console.log(tuttoOk ? 'TUTTO OK' : 'QUALCOSA NON VA');
  process.exit(tuttoOk ? 0 : 1);
})();
