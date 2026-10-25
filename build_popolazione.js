// Costruisce la lista CITTA_REALI di Piccoli Imperi: le citta' vere con i loro abitanti.
//
// Fonte: Natural Earth, "populated places" 1:10m (pubblico dominio, naturalearthdata.com),
// campo POP_MAX (abitanti dell'agglomerato urbano), nome italiano NAME_IT se c'e'.
//   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson
// Uso (tiene solo le citta' che cadono sulla terraferma del gioco in almeno una taglia
// e riscrive il blocco fra CITTA_REALI_INIZIO e CITTA_REALI_FINE):
//   cat stub.js game.js build_popolazione.js > _run.js && NE=ne_10m_populated_places.geojson node _run.js
{
  const fs = require('fs');
  const NE = JSON.parse(fs.readFileSync(process.env.NE, 'utf8')).features;
  const tenute = new Map();
  for (const taglia of Object.keys(MAP_SIZES)) {
    setMapSize(taglia); newGame();
    const g = geoSetup(), W = OFFX * 2 + S * SQ3 * COLS, H = OFFY * 2 + S * 1.5 * ROWS;
    for (const f of NE) {
      const p = f.properties, [lon, lat] = f.geometry.coordinates;
      const ab = Math.round(p.POP_MAX || 0);
      if (ab < 1000 || lon < -26 || lon > 62 || lat < 24 || lat > 72) continue;
      const q = geoToPx(lon, lat, g);
      if (q.x < 0 || q.y < 0 || q.x > W || q.y > H) continue;
      const t = tileAtGeo(lon, lat, g);
      if (![t, ...neighbors(t)].some(x => x.country && x.terrain !== 'water')) continue;
      const nome = (p.NAME_IT || p.NAME).trim();
      tenute.set(p.NE_ID, [nome, +lon.toFixed(3), +lat.toFixed(3), ab]);
    }
  }
  const lista = [...tenute.values()].sort((a, b) => b[3] - a[3] || a[0].localeCompare(b[0]));
  const righe = [];
  for (let i = 0; i < lista.length; i += 6) righe.push('  ' + lista.slice(i, i + 6).map(x => JSON.stringify(x)).join(','));
  const blocco = '// CITTA_REALI_INIZIO\nconst CITTA_REALI = [\n' + righe.join(',\n') + '\n];\n// CITTA_REALI_FINE';
  const html = fs.readFileSync('piccoli_imperi.html', 'utf8');
  const nuovo = html.replace(/\/\/ CITTA_REALI_INIZIO[\s\S]*?\/\/ CITTA_REALI_FINE/, () => blocco);
  fs.writeFileSync('piccoli_imperi.html', nuovo);
  console.log(`CITTA_REALI: ${lista.length} citta' (${lista.filter(x => x[3] >= 1e6).length} da un milione in su)`);
}
