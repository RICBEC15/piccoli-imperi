// Test delle capitali reali (v64): ogni impero, il tuo e quelli dell'IA, comincia dalla vera
// capitale del suo paese (la Spagna a Madrid...) o dalla casella libera più vicina.
// uso: cat stub.js game.js capitalitest.js > _run.js && node _run.js
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 3;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

// quante caselle separano la capitale dal punto vero
function scarto(o) {
  const cc = o === 'p' ? players.p.country : o;
  const g = geoSetup(), c = CAPITALI_REALI[cc], q = geoToPx(c[1], c[2], g), p = center(capitaleDi(o));
  return Math.hypot(p.x - q.x, p.y - q.y) / (S * SQ3);
}

setAvversari('tutti');
for (const taglia of ['piccola', 'gigante']) {
  setMapSize(taglia);
  newGame();
  const tutti = Object.keys(paesiInfo());
  assert(tutti.every(cc => CAPITALI_REALI[cc]), `${taglia}: ogni paese della mappa ha la sua capitale reale in tabella`);
  const scarti = tutti.map(cc => [cc, scarto(cc)]).sort((a, b) => b[1] - a[1]);
  console.log(`  ${taglia}: le capitali più lontane dal punto vero (in caselle):`, scarti.slice(0, 5).map(([cc, d]) => `${cc} ${d.toFixed(1)}`).join(', '));
  // il punto vero può cadere su un fiume, in mare o su un villaggio: si sposta di poco
  // v82: Gibuti sta proprio sul bordo sud della mappa (11,6° N): li' si concede una casella in piu'
  const troppo = scarti.filter(([cc, d]) => d > (cc === 'DJ' ? 4 : 3));
  assert(!troppo.length, `${taglia}: tutte le ${tutti.length} capitali entro 3 caselle dal punto vero (Gibuti, sul bordo, entro 4)`);
  // i microstati (Monaco, San Marino, Malta e il Liechtenstein sulla mappa piccola)
  // hanno poche caselle (meno di due della mappa piccola): la loro capitale sta dove sta
  assert(tutti.every(cc => paesiInfo()[cc].caselle <= 2 * tileScale() ** 2 || neighbors(capitaleDi(cc)).filter(n => passable(n)).length >= 3),
    `${taglia}: ogni capitale ha spazio per uscire (non chiusa fra monti e mare)`);
  const madrid = capitaleDi('ES');
  assert(madrid && madrid.country === 'ES' && scarto('ES') <= 1.5, `${taglia}: la Spagna comincia a Madrid`);
  // la capitale non dipende dal caso: una nuova partita la rimette nello stesso posto
  const posti = tutti.map(cc => key(capitaleDi(cc))).join();
  seme = 99; newGame();
  assert(tutti.map(cc => key(capitaleDi(cc))).join() === posti, `${taglia}: le capitali sono le stesse a ogni partita`);
}

// il giocatore: scelta la Spagna, l'unica casella evidenziata è Madrid,
// e un tocco ovunque in Spagna vi fonda la capitale
setMapSize('piccola');
newGame();
const madridIA = capitaleDi('ES');
const tocca = cc => onTileClick(map.flat().find(t => t.country === cc && passable(t) && !t.city && t !== casellaCapitale(cc)));
tocca('ES');
assert(players.p.country === 'ES' && !players.ES, 'toccata la Spagna: è tua');
assert(placeSet.length === 1 && placeSet[0] === madridIA, "l'unica casella per la capitale è Madrid, dove prima c'era l'impero IA");
assert(/MADRID/.test(document.getElementById('msg').innerHTML || document.getElementById('msg').textContent || ''), 'il messaggio dice di fondare la capitale a Madrid');
tocca('PT');
assert(players.p.country === 'PT' && capitaleDi('ES') === madridIA, 'cambiando paese la Spagna IA torna a Madrid');
tocca('ES');
tocca('ES'); // il secondo tocco in Spagna fonda la capitale
assert(!placing && pCapital() === madridIA, 'un tocco in Spagna fonda la tua capitale a Madrid');

// il duello: anche il nemico nasce nella sua capitale
setAvversari('duello');
newGame();
cambiaPaese('FR');
scegliNemico('DE');
assert(imperiIA().join() === 'DE' && scarto('DE') <= 1.5, 'duello: la Germania nasce a Berlino');
placePlayerCapital(placeSet[0]);
assert(pCapital().country === 'FR' && scarto('p') <= 1.5, 'duello: la tua capitale è Parigi');

// capitali vere vicine (Sofia-Pristina): l'impero IA non resta fermo col suo unico
// guerriero chiuso in capitale, ma esce e ne addestra altri
newGame();
cambiaPaese('BG');
scegliNemico('XK');
placePlayerCapital(placeSet[0]);
assert(dist(pCapital(), capitaleDi('XK')) <= 8, `Sofia e Pristina sono vicine (${dist(pCapital(), capitaleDi('XK'))} caselle)`);
for (let i = 0; i < 8 && !gameOver; i++) endTurn();
assert(gameOver || unitsOf('XK').length > 1, `il Kosovo cresce anche con te vicino (${unitsOf('XK').length} unità dopo 8 turni)`);

// il tutorial: l'Italia comincia a Roma
newGame(true);
assert(players.p.country === 'IT' && scarto('p') <= 1.5, 'tutorial: la tua capitale è Roma');
console.log('TUTTI I TEST CAPITALI SUPERATI');
