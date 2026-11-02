// Prova nel browser (solo computer: Riccardo non vuole piu' le prove su tablet) delle bandiere (v88): la scelta del paese di oggi e del
// 1700, la scheda della diplomazia (senza l'elenco dei patti), la barra in basso.
// uso: node bandiere_check.js [gioco.html] [cartella per le immagini]
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(process.argv[2] || 'piccoli_imperi.html');
const out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch();
  let tuttoOk = true;
  const controlla = (nome, ok, extra = '') => { console.log((ok ? 'OK: ' : 'FALLITO: ') + nome + (extra ? ' :: ' + extra : '')); if (!ok) tuttoOk = false; };
  for (const [nome, opz] of [['computer', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await browser.newContext(opz);
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', e => errori.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
    await page.goto(file);
    await page.waitForTimeout(800);
    await page.click('#intro .ov-play >> nth=0');
    await page.waitForTimeout(1500);
    if (!(await page.evaluate(() => overlayVisible('paesi')))) await page.evaluate(() => apriSceltaPaese());
    await page.waitForTimeout(300);
    const conta = () => page.evaluate(() => ({
      bnd: document.querySelectorAll('#paesiLista .bnd').length, btn: document.querySelectorAll('#paesiLista .paese-btn').length,
      resti: document.body.innerText.includes(''),
      opz: [...document.querySelectorAll('option')].some(o => o.textContent.includes('')),
      vuote: [...document.querySelectorAll('#paesiLista .bnd')].filter(b => b.getBoundingClientRect().width < 8).length }));
    let c = await conta();
    controlla(`${nome}: oggi, ogni paese della scelta ha la bandiera`, c.btn > 10 && c.bnd === c.btn && !c.resti && !c.opz && !c.vuote, JSON.stringify(c));
    await page.screenshot({ path: `${out}/bandiere_${nome}_paesi.png` });
    await page.fill('#annoNumPaesi', '1700');
    await page.$eval('#annoNumPaesi', el => el.dispatchEvent(new Event('change')));
    await page.waitForTimeout(800);
    c = await conta();
    controlla(`${nome}: 1700, ogni stato della scelta ha la bandiera`, c.btn > 10 && c.bnd === c.btn && !c.resti, JSON.stringify(c));
    await page.screenshot({ path: `${out}/bandiere_${nome}_1700.png` });
    // si gioca la Francia del 1700 e si apre la scheda di un vicino
    await page.evaluate(() => { scegliPaese('FRA'); if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (placing && placeSet.length) placePlayerCapital(placeSet[0]); });
    await page.waitForTimeout(500);
    const d = await page.evaluate(() => {
      const cap = pCapital();
      const o = imperiIA().sort((a, b) => dist(capitaleDi(a), cap) - dist(capitaleDi(b), cap))[0];
      apriDiplomazia(o);
      return { o, nome: nomePaese(o) };
    });
    await page.waitForTimeout(300);
    const box = await page.evaluate(() => ({ h2: document.querySelectorAll('#diploBox h2 .bnd').length, testo: document.getElementById('diploBox').innerText }));
    controlla(`${nome}: la scheda di ${d.nome} ha la bandiera e niente elenco dei patti`, box.h2 === 1 && !box.testo.includes('I tuoi patti'), JSON.stringify(box).slice(0, 300));
    await page.screenshot({ path: `${out}/bandiere_${nome}_diplomazia.png` });
    await page.evaluate(() => diploAzione(diploCon, 'alleanza'));
    await page.waitForTimeout(300);
    const es = await page.evaluate(() => { const e = document.getElementById('diploEsito'); return e ? { t: e.innerText, b: e.querySelectorAll('.bnd').length } : null; });
    controlla(`${nome}: l'esito della proposta ha la bandiera`, es && es.b === 1, JSON.stringify(es));
    await page.evaluate(() => chiudiDiplomazia());
    const barra = await page.evaluate(() => document.querySelectorAll('.bnd').length);
    controlla(`${nome}: senza errori`, !errori.length, errori.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'TUTTO OK' : 'QUALCOSA NON VA');
  process.exit(tuttoOk ? 0 : 1);
})();
