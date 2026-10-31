# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia, su una mappa geografica reale dell'Europa, dall'Islanda e dalle Canarie agli Urali. A inizio partita scegli l'epoca (oggi, 1938, 1914, 1800, 1500 o l'anno Mille) e tocchi sulla mappa il paese da guidare: il suo territorio è la tua patria. **Ogni altro paese è un impero guidato dall'IA**, in guerra con tutti. Un impero cade quando perde la capitale; vinci quando sono caduti tutti. Nella schermata iniziale si può scegliere anche il duello: un solo nemico, l'"Impero Cremisi", in un paese vicino.

## Come giocare

Online: **https://ricbec15.github.io/piccoli-imperi/** (dal browser, anche da telefono).

In locale: apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `index.html`: pagina d'ingresso per GitHub Pages, rimanda subito a `piccoli_imperi.html`.
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `paesitest.js`, `imperitest.js`, `difficoltatest.js`, `mappatest.js`, `diplotest.js`, `conquistatest.js`, `capitalitest.js`, `paesinuovitest.js`, `microstatitest.js`, `popolazionetest.js`, `biomitest.js`, `epochetest.js`, `browser_check.js`, `mobile_check.js`, `pantest.js`, `conquista_check.js`, `citta_check.js`: test automatici (`mobile_check.js` prova il gioco su un iPhone emulato con Playwright, `pantest.js` lo spostamento nella mappa col mouse, le frecce e il dito).
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `build_paesi_nord.py`: estrae da Natural Earth i confini dei paesi aggiunti nella v65 (`POLY_NORD`, `SEMI_NORD`).
- `build_biomi.py`, `export_tiles.js`: costruiscono i biomi fissi dai dati di OpenStreetMap.
- `build_popolazione.js`: costruisce la lista delle città vere con i loro abitanti (Natural Earth).
- `build_epoche.py`: costruisce gli stati storici di ogni epoca (con `export_tiles.js`).
- `ISTRUZIONI_MIGRAZIONE.md`: note di sviluppo, storia delle ultime versioni e istruzioni dettagliate.

## Test

```bash
python3 -c "import re; h=open('piccoli_imperi.html',encoding='utf-8').read(); open('game.js','w',encoding='utf-8').write(re.search(r'<script>(.*?)</script>',h,re.S).group(1))"
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
cat stub.js game.js paesitest.js > _run.js && node _run.js
cat stub.js game.js imperitest.js > _run.js && node _run.js   # tutti i paesi contro tutti: circa 30 secondi
cat stub.js game.js epochetest.js > _run.js && node _run.js   # epoche: circa 3 minuti (anche la mappa gigante)
cat stub.js game.js aitest.js > _run.js && node _run.js   # IA: 150 turni, circa un minuto
cat stub.js game.js difficoltatest.js > _run.js && node _run.js   # difficoltà IA: circa 40 secondi
cat stub.js game.js mappatest.js > _run.js && node _run.js
cat stub.js game.js diplotest.js > _run.js && node _run.js   # diplomazia: circa 15 secondi
cat stub.js game.js conquistatest.js > _run.js && node _run.js   # conquista del territorio: circa 20 secondi
cat stub.js game.js capitalitest.js > _run.js && node _run.js   # capitali reali: pochi secondi
cat stub.js game.js paesinuovitest.js > _run.js && node _run.js   # i paesi della v65: circa 20 secondi
cat stub.js game.js microstatitest.js > _run.js && node _run.js   # i microstati: circa 20 secondi
cat stub.js game.js popolazionetest.js > _run.js && node _run.js   # abitanti veri delle città
cat stub.js game.js biomitest.js > _run.js && node _run.js   # i biomi OSM
```

## La mappa

C'è **una sola mappa per ogni grandezza** (piccola, media, gigante), uguale a ogni partita: cambiano solo i punti in cui nascono le capitali degli imperi IA.

- Confini e coste: Natural Earth (poligoni dentro `piccoli_imperi.html`).
- Biomi: **OpenStreetMap**, precalcolati casella per casella e scritti nella riga `const BIOMI = ...` del gioco. Prato, bosco, collina, montagna, ghiacciaio, deserto di dune o di pietra, salina, tundra, e dalla v66 palude, campi coltivati, vigneti e frutteti, città (zone costruite), macchia, brughiera e prateria. Si leggono i poligoni `natural=*` (boschi, rocce, ghiacciai, sabbie, zone umide, macchie, brughiere, praterie), i `landuse=*` (campi, vigneti, frutteti, zone residenziali e industriali, saline) e le quote delle cime. Dati © OpenStreetMap contributors (ODbL), letti tramite il tema `base` di Overture Maps.
- Per rifare i biomi (per esempio dopo aver cambiato la forma della mappa) si usano `build_biomi.py` ed `export_tiles.js`: le istruzioni sono in testa a `build_biomi.py`. Non serve altro: fiumi, laghi, stretti e villaggi restano calcolati dal gioco in modo fisso.

## Città e abitanti

Ogni città ha i suoi **abitanti veri**: quelli dell'agglomerato urbano (campo `POP_MAX`) del dataset Natural Earth *populated places* 1:10m, di pubblico dominio (naturalearthdata.com). Roma ha 3.339.000 abitanti, Parigi 9.904.000, Milano 2.945.000. Le 1366 città che cadono sulle terre del gioco sono nella lista `CITTA_REALI` dentro `piccoli_imperi.html`, scritta da `build_popolazione.js` (istruzioni in testa al file).

- Ogni città vera da un milione di abitanti in su ha il suo villaggio neutrale sulla mappa.
- Ogni villaggio prende nome e abitanti della città vera più popolosa entro poco più di una casella (almeno 25 km).
- Dalla v69 sulla mappa restano **solo le città da 100.000 abitanti in su e le capitali** (anche più piccole: Podgorica, La Valletta...). I villaggi sotto i 100.000 abitanti, e quelli senza una città vera vicina, non ci sono più; ogni capitale vera che non aveva un villaggio ne ha uno (Lubiana, Zagabria, Sarajevo, Tirana...). Quando la capitale di un impero sorge accanto al villaggio della sua città, il villaggio si fonde nella capitale.
- La rendita cresce con gli abitanti, a scaglioni: sotto 5.000 abitanti 1⭐, da 5.000 2⭐, da 50.000 3⭐, da 200.000 4⭐, da 700.000 5⭐, da 2 milioni 6⭐, da 5 milioni 7⭐. La capitale rende 1⭐ in più (almeno 3⭐), e ogni livello di crescita portato dai cittadini aggiunge 1⭐.

## Le epoche

Nella schermata iniziale (e nella scelta del paese, prima di fondare la capitale) si sceglie l'epoca: **oggi** (come prima), **1938**, **1914**, **1800**, **1500** o **l'anno Mille**. La mappa resta la stessa (terre, biomi, fiumi, villaggi): cambiano gli stati, con i confini e i nomi italiani di quell'anno, da 29 a 44 secondo l'epoca. Ogni stato storico ha un emblema al posto della bandiera (👑 impero, 🏰 regno, 🌙 stato islamico, ⛺ popoli e orde, 🏛️ repubblica). Il Sahara, senza stati nei dati, è terra di nessuno: ci sono villaggi ma non si può giocare. Il tutorial è sempre ai giorni nostri. Ogni stato storico è un impero (o, nel duello, il tuo avversario) e la sua capitale sorge nella sua città più popolosa. L'epoca si salva nel file della partita (i salvataggi precedenti si caricano a oggi).

- Fonte dei confini: **historical-basemaps** di André Ourednik (https://github.com/aourednik/historical-basemaps), licenza **GPL-3.0**. I dati derivati (la riga `const EPOCHE = ...` del gioco, circa 100 KB) restano sotto GPL-3.0.
- Gli altri siti consultabili (OpenHistoricalMap, historiqly, backthen.world, Running Reality, GeaCron) non si possono scaricare dal server di sviluppo o non offrono dati scaricabili: OpenHistoricalMap (dati CC0) resta la fonte migliore se in futuro si potrà leggerla.
- I dati sono grossolani: `build_epoche.py` corregge gli errori trovati (nel 1938 la Turchia orientale finiva all'"Armenia" sovietica, nel 1914 la Georgia e la Finlandia erano fuori dall'Impero russo), unisce gli staterelli di 1-2 caselle al vicino e traduce i nomi. Per rifare i dati: istruzioni in testa a `build_epoche.py`.
- Dalla v68 le epoche coprono anche le terre aggiunte nella v65: Svezia, Danimarca, Islanda, Baltici, Polonia... (con `build_epoche.py` rifatto sulla mappa grande).

Ogni modifica alla mappa va verificata con `mappatest.js`, che controlla anche che due partite abbiano la stessa mappa.

## Versione

v69 (formato di salvataggio invariato, v17; i salvataggi vecchi si caricano con i loro villaggi): **solo città vere da 100.000 abitanti in su e capitali**. Sulla mappa piccola le città passano da 321 a 170 (167 sulla media, 163 sulla gigante), tutte con nome e abitanti veri; ogni capitale ha il suo villaggio.

v68 (formato di salvataggio v17, con il campo facoltativo `epoca`): **si sceglie l'epoca storica** a inizio partita: oggi, 1938, 1914, 1800, 1500 o l'anno Mille (vedi «Le epoche»). Ogni stato storico è un impero IA, con la capitale nella sua città più popolosa; le epoche coprono anche i paesi aggiunti nella v65.

v67 (formato di salvataggio v17, i salvataggi precedenti si caricano): tutti i biomi di OpenStreetMap. Il prato si divide in palude, campi coltivati, vigneti e frutteti, città, macchia, brughiera e prateria, e le montagne coperte dai ghiacci diventano ghiacciai; le tre mappe fisse sono state rifatte con i nuovi dati. Ogni bioma ha il suo colore e piccoli segni; toccando una casella libera si legge che terreno è. Regole nuove: la palude ferma il movimento come la foresta e lì non si fondano capitali né villaggi; la città dà +1 difesa; una città con almeno 3 caselle coltivate (campi o vigneti) fra la sua e le 6 vicine rende +1⭐. Macchia, brughiera e prateria si giocano come il prato, il ghiacciaio come la montagna. Il bioma non si salva: viene dalla mappa fissa, quindi non serve un nuovo formato.

v66 (formato di salvataggio v17, con nome e abitanti di ogni città; i vecchi salvataggi si caricano): **ogni città ha i suoi abitanti veri** e rende in base a quanti sono.

- Abitanti dell'agglomerato urbano da Natural Earth, *populated places* 1:10m (pubblico dominio), nella lista `CITTA_REALI` generata da `build_popolazione.js`: Roma 3.339.000, Parigi 9.904.000, Milano 2.945.000... I villaggi lontani dalle città note hanno abitanti stimati.
- Ogni città vera da un milione di abitanti in su ha il suo villaggio sulla mappa (ma mai sulla casella di un microstato).
- Rendita a scaglioni: sotto 5.000 abitanti 1⭐, da 5.000 2⭐, da 50.000 3⭐, da 200.000 4⭐, da 700.000 5⭐, da 2 milioni 6⭐, da 5 milioni 7⭐; la capitale 1⭐ in più (e mai meno di 3⭐). Il vecchio distintivo azzurro della popolazione si chiama ora **crescita**.
- Le capitali vere sorgono sul villaggio della loro città quando c'è (Roma, Madrid, Parigi...) e ne prendono nome e abitanti.
- Toccando una città qualunque se ne vedono nome, abitanti e rendita; i nomi compaiono sotto le città ingrandendo la mappa.

v65 (formato di salvataggio invariato, v17): **tutti i paesi d'Europa**. Ai 35 di prima si aggiungono Polonia, Cechia, Slovacchia, Danimarca, Svezia, Norvegia, Finlandia, Estonia, Lettonia, Lituania, Bielorussia, Islanda, Malta, Armenia, Azerbaigian, Kazakistan (la parte a ovest degli Urali, con capitale Aqtöbe: Astana è fuori mappa), San Marino e il Vaticano, più Kaliningrad e le isole artiche russe: 56 paesi, ognuno con il suo impero IA e la sua capitale vera.

- La mappa si allarga a ovest fino all'Islanda e a nord fino a Capo Nord (piccola 273×220, media 549×440, gigante 824×660). Le terre di prima restano identiche casella per casella: i paesi nuovi si interrogano dopo tutti gli altri e i biomi OSM sono stati rifatti con gli stessi dati.
- Laghi Vänern, Vättern, Peipus e Sevan; l'Øresund e il Grande Belt restano mare; fiumi Vistola e Daugava; villaggi fissi nelle città principali dei paesi nuovi.
- I microstati (Monaco, San Marino, Vaticano, e Liechtenstein e Andorra dove il confine non basta) hanno sempre una casella libera per la capitale; il Vaticano sta accanto a Roma, non sopra.
- I salvataggi delle versioni precedenti (fino alla v64) si caricano: la mappa vecchia entra spostata nella nuova e le terre dei paesi nuovi compaiono, senza imperi.
- La mappa nasce più in fretta: ogni confine ha il suo rettangolo e il mare si scarta subito.

v64 (formato di salvataggio invariato): **ogni paese comincia dalla sua vera capitale**: la Spagna a Madrid, la Francia a Parigi, l'Italia a Roma, la Russia a Mosca, e così per tutti i 35 paesi, sia il tuo sia quelli dell'IA (anche nel duello e nel tutorial).

- Nel gioco c'è la tabella `CAPITALI_REALI` (nome, longitudine, latitudine). Se il punto vero cade su un fiume, sul mare, su un villaggio o su una montagna, la capitale va nella casella libera più vicina del paese: su ogni mappa tutte stanno entro 3 caselle dal punto vero.
- Scelto il tuo paese, l'unica casella evidenziata è la sua capitale: la tocchi (o tocchi un punto qualunque del tuo paese) e la capitale è fondata. Le capitali non dipendono più dal caso: sono le stesse a ogni partita.
- Nuovo test `capitalitest.js`.

v63 (formato di salvataggio invariato, v17): **ogni impero parte con tutte le città del suo paese**. Quando scegli un paese, i suoi villaggi sono già tue città (e lo stesso vale per ogni impero IA nel suo paese).

- I villaggi neutrali restano solo dove non c'è un impero: nel duello gli altri paesi, e le città che tornano libere quando un impero cade.
- Cambiando paese durante la scelta, le città passano con te e quelle del paese lasciato tornano al suo impero IA.
- Bilanciamento: un paese con meno di 5 città (oltre alla capitale) parte con 5⭐ in più per ogni città mancante (prima: 2⭐ sotto i 4 villaggi). L'elenco dei paesi mostra quante città ha ognuno.
- Test: `paesitest.js` e `imperitest.js` aggiornati; `citta_check.js` prova nel browser, su computer e telefono, la scelta della Francia toccandola e la fondazione della capitale.

v62 (formato di salvataggio v17 con il campo facoltativo `conquiste`): **in guerra il territorio si conquista**. Un'unità di qualunque tipo che entra in una casella del territorio di un impero con cui il suo impero è in guerra la conquista: la casella passa al colore del nuovo padrone (contorno e un velo più deciso delle altre caselle).

- Vale per tutti: per te, per l'IA che entra nel tuo territorio e fra imperi IA (sempre in guerra fra loro). Chi riprende una casella persa la riporta al suo paese. In pace o in alleanza non si conquista niente.
- Le caselle conquistate contano come territorio del nuovo padrone: lì le sue unità hanno il +1 🛡️ in patria, e toccandole si apre la diplomazia con chi le tiene.
- Se un impero cade, le caselle che aveva conquistato tornano al loro paese; quelle che gli hai preso restano tue.
- Il salvataggio (e l'Annulla) tiene le caselle conquistate; un salvataggio che non le ha riparte con i confini dei paesi.

v61 (formato di salvataggio v17 con il campo facoltativo `diplomazia`): la **diplomazia**. Toccando il territorio di un altro impero (con niente di selezionato) si apre la sua scheda: puoi proporgli la pace o un'alleanza, o dichiarargli guerra. All'inizio sei in guerra con tutti.

- In pace o alleati non vi attaccate e non entrate nelle città e nei porti dell'altro (né tu né l'IA). L'alleanza dà +1⭐ a turno di commercio a testa.
- L'IA accetta o rifiuta secondo la forza dei due imperi (soldati + 2 per città), le tue truppe vicine alle sue città, la difficoltà e la fiducia che ha in te. La scheda mostra la probabilità (alta, media, nessuna). Dopo un rifiuto si riprova fra 3 turni.
- Rompere un patto costa la fiducia dell'impero tradito e un po' di quella di tutti gli altri. Un impero in pace con te che diventa molto più forte può tornare in guerra da solo (dopo almeno 15 turni di pace); le alleanze le rompi solo tu.
- Vittoria diplomatica: se tutti gli imperi rimasti sono tuoi alleati.
- Fra gli imperi IA resta la guerra di tutti contro tutti. Nel duello e nel tutorial la diplomazia non c'è.
- Il salvataggio tiene patti, fiducia e rifiuti; un salvataggio che non li ha riparte in guerra con tutti.

v60 (formato di salvataggio v17): **ogni paese è un impero guidato dall'IA** e il paese si sceglie toccandolo sulla mappa.

- All'inizio la mappa si vede tutta e ogni paese ha il suo colore. Tocchi il paese che vuoi e la vista si avvicina; poi tocchi la casella dove fondare la capitale, oppure un altro paese per cambiare idea. L'elenco 🌍 resta come aiuto.
- Ogni altro paese (34 sulla mappa) ha il suo impero: capitale nel suo paese (dalla v63 la sua vera capitale), truppe, economia e la stessa difficoltà scelta nel menu 🤖 IA. Sono tutti in guerra con tutti: si espandono, si combattono fra loro e attaccano la città nemica più vicina, tua o di un altro impero.
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
