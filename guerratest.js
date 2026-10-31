// Test della pace iniziale (v75): nelle partite nuove con tutti gli imperi si parte tutti in pace
// e per attaccare bisogna dichiarare guerra.
//  1. al turno 1 ogni coppia (tu e l'IA, IA e IA) è in pace; nel duello si resta in guerra;
//  2. l'IA dichiara guerra solo dopo la tregua della sua difficoltà, e solo se è più forte;
//  3. con le guerre dichiarate la partita va avanti: si combatte, si prendono città e caselle;
//  4. se nessuno dichiara mai guerra la partita non si blocca, e la pace non è una vittoria;
//  5. salvataggi: la pace iniziale e le guerre dichiarate si salvano; quelli di prima (senza
//     base) ripartono in guerra con tutti, come prima.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 21;
const casuale = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
Math.random = casuale;

function partita(liv) {
  setAvversari('tutti');
  setDifficolta(liv);
  setMapSize('piccola');
  newGame();
  cambiaPaese('IT');
  tutorial = false;
  if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
}
const coppieInGuerra = () => {
  const ia = imperiIA().concat('p'); let n = 0;
  for (let i = 0; i < ia.length; i++) for (let j = i + 1; j < ia.length; j++) if (relazione(ia[i], ia[j]) === 'guerra') n++;
  return n;
};
// le dichiarazioni di guerra dell'IA, contate
let dichiarazioni = [];
const _set = setRelazione;
setRelazione = function (a, b, stato) {
  if (stato === 'guerra' && relazione(a, b) !== 'guerra') dichiarazioni.push({ turno: turn, da: aiMe || a, a: aiMe === a ? b : a });
  return _set(a, b, stato);
};

// --- 1. tutti in pace al turno 1 ---
partita('normale');
assert(imperiIA().length > 10 && coppieInGuerra() === 0, `turno 1: ${imperiIA().length} imperi IA, nessuna coppia in guerra`);
assert(diplo.base === 'pace' && Object.keys(diplo.rel).length === 0, 'la pace iniziale non scrive una voce per ogni coppia');
assert(!checkEnd() && !gameOver, 'tutti in pace non è una vittoria (serve l\'alleanza con tutti)');

// --- 2a. Normale: nessuna guerra prima del turno 30 ---
for (let i = 0; i < 12 && !gameOver; i++) { players.p.stars = 0; endTurn(); }
assert(!gameOver && turn === 13 && coppieInGuerra() === 0 && dichiarazioni.length === 0, 'a Normale nei primi 12 turni nessuno dichiara guerra');

// --- 2b. finita la tregua le guerre arrivano, e si combatte ---
turn = AI_GUERRA.normale.inizio;
const cittaIA0 = new Map(imperiIA().map(o => [o, cities(o).length]));
for (let i = 0; i < 30 && !gameOver; i++) { players.p.stars = 0; endTurn(); }
const dichIA = dichiarazioni.filter(d => d.da !== 'p');
assert(dichIA.length > 0, `dopo la tregua l'IA dichiara guerra (${dichIA.length} dichiarazioni in 30 turni)`);
assert(dichIA.every(d => d.turno >= AI_GUERRA.normale.inizio), 'nessuna dichiarazione prima della tregua');
const conquiste = map.flat().filter(t => t.terra && t.terra !== 'p').length;
const passate = imperiIA().some(o => cities(o).length > cittaIA0.get(o)) || caduti.length;
assert(conquiste > 0, `in guerra l'IA conquista caselle (${conquiste})`);
assert(passate, 'e le città cambiano padrone');
// le caselle prese: solo da chi era in guerra con il padrone naturale (lo controlla la conquista stessa)
assert(map.flat().filter(t => t.terra && t.terra !== 'p' && padroneNaturale(t) && players[padroneNaturale(t)] && players[padroneNaturale(t)].vivo)
  .every(t => relazione(t.terra, padroneNaturale(t)) !== 'alleanza'), 'nessuna casella presa a un alleato');

// --- 2c. l'IA dichiara guerra solo quando si sente più forte, e solo dopo la tregua ---
partita('facile');
const o = imperiIA().find(x => cities(x).length >= 3);
aiMe = o;
const vic = viciniDi(o, aiR(12)).filter(x => x !== 'p')[0];
assert(vic, `${o} ha dei vicini (${viciniDi(o, aiR(12)).join(' ')})`);
// un esercito enorme per o
const libere = map.flat().filter(t => t.country === players[o].country && passable(t) && !t.unit && !t.city && !t.port).slice(0, 10);
for (const t of libere) { const u = mkUnit('warrior', o); u.count = 3; u.maxHp = u.hp = UNIT_TYPES.warrior.hp * 3; t.unit = u; }
Math.random = () => 0;
dichiarazioni = [];
turn = AI_GUERRA.facile.inizio - 1; aiDiplomazia();
assert(dichiarazioni.length === 0, `a Facile al turno ${turn} (prima della tregua) nemmeno un impero fortissimo dichiara guerra`);
turn = AI_GUERRA.facile.inizio; aiDiplomazia();
assert(dichiarazioni.length === 1 && dichiarazioni[0].da === o, `al turno ${turn} ${o}, molto più forte, dichiara guerra a ${dichiarazioni[0] && dichiarazioni[0].a}`);
turn++; aiDiplomazia();
assert(dichiarazioni.length === 1, 'a Facile non fa più di una guerra alla volta');
// senza esercito non si dichiara guerra a nessuno
const p2 = imperiIA().find(x => x !== o && guerreDi(x) === 0 && aiSoldati(x) < AI_LIVELLI.facile.soglia);
aiMe = p2; dichiarazioni = []; aiDiplomazia();
assert(dichiarazioni.length === 0, `${p2}, con un esercito piccolo, resta in pace`);
// di te si fida: non ti attacca
setDifficolta('difficile');
aiMe = o; for (const x of imperiIA().concat('p')) if (x !== o && relazione(o, x) === 'guerra') _set(o, x, 'pace');
diplo.rel[chiaveRel(o, 'p')] && (diplo.rel[chiaveRel(o, 'p')].dal = 1);
for (const x of viciniDi(o, aiR(12))) if (x !== 'p') _set(o, x, 'alleanza'); // gli altri vicini sono alleati: non si toccano
diplo.fiducia[o] = 50; dichiarazioni = []; turn += 20; aiDiplomazia();
assert(!dichiarazioni.length || dichiarazioni.every(d => d.a !== 'p'), 'chi si fida di te non ti dichiara guerra');
assert(viciniDi(o, aiR(12)).filter(x => x !== 'p').every(x => relazione(o, x) === 'alleanza'), 'l\'IA non rompe le alleanze');
aiMe = null; Math.random = casuale;

// --- 4. nessuno dichiara mai guerra: la partita va avanti lo stesso ---
partita('difficile');
const prob = AI_GUERRA.difficile.prob; AI_GUERRA.difficile.prob = 0;
for (let i = 0; i < 15 && !gameOver; i++) { players.p.stars = 0; endTurn(); }
assert(!gameOver && current === 'p' && turn === 16 && coppieInGuerra() === 0, 'senza dichiarazioni 15 turni passano in pace, tocca di nuovo a te');
assert(imperiIA().every(o => capitaleDi(o)) && caduti.length === 0, 'in pace nessun impero cade');
AI_GUERRA.difficile.prob = prob;

// --- 3. Difficile: guerre presto ---
dichiarazioni = [];
for (let i = 0; i < 15 && !gameOver; i++) { players.p.stars = 0; endTurn(); }
assert(dichiarazioni.filter(d => d.da !== 'p').length > 0, `a Difficile l'IA dichiara guerra presto (${dichiarazioni.length} entro il turno ${turn})`);

// --- 5. salvataggi ---
const v = imperiIA().find(x => relazione('p', x) === 'pace');
current = 'p'; gameOver = false;
assert(dichiaraGuerra(v), `dichiari guerra a ${v}`);
const salvato = JSON.parse(JSON.stringify(serialize()));
const guerre = coppieInGuerra();
assert(salvato.diplomazia.base === 'pace', 'il salvataggio ricorda che si è partiti in pace');
assert(applySave(salvato) && relazione('p', v) === 'guerra' && coppieInGuerra() === guerre, `ricaricato: le stesse ${guerre} guerre, il resto in pace`);
const vecchio = JSON.parse(JSON.stringify(salvato));
delete vecchio.diplomazia.base;
vecchio.diplomazia.rel = Object.fromEntries(Object.entries(vecchio.diplomazia.rel).filter(([k, r]) => r.stato !== 'guerra'));
assert(applySave(vecchio) && coppieInGuerra() === (imperiIA().length + 1) * imperiIA().length / 2 - Object.keys(diplo.rel).length,
  'un salvataggio di prima (senza la pace iniziale) riparte in guerra con tutti, tranne i patti salvati');
const senza = JSON.parse(JSON.stringify(salvato)); delete senza.diplomazia;
assert(applySave(senza) && imperiIA().every(o => relazione('p', o) === 'guerra'), 'un salvataggio senza diplomazia riparte in guerra con tutti');

// --- duello: guerra come sempre ---
setAvversari('duello');
newGame(); cambiaPaese('IT'); if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
assert(!diploAttiva() && relazione('p', imperiIA()[0]) === 'guerra', 'nel duello si è in guerra dal primo turno');
setAvversari('tutti');
console.log('TUTTI I TEST PACE INIZIALE SUPERATI');
