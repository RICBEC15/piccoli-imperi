// Test delle condizioni di vittoria (v69):
//  1. "solo capitali" (il default): né dominio né punti finiscono la partita;
//  2. dominio: con il 60% delle città vinci; se ci arriva un impero IA, perdi;
//  3. punti: la partita finisce solo dopo il turno limite, vince il primo in classifica;
//  4. salvataggio: la scelta resta; un vecchio salvataggio senza il campo è "solo capitali";
//  5. il tutorial vale solo con le capitali; nel duello il dominio funziona uguale.
// Math.random con seme fisso, come in aitest.js.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 7;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
const testoFine = () => document.getElementById('ovText').textContent;

function partita(vit, limite = 100, avv = 'tutti') {
  setAvversari(avv); setDifficolta('normale');
  setVittoria(vit); setLimite(limite);
  setMapSize('piccola');
  newGame();
  cambiaPaese('IT');
  tutorial = false;
  if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
  assert(!placing && pCapital() && !gameOver, `${vit}/${avv}: partita iniziata con la capitale`);
}
// dà a `o` città (non capitali) finché ne ha `quante`
function daiCitta(o, quante) {
  for (const t of dallIndice(conCitta, x => !x.city.capital && x.city.owner !== o)) {
    if ((quoteCitta().per[o] || 0) >= quante) break;
    t.city.owner = o;
  }
}

// 1. solo capitali
partita('classica');
assert(vittoriaPartita === 'classica' && !conDominio() && !conPunti(), 'default: solo capitali');
daiCitta('p', quoteCitta().serve);
checkEnd();
assert(!gameOver, 'solo capitali: il 60% delle città non basta per vincere');
turn = 100; endTurn();
assert(!gameOver && turn === 101, 'solo capitali: il turno 100 non chiude la partita');
assert(testoObiettivo() === null, 'solo capitali: niente obiettivo in alto');

// 2a. dominio, vinci tu
partita('dominio');
const q0 = quoteCitta();
assert(q0.tot > 50 && q0.serve === Math.ceil(q0.tot * 0.6), `dominio: servono ${q0.serve} città su ${q0.tot}`);
ui();
assert(testoObiettivo() && document.getElementById('obiettivo').textContent.includes(`/${q0.serve}`), 'dominio: in alto le città che servono');
daiCitta('p', q0.serve - 1); checkEnd();
assert(!gameOver, 'dominio: una città in meno del 60% non basta');
daiCitta('p', q0.serve); checkEnd();
assert(gameOver && document.getElementById('ovTitle').textContent.includes('VITTORIA') && testoFine().includes('dominio'),
  `dominio: vittoria (${testoFine()})`);

// 2b. dominio, vince un impero IA (anche durante il giro degli imperi)
partita('dominio');
const ia = imperiIA()[0];
daiCitta(ia, quoteCitta().serve);
endTurn();
assert(gameOver && document.getElementById('ovTitle').textContent.includes('SCONFITTA') && testoFine().includes('domina'),
  `dominio IA: sconfitta (${testoFine()})`);

// 3a. punti: il turno limite si gioca tutto, poi vince il primo
partita('punti', 60);
const cl = punteggi();
assert(cl.length === imperiIA().length + 1 && cl.every((x, i) => !i || cl[i - 1].punti >= x.punti), 'punti: classifica ordinata');
const mio = cl.find(x => x.o === 'p');
assert(mio.punti >= cities('p').length * 10 + 10, `punti: le città contano (hai ${mio.punti} punti)`);
turn = 58; endTurn();
assert(!gameOver && turn === 59, 'punti: turno 59, si continua');
ui();
assert(document.getElementById('obiettivo').textContent.includes('1 turni'), 'punti: in alto i turni che restano');
endTurn();
assert(!gameOver && turn === 60, 'punti: il turno 60 (il limite) si gioca');
daiCitta('p', quoteCitta().serve - 1); // diventi primo
endTurn();
assert(gameOver && turn === 60 && document.getElementById('ovTitle').textContent.includes('VITTORIA') && testoFine().includes('ai punti'),
  `punti: dopo il turno 60 vinci ai punti (${testoFine()})`);

// 3b. punti: se un impero IA ne ha di più, perdi
partita('punti', 60);
daiCitta(imperiIA()[0], quoteCitta().serve - 1);
turn = 60; endTurn();
assert(gameOver && document.getElementById('ovTitle').textContent.includes('SCONFITTA') && testoFine().includes('vince ai punti'),
  `punti: sconfitta ai punti (${testoFine()})`);

// 4. salvataggio
partita('tutte', 150);
const dati = JSON.parse(JSON.stringify(serialize()));
assert(dati.vittoria && dati.vittoria.modo === 'tutte' && dati.vittoria.limite === 150, 'salvataggio: campo vittoria scritto');
setVittoria('classica'); setLimite(60); newGame();
assert(applySave(dati) && vittoriaPartita === 'tutte' && limitePartita === 150 && conDominio() && conPunti(), 'caricamento: dominio e punti, limite 150');
delete dati.vittoria;
assert(applySave(dati) && vittoriaPartita === 'classica' && !conDominio() && !conPunti(), 'vecchio salvataggio: solo capitali');
assert(vittoriaScelta === 'classica' && limiteScelto === 60, 'il menu non cambia caricando una partita');

// 5. tutorial e duello
setVittoria('tutte'); newGame(true);
assert(tutorial && !conDominio() && !conPunti(), 'tutorial: solo capitali');
partita('dominio', 100, 'duello');
assert(modoPartita === 'duello' && conDominio(), 'duello con dominio');
daiCitta('p', quoteCitta().serve); checkEnd();
assert(gameOver && testoFine().includes('dominio'), 'duello: vittoria per dominio');
console.log('TUTTI I TEST DI VITTORIA PASSATI');
