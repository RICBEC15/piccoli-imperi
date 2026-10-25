# Piccoli Imperi — istruzioni per la migrazione

## Cosa contiene questo pacchetto

- **piccoli_imperi.html** — il gioco completo: una singola pagina HTML autonoma (HTML+CSS+JS in un solo file), senza bisogno di server né di internet per funzionare. È l'unico file che serve per **giocare**.
- **build_russia.js** — lo script che ha estratto il confine reale della Russia (fino agli Urali) dal dataset geografico Natural Earth, ritagliandolo sul rettangolo della mappa. Serve solo se in futuro si vuole rigenerare/correggere quel confine da zero; il risultato è già incorporato per sempre dentro `piccoli_imperi.html`, quindi non serve per giocare né per continuare lo sviluppo.
- **stub.js**, **shiptest.js**, **savetest.js**, **playtest.js**, **browser_check.js** — i test automatici scritti per verificare il sistema di potenziamento navi e l'estensione della Russia (vedi sotto "Come rilanciare i test").

Nota: gli script che avevano generato i confini reali degli altri ~30 paesi aggiunti nelle sessioni precedenti (`build_borders.js`, `build_borders_sud.js`, `build_extra.js`) sono andati persi quando il vecchio ambiente cloud è scaduto per inattività. Non è un problema per giocare o per continuare a sviluppare: il loro risultato (le forme dei confini) è già incorporato in modo permanente dentro `piccoli_imperi.html`. Servirebbero solo se un giorno si volesse rigenerare da zero il confine di uno di quei paesi con un dataset diverso.

## Come giocare fin da subito

Basta aprire `piccoli_imperi.html` con un doppio clic (si apre nel browser): non serve installare nulla. Funziona anche offline. Per salvare una partita si usa il tasto **💾 Salva** dentro al gioco, che scarica un file `.json`; per riprenderla si usa **📂 Carica** e si seleziona quel file.

## Come spostare il progetto su un altro account Claude

Il gioco vive interamente dentro `piccoli_imperi.html`: non ci sono database, server o account collegati. Per continuare a svilupparlo con l'aiuto di Claude su un altro account:

1. Apri una nuova conversazione sull'altro account.
2. Allega `piccoli_imperi.html` (e, se vuoi continuare con i test automatici, anche `stub.js` e i file `*test*.js`).
3. Spiega a Claude, in breve, cosa è già stato fatto e la regola più importante seguita finora:

   > "Questo è un gioco di strategia a turni in stile Polytopia, con una mappa geografica reale e deterministica (seed fisso) che copre gran parte d'Europa, il Nord Africa e la Russia europea fino agli Urali. Dalla v57 i biomi vengono da OpenStreetMap e sono fissi per ogni grandezza (riga `const BIOMI` nel file, rigenerabile con `build_biomi.py`); verifica ogni modifica con `mappatest.js`."

4. Da lì Claude può leggere direttamente il codice dentro `piccoli_imperi.html` (è tutto in un unico tag `<script>`) e continuare a modificarlo.

Non serve nessun altro passaggio: non ci sono chiavi API, credenziali o dati account collegati al file.

## Come rilanciare i test (facoltativo, per chi continua lo sviluppo)

I test girano con Node.js, senza bisogno di un vero browser (uno "stub" finto del DOM in `stub.js` sostituisce le funzioni del browser). Per lanciare, ad esempio, i test sul potenziamento delle navi:

```bash
# 1) estrai lo script di gioco dal file HTML in un file game.js
python3 -c "
import re
html = open('piccoli_imperi.html', encoding='utf-8').read()
m = re.search(r'<script>(.*?)</script>', html, re.S)
open('game.js','w',encoding='utf-8').write(m.group(1))
"

# 2) concatena stub + gioco + test e lancialo con node
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
```

Se hai Playwright installato puoi anche lanciare `node browser_check.js` per un test rapido in un vero Chromium headless (verifica che non ci siano errori console e che le dimensioni della mappa restino sotto il limite di pixel del canvas del browser, circa 268 milioni di pixel).

## Cosa è stato aggiunto nell'ultima parte di sviluppo (v53)

Ripartendo dall'ultima versione scaricata (`piccoli_imperi_52.html`, che si fermava poco prima della fine della sessione precedente), sono state ricostruite le due funzionalità che risultavano non salvate:

- **Potenziamento delle navi**: 11 livelli, capacità di stiva da 3 a 50 soldati, nave base a 20⭐, potenziamento (+68% composto per livello, gratuito come azione, solo vicino a un porto tuo) e mantenimento crescente (+30% composto per livello). I salvataggi vecchi (senza livello nave) vengono caricati con livello 1, promosso automaticamente se il carico salvato era più grande di quanto il livello 1 possa contenere.
- **Russia europea fino agli Urali**: confine reale (dataset Natural Earth, ritagliato agli Urali e al Circolo Polare), catena degli Urali e delle Khibiny, gradiente steppa→foresta mista→taiga→tundra, deserto glaciale bianco oltre il Circolo Polare (dove non ci sono vere montagne), fiumi Volga/Don/Dvina Settentrionale/Oka/Kama, laghi Ladoga e Onega, colline di Valdai/altopiano centrale russo/rilievi del Volga, e 10 città storiche (Mosca, San Pietroburgo, Nizhny Novgorod, Kazan, Volgograd, Voronež, Arcangelo, Vologda, Perm, Murmansk). La mappa storica e tutte le altre estensioni precedenti sono state verificate tassello per tassello: restano identiche.

Il file di salvataggio è passato alla versione 15 (compatibile con i salvataggi precedenti, dalla v6 in su).

## Cosa è cambiato nella v54

- **IA strategica**: l'Impero Cremisi non si blocca più verso il turno 50. Prima i fiumi lo chiudevano in una zona con pochi villaggi, non gettava ponti dove servivano, non usava mai le navi, e una regola gli impediva di addestrare perfino cittadini e costruttori quando il mantenimento pareggiava la rendita. Ora:
  - calcola ogni turno una "mappa di marcia" (Dijkstra) che tiene conto di fiumi (ponti), mare (navi) e montagne, e le unità la seguono invece di puntare in linea d'aria;
  - i Costruttori gettano i ponti dove l'esercito è sbarrato (anche sugli stretti di mare, se l'attesa della nave si allunga) e aprono porti sulle coste dove le armate aspettano;
  - vara e potenzia le navi solo da porti collegati per mare all'armata che aspetta, imbarca le armate e le sbarca vicino all'obiettivo; le navi inutili vengono congedate;
  - tiene l'economia in positivo (l'esercito non si mangia più del 60% della rendita, la cassa piena si spende), e prima di andare all'attacco conquista i villaggi neutrali;
  - forma armate fino a 3 (entrano in una nave di livello 1) e va all'offensiva quando è abbastanza forte;
  - difende la capitale: presidio d'emergenza, ripiegamento e intercettazione degli invasori.
- **Mappa gigante** ridotta da 5 a 3 volte la piccola (esagoni a un terzo, 750×632 caselle): il turno dell'IA lì è circa 3 volte più veloce. Le mappe piccola e media sono identiche casella per casella. I salvataggi fatti sulla vecchia mappa gigante non si possono più caricare.
- Corrette le etichette delle dimensioni nel menu iniziale (erano rimaste quelle di una versione vecchia).
- Nuovo test `aitest.js`: con il giocatore fermo l'IA deve continuare a crescere dopo il turno 50, minacciare o prendere la capitale entro il turno 150, e presidiare la propria capitale quando è minacciata. Nelle prove su 18 partite simulate l'IA ha preso la capitale in 16 entro il turno 150.

## Cosa è cambiato nella v56

- **Paesi e territori**: ogni impero gioca un paese reale e il suo territorio sono tutte le caselle di quel paese, contornate e velate sulla mappa nel suo colore.
  - A inizio partita si apre il menu **🌍 Scegli il tuo paese** (lista con bandiera, grandezza e villaggi) e si può anche toccare un paese direttamente sulla mappa; il paese scelto resta per la partita successiva. Durante il piazzamento il pulsante 🌍 Cambia paese riapre il menu.
  - Il nemico prende a caso uno dei 5 paesi più vicini al tuo, oppure quello che scegli nel menu. La sua capitale è in un punto casuale del suo paese (sul continente se possibile, sempre a distanza di sicurezza da almeno una casella del tuo paese).
  - La tua capitale si fonda in patria (stesse regole di prima: niente montagne né deserto, lontano dal nemico).
  - In patria le unità hanno +1 in difesa; in città il bonus è lo stesso e non si somma.
  - Un paese con meno di 4 villaggi neutrali parte con 2 stelle in più per ogni villaggio mancante (Libia +8, Belgio +6, Italia e Francia nulla).
  - Tutorial: giochi l'Italia contro un vicino di terra (Francia, Svizzera, Austria o Slovenia).
- **Salvataggio v16**: aggiunge i paesi dei due imperi. I salvataggi precedenti si caricano ancora: il paese di ciascuno è quello dove sorge la sua capitale.
- Nuovo test `paesitest.js`.

## Cosa è cambiato nella v57 e nella v58

- **v56 (mappa)**: corretto il confine della Russia in alto (un blocco di terra finta in Lapponia, Kola e Mar Bianco mancanti).
- **v57**: una mappa fissa per ogni grandezza. I biomi vengono da OpenStreetMap e sono scritti nella riga `const BIOMI` (rigenerabile con `build_biomi.py` ed `export_tiles.js`); le vecchie regole del terreno scritte a mano sono state tolte. Nuovo test `mappatest.js`.
- **Difficoltà dell'IA** (Facile, Normale, Difficile) da scegliere all'inizio e cambiabile in partita dal menu 🤖 IA; viene salvata nel file. Nuovo test `difficoltatest.js`.
- **v58**: riunisce in una sola versione la mappa fissa, la scelta del paese e la difficoltà dell'IA. Salvataggio v16.
- **v59**: ci si sposta nella mappa a qualunque zoom (trascinamento col mouse, frecce, dito). `#mapsizer` ha un bordo di mezzo schermo per lato (`PADX`/`PADY`): per passare da scroll a coordinate della mappa usare sempre `viewX(wrap)`/`viewY(wrap)`, mai `scrollLeft`/`scrollTop` direttamente. Test `pantest.js` (Playwright).

## Cosa è cambiato nella v60

- **Ogni paese è un impero IA** (modalità `tutti`, la predefinita; `duello` è quella di prima, sempre usata dal tutorial e dai vecchi salvataggi). L'id di un impero IA è il codice del suo paese (`players.FR`, `cities('FR')`); il giocatore resta `'p'`. `imperiIA()` dà gli imperi in piedi in ordine di turno, `capitaleDi(o)` la capitale, `aiMe` l'impero che sta muovendo. Lo stato di ogni IA (ponti, navi, offensiva) è in `aiStato`.
- **Scelta del paese** toccandolo sulla mappa: `newGame` parte senza paese (`players.p.country = null`), il tocco chiama `cambiaPaese`, il menu 🌍 resta come aiuto.
- **Caduta degli imperi** in `cadeImpero`: vince chi resta l'ultimo.
- **Prestazioni**: le caselle sono oggetti `Casella` con setter per `unit`, `city`, `port` e `hosp`, che tengono aggiornati gli indici `conUnita`, `conCitta`, `conPorto` e `conOsp`. `cities`, `unitsOf` e `ports` leggono gli indici. `aiCampo` lavora in una finestra attorno alle unità e si ferma poco dopo l'ultima. Le mosse lontane dal giocatore (`aiZona`) si fanno senza pausa.
- **Salvataggio v17** (`imperi`, `modo`, `caduti`, stelle per impero). Fino alla v16 il nemico si chiamava `'a'`: al caricamento prende il codice del suo paese.
- `stub.js` esegue i `setTimeout` in coda (a trampolino): con tanti imperi le chiamate una dentro l'altra esaurivano la pila. Nuovo test `imperitest.js`.

## Cosa è cambiato nella v67

- **Tutti i biomi OSM.** Nuovi simboli in `BIOMI`: p palude, c campi, v vigneti e frutteti, u città, k macchia, b brughiera, a prateria (terreno base `grass`), z ghiacciaio (base `mountain`). Il terreno salvato resta quello base; il bioma si legge con `bioma(t)`, che lo restituisce solo se torna col terreno salvato. Regole: `fermaMovimento` (palude), `defOf` (città +1), `terraFertile` in `income` (+1⭐). `build_biomi.py` legge anche il tema `land_use` (canali agri, campi, vigne, urbano, sale); soglie in `PRATO`. Test `biomitest.js`.
