// Test della difficoltà dell'IA (v56). Con il giocatore fermo e lo stesso seme,
// i tre livelli devono comportarsi in modo misurabilmente diverso, e la difficoltà
// cambiata a metà partita deve valere dal turno nemico successivo.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

// gioca con il giocatore fermo; cambi = { turno: livello } da applicare durante la partita
function partita(seed, livello, cambi = {}, maxTurni = 90) {
  seme = seed;
  setMapSize('piccola');
  newGame();
  tutorial = false;
  setDifficolta(livello);
  placePlayerCapital(placeSet[0]);
  let al20 = null;
  try {
    for (let i = 0; i < maxTurni && !gameOver; i++) {
      if (cambi[turn]) setDifficolta(cambi[turn]);
      endTurn();
      if (turn === 20) al20 = { soldati: aiSoldati('a'), stelle: players.a.stars };
    }
  } catch (e) { console.error('CRASH', e.stack); process.exit(1); }
  return { presa: gameOver ? turn : Infinity, al20 };
}

// 1. la rendita dell'IA dipende dalla difficoltà
seme = 1; setMapSize('piccola'); newGame(); placePlayerCapital(placeSet[0]);
const r = {};
for (const l of ['facile', 'normale', 'difficile']) { setDifficolta(l); r[l] = aiEntrata(); }
assert(r.difficile === income('a') && r.facile <= r.normale && r.normale <= r.difficile && r.facile < r.difficile,
  `rendita IA: facile ${r.facile}, normale ${r.normale}, difficile ${r.difficile}`);

// 2. tre partite con lo stesso seme: piu' facile = capitale presa piu' tardi
const esiti = {};
for (const l of ['facile', 'normale', 'difficile']) {
  esiti[l] = partita(1, l);
  console.log(l, 'capitale presa al turno', esiti[l].presa, '| al turno 20:', JSON.stringify(esiti[l].al20));
}
assert(esiti.difficile.presa < 25, "difficile: l'IA attacca subito, come la v54");
assert(esiti.normale.presa >= AI_LIVELLI.normale.tregua && esiti.normale.presa > esiti.difficile.presa + 10,
  'normale: niente attacchi alla capitale prima della fine della tregua');
assert(esiti.facile.presa >= AI_LIVELLI.facile.tregua && esiti.facile.presa > esiti.normale.presa + 15,
  'facile: la capitale resiste molto piu\' a lungo');
assert(esiti.facile.al20.soldati < esiti.normale.al20.soldati, "facile: al turno 20 l'esercito IA e' piu' piccolo che a normale");

// 3. cambio a metà partita: da facile a difficile al turno 15 → l'IA attacca ben prima del turno 60
const suDifficile = partita(1, 'facile', { 15: 'difficile' });
assert(aiLivello === 'difficile', 'la difficoltà resta quella scelta in partita');
assert(suDifficile.presa > 15 && suDifficile.presa < AI_LIVELLI.facile.tregua,
  `da facile a difficile al turno 15: capitale presa al turno ${suDifficile.presa}`);
// ...e da difficile a facile al turno 5: l'attacco del turno ~14 non arriva più
const suFacile = partita(1, 'difficile', { 5: 'facile' });
assert(suFacile.presa >= AI_LIVELLI.facile.tregua, `da difficile a facile al turno 5: capitale presa al turno ${suFacile.presa}`);

// 4. salvataggio: la difficoltà viaggia col file; i vecchi file giocano a Normale
seme = 3; setMapSize('piccola'); newGame(); placePlayerCapital(placeSet[0]);
setDifficolta('facile');
const data = serialize();
assert(data.ia === 'facile', 'il salvataggio contiene la difficoltà');
setDifficolta('difficile');
assert(applySave(data) && aiLivello === 'facile', 'caricando il file torna la difficoltà salvata');
const vecchio = JSON.parse(JSON.stringify(data)); delete vecchio.ia;
assert(applySave(vecchio) && aiLivello === 'normale', 'un salvataggio senza difficoltà si carica a Normale');
const v15 = JSON.parse(JSON.stringify(vecchio)); v15.v = 15; delete v15.paesi;
assert(applySave(v15) && aiLivello === 'normale', 'anche un salvataggio v15 si carica, a Normale');
setDifficolta('sbagliata');
assert(aiLivello === 'normale', 'un livello inesistente viene ignorato');
console.log('TUTTI I TEST DIFFICOLTA SUPERATI');
