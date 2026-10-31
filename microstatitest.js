// Test dei microstati (v65): San Marino nuovo (il Vaticano, tolto nella v73, lo prova vaticanotest.js), e Monaco, Liechtenstein e Andorra
// giocabili a ogni taglia (i paesi nuovi del nord e dell'est li prova paesinuovitest.js).
// uso: cat stub.js game.js microstatitest.js > _run.js && node _run.js   (circa 20 secondi)
function assert(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(1); } else console.log('OK:', msg); }
let seme = 64;
Math.random = () => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme / 0x7fffffff; };

assert(COUNTRY_NAMES.SM && CAPITALI_REALI.SM, 'San Marino ha nome e capitale');
setAvversari('tutti');
for (const taglia of ['piccola', 'media', 'gigante']) {
  setMapSize(taglia);
  newGame();
  const info = paesiInfo(), g = geoSetup();
  const mancano = Object.keys(COUNTRY_NAMES).filter(cc => !info[cc]);
  assert(!mancano.length, `${taglia}: tutti i ${Object.keys(COUNTRY_NAMES).length} paesi si possono giocare${mancano.length ? ' (mancano ' + mancano.join(' ') + ')' : ''}`);
  assert(imperiIA().length === Object.keys(COUNTRY_NAMES).length, `${taglia}: ogni paese è un impero IA`);
  for (const cc of ['SM', 'MC']) {
    assert(info[cc].caselle === 1 && capitaleDi(cc) && capitaleDi(cc).country === cc, `${taglia}: ${nomePaese(cc)} ha una casella, con la sua capitale`);
  }
  const roma = tileAtGeo(12.50, 41.90, g);
  assert(roma.country === 'IT' && !players.VA && !map.flat().some(t => t.country === 'VA'), `${taglia}: Roma è italiana e il Vaticano non c'è più`);
  assert(dist(capitaleDi('SM'), tileAtGeo(12.45, 43.94, g)) <= 1, `${taglia}: San Marino è al suo posto, vicino a Rimini`);
  // un salvataggio ricaricato ritrova i microstati
  const data = serialize();
  assert(applySave(data) && ['SM', 'MC'].every(cc => capitaleDi(cc) && capitaleDi(cc).country === cc), `${taglia}: dopo il caricamento i microstati sono ancora loro`);
}
// si possono anche scegliere: il giocatore guida San Marino
setMapSize('piccola');
newGame();
onTileClick(map.flat().find(t => t.country === 'SM'));
assert(players.p.country === 'SM' && !players.SM, 'toccato San Marino: è tuo');
placePlayerCapital(placeSet[0]);
assert(pCapital().country === 'SM' && players.p.stars > 7, `capitale a San Marino, con le stelle di compenso (${players.p.stars}⭐)`);
endTurn();
assert(current === 'p' && !gameOver, 'un giro di turni senza errori');
console.log('TUTTI I TEST MICROSTATI SUPERATI');
