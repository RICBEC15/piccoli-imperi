// Test di Madeira (v86): Madeira e Porto Santo sono terra portoghese a ogni taglia, Funchal e' un
// villaggio vero; nelle epoche storiche l'arcipelago e' disabitato fino al 1420, poi segue Lisbona;
// la partita salvata si ricarica con Madeira com'era.
// uso: cat stub.js game.js madeiratest.js > _run.js && node _run.js
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 85;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

const arcipelago = (g) => map.flat().filter(t => t.terrain !== 'water' && isMadeira(tileLonLat(t, g)));
for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia);
  annoScelto = ANNO_MAX; epocaScelta = 'oggi';
  newGame();
  const g = geoSetup(), isole = arcipelago(g);
  assert(isole.length >= 2 && isole.every(t => t.paeseOggi === 'PT' && t.country === 'PT' && t.hashland),
         `${taglia}: Madeira e Porto Santo sono Portogallo (${isole.length} caselle)`);
  const porto = isole.filter(t => tileLonLat(t, g).lat > 33.0);
  assert(porto.length >= 1, `${taglia}: c'e' Porto Santo`);
  const funchal = isole.find(t => t.city && t.city.n === 'Funchal');
  assert(funchal && tileLonLat(funchal, g).lat < 32.9, `${taglia}: Funchal e' un villaggio sulla costa sud di Madeira`);
  // il terreno vero: Madeira e' quasi tutta montagna e collina
  const madeira = isole.filter(t => !porto.includes(t) && !t.city);
  if (madeira.length) assert(madeira.some(t => t.terrain === 'mountain' || t.terrain === 'hill'), `${taglia}: Madeira e' montuosa`);
  // il resto del Portogallo non e' cambiato: Lisbona e' ancora li'
  assert(casellaLisbona(g) && casellaLisbona(g).country === 'PT', `${taglia}: Lisbona e' Portogallo`);
  // la mappa gia' pronta e quella calcolata da zero coincidono anche su Madeira
  const pronta = isole.map(t => t.terrain + (t.city ? t.city.n : '')).join(',');
  calcolaMappa();
  assert(arcipelago(g).map(t => t.terrain + (t.city ? t.city.n : '')).join(',') === pronta, `${taglia}: MAPPE_FISSE aggiornata su Madeira`);
}

// le epoche: disabitata prima del 1420, poi di chi ha Lisbona
setMapSize('media');
const statoDi = (anno) => {
  annoScelto = anno; epocaScelta = epocaDellAnno(anno); newGame();
  const g = geoSetup(), lis = casellaLisbona(g);
  return { isole: [...new Set(arcipelago(g).map(t => t.country))], lisbona: lis.country };
};
let e = statoDi(1000);
assert(e.isole.length === 1 && e.isole[0] === null, "nell'anno Mille Madeira e' disabitata");
e = statoDi(1419);
assert(e.isole.length === 1 && e.isole[0] === null, 'nel 1419 Madeira non e\' ancora di nessuno');
for (const anno of [1420, 1600, 1700, 1900, 1950, 2000]) {
  e = statoDi(anno);
  assert(e.isole.length === 1 && e.isole[0] && e.isole[0] === e.lisbona, `nel ${anno} Madeira e' di ${e.lisbona}, come Lisbona`);
}
// durante la scelta del paese, passare il 1420 senza cambiare istantanea aggiorna Madeira
annoScelto = 1410; epocaScelta = epocaDellAnno(1410); newGame();
placing = true;
setAnno(1430);
assert(arcipelago(geoSetup()).every(t => t.country && t.country === casellaLisbona(geoSetup()).country), 'dal 1410 al 1430 Madeira diventa portoghese');
setAnno(1410);
assert(arcipelago(geoSetup()).every(t => t.country === null), 'e tornando al 1410 torna disabitata');
placing = false;

// salva e ricarica
setMapSize('piccola');
annoScelto = ANNO_MAX; epocaScelta = 'oggi';
newGame();
const g = geoSetup(), prima = arcipelago(g).map(t => `${t.r},${t.c},${t.terrain},${t.country},${t.city ? t.city.n : ''}`).join(' ');
const dati = JSON.parse(JSON.stringify(serialize()));
newGame();
assert(caricaSalvataggio(dati) !== false, 'la partita si ricarica');
assert(arcipelago(g).map(t => `${t.r},${t.c},${t.terrain},${t.country},${t.city ? t.city.n : ''}`).join(' ') === prima, 'dopo il caricamento Madeira e Funchal sono com\'erano');
console.log('TUTTO OK');
