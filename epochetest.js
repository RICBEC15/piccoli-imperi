// Test delle epoche storiche (v68): a inizio partita si sceglie l'anno e gli stati cambiano
// (confini e nomi), mentre la mappa resta identica. Si controllano la scelta del paese, il
// cambio di epoca durante il piazzamento, il tutorial (sempre oggi) e il salvataggio.
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 11;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };
// i villaggi contano anche quando ci sorge sopra la capitale di uno stato
// (dalla v71 il villaggio di una capitale di oggi fondata lì accanto sparisce dentro la capitale:
// i villaggi delle capitali di oggi non contano)
const nomiCapOggi = new Set(Object.keys(CAPITALI_REALI).flatMap(cc => [CAPITALI_REALI[cc][0], nomeCittaCapitale(cc)]));
const firma = () => map.flat().map(t => t.terrain[0] + (t.city && (!t.city.capital || t.city.exVillaggio) && !nomiCapOggi.has(t.city.n) ? 'v' : '')).join('');

for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia);
  // tutti contro tutti sulla piccola, il duello sulle altre (che fanno prima)
  setAvversari(taglia === 'piccola' ? 'tutti' : 'duello');
  setEpoca('oggi'); newGame();
  const terreOggi = firma();
  // v81: sulla piccola tutti gli anni con confini propri, sulle altre uno ogni otto (fanno prima)
  for (const anno of Object.keys(EPOCHE).filter((k, i) => taglia === 'piccola' || i % 8 === 0)) {
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
// v81: dal 1886 i confini ufficiali di CShapes (senza annessioni e occupazioni di guerra)
assert(statoA('1937', 16.4, 48.2) === "Repubblica d'Austria", "Vienna nel 1937: Repubblica d'Austria");
assert(statoA('1937', 43.0, 39.9) === 'Turchia', "Erzurum nel 1937: Turchia");
assert(statoA(epocaDellAnno(1923), 12.5, 41.9) === "Regno d'Italia", "Roma nel 1923: Regno d'Italia");
assert(statoA(epocaDellAnno(1950), 12.5, 41.9) === 'Repubblica italiana', 'Roma nel 1950: Repubblica italiana');
assert(statoA(epocaDellAnno(1995), 14.5, 46.05) === 'Slovenia', 'Lubiana nel 1995: Slovenia');
assert(statoA(epocaDellAnno(1985), 14.5, 46.05) === 'Jugoslavia', 'Lubiana nel 1985: Jugoslavia');
// v81: i fatti storici prima del 1886
assert(statoA(epocaDellAnno(1452), 28.9, 41.0) === 'Impero bizantino', 'Costantinopoli nel 1452: bizantina');
assert(statoA(epocaDellAnno(1470), 28.9, 41.0) === 'Impero ottomano', 'Costantinopoli nel 1470: ottomana');
assert(statoA(epocaDellAnno(1367), 30.5, 50.4) === 'Granducato di Lituania', 'Kiev nel 1367: Lituania');
assert(statoA(epocaDellAnno(1871), 12.5, 41.9) === "Regno d'Italia", "Roma nel 1871: Regno d'Italia");
assert(statoA(epocaDellAnno(1869), 12.5, 41.9) === 'Stato della Chiesa', 'Roma nel 1869: Stato della Chiesa');
assert(statoA(epocaDellAnno(1872), 13.4, 52.5) === 'Impero tedesco', 'Berlino nel 1872: Impero tedesco');
assert(statoA('1000', 28.9, 41.0) === 'Impero bizantino', "Costantinopoli nel 1000: Impero bizantino");
assert(statoA('1500', 12.3, 45.4) === 'Repubblica di Venezia', 'Venezia nel 1500: Repubblica di Venezia');
assert(statoA('1800', 12.5, 41.9) === 'Stato della Chiesa', 'Roma nel 1800: Stato della Chiesa');
assert(statoA('oggi', 12.5, 41.9) === 'Italia', 'Roma oggi: Italia');
// v80: le nuove istantanee
assert(statoA(epocaDellAnno(1960), 13.4, 52.5) === 'Germania Est', 'Berlino nel 1960: Germania Est');
assert(statoA(epocaDellAnno(1946), 11.6, 48.1) === 'Germania, zone occidentali', 'Monaco nel 1946: zone occidentali');
assert(statoA('1815', 9.2, 45.5) === 'Regno Lombardo-Veneto', 'Milano nel 1815: Regno Lombardo-Veneto');
assert(statoA('1300', 30.5, 50.4) !== 'Italia' && statoA('1100', 30.5, 50.4) === "Rus' di Kiev", "Kiev nel 1100: Rus' di Kiev");
assert(statoA('1600', 11.25, 43.78) === 'Granducato di Toscana', 'Firenze nel 1600: Granducato di Toscana');

// v80: si sceglie un anno qualsiasi, anno per anno; vale l'ultima istantanea non successiva
const casi = [[1000, '1000'], [1017, '1000'], [1099, '1086'], [1100, '1100'], [1492, '1492'], [1500, '1500'], [1856, '1852'],
  [1914, '1914'], [1919, '1919'], [1938, '1937'], [1941, '1941'], [1991, '1991'], [1992, '1992'], [2007, '2006'], [2008, 'oggi'], [2026, 'oggi']];
for (const [a, k] of casi) assert(epocaDellAnno(a) === k, `anno ${a}: confini ${k}`);
setAnno(1856);
assert(annoScelto === 1856 && epocaScelta === '1852', "setAnno(1856): l'anno resta 1856, i confini sono dell'ultimo cambio (1852)");
assert(descriviAnno(1856).startsWith('Anno 1856 · Il Congresso di Vienna (ultimo cambio nel 1852: '), 'descrizione: ' + descriviAnno(1856));
assert(descriviAnno(1950) === 'Anno 1950 · La guerra fredda', 'dal 1886 confini esatti: ' + descriviAnno(1950));
assert(Object.keys(EPOCHE).every(k => { const e = EPOCHE[k], g = EPOCHE[e.come || k]; return g.griglia && (!g.base || EPOCHE[g.base].griglia && !EPOCHE[g.base].base); }),
  'ogni anno ha la sua griglia, al massimo con una base scritta per intero');
setAnno(500); assert(annoScelto === 1000, "prima del 1000 si ferma al 1000");
setAnno(99999); assert(annoScelto === ANNO_MAX && epocaScelta === 'oggi', 'dopo oggi si ferma a oggi');
setAnno('abc'); assert(annoScelto === ANNO_MAX, 'un anno non valido non cambia nulla');
setAnno(1856); passoAnno(1); assert(annoScelto === 1857, 'il passo di un anno: 1857');
passoAnno(-10); assert(annoScelto === 1847, 'il passo di dieci anni: 1847');
setEpoca('1914'); assert(annoScelto === 1914 && epocaScelta === '1914', 'setEpoca porta al suo anno');
setEpoca('oggi'); assert(annoScelto === ANNO_MAX, "setEpoca('oggi') porta a oggi");

// durante il piazzamento: cambiare anno nella stessa istantanea non cambia gli stati
setAnno(1816); newGame();
{
  const paese = players.p.country, cap = placeSet.map(t => t.r + ',' + t.c).join();
  setAnno(1825);
  assert(annoPartita === 1825 && epocaPartita === '1815' && players.p.country === paese && placeSet.map(t => t.r + ',' + t.c).join() === cap,
    'dal 1816 al 1825 (stessi confini del 1815): stesso paese, stessa capitale, anno 1825');
  setAnno(1883);
  assert(annoPartita === 1883 && epocaPartita === '1881' && statoStorico(players.p.country), "nel 1883 i confini del 1881 (la Tunisia francese)");
  cambiaPaese('ITA'); placePlayerCapital(placeSet[0]);
  const d = JSON.parse(JSON.stringify(serialize()));
  assert(d.anno === 1883 && d.epoca === '1881', "il salvataggio ricorda l'anno 1883");
  setEpoca('oggi'); newGame();
  assert(applySave(d) && annoPartita === 1883 && epocaPartita === '1881' && players.p.country === 'ITA', "si ricarica nel 1883, Regno d'Italia");
  delete d.anno; setEpoca('oggi'); newGame();
  assert(applySave(d) && annoPartita === 1881, "un salvataggio senza anno prende l'anno dei suoi confini");
}

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
