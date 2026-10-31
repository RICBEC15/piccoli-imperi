// Test dei cheat (v77): conquistare un impero, mettere una truppa ovunque,
// porti e ponti senza Costruttore e gratis. Controlla anche che si possano annullare,
// che il salvataggio li conservi e che la fine partita segua le regole di sempre.
// uso: cat stub.js game.js cheattest.js > _run.js && node _run.js
let passati = 0, falliti = 0;
function prova(nome, fn) {
  try {
    const r = fn();
    if (r === true) { passati++; console.log('OK: ' + nome); }
    else { falliti++; console.log('FALLITO: ' + nome + (r ? ' :: ' + r : '')); }
  } catch (e) { falliti++; console.log('FALLITO (eccezione): ' + nome + ' :: ' + e.stack); }
}
function partita() {
  setMapSize('piccola');
  newGame();
  cambiaPaese('IT');
  tutorial = false;
  if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
  deselect(); undoStack = [];
}
const libera = (f) => map.flat().find(t => !t.unit && !t.city && !t.port && !t.hosp && f(t));
const giro = () => applySave(JSON.parse(JSON.stringify(serialize())));

partita();

prova('conquista di un impero: città, territorio, porti; il suo esercito sparisce', () => {
  const o = 'FR';
  if (!players[o] || !players[o].vivo) return 'la Francia non è in gioco';
  const sueCitta = cities(o), sueCaselle = map.flat().filter(t => terraConquistabile(t) && padroneTerra(t) === o);
  const cittaP = cities('p').length, stelle = players.p.stars;
  if (!cheatConquista(o)) return 'cheatConquista ha rifiutato';
  if (imperiIA().includes(o)) return "l'impero è ancora vivo";
  if (!sueCitta.every(t => t.city.owner === 'p' && !t.city.capital)) return 'non tutte le città sono passate a te (o resta una capitale)';
  if (cities('p').length !== cittaP + sueCitta.length) return 'conto città sbagliato';
  if (!sueCaselle.every(t => padroneTerra(t) === 'p')) return 'territorio non tutto tuo';
  if (unitsOf(o).length) return 'restano unità francesi';
  if (players.p.stars !== stelle) return 'le stelle sono cambiate';
  if (gameOver) return 'la partita è finita con altri imperi ancora in piedi';
  if (!caduti.includes(o)) return 'manca fra i caduti';
  return true;
});

prova('la conquista resta dopo salvataggio e caricamento', () => {
  const c = cities('p').length;
  if (!giro()) return 'caricamento fallito';
  if (imperiIA().includes('FR')) return 'la Francia è tornata';
  if (cities('p').length !== c) return 'città perse';
  if (!map.flat().filter(t => t.country === 'FR' && terraConquistabile(t)).every(t => padroneTerra(t) === 'p')) return 'territorio perso';
  return true;
});

prova('la conquista si annulla', () => {
  partita();
  const o = 'ES', c = cities(o).length;
  cheatConquista(o);
  undoMove();
  if (!imperiIA().includes(o)) return "la Spagna non è tornata";
  if (cities(o).length !== c) return 'città non tornate';
  if (!capitaleDi(o)) return 'la capitale non è tornata';
  return true;
});

prova('una Grande armata di 50 cavalieri su una casella lontana, pronta a muovere', () => {
  partita();
  const t = libera(x => x.country === 'DE' && x.terrain === 'grass' && neighbors(x).every(n => n.terrain === 'grass' && !n.unit));
  if (!cheatMettiTruppa(t, 'knight', 50)) return 'rifiutata';
  const u = t.unit;
  if (!u || u.owner !== 'p' || u.count !== 50 || u.hp !== 500 || u.maxHp !== 500) return 'truppa sbagliata ' + JSON.stringify(u);
  if (aliveCount(u) !== 50) return 'aliveCount ' + aliveCount(u);
  if (!movesFor(t).length) return 'non può muovere';
  if (relazione('p', 'DE') === 'guerra' && padroneTerra(t) !== 'p') return 'in guerra la casella doveva diventare tua';
  if (!giro()) return 'caricamento fallito';
  const v = map[t.r][t.c].unit;
  if (!v || v.count !== 50 || v.type !== 'knight') return 'persa nel salvataggio';
  return true;
});

prova('nave di livello 11 sul mare; niente navi sulla terra, niente soldati in mare', () => {
  const mare = map.flat().find(t => t.terrain === 'water' && !t.unit && !t.bridge);
  const terra = libera(x => x.terrain === 'grass');
  if (cheatMettiTruppa(terra, 'ship', 1, 11)) return 'nave sulla terra';
  if (cheatMettiTruppa(mare, 'warrior', 3)) return 'guerrieri in mare';
  if (!cheatMettiTruppa(mare, 'ship', 1, 11)) return 'nave rifiutata';
  if (mare.unit.lvl !== 11 || navCap(mare.unit.lvl) !== 50) return 'livello ' + mare.unit.lvl;
  if (!giro() || map[mare.r][mare.c].unit.lvl !== 11) return 'livello perso nel salvataggio';
  return true;
});

prova('limiti: medici e costruttori uno alla volta, civili fino a 6, guerrieri fino a 50', () => {
  const a = libera(x => x.terrain === 'grass' && x.country === 'IT');
  cheatMettiTruppa(a, 'medic', 9);
  if (a.unit.count !== 1) return 'medico ×' + a.unit.count;
  cheatMettiTruppa(a, 'citizen', 99); // sostituisce la tua unità
  if (a.unit.count !== 6) return 'cittadini ×' + a.unit.count;
  cheatMettiTruppa(a, 'warrior', 999);
  if (a.unit.count !== 50) return 'guerrieri ×' + a.unit.count;
  return true;
});

prova("la truppa va anche sopra un'unità nemica (che sparisce) e nella città di chi è in pace con te", () => {
  const tn = unitsOf(imperiIA().find(x => unitsOf(x).length))[0];
  if (!cheatMettiTruppa(tn, tn.terrain === 'water' || (tn.terrain === 'river' && !tn.bridge) ? 'ship' : 'warrior', 5)) return "rifiutata sull'unità nemica";
  if (tn.unit.owner !== 'p') return 'unità nemica ancora lì';
  const c = map.flat().find(x => x.city && x.city.owner && x.city.owner !== 'p' && !x.city.capital && !x.unit);
  setRelazione('p', c.city.owner, 'pace');
  if (!cheatMettiTruppa(c, 'citizen', 2)) return 'rifiutata nella città di un impero in pace';
  if (c.city.owner !== 'p') return 'città non presa';
  return true;
});

prova("una truppa messa nella città di un nemico in guerra la conquista; sulla capitale l'impero cade", () => {
  partita();
  const o = imperiIA().find(x => relazione('p', x) === 'guerra' && capitaleDi(x));
  if (!o) return 'nessun impero in guerra (partita in pace?)';
  const cap = capitaleDi(o);
  cap.unit = null;
  if (!cheatMettiTruppa(cap, 'warrior', 10)) return 'rifiutata';
  if (cap.city.owner !== 'p') return 'capitale non presa';
  if (imperiIA().includes(o)) return "l'impero non è caduto";
  return true;
});

prova('porto gratis senza Costruttore, sulla costa', () => {
  partita();
  const t = libera(x => x.terrain === 'grass' && x.country === 'IT' && neighbors(x).some(n => n.terrain === 'water'));
  const dentro = libera(x => x.terrain === 'grass' && neighbors(x).every(n => n.terrain !== 'water' && n.terrain !== 'river'));
  const stelle = players.p.stars, rendita = income('p');
  if (cheatPorto(dentro)) return 'porto lontano dal mare';
  if (!cheatPorto(t)) return 'porto rifiutato';
  if (!t.port || t.port.owner !== 'p') return 'manca il porto';
  if (players.p.stars !== stelle) return 'è costato stelle';
  if (income('p') !== rendita + PORT_INCOME) return 'il porto non rende';
  if (cheatPorto(t)) return 'secondo porto sulla stessa casella';
  return true;
});

prova('ponte gratis su fiume e sul mare, attraversabile; si annulla', () => {
  const fiume = map.flat().find(t => t.terrain === 'river' && !t.bridge && !t.unit);
  const mare = map.flat().find(t => t.terrain === 'water' && !t.bridge && !t.unit);
  const terra = libera(x => x.terrain === 'grass');
  const stelle = players.p.stars;
  if (cheatPonte(terra)) return 'ponte sulla terra';
  if (!cheatPonte(fiume) || !fiume.bridge || !passable(fiume)) return 'ponte sul fiume';
  if (!cheatPonte(mare) || !mare.bridge) return 'ponte sul mare';
  if (players.p.stars !== stelle) return 'è costato stelle';
  if (!giro() || !map[fiume.r][fiume.c].bridge) return 'ponte perso nel salvataggio';
  cheatPonte(map[mare.r][mare.c] === mare ? mare : map.flat().find(t => t.terrain === 'water' && !t.bridge));
  undoMove();
  return true;
});

prova('i cheat non si usano nel turno del nemico, nel tutorial e a partita finita', () => {
  partita();
  const t = libera(x => x.terrain === 'grass' && x.country === 'IT');
  current = imperiIA()[0];
  if (cheatPronto() === '') return 'pronto nel turno IA';
  if (cheatConquista(imperiIA()[0])) return 'conquista nel turno IA';
  current = 'p'; tutorial = true;
  if (cheatPronto() === '') return 'pronto nel tutorial';
  tutorial = false; gameOver = true;
  if (cheatPronto() === '') return 'pronto a partita finita';
  gameOver = false;
  cheatModo = 'truppa';
  current = imperiIA()[0];
  onTileClick(t);
  current = 'p';
  if (t.unit) return 'il tocco nel turno IA ha messo una truppa';
  cheatModo = null;
  return true;
});

prova('il tocco sulla mappa con un cheat scelto usa il cheat (non seleziona)', () => {
  const t = libera(x => x.terrain === 'grass' && x.country === 'IT');
  cheatModo = 'truppa';
  onTileClick(t);
  const ok = t.unit && t.unit.owner === 'p';
  cheatModo = null;
  return ok ? true : 'nessuna truppa';
});

prova('conquistare tutti gli imperi fa vincere (ultimo rimasto)', () => {
  partita();
  for (const o of imperiIA()) cheatConquista(o);
  if (imperiIA().length) return 'restano ' + imperiIA().length;
  if (!gameOver) return 'la partita non è finita';
  if (!pCapital()) return 'hai perso la capitale';
  return document.getElementById('ovTitle').textContent.includes('VITTORIA') ? true : 'non è una vittoria';
});

console.log(`\n${passati} passati, ${falliti} falliti`);
if (falliti) process.exit(1);
