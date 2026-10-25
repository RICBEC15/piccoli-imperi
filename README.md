# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia: tu contro un'IA (l'"Impero Cremisi") su una mappa geografica reale dell'Europa, dalle Canarie agli Urali. A inizio partita scegli l'epoca (oggi, 1938, 1914, 1800, 1500 o l'anno Mille) e il paese da guidare: il suo territorio è la tua patria. Vince chi conquista la capitale avversaria.

## Come giocare

Online: **https://ricbec15.github.io/piccoli-imperi/** (dal browser, anche da telefono).

In locale: apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `index.html`: pagina d'ingresso per GitHub Pages, rimanda subito a `piccoli_imperi.html`.
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `paesitest.js`, `epochetest.js`, `difficoltatest.js`, `mappatest.js`, `browser_check.js`, `mobile_check.js`, `pantest.js`: test automatici (`mobile_check.js` prova il gioco su un iPhone emulato con Playwright, `pantest.js` lo spostamento nella mappa col mouse, le frecce e il dito).
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `build_biomi.py`, `export_tiles.js`: costruiscono i biomi fissi dai dati di OpenStreetMap.
- `build_epoche.py`: costruisce gli stati storici di ogni epoca (con `export_tiles.js`).
- `ISTRUZIONI_MIGRAZIONE.md`: note di sviluppo, storia delle ultime versioni e istruzioni dettagliate.

## Test

```bash
python3 -c "import re; h=open('piccoli_imperi.html',encoding='utf-8').read(); open('game.js','w',encoding='utf-8').write(re.search(r'<script>(.*?)</script>',h,re.S).group(1))"
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
cat stub.js game.js paesitest.js > _run.js && node _run.js
cat stub.js game.js epochetest.js > _run.js && node _run.js   # epoche: circa 3 minuti (anche la mappa gigante)
cat stub.js game.js aitest.js > _run.js && node _run.js   # IA: 150 turni, circa un minuto
cat stub.js game.js difficoltatest.js > _run.js && node _run.js   # difficoltà IA: circa 40 secondi
cat stub.js game.js mappatest.js > _run.js && node _run.js
```

## La mappa

C'è **una sola mappa per ogni grandezza** (piccola, media, gigante), uguale a ogni partita: cambia solo il punto in cui nasce la capitale nemica.

- Confini e coste: Natural Earth (poligoni dentro `piccoli_imperi.html`).
- Biomi (prato, bosco, collina, montagna, deserto di dune o di pietra, tundra): **OpenStreetMap**, precalcolati casella per casella e scritti nella riga `const BIOMI = ...` del gioco. Si leggono i poligoni di boschi, rocce, ghiacciai, sabbie, zone umide e brughiere, le quote delle cime e, per il Nord Africa, i campi coltivati. Dati © OpenStreetMap contributors (ODbL), letti tramite il tema `base` di Overture Maps.
- Per rifare i biomi (per esempio dopo aver cambiato la forma della mappa) si usano `build_biomi.py` ed `export_tiles.js`: le istruzioni sono in testa a `build_biomi.py`. Non serve altro: fiumi, laghi, stretti e villaggi restano calcolati dal gioco in modo fisso.

## Le epoche

Nella schermata iniziale (e nella scelta del paese, prima di fondare la capitale) si sceglie l'epoca: **oggi** (come prima), **1938**, **1914**, **1800**, **1500** o **l'anno Mille**. La mappa resta la stessa (terre, biomi, fiumi, villaggi): cambiano gli stati, con i confini e i nomi italiani di quell'anno, da 27 a 42 secondo l'epoca. Ogni stato storico ha un emblema al posto della bandiera (👑 impero, 🏰 regno, 🌙 stato islamico, ⛺ popoli e orde, 🏛️ repubblica). Il Sahara, senza stati nei dati, è terra di nessuno: ci sono villaggi ma non si può giocare. Il tutorial è sempre ai giorni nostri. L'epoca si salva nel file della partita (i salvataggi precedenti si caricano a oggi).

- Fonte dei confini: **historical-basemaps** di André Ourednik (https://github.com/aourednik/historical-basemaps), licenza **GPL-3.0**. I dati derivati (la riga `const EPOCHE = ...` del gioco, circa 100 KB) restano sotto GPL-3.0.
- Gli altri siti consultabili (OpenHistoricalMap, historiqly, backthen.world, Running Reality, GeaCron) non si possono scaricare dal server di sviluppo o non offrono dati scaricabili: OpenHistoricalMap (dati CC0) resta la fonte migliore se in futuro si potrà leggerla.
- I dati sono grossolani: `build_epoche.py` corregge gli errori trovati (nel 1938 la Turchia orientale finiva all'"Armenia" sovietica, nel 1914 la Georgia e la Finlandia erano fuori dall'Impero russo), unisce gli staterelli di 1-2 caselle al vicino e traduce i nomi. Per rifare i dati: istruzioni in testa a `build_epoche.py`.
- Limite: la mappa non ha come terra Polonia, Cechia, Slovacchia, Bielorussia, Baltici, Scandinavia, Danimarca e Medio Oriente, quindi gli stati storici di quelle zone compaiono solo con la parte che cade sulle terre di oggi (per esempio la Polonia del 1938 è la sola Galizia).

Ogni modifica alla mappa va verificata con `mappatest.js`, che controlla anche che due partite abbiano la stessa mappa.

## Versione

v60 (formato di salvataggio v16, con il campo facoltativo `epoca`): si sceglie l'epoca storica a inizio partita (vedi «Le epoche»).

v59 (formato di salvataggio v16): ci si sposta nella mappa a qualunque zoom. Si trascina col mouse (o col dito), si usano la rotella o le frecce della tastiera. Attorno alla mappa c'è un bordo di mezzo schermo, così anche con tutta la mappa nello schermo la si può spostare e ogni casella del bordo si può portare al centro.

v58 (formato di salvataggio v16): riunisce in una sola versione la mappa fissa con i biomi OpenStreetMap, la scelta del paese e la difficoltà dell'IA cambiabile in partita.

Dalla v56 ogni impero gioca un paese reale: a inizio partita scegli il tuo (dalla lista o toccandolo sulla mappa), il nemico prende un paese vicino o quello che scegli tu. In patria le unità si difendono meglio (+1) e i paesi con pochi villaggi partono con qualche stella in più.

v57: una mappa fissa per ogni grandezza con i biomi reali di OpenStreetMap, al posto delle regole scritte a mano paese per paese (tolte circa 250 righe). Il file cresce di circa 117 KB.

v56 (mappa): corretto il confine della Russia in alto sulla mappa. Il ritaglio del poligono si portava dietro un "giro di ritorno" lungo il bordo (dovuto alla Chukotka oltre il 180° meridiano) che invertiva un rettangolo fra 18°E e 61°E e fra 65°N e 69°N: compariva un blocco di terra finta in Lapponia e mancavano la penisola di Kola e il Mar Bianco.

Dalla v55 la mappa si disegna a tessere, come le mappe online: il canvas è grande quanto lo schermo e il terreno viene preparato in quadrati da 256 pixel, uno per livello di zoom, solo dove serve. Prima il canvas era grande quanto tutta la mappa (circa 241 milioni di pixel) e su telefono non funzionava.

La difficoltà dell'IA (Facile, Normale, Difficile) si sceglie nella schermata iniziale e si può cambiare in qualsiasi momento dal menu 🤖 IA in alto: vale dal turno nemico successivo e viene salvata nel file della partita (i salvataggi precedenti si caricano a Normale). Difficile è l'IA della v54, che attacca appena è forte; Normale non attacca prima del turno 30 e ha un'economia ridotta; Facile non attacca prima del turno 60, tiene un esercito piccolo e incassa il 70% della rendita.
