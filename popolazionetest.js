// Test degli abitanti reali: nomi e abitanti veri, rendita a scaglioni, salvataggi.
// uso: cat stub.js game.js popolazionetest.js > _run.js && node _run.js
let fail = 0;
function check(ok, txt) { console.log((ok ? 'OK: ' : 'ERRORE: ') + txt); if (!ok) fail++; }
const realRandom = Math.random;
const firma = () => map.flat().filter(t => t.city && t.city.owner === null).map(t => `${t.r},${t.c}:${t.city.n}:${t.city.ab}`).join('|');
for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia);
  Math.random = mulberry32(3); newGame();
  const tutte = map.flat().filter(t => t.city);
  check(tutte.every(t => Number.isFinite(t.city.ab) && t.city.ab > 0), `${taglia}: ogni città ha i suoi abitanti`);
  const nomi = tutte.filter(t => t.city.n).map(t => t.city.n);
  check(new Set(nomi).size === nomi.length, `${taglia}: nessun nome usato due volte (${nomi.length} città con nome su ${tutte.length})`);
  for (const n of ['Roma', 'Parigi', 'Milano', 'Madrid', 'Londra', 'Istanbul', 'Mosca']) {
    const t = tutte.find(x => x.city.n === n);
    check(t && t.city.ab >= 1000000, `${taglia}: c'è ${n} con ${t ? fmtAbitanti(t.city.ab) : '?'} abitanti`);
  }
  const roma = tutte.find(x => x.city.n === 'Roma');
  check(roma && roma.country === 'IT' && renditaAbitanti(roma.city.ab) === 6, `${taglia}: Roma è in Italia e i suoi abitanti rendono 6⭐`);
  const a = firma();
  Math.random = mulberry32(77); newGame();
  check(firma() === a, `${taglia}: nomi e abitanti dei villaggi uguali a ogni partita`);
}
Math.random = realRandom;
// scaglioni
check(renditaAbitanti(1200) === 1 && renditaAbitanti(12000) === 2 && renditaAbitanti(80000) === 3
   && renditaAbitanti(300000) === 4 && renditaAbitanti(900000) === 5 && renditaAbitanti(3339000) === 6
   && renditaAbitanti(9904000) === 7, 'scaglioni: 1⭐ … 7⭐');
check(renditaCitta({ capital: true, pop: 1, ab: 1200 }) === 3, 'una capitale piccola rende comunque 3⭐');
check(renditaCitta({ capital: true, pop: 3, ab: 3339000 }) === 9, 'Roma capitale con crescita 3 rende 6+1+2 = 9⭐');
check(renditaCitta({ capital: false, pop: 1 }) === 2, 'una città senza abitanti noti rende 2⭐ come prima');
// la capitale vera sorge sul villaggio della sua città: Roma per te, Parigi per la Francia IA
setMapSize('piccola'); Math.random = mulberry32(5);
setAvversari('tutti');
newGame();
cambiaPaese('IT');
tutorial = false;
let roma = map.flat().find(t => t.city && t.city.n === 'Roma');
check(roma && placeSet.length === 1 && placeSet[0] === roma, 'la casella della capitale è il villaggio di Roma');
placePlayerCapital(roma);
check(roma.city.owner === 'p' && roma.city.capital && roma.city.n === 'Roma' && roma.city.ab === 3339000, 'la capitale si chiama Roma e ha i suoi abitanti');
check(renditaCitta(roma.city) === 7, `Roma capitale rende ${renditaCitta(roma.city)}⭐ (6 + 1)`);
const atteso = cities('p').reduce((s, t) => s + renditaCitta(t.city), 0) + ports('p').length * PORT_INCOME + alleatiDi('p').length * ALLEANZA_RENDITA;
check(income('p') === atteso, `rendita del giocatore: somma delle sue città = ${income('p')}⭐`);
const parigi = capitaleDi('FR');
check(parigi && parigi.city.n === 'Parigi' && parigi.city.ab === 9904000, 'la Francia IA ha la capitale sul villaggio di Parigi');
// cambiando paese, il villaggio della capitale lasciata resta al suo posto
newGame(); cambiaPaese('FR');
const parigi2 = map.flat().find(t => t.city && t.city.n === 'Parigi');
check(parigi2 && placeSet[0] === parigi2 && !parigi2.city.capital, 'scelta la Francia, Parigi torna un villaggio pronto per la tua capitale');
cambiaPaese('IT');
const p3 = map.flat().find(t => t.city && t.city.n === 'Parigi');
check(p3 && p3.city.capital && p3.city.owner === 'FR', "lasciata la Francia, Parigi torna capitale dell'impero francese");
roma = placeSet[0];
placePlayerCapital(roma);
// salvataggio e caricamento conservano nomi e abitanti
const dati = JSON.parse(JSON.stringify(serialize()));
Math.random = realRandom;
check(dati && applySave(dati), 'salvataggio ricaricato');
const r2 = map.flat().find(t => t.city && t.city.capital && t.city.owner === 'p');
check(r2 && r2.city.n === 'Roma' && r2.city.ab === 3339000, 'dopo il caricamento la capitale è ancora Roma con 3.339.000 abitanti');
// un vecchio salvataggio senza abitanti li ricava dalla posizione
for (const x of dati.tiles) if (x.y) { delete x.y.n; delete x.y.a; }
check(applySave(dati), 'vecchio salvataggio (senza abitanti) caricato');
const r3 = map.flat().find(t => t.city && t.city.capital && t.city.owner === 'p');
check(r3 && r3.city.n === 'Roma' && map.flat().every(t => !t.city || t.city.ab > 0), 'vecchio salvataggio: abitanti ricalcolati, la capitale torna Roma');
console.log(fail ? fail + ' TEST POPOLAZIONE FALLITI' : 'TUTTI I TEST POPOLAZIONE SUPERATI');
if (fail) process.exit(1);
