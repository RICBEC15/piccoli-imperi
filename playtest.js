function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
setMapSize('piccola');
newGame();
cambiaPaese('IT');
tutorial = false; // salta il tutorial per il test
if (placing && placeSet.length) placePlayerCapital(placeSet[0]);
try {
  for (let i = 0; i < 15; i++) {
    ui(); render();
    if (congedo) {
      // congeda automaticamente qualche unita' finche' possibile, come farebbe il giocatore
      let guard = 0;
      while (congedo && guard++ < 200) {
        const cand = unitsOf('p').find(x => UNIT_TYPES[x.unit.type].ship || UNIT_TYPES[x.unit.type].atk > 0);
        if (!cand) break;
        congedaClick(cand);
      }
    }
    if (gameOver) break;
    endTurn();
  }
  ui(); render();
  console.log('turni giocati senza eccezioni, turn=', turn, 'gameOver=', gameOver);
  assert(true, 'partita di alcuni turni completata senza crash');
} catch (e) {
  console.error('CRASH', e.stack);
  process.exit(1);
}

// snapshot/restore round trip con nave dotata di livello e carico
let portTile = null, seaTile = null;
for (const t of map.flat()) {
  if (t.terrain === 'grass' && !t.unit && !t.city && !t.port && !t.hosp) {
    const seas = neighbors(t).filter(n => (n.terrain === 'water' || n.terrain === 'river') && !n.unit);
    if (seas.length) { portTile = t; seaTile = seas[0]; break; }
  }
}
players.p.stars = 500;
portTile.port = { owner: 'p' };
buyShip(portTile, 'p');
const shipTile = neighbors(portTile).find(n => n.unit && UNIT_TYPES[n.unit.type].ship);
shipTile.unit.lvl = 6;
const snap = snapshot();
shipTile.unit.lvl = 1;
restoreSnapshot(snap);
const shipTile2 = map.flat().find(t => t.unit && UNIT_TYPES[t.unit.type].ship && t.unit.owner === 'p');
assert(shipTile2.unit.lvl === 6, 'snapshot/restoreSnapshot preserva il livello della nave (undo)');

console.log('TUTTI I TEST DI GIOCO SUPERATI');
