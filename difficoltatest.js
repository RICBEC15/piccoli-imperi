// Test della difficoltà dell'IA (v56). Con il giocatore fermo e lo stesso seme,
// i tre livelli devono comportarsi in modo misurabilmente diverso, e la difficoltà
// cambiata a metà partita deve valere dal turno nemico successivo.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
// dalla v60 il paese si sceglie toccandolo sulla mappa e di solito ogni paese e' un impero:
// questo test gioca il duello (un solo nemico, come prima) in un paese a caso
setAvversari('duello');
const A = () => imperiIA()[0]; // l'impero nemico
function sceltaACaso() { const l = Object.keys(paesiInfo()); cambiaPaese(l[Math.floor(Math.random() * l.length)]); }

// gioca con il giocatore fermo; cambi = { turno: livello } da applicare durante la partita
function partita(seed, livello, cambi = {}, maxTurni = 90) {
  seme = seed;
  setMapSize('piccola');
  newGame(); sceltaACaso();
  tutorial = false;
  setDifficolta(livello);
  placePlayerCapital(placeSet[0]);
  let al20 = null;
  try {
    for (let i = 0; i < maxTurni && !gameOver; i++) {
      if (cambi[turn]) setDifficolta(cambi[turn]);
      endTurn();
      if (turn === 20) al20 = { soldati: aiSoldati(A()), stelle: players[A()].stars };
    }
  } catch (e) { console.error('CRASH', e.stack); process.exit(1); }
  return { presa: gameOver ? turn : Infinity, al20 };
}

// 1. la rendita dell'IA dipende dalla difficoltà
seme = 1; setMapSize('piccola'); newGame(); sceltaACaso(); placePlayerCapital(placeSet[0]);
const r = {};
for (const l of ['facile', 'normale', 'difficile']) { setDifficolta(l); r[l] = aiEntrata(A()); }
assert(r.difficile === income(A()) && r.facile <= r.normale && r.normale <= r.difficile && r.facile < r.difficile,
  `rendita IA: facile ${r.facile}, normale ${r.normale}, difficile ${r.difficile}`);

// 2. tre partite con lo stesso seme: piu' facile = capitale presa piu' tardi
const esiti = {};
for (const l of ['facile', 'normale', 'difficile']) {
  esiti[l] = partita(5, l);
  console.log(l, 'capitale presa al turno', esiti[l].presa, '| al turno 20:', JSON.stringify(esiti[l].al20));
}
// v85: il nemico e' uno dei 5 paesi vicini pescato a caso, e quale esce dipende dai numeri casuali gia'
// usati per la mappa: con i biomi corretti la Tunisia (seme 5) pesca l'Italia, oltre il mare, invece
// della Libia, e serve qualche turno in piu' per sbarcare. Resta: difficile prende la capitale ben prima di normale.
assert(esiti.difficile.presa < 30 && esiti.difficile.presa < esiti.normale.presa - 10, "difficile: l'IA attacca subito, come la v54");
assert(esiti.normale.presa >= AI_LIVELLI.normale.tregua && esiti.normale.presa > esiti.difficile.presa + 10,
  'normale: niente attacchi alla capitale prima della fine della tregua');
assert(esiti.facile.presa >= AI_LIVELLI.facile.tregua && esiti.facile.presa > esiti.normale.presa + 15,
  'facile: la capitale resiste molto piu\' a lungo');
assert(esiti.facile.al20.soldati < esiti.normale.al20.soldati, "facile: al turno 20 l'esercito IA e' piu' piccolo che a normale");

// 3. cambio a metà partita: da facile a difficile al turno 15 → l'IA attacca ben prima del turno 60
const suDifficile = partita(5, 'facile', { 15: 'difficile' });
assert(aiLivello === 'difficile', 'la difficoltà resta quella scelta in partita');
assert(suDifficile.presa > 15 && suDifficile.presa < AI_LIVELLI.facile.tregua,
  `da facile a difficile al turno 15: capitale presa al turno ${suDifficile.presa}`);
// ...e da difficile a facile al turno 5: l'attacco del turno ~14 non arriva più
const suFacile = partita(5, 'difficile', { 5: 'facile' });
assert(suFacile.presa >= AI_LIVELLI.facile.tregua, `da difficile a facile al turno 5: capitale presa al turno ${suFacile.presa}`);

// 4. salvataggio: la difficoltà viaggia col file; i vecchi file giocano a Normale
seme = 3; setMapSize('piccola'); newGame(); sceltaACaso(); placePlayerCapital(placeSet[0]);
setDifficolta('facile');
const data = serialize();
assert(data.ia === 'facile', 'il salvataggio contiene la difficoltà');
setDifficolta('difficile');
assert(applySave(data) && aiLivello === 'facile', 'caricando il file torna la difficoltà salvata');
const vecchio = JSON.parse(JSON.stringify(data)); delete vecchio.ia;
assert(applySave(vecchio) && aiLivello === 'normale', 'un salvataggio senza difficoltà si carica a Normale');
const v15 = comeSalvataggioV17(vecchio); v15.v = 15; delete v15.paesi; delete v15.imperi; delete v15.modo;
// fino alla v16 il nemico era uno solo e si chiamava 'a'
const conA = o => (o && o !== 'p' ? 'a' : o);
for (const s of v15.tiles) { if (s.y) s.y.o = conA(s.y.o); if (s.u) s.u.o = conA(s.u.o); if (s.s) s.s.o = conA(s.s.o); if (s.q) s.q.o = conA(s.q.o); }
v15.stars = { p: v15.stars.p, a: v15.stars[A()] };
assert(applySave(v15) && aiLivello === 'normale', 'anche un salvataggio v15 si carica, a Normale');
setDifficolta('sbagliata');
assert(aiLivello === 'normale', 'un livello inesistente viene ignorato');
console.log('TUTTI I TEST DIFFICOLTA SUPERATI');
