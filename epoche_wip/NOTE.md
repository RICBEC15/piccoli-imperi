# Scelta dell'epoca storica: lavori in corso (fermati il 2026-10-24)

Niente di questo è ancora nel gioco: `piccoli_imperi.html` non è stato toccato.

## Fonti
- OpenHistoricalMap (dati CC0): dal server cloud il sito e l'API sono bloccati; il bucket S3
  `planet.openhistoricalmap.org` si elenca ma i file danno "Access Denied".
- historiqly, backthen.world, runningreality, GeaCron, World History Atlas: bloccati e senza dati scaricabili.
- Usabile: **aourednik/historical-basemaps** su GitHub (GeoJSON per anno, licenza **GPL-3.0**:
  includerlo rende i dati derivati GPL, da decidere con Riccardo).
  `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_<anno>.geojson`

## Epoche proposte
1000, 1500, 1800, 1914, 1938 (anni presenti nel dataset) + oggi (default, come ora).

## Cosa è emerso
- La mappa del gioco non ha come terra Polonia, Cechia, Slovacchia, Bielorussia, Baltici,
  Scandinavia, Danimarca, Medio Oriente: in quelle epoche i loro stati resterebbero in mare.
- Dati grossolani con errori: 1938 la Turchia si ferma a 39.4°E (il resto è "Armenia" URSS e
  "Siria"), 1914 la Georgia è separata dalla Russia. Servono correzioni per paese moderno
  (es. 1938: tutte le caselle TR -> Turchia).
- Il Sahara è senza stato: resterebbe terra di nessuno (non giocabile).

## Piano
1. `export_tiles.js` (con i fiumi) -> caselle di terra con lon/lat per ogni taglia.
2. Script che assegna a ogni casella lo stato dell'epoca (poligono più piccolo che la contiene,
   altrimenti il più vicino entro ~1.5°), applica correzioni e fusioni (stati < 3 caselle
   sulla mappa piccola -> vicino), nomi in italiano + emblema (👑 🏰 🌙 ⛺ 🏛️ ⛪).
3. Nel gioco: `const EPOCHE = { anno: { nome, stati: {COD:{nome,emblema}}, griglia: {piccola, media, gigante} } }`
   con RLE come BIOMI (le caselle di mare non contano); dopo genMap/caricamento si sovrascrive
   `t.country`; codici a 3 lettere per non scontrarsi con quelli moderni. Menu epoca nella
   schermata iniziale, campo `epoca` nel salvataggio (mancante = oggi).

`analyze.py` e `asciimap.py` contano/disegnano gli stati sulle caselle della mappa piccola
(servono `tiles_piccola.json` dal gioco e i GeoJSON scaricati).
