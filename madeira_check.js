// Prova nel browser (computer e tablet emulato) della v86: Madeira, Porto Santo e Funchal sulla mappa
// media, ai giorni nostri e nel 1400 (disabitata), senza errori nella pagina.
// uso: node madeira_check.js [gioco.html] [cartella per le immagini]
const { chromium, devices } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch();
  let tuttoOk = true;
  for (const [nome, opz] of [['computer', { viewport: { width: 1280, height: 800 } }], ['tablet', devices['iPad (gen 7) landscape']]]) {
    const ctx = await browser.newContext(opz);
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', e => errori.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
    await page.goto(file);
    await page.waitForTimeout(800);
    for (const anno of [null, 1400]) {
      const esito = await page.evaluate((anno) => {
        if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
        if (anno) { annoScelto = anno; epocaScelta = epocaDellAnno(anno); } else { annoScelto = ANNO_MAX; epocaScelta = 'oggi'; }
        setMapSize('media'); newGame();
        if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
        const g = geoSetup(), isole = map.flat().filter(t => t.terrain !== 'water' && isMadeira(tileLonLat(t, g)));
        const funchal = isole.find(t => t.city && t.city.n === 'Funchal');
        applyZoom(1.6); scrollToTile(funchal, false); terrainDirty = true; render();
        return { caselle: isole.length, paesi: [...new Set(isole.map(t => t.country))], funchal: !!funchal,
                 terreni: isole.map(t => t.terrain[0]).join('') };
      }, anno);
      await page.waitForTimeout(700);
      const img = path.join(out, `madeira_${nome}${anno ? '_' + anno : ''}.png`);
      await page.screenshot({ path: img });
      const ok = esito.caselle >= 5 && esito.funchal && (anno ? esito.paesi.every(p => p === null) : esito.paesi.join() === 'PT');
      console.log(nome, anno || 'oggi', JSON.stringify(esito), ok ? 'OK' : 'FALLITO', img);
      tuttoOk = tuttoOk && ok;
    }
    if (errori.length) { console.log(nome, 'errori:', errori); tuttoOk = false; }
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'TUTTO OK' : 'QUALCOSA NON VA');
  process.exit(tuttoOk ? 0 : 1);
})();
