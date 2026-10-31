// Test della v72: la Città del Vaticano non c'è più fra gli stati di oggi (la sua casella è Italia),
// lo Stato della Chiesa resta nelle epoche storiche e le partite salvate prima, con il Vaticano
// in gioco, si caricano ancora com'erano.
// uso: cat stub.js game.js vaticanotest.js > _run.js && node _run.js   (circa 20 secondi)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 72;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
const vaticano = () => tileAtGeo(VATICANO.punto[0], VATICANO.punto[1], geoSetup());
const roma = () => tileAtGeo(12.50, 41.90, geoSetup());

assert(!COUNTRY_NAMES.VA && !CAPITALI_REALI.VA && !MICROSTATI.VA, 'il Vaticano non è fra i paesi di oggi');
setEpoca('oggi'); setAvversari('tutti');
for (const taglia of ['piccola', 'media']) {
  setMapSize(taglia); newGame();
  assert(!paesiInfo().VA && !players.VA && !map.flat().some(t => t.country === 'VA'), `${taglia}: niente Vaticano sulla mappa, nella scelta del paese e fra gli imperi IA`);
  assert(vaticano().country === 'IT' && roma().country === 'IT', `${taglia}: la sua casella è Italia`);
  assert(Object.keys(diplo.rel || {}).every(k => !k.split(/[^A-Z]/).includes('VA')), `${taglia}: nemmeno la diplomazia lo conosce`);
}
// lo Stato della Chiesa nelle epoche storiche resta com'era
setMapSize('piccola');
const conPapa = Object.keys(EPOCHE).filter(e => EPOCHE[e].stati && EPOCHE[e].stati.PAP);
assert(conPapa.length > 0, `lo Stato della Chiesa c'è ancora nelle epoche ${conPapa.join(', ')}`);
setEpoca(conPapa[0]); newGame();
assert(roma().country === 'PAP', `${conPapa[0]}: Roma è dello Stato della Chiesa`);
setEpoca('oggi');

// un salvataggio della v71 con il Vaticano impero IA: lo si rifà a mano sulla casella di allora
// (quella accanto a Roma, a ovest)
function casellaVecchia() {
  vaticanoVecchio = true; const t = [...caselleMicrostati(geoSetup())].find(([, cc]) => cc === 'VA')[0]; vaticanoVecchio = false;
  return t;
}
function salvaConVaticano(padrone) {
  const t = casellaVecchia(), data = serialize();
  const s = data.tiles.find(x => x.r === t.r && x.c === t.c);
  s.g = 'grass'; s.u = 0; s.s = 0; s.q = 0;
  s.y = { o: padrone, k: true, p: 1, n: VATICANO.nome, a: 800 };
  if (padrone === 'VA') { data.imperi.push('VA'); data.stars.VA = 9; data.paesi.VA = 'VA'; }
  else data.paesi.p = 'VA';
  return [data, t];
}
setAvversari('tutti'); newGame();
onTileClick(map.flat().find(x => x.country === 'FR')); placePlayerCapital(placeSet[0]);
let [data, t] = salvaConVaticano('VA');
assert(applySave(JSON.parse(JSON.stringify(data))), 'il salvataggio vecchio (Vaticano IA) si carica');
assert(players.VA && players.VA.vivo && capitaleDi('VA') === map[t.r][t.c] && capitaleDi('VA').country === 'VA' && nomePaese('VA') === VATICANO.nome,
  'il Vaticano ha ancora la sua casella, la sua capitale e il suo nome');
assert(roma().country === 'IT', 'Roma resta italiana');
const ri = serialize();
assert(applySave(ri) && players.VA && capitaleDi('VA').country === 'VA', 'risalvato e ricaricato, il Vaticano c\'è ancora');
endTurn();
assert(!gameOver, 'un giro di turni senza errori');
newGame();
assert(!players.VA && !COUNTRY_NAMES.VA && vaticano().country === 'IT', 'una partita nuova dopo quella vecchia è senza Vaticano');

// il giocatore che guidava il Vaticano
setAvversari('duello'); newGame();
[data, t] = salvaConVaticano('p');
assert(applySave(data) && players.p.country === 'VA' && pCapital() === map[t.r][t.c] && pCapital().country === 'VA', 'la tua partita da Vaticano si carica, con la capitale al suo posto');
// un salvataggio vecchio senza il Vaticano in gioco: la casella torna Italia
setAvversari('tutti'); newGame();
data = serialize();
assert(applySave(data) && !map.flat().some(x => x.country === 'VA'), 'un salvataggio senza il Vaticano non lo rimette');
console.log('TUTTI I TEST VATICANO SUPERATI');
