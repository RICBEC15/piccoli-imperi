// Prova nel browser (computer e tablet) della scelta dell'anno (v80): si scrive un anno, si usano
// i pulsanti ◀ ▶, la barra e i salti rapidi, poi si parte e si cambia anno nella scelta del paese.
// uso: node anno_check.js [gioco.html] [cartella per le immagini]
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
    const info = () => page.$eval('#annoInfoIntro', el => el.textContent);
    // si scrive l'anno
    await page.fill('#annoNumIntro', '1856');
    await page.press('#annoNumIntro', 'Enter');
    await page.$eval('#annoNumIntro', el => el.dispatchEvent(new Event('change')));
    controlla(`${nome}: scrivo 1856`, (await info()) === 'Anno 1856 · Il Congresso di Vienna (confini del 1815)', await info());
    await page.click('#intro .annoPasso[title="un anno dopo"]');
    controlla(`${nome}: ▶ porta al 1857`, (await page.inputValue('#annoNumIntro')) === '1857');
    await page.click('#intro .annoPasso[title="10 anni prima"]');
    controlla(`${nome}: ⏪ porta al 1847`, (await page.inputValue('#annoNumIntro')) === '1847' && (await page.inputValue('#annoRangeIntro')) === '1847');
    await page.selectOption('#epocaSelIntro', '1945');
    controlla(`${nome}: salto al 1945`, (await page.inputValue('#annoNumIntro')) === '1945' && (await info()).startsWith('Anno 1945'), await info());
    // la barra
    await page.$eval('#annoRangeIntro', el => { el.value = '1712'; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
    controlla(`${nome}: barra al 1712`, (await page.inputValue('#annoNumIntro')) === '1712' && (await info()).includes('confini del 1700'), await info());
    await page.$eval('#intro .ovbox', el => el.scrollTop = 0);
    await page.screenshot({ path: `${out}/anno_${nome}_menu.png` });
    // si parte: nella scelta del paese l'anno e' lo stesso, e si cambia
    await page.click('#intro .ov-play >> nth=0');
    await page.waitForTimeout(1500);
    const s1 = await page.evaluate(() => ({ anno: annoPartita, epoca: epocaPartita, paesi: Object.keys(paesiInfo()).length, msg: (document.getElementById('msg') || {}).textContent || '' }));
    controlla(`${nome}: partita del 1712 con i confini del 1700`, s1.anno === 1712 && s1.epoca === '1700' && s1.paesi >= 15, JSON.stringify(s1).slice(0, 200));
    const vis = await page.evaluate(() => overlayVisible('paesi'));
    if (!vis) await page.evaluate(() => apriSceltaPaese());
    await page.fill('#annoNumPaesi', '1870');
    await page.$eval('#annoNumPaesi', el => el.dispatchEvent(new Event('change')));
    await page.waitForTimeout(500);
    const s2 = await page.evaluate(() => ({ anno: annoPartita, epoca: epocaPartita, info: document.getElementById('annoInfoPaesi').textContent, p: nomePaese(players.p.country) }));
    controlla(`${nome}: nella scelta del paese passo al 1870`, s2.anno === 1870 && s2.epoca === '1815', JSON.stringify(s2));
    await page.screenshot({ path: `${out}/anno_${nome}_paesi.png` });
    await page.evaluate(() => { if (typeof chiudiSceltaPaese === 'function') chiudiSceltaPaese(); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/anno_${nome}_mappa.png` });
    controlla(`${nome}: nessun errore nella pagina`, !errori.length, errori.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(tuttoOk ? 'TUTTO OK' : 'CI SONO ERRORI');
  process.exit(tuttoOk ? 0 : 1);
})();
