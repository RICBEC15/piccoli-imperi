// Test dei biomi OpenStreetMap del prato (v60): ci sono sulla mappa e hanno le loro regole.
// uso: cat stub.js game.js biomitest.js > _run.js && node _run.js
let fail = 0;
function check(ok, txt) { console.log((ok ? 'OK: ' : 'ERRORE: ') + txt); if (!ok) fail++; }

for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia); newGame();
  const conta = {};
  for (const t of map.flat()) { const b = bioma(t); if (b) conta[b] = (conta[b] || 0) + 1; }
  console.log(taglia, JSON.stringify(conta));
  for (const b of ['p', 'c', 'v', 'u', 'k', 'b', 'a', 'z'])
    check(conta[b] > 0, `${taglia}: c'e' il bioma ${BIOMA_INFO[b].nome} (${conta[b] || 0} caselle)`);
  // ogni lettera dei biomi e' un terreno conosciuto
  const src = BIOMI[taglia].replace(/[0-9.]/g, '');
  check([...new Set(src)].every(ch => BIOMA_TERRENO[ch]), `${taglia}: ogni simbolo di BIOMI ha un terreno`);
}

setMapSize('piccola'); newGame();
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
const libera = t => t.terrain === 'grass' && !t.unit && !t.city && !t.hosp && !t.port;
const terra = map.flat().filter(libera);

// la palude ferma il movimento: un Cavaliere che ci entra non va oltre
const pal = terra.find(t => bioma(t) === 'p' && neighbors(t).filter(n => libera(n) && bioma(n) === 'g').length >= 2);
check(!!pal, 'trovata una palude in mezzo al prato');
if (pal) {
  const [da, oltre] = neighbors(pal).filter(n => libera(n) && bioma(n) === 'g');
  check(fermaMovimento(pal) && !fermaMovimento(da), 'fermaMovimento: palude si, prato no');
  da.unit = mkUnit('knight', 'p');
  const mosse = movesFor(da);
  check(mosse.includes(pal), 'il Cavaliere puo\' entrare in palude');
  // come collina (che non ferma) da li' si proseguirebbe: in palude le mosse sono meno
  pal.terrain = 'hill'; const senza = movesFor(da); pal.terrain = 'grass';
  check(senza.length > mosse.length && mosse.every(m => senza.includes(m)), `dalla palude non si prosegue nello stesso turno (${mosse.length} mosse contro ${senza.length})`);
  da.unit = null;
  check(!canFoundTile(pal), 'in palude non si fonda un villaggio');
  check(!computePlaceSet().includes(pal), 'in palude non si mette la capitale');
}

// la citta' (zone costruite) da' +1 difesa
const urb = terra.find(t => bioma(t) === 'u' && !inPatria(t, 'p'));
const pra = terra.find(t => bioma(t) === 'g' && !inPatria(t, 'p'));
check(!!urb && !!pra, 'trovate una citta\' e un prato fuori patria');
if (urb && pra) {
  urb.unit = mkUnit('warrior', 'p'); pra.unit = mkUnit('warrior', 'p');
  check(defOf(urb) === defOf(pra) + 1, `in citta' +1 difesa (${defOf(urb)} contro ${defOf(pra)})`);
  urb.unit = null; pra.unit = null;
}

// una citta' fra i campi rende +1 stella
const campo = map.flat().find(t => t.city && t.city.owner === null && terraFertile(t));
check(!!campo, 'c\'e\' un villaggio fra i campi');
if (campo) {
  const e0 = income('p');
  campo.city.owner = 'p';
  check(income('p') === e0 + 2 + (campo.city.pop - 1) + 1, 'un villaggio fra i campi conquistato rende 2+1 stelle');
  campo.city.owner = null;
  // senza campi attorno (tutto prato) lo stesso villaggio rende solo 2 stelle
  const sotto = [campo, ...neighbors(campo)].filter(x => x.terrain === 'grass' && ['c', 'v'].includes(bioma(x)));
  sotto.forEach(x => { x.terrain = 'hill'; });
  check(!terraFertile(campo), 'senza campi attorno non e\' fertile');
  sotto.forEach(x => { x.terrain = 'grass'; });
}

// salvataggio: i biomi non si salvano ma tornano uguali dopo il caricamento
const prima2 = map.flat().map(bioma).join('');
const dati = JSON.parse(JSON.stringify(serialize()));
newGame();
check(applySave(dati), 'il salvataggio si ricarica');
check(map.flat().map(bioma).join('') === prima2, 'dopo il caricamento i biomi sono gli stessi');
// un terreno salvato diverso dalla mappa di oggi (salvataggio vecchio): niente bioma che non torna
const urb2 = map.flat().find(t => t.terrain === 'grass' && bioma(t) === 'u');
urb2.terrain = 'forest';
check(bioma(urb2) === '', 'un bosco salvato dove oggi c\'e\' citta\' resta bosco senza bioma');

console.log(fail ? fail + ' TEST BIOMI FALLITI' : 'TUTTI I TEST BIOMI SUPERATI');
if (fail) process.exit(1);
