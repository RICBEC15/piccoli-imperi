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
  const VIA = { 'Noginsk@91.23': 1, 'Nachodka@77.52': 1, 'Pyongyang@126.39': 1, 'Bandar Lampung@105.27': 1, 'Denpasar@115.18': 1 };
  const DOPPI = {
    'Hyderabad@68.37': 'Hyderabad del Sindh', 'Suzhou@116.98': "Suzhou dell'Anhui", 'Jingmen@112.20': 'Zhongxiang',
    'Jining@113.08': 'Ulanqab', 'Yulin@109.73': 'Yulin dello Shaanxi', 'Aurangabad@84.38': 'Aurangabad del Bihar',
    'Yichun@128.90': 'Yichun dello Heilongjiang', 'Pingxiang@106.76': 'Pingxiang del Guangxi', 'Fuyang@119.95': 'Fuyang di Hangzhou',
    'Baicheng@106.61': 'Baise', 'Dali@109.94': 'Dali dello Shaanxi', 'Ilam@87.93': 'Ilam del Nepal', 'Gaya@85.00': 'Gaya del Bihar',
    "Oktjabr'skij@156.24": "Oktjabr'skij di Kamčatka",
  };
  const RINOMINA = { 'Nur-Sultan': 'Astana' }; // v90: i nomi cambiati dopo i dati (Astana dal 2022)
  for (const taglia of Object.keys(MAP_SIZES)) {
    setMapSize(taglia); newGame();
    const g = geoSetup(), W = OFFX * 2 + S * SQ3 * COLS, H = OFFY * 2 + S * 1.5 * ROWS;
    for (const f of NE) {
      const p = f.properties, [lon, lat] = f.geometry.coordinates;
      const ab = Math.round(p.POP_MAX || 0);
      if (ab < 1000 || lon < -26 || lon > 190.5 || lat < -48 || lat > 78) continue; // v90: fino allo stretto di Bering
      const q = geoToPx(lon, lat, g);
      if (q.x < 0 || q.y < 0 || q.x > W || q.y > H) continue;
      const t = tileAtGeo(lon, lat, g);
      if (![t, ...neighbors(t)].some(x => x.country && x.terrain !== 'water')) continue;
      let nome = RINOMINA[(p.NAME_IT || p.NAME).trim()] || (p.NAME_IT || p.NAME).trim();
      // v90: nomi ripetuti in Asia. Le copie sbagliate di Natural Earth (stesso nome e stessi abitanti
      // di un'altra citta', o due punti a pochi km) si tolgono; le citta' diverse con lo stesso nome
      // si distinguono con la regione (quelle di prima della v90 tengono il loro nome)
      const chiave = nome + '@' + (+lon.toFixed(3)).toFixed(2);
      if (VIA[chiave]) continue;
      if (DOPPI[chiave]) nome = DOPPI[chiave];
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
