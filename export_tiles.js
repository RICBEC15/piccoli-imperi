// Esporta le caselle di terra di ogni taglia (riga, colonna, lon, lat, paese) per build_biomi.py.
// uso: cat stub.js game.js export_tiles.js > _run.js && OUT=tiles.json node _run.js
// con FIUMI=1 esporta anche le caselle di fiume (servono a build_epoche.py)
const out = {};
for (const m of ['piccola', 'media', 'gigante']) {
  setMapSize(m); calcolaMappa(); // v74: la mappa calcolata da zero, non quella gia' pronta di MAPPE_FISSE
  const g = geoSetup();
  const tiles = [];
  for (const t of map.flat()) {
    if (t.terrain === 'water' || (t.terrain === 'river' && !process.env.FIUMI)) continue;
    const q = tileLonLat(t, g);
    tiles.push([t.r, t.c, +q.lon.toFixed(4), +q.lat.toFixed(4), t.country || '']);
  }
  out[m] = { rows: ROWS, cols: COLS, hexKm: S * SQ3 / g.sc, tiles };
  console.error(m, tiles.length, 'caselle di terra,', (S * SQ3 / g.sc).toFixed(1), 'km per casella');
}
require('fs').writeFileSync(process.env.OUT || 'tiles.json', JSON.stringify(out));
