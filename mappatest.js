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
// determinismo: una sola mappa per taglia, uguale a ogni partita (cambia solo la capitale nemica)
const realRandom = Math.random;
function firma() {
  // terreno e villaggi neutrali di tutta la mappa, casella per casella
  return map.map(row => row.map(t => t.terrain[0] + (t.city && t.city.owner === null ? '*' : '')).join('')).join('|');
}
for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia);
  Math.random = mulberry32(1); newGame(); const a = firma();
  Math.random = mulberry32(99); newGame(); const b = firma();
  check(a === b, `${taglia}: due partite con sorteggi diversi hanno la stessa mappa`);
  const land = map.flat().filter(t => t.terrain !== 'water' && t.terrain !== 'river');
  const conDati = land.filter(t => biomaDi(t)).length;
  check(conDati / land.length > 0.99, `${taglia}: il bioma OSM copre la terraferma (${conDati}/${land.length})`);
  const tipi = new Set(land.map(t => t.terrain));
  check(['grass', 'forest', 'mountain', 'hill', 'desert'].every(x => tipi.has(x)), `${taglia}: ci sono prati, boschi, colline, montagne e deserti`);
}
Math.random = realRandom;
console.log(fail ? fail + ' TEST MAPPA FALLITI' : 'TUTTI I TEST MAPPA SUPERATI');
if (fail) process.exit(1);
