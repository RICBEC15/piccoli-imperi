// v74: la mappa gia' pronta (MAPPE_FISSE) e' identica a quella calcolata da zero (calcolaMappa).
// Se fallisce, la mappa e' cambiata: rilancia `node build_mappe.js`.
// uso: cat stub.js game.js mappefissetest.js > _run.js && node _run.js
let fail = 0;
function check(ok, txt) { console.log((ok ? 'OK: ' : 'ERRORE: ') + txt); if (!ok) fail++; }
function foto() {
  return map.flat().map(t => [t.terrain, t.country, !!t.hashland, !!t.saharaSud, !!t.canaria, !!t.bridge,
    t.city ? JSON.stringify(t.city) : ''].join('|'));
}
for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia);
  let s = Date.now(); calcolaMappa(); const tCalc = Date.now() - s; const a = foto();
  s = Date.now(); const ok = caricaMappaFissa(); const tFissa = Date.now() - s; const b = foto();
  check(ok, `${taglia}: MAPPE_FISSE c'e' e ha la taglia giusta`);
  let diverse = 0, prima = -1;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { diverse++; if (prima < 0) prima = i; }
  check(a.length === b.length && diverse === 0,
    `${taglia}: mappa pronta = mappa calcolata (${diverse} caselle diverse${prima >= 0 ? ', la prima: ' + a[prima] + ' / ' + b[prima] : ''})`);
  check(conCitta.size === map.flat().filter(t => t.city).length, `${taglia}: l'indice delle città è al completo`);
  console.log(`   ${taglia}: calcolata in ${tCalc} ms, pronta in ${tFissa} ms`);
}
console.log(fail ? fail + ' TEST MAPPE FISSE FALLITI' : 'TUTTI I TEST MAPPE FISSE SUPERATI');
if (fail) process.exit(1);
