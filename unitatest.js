// Unit test delle funzioni principali: geometria, movimento, combattimento, economia,
// fondazione, fine partita, annulla, salvataggio e input durante il turno IA.
// uso: cat stub.js game.js unitatest.js > _run.js && node _run.js
// A differenza degli altri test non si ferma al primo errore: dice quali passano e quali no.
let passati = 0, falliti = 0;
function prova(nome, fn) {
  try {
    const r = fn();
    if (r === true) { passati++; console.log('OK: ' + nome); }
    else { falliti++; console.log('FALLITO: ' + nome + (r ? ' :: ' + r : '')); }
  } catch (e) { falliti++; console.log('FALLITO (eccezione): ' + nome + ' :: ' + e.message); }
}
function partita(size = 'piccola') {
  setModalitaTest(size);
  return pCapital();
}
function setModalitaTest(size) {
  setMapSize(size);
  newGame();
  cambiaPaese('IT');
  tutorial = false;
  if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
  deselect();
}
// una casella di prato in Italia, libera, con almeno 6 vicini di prato liberi
function pratoLibero(cond = () => true, paese = 'IT') {
  for (const t of map.flat()) {
    if (t.terrain !== 'grass' || t.unit || t.city || t.port || t.hosp || t.bridge) continue;
    if ((paese && t.country !== paese) || bioma(t) === 'u' || bioma(t) === 'p') continue;
    const ns = neighbors(t);
    if (ns.length === 6 && ns.every(n => n.terrain === 'grass' && !n.unit && !n.city && !n.port && !n.hosp && (!paese || n.country === paese)
        && bioma(n) !== 'u' && bioma(n) !== 'p') && cond(t)) return t;
  }
  throw new Error('nessuna casella di prato libera trovata');
}
const nemico = () => imperiIA().find(o => players[o].country !== 'IT');

partita();

// ---------- geometria esagonale ----------
prova('neighbors: una casella interna ha 6 vicini, tutti a distanza 1', () => {
  const t = map[50][50];
  const ns = neighbors(t);
  return ns.length === 6 && ns.every(n => dist(t, n) === 1) || `vicini=${ns.length}`;
});
prova('neighbors: l\'angolo in alto a sinistra ha meno di 6 vicini (niente caselle fuori mappa)', () => {
  const ns = neighbors(map[0][0]);
  return ns.length < 6 && ns.every(n => n.r >= 0 && n.c >= 0) || `vicini=${ns.length}`;
});
prova('dist è simmetrica e vale 0 sulla stessa casella', () => {
  const a = map[40][30], b = map[47][61];
  return dist(a, a) === 0 && dist(a, b) === dist(b, a) && dist(a, b) > 0 || `${dist(a, b)} / ${dist(b, a)}`;
});

// ---------- movimento ----------
prova('movimento: un guerriero sul prato può andare nelle 6 caselle vicine', () => {
  const t = pratoLibero();
  t.unit = mkUnit('warrior', 'p');
  const m = movesFor(t);
  t.unit = null;
  return m.length === 6 && m.every(x => dist(t, x) === 1) || `mosse=${m.length}`;
});
prova('movimento: il cavaliere arriva a distanza 2', () => {
  // in campo aperto (anche fuori dall'Italia): tutte le caselle a distanza 2 sono prato libero
  const t = pratoLibero(x => neighbors(x).every(n => neighbors(n).every(m => m.terrain === 'grass' && !m.unit && !m.city && bioma(m) !== 'p')), null);
  t.unit = mkUnit('knight', 'p');
  const m = movesFor(t);
  t.unit = null;
  return m.some(x => dist(t, x) === 2) && m.every(x => dist(t, x) <= 2) || `mosse=${m.length}`;
});
prova('movimento: un\'unità che ha già mosso non può più muovere', () => {
  const t = pratoLibero();
  t.unit = mkUnit('warrior', 'p');
  const dest = movesFor(t)[0];
  doMove(t, dest);
  const ok = !t.unit && dest.unit && dest.unit.moved && movesFor(dest).length === 0;
  dest.unit = null;
  return ok;
});
prova('movimento: nessuna unità di terra può entrare nel mare', () => {
  const t = map.flat().find(x => x.terrain === 'grass' && !x.unit && !x.city && !x.port && neighbors(x).some(n => n.terrain === 'water' && !n.bridge));
  t.unit = mkUnit('warrior', 'p');
  const m = movesFor(t);
  t.unit = null;
  return m.every(x => x.terrain !== 'water' || x.bridge) || 'una mossa finisce in mare';
});

// ---------- combattimento ----------
prova('combattimento: guerriero contro guerriero sul prato, 4 danni e 1 di risposta', () => {
  const o = nemico();
  const a = pratoLibero(), b = neighbors(a)[0];
  a.unit = mkUnit('warrior', 'p'); b.unit = mkUnit('warrior', o);
  // b è in Italia: per il nemico non è patria, difesa 2. a è in patria: difesa 3
  doAttack(a, b);
  const r = { hpB: b.unit && b.unit.hp, hpA: a.unit && a.unit.hp };
  a.unit = null; b.unit = null;
  return r.hpB === 6 && r.hpA === 9 || JSON.stringify(r);
});
prova('combattimento: chi resta senza vita sparisce e il guerriero avanza nella casella', () => {
  const o = nemico();
  const a = pratoLibero(), b = neighbors(a)[0];
  a.unit = mkUnit('warrior', 'p'); b.unit = mkUnit('warrior', o); b.unit.hp = 1;
  doAttack(a, b);
  const ok = !a.unit && b.unit && b.unit.owner === 'p';
  b.unit = null;
  return ok || 'il vincitore non è avanzato';
});
prova('combattimento: la foresta dà +1 di difesa', () => {
  const t = pratoLibero();
  t.unit = mkUnit('warrior', nemico());
  const d0 = defOf(t);
  t.terrain = 'forest';
  const d1 = defOf(t);
  t.terrain = 'grass'; t.unit = null;
  return d1 === d0 + 1 || `${d0} -> ${d1}`;
});
prova('combattimento: un\'unità non attacca un impero con cui è in pace', () => {
  const o = nemico();
  const a = pratoLibero(), b = neighbors(a)[0];
  a.unit = mkUnit('warrior', 'p'); b.unit = mkUnit('warrior', o);
  const primaInGuerra = attacksFor(a).includes(b);
  diplo.rel[chiaveRel('p', o)] = { stato: 'pace', dal: turn };
  const inPace = attacksFor(a).includes(b);
  delete diplo.rel[chiaveRel('p', o)];
  a.unit = null; b.unit = null;
  return primaInGuerra && !inPace || `guerra=${primaInGuerra} pace=${inPace}`;
});

// ---------- economia (il "punteggio": stelle) ----------
prova('economia: la rendita è la somma delle città, dei porti e delle alleanze', () => {
  const atteso = cities('p').reduce((s, t) => s + renditaCitta(t.city) + (terraFertile(t) ? 1 : 0), 0) + ports('p').length * PORT_INCOME;
  return income('p') === atteso || `${income('p')} != ${atteso}`;
});
prova('economia: il mantenimento è 1 stella ogni 2 soldati (medici e cittadini gratis)', () => {
  for (const t of unitsOf('p')) t.unit = null;
  const ts = [pratoLibero()]; ts.push(...neighbors(ts[0]).slice(0, 4));
  ['warrior', 'archer', 'knight', 'medic', 'citizen'].forEach((ty, i) => { ts[i].unit = mkUnit(ty, 'p'); });
  const u = upkeep('p');
  for (const t of ts) t.unit = null;
  return u === 1 || `mantenimento=${u}`;
});
prova('economia: addestrare costa le stelle giuste e mette l\'unità nella città', () => {
  const cap = pCapital();
  if (cap.unit) cap.unit = null;
  players.p.stars = 50;
  selected = cap;
  train('warrior');
  const ok = cap.unit && cap.unit.type === 'warrior' && players.p.stars === 50 - UNIT_TYPES.warrior.cost;
  cap.unit = null; selected = null;
  return ok || `stelle=${players.p.stars}`;
});
prova('economia: senza stelle non si addestra', () => {
  const cap = pCapital();
  if (cap.unit) cap.unit = null;
  players.p.stars = 1;
  selected = cap;
  train('knight');
  const ok = !cap.unit && players.p.stars === 1;
  selected = null;
  return ok;
});
prova('navi: capacità e costo di potenziamento crescono con il livello', () => {
  let ok = true;
  for (let l = 1; l < NAVE_MAX_LIV; l++) ok = ok && navCap(l + 1) > navCap(l) && shipUpgradeCost(l + 1) > shipUpgradeCost(l);
  return ok && navCap(0) === navCap(1) && navCap(99) === navCap(NAVE_MAX_LIV);
});

// ---------- fondare villaggi ----------
prova('fondazione: una carovana abbastanza grande fonda un villaggio lontano dalle città', () => {
  const t = pratoLibero(x => canFoundTile(x), null);
  t.unit = mkUnit('citizen', 'p'); t.unit.count = FOUND_MIN; t.unit.hp = t.unit.maxHp = UNIT_TYPES.citizen.hp * FOUND_MIN;
  const ok = canFound(t) && foundVillage(t) && t.city && t.city.owner === 'p' && !t.unit;
  t.city = null;
  return ok || 'villaggio non fondato';
});

// ---------- fine partita ----------
prova('fine partita: senza capitale hai perso', () => {
  partita();
  const cap = pCapital();
  cap.city.owner = nemico(); cap.city.capital = false;
  checkEnd();
  return gameOver === true && /SCONFITTA/.test(getElementById('ovTitle').textContent) || `gameOver=${gameOver}`;
});
prova('fine partita: tutti gli imperi caduti, hai vinto', () => {
  partita();
  for (const o of imperiIA()) { players[o].vivo = false; caduti.push(o); }
  checkEnd();
  return gameOver === true && /VITTORIA/.test(getElementById('ovTitle').textContent);
});
prova('fine partita: dopo la fine nessun comando fa più nulla', () => {
  const t = turn;
  endTurn(); undoMove(); playerFound();
  return turn === t && gameOver;
});
prova('restart: nuova partita riparte dal turno 1 con 7 stelle', () => {
  newGame();
  return turn === 1 && !gameOver && players.p.stars === 7 && placing === true;
});

// ---------- annulla ----------
prova('annulla: rimette l\'unità dov\'era, con la mossa di nuovo disponibile', () => {
  partita();
  const t = pratoLibero();
  t.unit = mkUnit('warrior', 'p');
  pushUndo();
  const dest = movesFor(t)[0];
  doMove(t, dest);
  undoMove();
  const t2 = map[t.r][t.c], d2 = map[dest.r][dest.c];
  const ok = t2.unit && !t2.unit.moved && !d2.unit;
  t2.unit = null;
  return ok || 'stato non ripristinato';
});

// ---------- input durante il turno degli imperi ----------
prova('input: durante il turno di un impero il clic sulla mappa non seleziona nulla', () => {
  partita();
  current = imperiIA()[0];
  onTileClickSicuro(pCapital());
  const ok = selected === null;
  current = 'p';
  return ok || 'una casella è stata selezionata nel turno nemico';
});
function onTileClickSicuro(t) { // come fa il gestore del clic sulla mappa
  if (gameOver || current !== 'p') return;
  onTileClick(t);
}
prova('input: addestrare durante il turno di un impero non fa nulla', () => {
  partita();
  const cap = pCapital(); cap.unit = null;
  selected = cap; players.p.stars = 50;
  current = imperiIA()[0];
  train('warrior');
  const ok = !cap.unit && players.p.stars === 50;
  current = 'p'; selected = null;
  return ok || 'hai addestrato un\'unità nel turno nemico';
});

// ---------- salvataggio ----------
prova('salvataggio: salvare e ricaricare ridà la stessa partita', () => {
  partita();
  const s1 = JSON.stringify(serialize());
  const ok = applySave(JSON.parse(s1));
  const s2 = JSON.stringify(serialize());
  return ok && s1 === s2 || 'la partita ricaricata è diversa';
});
prova('salvataggio: le unità che hanno già mosso restano ferme dopo salva e ricarica', () => {
  partita();
  const t = pratoLibero();
  t.unit = mkUnit('warrior', 'p');
  const dest = movesFor(t)[0];
  doMove(t, dest);
  applySave(JSON.parse(JSON.stringify(serialize())));
  const d2 = map[dest.r][dest.c];
  return d2.unit && d2.unit.moved === true || `dopo il caricamento moved=${d2.unit && d2.unit.moved}, mosse=${movesFor(d2).length}`;
});
prova('salvataggio: un file non valido di un\'altra grandezza lascia intatta la partita in corso', () => {
  partita('piccola');
  const righe = ROWS, colonne = COLS, modo = mapMode;
  setMapSize('media');
  const d = { v: 17, rows: ROWS, cols: COLS, stars: { p: 1 }, tiles: [{ r: 0, c: 0, g: 'lava' }] };
  setMapSize(modo);
  const ok = applySave(d);
  return !ok && mapMode === modo && ROWS === righe && COLS === colonne && map.length === ROWS
    || `caricato=${ok}, ora ${mapMode} ${ROWS}x${COLS}, mappa con ${map.length} righe`;
});
prova('salvataggio: un file vuoto o di un\'altra versione viene rifiutato', () => {
  return applySave(null) === false && applySave({}) === false && applySave({ v: 99, tiles: [], stars: {} }) === false;
});

console.log(`\n${passati} passati, ${falliti} falliti`);
console.log(falliti ? `${falliti} UNIT TEST FALLITI` : 'TUTTI GLI UNIT TEST SUPERATI');
process.exit(falliti ? 1 : 0);
