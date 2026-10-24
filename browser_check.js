const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  await page.goto('file://' + path.resolve('piccoli_imperi.html'));
  await page.waitForTimeout(1500);

  // chiudi l'intro se presente
  const introVisible = await page.evaluate(() => {
    const el = document.getElementById('intro');
    return el && getComputedStyle(el).display !== 'none';
  });
  if (introVisible) await page.evaluate(() => closeIntro());
  await page.waitForTimeout(300);

  // fonda la capitale se in fase di piazzamento
  await page.evaluate(() => {
    if (typeof placing !== 'undefined' && placing && placeSet.length) placePlayerCapital(placeSet[0]);
  });
  await page.waitForTimeout(300);

  // verifica dimensioni canvas e assenza di errori a questo punto
  const info1 = await page.evaluate(() => ({
    cols: COLS, rows: ROWS, cw: cv.width, ch: cv.height,
    grecia: GRECIA_EST, scozia: SCOZIA_NORD, shipCost: SHIP_COST, naveMaxLiv: NAVE_MAX_LIV
  }));
  console.log('stato iniziale:', JSON.stringify(info1));

  // gioca qualche turno rapido usando endTurn (gestendo un eventuale congedo)
  await page.evaluate(async () => {
    for (let i = 0; i < 6; i++) {
      if (typeof congedo !== 'undefined' && congedo) {
        let guard = 0;
        while (congedo && guard++ < 100) {
          const cand = unitsOf('p').find(x => UNIT_TYPES[x.unit.type].ship || UNIT_TYPES[x.unit.type].atk > 0);
          if (!cand) break;
          congedaClick(cand);
        }
      }
      if (gameOver) break;
      endTurn();
      await new Promise(r => setTimeout(r, 30));
    }
  });
  await page.waitForTimeout(500);

  const info2 = await page.evaluate(() => ({ turn, gameOver }));
  console.log('dopo alcuni turni:', JSON.stringify(info2));

  // apri regole e guida (enciclopedia) per verificare che non sollevino errori
  await page.evaluate(() => { showRules(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { hideRules(); showGuide && showGuide(); });
  await page.waitForTimeout(200);

  // controlla che il canvas non superi il limite pixel del browser (~268M)
  const px = info1.cw * info1.ch;
  console.log('pixel canvas:', px, px < 268435456 ? 'OK' : '*** OLTRE LIMITE ***');

  console.log('ERRORI CONSOLE:', errors.length);
  errors.slice(0, 20).forEach(e => console.log(' -', e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('CRASH TEST', e); process.exit(1); });
