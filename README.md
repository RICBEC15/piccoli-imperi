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

## Regola importante

La mappa è deterministica. Non rigenerarla mai da zero: ogni modifica va fatta in modo mirato, verificando che il resto della mappa resti identico casella per casella.

## Versione

v56 (formato di salvataggio v15).

v56: corretto il confine della Russia in alto sulla mappa. Il ritaglio del poligono si portava dietro un "giro di ritorno" lungo il bordo (dovuto alla Chukotka oltre il 180° meridiano) che invertiva un rettangolo fra 18°E e 61°E e fra 65°N e 69°N: compariva un blocco di terra finta in Lapponia e mancavano la penisola di Kola e il Mar Bianco.

Dalla v55 la mappa si disegna a tessere, come le mappe online: il canvas è grande quanto lo schermo e il terreno viene preparato in quadrati da 256 pixel, uno per livello di zoom, solo dove serve. Prima il canvas era grande quanto tutta la mappa (circa 241 milioni di pixel) e su telefono non funzionava.
