// Prova nel browser (computer e tablet) degli abitanti dell'anno (v81): partita nel 1200,
// si tocca Parigi e Costantinopoli e si leggono abitanti e stelle nel pannello.
// uso: node popstorica_check.js [gioco.html] [cartella per le immagini]
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
    await page.goto(file);
    await page.waitForTimeout(800);
    for (const anno of [1200, 1900]) {
      await page.goto(file);
      await page.waitForTimeout(800);
      await page.fill('#annoNumIntro', String(anno));
      await page.$eval('#annoNumIntro', el => el.dispatchEvent(new Event('change')));
      await page.click('#intro .ov-play >> nth=0');
      await page.waitForTimeout(1500);
      await page.evaluate(() => { if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese(); if (!placeSet.length) cambiaPaese(Object.keys(paesiInfo()).sort()[0]); placePlayerCapital(placeSet[0]); });
      await page.waitForTimeout(300);
      for (const citta of ['Parigi', 'Istanbul', 'Roma']) {
        const r = await page.evaluate(n => {
          const t = map.flat().find(x => x.city && x.city.n === n);
          if (!t) return { ab: 0, testo: 'manca ' + n };
          const u = t.unit; t.unit = null; selected = t; ui(); render();
          const el = document.getElementById('unitinfo');
          const r = { ab: t.city.ab, ok: abitantiNellAnno(indiceCittaDi(t, n), annoPartita) === t.city.ab, testo: el ? el.textContent : '' };
          setTimeout(() => { t.unit = u; }, 400);
          return r;
        }, citta);
        controlla(`${nome}: ${citta} nel ${anno}`, r.ok && r.testo.includes(String(r.ab).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' abitanti'), r.testo.slice(0, 120));
        if (citta !== 'Roma') await page.waitForTimeout(100), await page.screenshot({ path: `${out}/popstorica_${nome}_${citta}_${anno}.png` });
      }
    }
    controlla(`${nome}: nessun errore nella pagina`, !errori.length, errori.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? '\nTUTTO OK' : '\nCI SONO ERRORI');
  process.exit(tuttoOk ? 0 : 1);
})();
