// Prova nel browser (computer e telefono emulato) della conquista del territorio: si toccano
// davvero un'unità e la casella nemica, e si controlla che la casella cambi colore sulla mappa.
// uso: node conquista_check.js [gioco.html] [cartella per le immagini]
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
    // una partita piccola, Italia; cinque guerrieri sul confine con un vicino
    const prep = await page.evaluate(() => {
      if (typeof closeIntro === 'function') try { closeIntro(); } catch (e) {}
      setAvversari('tutti'); setMapSize('piccola'); newGame();
      if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese();
      cambiaPaese('IT');
      if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
      nuovaDiplomazia(); // dalla v75 si parte in pace: qui tutti in guerra, per conquistare
      const libera = t => passable(t) && !t.unit && !t.city && !t.port && !t.hosp && t.terrain !== 'mountain';
      // caselle italiane libere accanto a una casella libera di un altro impero
      const mosse = [];
      const usate = new Set();
      for (const t of map.flat()) {
        if (t.country !== 'IT' || !libera(t) || usate.has(t)) continue;
        const a = neighbors(t).find(n => libera(n) && !usate.has(n) && n.country !== 'IT' && imperoDiCasella(n));
        if (!a || (mosse.length && dist(a, mosse[0][1]) > 8)) continue;
        mosse.push([t, a]); usate.add(t); usate.add(a);
        if (mosse.length >= 5) break;
      }
      for (const [da] of mosse) da.unit = mkUnit('warrior', 'p');
      applyZoom(1.4); scrollToTile(mosse[0][1], false); deselect(); render();
      return { mosse: mosse.map(([d, a]) => [[d.r, d.c], [a.r, a.c]]), nemico: imperoDiCasella(mosse[0][1]) };
    });
    // il pixel al centro di una casella, o spostato a lato (fuori dalle icone) per leggerne il colore
    const punto = (rc, dx = 0) => page.evaluate(([r, c, dx]) => {
      const w = document.getElementById('mapwrap'), p = center(map[r][c]), rr = w.getBoundingClientRect();
      return { x: rr.left + (p.x + dx) * zoom - viewX(w), y: rr.top + p.y * zoom - viewY(w) };
    }, [rc[0], rc[1], dx]);
    const colore = async rc => {
      const q = await punto(rc, S_OFF);
      return page.evaluate(([x, y]) => {
        const cvs = document.getElementById('cv') || document.querySelector('canvas');
        const r = cvs.getBoundingClientRect(), k = cvs.width / r.width;
        return Array.from(cvs.getContext('2d').getImageData(Math.round((x - r.left) * k), Math.round((y - r.top) * k), 1, 1).data).slice(0, 3);
      }, [q.x, q.y]);
    };
    const S_OFF = await page.evaluate(() => -S * 0.6);
    const prima = await colore(prep.mosse[0][1]);
    await page.screenshot({ path: path.join(out, `conquista_${nome}_prima.png`) });
    for (const [da, a] of prep.mosse) {
      for (const rc of [da, a]) {
        const q = await punto(rc, 0);
        if (nome === 'telefono') await page.touchscreen.tap(q.x, q.y); else await page.mouse.click(q.x, q.y);
        await page.waitForTimeout(120);
      }
    }
    await page.waitForTimeout(300);
    await page.evaluate(() => { deselect(); render(); });
    const esito = await page.evaluate(m => ({
      prese: m.filter(([, a]) => padroneTerra(map[a[0]][a[1]]) === 'p').length,
      msg: document.getElementById('msg').textContent.slice(0, 60)
    }), prep.mosse);
    const dopo = await colore(prep.mosse[0][1]);
    await page.screenshot({ path: path.join(out, `conquista_${nome}_dopo.png`) });
    const ok = esito.prese === prep.mosse.length && prima.join() !== dopo.join() && !errori.length;
    tuttoOk = tuttoOk && ok;
    console.log(JSON.stringify({ nome, nemico: prep.nemico, mosse: prep.mosse.length, prese: esito.prese, msg: esito.msg, prima, dopo, errori, ok }));
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'CONTROLLO CONQUISTA NEL BROWSER SUPERATO' : 'CONTROLLO CONQUISTA NEL BROWSER FALLITO');
  process.exit(tuttoOk ? 0 : 1);
})();
