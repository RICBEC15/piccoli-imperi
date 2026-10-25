// Test dell'IA (v54). Con il giocatore fermo, l'IA deve:
//  1. continuare a crescere dopo il turno 50 (prima si bloccava a 3 città e 0 stelle);
//  2. entro il turno 150 minacciare o prendere la capitale del giocatore;
//  3. difendere la propria capitale quando è minacciata.
// Math.random con seme fisso: la partita è sempre la stessa, il test non è "a fortuna".
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 1;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
// dalla v60 il paese si sceglie toccandolo sulla mappa e di solito ogni paese e' un impero:
// questo test gioca il duello (un solo nemico, come prima) in un paese a caso
setAvversari('duello');
const A = () => imperiIA()[0]; // l'impero nemico
function sceltaACaso() { const l = Object.keys(paesiInfo()); cambiaPaese(l[Math.floor(Math.random() * l.length)]); }

setMapSize('piccola');
newGame(); sceltaACaso();
tutorial = false;
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
const pc = pCapital();
const stato = () => ({ citta: cities(A()).length, pop: cities(A()).reduce((s, t) => s + (t.city.pop || 1), 0), rendita: income(A()) });
let al50 = null, minacciata = false;
try {
  for (let i = 0; i < 150 && !gameOver; i++) {
    endTurn();
    if (turn === 50) al50 = stato();
    if (unitsOf(A()).some(x => dist(x, pc) <= 3)) minacciata = true;
  }
} catch (e) { console.error('CRASH', e.stack); process.exit(1); }
const presa = gameOver && !cities('p').some(t => t.city.capital);
const fine = stato();
console.log('turno', turn, '| al turno 50:', JSON.stringify(al50), '| alla fine:', JSON.stringify(fine), '| presa:', presa);
assert(presa || (al50 && (fine.citta > al50.citta || fine.pop > al50.pop || fine.rendita > al50.rendita)),
  "l'IA continua a crescere dopo il turno 50");
assert(minacciata || presa, "entro il turno 150 l'IA minaccia o prende la capitale del giocatore");

// 3. difesa: un'armata del giocatore arriva accanto alla capitale nemica
newGame(); sceltaACaso();
tutorial = false;
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
const ac = capitaleDi(A());
const vicino = neighbors(ac).find(n => passable(n) && !n.unit && !n.city);
const armata = mkUnit('warrior', 'p');
armata.count = 3; armata.maxHp = armata.hp = UNIT_TYPES.warrior.hp * 3;
vicino.unit = armata;
players[A()].stars = 10;
endTurn();
assert(ac.unit && ac.unit.owner === A(), "con la capitale minacciata l'IA la presidia (arruola o ripiega)");
assert(!gameOver, 'la partita prosegue senza errori dopo la difesa');
console.log('TUTTI I TEST IA SUPERATI');
