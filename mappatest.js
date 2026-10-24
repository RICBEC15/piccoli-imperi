// Test della mappa: niente "Russia fantasma" in Lapponia e penisola di Kola al suo posto.
// uso: cat stub.js game.js mappatest.js > _run.js && node _run.js
let fail = 0;
function check(ok, txt) { console.log((ok ? 'OK: ' : 'ERRORE: ') + txt); if (!ok) fail++; }
for (const taglia of ['piccola', 'media']) {
  setMapSize(taglia); newGame();
  const g = geoSetup();
  let fantasma = 0, kola = 0, kolaTot = 0;
  for (const t of map.flat()) {
    const { lon, lat } = tileLonLat(t, g);
    // Svezia e Finlandia del nord non sono nel gioco: li' deve esserci solo mare
    if (lat > 65.3 && lat < 68.8 && lon > 18.5 && lon < 28) { if (t.terrain !== 'water') fantasma++; }
    // l'interno della penisola di Kola e' Russia
    if (lat > 67.6 && lat < 68.6 && lon > 34 && lon < 38) { kolaTot++; if (t.country === 'RU') kola++; }
  }
  check(fantasma === 0, `${taglia}: nessuna terra finta a nord fra Svezia e Finlandia (${fantasma})`);
  check(kolaTot > 0 && kola / kolaTot > 0.9, `${taglia}: la penisola di Kola e' terra russa (${kola}/${kolaTot})`);
}
console.log(fail ? fail + ' TEST MAPPA FALLITI' : 'TUTTI I TEST MAPPA SUPERATI');
if (fail) process.exit(1);
