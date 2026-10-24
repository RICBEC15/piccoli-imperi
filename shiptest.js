function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }

setMapSize('piccola');
newGame();
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
players.p.stars = 1000;

// trova una casella di terra libera con un vicino d'acqua libero, lontana da unità
let portTile = null, seaTile = null;
outer:
for (const t of map.flat()) {
  if (t.terrain === 'grass' && !t.unit && !t.city && !t.port && !t.hosp) {
    const seas = neighbors(t).filter(n => (n.terrain === 'water' || n.terrain === 'river') && !n.unit);
    if (seas.length) { portTile = t; seaTile = seas[0]; break outer; }
  }
}
assert(!!portTile, 'trovata una casella costiera adatta per il porto di test');

portTile.port = { owner: 'p' };

assert(canBuyShip(portTile, 'p') === true, 'canBuyShip true con porto e stelle sufficienti');
const starsBefore = players.p.stars;
const ok = buyShip(portTile, 'p');
assert(ok === true, 'buyShip riesce');
assert(starsBefore - players.p.stars === SHIP_COST, `costo nave scalato correttamente (${SHIP_COST})`);

const shipTileRef = neighbors(portTile).find(n => n.unit && UNIT_TYPES[n.unit.type].ship);
assert(!!shipTileRef, 'la nave compare su una casella di mare adiacente al porto');
assert(shipTileRef.unit.lvl === 1, 'la nave nasce al livello 1');
assert(navCap(shipTileRef.unit.lvl) === 3, 'capacita livello 1 = 3');

// forza la nave a poter agire per il test di imbarco (appena comprata è "pronta dal turno dopo")
shipTileRef.unit.moved = false; shipTileRef.unit.attacked = false;

// crea un gruppo di 5 guerrieri su una casella di terra adiacente alla nave (supera la capacita' liv.1)
const landNear = neighbors(shipTileRef).find(n => n.terrain !== 'water' && n.terrain !== 'river' && !n.unit);
assert(!!landNear, 'trovata casella di terra adiacente alla nave per il test di imbarco');
const w = mkUnit('warrior', 'p');
w.count = 5; w.maxHp = UNIT_TYPES.warrior.hp * 5; w.hp = w.maxHp;
landNear.unit = w;

let emb = embarksFor(landNear);
assert(emb.length === 0, 'gruppo di 5 soldati NON puo imbarcarsi su nave di livello 1 (capacita 3)');

// riduci a 3 soldati: deve poter salire
w.count = 3; w.maxHp = UNIT_TYPES.warrior.hp * 3; w.hp = w.maxHp;
emb = embarksFor(landNear);
assert(emb.length === 1 && emb[0] === shipTileRef, 'gruppo di 3 soldati puo imbarcarsi su nave di livello 1 (capacita 3)');

doEmbark(landNear, shipTileRef);
assert(landNear.unit === null && shipTileRef.unit.cargo && shipTileRef.unit.cargo.count === 3, 'imbarco eseguito correttamente');

// ============ potenziamento ============
// shipTileRef e' adiacente a portTile (di 'p'): l'upgrade deve essere permesso
assert(canUpgradeShip(shipTileRef, 'p') === true, 'upgrade permesso: nave adiacente a un porto proprio');
// test negativo: porto altrui non abilita il potenziamento
const savedPortOwner = portTile.port.owner;
portTile.port.owner = 'a';
assert(canUpgradeShip(shipTileRef, 'p') === false, 'upgrade rifiutato se il porto adiacente e nemico');
portTile.port.owner = savedPortOwner;

// scenario pulito per il resto dei test di potenziamento
let portTile2 = null, seaTile2 = null;
outer2:
for (const t of map.flat()) {
  if (t.terrain === 'grass' && !t.unit && !t.city && !t.port && !t.hosp) {
    const seas = neighbors(t).filter(n => (n.terrain === 'water' || n.terrain === 'river') && !n.unit);
    if (seas.length && t !== portTile) { portTile2 = t; seaTile2 = seas[0]; break outer2; }
  }
}
assert(!!portTile2, 'trovata seconda casella costiera per test upgrade');
portTile2.port = { owner: 'p' };
const s2 = mkUnit('ship', 'p');
seaTile2.unit = s2;
assert(s2.lvl === 1, 'nuova nave al livello 1');
assert(canUpgradeShip(seaTile2, 'p') === true, 'upgrade permesso: nave adiacente a porto proprio e stelle sufficienti');

const starsBeforeUp = players.p.stars;
const cost1 = shipUpgradeCost(1);
const spent = upgradeShip(seaTile2, 'p');
assert(spent === cost1, `costo primo potenziamento = ${cost1}`);
assert(s2.lvl === 2, 'livello nave passato a 2');
assert(starsBeforeUp - players.p.stars === cost1, 'stelle scalate correttamente');
assert(s2.moved === false && s2.attacked === false, 'il potenziamento NON consuma azione/movimento della nave');

// potenzia fino al massimo e verifica la progressione di costo/capacita
players.p.stars = 1000000; // budget ampio per superare tutti i livelli senza vincoli di cassa
let totalSpeso = spent;
while (s2.lvl < NAVE_MAX_LIV) {
  const c = shipUpgradeCost(s2.lvl);
  const before = s2.lvl;
  const paid = upgradeShip(seaTile2, 'p');
  assert(paid === c, `costo coerente al livello ${before}->${before+1}`);
  totalSpeso += paid;
}
assert(s2.lvl === NAVE_MAX_LIV, 'nave arrivata al livello massimo 11');
assert(navCap(s2.lvl) === 50, 'capacita massima = 50 (= MAX_STACK)');
assert(canUpgradeShip(seaTile2, 'p') === false, 'nessun ulteriore potenziamento oltre il livello massimo');

// verifica progressione +68% composto
let expected = SHIP_COST;
let ok68 = true;
for (let l = 1; l < NAVE_MAX_LIV; l++) {
  const got = shipUpgradeCost(l);
  const exp = Math.ceil(SHIP_COST * Math.pow(1.68, l - 1));
  if (got !== exp) ok68 = false;
}
assert(ok68, 'formula costo potenziamento +68% composto rispettata su tutti i livelli');

// verifica progressione +30% composto upkeep
let ok30 = true;
for (let l = 1; l <= NAVE_MAX_LIV; l++) {
  const got = shipUpkeep(l);
  const exp = Math.ceil(Math.pow(1.3, l - 1));
  if (got !== exp) ok30 = false;
}
assert(ok30, 'formula mantenimento nave +30% composto rispettata su tutti i livelli');

// ============ upkeep totale ============
const upkBefore = upkeep('p');
// upkBefore deve includere: floor(soldati_totali/2) + shipUpkeep per ogni nave
let soldatiTot = 0, naviTot = 0;
for (const t of unitsOf('p')) {
  const u = t.unit, d = UNIT_TYPES[u.type];
  if (d.ship) { naviTot += shipUpkeep(u.lvl); if (u.cargo && UNIT_TYPES[u.cargo.type].atk>0) soldatiTot += aliveCount(u.cargo); }
  else if (d.atk > 0) soldatiTot += aliveCount(u);
}
assert(upkBefore === Math.floor(soldatiTot/2) + naviTot, 'upkeep(p) coerente con la somma manuale (soldati + mantenimento navi per livello)');

console.log('TUTTI I TEST NAVI SUPERATI');
