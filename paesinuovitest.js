// Test dei paesi europei aggiunti nella v65: Polonia, Cechia, Slovacchia, la Scandinavia,
// i Baltici, la Bielorussia, l'Islanda, Malta, il Caucaso, il Kazakistan, San Marino e il Vaticano.
// uso: cat stub.js game.js paesinuovitest.js > _run.js && node _run.js   (circa 30 secondi)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 64;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

// gli stati d'Europa (piu' quelli a cavallo con l'Asia che stanno sulla mappa); la Russia e la
// Turchia c'erano gia'. Il Regno Unito nel gioco e' UK
const EUROPA = ['AL','AD','AM','AT','AZ','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR',
  'HU','IS','IE','IT','KZ','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU',
  'SM','RS','SK','SI','ES','SE','CH','TR','UA','UK','VA'];
const NUOVI = Object.keys(PAESI_V65);
assert(EUROPA.every(cc => COUNTRY_NAMES[cc] && CAPITALI_REALI[cc]), `tutti i ${EUROPA.length} paesi europei hanno nome e capitale`);

setAvversari('tutti');
for (const taglia of ['piccola', 'media']) {
  setMapSize(taglia);
  newGame();
  const info = paesiInfo(), g = geoSetup();
  const mancano = EUROPA.filter(cc => !info[cc]);
  assert(!mancano.length, `${taglia}: ogni paese europeo e' sulla mappa e si puo' giocare${mancano.length ? ' (mancano ' + mancano.join(' ') + ')' : ''}`);
  assert(NUOVI.every(cc => players[cc] && capitaleDi(cc) && capitaleDi(cc).country === cc), `${taglia}: ogni paese nuovo e' un impero IA con la capitale in patria`);
  // i paesi grandi hanno villaggi da conquistare (dalla v71 solo le città da 100.000 in su: Göteborg, Bergen...)
  assert(['PL', 'SE', 'NO', 'FI', 'BY', 'KZ'].every(cc => info[cc].vill >= 2), `${taglia}: Polonia, Scandinavia, Bielorussia e Kazakistan hanno villaggi`);
  const at = (lon, lat) => tileAtGeo(lon, lat, g);
  // l'Islanda (la mappa si e' allargata a ovest) e Capo Nord (a nord)
  assert(at(-21.94, 64.15).country === 'IS' || neighbors(at(-21.94, 64.15)).some(n => n.country === 'IS'), `${taglia}: Reykjavík e' in Islanda`);
  assert(map.flat().some(t => t.country === 'NO' && tileLonLat(t, g).lat > 70.5), `${taglia}: la Norvegia arriva oltre il 70° parallelo`);
  // Kaliningrad e' russo, fra Polonia e Lituania
  assert(at(20.51, 54.71).country === 'RU', `${taglia}: Kaliningrad e' Russia`);
  // l'Øresund e il Grande Belt restano mare: la Selandia (Copenaghen) non e' saldata alla Svezia
  assert(at(12.7, 55.85).terrain === 'water' && at(10.95, 55.35).terrain === 'water', `${taglia}: l'Øresund e il Grande Belt sono mare`);
  assert(at(13.0, 58.95).terrain === 'water' && at(27.5, 58.6).terrain === 'water', `${taglia}: il Vänern e il Peipus sono laghi`);
  // i microstati: una casella sola, libera per la capitale; il Vaticano non ruba Roma all'Italia
  for (const cc of ['SM', 'VA', 'MC']) assert(info[cc].caselle === 1 && capitaleDi(cc), `${taglia}: ${nomePaese(cc)} ha la sua casella e la sua capitale`);
  assert(at(12.50, 41.90).country === 'IT' && capitaleDi('VA') !== at(12.50, 41.90), `${taglia}: Roma resta italiana, il Vaticano e' accanto`);
}

// la tua partita in un paese nuovo: la Polonia, a Varsavia
setMapSize('piccola');
newGame();
const tocca = cc => onTileClick(map.flat().find(t => t.country === cc && passable(t) && !t.city));
tocca('PL');
assert(players.p.country === 'PL' && !players.PL, 'toccata la Polonia: è tua');
assert(placeSet.length === 1 && placeSet[0] === casellaCapitale('PL'), "l'unica casella per la capitale è Varsavia");
placePlayerCapital(placeSet[0]);
const g = geoSetup(), q = tileLonLat(pCapital(), g);
assert(Math.hypot((q.lon - 21.01) * GEO.kmLon, (q.lat - 52.23) * GEO.kmLat) < 60, `la capitale è a Varsavia (${q.lon.toFixed(2)}, ${q.lat.toFixed(2)})`);
for (let i = 0; i < 3; i++) endTurn();
assert(current === 'p' && !gameOver, 'tre giri di turni con 55 imperi IA, senza errori');

// un salvataggio della v63 (mappa senza Islanda e Capo Nord, senza i paesi nuovi) si carica ancora:
// lo si ricava da uno nuovo tagliando la cornice e annegando le terre della v65
const nuovo = serialize();
const tagliaR = EXTN - EXTN_V63, tagliaC = EXTC;
const v63 = JSON.parse(JSON.stringify(nuovo));
v63.rows = ROWS - tagliaR; v63.cols = COLS - tagliaC;
v63.imperi = v63.imperi.filter(o => !PAESI_V65[o]);
for (const o of NUOVI) { delete v63.stars[o]; delete v63.paesi[o]; }
v63.paesi.p = 'DE'; v63.diplomazia = { rel: {}, fiducia: {}, rifiuto: {} };
const terraNuova = new Set();
v63.tiles = v63.tiles.filter(s => s.r >= tagliaR && s.c >= tagliaC).map(s => {
  const t = map[s.r][s.c], s2 = Object.assign({}, s, { r: s.r - tagliaR, c: s.c - tagliaC });
  if (t.country && PAESI_V65[t.country]) { // nella v63 qui c'era il mare
    terraNuova.add(key(t));
    return { r: s2.r, c: s2.c, g: 'water', b: 0, y: 0, u: 0, s: 0, q: 0 };
  }
  return s2;
});
// la tua capitale nella v63 era a Berlino
const berlino = casellaCapitale('DE') || capitaleDi('DE');
const sb = v63.tiles.find(s => s.r === berlino.r - tagliaR && s.c === berlino.c - tagliaC);
sb.y = { o: 'p', k: 1, p: 2 }; sb.u = { t: 'warrior', o: 'p', n: 1, h: UNIT_TYPES.warrior.hp };
v63.imperi = v63.imperi.filter(o => o !== 'DE');
const capDE = v63.tiles.find(s => s.y && s.y.o === 'DE');
if (capDE) { capDE.y = 0; capDE.u = 0; }
for (const s of v63.tiles) { if (s.y && !(s.y.o === null || s.y.o === 'p' || v63.imperi.includes(s.y.o))) s.y = 0; if (s.u && !(s.u.o === 'p' || v63.imperi.includes(s.u.o))) s.u = 0; if (s.s && s.s.o && !(s.s.o === 'p' || v63.imperi.includes(s.s.o))) s.s = 0; if (s.q && s.q.o && !(s.q.o === 'p' || v63.imperi.includes(s.q.o))) s.q = 0; }
delete v63.stars.DE;
assert(v63.tiles.length === v63.rows * v63.cols, `preparato un salvataggio v63 di ${v63.cols}×${v63.rows}`);
assert(applySave(v63) === true, 'il salvataggio della v63 si carica');
assert(COLS === v63.cols + tagliaC && ROWS === v63.rows + tagliaR, 'e si apre sulla mappa nuova, più grande');
assert(pCapital() === map[berlino.r][berlino.c] && pCapital().unit && pCapital().unit.owner === 'p', 'la tua capitale e il tuo guerriero restano a Berlino');
const tornate = [...terraNuova].filter(k => { const [r, c] = k.split(',').map(Number); return map[r][c].terrain !== 'water'; }).length;
assert(tornate > terraNuova.size * 0.95, `le terre dei paesi nuovi compaiono anche nella partita vecchia (${tornate}/${terraNuova.size})`);
assert(map.flat().some(t => t.country === 'PL' && t.city && t.city.owner === null), 'con i loro villaggi neutrali');
assert(imperiIA().every(o => !PAESI_V65[o]), 'gli imperi restano quelli della partita salvata');
console.log('TUTTI I TEST DEI PAESI NUOVI SUPERATI');
