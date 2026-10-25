// Test degli imperi (v60): ogni paese della mappa è un impero guidato dall'IA, in guerra
// con tutti, e il giocatore sceglie il suo paese toccandolo sulla mappa.
// uso: cat stub.js game.js imperitest.js > _run.js && node _run.js   (circa un minuto)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 11;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

setAvversari('tutti');
setMapSize('piccola');
newGame();
const tutti = Object.keys(paesiInfo());
assert(placing && !players.p.country, 'a inizio partita il paese non è ancora scelto');
assert(imperiIA().length === tutti.length, `prima della scelta ogni paese è un impero IA (${imperiIA().length})`);
assert(imperiIA().every(o => players[o].country === o && capitaleDi(o) && capitaleDi(o).country === o),
  'ogni impero ha la sua capitale nel suo paese');
assert(new Set(imperiIA().map(o => players[o].color)).size > tutti.length * 0.8, 'gli imperi hanno colori diversi');

// 1. si sceglie toccando la mappa: il paese toccato diventa tuo, gli altri restano IA
const tocca = cc => onTileClick(map.flat().find(t => t.country === cc && passable(t) && !t.city));
tocca('DE');
assert(players.p.country === 'DE' && !players.DE && imperiIA().length === tutti.length - 1, 'toccata la Germania: è tua, non più dell\'IA');
assert(placeSet.length && placeSet.every(t => t.country === 'DE'), 'le caselle per la capitale sono in Germania');
tocca('IT');
assert(players.p.country === 'IT' && players.DE && players.DE.vivo && capitaleDi('DE'), 'cambiando paese la Germania torna un impero IA');
const caps = imperiIA().map(capitaleDi);
assert(placeSet.every(t => caps.every(c => dist(t, c) >= 5)), 'la tua capitale nasce lontana dalle capitali vicine');
placePlayerCapital(placeSet[Math.floor(placeSet.length / 2)]);
assert(!placing && pCapital().country === 'IT', 'capitale fondata in Italia');

// 2. la caduta di un impero: chi ne prende la capitale la tiene, il resto si scioglie
const vittima = 'FR', capF = capitaleDi(vittima);
const altra = map.flat().find(t => t.country === 'FR' && t !== capF && paeseLibero(t) && passable(t));
altra.city = { owner: vittima, capital: false, pop: 2 };
const soldato = map.flat().find(t => t.country === 'FR' && paeseLibero(t) && passable(t));
soldato.unit = mkUnit('warrior', vittima);
capF.unit = null;
const vicino = neighbors(capF).find(n => passable(n) && !n.unit && !n.city);
vicino.unit = mkUnit('knight', 'p');
pushUndo();
doMove(vicino, capF);
assert(!players.FR.vivo && !imperiIA().includes('FR') && caduti.includes('FR'), 'presa la capitale, la Francia cade');
assert(capF.city.owner === 'p' && !capF.city.capital, 'la capitale presa diventa una tua città qualunque');
assert(altra.city.owner === null && !unitsOf('FR').length, "le altre città francesi tornano villaggi liberi e l'esercito si scioglie");
assert(!gameOver, 'la partita continua: restano altri imperi');
undoMove();
assert(players.FR.vivo && capitaleDi('FR') === capF && altra.city.owner === 'FR', "annullando la mossa la Francia torna in piedi");
altra.city = null; soldato.unit = null;

// 3. la cronaca racconta le mosse vicino a te, non quelle lontane
const ospite = imperiIA()[0];
const qui = map.flat().find(t => paeseLibero(t) && passable(t) && t.terrain !== 'river' && dist(t, pCapital()) >= 2 && dist(t, pCapital()) <= 4);
qui.unit = mkUnit('knight', ospite);
endTurn();
assert(aiLog.some(s => s.startsWith(bandiera(ospite))), `la cronaca mostra la mossa di ${nomePaese(ospite)} vicino a te`);
const lontani = new Set(imperiIA().filter(o => o !== ospite && cities(o).every(c => dist(c, pCapital()) > 40)));
assert(!aiLog.some(s => [...lontani].some(o => s.startsWith(bandiera(o)))), 'e non quelle degli imperi lontani');

// 4. il giro dei turni: tutti gli imperi muovono, senza errori e in tempi ragionevoli
let lento = 0, presi = 0;
const t0 = Date.now();
try {
  for (let i = 0; i < 40 && !gameOver; i++) {
    const a = Date.now();
    endTurn();
    lento = Math.max(lento, Date.now() - a);
  }
} catch (e) { console.error('CRASH', e.stack); process.exit(1); }
console.log(`40 turni in ${Date.now() - t0} ms (il più lento ${lento} ms); imperi in piedi ${imperiIA().length}, caduti: ${caduti.join(' ')}`);
assert(current === 'p' && turn === 42 && !gameOver, 'dopo 40 turni tocca di nuovo a te');
const ci = imperiIA().reduce((s, o) => s + cities(o).length, 0);
assert(ci > imperiIA().length * 1.5, `gli imperi si espandono (${ci} città IA)`);
assert(lento < 5000, `nessun turno degli imperi troppo lento (${lento} ms)`);
assert(map.flat().every(t => !t.unit || players[t.unit.owner]), 'nessuna unità di un impero inesistente');
assert(imperiIA().every(o => capitaleDi(o)), 'ogni impero in piedi ha ancora la sua capitale');

// 5. salvataggio v17: tutti gli imperi, con stelle e caduti, tornano uguali
const data = serialize();
assert(data.v === 17 && data.modo === 'tutti' && data.imperi.length === imperiIA().length, 'il salvataggio v17 contiene tutti gli imperi');
const prima = JSON.stringify({ imp: imperiIA(), st: imperiIA().map(o => players[o].stars), c: imperiIA().map(o => cities(o).length), cad: caduti });
newGame();
assert(applySave(data) && modoPartita === 'tutti', 'il salvataggio si ricarica');
const dopo = JSON.stringify({ imp: imperiIA(), st: imperiIA().map(o => players[o].stars), c: imperiIA().map(o => cities(o).length), cad: caduti });
assert(prima === dopo, 'imperi, stelle, città e caduti identici dopo il caricamento');
try { endTurn(); } catch (e) { console.error('CRASH', e.stack); process.exit(1); }
assert(current === 'p', 'dopo il caricamento i turni proseguono');

// 6. vittoria: quando cadono tutti gli imperi
for (const o of imperiIA()) { const c = capitaleDi(o); c.unit = null; captureIfCity(c, 'p'); }
checkEnd();
assert(gameOver && !imperiIA().length, 'caduti tutti gli imperi, hai vinto');
console.log('TUTTI I TEST IMPERI SUPERATI');
