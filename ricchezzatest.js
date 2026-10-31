// Test dell'IA che punta alle città ricche (v69): a Normale e Difficile una città
// che rende di più (più abitanti veri) "sembra più vicina" nella mappa di marcia;
// a Facile l'IA va alla più vicina, come prima.
// uso: cat stub.js game.js ricchezzatest.js > _run.js && node _run.js
let fail = 0;
function check(ok, txt) { console.log((ok ? 'OK: ' : 'ERRORE: ') + txt); if (!ok) fail++; }
Math.random = mulberry32(11);
setAvversari('duello'); // con un impero per paese all'inizio non ci sono villaggi neutrali
setMapSize('piccola'); newGame();
aiPreparaGiro();
aiCosti = aiCostiBase.slice();
const villaggi = map.flat().filter(t => t.city && t.city.owner === null);
const ricca = villaggi.slice().sort((a, b) => renditaCitta(b.city) - renditaCitta(a.city))[0];
const povere = villaggi.filter(t => renditaCitta(t.city) <= 2);
check(renditaCitta(ricca.city) >= 6 && povere.length > 10,
  `c'è una città ricca (${nomeCitta(ricca.city)}, ${renditaCitta(ricca.city)}⭐) e tanti villaggi poveri`);

// 1. la "partenza" (strada regalata) secondo la difficoltà
const P = {};
for (const l of ['facile', 'normale', 'difficile']) {
  setDifficolta(l);
  P[l] = { ricca: aiPartenza(ricca), povera: aiPartenza(povere[0]) };
}
check(P.facile.ricca === 0 && P.facile.povera === 0, 'facile: nessuna preferenza, conta solo la distanza');
check(P.normale.ricca < P.normale.povera, `normale: la città ricca parte avvantaggiata (${P.normale.ricca} contro ${P.normale.povera})`);
const vantaggio = l => P[l].povera - P[l].ricca;
check(vantaggio('difficile') > vantaggio('normale'), `difficile: la ricchezza pesa di più (${vantaggio('difficile')} contro ${vantaggio('normale')} terzi di turno)`);

// 2. una casella un po' più vicina a un villaggio povero che alla città ricca:
//    seguendo la mappa di marcia, a facile si va al villaggio, a difficile alla città ricca
const campoDi = s => aiCampo([s], aiCosti);
const fR = campoDi(ricca);
let scelta = null;
for (const pov of povere) {
  const fP = campoDi(pov);
  const cand = map.flat().find(t => passable(t) && !t.city && fP[aiIdx(t)] < fR[aiIdx(t)]
    && fR[aiIdx(t)] - fP[aiIdx(t)] >= 6 && fR[aiIdx(t)] - fP[aiIdx(t)] < vantaggio('difficile') - 6);
  if (cand) { scelta = { pov, cand }; break; }
}
check(!!scelta, 'trovata una casella fra un villaggio povero vicino e la città ricca poco più lontana');
function meta(livello) {
  setDifficolta(livello);
  const campo = aiCampo([scelta.pov, ricca], aiCosti, null, true, aiPartenza);
  let t = scelta.cand;
  for (let passi = 0; passi < 2000; passi++) {
    if (t === scelta.pov || t === ricca) return t;
    let best = null, bv = campo[aiIdx(t)];
    for (const n of neighbors(t)) { const v = campo[aiIdx(n)]; if (v < bv) { bv = v; best = n; } }
    if (!best) return null;
    t = best;
  }
  return null;
}
if (scelta) {
  check(meta('facile') === scelta.pov, 'facile: va al villaggio povero più vicino');
  check(meta('difficile') === ricca, `difficile: devia verso ${nomeCitta(ricca.city)}, che rende di più`);
}

// 3. una partita breve a ogni livello: niente errori con la nuova mappa di marcia
for (const l of ['facile', 'normale', 'difficile']) {
  Math.random = mulberry32(5);
  setMapSize('piccola'); newGame();
  const lp = Object.keys(paesiInfo()); cambiaPaese(lp[0]);
  tutorial = false; setDifficolta(l);
  placePlayerCapital(placeSet[0]);
  try { for (let i = 0; i < 30 && !gameOver; i++) endTurn(); check(true, `${l}: 30 turni giocati senza errori`); }
  catch (e) { check(false, `${l}: errore ${e.stack}`); }
}
console.log(fail ? `${fail} ERRORI` : 'TUTTO OK');
process.exit(fail ? 1 : 0);
