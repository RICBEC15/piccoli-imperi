// Test della v78: il fiume dentro la città conta come città (con i suoi ponti) e la città è
// un'unica area: chi la conquista prende tutte le sue caselle, fiume compreso.
// uso: cat stub.js game.js cittaunicatest.js > _run.js && node _run.js
let passati = 0, falliti = 0;
function prova(nome, fn) {
  try {
    const r = fn();
    if (r === true) { passati++; console.log('OK: ' + nome); }
    else { falliti++; console.log('FALLITO: ' + nome + (r ? ' :: ' + r : '')); }
  } catch (e) { falliti++; console.log('FALLITO (eccezione): ' + nome + ' :: ' + e.stack); }
}
setMapSize('media');
newGame();
cambiaPaese('IT');
tutorial = false;
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
deselect(); undoStack = [];
const citta = n => dallIndice(conCitta, t => t.city.n === n)[0];

prova('Parigi, Londra e Budapest hanno il fiume dentro la città', () => {
  for (const n of ['Parigi', 'Londra', 'Budapest']) {
    const t = citta(n);
    if (!t) return 'manca ' + n;
    if (!areaCitta(t).some(x => x.fiumeCitta)) return n + ' senza fiume in città';
  }
  return true;
});
prova('il fiume in città ha i ponti, è città, si conquista; il fiume fuori città no', () => {
  const cf = map.flat().filter(t => t.fiumeCitta);
  if (!cf.length) return 'nessun fiume in città';
  if (!cf.every(t => t.terrain === 'river' && t.bridge && urbana(t) && terraConquistabile(t))) return 'regole sbagliate';
  const fuori = map.flat().filter(t => t.terrain === 'river' && !t.fiumeCitta);
  if (fuori.some(t => urbana(t) || terraConquistabile(t))) return 'un fiume fuori città conta come città';
  if (fuori.filter(t => t.bridge).length) return 'ponti fuori città a inizio partita';
  if (cf.length > 200) return 'troppi fiumi in città: ' + cf.length;
  return true;
});
prova('sul fiume in città si difende come in città (+1), sul ponte normale -1', () => {
  const cf = map.flat().find(t => t.fiumeCitta && !t.unit);
  const pr = map.flat().find(t => t.terrain === 'river' && !t.fiumeCitta && !t.unit);
  cf.unit = { type: 'warrior', owner: 'p', count: 5, hp: 10 };
  pr.unit = { type: 'warrior', owner: 'p', count: 5, hp: 10 }; pr.bridge = true;
  const base = UNIT_TYPES.warrior.def;
  const a = defOf(cf), b = defOf(pr);
  cf.unit = null; pr.unit = null; pr.bridge = false;
  return (a >= base + 1 && b <= base) || `città ${a}, ponte ${b}, base ${base}`;
});
prova("l'area di una città è unica: ogni casella urbana in una sola area, la città ne è il capo", () => {
  const t = citta('Londra'), area = areaCitta(t);
  if (area.length < 5) return 'area troppo piccola: ' + area.length;
  if (area.some(x => zonaDi(x) !== zonaDi(t))) return 'zone diverse';
  if (zonaDi(t) !== t.r * COLS + t.c) return 'la città non è il capo della sua area';
  if (area.filter(x => x.city).length !== 1) return 'due città nella stessa area';
  return bordoArea(t).length > 0 || 'nessun contorno';
});
prova('conquistando la città si prende tutta la sua area, fiume compreso', () => {
  const t = citta('Parigi');
  const o = t.city.owner;
  if (!o || o === 'p') return 'Parigi non è di un impero nemico: ' + o;
  setRelazione('p', o, 'guerra');
  const area = areaCitta(t);
  t.city.capital = false; // non far cadere l'impero: si guarda solo l'area
  t.unit = null;
  t.unit = { type: 'warrior', owner: 'p', count: 5, hp: 10 };
  arrivalEffects(t);
  const nonMie = area.filter(x => terraConquistabile(x) && padroneTerra(x) !== 'p');
  if (t.city.owner !== 'p') return 'città non presa';
  if (nonMie.length) return nonMie.length + ' caselle dell\'area non prese';
  return area.some(x => x.fiumeCitta) || 'area senza fiume';
});
prova('dopo salva e carica il fiume in città resta città con i ponti', () => {
  const prima = map.flat().filter(t => t.fiumeCitta).map(t => t.r + ',' + t.c).join(';');
  applySave(JSON.parse(JSON.stringify(serialize())));
  const dopo = map.flat().filter(t => t.fiumeCitta && t.bridge).map(t => t.r + ',' + t.c).join(';');
  return prima === dopo || 'diversi';
});
prova('un salvataggio senza i ponti in città (versioni di prima) li ritrova', () => {
  const d = JSON.parse(JSON.stringify(serialize()));
  const cf = new Set(map.flat().filter(t => t.fiumeCitta).map(t => t.r + ',' + t.c));
  d.ponti = d.ponti.filter(([r, c]) => !cf.has(r + ',' + c));
  applySave(d);
  return map.flat().filter(t => t.fiumeCitta && t.bridge).length === cf.size || 'ponti mancanti';
});
console.log(`\n${passati} passati, ${falliti} falliti`);
if (falliti) process.exit(1);
