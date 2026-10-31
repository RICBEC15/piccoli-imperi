// v74: scrive in piccoli_imperi.html la riga `const MAPPE_FISSE = {...}`, la mappa di ogni taglia
// gia' calcolata (terreno, paesi, segni, villaggi), cosi' una partita nuova non la ricalcola.
// Va rilanciato ogni volta che cambia qualcosa in calcolaMappa (confini, fiumi, biomi, villaggi...).
// uso: node build_mappe.js
"use strict";
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, 'piccoli_imperi.html');
let html = fs.readFileSync(FILE, 'utf8');
const RIGA = /^const MAPPE_FISSE = .*\n/m;
// il gioco senza i dati vecchi: la mappa si calcola da zero
const i = html.indexOf('<script>\n"use strict"'), j = html.lastIndexOf('</script>');
const gioco = html.slice(i + 8, j).replace(RIGA, '');
const stub = fs.readFileSync(path.join(__dirname, 'stub.js'), 'utf8');
// il gioco gira in un processo a parte (come i test: stub.js + il codice), che stampa i dati in JSON
const TMP = path.join(__dirname, '_build_mappe_run.js');
fs.writeFileSync(TMP, stub + '\n' + gioco + `
;{ const out = {};
  for (const t of ['piccola', 'media', 'gigante']) { setMapSize(t); out[t] = datiMappaFissa(); }
  require('fs').writeFileSync(process.argv[2], JSON.stringify(out)); }`);
const OUT = path.join(__dirname, '_build_mappe_out.json');
try { require('child_process').execFileSync(process.execPath, [TMP, OUT], { stdio: ['ignore', 'ignore', 'inherit'] }); }
finally { fs.rmSync(TMP, { force: true }); }
const dati = JSON.parse(fs.readFileSync(OUT, 'utf8'));
fs.rmSync(OUT, { force: true });
for (const [t, d] of Object.entries(dati)) {
  if (d.citta.some(x => typeof x[2] !== 'string')) throw new Error(t + ': un villaggio senza nome');
  console.log(`${t}: ${d.cols}x${d.rows}, ${d.paesi.length} paesi, ${d.citta.length} villaggi, ${((d.t.length + d.p.length + d.f.length) / 1024).toFixed(0)} KB di griglie`);
}
const riga = 'const MAPPE_FISSE = ' + JSON.stringify(dati) + ';\n';
if (RIGA.test(html)) html = html.replace(RIGA, () => riga);
else html = html.replace(/^(const BIOMI = .*\n)/m, (m) => m + riga);
fs.writeFileSync(FILE, html);
console.log('scritto MAPPE_FISSE in piccoli_imperi.html');
