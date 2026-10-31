// Prova nel browser (computer e tablet col tocco) del pannello 🧪 Cheat: si preme davvero il
// pulsante, si sceglie la truppa, si tocca la mappa per metterla, poi porto, ponte e conquista.
// uso: node cheat_check.js [gioco.html] [cartella per le immagini]
const { chromium, devices } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch();
  let tuttoOk = true;
  const controlla = (nome, ok, extra = '') => { console.log((ok ? 'OK: ' : 'FALLITO: ') + nome + (extra ? ' :: ' + extra : '')); if (!ok) tuttoOk = false; };
  for (const [nome, opz] of [['computer', { viewport: { width: 1280, height: 800 } }], ['tablet', devices['iPad (gen 7) landscape'] || devices['iPad Mini landscape']]]) {
    const ctx = await browser.newContext(opz);
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', e => errori.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
    await page.goto(file);
    await page.waitForTimeout(800);
    const prep = await page.evaluate(() => {
      if (typeof closeIntro === 'function') try { closeIntro(false); } catch (e) {}
      setAvversari('tutti'); setMapSize('piccola'); newGame();
      if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
      cambiaPaese('IT');
      if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
      // tre caselle vicine: prato libero, costa libera, fiume
      const libero = t => !t.unit && !t.city && !t.port && !t.hosp && !t.bridge;
      const costa = map.flat().find(t => t.country === 'IT' && t.terrain === 'grass' && libero(t) && neighbors(t).some(n => n.terrain === 'water'));
      const prato = map.flat().find(t => t.terrain === 'grass' && libero(t) && dist(t, costa) >= 2 && dist(t, costa) <= 4);
      const fiume = map.flat().filter(t => t.terrain === 'river' && libero(t)).sort((a, b) => dist(a, costa) - dist(b, costa))[0];
      applyZoom(1.2); scrollToTile(costa, false); deselect(); render();
      return { costa: [costa.r, costa.c], prato: [prato.r, prato.c], fiume: [fiume.r, fiume.c] };
    });
    const tocca = async (sel) => { if (nome === 'tablet') await page.tap(sel); else await page.click(sel); };
    const toccaCasella = async (rc) => {
      await page.evaluate(([r, c]) => { scrollToTile(map[r][c], false); render(); }, rc);
      await page.waitForTimeout(150);
      const q = await page.evaluate(([r, c]) => {
        const w = document.getElementById('mapwrap'), p = center(map[r][c]), rr = w.getBoundingClientRect();
        return { x: rr.left + p.x * zoom - viewX(w), y: rr.top + p.y * zoom - viewY(w) };
      }, rc);
      if (nome === 'tablet') await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y);
      await page.waitForTimeout(150);
    };
    await tocca('button.cheatbtn');
    controlla(`${nome}: il pannello si apre`, await page.isVisible('#cheatbox'));
    await page.selectOption('#cheatTipo', 'knight');
    await page.fill('#cheatNum', '30');
    await tocca('#cheatBtnTruppa');
    // la truppa va dove la si tocca, anche se sotto il pannello c'è... la mappa: lontano dal pannello
    await toccaCasella(prep.prato);
    const u = await page.evaluate(([r, c]) => map[r][c].unit && { t: map[r][c].unit.type, n: map[r][c].unit.count, o: map[r][c].unit.owner }, prep.prato);
    controlla(`${nome}: 30 cavalieri messi col tocco`, !!u && u.t === 'knight' && u.n === 30 && u.o === 'p', JSON.stringify(u));
    await tocca('#cheatBtnPorto');
    const stelle = await page.evaluate(() => players.p.stars);
    await toccaCasella(prep.costa);
    const porto = await page.evaluate(([r, c]) => !!(map[r][c].port && map[r][c].port.owner === 'p'), prep.costa);
    controlla(`${nome}: porto senza Costruttore`, porto && stelle === await page.evaluate(() => players.p.stars));
    await tocca('#cheatBtnPonte');
    await toccaCasella(prep.fiume);
    controlla(`${nome}: ponte senza Costruttore`, await page.evaluate(([r, c]) => !!map[r][c].bridge, prep.fiume));
    await page.screenshot({ path: path.join(out, `cheat_${nome}_pannello.png`) });
    await tocca('#cheatBtnPonte'); // spegne la modalità
    await page.selectOption('#cheatImpero', 'ES');
    const cittaES = await page.evaluate(() => cities('ES').length);
    await tocca('#cheatbox button[onclick="cheatConquistaScelto()"]');
    const dopo = await page.evaluate(() => ({ vivo: imperiIA().includes('ES'), mie: cities('p').filter(t => t.country === 'ES').length, opzES: !!document.querySelector('#cheatImpero option[value="ES"]') }));
    controlla(`${nome}: Spagna conquistata`, !dopo.vivo && dopo.mie === cittaES && !dopo.opzES, JSON.stringify(dopo));
    await page.evaluate(() => { const t = map.flat().find(x => x.country === 'ES' && x.city); scrollToTile(t, false); applyZoom(0.6); render(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `cheat_${nome}_spagna.png`) });
    await tocca('.cheat-x');
    controlla(`${nome}: il pannello si chiude`, !(await page.isVisible('#cheatbox')));
    controlla(`${nome}: nessun errore nella pagina`, !errori.length, errori.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'TUTTE LE PROVE CHEAT NEL BROWSER SUPERATE' : 'ALCUNE PROVE CHEAT FALLITE');
  process.exit(tuttoOk ? 0 : 1);
})();
