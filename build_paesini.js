// Costruisce la lista PAESINI_REALI di Piccoli Imperi: nome e abitanti veri dei paesini,
// per i villaggi che non hanno una città di Natural Earth vicina (CITTA_REALI).
//
// Fonte: GeoNames, "cities1000" (tutti i luoghi abitati da 1.000 abitanti in su), licenza
// CC BY 4.0 (geonames.org), nella copia compatta del pacchetto npm all-the-cities 3.1.0:
//   npm pack all-the-cities@3.1.0 && tar xzf all-the-cities-3.1.0.tgz   (-> package/cities.pbf)
// Il file .pbf si legge qui sotto senza dipendenze (nessun codice del pacchetto viene eseguito).
//
// Nel gioco restano solo i paesini che danno davvero il nome a un villaggio della mappa
// fissa, in almeno una taglia: poche centinaia invece di decine di migliaia, così il file
// resta leggero anche sul telefono.
// Uso (riscrive il blocco fra PAESINI_REALI_INIZIO e PAESINI_REALI_FINE):
//   cat stub.js game.js build_paesini.js > _run.js && GN=package/cities.pbf node _run.js
{
  const fs = require('fs');
  // --- lettura di cities.pbf: una sequenza di messaggi protobuf con lunghezza in testa
  const b = fs.readFileSync(process.env.GN);
  let pos = 0;
  const vint = () => { let r = 0, s = 1, x; do { x = b[pos++]; r += (x & 0x7f) * s; s *= 128; } while (x & 0x80); return r; };
  const svint = () => { const n = vint(); return n % 2 ? -(n + 1) / 2 : n / 2; };
  const str = () => { const l = vint(), s = b.toString('utf8', pos, pos + l); pos += l; return s; };
  const tutti = [];
  let lon = 0, lat = 0;
  while (pos < b.length) {
    const end = vint() + pos, c = { name: '', cc: '', fc: '', pop: 0, lon: 0, lat: 0 };
    while (pos < end) {
      const tag = vint() >> 3;
      if (tag === 1) svint();
      else if (tag === 2) c.name = str();
      else if (tag === 3) c.cc = str();
      else if (tag === 7) c.fc = str();
      else if (tag === 9) c.pop = vint();
      else if (tag === 10) { lon += svint(); c.lon = lon / 1e5; }
      else if (tag === 11) { lat += svint(); c.lat = lat / 1e5; }
      else if (tag >= 3 && tag <= 8) str();
      else throw new Error('campo sconosciuto ' + tag);
    }
    tutti.push(c);
  }
  // --- luoghi abitati dell'area del gioco: niente quartieri (PPLX), luoghi storici o abbandonati
  // codici GeoNames -> codici dei paesi del gioco (il Regno Unito è UK, le isole vanno al loro stato)
  const PAESE_GN = { GB: 'UK', IM: 'UK', GG: 'UK', JE: 'UK', GI: 'UK', AX: 'FI', FO: 'DK', SJ: 'NO', EH: 'MA' };
  // fuori la stessa città già presa da Natural Earth, e i sobborghi delle città da un milione
  // in su (Móstoles accanto a Madrid: i suoi abitanti sono già nell'agglomerato di Madrid)
  const vicinoNE = x => CITTA_REALI.some(c => {
    const d = kmGeo(c[1], c[2], x.lon, x.lat);
    return (d < 12 && c[3] >= x.pop / 3) || (d < 25 && c[3] >= ABITANTI_GRANDI && c[3] >= 5 * x.pop);
  });
  const lista = tutti
    .filter(x => x.lon > -26 && x.lon < 62 && x.lat > 24 && x.lat < 72 && x.pop >= 1000 && x.name
              && !/^PPL[XHQW]$/.test(x.fc) && !vicinoNE(x))
    .map(x => [x.name.trim(), +x.lon.toFixed(2), +x.lat.toFixed(2), x.pop, PAESE_GN[x.cc] || x.cc])
    .sort((a, b) => b[3] - a[3] || a[0].localeCompare(b[0]));
  // --- quali danno davvero il nome a un villaggio: si gioca con la lista intera e si guarda
  PAESINI_REALI.length = 0; PAESINI_REALI.push(...lista);
  const nomiNE = new Set(CITTA_REALI.map(c => c[0]));
  const vinti = new Set();
  for (const taglia of Object.keys(MAP_SIZES)) for (const modo of ['tutti', 'duello']) {
    setMapSize(taglia); setAvversari(modo); Math.random = mulberry32(1); newGame();
    for (const t of map.flat()) if (t.city && t.city.n && !nomiNE.has(t.city.n)) vinti.add(t.city.n);
  }
  const visti = new Set(), tenuti = [];
  for (const x of lista) if (vinti.has(x[0]) && !visti.has(x[0])) { visti.add(x[0]); tenuti.push(x); }
  const righe = [];
  for (let i = 0; i < tenuti.length; i += 6) righe.push('  ' + tenuti.slice(i, i + 6).map(x => JSON.stringify(x)).join(','));
  const blocco = '// PAESINI_REALI_INIZIO\nconst PAESINI_REALI = [\n' + righe.join(',\n') + '\n];\n// PAESINI_REALI_FINE';
  const html = fs.readFileSync('piccoli_imperi.html', 'utf8');
  fs.writeFileSync('piccoli_imperi.html', html.replace(/\/\/ PAESINI_REALI_INIZIO[\s\S]*?\/\/ PAESINI_REALI_FINE/, () => blocco));
  console.log(`GeoNames: ${lista.length} luoghi nell'area del gioco; PAESINI_REALI: ${tenuti.length} paesini`);
}
