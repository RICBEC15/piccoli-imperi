// Test dei paesi (v56): ogni impero gioca un paese reale e il suo territorio sono le
// caselle di quel paese. Si controlla la scelta del paese, la capitale in patria,
// l'IA in un altro paese, il bonus di difesa, il compenso di stelle e il salvataggio.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 7;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

setMapSize('piccola');
newGame();
assert(placing && players.p.country && players.a.country, 'a inizio partita entrambi gli imperi hanno un paese');
assert(players.p.country !== players.a.country, "l'IA gioca un paese diverso dal tuo");

// 1. il giocatore sceglie la Francia: capitale IA spostata in un altro paese, caselle valide solo in Francia
cambiaPaese('FR');
assert(players.p.country === 'FR', 'scelta del paese: Francia');
assert(players.a.country !== 'FR', "l'IA non gioca la Francia");
assert(cities('a').filter(t => t.city.capital).length === 1, "l'IA ha una sola capitale dopo il cambio di paese");
assert(aCapital().country === players.a.country, "la capitale dell'IA sorge nel suo paese");
assert(placeSet.length > 0 && placeSet.every(t => t.country === 'FR'), 'le caselle per la capitale sono tutte in Francia');
const vicini = paesiVicini('FR').slice(0, PAESI_VICINI);
assert(vicini.includes(players.a.country), `il nemico a caso e' un paese vicino (${players.a.country})`);

// 2. il nemico scelto a mano
scegliNemico('DE');
assert(players.a.country === 'DE' && aCapital().country === 'DE', "nemico scelto a mano: la Germania, con la capitale in Germania");
assert(players.p.country === 'FR', 'cambiare nemico non cambia il tuo paese');

// 3. un tocco su un altro paese durante il piazzamento lo sceglie
const tileIT = map.flat().find(t => t.country === 'IT' && passable(t) && !t.city);
onTileClick(tileIT);
assert(players.p.country === 'IT' && placeSet.every(t => t.country === 'IT'), 'toccare un paese sulla mappa lo sceglie');
assert(players.a.country === 'DE', 'il nemico scelto a mano resta la Germania');

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

// 6. il salvataggio conserva i paesi; i vecchi salvataggi li ricavano dalle capitali
const data = serialize();
assert(data.v === 16 && data.paesi.p === 'FR' && data.paesi.a === players.a.country, 'il salvataggio v16 contiene i paesi');
const aCc = players.a.country;
newGame();
assert(applySave(data) && players.p.country === 'FR' && players.a.country === aCc, 'i paesi tornano dopo il caricamento');
const vecchio = JSON.parse(JSON.stringify(data)); vecchio.v = 15; delete vecchio.paesi;
newGame();
assert(applySave(vecchio) && players.p.country === 'FR' && players.a.country === aCc, 'salvataggio v15: paesi ricavati dalle capitali');

// 7. qualche turno di gioco con i territori, senza errori
try { for (let i = 0; i < 10 && !gameOver; i++) endTurn(); render(); ui(); }
catch (e) { console.error('CRASH', e.stack); process.exit(1); }
assert(true, 'dieci turni con i territori senza errori');

// 8. il tutorial: l'Italia contro un vicino di terra
newGame(true);
assert(players.p.country === 'IT' && PAESI_TUTORIAL.includes(players.a.country) && pCapital().country === 'IT',
  `tutorial: Italia contro ${nomePaese(players.a.country)}`);
console.log('TUTTI I TEST PAESI SUPERATI');
