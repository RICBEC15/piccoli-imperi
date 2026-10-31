# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia, su una mappa geografica reale dell'Europa, dall'Islanda e dalle Canarie agli Urali. A inizio partita scegli l'epoca (oggi, 1938, 1914, 1800, 1500 o l'anno Mille) e tocchi sulla mappa il paese da guidare: il suo territorio è la tua patria. **Ogni altro paese è un impero guidato dall'IA**, in guerra con tutti. Un impero cade quando perde la capitale; vinci quando sono caduti tutti. Nella schermata iniziale si può scegliere anche il duello: un solo nemico, l'"Impero Cremisi", in un paese vicino.

## Come giocare

Online: **https://ricbec15.github.io/piccoli-imperi/** (dal browser, anche da telefono).

In locale: apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `index.html`: pagina d'ingresso per GitHub Pages, rimanda subito a `piccoli_imperi.html`.
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `paesitest.js`, `imperitest.js`, `difficoltatest.js`, `mappatest.js`, `diplotest.js`, `conquistatest.js`, `capitalitest.js`, `paesinuovitest.js`, `microstatitest.js`, `vaticanotest.js`, `popolazionetest.js`, `biomitest.js`, `epochetest.js`, `browser_check.js`, `mobile_check.js`, `pantest.js`, `conquista_check.js`, `citta_check.js`, `unitatest.js`, `stabilita_check.js`, `mappefissetest.js`, `caricamento_check.js`, `cheattest.js`, `cheat_check.js`, `capitaletest.js`, `capitale_check.js`: test automatici (`mobile_check.js` prova il gioco su un iPhone emulato con Playwright, `pantest.js` lo spostamento nella mappa col mouse, le frecce e il dito).
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `build_paesi_nord.py`: estrae da Natural Earth i confini dei paesi aggiunti nella v65 (`POLY_NORD`, `SEMI_NORD`).
- `build_biomi.py`, `export_tiles.js`: costruiscono i biomi fissi dai dati di OpenStreetMap.
- `build_mappe.js`: scrive la mappa già pronta di ogni grandezza (`const MAPPE_FISSE = ...`), così una partita nuova non la ricalcola.
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
cat stub.js game.js ricchezzatest.js > _run.js && node _run.js   # l'IA punta alle città ricche: circa 30 secondi
cat stub.js game.js unitatest.js > _run.js && node _run.js   # unit test delle funzioni principali: circa 10 secondi
cat stub.js game.js mappatest.js > _run.js && node _run.js
cat stub.js game.js diplotest.js > _run.js && node _run.js   # diplomazia: circa 15 secondi
cat stub.js game.js guerratest.js > _run.js && node _run.js   # pace iniziale e dichiarazioni di guerra (v75): circa 45 secondi
cat stub.js game.js conquistatest.js > _run.js && node _run.js   # conquista del territorio: circa 20 secondi
cat stub.js game.js capitaletest.js > _run.js && node _run.js   # capitale tenuta 7 turni = paese conquistato (v76): circa un minuto
cat stub.js game.js capitalitest.js > _run.js && node _run.js   # capitali reali: pochi secondi
cat stub.js game.js paesinuovitest.js > _run.js && node _run.js   # i paesi della v65: circa 20 secondi
cat stub.js game.js microstatitest.js > _run.js && node _run.js   # i microstati: circa 20 secondi
cat stub.js game.js vaticanotest.js > _run.js && node _run.js   # niente Vaticano fra gli stati di oggi (v73): circa 20 secondi
cat stub.js game.js popolazionetest.js > _run.js && node _run.js   # abitanti veri delle città
cat stub.js game.js biomitest.js > _run.js && node _run.js   # i biomi OSM
cat stub.js game.js mappefissetest.js > _run.js && node _run.js   # la mappa pronta = la mappa calcolata: circa 10 secondi
cat stub.js game.js cheattest.js > _run.js && node _run.js   # i cheat (v77): circa 10 secondi
node cheat_check.js   # il pannello dei cheat nel browser, computer e tablet col tocco (Playwright)
```

## La mappa

C'è **una sola mappa per ogni grandezza** (piccola, media, gigante), uguale a ogni partita: cambiano solo i punti in cui nascono le capitali degli imperi IA.

- Confini e coste: Natural Earth (poligoni dentro `piccoli_imperi.html`).
- Biomi: **OpenStreetMap**, precalcolati casella per casella e scritti nella riga `const BIOMI = ...` del gioco. Prato, bosco, collina, montagna, ghiacciaio, deserto di dune o di pietra, salina, tundra, e dalla v66 palude, campi coltivati, vigneti e frutteti, città (zone costruite), macchia, brughiera e prateria. Si leggono i poligoni `natural=*` (boschi, rocce, ghiacciai, sabbie, zone umide, macchie, brughiere, praterie), i `landuse=*` (campi, vigneti, frutteti, zone residenziali e industriali, saline) e le quote delle cime. Dati © OpenStreetMap contributors (ODbL), letti tramite il tema `base` di Overture Maps.
- Per rifare i biomi (per esempio dopo aver cambiato la forma della mappa) si usano `build_biomi.py` ed `export_tiles.js`: le istruzioni sono in testa a `build_biomi.py`. Fiumi, laghi, stretti e villaggi li calcola il gioco (`calcolaMappa`) in modo fisso.
- **Dalla v74 la mappa di ogni grandezza è già pronta dentro il file** (riga `const MAPPE_FISSE = ...`: terreno, paesi e villaggi in RLE, circa 100 KB compressi in tutto), invece di ricalcolarla a ogni partita. **Dopo ogni modifica alla mappa** (confini, fiumi, laghi, biomi, città vere, villaggi) va rilanciato `node build_mappe.js`; `mappefissetest.js` fallisce se la mappa pronta non è più uguale a quella calcolata.

## Città e abitanti

Ogni città ha i suoi **abitanti veri**: quelli dell'agglomerato urbano (campo `POP_MAX`) del dataset Natural Earth *populated places* 1:10m, di pubblico dominio (naturalearthdata.com). Roma ha 3.339.000 abitanti, Parigi 9.904.000, Milano 2.945.000. Le 1366 città che cadono sulle terre del gioco sono nella lista `CITTA_REALI` dentro `piccoli_imperi.html`, scritta da `build_popolazione.js` (istruzioni in testa al file).

- Ogni città vera da un milione di abitanti in su ha il suo villaggio neutrale sulla mappa.
- Ogni villaggio prende nome e abitanti della città vera più popolosa entro poco più di una casella (almeno 25 km).
- Dalla v71 sulla mappa restano **solo le città da 100.000 abitanti in su e le capitali** (anche più piccole: Podgorica, La Valletta...). I villaggi sotto i 100.000 abitanti, e quelli senza una città vera vicina, non ci sono più; ogni capitale vera che non aveva un villaggio ne ha uno (Lubiana, Zagabria, Sarajevo, Tirana...). Quando la capitale di un impero sorge accanto al villaggio della sua città, il villaggio si fonde nella capitale.
- La rendita cresce con gli abitanti, a scaglioni: sotto 5.000 abitanti 1⭐, da 5.000 2⭐, da 50.000 3⭐, da 200.000 4⭐, da 700.000 5⭐, da 2 milioni 6⭐, da 5 milioni 7⭐. La capitale rende 1⭐ in più (almeno 3⭐), e ogni livello di crescita portato dai cittadini aggiunge 1⭐.

## Le epoche

Nella schermata iniziale (e nella scelta del paese, prima di fondare la capitale) si sceglie l'epoca: **oggi** (come prima), **1938**, **1914**, **1800**, **1500** o **l'anno Mille**. La mappa resta la stessa (terre, biomi, fiumi, villaggi): cambiano gli stati, con i confini e i nomi italiani di quell'anno, da 29 a 44 secondo l'epoca. Ogni stato storico ha un emblema al posto della bandiera (👑 impero, 🏰 regno, 🌙 stato islamico, ⛺ popoli e orde, 🏛️ repubblica). Il Sahara, senza stati nei dati, è terra di nessuno: ci sono villaggi ma non si può giocare. Il tutorial è sempre ai giorni nostri. Ogni stato storico è un impero (o, nel duello, il tuo avversario) e la sua capitale sorge nella sua città più popolosa. L'epoca si salva nel file della partita (i salvataggi precedenti si caricano a oggi).

- Fonte dei confini: **historical-basemaps** di André Ourednik (https://github.com/aourednik/historical-basemaps), licenza **GPL-3.0**. I dati derivati (la riga `const EPOCHE = ...` del gioco, circa 100 KB) restano sotto GPL-3.0.
- Gli altri siti consultabili (OpenHistoricalMap, historiqly, backthen.world, Running Reality, GeaCron) non si possono scaricare dal server di sviluppo o non offrono dati scaricabili: OpenHistoricalMap (dati CC0) resta la fonte migliore se in futuro si potrà leggerla.
- I dati sono grossolani: `build_epoche.py` corregge gli errori trovati (nel 1938 la Turchia orientale finiva all'"Armenia" sovietica, nel 1914 la Georgia e la Finlandia erano fuori dall'Impero russo), unisce gli staterelli di 1-2 caselle al vicino e traduce i nomi. Per rifare i dati: istruzioni in testa a `build_epoche.py`.
- Dalla v68 le epoche coprono anche le terre aggiunte nella v65: Svezia, Danimarca, Islanda, Baltici, Polonia... (con `build_epoche.py` rifatto sulla mappa grande).

Ogni modifica alla mappa va verificata con `mappatest.js`, che controlla anche che due partite abbiano la stessa mappa.

## Versione

v76 (formato di salvataggio v18, con un campo facoltativo in più; i salvataggi di prima si caricano ancora): **chi tiene la capitale di un paese per 7 turni (una settimana: nel gioco un turno vale un giorno) si prende tutto il paese**.

- Prendere la capitale di un impero in guerra non lo fa più cadere subito: parte un conto alla rovescia. Sulla capitale occupata c'è un anello tratteggiato del colore di chi l'ha persa e un tondo arancione con i turni che mancano; il pannello della città (o dell'unità che ci sta sopra) dice `⏳ 3/7` e cosa succede, e a inizio turno un promemoria ricorda le capitali che tieni e la tua, se è occupata.
- Dopo 7 turni il paese sconfitto passa al vincitore: tutte le città (non tornano più villaggi liberi), i porti, gli ospedali e tutto il territorio, comprese le caselle che lo sconfitto aveva conquistato altrove (quelle prese a te tornano tue). L'esercito sconfitto si scioglie e i suoi patti finiscono. Se lo sconfitto teneva a sua volta la capitale del vincitore, gliela restituisce.
- Se lo sconfitto riprende la capitale prima, torna capitale e il conto si annulla; se la prende un terzo impero, il conto riparte da zero per lui. Il conto avanza solo finché i due sono in guerra (in pace resta fermo), e finché uno tiene la capitale dell'altro i due non fanno la pace né l'alleanza.
- Vale anche per te: se il nemico prende la tua capitale non hai ancora perso, hai 7 turni per riprenderla (perdi subito solo se non ti restano né città né truppe). Le condizioni di vittoria restano le stesse: vinci quando sono caduti tutti o quando tutti quelli rimasti sono tuoi alleati.
- L'IA: senza capitale manda le sue unità a riprenderla (a Facile solo quelle entro 12 esagoni, a Normale entro 30, a Difficile tutte), anche durante la tregua, e arruola soldati invece di coloni nelle città più vicine; sulla capitale che ha preso lascia sempre un presidio (a Facile solo con nemici vicini) e, se è minacciata, arruola lì e richiama le truppe come per la sua; a Normale e Difficile le capitali (anche occupate) attirano i suoi eserciti come le città più ricche.
- Salvataggio: una capitale occupata ha il campo `x: [impero a cui è stata presa, turni tenuti]` nella città. I file di prima, dove la capitale presa era già una città qualunque, si caricano come prima (l'impero senza capitale è già caduto).
- Test nuovi: `capitaletest.js` e `capitale_check.js` (nel browser, computer e telefono); aggiornati `imperitest.js` e `conquistatest.js`.

v77 (salvataggio sempre v18): **pulsante 🧪 Cheat**, solo per provare il gioco. Apre un pannello sopra la mappa per: conquistare di colpo un impero (città, territorio, porti e ospedali passano a te, il suo esercito si scioglie e l'impero cade; conquistarli tutti fa vincere); mettere una truppa su qualunque casella (qualunque tipo, armate fino a 50, carovane fino a 6, navi fino al livello 11, anche al posto di un'unità nemica e nelle città di chi è in pace con te); costruire porti e ponti gratis senza Costruttore. Si usa solo nel tuo turno e fuori dal tutorial; ogni azione si annulla con ↩️.

v75 (formato di salvataggio invariato, v18): **all'inizio della partita tutti sono in pace con tutti** (tu con gli imperi IA e gli imperi IA fra loro) e **per attaccare bisogna dichiarare guerra**. In pace non si attacca, non si entra nelle città e nei porti dell'altro e non gli si prendono caselle; se tocchi un impero in pace con un'unità selezionata si apre la sua scheda, che ricorda di dichiarare guerra. L'IA dichiara guerra da sola al vicino più debole quando il suo esercito è abbastanza più forte, dopo una tregua che dipende dalla difficoltà (Facile dal turno 60, una guerra alla volta e di rado; Normale dal turno 30, una alla volta; Difficile dal turno 8, fino a due guerre e più spesso): `AI_GUERRA` nel codice. Non rompe una pace firmata da meno di 10 turni, non attacca te se si fida di te e non rompe le alleanze. Due imperi IA in guerra da almeno 20 turni senza che nessuno prevalga possono fare la pace. Dichiarare guerra a chi è nella pace di inizio partita costa meno fiducia che rompere una pace firmata. Nel duello e nel tutorial si resta in guerra dal primo turno. Le partite salvate prima della v75 ripartono come erano (in guerra con tutti, tranne i patti fatti).

v74 (formato di salvataggio v18; i salvataggi di prima si caricano ancora): **le mappe si caricano molto più in fretta**. Misure nel browser di prova (computer; fra parentesi con la CPU 4 volte più lenta, come un tablet): una partita nuova sulla gigante da 6,2 a 0,9 secondi (da 31 a 3,7), sulla media da 2,8 a 0,5 (da 14 a 2,3), sulla piccola da 1,0 a 0,5 (da 4,5 a 2,5); caricare una partita salvata sulla gigante da 3,4 a 0,7 secondi (da 16 a 2,7); aprire la pagina da 1,1 a 0,15 secondi (da 5,4 a 0,5).

- La mappa di ogni grandezza è già pronta dentro il file (`MAPPE_FISSE`, scritta da `build_mappe.js`) invece di ricalcolare confini, laghi, fiumi e villaggi a ogni partita: sulla gigante da 4-5 secondi a 0,3. È identica a quella calcolata (`mappefissetest.js`). Il file passa da 809 a circa 1070 KB (da 328 a 447 KB compressi).
- Da lontano (casella sotto i 3 pixel) il terreno si disegna da un'immagine con due pixel per casella invece di disegnare uno per uno tutti gli esagoni: la mappa intera della gigante da 2,5 secondi a pochi decimi. L'aspetto resta lo stesso.
- La scelta delle capitali degli imperi è più veloce (la ricerca delle terre usa indici numerici e i controlli si fanno solo sulle caselle più vicine al punto vero): stesse capitali di prima, in tutte le epoche e grandezze.
- **Salvataggi leggeri** (formato v18): il terreno in una riga RLE e solo le caselle con città, unità, ospedali e porti. Sulla gigante il file passa da circa 32 MB a circa 115 KB (media 14 MB → 67 KB, piccola 3,5 MB → 35 KB), e caricarlo non ricalcola più i confini casella per casella.
- All'apertura della pagina non si prepara più una partita nascosta sotto la schermata di benvenuto (la scelta della mappa la buttava via): la pagina si apre molto prima. Se la schermata si chiude senza scegliere la mappa (Esc, Enciclopedia), parte una partita sulla piccola come prima.
- Test nuovi: `mappefissetest.js` e `caricamento_check.js` (nel browser). `stub.js` ha `createImageData` e `comeSalvataggioV17` (per i test che preparano salvataggi vecchi).

v73 (formato di salvataggio invariato, v17): **la Città del Vaticano non c'è più fra gli stati di oggi**. Non si sceglie, non è un impero IA e non è nella diplomazia; la sua casella accanto a Roma è Italia (con il Tevere al suo posto). Nelle epoche storiche lo Stato della Chiesa resta com'era. Le partite salvate prima con il Vaticano in gioco (tuo o dell'IA) si caricano ancora com'erano, con il Vaticano; quelle senza lo lasciano all'Italia.

v72 (formato di salvataggio v17, con il campo facoltativo `f` per unità): **stabilità e mappa più veloce**, dopo un debug completo (rapporto e misure nel thread del progetto).

- Spostarsi nella mappa è molto più fluido. La memoria delle tessere del terreno ora è grande quanto serve allo schermo (prima 120 tessere fisse: su uno schermo grande o retina ogni passo del trascinamento le ridisegnava tutte, 100-370 ms a fotogramma; ora 7-45 ms). I veli e i contorni dei territori si calcolano a pezzi di 32×32 caselle e si tengono in memoria finché non cambiano, invece di ricalcolarli a ogni fotogramma. Da lontano (casella sotto gli 8 pixel) le tessere disegnano solo i colori, senza icone e segni dei biomi.
- Caricare una partita, iniziarne una nuova o avviare il tutorial mentre gli imperi stanno muovendo ora ferma davvero il loro turno: prima la partita caricata andava avanti da sola di un turno.
- Il salvataggio ricorda chi ha già mosso o attaccato nel turno (campo `f`): salvare e ricaricare non ridà le mosse. I salvataggi di prima si caricano come sempre.
- Un file di salvataggio non valido di un'altra grandezza di mappa non rompe più la partita in corso.
- Un errore imprevisto nel turno di un impero non blocca il gioco: si salta quell'unità (o si passa al prossimo impero) e in alto compare un avviso.
- Addestrare non è possibile fuori dal tuo turno; il congedo su una casella vuota mostra il messaggio invece di un errore.
- Test nuovi: `unitatest.js` (28 unit test) e `stabilita_check.js` (18 scenari nel browser, circa 10 minuti). `stub.js` ha un `Path2D` finto.
v71 (formato di salvataggio invariato, v17; i salvataggi vecchi si caricano con i loro villaggi): **solo città vere da 100.000 abitanti in su e capitali**. Sulla mappa piccola le città passano da 321 a 170 (167 sulla media, 163 sulla gigante), tutte con nome e abitanti veri; ogni capitale ha il suo villaggio.

v70 (formato di salvataggio v17, invariato): **l'IA punta alle città più ricche**. Nella scelta degli obiettivi (villaggi da prendere e città nemiche da attaccare) una città che rende più stelle, cioè con più abitanti veri, "sembra più vicina": l'IA accetta una deviazione per arrivarci. Quanto pesa dipende dalla difficoltà (`ricchezza` in `AI_LIVELLI`): a Facile niente (va alla più vicina, come prima), a Normale 2 terzi di turno di strada per ogni stella in più, a Difficile 4 (Parigi contro un villaggio: circa 9 turni di deviazione). Fra i difensori da colpire l'IA preferisce quelli delle città ricche. Test: `ricchezzatest.js`.

v69 (formato di salvataggio v17, invariato): il menu iniziale mostra le misure vere delle tre mappe (273×220, 549×440, 824×660, con Islanda e Capo Nord aggiunti nella v65) invece di quelle vecchie; le misure sono calcolate dal gioco, quindi restano giuste se la mappa cambia ancora.

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
