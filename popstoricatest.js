// v81: gli abitanti delle città cambiano con l'anno della partita (POP_STORICA).
// uso: cat stub.js game.js popstoricatest.js > _run.js && node _run.js
let fail = 0;
function check(ok, txt) { console.log((ok ? 'OK: ' : 'ERRORE: ') + txt); if (!ok) fail++; }
const realRandom = Math.random;
check(CITTA_REALI.every((x, i) => indiceCittaReali.get(x[0]) !== i || serieStorica(i)), `una serie per ogni città vera (${Object.keys(POP_STORICA).length})`);
check(CITTA_REALI.every((x, i) => !serieStorica(i) || serieStorica(i).every(v => v >= 1000)), 'ogni serie ha tutti gli anni, mai sotto i 1.000 abitanti');
const idx = n => CITTA_REALI.findIndex(x => x[0] === n);
const ab = (n, a) => abitantiNellAnno(idx(n), a);
check(ab('Roma', ANNO_MAX) === CITTA_REALI[idx('Roma')][3] && ab('Roma', 2020) === CITTA_REALI[idx('Roma')][3], 'oggi valgono gli abitanti di oggi');
check(ab('Roma', 1000) < 60000 && ab('Roma', 1600) > 60000 && ab('Roma', 1600) < 150000, `Roma: ${fmtAbitanti(ab('Roma', 1000))} nel 1000, ${fmtAbitanti(ab('Roma', 1600))} nel 1600`);
check(ab('Istanbul', 1000) > ab('Parigi', 1000) && ab('Istanbul', 1000) > 200000, `Costantinopoli nel 1000 (${fmtAbitanti(ab('Istanbul', 1000))}) più grande di Parigi (${fmtAbitanti(ab('Parigi', 1000))})`);
check(ab('Londra', 1900) > 4000000 && ab('Londra', 1900) > ab('Parigi', 1900), `Londra nel 1900: ${fmtAbitanti(ab('Londra', 1900))}`);
check(ab('Mosca', 1100) <= 5000, `Mosca nel 1100 è appena nata (${fmtAbitanti(ab('Mosca', 1100))})`);
const m = ab('Parigi', 1250), p0 = ab('Parigi', 1200), p1 = ab('Parigi', 1300);
check(m > Math.min(p0, p1) && m < Math.max(p0, p1), `fra due anni noti si interpola (Parigi 1200 ${p0}, 1250 ${m}, 1300 ${p1})`);
// una città senza serie (aggiunta dopo a CITTA_REALI) cresce come le vicine
{ const i = idx('Roma'), s = POP_STORICA['Roma']; delete POP_STORICA['Roma']; serieCache.length = 0; fattoreZonaCache.clear();
  const v = abitantiNellAnno(i, 1500);
  check(v >= 1000 && v < CITTA_REALI[i][3] / 3 && abitantiNellAnno(i, ANNO_MAX) === CITTA_REALI[i][3], `città senza serie: Roma nel 1500 stimata ${fmtAbitanti(v)}`);
  POP_STORICA['Roma'] = s; serieCache.length = 0; fattoreZonaCache.clear(); }
// v81: stelle relative all'epoca: in media come oggi, l'ordine fra città è quello storico
{ const big = CITTA_REALI.map((x, i) => i).filter(i => CITTA_REALI[i][3] >= 100000);
  const media = a => { annoPartita = a; return big.reduce((s, i) => s + renditaCitta({ capital: false, pop: 1, ab: abitantiNellAnno(i, a) }), 0) / big.length; };
  const m1200 = media(1200), m1800 = media(1800), mOggi = media(ANNO_MAX);
  check(Math.abs(m1200 - mOggi) < 0.6 && Math.abs(m1800 - mOggi) < 0.6, `stelle medie: ${m1200.toFixed(2)} nel 1200, ${m1800.toFixed(2)} nel 1800, ${mOggi.toFixed(2)} oggi`);
  annoPartita = 1200;
  const st = n => renditaCitta({ capital: false, pop: 1, ab: ab(n, 1200) });
  check(st('Istanbul') >= st('Parigi') && st('Parigi') > st('Madrid') && st('Venezia') > st('Mosca'), `nel 1200 Costantinopoli ${st('Istanbul')}⭐, Parigi ${st('Parigi')}⭐, Venezia ${st('Venezia')}⭐, Madrid ${st('Madrid')}⭐, Mosca ${st('Mosca')}⭐`);
  annoPartita = ANNO_MAX;
  check(fattoreRendita() === 1, 'oggi le stelle sono quelle di sempre'); }
// partite in anni diversi: stessi villaggi, abitanti diversi
const posti = () => map.flat().filter(t => t.city && t.city.owner === null && !t.city.exVillaggio).map(t => `${t.r},${t.c}:${t.city.n}`);
const nomiCitta = () => new Set(map.flat().filter(t => t.city && t.city.n).map(t => t.city.n));
setMapSize('piccola');
setAnno(ANNO_MAX); Math.random = mulberry32(3); newGame();
const oggi = posti(), nomiOggi = nomiCitta(), abOggi = new Map(map.flat().filter(t => t.city).map(t => [t.city.n, t.city.ab]));
setAnno(1200); Math.random = mulberry32(3); newGame();
check(annoPartita === 1200, 'partita nel 1200');
const c1200 = map.flat().filter(t => t.city);
const nomi1200 = nomiCitta();
check([...nomi1200].filter(n => !nomiOggi.has(n)).length <= 3, `la mappa ha gli stessi villaggi (${c1200.length})`);
check(c1200.every(t => Number.isFinite(t.city.ab) && t.city.ab >= 500), 'ogni città ha i suoi abitanti del 1200');
const roma = c1200.find(t => t.city.n === 'Roma'), parigi = c1200.find(t => t.city.n === 'Parigi');
check(roma && roma.city.ab < 100000, `Roma nel 1200: ${roma && fmtAbitanti(roma.city.ab)}`);
check(parigi && parigi.city.ab < abOggi.get('Parigi') / 20, `Parigi nel 1200: ${parigi && fmtAbitanti(parigi.city.ab)}`);
const totale = cs => cs.reduce((s, t) => s + t.city.ab, 0);
check(totale(c1200) < totale(map.flat().filter(t => t.city)) + 1 && totale(c1200) < [...abOggi.values()].reduce((a, b) => a + b, 0) / 5, 'nel 1200 le città sono molto più piccole di oggi');
// cambiare anno durante la scelta del paese aggiorna gli abitanti
if (placing) {
  setAnno(1900);
  const r = map.flat().find(t => t.city && t.city.n === 'Roma');
  check(r && r.city.ab === abitantiNellAnno(indiceCittaDi(r, 'Roma'), 1900), `scelto il 1900 durante il piazzamento: Roma ha ${r && fmtAbitanti(r.city.ab)} abitanti`);
  placePlayerCapital(placeSet[0]);
  const cap = map.flat().find(t => t.city && t.city.owner === 'p' && t.city.capital);
  check(cap && cap.city.ab > 0 && (!cap.city.n || indiceCittaDi(cap, cap.city.n) < 0 || cap.city.ab === abitantiNellAnno(indiceCittaDi(cap, cap.city.n), 1900)), `la tua capitale ha gli abitanti del 1900 (${cap && cap.city.n} ${cap && fmtAbitanti(cap.city.ab)})`);
}
// salvataggio e caricamento tengono gli abitanti storici
const firma = () => map.flat().filter(t => t.city).map(t => t.r + ',' + t.c + ':' + t.city.ab).join('|');
const f = firma(), data = serialize();
setAnno(ANNO_MAX); newGame();
check(applySave(data) === true && annoPartita === 1900 && firma() === f, 'il salvataggio tiene anno e abitanti');
// un villaggio fondato nel Medioevo è più piccolo di uno di oggi
setAnno(1000); Math.random = mulberry32(9); newGame();
const t = map.flat().find(x => x.terrain === 'grass' && !x.city && x.country);
check(stimaAbitantiAnno(t) <= stimaAbitanti(t) && stimaAbitantiAnno(t) >= 500, `villaggio nuovo nel 1000: ${stimaAbitantiAnno(t)} contro ${stimaAbitanti(t)} di oggi`);
// il tutorial è sempre a oggi
setAnno(ANNO_MAX); Math.random = mulberry32(3); newGame();
check(posti().join() === oggi.join() && map.flat().filter(t => t.city && t.city.owner === null).every(t => t.city.ab === abOggi.get(t.city.n)), 'tornati a oggi: tutto come prima');
Math.random = realRandom;
console.log(fail ? `\n${fail} ERRORI` : '\nTUTTO OK');
process.exit(fail ? 1 : 0);
