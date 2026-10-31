// Test delle epoche storiche (v68): a inizio partita si sceglie l'anno e gli stati cambiano
// (confini e nomi), mentre la mappa resta identica. Si controllano la scelta del paese, il
// cambio di epoca durante il piazzamento, il tutorial (sempre oggi) e il salvataggio.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 11;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
// i villaggi contano anche quando ci sorge sopra la capitale di uno stato
// (dalla v69 il villaggio di una capitale di oggi fondata lì accanto sparisce dentro la capitale:
// i villaggi delle capitali di oggi non contano)
const nomiCapOggi = new Set(Object.keys(CAPITALI_REALI).flatMap(cc => [CAPITALI_REALI[cc][0], nomeCittaCapitale(cc)]));
const firma = () => map.flat().map(t => t.terrain[0] + (t.city && (!t.city.capital || t.city.exVillaggio) && !nomiCapOggi.has(t.city.n) ? 'v' : '')).join('');

for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia);
  // tutti contro tutti sulla piccola, il duello sulle altre (che fanno prima)
  setAvversari(taglia === 'piccola' ? 'tutti' : 'duello');
  setEpoca('oggi'); newGame();
  const terreOggi = firma();
  for (const anno of Object.keys(EPOCHE)) {
    setEpoca(anno); newGame();
    assert(firma() === terreOggi, `${taglia} ${anno}: stessa mappa (terre e villaggi) di oggi`);
    const terra = map.flat().filter(t => t.terrain !== 'water');
    const senza = terra.filter(t => !t.country).length;
    assert(senza / terra.length < 0.35, `${taglia} ${anno}: ${(100 * senza / terra.length).toFixed(1)}% di terra senza stato (Sahara)`);
    assert(terra.every(t => !t.country || EPOCHE[anno].stati[t.country]), `${taglia} ${anno}: ogni casella ha uno stato dell'epoca`);
    const info = paesiInfo(), stati = Object.keys(info);
    assert(stati.length >= 15, `${taglia} ${anno}: ${stati.length} stati giocabili`);
    // il tuo stato: il più grande, toccato sulla mappa
    const mio = stati.sort((a, b) => info[b].caselle - info[a].caselle)[0];
    cambiaPaese(mio);
    const ia = imperiIA();
    assert(statoStorico(players.p.country) && ia.length && ia.every(o => statoStorico(o) && o !== players.p.country),
      `${taglia} ${anno}: giochi ${nomePaese(players.p.country)} contro ${ia.length} ${ia.length === 1 ? 'stato' : 'stati'} dell'epoca`);
    assert(placeSet.length && placeSet.every(t => t.country === players.p.country),
      `${taglia} ${anno}: la capitale si fonda in patria${nomeCapitale(mio) ? ', a ' + nomeCapitale(mio) : ''}`);
    assert(ia.every(o => capitaleDi(o) && capitaleDi(o).country === o), `${taglia} ${anno}: ogni capitale nemica sorge nel suo stato`);
  }
}
setAvversari('tutti');

// i nomi giusti nei punti giusti (mappa piccola)
setMapSize('piccola');
const statoA = (anno, lon, lat) => {
  setEpoca(anno); if (!placing) newGame();
  const g = geoSetup();
  let best = null, bd = 1e9;
  for (const t of map.flat()) {
    if (t.terrain === 'water') continue;
    const q = tileLonLat(t, g), d = Math.hypot(q.lon - lon, q.lat - lat);
    if (d < bd) { bd = d; best = t; }
  }
  return nomePaese(best.country);
};
setEpoca('oggi'); newGame();
assert(statoA('1914', 13.4, 52.5) === 'Impero tedesco', 'Berlino nel 1914: Impero tedesco');
assert(statoA('1914', 16.4, 48.2) === 'Impero austro-ungarico', 'Vienna nel 1914: Impero austro-ungarico');
assert(statoA('1938', 16.4, 48.2) === 'Germania', "Vienna nel 1938: Germania (dopo l'Anschluss)");
assert(statoA('1938', 43.0, 39.9) === 'Repubblica di Turchia', "Erzurum nel 1938: Turchia (correzione dei dati)");
assert(statoA('1000', 28.9, 41.0) === 'Impero bizantino', "Costantinopoli nel 1000: Impero bizantino");
assert(statoA('1500', 12.3, 45.4) === 'Repubblica di Venezia', 'Venezia nel 1500: Repubblica di Venezia');
assert(statoA('1800', 12.5, 41.9) === 'Stato della Chiesa', 'Roma nel 1800: Stato della Chiesa');
assert(statoA('oggi', 12.5, 41.9) === 'Italia', 'Roma oggi: Italia');

// cambio di epoca durante la scelta del paese: la stessa mappa, nuovi stati
setEpoca('oggi'); newGame();
const prima = firma();
setEpoca('1500');
assert(firma() === prima && epocaPartita === '1500', 'cambiare epoca durante il piazzamento non rigenera la mappa');
assert(statoStorico(players.p.country) && placeSet.every(t => t.country === players.p.country), 'dopo il cambio di epoca il tuo paese e la capitale sono del 1500');
cambiaPaese('OTT');
assert(players.p.country === 'OTT' && nomePaese('OTT') === 'Impero ottomano', "si sceglie l'Impero ottomano");

// salvataggio e caricamento: l'epoca resta, i salvataggi senza epoca sono di oggi
placePlayerCapital(placeSet[0]);
const dati = JSON.parse(JSON.stringify(serialize()));
assert(dati.epoca === '1500', "il salvataggio ricorda l'epoca");
setEpoca('oggi'); newGame();
assert(applySave(dati), 'il salvataggio del 1500 si carica');
assert(epocaPartita === '1500' && players.p.country === 'OTT' && pCapital().country === 'OTT', "dopo il caricamento: 1500, Impero ottomano, capitale in patria");
setEpoca('oggi'); newGame(); cambiaPaese('IT'); placePlayerCapital(placeSet[0]);
const oggi = JSON.parse(JSON.stringify(serialize()));
delete oggi.epoca;
setEpoca('1914'); newGame();
assert(applySave(oggi) && epocaPartita === 'oggi' && players.p.country === 'IT', 'un salvataggio senza epoca si carica ai giorni nostri');

// il tutorial si gioca sempre oggi, con l'Italia
setEpoca('1800'); newGame(true);
assert(epocaPartita === 'oggi' && players.p.country === 'IT', "il tutorial e' ai giorni nostri anche con un'epoca scelta");
endTutorial();
console.log('TUTTI I TEST DELLE EPOCHE SUPERATI');
