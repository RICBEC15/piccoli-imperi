# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia: tu contro un'IA (l'"Impero Cremisi") su una mappa geografica reale dell'Europa, dalle Canarie agli Urali. A inizio partita scegli il paese da guidare: il suo territorio è la tua patria. Vince chi conquista la capitale avversaria.

## Come giocare

Online: **https://ricbec15.github.io/piccoli-imperi/** (dal browser, anche da telefono).

In locale: apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `index.html`: pagina d'ingresso per GitHub Pages, rimanda subito a `piccoli_imperi.html`.
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `paesitest.js`, `difficoltatest.js`, `mappatest.js`, `popolazionetest.js`, `browser_check.js`, `mobile_check.js`, `pantest.js`: test automatici (`mobile_check.js` prova il gioco su un iPhone emulato con Playwright, `pantest.js` lo spostamento nella mappa col mouse, le frecce e il dito).
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `build_biomi.py`, `export_tiles.js`: costruiscono i biomi fissi dai dati di OpenStreetMap.
- `build_popolazione.js`: costruisce la lista delle città vere con i loro abitanti (Natural Earth).
- `ISTRUZIONI_MIGRAZIONE.md`: note di sviluppo, storia delle ultime versioni e istruzioni dettagliate.

## Test

```bash
python3 -c "import re; h=open('piccoli_imperi.html',encoding='utf-8').read(); open('game.js','w',encoding='utf-8').write(re.search(r'<script>(.*?)</script>',h,re.S).group(1))"
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
cat stub.js game.js paesitest.js > _run.js && node _run.js
cat stub.js game.js aitest.js > _run.js && node _run.js   # IA: 150 turni, circa un minuto
cat stub.js game.js difficoltatest.js > _run.js && node _run.js   # difficoltà IA: circa 40 secondi
cat stub.js game.js mappatest.js > _run.js && node _run.js
cat stub.js game.js popolazionetest.js > _run.js && node _run.js
```

## La mappa

C'è **una sola mappa per ogni grandezza** (piccola, media, gigante), uguale a ogni partita: cambia solo il punto in cui nasce la capitale nemica.

- Confini e coste: Natural Earth (poligoni dentro `piccoli_imperi.html`).
- Biomi (prato, bosco, collina, montagna, deserto di dune o di pietra, tundra): **OpenStreetMap**, precalcolati casella per casella e scritti nella riga `const BIOMI = ...` del gioco. Si leggono i poligoni di boschi, rocce, ghiacciai, sabbie, zone umide e brughiere, le quote delle cime e, per il Nord Africa, i campi coltivati. Dati © OpenStreetMap contributors (ODbL), letti tramite il tema `base` di Overture Maps.
- Per rifare i biomi (per esempio dopo aver cambiato la forma della mappa) si usano `build_biomi.py` ed `export_tiles.js`: le istruzioni sono in testa a `build_biomi.py`. Non serve altro: fiumi, laghi, stretti e villaggi restano calcolati dal gioco in modo fisso.

## Città e abitanti

Ogni città ha i suoi **abitanti veri**: quelli dell'agglomerato urbano (campo `POP_MAX`) del dataset Natural Earth *populated places* 1:10m, di pubblico dominio (naturalearthdata.com). Roma ha 3.339.000 abitanti, Parigi 9.904.000, Milano 2.945.000. Le 1142 città che cadono sulle terre del gioco sono nella lista `CITTA_REALI` dentro `piccoli_imperi.html`, scritta da `build_popolazione.js` (istruzioni in testa al file).

- Ogni città vera da un milione di abitanti in su ha il suo villaggio neutrale sulla mappa.
- Ogni villaggio prende nome e abitanti della città vera più popolosa entro poco più di una casella (almeno 25 km); quelli lontani da città note hanno abitanti **stimati** (da 2.000 a 30.000, nel deserto da 500 a 8.000), fissi per casella.
- La rendita cresce con gli abitanti, a scaglioni: sotto 5.000 abitanti 1⭐, da 5.000 2⭐, da 50.000 3⭐, da 200.000 4⭐, da 700.000 5⭐, da 2 milioni 6⭐, da 5 milioni 7⭐. La capitale rende 1⭐ in più (almeno 3⭐), e ogni livello di crescita portato dai cittadini aggiunge 1⭐.

Ogni modifica alla mappa va verificata con `mappatest.js`, che controlla anche che due partite abbiano la stessa mappa.

## Versione

v64 (formato di salvataggio v16, i vecchi salvataggi si caricano): ogni città ha nome e abitanti veri, e gli abitanti decidono quante stelle rende. La capitale si può fondare su un villaggio neutrale del proprio paese (per esempio Roma). Il vecchio distintivo azzurro della popolazione si chiama ora crescita.

v59 (formato di salvataggio v16): ci si sposta nella mappa a qualunque zoom. Si trascina col mouse (o col dito), si usano la rotella o le frecce della tastiera. Attorno alla mappa c'è un bordo di mezzo schermo, così anche con tutta la mappa nello schermo la si può spostare e ogni casella del bordo si può portare al centro.

v58 (formato di salvataggio v16): riunisce in una sola versione la mappa fissa con i biomi OpenStreetMap, la scelta del paese e la difficoltà dell'IA cambiabile in partita.

Dalla v56 ogni impero gioca un paese reale: a inizio partita scegli il tuo (dalla lista o toccandolo sulla mappa), il nemico prende un paese vicino o quello che scegli tu. In patria le unità si difendono meglio (+1) e i paesi con pochi villaggi partono con qualche stella in più.

v57: una mappa fissa per ogni grandezza con i biomi reali di OpenStreetMap, al posto delle regole scritte a mano paese per paese (tolte circa 250 righe). Il file cresce di circa 117 KB.

v56 (mappa): corretto il confine della Russia in alto sulla mappa. Il ritaglio del poligono si portava dietro un "giro di ritorno" lungo il bordo (dovuto alla Chukotka oltre il 180° meridiano) che invertiva un rettangolo fra 18°E e 61°E e fra 65°N e 69°N: compariva un blocco di terra finta in Lapponia e mancavano la penisola di Kola e il Mar Bianco.

Dalla v55 la mappa si disegna a tessere, come le mappe online: il canvas è grande quanto lo schermo e il terreno viene preparato in quadrati da 256 pixel, uno per livello di zoom, solo dove serve. Prima il canvas era grande quanto tutta la mappa (circa 241 milioni di pixel) e su telefono non funzionava.

La difficoltà dell'IA (Facile, Normale, Difficile) si sceglie nella schermata iniziale e si può cambiare in qualsiasi momento dal menu 🤖 IA in alto: vale dal turno nemico successivo e viene salvata nel file della partita (i salvataggi precedenti si caricano a Normale). Difficile è l'IA della v54, che attacca appena è forte; Normale non attacca prima del turno 30 e ha un'economia ridotta; Facile non attacca prima del turno 60, tiene un esercito piccolo e incassa il 70% della rendita.
