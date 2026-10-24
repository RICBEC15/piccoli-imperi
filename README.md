# Piccoli Imperi

Gioco di strategia a turni su esagoni, in stile Polytopia: tu contro un'IA (l'"Impero Cremisi") su una mappa geografica reale dell'Europa, dalle Canarie agli Urali. Vince chi conquista la capitale avversaria.

## Come giocare

Apri `piccoli_imperi.html` nel browser con un doppio clic. Non serve installare nulla e funziona anche offline. Le partite si salvano e si caricano come file `.json` dai pulsanti 💾 Salva e 📂 Carica.

## Contenuto

- `piccoli_imperi.html`: il gioco completo (HTML, CSS e JavaScript in un unico file).
- `stub.js`, `shiptest.js`, `savetest.js`, `playtest.js`, `aitest.js`, `browser_check.js`: test automatici.
- `build_russia.js`: script che ha estratto il confine della Russia dal dataset Natural Earth.
- `ISTRUZIONI_MIGRAZIONE.md`: note di sviluppo, storia delle ultime versioni e istruzioni dettagliate.

## Test

```bash
python3 -c "import re; h=open('piccoli_imperi.html',encoding='utf-8').read(); open('game.js','w',encoding='utf-8').write(re.search(r'<script>(.*?)</script>',h,re.S).group(1))"
cat stub.js game.js shiptest.js > _run.js && node _run.js
cat stub.js game.js savetest.js > _run.js && node _run.js
cat stub.js game.js playtest.js > _run.js && node _run.js
cat stub.js game.js aitest.js > _run.js && node _run.js   # IA: 150 turni, circa un minuto
```

## Regola importante

La mappa è deterministica. Non rigenerarla mai da zero: ogni modifica va fatta in modo mirato, verificando che il resto della mappa resti identico casella per casella.

## Versione

v54 (formato di salvataggio v15).
