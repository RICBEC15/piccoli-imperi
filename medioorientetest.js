// Test del Medio Oriente (v84): la mappa scende fino allo Yemen e al Sahel e va a est fino all'Iran;
// 37 paesi nuovi, ognuno con la sua capitale; le partite salvate prima si caricano ancora.
// uso: cat stub.js game.js medioorientetest.js > _run.js && node _run.js   (circa un minuto)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 82;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

const MEDIO_ORIENTE = ['SY', 'LB', 'IL', 'PS', 'JO', 'IQ', 'IR', 'KW', 'SA', 'BH', 'QA', 'AE', 'OM', 'YE'];
const NUOVI = Object.keys(PAESI_V84);
assert(NUOVI.length === 37 && NUOVI.every(cc => COUNTRY_NAMES[cc] && CAPITALI_REALI[cc]), '37 paesi nuovi, tutti con nome e capitale');
assert(MEDIO_ORIENTE.every(cc => PAESI_V84[cc]), 'ci sono tutti i paesi del Medio Oriente');

setAvversari('tutti');
for (const taglia of ['piccola', 'media']) {
  setMapSize(taglia);
  newGame();
  const info = paesiInfo(), g = geoSetup();
  const mancano = NUOVI.filter(cc => !info[cc]);
  assert(!mancano.length, `${taglia}: ogni paese nuovo e' sulla mappa${mancano.length ? ' (mancano ' + mancano.join(' ') + ')' : ''}`);
  const senza = NUOVI.filter(cc => !(players[cc] && capitaleDi(cc) && capitaleDi(cc).country === cc));
  assert(!senza.length, `${taglia}: ogni paese nuovo e' un impero IA con la capitale in patria${senza.length ? ' (no: ' + senza.join(' ') + ')' : ''}`);
  const at = (lon, lat) => tileAtGeo(lon, lat, g);
  const vicino = (lon, lat, cc) => [at(lon, lat), ...neighbors(at(lon, lat))].some(t => t.country === cc);
  // le capitali vere, dove sono
  const dove = { IR: [51.42, 35.67], IQ: [44.39, 33.34], SA: [46.72, 24.63], SY: [36.30, 33.50], YE: [44.20, 15.36], EG: [31.24, 30.04] };
  for (const [cc, [lon, lat]] of Object.entries(dove)) {
    const q = tileLonLat(capitaleDi(cc), g);
    assert(Math.hypot((q.lon - lon) * GEO.kmLon, (q.lat - lat) * GEO.kmLat) < 80, `${taglia}: la capitale di ${nomePaese(cc)} e' ${capitaleDi(cc).city.n}`);
  }
  // la mappa arriva fino in fondo allo Yemen (Aden) e all'Iran orientale
  assert(vicino(45.03, 12.8, 'YE'), `${taglia}: Aden e' nello Yemen`);
  assert(map.flat().some(t => t.country === 'IR' && tileLonLat(t, g).lon > 62.5), `${taglia}: l'Iran arriva oltre i 62,5° est`);
  // i paesi di prima continuano nelle terre nuove: l'Egitto fino ad Assuan, l'Algeria nel Sahara
  assert(vicino(32.9, 24.09, 'EG') && vicino(5.52, 22.79, 'DZ'), `${taglia}: Assuan e' Egitto, Tamanrasset e' Algeria`);
  // il mare dove deve esserci: il Golfo Persico, il Mar Rosso, Hormuz e Bab el-Mandeb
  assert(at(51.0, 27.5).terrain === 'water' && at(38.0, 21.0).terrain === 'water', `${taglia}: il Golfo Persico e il Mar Rosso sono mare`);
  assert(at(56.4, 26.6).terrain === 'water' && at(43.3, 12.6).terrain === 'water', `${taglia}: Hormuz e Bab el-Mandeb sono mare`);
  // i grandi fiumi: il Nilo a Khartum, il Tigri a Baghdad, l'Eufrate, il Niger
  const fiume = (lon, lat) => [at(lon, lat), ...neighbors(at(lon, lat))].some(t => t.terrain === 'river' || t.fiumeCitta);
  assert(fiume(32.53, 15.6) && fiume(44.4, 33.3) && fiume(40.14, 35.33) && fiume(-4.2, 14.5), `${taglia}: il Nilo, il Tigri, l'Eufrate e il Niger ci sono`);
  // le città vere da 100.000 abitanti in su
  for (const n of ['Teheran', 'Baghdad', 'Riad', 'Damasco', 'Khartum', 'Gedda', 'Mashhad'])
    assert(dallIndice(conCitta, t => t.city.n === n).length === 1, `${taglia}: c'e' ${n}`);
  assert(info.IR.vill >= 8 && info.SA.vill >= 5, `${taglia}: l'Iran (${info.IR.vill}) e l'Arabia (${info.SA.vill}) hanno città da conquistare`);
  // i biomi: il deserto arabico, i monti dell'Iran
  const conta = (cc, f) => map.flat().filter(t => t.country === cc && f(t)).length;
  assert(conta('SA', t => t.terrain === 'desert') > conta('SA', t => t.terrain !== 'water') / 2, `${taglia}: l'Arabia Saudita e' quasi tutta deserto`);
  assert(conta('IR', t => t.terrain === 'mountain' || t.terrain === 'hill') > 100 * tileScale() ** 2, `${taglia}: l'Iran ha i suoi monti`);
  assert(!map.flat().some(t => t.terrain !== 'water' && t.terrain !== 'river' && !biomaDi(t)), `${taglia}: ogni casella di terra ha il suo bioma`);
}

// la mappa di prima non si sposta: Roma e Parigi sono dove erano, coi loro r e c
setMapSize('piccola');
newGame();
const g0 = geoSetup();
assert(tileAtGeo(12.5, 41.9, g0).r < ROWS - EXTR + EXTR_V80 && COLS - EXTE + EXTE_V80 === 273 && ROWS - EXTR + EXTR_V80 === 220,
  'le righe e le colonne nuove sono in fondo e a destra: la mappa piccola di prima (273×220) resta com\'era');

// giocare in Medio Oriente: l'Iraq, a Baghdad
const tocca = cc => onTileClick(map.flat().find(t => t.country === cc && passable(t) && !t.city));
tocca('IQ');
assert(players.p.country === 'IQ' && !players.IQ, "toccato l'Iraq: è tuo");
placePlayerCapital(placeSet[0]);
assert(pCapital() && pCapital().city.n === 'Baghdad', 'la tua capitale è Baghdad');
for (let i = 0; i < 3; i++) endTurn();
assert(current === 'p' && !gameOver, `tre giri di turni con ${imperiIA().length} imperi IA, senza errori`);

// un salvataggio della v80-v82 (mappa senza Medio Oriente): lo si ricava da una partita nuova in Italia
// tagliando le righe in fondo e le colonne a destra e annegando le terre nuove; si carica e le terre tornano
setMapSize('piccola');
newGame();
tocca('IT');
placePlayerCapital(placeSet[0]);
endTurn();
const nuovo = serialize();
const R80 = ROWS - (EXTR - EXTR_V80), C80 = COLS - (EXTE - EXTE_V80);
const T = rleGriglia(nuovo.terreno, ROWS * COLS);
const vecchio = JSON.parse(JSON.stringify(nuovo));
const g = geoSetup(), terr = [];
const terraNuova = (r, c) => { const t = map[r][c], q = tileLonLat(t, g); return r >= R80 || c >= C80 || terraNuovaV84(t.paeseOggi || t.country, q.lon, q.lat); };
for (let r = 0; r < R80; r++) for (let c = 0; c < C80; c++) terr.push(terraNuova(r, c) ? 'w' : String.fromCharCode(T[r * COLS + c]));
vecchio.rows = R80; vecchio.cols = C80; vecchio.terreno = rleCodifica(terr);
vecchio.ponti = vecchio.ponti.filter(([r, c]) => !terraNuova(r, c));
const diNuovi = s => [s.y && s.y.o, s.u && s.u.o, s.s && s.s.o, s.q && s.q.o].some(o => o && PAESI_V84[o]);
vecchio.caselle = vecchio.caselle.filter(s => !terraNuova(s.r, s.c) && !diNuovi(s));
vecchio.imperi = vecchio.imperi.filter(o => !PAESI_V84[o]);
for (const o of NUOVI) { delete vecchio.stars[o]; delete vecchio.paesi[o]; }
vecchio.conquiste = vecchio.conquiste.filter(([r, c, o]) => !terraNuova(r, c) && !PAESI_V84[o]);
vecchio.diplomazia = { base: 'pace', rel: {}, fiducia: {}, rifiuto: {} };
setMapSize('media'); // si parte da un'altra taglia: il caricamento deve ritrovare quella giusta
assert(applySave(JSON.parse(JSON.stringify(vecchio))), 'un salvataggio della v82 (senza Medio Oriente) si carica');
assert(mapMode === 'piccola' && ROWS === R80 + EXTR - EXTR_V80 && COLS === C80 + EXTE - EXTE_V80, 'ed e\' sulla mappa piccola nuova, piu\' grande');
assert(pCapital() && pCapital().city.n === 'Roma' && players.p.country === 'IT', 'la tua capitale è ancora Roma');
const info2 = paesiInfo(), g2 = geoSetup();
assert(MEDIO_ORIENTE.every(cc => info2[cc]), 'le terre del Medio Oriente tornano dalla mappa nuova');
const intorno = (lon, lat) => [tileAtGeo(lon, lat, g2), ...neighbors(tileAtGeo(lon, lat, g2))];
assert(intorno(51.42, 35.67).some(t => t.country === 'IR' && t.terrain !== 'water') && intorno(32.9, 24.09).some(t => t.country === 'EG'), 'Teheran e Assuan sono terra, in Iran e in Egitto');
assert(dallIndice(conCitta, t => t.city.n === 'Baghdad' && t.city.owner === null).length === 1, 'Baghdad è un villaggio libero da conquistare');
assert(!NUOVI.some(cc => players[cc]), 'nella partita vecchia i paesi nuovi non hanno un impero');
endTurn();
assert(current === 'p' && !gameOver, 'e la partita vecchia va avanti');
console.log('TUTTI I TEST MEDIO ORIENTE SUPERATI');
