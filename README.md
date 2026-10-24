# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia: tu contro un'IA (l'"Impero Cremisi") su una mappa geografica reale dell'Europa, dalle Canarie agli Urali. Vince chi conquista la capitale avversaria.

## Come giocare

Online: **https://ricbec15.github.io/piccoli-imperi/** (dal browser, anche da telefono).

In locale: apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `index.html`: pagina d'ingresso per GitHub Pages, rimanda subito a `piccoli_imperi.html`.
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `mappatest.js`, `browser_check.js`, `mobile_check.js`: test automatici (`mobile_check.js` prova il gioco su un iPhone emulato con Playwright).
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `build_biomi.py`, `export_tiles.js`: costruiscono i biomi fissi dai dati di OpenStreetMap.
- `ISTRUZIONI_MIGRAZIONE.md`: note di sviluppo, storia delle ultime versioni e istruzioni dettagliate.

## Test

```bash
python3 -c "import re; h=open('piccoli_imperi.html',encoding='utf-8').read(); open('game.js','w',encoding='utf-8').write(re.search(r'<script>(.*?)</script>',h,re.S).group(1))"
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
cat stub.js game.js aitest.js > _run.js && node _run.js   # IA: 150 turni, circa un minuto
cat stub.js game.js mappatest.js > _run.js && node _run.js
```

## La mappa

C'è **una sola mappa per ogni grandezza** (piccola, media, gigante), uguale a ogni partita: cambia solo il punto in cui nasce la capitale nemica.

- Confini e coste: Natural Earth (poligoni dentro `piccoli_imperi.html`).
- Biomi (prato, bosco, collina, montagna, deserto di dune o di pietra, tundra): **OpenStreetMap**, precalcolati casella per casella e scritti nella riga `const BIOMI = ...` del gioco. Si leggono i poligoni di boschi, rocce, ghiacciai, sabbie, zone umide e brughiere, le quote delle cime e, per il Nord Africa, i campi coltivati. Dati © OpenStreetMap contributors (ODbL), letti tramite il tema `base` di Overture Maps.
- Per rifare i biomi (per esempio dopo aver cambiato la forma della mappa) si usano `build_biomi.py` ed `export_tiles.js`: le istruzioni sono in testa a `build_biomi.py`. Non serve altro: fiumi, laghi, stretti e villaggi restano calcolati dal gioco in modo fisso.

Ogni modifica alla mappa va verificata con `mappatest.js`, che controlla anche che due partite abbiano la stessa mappa.

## Versione

v57 (formato di salvataggio v15, invariato: le partite salvate si caricano con il loro terreno).

v57: una mappa fissa per ogni grandezza con i biomi reali di OpenStreetMap, al posto delle regole scritte a mano paese per paese (tolte circa 250 righe). Il file cresce di circa 117 KB.

v56: corretto il confine della Russia in alto sulla mappa. Il ritaglio del poligono si portava dietro un "giro di ritorno" lungo il bordo (dovuto alla Chukotka oltre il 180° meridiano) che invertiva un rettangolo fra 18°E e 61°E e fra 65°N e 69°N: compariva un blocco di terra finta in Lapponia e mancavano la penisola di Kola e il Mar Bianco.

Dalla v55 la mappa si disegna a tessere, come le mappe online: il canvas è grande quanto lo schermo e il terreno viene preparato in quadrati da 256 pixel, uno per livello di zoom, solo dove serve. Prima il canvas era grande quanto tutta la mappa (circa 241 milioni di pixel) e su telefono non funzionava.
