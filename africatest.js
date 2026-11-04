// Test di tutta l'Africa (v89): la mappa scende fino al Capo Agulhas, con il Madagascar e le isole
// dell'oceano Indiano; 30 paesi nuovi, ognuno con la sua capitale vera; le partite salvate dalla v84
// alla v88 (la mappa fino allo Yemen) si caricano ancora.
// uso: cat stub.js game.js africatest.js > _run.js && node _run.js   (circa un minuto)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 89;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

const NUOVI = Object.keys(PAESI_V89);
assert(NUOVI.length === 30 && NUOVI.every(cc => COUNTRY_NAMES[cc] && CAPITALI_REALI[cc]), '30 paesi nuovi, tutti con nome e capitale');
assert(NUOVI.every(cc => NUOVI_PAESI[cc] && PAESI_DOPO_V83[cc] && !PAESI_V84[cc]), 'sono paesi nuovi, dopo quelli del Medio Oriente');

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
  // le capitali vere, dove sono (anche quelle che fino alla v88 erano fuori dalla mappa: Addis Abeba, Abuja...)
  const dove = { CD: [15.31, -4.32], KE: [36.82, -1.29], ZA: [28.19, -25.75], AO: [13.23, -8.84], MG: [47.52, -18.91],
                 ET: [38.74, 9.03], NG: [7.49, 9.06], SO: [45.34, 2.05], SS: [31.58, 4.85], CM: [11.52, 3.87] };
  for (const [cc, [lon, lat]] of Object.entries(dove)) {
    const q = tileLonLat(capitaleDi(cc), g);
    assert(Math.hypot((q.lon - lon) * GEO.kmLon, (q.lat - lat) * GEO.kmLat) < 80, `${taglia}: la capitale di ${nomePaese(cc)} e' ${capitaleDi(cc).city.n}`);
  }
  // la mappa arriva fino in fondo: il Capo Agulhas, il Capo di Buona Speranza, il sud del Madagascar
  assert(vicino(20.0, -34.7, 'ZA') && vicino(18.47, -34.2, 'ZA'), `${taglia}: il Capo Agulhas e il Capo di Buona Speranza sono Sudafrica`);
  assert(vicino(46.0, -25.0, 'MG') && vicino(49.3, -12.3, 'MG'), `${taglia}: il Madagascar c'e' tutto, da nord a sud`);
  assert(vicino(57.55, -20.25, 'MU') && vicino(55.45, -4.62, 'SC') && vicino(55.5, -21.1, 'FR'), `${taglia}: Mauritius, le Seychelles e la Riunione (Francia)`);
  // il Lesotho dentro il Sudafrica, e i paesi del Sahel continuano a sud
  assert(vicino(27.48, -29.31, 'LS') && at(28.2, -29.6).country === 'LS', `${taglia}: il Lesotho e' un paese, dentro il Sudafrica`);
  assert(vicino(31.58, 4.85, 'SS') && vicino(3.38, 6.52, 'NG') && vicino(38.74, 9.03, 'ET'), `${taglia}: Giuba, Lagos e Addis Abeba nei loro paesi`);
  // i grandi laghi sono acqua
  assert(at(33.0, -1.0).terrain === 'water' && at(29.6, -6.5).terrain === 'water', `${taglia}: il lago Vittoria e il Tanganica sono acqua`);
  // i grandi fiumi: il Congo a Kisangani, lo Zambesi a Tete, il Niger a Onitsha, l'Orange
  const fiume = (lon, lat) => [at(lon, lat), ...neighbors(at(lon, lat))].some(t => t.terrain === 'river' || t.fiumeCitta);
  assert(fiume(25.19, 0.52) && fiume(33.6, -16.15) && fiume(6.78, 6.15) && fiume(21.26, -28.45), `${taglia}: il Congo, lo Zambesi, il Niger e l'Orange ci sono`);
  // le città vere da 100.000 abitanti in su
  for (const n of ['Kinshasa', 'Johannesburg', 'Nairobi', 'Luanda', 'Dar es Salaam', 'Abidjan'])
    assert(dallIndice(conCitta, t => t.city.n === n).length === 1, `${taglia}: c'e' ${n}`);
  assert(info.CD.vill >= 8 && info.ZA.vill >= 8, `${taglia}: il Congo (${info.CD.vill}) e il Sudafrica (${info.ZA.vill}) hanno città da conquistare`);
  // i biomi: la foresta del Congo, il deserto del Namib, i monti d'Etiopia
  const conta = (cc, f) => map.flat().filter(t => t.country === cc && f(t)).length;
  const terra = cc => conta(cc, t => t.terrain !== 'water' && t.terrain !== 'river');
  assert(conta('CD', t => t.terrain === 'forest') > terra('CD') * 0.4, `${taglia}: il Congo e' in gran parte foresta`);
  assert(conta('NA', t => t.terrain === 'desert') > 10 * tileScale() ** 2, `${taglia}: la Namibia ha il suo deserto`);
  assert(conta('ET', t => t.terrain === 'mountain' || t.terrain === 'hill') > terra('ET') * 0.15, `${taglia}: l'Etiopia ha i suoi altopiani`);
  assert(!map.flat().some(t => t.terrain !== 'water' && t.terrain !== 'river' && !biomaDi(t)), `${taglia}: ogni casella di terra ha il suo bioma`);
}

// la mappa di prima non si sposta: le righe nuove sono tutte in fondo
setMapSize('piccola');
newGame();
assert(COLS === 282 && ROWS - EXTR + EXTR_V84 === 298, 'le righe nuove sono in fondo: la mappa piccola di prima (282×298) resta com\'era');
assert(tileAtGeo(12.5, 41.9, geoSetup()).r < 298, 'e Roma e\' dove era');

// giocare in Africa: il Kenya, a Nairobi
const tocca = cc => onTileClick(map.flat().find(t => t.country === cc && passable(t) && !t.city));
tocca('KE');
assert(players.p.country === 'KE' && !players.KE, 'toccato il Kenya: è tuo');
placePlayerCapital(placeSet[0]);
assert(pCapital() && pCapital().city.n === 'Nairobi', 'la tua capitale è Nairobi');
for (let i = 0; i < 3; i++) endTurn();
assert(current === 'p' && !gameOver, `tre giri di turni con ${imperiIA().length} imperi IA, senza errori`);

// le epoche: i regni africani prima della spartizione, le colonie dopo
const statoA = (anno, lon, lat) => { setEpoca(anno); newGame(); const t = tileAtGeo(lon, lat, geoSetup()); return t.country ? nomePaese(t.country) : null; };
assert(statoA('1500', 14.5, -5.5) === 'Regno del Kongo', "nel 1500 alla foce del Congo c'e' il Regno del Kongo");
assert(statoA('1920', 25.0, -3.0) === 'Congo Belga', 'nel 1920 il Congo e\' belga');
assert(statoA('1920', 26.0, -28.0) === 'Unione Sudafricana', "nel 1920 c'e' l'Unione Sudafricana");
setEpoca('oggi');

// un salvataggio dalla v84 alla v88 (mappa fino allo Yemen): lo si ricava da una partita nuova in Italia
// tagliando le righe in fondo e annegando l'Africa nuova; si carica e l'Africa torna
setMapSize('piccola');
newGame();
tocca('IT');
placePlayerCapital(placeSet[0]);
endTurn();
const nuovo = serialize();
const R84 = ROWS - (EXTR - EXTR_V84);
const T = rleGriglia(nuovo.terreno, ROWS * COLS);
const vecchio = JSON.parse(JSON.stringify(nuovo));
const g = geoSetup(), terr = [];
const terraNuova = (r, c) => { const t = map[r][c]; return r >= R84 || !!PAESI_V89[t.paeseOggi || t.country] || (t.terrain !== 'water' && tileLonLat(t, g).lat < 11.5); };
for (let r = 0; r < R84; r++) for (let c = 0; c < COLS; c++) terr.push(terraNuova(r, c) ? 'w' : String.fromCharCode(T[r * COLS + c]));
vecchio.rows = R84; vecchio.terreno = rleCodifica(terr);
vecchio.ponti = vecchio.ponti.filter(([r, c]) => !terraNuova(r, c));
const diNuovi = s => [s.y && s.y.o, s.u && s.u.o, s.s && s.s.o, s.q && s.q.o].some(o => o && PAESI_V89[o]);
vecchio.caselle = vecchio.caselle.filter(s => !terraNuova(s.r, s.c) && !diNuovi(s));
vecchio.imperi = vecchio.imperi.filter(o => !PAESI_V89[o]);
for (const o of NUOVI) { delete vecchio.stars[o]; delete vecchio.paesi[o]; }
vecchio.conquiste = vecchio.conquiste.filter(([r, c, o]) => !terraNuova(r, c) && !PAESI_V89[o]);
vecchio.diplomazia = { base: 'pace', rel: {}, fiducia: {}, rifiuto: {} };
setMapSize('media'); // si parte da un'altra taglia: il caricamento deve ritrovare quella giusta
assert(applySave(JSON.parse(JSON.stringify(vecchio))), 'un salvataggio della v88 (senza l\'Africa del sud) si carica');
assert(mapMode === 'piccola' && ROWS === R84 + EXTR - EXTR_V84 && COLS === 282, 'ed e\' sulla mappa piccola nuova, piu\' lunga');
assert(pCapital() && pCapital().city.n === 'Roma' && players.p.country === 'IT', 'la tua capitale è ancora Roma');
const info2 = paesiInfo(), g2 = geoSetup();
assert(NUOVI.every(cc => info2[cc]), "le terre dell'Africa tornano dalla mappa nuova");
assert(info2.ET && info2.NG && info2.SD, 'e anche i paesi del Sahel di prima, con la loro parte a sud');
assert(dallIndice(conCitta, t => t.city.n === 'Kinshasa' && t.city.owner === null).length === 1, 'Kinshasa è un villaggio libero da conquistare');
assert(!NUOVI.some(cc => players[cc]), 'nella partita vecchia i paesi nuovi non hanno un impero');
endTurn();
assert(current === 'p' && !gameOver, 'e la partita vecchia va avanti');
console.log("TUTTI I TEST DELL'AFRICA SUPERATI");
