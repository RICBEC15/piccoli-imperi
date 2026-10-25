# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia, su una mappa geografica reale dell'Europa, dalle Canarie agli Urali. A inizio partita tocchi sulla mappa il paese da guidare: il suo territorio è la tua patria. **Ogni altro paese è un impero guidato dall'IA**, in guerra con tutti. Un impero cade quando perde la capitale; vinci quando sono caduti tutti. Nella schermata iniziale si può scegliere anche il duello: un solo nemico, l'"Impero Cremisi", in un paese vicino.

## Come giocare

Online: **https://ricbec15.github.io/piccoli-imperi/** (dal browser, anche da telefono).

In locale: apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `index.html`: pagina d'ingresso per GitHub Pages, rimanda subito a `piccoli_imperi.html`.
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `paesitest.js`, `imperitest.js`, `difficoltatest.js`, `mappatest.js`, `diplotest.js`, `browser_check.js`, `mobile_check.js`, `pantest.js`: test automatici (`mobile_check.js` prova il gioco su un iPhone emulato con Playwright, `pantest.js` lo spostamento nella mappa col mouse, le frecce e il dito).
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `build_biomi.py`, `export_tiles.js`: costruiscono i biomi fissi dai dati di OpenStreetMap.
- `ISTRUZIONI_MIGRAZIONE.md`: note di sviluppo, storia delle ultime versioni e istruzioni dettagliate.

## Test

```bash
python3 -c "import re; h=open('piccoli_imperi.html',encoding='utf-8').read(); open('game.js','w',encoding='utf-8').write(re.search(r'<script>(.*?)</script>',h,re.S).group(1))"
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
cat stub.js game.js paesitest.js > _run.js && node _run.js
cat stub.js game.js imperitest.js > _run.js && node _run.js   # tutti i paesi contro tutti: circa 30 secondi
cat stub.js game.js aitest.js > _run.js && node _run.js   # IA: 150 turni, circa un minuto
cat stub.js game.js difficoltatest.js > _run.js && node _run.js   # difficoltà IA: circa 40 secondi
cat stub.js game.js mappatest.js > _run.js && node _run.js
cat stub.js game.js diplotest.js > _run.js && node _run.js   # diplomazia: circa 15 secondi
```

## La mappa

C'è **una sola mappa per ogni grandezza** (piccola, media, gigante), uguale a ogni partita: cambiano solo i punti in cui nascono le capitali degli imperi IA.

- Confini e coste: Natural Earth (poligoni dentro `piccoli_imperi.html`).
- Biomi (prato, bosco, collina, montagna, deserto di dune o di pietra, tundra): **OpenStreetMap**, precalcolati casella per casella e scritti nella riga `const BIOMI = ...` del gioco. Si leggono i poligoni di boschi, rocce, ghiacciai, sabbie, zone umide e brughiere, le quote delle cime e, per il Nord Africa, i campi coltivati. Dati © OpenStreetMap contributors (ODbL), letti tramite il tema `base` di Overture Maps.
- Per rifare i biomi (per esempio dopo aver cambiato la forma della mappa) si usano `build_biomi.py` ed `export_tiles.js`: le istruzioni sono in testa a `build_biomi.py`. Non serve altro: fiumi, laghi, stretti e villaggi restano calcolati dal gioco in modo fisso.

Ogni modifica alla mappa va verificata con `mappatest.js`, che controlla anche che due partite abbiano la stessa mappa.

## Versione

v61 (formato di salvataggio v17 con il campo facoltativo `diplomazia`): la **diplomazia**. Toccando il territorio di un altro impero (con niente di selezionato) si apre la sua scheda: puoi proporgli la pace o un'alleanza, o dichiarargli guerra. All'inizio sei in guerra con tutti.

- In pace o alleati non vi attaccate e non entrate nelle città e nei porti dell'altro (né tu né l'IA). L'alleanza dà +1⭐ a turno di commercio a testa.
- L'IA accetta o rifiuta secondo la forza dei due imperi (soldati + 2 per città), le tue truppe vicine alle sue città, la difficoltà e la fiducia che ha in te. La scheda mostra la probabilità (alta, media, nessuna). Dopo un rifiuto si riprova fra 3 turni.
- Rompere un patto costa la fiducia dell'impero tradito e un po' di quella di tutti gli altri. Un impero in pace con te che diventa molto più forte può tornare in guerra da solo (dopo almeno 15 turni di pace); le alleanze le rompi solo tu.
- Vittoria diplomatica: se tutti gli imperi rimasti sono tuoi alleati.
- Fra gli imperi IA resta la guerra di tutti contro tutti. Nel duello e nel tutorial la diplomazia non c'è.
- Il salvataggio tiene patti, fiducia e rifiuti; un salvataggio che non li ha riparte in guerra con tutti.

v60 (formato di salvataggio v17): **ogni paese è un impero guidato dall'IA** e il paese si sceglie toccandolo sulla mappa.

- All'inizio la mappa si vede tutta e ogni paese ha il suo colore. Tocchi il paese che vuoi e la vista si avvicina; poi tocchi la casella dove fondare la capitale, oppure un altro paese per cambiare idea. L'elenco 🌍 resta come aiuto.
- Ogni altro paese (34 sulla mappa) ha il suo impero: capitale nel suo paese, verso l'interno e lontana dalle altre, truppe, economia e la stessa difficoltà scelta nel menu 🤖 IA. Sono tutti in guerra con tutti: si espandono, si combattono fra loro e attaccano la città nemica più vicina, tua o di un altro impero.
- Quando un impero perde la capitale cade: chi l'ha presa la tiene come città qualunque, le altre sue città tornano villaggi liberi, l'esercito si scioglie, porti e ospedali restano senza padrone. In alto 🏳️ conta gli imperi rimasti.
- Dopo il tuo turno muovono tutti, uno dopo l'altro. Le mosse vicino a te si vedono una alla volta e finiscono nella cronaca; quelle lontane si fanno di colpo, e la cronaca riporta solo le cadute degli imperi. Un turno degli imperi dura circa 1,5 secondi sulla mappa piccola e 2-3 secondi sulla gigante, più le mosse vicino a te.
- Per reggere 34 imperi: le caselle con unità, città, porti e ospedali stanno in indici, invece di scorrere tutta la mappa a ogni domanda, e la "mappa di marcia" di ogni impero si calcola solo attorno alle sue unità. Il turno dell'IA è circa dieci volte più veloce di prima anche nel duello.
- Salvataggio v17: salva gli imperi (l'id di ciascuno è il codice del suo paese), le loro stelle e quelli caduti. I salvataggi precedenti si caricano come duello: il vecchio nemico diventa l'impero del suo paese.
- Il tutorial resta un duello (Italia contro un vicino). Nuovo test `imperitest.js`; gli altri test giocano il duello.

v59 (formato di salvataggio v16): ci si sposta nella mappa a qualunque zoom. Si trascina col mouse (o col dito), si usano la rotella o le frecce della tastiera. Attorno alla mappa c'è un bordo di mezzo schermo, così anche con tutta la mappa nello schermo la si può spostare e ogni casella del bordo si può portare al centro.

v58 (formato di salvataggio v16): riunisce in una sola versione la mappa fissa con i biomi OpenStreetMap, la scelta del paese e la difficoltà dell'IA cambiabile in partita.

Dalla v56 ogni impero gioca un paese reale: a inizio partita scegli il tuo (dalla lista o toccandolo sulla mappa), il nemico prende un paese vicino o quello che scegli tu. In patria le unità si difendono meglio (+1) e i paesi con pochi villaggi partono con qualche stella in più.

v57: una mappa fissa per ogni grandezza con i biomi reali di OpenStreetMap, al posto delle regole scritte a mano paese per paese (tolte circa 250 righe). Il file cresce di circa 117 KB.

v56 (mappa): corretto il confine della Russia in alto sulla mappa. Il ritaglio del poligono si portava dietro un "giro di ritorno" lungo il bordo (dovuto alla Chukotka oltre il 180° meridiano) che invertiva un rettangolo fra 18°E e 61°E e fra 65°N e 69°N: compariva un blocco di terra finta in Lapponia e mancavano la penisola di Kola e il Mar Bianco.

Dalla v55 la mappa si disegna a tessere, come le mappe online: il canvas è grande quanto lo schermo e il terreno viene preparato in quadrati da 256 pixel, uno per livello di zoom, solo dove serve. Prima il canvas era grande quanto tutta la mappa (circa 241 milioni di pixel) e su telefono non funzionava.

La difficoltà dell'IA (Facile, Normale, Difficile) si sceglie nella schermata iniziale e si può cambiare in qualsiasi momento dal menu 🤖 IA in alto: vale dal turno nemico successivo e viene salvata nel file della partita (i salvataggi precedenti si caricano a Normale). Difficile è l'IA della v54, che attacca appena è forte; Normale non attacca prima del turno 30 e ha un'economia ridotta; Facile non attacca prima del turno 60, tiene un esercito piccolo e incassa il 70% della rendita.
