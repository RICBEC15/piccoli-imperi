// Test della conquista del territorio (v62): in guerra la casella in cui entra un'unità
// nemica passa al suo impero.
//  1. una tua unità (di qualunque tipo) che entra nel territorio di chi è in guerra con te lo prende;
//  2. in pace o in alleanza non si conquista niente;
//  3. l'IA ti prende le caselle dove passa e tu le riprendi; le caselle prese contano come patria;
//  4. salvataggio e Annulla tengono le conquiste; se un impero cade le sue conquiste tornano al paese;
//  5. nei turni dell'IA gli imperi si tolgono caselle fra loro; anche nel duello si conquista.
// Math.random con seme fisso, come in aitest.js.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 11;
const casuale = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
Math.random = casuale;

setAvversari('tutti');
setDifficolta('normale');
setMapSize('piccola');
newGame();
cambiaPaese('IT');
tutorial = false;
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
const cap = pCapital();
assert(cap && imperiIA().length > 3, `partita con ${imperiIA().length} imperi IA`);
assert(map.flat().every(t => !t.terra), 'all\'inizio nessuna casella è conquistata');
const vicino = imperiIA().includes('FR') ? 'FR' : imperiIA().slice().sort((a, b) => dist(capitaleDi(a), cap) - dist(capitaleDi(b), cap))[0];
const ccV = players[vicino].country;
assert(relazione('p', vicino) === 'pace', `all'inizio sei in pace con ${ccV} (v75)`);
{ // in pace il territorio non si prende
  const libera0 = t => passable(t) && !t.unit && !t.city && !t.port && !t.hosp && t.terrain !== 'mountain' && t.terrain !== 'forest';
  const a = map.flat().find(t => t.country === ccV && libera0(t) && neighbors(t).some(libera0)), da = neighbors(a).find(libera0);
  da.unit = mkUnit('warrior', 'p'); doMove(da, a);
  assert(!a.terra, 'in pace la casella dell\'altro impero non si conquista');
  a.unit = null; da.unit = null;
}
assert(dichiaraGuerra(vicino) && relazione('p', vicino) === 'guerra', `dichiari guerra a ${ccV}: ora sei in guerra`);

// caselle libere del vicino, ciascuna con accanto una casella libera da cui partire
const libera = t => passable(t) && !t.unit && !t.city && !t.port && !t.hosp && t.terrain !== 'mountain' && t.terrain !== 'forest';
const coppie = [];
const usate = new Set();
for (const t of map.flat()) {
  if (t.country !== ccV || !libera(t) || usate.has(t)) continue;
  const da = neighbors(t).find(n => libera(n) && !usate.has(n));
  if (!da) continue;
  coppie.push([da, t]); usate.add(t); usate.add(da);
  if (coppie.length >= 12) break;
}
assert(coppie.length >= 9, `trovate ${coppie.length} caselle del vicino da conquistare`);

// --- 1. ogni tipo di unità (non le navi) conquista la casella in cui entra ---
const tipi = Object.keys(UNIT_TYPES).filter(k => !UNIT_TYPES[k].ship);
for (let i = 0; i < tipi.length; i++) {
  const [da, a] = coppie[i];
  assert(padroneTerra(a) === vicino, `la casella ${a.r},${a.c} è di ${ccV}`);
  da.unit = mkUnit(tipi[i], 'p');
  doMove(da, a);
  assert(a.terra === 'p' && padroneTerra(a) === 'p', `${UNIT_TYPES[tipi[i]].name}: la casella conquistata ora è tua`);
  if (a.unit) a.unit = null;
}
assert(inPatria(coppie[0][1], 'p') && !inPatria(coppie[0][1], vicino), 'la casella conquistata conta come tua patria (+1 🛡️)');

// anche con il tocco, come in partita
{
  const [da, a] = coppie[6];
  da.unit = mkUnit('warrior', 'p');
  selected = null; onTileClick(da);
  assert(moveSet.includes(a), 'la casella nemica è fra le mosse del guerriero');
  onTileClick(a);
  assert(a.unit && a.unit.owner === 'p' && padroneTerra(a) === 'p', 'toccando la casella nemica il guerriero ci entra e la prende');
  assert(/conquistata/.test(document.getElementById('msg').textContent), 'il messaggio dice che la casella è conquistata');
  // un tocco sulla casella presa non apre la diplomazia del vecchio padrone
  a.unit = null; selected = null;
  onTileClick(a);
  assert(diploCon !== vicino, 'toccando la casella presa non si apre la scheda del vecchio padrone');
  chiudiDiplomazia();
}

// --- 2. in pace (e in alleanza) non si conquista ---
for (const [stato, i] of [['pace', 7], ['alleanza', 8]]) {
  setRelazione('p', vicino, stato);
  const [da, a] = coppie[i];
  da.unit = mkUnit('warrior', 'p');
  doMove(da, a);
  assert(!a.terra && padroneTerra(a) === vicino, `in ${stato} la casella resta di ${ccV}`);
  a.unit = null;
}
setRelazione('p', vicino, 'guerra');

// --- 3. l'IA ti prende una casella e la riprende la sua; tu la riprendi ---
{
  const [da, a] = coppie[0]; // già tua
  da.unit = mkUnit('knight', vicino);
  current = vicino; aiMe = vicino;
  doMove(da, a);
  current = 'p'; aiMe = null;
  assert(!a.terra && padroneTerra(a) === vicino, 'il vicino riprende la sua casella: torna al suo paese');
  const mia = map.flat().find(t => t.country === 'IT' && libera(t) && neighbors(t).some(libera));
  const daM = neighbors(mia).find(libera);
  daM.unit = mkUnit('archer', vicino);
  current = vicino; aiMe = vicino;
  doMove(daM, mia);
  current = 'p'; aiMe = null;
  assert(mia.terra === vicino && padroneTerra(mia) === vicino, 'il nemico ti toglie una casella del tuo paese');
  assert(inPatria(mia, vicino) && !inPatria(mia, 'p'), 'e lì ora è lui a difendersi meglio');
  mia.unit = null;
  const daP = neighbors(mia).find(n => libera(n) && n !== daM) || daM;
  daM.unit = null;
  daP.unit = mkUnit('builder', 'p');
  doMove(daP, mia);
  assert(!mia.terra && padroneTerra(mia) === 'p', 'ripassandoci la riprendi: torna del tuo paese');
  mia.unit = null;
  // la casella ripresa dall'IA si riconquista
  coppie[0][0].unit = null;
  a.unit = null;
  coppie[0][0].unit = mkUnit('warrior', 'p');
  doMove(coppie[0][0], a);
  assert(a.terra === 'p', 'e la casella del vicino la riprendi tu');
  a.unit = null;
}
// l'acqua non si conquista
{
  const mare = map.flat().find(t => t.terrain === 'water' && !t.unit);
  const nave = mkUnit('ship', 'p'); mare.unit = nave;
  arrivalEffects(mare);
  assert(!mare.terra, 'il mare non si conquista');
  mare.unit = null;
}

// --- 4. salvataggio e Annulla ---
const prese = map.flat().filter(t => t.terra === 'p').length;
assert(prese >= 6, `hai conquistato ${prese} caselle`);
const salvato = JSON.parse(JSON.stringify(serialize()));
assert(Array.isArray(salvato.conquiste) && salvato.conquiste.length === prese, 'il salvataggio contiene le caselle conquistate');
assert(applySave(salvato), 'il salvataggio si ricarica');
assert(map.flat().filter(t => t.terra === 'p').length === prese, 'dopo il caricamento le conquiste ci sono ancora');
const senza = JSON.parse(JSON.stringify(salvato)); delete senza.conquiste;
assert(applySave(senza) && map.flat().every(t => !t.terra), 'un salvataggio senza conquiste riparte con i confini dei paesi');
assert(applySave(salvato), 'ricarico la partita con le conquiste');
{
  const c2 = coppie.map(x => x[1]);
  const a = c2[7], da = coppie[7][0];
  if (a.unit) a.unit = null;
  da.unit = mkUnit('warrior', 'p');
  pushUndo();
  doMove(da, a);
  assert(a.terra === 'p', 'una nuova casella conquistata');
  const a2 = map[a.r][a.c];
  undoMove();
  assert(!a2.terra && padroneTerra(a2) === vicino, 'con Annulla la casella torna al vicino');
  if (map[da.r][da.c].unit) map[da.r][da.c].unit = null;
}

// le conquiste di un impero caduto tornano al loro paese; quelle prese a lui restano tue
{
  const mia = map.flat().find(t => t.country === 'IT' && libera(t));
  mia.terra = vicino;
  assert(padroneTerra(mia) === vicino, 'una tua casella in mano al vicino');
  const capV = capitaleDi(vicino);
  if (capV.unit) capV.unit = null;
  capV.city.owner = 'p';
  cadeImpero(vicino, 'p', capV);
  assert(!players[vicino].vivo, `${ccV} è caduto`);
  assert(padroneTerra(mia) === 'p', 'la casella che ti aveva preso torna tua');
  assert(map.flat().filter(t => t.terra === 'p' && padroneTerra(t) === 'p').length >= prese, 'le caselle che gli avevi preso restano tue');
  assert(map.flat().some(t => t.country === ccV && padroneTerra(t) === null), 'il resto del suo paese non è più di nessuno');
}

// il disegno della mappa con le caselle conquistate non si rompe
render();
assert(true, 'la mappa si disegna con le caselle conquistate');

// --- 5. nei turni dell'IA gli imperi in guerra fra loro si tolgono caselle ---
Math.random = casuale;
{ const ia = imperiIA(); for (let i = 0; i < ia.length; i++) for (let j = i + 1; j < ia.length; j++) setRelazione(ia[i], ia[j], 'guerra'); }
for (let i = 0; i < 6 && !gameOver; i++) endTurn();
const fraIA = map.flat().filter(t => t.terra && t.terra !== 'p' && padroneTerra(t) === t.terra);
assert(fraIA.length > 0, `in 6 turni gli imperi IA hanno conquistato ${fraIA.length} caselle`);
assert(fraIA.every(t => t.country !== players[t.terra].country), 'nessuna casella è segnata come conquistata nel paese di chi la tiene');

// --- duello: la guerra c'è sempre, e il territorio si conquista ---
setAvversari('duello');
newGame();
cambiaPaese('IT');
tutorial = false;
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
{
  // il primo impero con spazio libero nel suo paese (i microstati di una casella non ne hanno)
  const spazioLibero = o => map.flat().some(t => t.country === players[o].country && libera(t) && neighbors(t).some(libera));
  const nemico = imperiIA().find(spazioLibero), ccN = players[nemico].country;
  const a = map.flat().find(t => t.country === ccN && libera(t) && neighbors(t).some(libera));
  const da = neighbors(a).find(libera);
  da.unit = mkUnit('warrior', 'p');
  doMove(da, a);
  assert(a.terra === 'p', `nel duello la casella di ${ccN} diventa tua`);
}
setAvversari('tutti');

console.log('TUTTI I TEST CONQUISTA SUPERATI');
