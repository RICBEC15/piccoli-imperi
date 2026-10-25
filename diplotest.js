// Test della diplomazia (v61): guerra, pace e alleanza fra te e gli imperi IA.
//  1. all'inizio tutti in guerra; l'IA accetta se sei forte, rifiuta se sei debole (e poi aspetta);
//  2. in pace/alleanza non ci si attacca e non si entra nelle città dell'altro;
//  3. l'IA alleata non ti attacca nemmeno con l'esercito alle porte, dopo la guerra sì;
//  4. l'alleanza rende +1⭐, la diplomazia si salva e si ricarica, la vittoria diplomatica.
// Math.random con seme fisso, come in aitest.js.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 7;
const casuale = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
Math.random = casuale;

setAvversari('tutti');
setDifficolta('difficile'); // nessuna tregua: l'IA attacca appena può
setMapSize('piccola');
newGame();
cambiaPaese('IT');
tutorial = false;
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
const cap = pCapital();
assert(cap && imperiIA().length > 3, `partita con ${imperiIA().length} imperi IA`);
// il vicino con la capitale più vicina alla tua (non un microstato di una casella: serve terra da toccare)
const vicino = imperiIA().filter(o => paesiInfo()[o].caselle > 2).sort((a, b) => dist(capitaleDi(a), cap) - dist(capitaleDi(b), cap))[0];
assert(imperiIA().every(o => relazione('p', o) === 'guerra'), 'all\'inizio sei in guerra con tutti');
assert(diploAttiva(), 'con un impero per paese la diplomazia è attiva');

// --- il tocco sul territorio dell'altro impero apre la sua scheda ---
selected = null;
const terra = map.flat().find(t => t.country === players[vicino].country && !t.unit && !t.city && passable(t));
onTileClick(terra);
assert(diploCon === vicino, `toccando il territorio di ${vicino} si apre la sua diplomazia`);
chiudiDiplomazia();

// --- debole: rifiuta, e per qualche turno non si riprova ---
Math.random = () => 0; // il caso non aiuta
const unitaIA = [];
for (const n of map.flat().filter(t => passable(t) && !t.unit && !t.city && t.country === players[vicino].country).slice(0, 8)) {
  const u = mkUnit('warrior', vicino); u.count = 3; u.maxHp = u.hp = UNIT_TYPES.warrior.hp * 3; n.unit = u; unitaIA.push(n);
}
assert(!proponi(vicino, 'pace'), 'l\'IA più forte di te rifiuta la pace');
assert(relazione('p', vicino) === 'guerra' && diploAttesa(vicino) > 0, 'dopo il rifiuto si aspetta qualche turno');
assert(!proponi(vicino, 'pace'), 'subito dopo un rifiuto non si può riproporre');
for (const n of unitaIA) n.unit = null;

// --- forte: accetta la pace ---
diplo.rifiuto = {};
const mie = [];
for (const n of map.flat().filter(t => passable(t) && !t.unit && !t.city && t.country === 'IT').slice(0, 12)) {
  const u = mkUnit('warrior', 'p'); u.count = 3; u.maxHp = u.hp = UNIT_TYPES.warrior.hp * 3; n.unit = u; mie.push(n);
}
assert(forzaImpero('p') > forzaImpero(vicino), 'ora sei più forte del vicino');
assert(proponi(vicino, 'pace'), 'l\'IA più debole accetta la pace');
assert(relazione('p', vicino) === 'pace' && relazione(vicino, 'p') === 'pace', 'la pace vale per entrambi');

// --- in pace: niente attacchi e niente ingresso nelle città dell'altro ---
const cIA = capitaleDi(vicino);
const accanto = neighbors(cIA).find(n => passable(n) && !n.city && !n.port && !n.hosp);
const vecchio = accanto.unit;
const gu = mkUnit('warrior', 'p'); accanto.unit = gu;
assert(!movesFor(accanto).includes(cIA), 'in pace non entri nella capitale dell\'altro');
assert(!attacksFor(accanto).includes(cIA), 'in pace non attacchi chi la difende');
aiMe = vicino;
assert(!cittaNemiche().some(t => t.city.owner === 'p'), 'per l\'IA in pace le tue città non sono obiettivi');
assert(!nemiciVicino(cIA, 3, vicino).some(t => t.unit.owner === 'p'), 'per l\'IA in pace le tue unità non sono nemiche');
aiMe = null;
accanto.unit = vecchio;

// --- l'alleanza: +1⭐ a turno a testa ---
const r0 = income('p'), rIA0 = income(vicino);
Math.random = () => 0.999;
for (let i = 0; i < 20 && relazione('p', vicino) !== 'alleanza'; i++) { diplo.rifiuto = {}; proponi(vicino, 'alleanza'); }
assert(relazione('p', vicino) === 'alleanza', 'il vicino accetta l\'alleanza');
assert(income('p') === r0 + ALLEANZA_RENDITA && income(vicino) === rIA0 + ALLEANZA_RENDITA, 'l\'alleanza rende +1⭐ a entrambi');

// --- salvataggio: la diplomazia resta ---
cambiaFiducia(vicino, 12);
const salvato = JSON.parse(JSON.stringify(serialize()));
assert(salvato.diplomazia && salvato.diplomazia.rel[chiaveRel('p', vicino)].stato === 'alleanza', 'il salvataggio contiene l\'alleanza');
nuovaDiplomazia();
assert(applySave(salvato), 'il salvataggio si ricarica');
assert(relazione('p', vicino) === 'alleanza' && fiduciaDi(vicino) === 12, 'dopo il caricamento l\'alleanza e la fiducia ci sono ancora');
const senza = JSON.parse(JSON.stringify(salvato)); delete senza.diplomazia;
assert(applySave(senza) && imperiIA().every(o => relazione('p', o) === 'guerra'), 'un salvataggio senza diplomazia riparte in guerra con tutti');
assert(applySave(salvato), 'ricarico la partita con l\'alleanza');
for (const t of map.flat()) if (t.unit && t.unit.owner === 'p' && !t.city) t.unit = null; // via le truppe di prova

// --- l'IA alleata non ti attacca nemmeno con l'esercito alle porte ---
Math.random = casuale;
const contaAttacchi = { suDiTe: 0 };
const _doAttack = doAttack;
doAttack = function (from, to) {
  if (from.unit && from.unit.owner === vicino && ((to.unit && to.unit.owner === 'p') || (to.hosp && to.hosp.owner === 'p'))) contaAttacchi.suDiTe++;
  return _doAttack(from, to);
};
const capP = pCapital();
function schieraIA() {
  // un'armata del vicino tutta attorno alla tua capitale, e un tuo guerriero in ogni casella libera accanto
  let n = 0;
  for (const x of map.flat().filter(t => dist(t, capP) === 2 && passable(t) && !t.city && !t.port && !t.hosp && t.terrain !== 'mountain')) {
    const u = mkUnit('knight', vicino); u.count = 3; u.maxHp = u.hp = UNIT_TYPES.knight.hp * 3; x.unit = u; n++;
  }
  for (const x of neighbors(capP).filter(t => passable(t) && !t.unit && !t.city && t.terrain !== 'mountain')) x.unit = mkUnit('warrior', 'p');
  return n;
}
assert(schieraIA() > 0, 'l\'esercito alleato è schierato attorno alla tua capitale');
const cittaPrima = cities('p').length;
for (let i = 0; i < 6 && !gameOver; i++) { players.p.stars = 200; endTurn(); }
assert(contaAttacchi.suDiTe === 0, 'in 6 turni l\'alleato non ti ha mai attaccato');
assert(pCapital() && cities('p').every(t => t.city.owner === 'p') && !gameOver, 'e non ti ha preso nessuna città');

// --- rompere l'alleanza: guerra, fiducia persa, e l'IA attacca ---
const fidAltri = imperiIA().filter(o => o !== vicino).map(fiduciaDi);
assert(dichiaraGuerra(vicino) && relazione('p', vicino) === 'guerra', 'rompi l\'alleanza: ora è guerra');
assert(fiduciaDi(vicino) < 0 && imperiIA().filter(o => o !== vicino).every((o, i) => fiduciaDi(o) < fidAltri[i]), 'il tradimento costa la fiducia di tutti');
schieraIA();
for (let i = 0; i < 4 && !gameOver && !contaAttacchi.suDiTe; i++) { players.p.stars = 200; endTurn(); }
assert(contaAttacchi.suDiTe > 0, 'in guerra lo stesso esercito ti attacca');
doAttack = _doAttack;

// --- vittoria diplomatica: tutti gli imperi rimasti alleati ---
if (!gameOver) {
  for (const o of imperiIA()) setRelazione('p', o, 'alleanza');
  checkEnd();
  assert(gameOver, 'alleato con tutti gli imperi rimasti: vittoria diplomatica');
}

// --- duello: niente diplomazia ---
setAvversari('duello');
newGame();
cambiaPaese('IT');
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
assert(!diploAttiva() && !proponi(imperiIA()[0], 'pace'), 'nel duello la diplomazia non c\'è');
setAvversari('tutti');

console.log('TUTTI I TEST DIPLOMAZIA SUPERATI');
