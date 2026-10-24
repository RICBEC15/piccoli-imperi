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

   > "Questo è un gioco di strategia a turni in stile Polytopia, con una mappa geografica reale e deterministica (seed fisso) che copre gran parte d'Europa, il Nord Africa e la Russia europea fino agli Urali. **Non rigenerare mai tutta la mappa da zero**: se serve una modifica, cambiala chirurgicamente e verifica che il resto della mappa resti identico prima/dopo."

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
