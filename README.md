# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia: tu contro un'IA (l'"Impero Cremisi") su una mappa geografica reale dell'Europa, dalle Canarie agli Urali. A inizio partita scegli il paese da guidare: il suo territorio è la tua patria. Vince chi conquista la capitale avversaria.

## Come giocare

Online: **https://ricbec15.github.io/piccoli-imperi/** (dal browser, anche da telefono).

In locale: apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `index.html`: pagina d'ingresso per GitHub Pages, rimanda subito a `piccoli_imperi.html`.
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `paesitest.js`, `browser_check.js`, `mobile_check.js`: test automatici (`mobile_check.js` prova il gioco su un iPhone emulato con Playwright).
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `ISTRUZIONI_MIGRAZIONE.md`: note di sviluppo, storia delle ultime versioni e istruzioni dettagliate.

## Test

```bash
python3 -c "import re; h=open('piccoli_imperi.html',encoding='utf-8').read(); open('game.js','w',encoding='utf-8').write(re.search(r'<script>(.*?)</script>',h,re.S).group(1))"
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
cat stub.js game.js paesitest.js > _run.js && node _run.js
cat stub.js game.js aitest.js > _run.js && node _run.js   # IA: 150 turni, circa un minuto
```

## Regola importante

La mappa è deterministica. Non rigenerarla mai da zero: ogni modifica va fatta in modo mirato, verificando che il resto della mappa resti identico casella per casella.

## Versione

v56 (formato di salvataggio v16).

Dalla v56 ogni impero gioca un paese reale: a inizio partita scegli il tuo (dalla lista o toccandolo sulla mappa), il nemico prende un paese vicino o quello che scegli tu. In patria le unità si difendono meglio (+1) e i paesi con pochi villaggi partono con qualche stella in più.

Dalla v55 la mappa si disegna a tessere, come le mappe online: il canvas è grande quanto lo schermo e il terreno viene preparato in quadrati da 256 pixel, uno per livello di zoom, solo dove serve. Prima il canvas era grande quanto tutta la mappa (circa 241 milioni di pixel) e su telefono non funzionava.
