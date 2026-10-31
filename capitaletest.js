// Test della capitale occupata (v79): chi prende la capitale di un impero in guerra e la tiene
// per CAPITALE_TURNI turni (una settimana) si prende tutto il paese.
//  1. presa la capitale l'impero non cade subito: parte il conto (Annulla, salvataggio);
//  2. tenuta 7 turni: città, porti, ospedali e territorio passano al vincitore, l'esercito si scioglie;
//  3. ripresa prima: torna capitale e il conto si annulla; presa da un terzo: il conto riparte;
//  4. in pace il conto è fermo, e finché uno tiene la capitale dell'altro non si fa la pace;
//  5. la tua capitale: non perdi subito, perdi dopo 7 turni (o la riprendi);
//  6. i salvataggi di prima si caricano come prima;
//  7. l'IA (Facile, Normale, Difficile) va a riprendersi la capitale e presidia quella che ha preso.
// uso: cat stub.js game.js capitaletest.js > _run.js && node _run.js   (circa un minuto)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 5;
const casuale = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
Math.random = casuale;

function partita(liv = 'normale') {
  setAvversari('tutti');
  setDifficolta(liv);
  setMapSize('piccola');
  newGame();
  cambiaPaese('IT');
  tutorial = false;
  if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
  nuovaDiplomazia(); // (dalla v75 si parte in pace: qui tutti in guerra con tutti, come prima)
  assert(!placing && pCapital(), `partita nuova (${aiDiff().nome})`);
}
// una casella libera accanto a t (non città, non montagna)
function accanto(t) { return neighbors(t).find(n => passable(n) && !n.unit && !n.city && !n.port && !n.hosp && n.terrain !== 'mountain'); }
// prende la capitale di o con un cavaliere di chi
function prendi(o, chi = 'p') {
  const c = capitaleOccupata(o) || capitaleDi(o);
  c.unit = null;
  const v = accanto(c);
  const u = mkUnit('knight', chi); u.count = 3; u.maxHp = u.hp = UNIT_TYPES.knight.hp * 3;
  v.unit = u;
  doMove(v, c);
  return c;
}
const turni = n => { for (let i = 0; i < n; i++) avanzaOccupazioni(); };

// ---------- 1. presa la capitale, parte il conto ----------
partita();
const capF = capitaleDi('FR');
const altraF = cities('FR').find(t => t !== capF);
assert(altraF, 'la Francia ha altre città oltre a Parigi');
const nCittaF = cities('FR').length;
const soldatoF = map.flat().find(t => t.country === 'FR' && paeseLibero(t) && passable(t) && dist(t, capF) > 3);
soldatoF.unit = mkUnit('warrior', 'FR');
pushUndo();
prendi('FR');
assert(players.FR.vivo && imperiIA().includes('FR'), 'presa Parigi la Francia non cade subito');
assert(capF.city.owner === 'p' && !capF.city.capital && capF.city.occ && capF.city.occ.o === 'FR' && capF.city.occ.n === 0,
  'Parigi è tua, segnata come capitale occupata della Francia (0 turni)');
assert(!capitaleDi('FR') && capitaleOccupata('FR') === capF && capitaliTenute('p').includes(capF), 'la Francia non ha più capitale');
assert(/Tienila per 7 turni/.test(getElementById('msg').textContent), 'il messaggio spiega il conto: ' + getElementById('msg').textContent);
assert(altraF.city.owner === 'FR' && soldatoF.unit && soldatoF.unit.owner === 'FR', 'il resto della Francia per ora resta francese');
assert(!gameOver, 'la partita continua');
selected = capF; ui();
assert(/0\/7/.test(getElementById('panel').innerHTML) && /tienila ancora 7 turni/.test(getElementById('panel').innerHTML), 'il pannello della città mostra il conto: 0/7');
render();
assert(true, 'la mappa si disegna con il conto alla rovescia');
undoMove();
assert(capitaleDi('FR') === capF && capF.city.owner === 'FR' && !capF.city.occ, 'Annulla: Parigi torna capitale francese');
prendi('FR');

// salvataggio e caricamento tengono il conto
turni(3);
assert(capF.city.occ.n === 3 && restanoTurni(capF) === 4, 'dopo 3 turni ne restano 4');
assert(/Tieni .*ancora 4 turni/.test(notaOccupazioni()), 'il promemoria di inizio turno: ' + notaOccupazioni());
const dati = JSON.parse(JSON.stringify(serialize()));
const sc = dati.caselle.find(x => x.r === capF.r && x.c === capF.c);
assert(sc.y.x && sc.y.x[0] === 'FR' && sc.y.x[1] === 3 && !sc.y.k, 'il salvataggio scrive la capitale occupata');
newGame();
assert(applySave(dati), 'il salvataggio si ricarica');
const capF2 = map[capF.r][capF.c];
assert(players.FR.vivo && capF2.city.owner === 'p' && capF2.city.occ && capF2.city.occ.n === 3 && !caduti.includes('FR'),
  'dopo il caricamento la Francia è viva e il conto è a 3');

// ---------- 2. tenuta 7 turni: tutto il paese passa a te ----------
{
  const cap = capF2;
  const porto = ports('FR')[0];
  const terreF = map.flat().filter(t => padroneTerra(t) === 'FR').length;
  // una casella italiana presa dalla Francia: torna tua; una tedesca presa dalla Francia: diventa tua
  const it = map.flat().find(t => t.country === 'IT' && paeseLibero(t) && passable(t));
  it.terra = 'FR';
  const de = map.flat().find(t => t.country === 'DE' && paeseLibero(t) && passable(t));
  de.terra = 'FR';
  const unitaF = map.flat().find(t => t.country === 'FR' && paeseLibero(t) && passable(t) && dist(t, cap) > 3);
  unitaF.unit = mkUnit('archer', 'FR');
  const cittaF = cities('FR').length;
  turni(3);
  assert(players.FR.vivo && cap.city.occ.n === 6, 'a 6 turni la Francia è ancora in piedi');
  turni(1);
  assert(!players.FR.vivo && caduti.includes('FR') && !imperiIA().includes('FR'), 'al 7° turno la Francia cade');
  assert(cities('FR').length === 0 && cities('p').length >= cittaF + 1 + paesiInfo().IT.vill, `le ${cittaF} città francesi sono tue`);
  assert(!cap.city.occ && !cap.city.capital && cap.city.owner === 'p', 'Parigi resta tua (non è la tua capitale)');
  assert(!unitsOf('FR').length && !unitaF.unit, "l'esercito francese si scioglie");
  assert(!porto || porto.port.owner === 'p', 'i porti francesi sono tuoi');
  assert(map.flat().filter(t => t.country === 'FR' && terraConquistabile(t)).every(t => padroneTerra(t) !== null && padroneTerra(t) !== 'FR'),
    'nessuna casella francese resta senza padrone');
  assert(map.flat().filter(t => t.country === 'FR' && padroneTerra(t) === 'p').length >= terreF * 0.95, `il territorio francese (${terreF} caselle) è tuo`);
  assert(padroneTerra(it) === 'p' && !it.terra, 'la casella italiana che la Francia ti aveva preso torna tua');
  assert(padroneTerra(de) === 'p', 'la casella tedesca che la Francia aveva preso diventa tua');
  assert(/il paese è tuo/.test(getElementById('msg').textContent), 'messaggio: ' + getElementById('msg').textContent);
  assert(!gameOver, 'la partita continua: restano altri imperi');
  render();
}

// ---------- 3. ripresa prima del tempo / presa da un terzo ----------
partita();
{
  const capD = prendi('DE');
  turni(4);
  prendi('DE', 'DE');
  assert(capitaleDi('DE') === capD && capD.city.capital && !capD.city.occ, 'la Germania riprende Berlino: è di nuovo la sua capitale');
  turni(10);
  assert(players.DE.vivo, 'e il conto non va più avanti');
  const capE = prendi('ES');
  turni(5);
  prendi('ES', 'FR');
  assert(capE.city.owner === 'FR' && capE.city.occ.o === 'ES' && capE.city.occ.n === 0, 'la Francia toglie Madrid a te: il conto riparte da zero per lei');
  turni(6);
  assert(players.ES.vivo, 'a 6 turni la Spagna resiste');
  turni(1);
  assert(!players.ES.vivo && cities('ES').length === 0 && cities('FR').some(t => t.country === 'ES'), 'al 7° la Spagna è francese');
  assert(/Spagna è caduto/.test(aiLog.join(' ')), 'la cronaca racconta la caduta');
}

// ---------- 4. in pace il conto è fermo; niente pace con chi tiene la capitale ----------
{
  const capA = prendi('AT');
  turni(2);
  assert(!proponi('AT', 'pace') && relazione('p', 'AT') === 'guerra' && /non tratta/.test(getElementById('msg').textContent),
    "l'Austria non tratta la pace finché tieni Vienna");
  setRelazione('p', 'AT', 'pace'); // (per esempio una pace di prima: qui forzata)
  turni(10);
  assert(players.AT.vivo && capA.city.occ.n === 2, 'in pace il conto resta fermo');
  assert(/fermo/.test(notaCapitale(capA)), 'il pannello dice che il conto è fermo');
  setRelazione('p', 'AT', 'guerra');
  turni(5);
  assert(!players.AT.vivo, 'tornati in guerra, il conto riprende e l\'Austria cade');
}

// ---------- 5. la tua capitale ----------
partita();
{
  const capI = pCapital(), cittaI = cities('p').length;
  prendi('p', 'FR');
  checkEnd();
  assert(!gameOver && !pCapital() && capitaleOccupata('p') === capI, 'presa Roma non hai ancora perso');
  assert(/riprendila/.test(notaOccupazioni()), 'il promemoria ti dice di riprenderla: ' + notaOccupazioni());
  assert(!proponi('FR', 'pace'), 'la Francia non tratta mentre tiene Roma');
  turni(3);
  prendi('p', 'p');
  assert(pCapital() === capI && !capI.city.occ, 'ripresa Roma: è di nuovo la tua capitale');
  turni(10); checkEnd();
  assert(!gameOver, 'e non perdi più');
  prendi('p', 'FR');
  // Parigi in mano alla Francia, Roma in mano alla Francia: se cade la Francia, Roma torna tua capitale
  const capF = prendi('FR', 'p');
  turni(7);
  assert(!players.FR.vivo && pCapital() === capI && capI.city.capital, 'la Francia cade prima: Roma torna la tua capitale');
  assert(!gameOver, 'la partita continua');
  prendi('p', 'DE');
  turni(6); checkEnd();
  assert(!gameOver, 'a 6 turni sei ancora in gioco');
  turni(1); checkEnd();
  assert(gameOver && /SCONFITTA/.test(getElementById('ovTitle').textContent) && /tenuto la tua capitale/.test(getElementById('ovText').textContent),
    'al 7° turno con Roma in mano tedesca hai perso: ' + getElementById('ovText').textContent);
  assert(cities('p').length === 0, 'e il tuo paese è tedesco');
}

// ---------- 6. i salvataggi di prima ----------
partita();
{
  const capS = capitaleDi('CH');
  const d = JSON.parse(JSON.stringify(serialize()));
  // come nei salvataggi fino alla v74: la capitale presa è una città qualunque, senza il campo x
  const s = d.caselle.find(x => x.r === capS.r && x.c === capS.c);
  s.y.o = 'p'; s.y.k = false; delete s.y.x;
  newGame();
  assert(applySave(d) && !players.CH.vivo && caduti.includes('CH'), 'un vecchio salvataggio: un impero senza capitale è già caduto');
}

// ---------- 7. l'IA ----------
// un turno del solo impero o (con il giro di inizio turno che ne segue)
function turnoDi(o) {
  aiGiro = [o];
  aiPreparaGiro();
  current = o;
  aiTurn(0);
}
for (const liv of ['facile', 'normale', 'difficile']) {
  Math.random = casuale;
  partita(liv);
  // a) la Francia si riprende Parigi: un tuo guerriero ferito dentro, tre cavalieri francesi a pochi passi
  const capF = prendi('FR');
  capF.unit = mkUnit('warrior', 'p'); capF.unit.hp = 3;
  const fuori = map.flat().filter(t => t.country === 'FR' && paeseLibero(t) && passable(t) && t.terrain !== 'mountain'
    && dist(t, capF) >= 3 && dist(t, capF) <= 5).slice(0, 3);
  for (const t of fuori) { const u = mkUnit('knight', 'FR'); u.count = 2; u.maxHp = u.hp = UNIT_TYPES.knight.hp * 2; t.unit = u; }
  let ripresa = -1;
  for (let i = 0; i < 6 && ripresa < 0; i++) {
    turnoDi('FR');
    if (capitaleDi('FR') === capF) ripresa = i + 1;
  }
  assert(ripresa > 0, `${liv}: la Francia si riprende Parigi in ${ripresa} turni (anche durante la tregua)`);
  // b) la Germania tiene Varsavia... qui: la Germania prende Vienna e la presidia
  const capA = prendi('AT', 'DE');
  for (let i = 0; i < 4; i++) turnoDi('DE');
  const pres = capA.unit && capA.unit.owner === 'DE';
  if (aiDiff().presidio) assert(capA.city.owner === 'DE' && pres, `${liv}: la Germania lascia un presidio a Vienna`);
  else assert(capA.city.owner === 'DE' || capitaleDi('AT') === capA, `${liv}: Vienna è ancora tedesca o austriaca`);
  // c) senza capitale l'Austria arruola soldati, non coloni
  if (capA.city.owner === 'DE') {
    players.AT.stars = 40;
    aiMe = 'AT'; aiPreparaTurno();
    const prima = unitsOf('AT').length;
    for (const ct of cities('AT')) if (ct.unit && ct.unit.owner === 'AT') ct.unit = null;
    aiTrainPhase();
    const nuove = unitsOf('AT').filter(t => t.city);
    assert(nuove.length > 0 && nuove.every(t => UNIT_TYPES[t.unit.type].atk > 0 && !UNIT_TYPES[t.unit.type].civil),
      `${liv}: l'Austria senza capitale arruola ${nuove.length} soldati (prima ${prima} unità)`);
    current = 'p'; aiMe = null;
  }
}

// ---------- partita vera: qualche turno di tutti gli imperi senza errori ----------
Math.random = casuale;
partita('difficile');
for (let i = 0; i < 25 && !gameOver; i++) endTurn();
const occ = dallIndice(conCitta, t => t.city.occ);
assert(occ.every(t => t.city.owner && t.city.owner !== t.city.occ.o && t.city.occ.n < CAPITALE_TURNI), `in 25 turni ${occ.length} capitali occupate, tutte coerenti`);
assert(imperiIA().every(o => capitaleDi(o) || capitaleOccupata(o)), 'ogni impero in piedi ha la capitale o una capitale occupata');
console.log('cadute in 25 turni:', caduti.join(' ') || 'nessuna');
console.log('TUTTI I TEST DELLA CAPITALE SUPERATI');
