// v74: controlli nel browser della mappa veloce: apertura senza partita nascosta, partite nuove
// sulle tre mappe, salvataggio compatto (v18) avanti e indietro, e un salvataggio v17 di prima.
// uso: node caricamento_check.js   (Playwright, circa un minuto)
const { chromium } = require('playwright');
const path = require('path');
let fail = 0;
const check = (ok, txt) => { console.log((ok ? 'OK: ' : 'ERRORE: ') + txt); if (!ok) fail++; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errori = [];
  page.on('pageerror', e => errori.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'piccoli_imperi.html'), { waitUntil: 'load' });
  // 1. all'apertura c'e' solo la schermata di benvenuto: nessuna partita preparata sotto
  check(await page.evaluate(() => overlayVisible('intro') && map === undefined), 'all\'apertura nessuna partita nascosta');
  await page.setViewportSize({ width: 1200, height: 800 }); await page.waitForTimeout(100); // ridimensionare senza partita non rompe niente
  // l'Enciclopedia dalla schermata di benvenuto, poi Esc: parte una partita sulla piccola
  await page.evaluate(() => showGuide('free'));
  check(await page.evaluate(() => map === undefined), 'aprire l\'Enciclopedia non prepara la partita');
  await page.keyboard.press('Escape');
  check(await page.evaluate(() => Array.isArray(map) && mapMode === 'piccola' && placing && !!players.p), 'chiusa l\'Enciclopedia parte una partita sulla piccola');
  // 2. le tre mappe dal menu, con i tempi
  for (const m of ['piccola', 'media', 'gigante']) {
    await page.evaluate(() => { document.getElementById('intro').style.display = 'flex'; });
    const ms = await page.evaluate(async (m) => {
      const s = performance.now();
      startGame(m);
      while (document.getElementById('loading').style.display !== 'none') await new Promise(r => setTimeout(r, 10));
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return Math.round(performance.now() - s);
    }, m);
    const st = await page.evaluate(() => ({ m: mapMode, imperi: imperiIA().length, placing, citta: map.flat().filter(t => t.city).length }));
    check(st.m === m && st.imperi > 40 && st.placing && st.citta > 150, `mappa ${m}: partita pronta in ${ms} ms (${st.imperi} imperi, ${st.citta} città)`);
  }
  // 3. salvataggio compatto sulla gigante: piccolo, e torna uguale
  const r = await page.evaluate(() => {
    cambiaPaese('IT'); placePlayerCapital(placeSet[0]);
    const foto = () => map.flat().map(t => t.terrain + (t.bridge ? 'b' : '') + (t.country || '') + (t.city ? t.city.owner + t.city.n : '') + (t.unit ? t.unit.type + t.unit.owner + t.unit.hp : '')).join();
    const ponte = map.flat().find(t => t.terrain === 'river' && !t.bridge); ponte.bridge = true;
    const prima = foto(), j = JSON.stringify(serialize());
    newGame();
    const ok = applySave(JSON.parse(j));
    return { kb: Math.round(j.length / 1024), ok, uguale: foto() === prima, v: JSON.parse(j).v };
  });
  check(r.v === 18 && r.kb < 1024, `salvataggio della gigante: formato v18, ${r.kb} KB (prima circa 32.000 KB)`);
  check(r.ok && r.uguale, 'caricato, la mappa (terreno, ponti, paesi, città, unità) torna uguale');
  // 4. un salvataggio v17 della versione di prima (v73) si carica ancora
  const v17 = await page.evaluate(() => {
    const d = serialize(), nome = Object.fromEntries(Object.entries(SALVA_TERRENI).map(([k, v]) => [v, k]));
    const g = rleGriglia(d.terreno, d.rows * d.cols), occ = new Map(d.caselle.map(s => [s.r + ',' + s.c, s]));
    const ponti = new Set(d.ponti.map(([r, c]) => r + ',' + c)), tiles = [];
    for (let r = 0, i = 0; r < d.rows; r++) for (let c = 0; c < d.cols; c++, i++) {
      const s = occ.get(r + ',' + c) || { y: 0, u: 0, s: 0, q: 0 };
      tiles.push({ r, c, g: nome[String.fromCharCode(g[i])], b: ponti.has(r + ',' + c) ? 1 : 0, y: s.y, u: s.u, s: s.s, q: s.q });
    }
    const vecchio = Object.assign({}, d, { v: 17, tiles }); delete vecchio.terreno; delete vecchio.caselle; delete vecchio.ponti;
    const cap = pCapital(); newGame();
    return { ok: applySave(JSON.parse(JSON.stringify(vecchio))), cap: pCapital() && pCapital().r === cap.r && pCapital().c === cap.c };
  });
  check(v17.ok && v17.cap, 'un salvataggio v17 (fino alla v73) si carica ancora, con la capitale al suo posto');
  check(errori.length === 0, `nessun errore nella pagina ${JSON.stringify(errori.slice(0, 3))}`);
  await browser.close();
  console.log(fail ? fail + ' CONTROLLI CARICAMENTO FALLITI' : 'TUTTI I CONTROLLI CARICAMENTO SUPERATI');
  process.exit(fail ? 1 : 0);
})();
