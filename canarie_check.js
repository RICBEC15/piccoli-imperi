// Prova nel browser (computer e tablet emulato) della v87: le isole Canarie, tutte e sette, a ogni taglia
// hanno terra spagnola, Las Palmas e Santa Cruz de Tenerife sono villaggi, e si fa un'immagine delle isole.
// uso: node canarie_check.js [gioco.html] [cartella per le immagini]
const { chromium, devices } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch();
  let tuttoOk = true;
  for (const [nome, opz] of [['computer', { viewport: { width: 1280, height: 800 } }], ['tablet', devices['iPad (gen 7)']]]) {
    const ctx = await browser.newContext(opz);
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', e => errori.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
    await page.goto(file);
    await page.waitForTimeout(800);
    const taglie = await page.evaluate(() => {
      if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
      const r = {};
      for (const tg of ['piccola', 'media', 'gigante']) {
        setMapSize(tg); newGame();
        if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
        const g = geoSetup(), isole = {};
        for (const k in POLY_CANARIE) {
          const [lon, lat] = POLY_CANARIE[k].seme, t = tileAtGeo(lon, lat, g);
          isole[k] = !!t && t.terrain !== 'water' && t.country === 'ES';
        }
        const citta = map.flat().filter(t => t.city && t.canaria).map(t => t.city.n);
        r[tg] = { isole, citta };
      }
      return r;
    });
    // l'immagine: la mappa media, inquadrata sulle Canarie
    await page.evaluate(() => {
      setMapSize('media'); newGame();
      if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
      applyZoom(1.2); scrollToTile(tileAtGeo(-15.8, 28.3, geoSetup()), false); render();
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `canarie_${nome}.png`) });
    let ok = !errori.length;
    for (const [tg, d] of Object.entries(taglie)) {
      ok = ok && Object.values(d.isole).every(Boolean) && Object.keys(d.isole).length === 8
        && d.citta.includes('Las Palmas de Gran Canaria') && d.citta.includes('Santa Cruz de Tenerife');
    }
    tuttoOk = tuttoOk && ok;
    console.log(JSON.stringify({ nome, taglie, errori, ok }));
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'CONTROLLO CANARIE NEL BROWSER SUPERATO' : 'CONTROLLO CANARIE NEL BROWSER FALLITO');
  process.exit(tuttoOk ? 0 : 1);
})();
