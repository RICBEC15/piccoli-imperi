// Prova nel browser (computer e telefono emulato) della v63: si tocca davvero un paese sulla mappa
// e si controlla che tutte le sue città siano già tue, poi si fonda la capitale con un tocco
// e si misura un giro di turni di tutti gli imperi.
// uso: node citta_check.js [gioco.html] [cartella per le immagini]
const { chromium, devices } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch();
  let tuttoOk = true;
  for (const [nome, opz] of [['computer', { viewport: { width: 1280, height: 800 } }], ['telefono', devices['iPhone 13']]]) {
    const ctx = await browser.newContext(opz);
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', e => errori.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
    await page.goto(file);
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
      setAvversari('tutti'); setMapSize('piccola'); newGame();
      if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
    });
    const punto = (rc) => page.evaluate(([r, c]) => {
      const w = document.getElementById('mapwrap'), p = center(map[r][c]), rr = w.getBoundingClientRect();
      return { x: rr.left + p.x * zoom - viewX(w), y: rr.top + p.y * zoom - viewY(w) };
    }, rc);
    const tocca = async rc => {
      const q = await punto(rc);
      if (nome === 'telefono') await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y);
      await page.waitForTimeout(300);
    };
    // 1. si tocca la Francia sulla mappa intera
    const fr = await page.evaluate(() => {
      const info = paesiInfo().FR;
      const t = info.spots[Math.floor(info.spots.length / 2)];
      return [t.r, t.c];
    });
    await tocca(fr);
    const dopoScelta = await page.evaluate(() => {
      const mie = map.flat().filter(t => t.city && !t.city.capital && t.country === 'FR');
      return { paese: players.p.country, citta: mie.length, tutteMie: mie.every(t => t.city.owner === 'p'),
               stelle: players.p.stars, msg: document.getElementById('msg').textContent.slice(0, 110) };
    });
    await page.screenshot({ path: path.join(out, `citta_${nome}_scelta.png`) });
    // 2. si fonda la capitale con un tocco su una casella evidenziata
    const cap = await page.evaluate(() => { const t = placeSet[Math.floor(placeSet.length / 2)]; scrollToTile(t, false); render(); return [t.r, t.c]; });
    await page.waitForTimeout(200);
    await tocca(cap);
    const fondata = await page.evaluate(() => ({ placing, citta: cities('p').length, rendita: income('p') }));
    await page.evaluate(() => { applyZoom(0.5); scrollToTile(pCapital(), false); render(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `citta_${nome}_capitale.png`) });
    // 3. un giro di turni di tutti gli imperi, con le loro città già piene
    const giro = await page.evaluate(() => new Promise(res => {
      const a = performance.now(), t0 = turn;
      endTurn();
      const aspetta = () => (turn > t0 && current === 'p') ? res({ ms: Math.round(performance.now() - a), turno: turn, stelle: players.p.stars }) : setTimeout(aspetta, 100);
      aspetta();
    }));
    const ok = dopoScelta.paese === 'FR' && dopoScelta.tutteMie && dopoScelta.citta >= 5 && !fondata.placing // dalla v71 la Francia ha solo le sue città da 100.000 abitanti in su
      // la capitale sorge sul villaggio di Parigi (dalla v66), quindi le città restano tante quante
      && (fondata.citta === dopoScelta.citta || fondata.citta === dopoScelta.citta + 1) && !errori.length;
    tuttoOk = tuttoOk && ok;
    console.log(JSON.stringify({ nome, dopoScelta, fondata, giro, errori, ok }));
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'CONTROLLO CITTA NEL BROWSER SUPERATO' : 'CONTROLLO CITTA NEL BROWSER FALLITO');
  process.exit(tuttoOk ? 0 : 1);
})();
