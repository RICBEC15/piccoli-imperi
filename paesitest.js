// Test dei paesi (v56, aggiornato alla v60): ogni impero gioca un paese reale e il suo
// territorio sono le caselle di quel paese. Il paese si sceglie toccandolo sulla mappa.
// Qui il duello (un solo nemico); la partita con tutti i paesi la prova imperitest.js.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 7;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
const A = () => imperiIA()[0]; // l'impero nemico del duello

setAvversari('duello');
setMapSize('piccola');
newGame();
assert(placing && !players.p.country && !imperiIA().length, 'a inizio partita nessun paese scelto: si tocca sulla mappa');

// 1. il giocatore tocca la Francia: l'IA nasce in un paese vicino, caselle valide solo in Francia
onTileClick(map.flat().find(t => t.country === 'FR' && passable(t) && !t.city));
assert(players.p.country === 'FR', 'toccare la Francia la sceglie');
assert(imperiIA().length === 1 && A() !== 'FR' && players[A()].country === A(), "un solo nemico, in un altro paese (l'id e' il codice del paese)");
assert(cities(A()).filter(t => t.city.capital).length === 1, "l'IA ha una sola capitale");
assert(capitaleDi(A()).country === A(), "la capitale dell'IA sorge nel suo paese");
assert(placeSet.length > 0 && placeSet.every(t => t.country === 'FR'), 'le caselle per la capitale sono tutte in Francia');
assert(paesiVicini('FR').slice(0, PAESI_VICINI).includes(A()), `il nemico a caso e' un paese vicino (${A()})`);

// 2. il nemico scelto a mano (dal menu, che resta come aiuto)
scegliNemico('DE');
assert(A() === 'DE' && capitaleDi('DE').country === 'DE', "nemico scelto a mano: la Germania, con la capitale in Germania");
assert(players.p.country === 'FR', 'cambiare nemico non cambia il tuo paese');

// 3. un tocco su un altro paese durante il piazzamento lo sceglie
const tileIT = map.flat().find(t => t.country === 'IT' && passable(t) && !t.city);
onTileClick(tileIT);
assert(players.p.country === 'IT' && placeSet.every(t => t.country === 'IT'), 'toccare un altro paese sulla mappa lo sceglie');
assert(A() === 'DE', 'il nemico scelto a mano resta la Germania');

// 4. compenso di stelle: un paese con pochi villaggi parte con piu' stelle
const info = paesiInfo();
const povero = Object.keys(info).find(cc => info[cc].vill < PAESE_VILL_BASE && cc !== 'DE');
scegliNemico(null);
cambiaPaese(povero);
assert(players.p.stars === 7 + PAESE_VILL_STELLE * (PAESE_VILL_BASE - info[povero].vill),
  `${nomePaese(povero)} (${info[povero].vill} villaggi) parte con ${players.p.stars} stelle`);
cambiaPaese('FR');
assert(info.FR.vill >= PAESE_VILL_BASE && players.p.stars === 7, 'la Francia, ricca di villaggi, parte con 7 stelle');

// 5. fondazione della capitale in patria e bonus di difesa
placePlayerCapital(placeSet[0]);
assert(!placing && pCapital().country === 'FR', 'capitale fondata in Francia');
const casa = map.flat().find(t => t.country === 'FR' && t.terrain === 'grass' && !t.city && !t.unit && !t.hosp);
const fuori = map.flat().find(t => t.country === 'ES' && t.terrain === 'grass' && !t.city && !t.unit && !t.hosp);
casa.unit = mkUnit('warrior', 'p'); fuori.unit = mkUnit('warrior', 'p');
assert(defOf(casa) === defOf(fuori) + 1, 'in patria la difesa e +1');
pCapital().unit = pCapital().unit || mkUnit('warrior', 'p');
assert(defOf(pCapital()) === UNIT_TYPES.warrior.def + 1, 'in capitale il bonus della citta e della patria non si sommano');
casa.unit = null; fuori.unit = null;

// 6. il salvataggio v17 conserva i paesi; i vecchi salvataggi (nemico 'a') li ricavano dalle capitali
const data = serialize();
const aCc = A();
assert(data.v === 17 && data.modo === 'duello' && data.paesi.p === 'FR' && data.imperi.join() === aCc, 'il salvataggio v17 contiene modo, paesi e imperi');
newGame();
assert(applySave(data) && players.p.country === 'FR' && A() === aCc && modoPartita === 'duello', 'i paesi tornano dopo il caricamento');
const vecchio = JSON.parse(JSON.stringify(data));
vecchio.v = 15; delete vecchio.paesi; delete vecchio.imperi; delete vecchio.modo;
const conA = o => (o && o !== 'p' ? 'a' : o);
for (const s of vecchio.tiles) { if (s.y) s.y.o = conA(s.y.o); if (s.u) s.u.o = conA(s.u.o); if (s.s) s.s.o = conA(s.s.o); if (s.q) s.q.o = conA(s.q.o); }
vecchio.stars = { p: data.stars.p, a: data.stars[aCc] };
newGame();
assert(applySave(vecchio) && players.p.country === 'FR' && A() === aCc && players[aCc].stars === data.stars[aCc],
  "salvataggio v15: il nemico 'a' diventa l'impero del suo paese");
assert(modoPartita === 'duello' && cities('a').length === 0, 'il vecchio salvataggio continua come duello, senza più proprietari "a"');

// 7. qualche turno di gioco con i territori, senza errori
try { for (let i = 0; i < 10 && !gameOver; i++) endTurn(); render(); ui(); }
catch (e) { console.error('CRASH', e.stack); process.exit(1); }
assert(true, 'dieci turni con i territori senza errori');

// 8. il tutorial: sempre un duello, l'Italia contro un vicino di terra
setAvversari('tutti');
newGame(true);
assert(modoPartita === 'duello' && players.p.country === 'IT' && PAESI_TUTORIAL.includes(A()) && pCapital().country === 'IT',
  `tutorial: Italia contro ${nomePaese(A())}`);
console.log('TUTTI I TEST PAESI SUPERATI');
