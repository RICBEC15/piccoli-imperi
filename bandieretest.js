// Test delle bandiere (v88): ogni paese di oggi e ogni stato storico di ogni anno ha la sua
// bandiera disegnata nell'immagine BANDIERE; nei testi la bandiera e' un segnaposto che
// diventa emoji dove un disegno non entra (le tendine).
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
const celle = BANDIERE.col * BANDIERE.righe;
setMapSize('piccola');
setEpoca('oggi');
newGame();
const senza = Object.keys(COUNTRY_NAMES).filter(cc => indiceBandiera(cc) === null);
assert(!senza.length, `tutti i ${Object.keys(COUNTRY_NAMES).length} paesi di oggi hanno la bandiera ${senza.join(' ')}`);
assert(indiceBandiera('UK') === BANDIERE.k.uk && indiceBandiera('VA') !== null, 'anche il Regno Unito e il Vaticano');
assert(bandiera('IT') === 'IT', 'nei testi la bandiera e\' un segnaposto');
assert(testoSenzaBandiere(`${bandiera('IT')} Italia`) === '🇮🇹 Italia', 'nelle tendine torna l\'emoji');
assert(bandiera(players.p.country) === bandiera('p'), 'la bandiera di un impero e\' quella del suo paese');
assert(htmlBandiera('FR').startsWith('<i class="bnd"'), 'nella pagina diventa un disegno');
let n = 0, fuori = [];
for (const a of Object.keys(EPOCHE)) {
  epocaPartita = a;
  for (const cc of Object.keys(EPOCHE[a].stati)) {
    const i = indiceBandiera(cc); n++;
    if (i === null || i < 0 || i >= celle) fuori.push(a + ' ' + cc);
  }
}
assert(!fuori.length, `tutti i ${n} stati storici (anno per anno) hanno la bandiera ${fuori.slice(0, 5).join(', ')}`);
const quale = (a, cc) => { epocaPartita = String(a); return indiceBandiera(cc); };
assert(quale(1700, 'FRA') !== quale(1815, 'FRA'), 'la Francia dei gigli d\'oro e quella bianca della Restaurazione');
assert(quale(1880, 'ITA') !== BANDIERE.k.it && quale(1946, 'ITA') === BANDIERE.k.it, 'il Regno d\'Italia ha lo scudo di Savoia, la Repubblica no');
assert(quale(1500, 'SPA') !== quale(1977, 'SPA') && quale(1977, 'SPA') === BANDIERE.k.es, 'la croce di Borgogna, poi la Spagna di oggi');
epocaPartita = 'oggi';
// la finestra dei patti senza il paragrafo di spiegazione
setAvversari('tutti'); newGame(); cambiaPaese('IT'); tutorial = false;
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
const o = imperiIA()[0];
apriDiplomazia(o);
const box = document.getElementById('diploBox').innerHTML;
assert(box.includes(bandiera(o)) && !box.includes('I tuoi patti'), 'la scheda del paese ha la bandiera e non ha piu\' l\'elenco dei tuoi patti');
// cambiando anno nella scelta del paese restano solo gli imperi degli stati di quell'anno
// (prima della v88 gli imperi di oggi restavano in vita, senza terra, nei patti e nei turni)
setAvversari('tutti'); setEpoca('oggi'); newGame(); cambiaPaese('IT');
setAnno(1700);
assert(imperiIA().length > 10 && imperiIA().every(o => EPOCHE[epocaPartita].stati[o]), `nel 1700 solo stati del 1700 (${imperiIA().length} imperi)`);
setAnno(ANNO_MAX);
assert(imperiIA().every(o => COUNTRY_NAMES[o]), 'e tornando a oggi solo paesi di oggi');
