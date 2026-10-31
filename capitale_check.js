// Prova nel browser (computer e telefono emulato) della capitale occupata (v79): il tuo cavaliere
// entra davvero a Parigi toccando la mappa, e si controllano il conto alla rovescia sulla mappa,
// il pannello della città e la caduta della Francia dopo 7 turni.
// uso: node capitale_check.js [gioco.html] [cartella per le immagini]
const { chromium, devices } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch();
  let tuttoOk = true;
  const ok = (c, m) => { console.log((c ? 'OK: ' : 'ERRORE: ') + m); if (!c) tuttoOk = false; };
  for (const [nome, opz] of [['computer', { viewport: { width: 1280, height: 800 } }], ['telefono', devices['iPhone 13']]]) {
    const ctx = await browser.newContext(opz);
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', e => errori.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
    await page.goto(file);
    await page.waitForTimeout(800);
    const prep = await page.evaluate(() => {
      if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
      setAvversari('tutti'); setMapSize('piccola'); newGame();
      if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
      cambiaPaese('IT');
      if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
      setRelazione('p', 'FR', 'guerra'); // dalla v75 si parte in pace
      const cap = capitaleDi('FR');
      cap.unit = null;
      const da = neighbors(cap).find(n => passable(n) && !n.unit && !n.city && n.terrain !== 'mountain');
      da.unit = mkUnit('knight', 'p');
      applyZoom(1.6); scrollToTile(cap, false); deselect(); render();
      return { cap: [cap.r, cap.c], da: [da.r, da.c] };
    });
    const punto = rc => page.evaluate(([r, c]) => {
      const w = document.getElementById('mapwrap'), p = center(map[r][c]), rr = w.getBoundingClientRect();
      return { x: rr.left + p.x * zoom - viewX(w), y: rr.top + p.y * zoom - viewY(w) };
    }, rc);
    const tocca = async rc => {
      const q = await punto(rc);
      if (nome === 'telefono') await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y);
      await page.waitForTimeout(150);
    };
    await tocca(prep.da);
    await tocca(prep.cap);
    const dopo = await page.evaluate(([r, c]) => {
      const t = map[r][c];
      return { owner: t.city.owner, occ: t.city.occ, vivo: players.FR.vivo, msg: document.getElementById('msg').textContent };
    }, prep.cap);
    ok(dopo.owner === 'p' && dopo.occ && dopo.occ.o === 'FR' && dopo.vivo, `${nome}: toccando Parigi la prendi, la Francia è ancora in piedi`);
    ok(/Tienila per 7 turni/.test(dopo.msg), `${nome}: messaggio "${dopo.msg.slice(0, 90)}..."`);
    // tre turni (senza far muovere l'IA: solo il conto), poi la città selezionata
    await page.evaluate(([r, c]) => { for (let i = 0; i < 3; i++) avanzaOccupazioni(); deselect(); render(); }, prep.cap);
    await tocca(prep.cap);
    const pannello = await page.evaluate(() => document.getElementById('panel').innerText);
    ok(/3\/7/.test(pannello) && /ancora 4 turni/.test(pannello), `${nome}: il pannello mostra il conto (${pannello.match(/⏳[^\n]*/) || ''})`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `capitale_${nome}_occupata.png`) });
    // gli ultimi 4 turni: la Francia è tua
    const fine = await page.evaluate(() => {
      for (let i = 0; i < 4; i++) avanzaOccupazioni();
      deselect(); applyZoom(0.5); scrollToTile(map.flat().find(t => t.city && t.city.n === 'Lione') || capitaleOccupata('FR') || pCapital(), false); render();
      return { vivo: players.FR.vivo, francesi: cities('FR').length, tue: cities('p').filter(t => t.country === 'FR').length, msg: document.getElementById('msg').textContent };
    });
    ok(!fine.vivo && fine.francesi === 0 && fine.tue > 3, `${nome}: dopo 7 turni la Francia è tua (${fine.tue} città)`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `capitale_${nome}_annessa.png`) });
    ok(!errori.length, `${nome}: nessun errore nella pagina ${errori.join(' | ')}`);
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'PROVA NEL BROWSER SUPERATA' : 'PROVA NEL BROWSER FALLITA');
  process.exit(tuttoOk ? 0 : 1);
})();
