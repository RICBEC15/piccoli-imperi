// Partite simulate nel browser vero (Chromium, Playwright), con i casi limite: avvio, Invio
// premuto in fretta, clic e tasti nel turno nemico, caricare o ricominciare mentre gli imperi
// muovono, sconfitta, vittoria, restart, numeri altissimi, finestra ridimensionata, tablet,
// file di salvataggio rovinati, 40 turni sulla mappa media. Circa 10 minuti.
// uso: node stabilita_check.js [gioco.html]   (SHOTS=cartella per salvare le schermate)
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const risultati = [];
const nota = (nome, ok, dett) => { risultati.push({ nome, ok, dett }); console.log((ok ? 'OK    ' : 'ANOMALIA ') + nome + (dett ? ' :: ' + dett : '')); };
async function nuova(browser, opz = {}) {
  const ctx = await browser.newContext({ viewport: opz.vp || { width: 1280, height: 800 }, deviceScaleFactor: opz.dpr || 1, hasTouch: !!opz.touch });
  const page = await ctx.newPage();
  page.errori = [];
  page.on('pageerror', e => page.errori.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errori.push('console: ' + m.text()); });
  await page.goto(file); await page.waitForTimeout(700);
  await page.evaluate(({ size, modo }) => {
    try { closeIntro(); } catch (e) {}
    if (modo && typeof setAvversari === 'function') setAvversari(modo);
    setMapSize(size || 'piccola'); newGame();
    try { chiudiSceltaPaese(); } catch (e) {}
    if (placing && !players.p.country) cambiaPaese('IT');
    if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
    deselect();
  }, { size: opz.size, modo: opz.modo });
  return page;
}
const attendiTurnoMio = (page, ms = 60000) => page.waitForFunction(() => current === 'p' && !gameOver, null, { timeout: ms, polling: 100 });

(async () => {
  const browser = await chromium.launch();

  // 1. avvio e qualche turno normale
  {
    const page = await nuova(browser);
    const s0 = await page.evaluate(() => ({ turn, stars: players.p.stars, imperi: imperiIA().length, modo: modoPartita, epoca: epocaPartita }));
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await attendiTurnoMio(page); }
    const s1 = await page.evaluate(() => ({ turn, current, gameOver }));
    nota('avvio + 5 turni con Invio', s1.turn === s0.turn + 5 && page.errori.length === 0, JSON.stringify({ s0, s1, errori: page.errori.slice(0, 3) }));
    // 2. Invio premuto due volte di fila: un solo turno
    const t0 = await page.evaluate(() => turn);
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    await attendiTurnoMio(page);
    await page.waitForTimeout(1500);
    const t1 = await page.evaluate(() => turn);
    nota('Invio premuto 3 volte di fila fa passare un solo turno', t1 === t0 + 1, `turno ${t0} -> ${t1}`);
    // 3. clic e tasti durante il turno IA
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const durante = await page.evaluate(() => current);
    for (const k of ['f', 'p', 'u', 'z', 's', 'Escape', '+', '-', '9', '0', 'ArrowLeft', 'ArrowUp']) await page.keyboard.press(k);
    await page.mouse.click(640, 400); await page.mouse.click(300, 300);
    await attendiTurnoMio(page);
    nota('tasti e clic durante il turno IA non rompono nulla', durante !== 'p' && page.errori.length === 0, 'durante=' + durante + ' errori=' + page.errori.slice(0, 3));
    await page.close();
  }

  // 4. Carica una partita mentre gli imperi stanno muovendo
  {
    const page = await nuova(browser);
    const r = await page.evaluate(async () => {
      const salvato = serialize(); // turno 1, tocca a te
      const turnoSalvato = turn;
      endTurn();
      await new Promise(r => setTimeout(r, 450)); // gli imperi sono a metà giro
      const durante = current;
      const ok = applySave(JSON.parse(JSON.stringify(salvato)));
      const dopoLoad = { turn, current };
      const unitaIA0 = map.flat().filter(t => t.unit && t.unit.owner !== 'p').map(t => key(t) + t.unit.type).join(';');
      await new Promise(r => setTimeout(r, 6000));
      const unitaIA1 = map.flat().filter(t => t.unit && t.unit.owner !== 'p').map(t => key(t) + t.unit.type).join(';');
      return { ok, durante, turnoSalvato, dopoLoad, dopo: { turn, current }, iaMossaDopoIlCaricamento: unitaIA0 !== unitaIA1 };
    });
    nota('caricare durante il turno IA: la partita caricata resta ferma al tuo turno',
      r.dopo.turn === r.turnoSalvato && r.dopo.current === 'p' && !r.iaMossaDopoIlCaricamento, JSON.stringify(r));
    await page.close();
  }

  // 5. Tutorial (o nuova partita) mentre gli imperi stanno muovendo
  {
    const page = await nuova(browser);
    const r = await page.evaluate(async () => {
      endTurn();
      await new Promise(r => setTimeout(r, 450));
      newGame(true); // è quello che fa il pulsante del tutorial
      const dopo0 = { turn, current, placing, tutStep };
      await new Promise(r => setTimeout(r, 6000));
      return { dopo0, dopo: { turn, current, placing, tutStep, stelle: players.p.stars } };
    });
    nota('tutorial avviato durante il turno IA: parte pulito al turno 1', r.dopo.turn === 1 && r.dopo.current === 'p' && page.errori.length === 0, JSON.stringify(r) + ' errori=' + page.errori.slice(0, 3));
    await page.close();
  }

  // 6. Nuova partita (schermata iniziale) durante il turno IA: si sceglie il paese
  {
    const page = await nuova(browser);
    const r = await page.evaluate(async () => {
      endTurn();
      await new Promise(r => setTimeout(r, 450));
      newGame(false);
      await new Promise(r => setTimeout(r, 6000));
      return { turn, current, placing, unitaIA: map.flat().filter(t => t.unit && t.unit.owner !== 'p').length };
    });
    nota('nuova partita durante il turno IA: resta nella scelta del paese, turno 1', r.turn === 1 && r.current === 'p' && r.placing, JSON.stringify(r) + ' errori=' + page.errori.slice(0, 3));
    await page.close();
  }

  // 7. Sconfitta, poi "Nuova partita" dal riquadro finale
  {
    const page = await nuova(browser);
    const r = await page.evaluate(() => {
      const cap = pCapital(); const o = imperiIA()[0];
      cap.city.owner = o; cap.city.capital = false; conquistatoreP = o;
      checkEnd();
      return { gameOver, titolo: document.getElementById('ovTitle').textContent, testo: document.getElementById('ovText').textContent, overlay: getComputedStyle(document.getElementById('overlay')).display };
    });
    nota('sconfitta: compare il riquadro', r.gameOver && /SCONFITTA/.test(r.titolo) && r.overlay !== 'none', JSON.stringify(r));
    await page.keyboard.press('Enter'); await page.keyboard.press('u'); await page.keyboard.press('s');
    await page.click('#overlay button');
    await page.waitForTimeout(300);
    const r2 = await page.evaluate(() => ({ gameOver, turn, placing, overlay: getComputedStyle(document.getElementById('overlay')).display }));
    nota('restart dal riquadro finale', !r2.gameOver && r2.turn === 1 && r2.placing && r2.overlay === 'none', JSON.stringify(r2) + ' errori=' + page.errori.slice(0, 3));
    await page.close();
  }

  // 8. Vittoria (tutti gli imperi caduti) e vittoria diplomatica
  {
    const page = await nuova(browser);
    const r = await page.evaluate(() => {
      for (const o of imperiIA()) { players[o].vivo = false; caduti.push(o); }
      checkEnd();
      return { gameOver, titolo: document.getElementById('ovTitle').textContent, testo: document.getElementById('ovText').textContent };
    });
    nota('vittoria per conquista', r.gameOver && /VITTORIA/.test(r.titolo), JSON.stringify(r));
    await page.close();
    const p2 = await nuova(browser);
    const r2 = await p2.evaluate(() => {
      for (const o of imperiIA()) diplo.rel[chiaveRel('p', o)] = { stato: 'alleanza', dal: turn };
      checkEnd();
      return { gameOver, titolo: document.getElementById('ovTitle').textContent, testo: document.getElementById('ovText').textContent };
    });
    nota('vittoria diplomatica', r2.gameOver && /VITTORIA/.test(r2.titolo), JSON.stringify(r2));
    await p2.close();
  }

  // 9. numeri molto alti (stelle, turni)
  {
    const page = await nuova(browser);
    const r = await page.evaluate(() => {
      players.p.stars = 123456789; turn = 99999; ui(); render();
      const hud = document.getElementById('hud').getBoundingClientRect();
      const row = document.querySelector('#hud .hudrow');
      return { stelle: document.getElementById('stars').textContent, turno: document.getElementById('turnN').textContent, hudH: Math.round(hud.height), overflow: row.scrollWidth > row.clientWidth };
    });
    nota('stelle e turni molto alti si leggono nell\'HUD', r.stelle.includes('123') && !r.overflow, JSON.stringify(r));
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/numeri_alti.png' });
    await page.close();
  }

  // 10. finestra ridimensionata più volte
  {
    const page = await nuova(browser);
    for (const [w, h] of [[800, 600], [1600, 900], [1024, 768], [768, 1024], [1280, 800]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150);
    }
    const r = await page.evaluate(() => {
      const w = document.getElementById('mapwrap');
      return { cv: [cv.width, cv.height], wrap: [w.clientWidth, w.clientHeight], capInVista: true };
    });
    nota('ridimensionamento della finestra', page.errori.length === 0 && r.cv[0] === r.wrap[0], JSON.stringify(r));
    await page.close();
  }

  // 11. tablet: tocco sulla mappa, verticale e orizzontale
  {
    const page = await nuova(browser, { vp: { width: 1024, height: 768 }, dpr: 2, touch: true });
    const r = await page.evaluate(() => { scrollToTile(pCapital(), false); render();
      const w = document.getElementById('mapwrap'), rr = w.getBoundingClientRect(), p = center(pCapital());
      return { x: rr.left + p.x * zoom - viewX(w), y: rr.top + p.y * zoom - viewY(w) }; });
    await page.touchscreen.tap(r.x, r.y); await page.waitForTimeout(200);
    const sel = await page.evaluate(() => !!selected && selected === pCapital());
    const hud = await page.evaluate(() => { const h = document.getElementById('hud').getBoundingClientRect(); return { h: Math.round(h.height), vh: innerHeight }; });
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/tablet_orizzontale.png' });
    await page.setViewportSize({ width: 768, height: 1024 }); await page.waitForTimeout(200);
    const hud2 = await page.evaluate(() => { const h = document.getElementById('hud').getBoundingClientRect(); return { h: Math.round(h.height), vh: innerHeight }; });
    if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + '/tablet_verticale.png' });
    nota('tablet: un tocco seleziona la capitale', sel, '');
    nota('tablet: spazio occupato dalla barra in alto', hud.h / hud.vh < 0.25 && hud2.h / hud2.vh < 0.25, JSON.stringify({ orizzontale: hud, verticale: hud2 }));
    await page.close();
  }

  // 12. file di salvataggio non valido di un'altra grandezza di mappa
  {
    const page = await nuova(browser, { size: 'piccola' });
    const r = await page.evaluate(() => {
      const m0 = mapMode, rows0 = ROWS;
      setMapSize('media'); const d = { v: 17, rows: ROWS, cols: COLS, stars: { p: 1 }, tiles: [{ r: 0, c: 0, g: 'lava' }] };
      setMapSize(m0);
      const ok = applySave(d);
      let err = null; try { render(); } catch (e) { err = e.message; }
      return { ok, prima: m0, dopo: mapMode, righeMappa: map.length, ROWS, rows0, err };
    });
    nota('salvataggio non valido di un\'altra grandezza: la partita in corso resta intatta', !r.ok && r.dopo === r.prima && r.righeMappa === r.ROWS && !r.err, JSON.stringify(r));
    await page.close();
  }

  // 13. salva e ricarica: le unità che hanno già mosso possono muovere di nuovo?
  {
    const page = await nuova(browser);
    const r = await page.evaluate(() => {
      const u = unitsOf('p').find(t => UNIT_TYPES[t.unit.type].atk > 0 && movesFor(t).length);
      if (!u) return { salta: true };
      const dest = movesFor(u)[0]; doMove(u, dest);
      const primaMosse = movesFor(dest).length, mosso = dest.unit.moved;
      applySave(JSON.parse(JSON.stringify(serialize())));
      const t2 = map[dest.r][dest.c];
      return { mosso, primaMosse, dopoMosso: t2.unit.moved, dopoMosse: movesFor(t2).length };
    });
    nota('salva e ricarica non ridà le mosse già fatte', r.salta || r.dopoMosso === r.mosso, JSON.stringify(r));
    await page.close();
  }

  // 14. tasti tenuti premuti: zoom e frecce a raffica
  {
    const page = await nuova(browser, { size: 'gigante' });
    const t0 = Date.now();
    for (let i = 0; i < 40; i++) await page.keyboard.press(i % 2 ? 'ArrowRight' : 'ArrowDown');
    for (let i = 0; i < 15; i++) await page.keyboard.press('-');
    for (let i = 0; i < 15; i++) await page.keyboard.press('+');
    const r = await page.evaluate(() => ({ zoom, errori: 0 }));
    nota('frecce e zoom a raffica sulla mappa gigante', page.errori.length === 0, JSON.stringify(r) + ` in ${Date.now() - t0} ms`);
    await page.close();
  }

  // 15. partita lunga: 40 turni sulla mappa media senza errori
  {
    const page = await nuova(browser, { size: 'media' });
    const t0 = Date.now(); let i = 0;
    for (; i < 40; i++) {
      const st = await page.evaluate(() => { if (congedo) { let g = 0; while (congedo && g++ < 200) { const c = unitsOf('p').find(x => UNIT_TYPES[x.unit.type].ship || UNIT_TYPES[x.unit.type].atk > 0); if (!c) break; congedaClick(c); } } if (!gameOver) endTurn(); return gameOver; });
      if (st) break;
      await page.waitForFunction(() => (current === 'p') || gameOver, null, { timeout: 120000, polling: 100 });
    }
    const r = await page.evaluate(() => ({ turn, gameOver, imperi: imperiIA().length, caduti: caduti.length }));
    nota('40 turni sulla mappa media', page.errori.length === 0, JSON.stringify(r) + ` in ${Math.round((Date.now() - t0) / 1000)} s, ${Math.round((Date.now() - t0) / Math.max(1, i) / 100) / 10} s a turno; errori=${page.errori.slice(0, 3)}`);
    await page.close();
  }

  await browser.close();
  const ko = risultati.filter(x => !x.ok).length;
  console.log(`\n${risultati.length - ko}/${risultati.length} scenari senza anomalie`);
  console.log(ko ? `${ko} SCENARI CON ANOMALIE` : 'TUTTI GLI SCENARI SUPERATI');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
