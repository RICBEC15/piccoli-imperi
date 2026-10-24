function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }

setMapSize('piccola');
newGame();
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
players.p.stars = 500;

let portTile = null, seaTile = null;
for (const t of map.flat()) {
  if (t.terrain === 'grass' && !t.unit && !t.city && !t.port && !t.hosp) {
    const seas = neighbors(t).filter(n => (n.terrain === 'water' || n.terrain === 'river') && !n.unit);
    if (seas.length) { portTile = t; seaTile = seas[0]; break; }
  }
}
portTile.port = { owner: 'p' };
buyShip(portTile, 'p');
const shipTile = neighbors(portTile).find(n => n.unit && UNIT_TYPES[n.unit.type].ship);
shipTile.unit.lvl = 4; // livello arbitrario per il test

// round trip v15 con carico
const w = mkUnit('warrior', 'p'); w.count = 5; w.maxHp = UNIT_TYPES.warrior.hp*5; w.hp = w.maxHp;
shipTile.unit.cargo = w;

const data = serialize();
assert(data.v === 15, 'versione salvataggio = 15');

// distruggi lo stato e ricarica
const savedLvl = shipTile.unit.lvl, savedCargoCount = shipTile.unit.cargo.count;
newGame();
const ok = applySave(data);
assert(ok === true, 'applySave riesce su salvataggio v15');
const shipTile2 = map.flat().find(t => t.unit && UNIT_TYPES[t.unit.type].ship && t.unit.owner === 'p');
assert(!!shipTile2, 'nave ritrovata dopo il caricamento');
assert(shipTile2.unit.lvl === savedLvl, `livello nave preservato dal salvataggio (${savedLvl})`);
assert(shipTile2.unit.cargo && shipTile2.unit.cargo.count === savedCargoCount, 'carico preservato dal salvataggio');

// simulazione salvataggio "legacy" v14 senza campo lv sulla nave (pre-potenziamento navi)
const legacyData = JSON.parse(JSON.stringify(data));
legacyData.v = 14;
for (const s of legacyData.tiles) if (s.u) delete s.u.lv;
newGame();
const ok2 = applySave(legacyData);
assert(ok2 === true, 'applySave riesce su salvataggio v14 legacy (senza campo livello nave)');
const shipTile3 = map.flat().find(t => t.unit && UNIT_TYPES[t.unit.type].ship && t.unit.owner === 'p');
assert(!!shipTile3, 'nave ritrovata dopo caricamento legacy');
assert(shipTile3.unit.lvl >= 1, 'nave legacy riceve un livello valido di default');
// condono: il carico di 5 soldati supera la capacita' del livello 1 (3): la nave deve
// essere promossa al livello minimo che la puo' contenere (livello 2, capacita 7)
assert(navCap(shipTile3.unit.lvl) >= aliveCount(shipTile3.unit.cargo), 'condono: il livello e sufficiente a contenere il carico salvato');
assert(shipTile3.unit.lvl === 2, 'condono applicato al livello minimo necessario (2, capacita 7 >= 5 soldati)');

console.log('TUTTI I TEST SALVATAGGIO SUPERATI');
