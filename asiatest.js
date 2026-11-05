// Test di tutta l'Asia (v90): la mappa va a est fino allo stretto di Bering e sale a nord fino al Tajmyr;
// 25 paesi nuovi, ognuno con la sua capitale vera; l'Oceania resta mare (lo spazio c'e', vuoto); le
// partite salvate fino alla v89 si caricano ancora (la mappa di prima scende di qualche riga).
// uso: cat stub.js game.js asiatest.js > _run.js && node _run.js   (qualche minuto)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 90;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

const NUOVI = Object.keys(PAESI_V90);
assert(NUOVI.length === 25 && NUOVI.every(cc => COUNTRY_NAMES[cc] && CAPITALI_REALI[cc]), '25 paesi nuovi, tutti con nome e capitale');
assert(NUOVI.every(cc => NUOVI_PAESI[cc] && PAESI_DOPO_V83[cc] && !PAESI_V84[cc] && !PAESI_V89[cc]), "sono paesi nuovi, dopo quelli dell'Africa");

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
  // le capitali vere (anche quelle che fino alla v89 erano fuori dalla mappa: Astana, Tashkent, Kabul, Islamabad)
  const dove = { CN: [116.40, 39.90], IN: [77.21, 28.61], JP: [139.69, 35.69], ID: [106.85, -6.21], TH: [100.50, 13.75],
                 PH: [120.98, 14.60], KR: [126.98, 37.57], VN: [105.85, 21.03], MN: [106.92, 47.92],
                 KZ: [71.43, 51.13], UZ: [69.24, 41.30], AF: [69.18, 34.53], PK: [73.05, 33.69] };
  for (const [cc, [lon, lat]] of Object.entries(dove)) {
    const q = tileLonLat(capitaleDi(cc), g);
    assert(Math.hypot((q.lon - lon) * GEO.kmLon, (q.lat - lat) * GEO.kmLat) < 80, `${taglia}: la capitale di ${nomePaese(cc)} e' ${capitaleDi(cc).city.n}`);
  }
  // la mappa arriva fino in fondo: la Cukotka oltre i 180°, il Tajmyr, la Kamchatka, Timor, lo Sri Lanka
  assert(vicino(189.5, 66.0, 'RU') && vicino(104.3, 77.4, 'RU'), `${taglia}: la Cukotka fino allo stretto di Bering e il Tajmyr sono Russia`);
  assert(vicino(158.65, 53.02, 'RU') && vicino(142.7, 47.0, 'RU'), `${taglia}: la Kamchatka e Sachalin`);
  assert(vicino(125.57, -8.56, 'TL') && vicino(80.6, 7.5, 'LK') && vicino(73.51, 4.17, 'MV'), `${taglia}: Timor Est, lo Sri Lanka e le Maldive`);
  assert(vicino(140.7, -2.6, 'ID') && vicino(121.0, 23.7, 'TW') && vicino(103.82, 1.35, 'SG'), `${taglia}: la Papuasia indonesiana, Taiwan e Singapore`);
  // l'Oceania resta mare: Sydney, Port Moresby, Auckland
  for (const [n, lon, lat] of [['Sydney', 151.2, -33.87], ['Port Moresby', 147.2, -9.44], ['Auckland', 174.76, -36.85], ['Alice Springs', 133.87, -23.7]])
    assert(at(lon, lat).terrain === 'water' && !at(lon, lat).country, `${taglia}: ${n} e' ancora mare (l'Oceania verra' dopo)`);
  // i laghi: il Bajkal, l'Issyk-Kul
  assert(at(108.0, 53.4).terrain === 'water' && at(77.3, 42.45).terrain === 'water', `${taglia}: il Bajkal e l'Issyk-Kul sono acqua`);
  // i grandi fiumi: lo Yangtze a Wuhan, il Gange a Patna, l'Ob a Novosibirsk, il Mekong a Vientiane
  const fiume = (lon, lat) => { const t0 = at(lon, lat); return [t0, ...neighbors(t0), ...neighbors(t0).flatMap(neighbors)].some(t => t.terrain === 'river' || t.fiumeCitta); };
  assert(fiume(114.3, 30.6) && fiume(85.1, 25.6) && fiume(82.95, 55.0) && fiume(102.6, 17.95), `${taglia}: lo Yangtze, il Gange, l'Ob e il Mekong ci sono`);
  // le città vere da 100.000 abitanti in su
  for (const n of ['Tokyo', 'Shanghai', 'Pechino', 'Giacarta', 'Seul', 'Bangkok', 'Novosibirsk', 'Vladivostok'])
    assert(dallIndice(conCitta, t => t.city.n === n).length === 1, `${taglia}: c'e' ${n}`);
  assert(info.CN.vill >= 30 && info.IN.vill >= 30 && info.JP.vill >= 8, `${taglia}: la Cina (${info.CN.vill}), l'India (${info.IN.vill}) e il Giappone (${info.JP.vill}) hanno città da conquistare`);
  // lo Sri Lanka e' un'isola, il Giappone non tocca la Corea
  const terra = floodFrom(at(80.6, 7.5));
  assert(!terra.has(key(capitaleDi('IN'))), `${taglia}: lo Sri Lanka resta un'isola`);
  // i biomi: la taiga, il deserto del Gobi e del Taklamakan, l'Himalaya
  const conta = (cc, f) => map.flat().filter(t => t.country === cc && f(t)).length;
  const suolo = cc => conta(cc, t => t.terrain !== 'water' && t.terrain !== 'river');
  const sib = map.flat().filter(t => t.country === 'RU' && t.terrain !== 'water' && tileLonLat(t, g).lon > 85 && tileLonLat(t, g).lat < 64);
  assert(sib.filter(t => t.terrain === 'forest').length > sib.length * 0.4, `${taglia}: la Siberia e' in gran parte taiga`);
  assert(conta('MN', t => t.terrain === 'desert') > 10 * tileScale() ** 2 && conta('CN', t => t.terrain === 'desert') > 100 * tileScale() ** 2, `${taglia}: il Gobi e il Taklamakan sono deserto`);
  assert(conta('NP', t => t.terrain === 'mountain') > suolo('NP') * 0.2, `${taglia}: il Nepal ha l'Himalaya`);
  assert(!map.flat().some(t => t.terrain !== 'water' && t.terrain !== 'river' && !biomaDi(t)), `${taglia}: ogni casella di terra ha il suo bioma`);
}

// la mappa di prima scende di dN righe (il Tajmyr sopra) e si allarga a destra
setMapSize('piccola');
newGame();
const dN = EXTN - EXTN_V89;
assert(COLS_V89 === 282 && ROWS_V89 === 529 && COLS > 600 && dN > 0 && dN % 2 === 0, `la mappa piccola di prima (282×529) e' dentro la nuova (${COLS}×${ROWS}), ${dN} righe piu' in basso`);

// giocare in Asia: il Giappone, a Tokyo
const tocca = cc => onTileClick(map.flat().find(t => t.country === cc && passable(t) && !t.city));
tocca('JP');
assert(players.p.country === 'JP' && !players.JP, 'toccato il Giappone: è tuo');
placePlayerCapital(placeSet[0]);
assert(pCapital() && pCapital().city.n === 'Tokyo', 'la tua capitale è Tokyo');
for (let i = 0; i < 2; i++) endTurn();
assert(current === 'p' && !gameOver, `due giri di turni con ${imperiIA().length} imperi IA, senza errori`);

// le epoche: le dinastie cinesi, l'India britannica, il Giappone
const statoA = (anno, lon, lat) => { setEpoca(anno); newGame(); const t = tileAtGeo(lon, lat, geoSetup()); return t.country ? nomePaese(t.country) : null; };
assert(statoA('1300', 116.4, 39.9) === 'Impero Yuan', 'nel 1300 a Pechino ci sono gli Yuan');
assert(statoA('1500', 116.4, 39.9) === 'Impero Ming', 'nel 1500 i Ming');
assert(statoA('1800', 116.4, 39.9) === 'Impero Qing', 'nel 1800 i Qing');
assert(statoA('1920', 77.2, 28.6) === 'India britannica', "nel 1920 l'India e' britannica");
assert(statoA('1960', 116.4, 39.9) === 'Repubblica Popolare Cinese', 'nel 1960 la Repubblica Popolare');
assert(statoA('1700', 139.7, 35.7) === 'Shogunato Tokugawa', 'nel 1700 lo shogunato Tokugawa');
setEpoca('oggi');

// un salvataggio della v89 (mappa fino all'Iran e a Capo Nord): lo si ricava da una partita nuova in Italia
// togliendo le righe sopra e sotto e le colonne a destra, e annegando l'Asia nuova; si carica e l'Asia torna
setMapSize('piccola');
newGame();
tocca('IT');
placePlayerCapital(placeSet[0]);
endTurn();
const roma = pCapital();
const nuovo = serialize();
const T = rleGriglia(nuovo.terreno, ROWS * COLS);
const vecchio = JSON.parse(JSON.stringify(nuovo));
const g = geoSetup(), terr = [];
const fuori = (r, c) => r < dN || r >= dN + ROWS_V89 || c >= COLS_V89;
const terraNuova = (r, c) => { const t = map[r][c]; return fuori(r, c) || !!PAESI_V90[t.paeseOggi || t.country] || (t.terrain !== 'water' && terraNuovaV90(t.paeseOggi || t.country, tileLonLat(t, g))); };
for (let r = dN; r < dN + ROWS_V89; r++) for (let c = 0; c < COLS_V89; c++) terr.push(terraNuova(r, c) ? 'w' : String.fromCharCode(T[r * COLS + c]));
vecchio.rows = ROWS_V89; vecchio.cols = COLS_V89; vecchio.terreno = rleCodifica(terr);
vecchio.ponti = vecchio.ponti.filter(([r, c]) => !terraNuova(r, c)).map(([r, c]) => [r - dN, c]);
const diNuovi = s => [s.y && s.y.o, s.u && s.u.o, s.s && s.s.o, s.q && s.q.o].some(o => o && PAESI_V90[o]);
vecchio.caselle = vecchio.caselle.filter(s => !terraNuova(s.r, s.c) && !diNuovi(s)).map(s => Object.assign(s, { r: s.r - dN }));
vecchio.imperi = vecchio.imperi.filter(o => !PAESI_V90[o]);
for (const o of NUOVI) { delete vecchio.stars[o]; delete vecchio.paesi[o]; }
vecchio.conquiste = vecchio.conquiste.filter(([r, c, o]) => !terraNuova(r, c) && !PAESI_V90[o]).map(([r, c, o]) => [r - dN, c, o]);
vecchio.diplomazia = { base: 'pace', rel: {}, fiducia: {}, rifiuto: {} };
setMapSize('media'); // si parte da un'altra taglia: il caricamento deve ritrovare quella giusta
assert(applySave(JSON.parse(JSON.stringify(vecchio))), "un salvataggio della v89 (senza l'Asia) si carica");
assert(mapMode === 'piccola' && ROWS_V89 === 529 && COLS > COLS_V89, 'ed e\' sulla mappa piccola nuova, piu\' grande');
assert(pCapital() && pCapital().city.n === 'Roma' && pCapital().r === roma.r && pCapital().c === roma.c && players.p.country === 'IT', 'la tua capitale è ancora Roma, nello stesso posto');
const info2 = paesiInfo();
assert(NUOVI.every(cc => info2[cc]), "le terre dell'Asia tornano dalla mappa nuova");
assert(info2.KZ && info2.RU && info2.PK, 'e anche il resto della Russia, del Kazakistan e del Pakistan');
assert(dallIndice(conCitta, t => t.city.n === 'Shanghai' && t.city.owner === null).length === 1, 'Shanghai è un villaggio libero da conquistare');
assert(!NUOVI.some(cc => players[cc]), 'nella partita vecchia i paesi nuovi non hanno un impero');
endTurn();
assert(current === 'p' && !gameOver, 'e la partita vecchia va avanti');
console.log("TUTTI I TEST DELL'ASIA SUPERATI");
