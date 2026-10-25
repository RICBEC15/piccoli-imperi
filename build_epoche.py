# Costruisce gli stati storici delle epoche di Piccoli Imperi (1000, 1500, 1800, 1914, 1938).
#
# Fonte: historical-basemaps di Andre Ourednik (https://github.com/aourednik/historical-basemaps),
# un GeoJSON per anno con i confini degli stati del mondo. Licenza GPL-3.0: i dati derivati
# (la riga "const EPOCHE = ..." del gioco) restano sotto GPL-3.0.
#
# Passi:
#   1) scarica i GeoJSON in una cartella DIR:
#        for y in 1000 1500 1800 1914 1938; do curl -s -o DIR/world_$y.geojson \
#          https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_$y.geojson; done
#   2) esporta le caselle di terra (fiumi compresi) di ogni taglia:
#        cat stub.js game.js export_tiles.js > _run.js && FIUMI=1 OUT=tiles.json node _run.js
#   3) python3 build_epoche.py DIR tiles.json piccoli_imperi.html [ANTEPRIME]
#        assegna a ogni casella lo stato della sua epoca e riscrive la riga "const EPOCHE = ..."
#        nel gioco; con ANTEPRIME scrive anche un'immagine per epoca (serve Pillow)
#
# Regole: una casella prende lo stato del poligono piu' piccolo che la contiene; se nessun
# poligono la contiene (coste un po' diverse, isolette) prende il piu' vicino con un nome entro
# 1.5 gradi. I poligoni
# senza nome (il Sahara, per esempio) restano terra di nessuno. CORREZIONI forza lo stato sulle
# caselle di un paese di oggi, dove i dati sono sbagliati. Gli stati con meno di MIN_CASELLE
# caselle sulla mappa piccola si uniscono al vicino che li circonda di piu'.
# Dipendenze: pip install shapely numpy (Pillow per le anteprime)
import sys, re, json
import numpy as np

MIN_CASELLE = 3
NEAREST_GRADI = 1.5

# emblemi: 👑 impero  🏰 regno o principato  🌙 stato islamico  ⛺ popoli e orde
#          🏛️ repubblica  ⛪ Stato della Chiesa  ⚓ Venezia  🚩 Unione Sovietica
EPOCHE = {
  '1000': {
    'titolo': "L'anno Mille",
    'stati': {
      'UGR': ('Popoli ugrofinnici della taiga', '⛺'), 'RUS': ("Rus' di Kiev", '🏰'),
      'FAT': ('Califfato fatimide', '🌙'), 'VBU': ('Bulgari del Volga', '🌙'),
      'BIZ': ('Impero bizantino', '👑'), 'SRI': ('Sacro Romano Impero', '👑'),
      'PEC': ('Peceneghi', '⛺'), 'COR': ('Califfato di Cordova', '🌙'),
      'FRA': ('Regno di Francia', '🏰'), 'BUL': ('Impero bulgaro', '🏰'),
      'KHZ': ('Cazari', '⛺'), 'SAM': ('Sami', '⛺'), 'UNG': ("Regno d'Ungheria", '🏰'),
      'KIP': ('Khaganato dei Kimek e dei Kipchak', '⛺'), 'ENG': ("Regno d'Inghilterra", '🏰'),
      'KAR': ('Careliani', '⛺'), 'CEL': ('Regni celtici', '🏰'), 'LEO': ('Regno di León', '🏰'),
      'ALA': ('Alani', '⛺'), 'BOR': ('Regno di Borgogna', '🏰'), 'GEO': ('Regno di Georgia', '🏰'),
      'SCO': ('Regno di Scozia', '🏰'), 'ARM': ('Regno di Armenia', '🏰'),
      'BUY': ('Emirati buyidi', '🌙'), 'POM': ('Pomerania', '🏰'), 'CAS': ('Contea di Castiglia', '🏰'),
      'SER': ('Principato di Serbia', '🏰'), 'POL': ('Ducato di Polonia', '🏰'),
      'NAV': ('Regno di Navarra', '🏰'), 'CRO': ('Regno di Croazia', '🏰'),
      'BEN': ('Principato di Benevento', '🏰'), 'BRE': ('Ducato di Bretagna', '🏰'),
      'SIC': ('Emirato di Sicilia', '🌙'), 'SAR': ('Giudicati di Sardegna', '🏰'),
      'CIU': ('Ciudi', '⛺'), 'ARA': ("Contea d'Aragona", '🏰'), 'COS': ('Corsica', '🏰'),
      'FIN': ('Finni', '⛺'), 'DAN': ('Danimarca e Norvegia', '🏰'),
      'VEN': ('Repubblica di Venezia', '⚓'), 'GUA': ('Guanci', '⛺'), 'BAL': ('Tribù baltiche', '⛺'),
    },
    'nomi': {
      'Finno-Ugric taiga hunter-gatherers': 'UGR', 'Paleo-Siberian hunter-gatherers': 'UGR',
      'Kyivan Rus': 'RUS', 'Fatimid Caliphate': 'FAT', 'Volga Bulgars': 'VBU', 'Byzantine Empire': 'BIZ',
      'Cyprus': 'BIZ', 'Holy Roman Empire': 'SRI', 'Duchy of Swabia': 'SRI', 'Peshemegs': 'PEC',
      'Caliphate of Córdoba': 'COR', 'Kingdom of France': 'FRA', 'Bulgar Khanate': 'BUL', 'Khazars': 'KHZ',
      'Samis': 'SAM', 'Magyars': 'UNG', 'Kimek-Kipchak khaganate': 'KIP', 'England': 'ENG',
      'Karelians': 'KAR', 'Celtic kingdoms': 'CEL', 'León': 'LEO', 'Alans': 'ALA', 'Burgandy': 'BOR',
      'Kingdom of Georgia': 'GEO', 'Scotland': 'SCO', 'Armenia': 'ARM', 'Buwayhid Emirates': 'BUY',
      'Pomerania': 'POM', 'Castilla': 'CAS', 'Serbia': 'SER', 'Poland': 'POL', 'Navarre': 'NAV',
      'Croatia': 'CRO', 'Duchy of Benevento': 'BEN', 'Britany': 'BRE', 'Emirate of Sicily': 'SIC',
      'Sardinia': 'SAR', 'Chuds': 'CIU', 'Aragón': 'ARA', 'Corsica': 'COS', 'Suomi': 'FIN',
      'Denmark-Norway': 'DAN', 'Venice': 'VEN', 'Guanches': 'GUA', 'Baltic tribes': 'BAL',
    },
    'correzioni': {},
  },
  '1500': {
    'titolo': 'Il Rinascimento',
    'stati': {
      'MOS': ('Granducato di Mosca', '🏰'), 'ORD': ("Orda d'Oro", '⛺'), 'OTT': ('Impero ottomano', '🌙'),
      'SRI': ('Sacro Romano Impero', '👑'), 'MAM': ('Sultanato mamelucco', '🌙'),
      'PLL': ('Polonia-Lituania', '🏰'), 'FRA': ('Regno di Francia', '🏰'),
      'CRI': ('Khanato di Crimea', '🌙'), 'OBI': ('Orda Bianca', '⛺'), 'CAS': ('Corona di Castiglia', '🏰'),
      'UNG': ("Regno d'Ungheria", '🏰'), 'ZAY': ('Regno di Tlemcen', '🌙'),
      'ENG': ("Regno d'Inghilterra", '🏰'), 'ARA': ("Corona d'Aragona", '🏰'),
      'HAF': ('Sultanato hafside', '🌙'), 'AKK': ('Ak Koyunlu, i Montoni Bianchi', '🌙'),
      'WAT': ('Sultanato wattaside', '🌙'), 'KAL': ('Unione di Kalmar', '🏰'),
      'POR': ('Regno di Portogallo', '🏰'), 'SCO': ('Regno di Scozia', '🏰'),
      'GEO': ('Regno di Georgia', '🏰'), 'VEN': ('Repubblica di Venezia', '⚓'),
      'PAP': ('Stato della Chiesa', '⛪'), 'PSK': ('Repubblica di Pskov', '🏛️'),
      'SVI': ('Confederazione svizzera', '🏛️'), 'RYA': ('Principato di Rjazan', '🏰'),
      'BRE': ('Ducato di Bretagna', '🏰'), 'NAV': ('Regno di Navarra', '🏰'), 'SAM': ('Sami', '⛺'),
    },
    'nomi': {
      'Grand Duchy of Moscow': 'MOS', 'Novgorod-Seversky': 'MOS', 'Golden Horde': 'ORD',
      'Ottoman Empire': 'OTT', 'Holy Roman Empire': 'SRI', 'Mamluke Sultanate': 'MAM',
      'Poland-Lithuania': 'PLL', 'Teutonic Knights': 'PLL', 'France': 'FRA', 'Crimean Khanate': 'CRI',
      'White Horde': 'OBI', 'Castille': 'CAS', 'Guanches': 'CAS', 'Imperial Hungary': 'UNG',
      'Zayyanid Caliphate': 'ZAY', 'England': 'ENG', 'Aragón': 'ARA', 'Hafsid Caliphate': 'HAF',
      'Emirate of the White Sheep Turks': 'AKK', 'Wattasid Caliphate': 'WAT', 'Kalmar Union': 'KAL',
      'Portugal': 'POR', 'Scotland': 'SCO', 'Georgia': 'GEO', 'Venice': 'VEN', 'Cyprus': 'VEN',
      'Papal States': 'PAP', 'Pskov': 'PSK', 'Swiss Confederation': 'SVI', 'Ryazan': 'RYA',
      'Britany': 'BRE', 'Navarre': 'NAV', 'Sámi': 'SAM',
    },
    'correzioni': {},
  },
  '1800': {
    'titolo': "L'età napoleonica",
    'stati': {
      'RUS': ('Impero russo', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'FRA': ('Repubblica francese', '🏛️'),
      'AUS': ('Monarchia asburgica', '👑'), 'SPA': ('Regno di Spagna', '🏰'),
      'MAR': ('Sultanato del Marocco', '🌙'), 'ALG': ('Reggenza di Algeri', '🌙'),
      'GBR': ('Regno di Gran Bretagna', '🏰'), 'KAZ': ('Khanati kazaki', '⛺'),
      'IRL': ("Regno d'Irlanda", '🏰'), 'SVE': ('Circolo di Svevia', '🏰'),
      'NAP': ('Regno di Napoli e Sicilia', '🏰'), 'PRU': ('Regno di Prussia', '🏰'),
      'TUN': ('Beilicato di Tunisi', '🌙'), 'POR': ('Regno di Portogallo', '🏰'),
      'TRI': ('Reggenza di Tripoli', '🌙'), 'HAN': ('Elettorato di Hannover', '🏰'),
      'SAR': ('Regno di Sardegna', '🏰'), 'BAT': ('Repubblica batava', '🏛️'),
      'SAS': ('Elettorato di Sassonia', '🏰'), 'PAP': ('Stato della Chiesa', '⛪'),
      'BAV': ('Elettorato di Baviera', '🏰'), 'ELV': ('Repubblica elvetica', '🏛️'),
      'TOS': ('Granducato di Toscana', '🏰'), 'MEC': ('Ducato di Meclemburgo', '🏰'),
      'SWE': ('Regno di Svezia', '🏰'), 'CIS': ('Repubblica cisalpina', '🏛️'),
      'WUR': ('Ducato del Württemberg', '🏰'), 'BAD': ('Margraviato di Baden', '🏰'),
      'DAN': ('Danimarca e Norvegia', '🏰'), 'MOD': ('Ducato di Modena', '🏰'),
      'PAR': ('Ducato di Parma', '🏰'), 'OLD': ('Ducato di Oldenburg', '🏰'),
      'GER': ('Stati tedeschi minori', '🏰'), 'PER': ('Persia', '🌙'),
    },
    'nomi': {
      'Russian Empire': 'RUS', 'Ottoman Empire': 'OTT', 'France': 'FRA', 'Austrian Netherlands': 'FRA',
      'Luxembourg': 'FRA', 'Austrian Empire': 'AUS', 'Venetia': 'AUS', 'Spain': 'SPA', 'Guanches': 'SPA',
      'Morocco': 'MAR', 'Algiers': 'ALG', 'United Kingdom': 'GBR', 'central Asian khanates': 'KAZ',
      'Kingdom of Ireland': 'IRL', 'Swabia': 'SVE', 'Kingdom of the Two Sicilies': 'NAP',
      'Prussia': 'PRU', 'Tunis': 'TUN', 'Portugal': 'POR', 'Tripolitania': 'TRI', 'Cyrenaica': 'TRI',
      # nei dati l'Hannover (della corona britannica) e' scritto Mecklenburg-Strelitz
      'Mecklenburg-Strelitz': 'HAN', 'Hanover': 'HAN', 'Kingdom of Sardinia': 'SAR',
      'Batavian Republic': 'BAT', 'Saxony': 'SAS', 'Papal States': 'PAP', 'Bavaria': 'BAV',
      'Helvetic Republic': 'ELV', 'Tuscany': 'TOS', 'Lucca': 'TOS', 'Pontremoli': 'TOS',
      'Mecklenburg-Schwerin': 'MEC', 'Sweden': 'SWE', 'Lombardy': 'CIS', 'Württemberg': 'WUR',
      'Baden': 'BAD', 'Holstein': 'DAN', 'Denmark-Norway': 'DAN', 'Modena': 'MOD', 'Parma': 'PAR',
      'Oldenburg': 'OLD', 'Anhalt': 'GER', 'Thuringia': 'GER', 'Lippe-Detmold': 'GER',
      'Brunswick': 'GER', 'Waldeck': 'GER', 'Hamburg': 'GER', 'Schaumburg-Lippe': 'GER',
      'Hohenzollern': 'GER', 'Persia': 'PER',
    },
    'correzioni': {},
  },
  '1914': {
    'titolo': 'La vigilia della Grande Guerra',
    'stati': {
      'RUS': ('Impero russo', '👑'), 'ALG': ('Algeria francese', '🏰'), 'OTT': ('Impero ottomano', '🌙'),
      'LIB': ('Libia italiana', '🏰'), 'FRA': ('Repubblica francese', '🏛️'),
      'AUH': ('Impero austro-ungarico', '👑'), 'SPA': ('Regno di Spagna', '🏰'),
      'GER': ('Impero tedesco', '👑'), 'GBR': ('Regno Unito', '👑'), 'EGI': ("Sultanato d'Egitto", '🌙'),
      'MAR': ('Marocco francese', '🌙'), 'ITA': ("Regno d'Italia", '🏰'), 'ROM': ('Regno di Romania', '🏰'),
      'BUL': ('Regno di Bulgaria', '🏰'), 'TUN': ('Tunisia francese', '🌙'), 'SER': ('Regno di Serbia', '🏰'),
      'GRE': ('Regno di Grecia', '🏰'), 'POR': ('Repubblica portoghese', '🏛️'), 'SVI': ('Svizzera', '🏛️'),
      'OLA': ('Regno dei Paesi Bassi', '🏰'), 'BEL': ('Regno del Belgio', '🏰'),
      'MSP': ('Marocco spagnolo', '🏰'), 'ALB': ("Principato d'Albania", '🏰'),
      'MON': ('Regno del Montenegro', '🏰'), 'NOR': ('Regno di Norvegia', '🏰'),
      'LUX': ('Granducato di Lussemburgo', '🏰'), 'PER': ('Persia', '🌙'),
    },
    'nomi': {
      # Georgia, Finlandia e Azerbaigian nel 1914 erano parte dell'Impero russo
      'Russian Empire': 'RUS', 'Georgia': 'RUS', 'Finland': 'RUS', 'Azerbaijan': 'RUS',
      'Algeria': 'ALG', 'Ottoman Empire': 'OTT', 'Libya': 'LIB', 'France': 'FRA',
      'Austro-Hungarian Empire': 'AUH', 'Spain': 'SPA', 'German Empire': 'GER',
      'United Kingdom of Great Britain and Ireland': 'GBR', 'Egypt': 'EGI', 'Morocco': 'MAR',
      'Kingdom of Italy': 'ITA', 'Romania': 'ROM', 'Bulgaria': 'BUL', 'Tunisia': 'TUN', 'Serbia': 'SER',
      'Greece': 'GRE', 'Portugal': 'POR', 'Switzerland': 'SVI', 'Netherlands': 'OLA', 'Belgium': 'BEL',
      'Spanish Morocco': 'MSP', 'Spanish Sahara': 'MSP', 'Albania': 'ALB', 'Montenegro': 'MON',
      'Norway': 'NOR', 'Luxembourg': 'LUX', 'Persia': 'PER',
    },
    'correzioni': {},
  },
  '1938': {
    'titolo': 'La vigilia della Seconda guerra mondiale',
    'stati': {
      'URS': ('Unione Sovietica', '🚩'), 'ALG': ('Algeria francese', '🏰'), 'LIB': ('Libia italiana', '🏰'),
      'FRA': ('Repubblica francese', '🏛️'), 'GER': ('Germania', '🏰'), 'SPA': ('Spagna', '🏰'),
      'TUR': ('Repubblica di Turchia', '🏛️'), 'MAR': ('Marocco francese', '🌙'),
      'EGI': ("Regno d'Egitto", '🏰'), 'ROM': ('Regno di Romania', '🏰'), 'ITA': ("Regno d'Italia", '🏰'),
      'GBR': ('Regno Unito', '👑'), 'JUG': ('Regno di Jugoslavia', '🏰'), 'TUN': ('Tunisia francese', '🌙'),
      'GRE': ('Regno di Grecia', '🏰'), 'BUL': ('Regno di Bulgaria', '🏰'), 'POL': ('Polonia', '🏛️'),
      'SIR': ('Siria francese', '🏰'), 'UNG': ("Regno d'Ungheria", '🏰'), 'POR': ('Portogallo', '🏛️'),
      'IRL': ('Irlanda', '🏛️'), 'FIN': ('Finlandia', '🏛️'), 'OLA': ('Regno dei Paesi Bassi', '🏰'),
      'SVI': ('Svizzera', '🏛️'), 'BEL': ('Regno del Belgio', '🏰'), 'ALB': ("Regno d'Albania", '🏰'),
      'CEC': ('Cecoslovacchia', '🏛️'), 'NOR': ('Regno di Norvegia', '🏰'),
      'LUX': ('Granducato di Lussemburgo', '🏰'),
    },
    'nomi': {
      'USSR': 'URS', 'Armenia': 'URS', 'Algeria (France)': 'ALG', 'Libya': 'LIB', 'France': 'FRA',
      'Germany': 'GER', 'Spain': 'SPA', 'Spanish Sahara': 'SPA', 'Turkey': 'TUR',
      'Morocco (France)': 'MAR', 'Egypt': 'EGI', 'Romania': 'ROM', 'Italy': 'ITA', 'United Kingdom': 'GBR',
      'Yugoslavia': 'JUG', 'Tunisia': 'TUN', 'Greece': 'GRE', 'Bulgaria': 'BUL', 'Poland': 'POL',
      'Syria (France)': 'SIR', 'Hungary': 'UNG', 'Portugal': 'POR', 'Ireland': 'IRL', 'Finland': 'FIN',
      'Netherlands': 'OLA', 'Switzerland': 'SVI', 'Belgium': 'BEL', 'Albania': 'ALB',
      'Czechoslovakia': 'CEC', 'Norway': 'NOR', 'Luxembourg': 'LUX',
    },
    # nei dati la Turchia si ferma a 39.4°E: il resto e' "Armenia" sovietica o "Siria"
    'correzioni': {'TR': 'TUR'},
  },
}

# la lettera dell'i-esimo stato nella griglia (lo stesso alfabeto e' nel gioco)
ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_{|}~'


def leggi_poligoni(path):
    from shapely.geometry import shape
    geoms, nomi = [], []
    for f in json.load(open(path, encoding='utf-8'))['features']:
        if not f['geometry']:
            continue
        g = shape(f['geometry']).buffer(0)
        if g.is_empty:
            continue
        geoms.append(g)
        nomi.append((f['properties'] or {}).get('NAME') or None)
    return geoms, nomi


def assegna(tiles, geoms, nomi):
    """il nome dello stato storico di ogni casella (None = terra di nessuno)"""
    import shapely
    from shapely.strtree import STRtree
    pts = shapely.points([[t[2], t[3]] for t in tiles])
    tree = STRtree(geoms)
    aree = np.array([g.area for g in geoms])
    best = np.full(len(tiles), -1)
    ip, ig = tree.query(pts, predicate='within')
    for p, g in zip(ip, ig):  # il poligono piu' piccolo che contiene la casella
        if best[p] < 0 or aree[g] < aree[best[p]]:
            best[p] = g
    fuori = np.where(best < 0)[0]
    if len(fuori):
        con_nome = [i for i, n in enumerate(nomi) if n]  # fuori dai poligoni: il piu' vicino con un nome
        ip, ig = STRtree([geoms[i] for i in con_nome]).query_nearest(pts[fuori], max_distance=NEAREST_GRADI)
        for p, g in zip(ip, ig):
            if best[fuori[p]] < 0:
                best[fuori[p]] = con_nome[g]
    return [nomi[b] if b >= 0 else None for b in best]


def vicino_prevalente(tiles, codici, idx_stato, validi):
    """il codice valido piu' comune fra le caselle piu' vicine a quelle di uno stato"""
    xy = np.array([[t[2], t[3]] for t in tiles])
    ok = np.array([c in validi for c in codici])
    voti = {}
    for i in idx_stato:
        d = np.hypot(*(xy[ok] - xy[i]).T)
        for j in np.argsort(d)[:6]:
            c = np.array(codici, dtype=object)[ok][j]
            voti[c] = voti.get(c, 0) + 1
    return max(voti, key=voti.get) if voti else None


def codifica(rows, cols, tiles, codici, alfabeto):
    """RLE riga per riga come BIOMI; le caselle di mare non contano (allungano il tratto corrente)"""
    grid = [None] * (rows * cols)  # None = mare, non conta
    for t, c in zip(tiles, codici):
        grid[t[0] * cols + t[1]] = alfabeto.get(c, '.')
    out, cur, n = [], None, 0
    for v in grid:
        if v is None:
            n += 1
        elif cur is None or v == cur:
            cur, n = v, n + 1
        else:
            out.append((str(n) if n > 1 else '') + cur)
            cur, n = v, 1
    out.append((str(n) if n > 1 else '') + (cur or '.'))
    return ''.join(out)


def anteprima(path, rows, cols, tiles, codici, stati):
    from PIL import Image, ImageDraw
    import colorsys, hashlib
    img = Image.new('RGB', (cols * 3, rows * 3), (30, 60, 100))
    d = ImageDraw.Draw(img)
    col = {}
    for c in stati:
        h = int(hashlib.md5(c.encode()).hexdigest()[:6], 16) / 0xffffff
        col[c] = tuple(int(255 * x) for x in colorsys.hsv_to_rgb(h, 0.55, 0.85))
    pos = {}
    for t, c in zip(tiles, codici):
        x, y = t[1] * 3 + (t[0] % 2) * 1.5, t[0] * 3
        d.rectangle([x, y, x + 2.6, y + 2.6], fill=col.get(c, (200, 190, 160)))
        if c:
            pos.setdefault(c, []).append((x, y))
    for c, ps in pos.items():
        if len(ps) < 4:
            continue
        x, y = np.mean(ps, axis=0)
        d.text((x - 8, y - 4), c, fill=(0, 0, 0))
    img.save(path)


def main():
    src, tiles_path, html_path = sys.argv[1:4]
    prev = sys.argv[4] if len(sys.argv) > 4 else None
    T = json.load(open(tiles_path))
    out = {}
    for anno, E in EPOCHE.items():
        geoms, nomi = leggi_poligoni(f'{src}/world_{anno}.geojson')
        per_taglia = {}
        for taglia, M in T.items():
            tiles = M['tiles']
            nn = assegna(tiles, geoms, nomi)
            codici = []
            for t, n in zip(tiles, nn):
                if t[4] in E['correzioni']:
                    codici.append(E['correzioni'][t[4]])
                elif n is None:
                    codici.append(None)
                elif n in E['nomi']:
                    codici.append(E['nomi'][n])
                else:
                    codici.append('?' + n)
            per_taglia[taglia] = codici
        # gli stati sconosciuti o troppo piccoli (sulla mappa piccola) si uniscono al vicino
        tp, cp = T['piccola']['tiles'], per_taglia['piccola']
        conta = {}
        for c in cp:
            conta[c] = conta.get(c, 0) + 1
        fusioni = {}
        validi = {c for c in conta if c and not c.startswith('?') and conta[c] >= MIN_CASELLE}
        for c in conta:
            if c and c not in validi:
                dove = vicino_prevalente(tp, cp, [i for i, x in enumerate(cp) if x == c], validi)
                fusioni[c] = dove
                print(f'{anno}: {c} ({conta[c]} caselle) unito a {dove}', file=sys.stderr)
        for taglia in per_taglia:
            cs = [fusioni.get(c, c) for c in per_taglia[taglia]]
            for c in sorted({c for c in cs if c and c not in validi}):  # solo sulle mappe piu' fitte
                dove = vicino_prevalente(T[taglia]['tiles'], cs, [i for i, x in enumerate(cs) if x == c], validi)
                print(f'{anno}/{taglia}: {c} unito a {dove}', file=sys.stderr)
                cs = [dove if x == c else x for x in cs]
            per_taglia[taglia] = cs
            for c in cs:
                if c and c not in E['stati']:
                    sys.exit(f'{anno}/{taglia}: stato senza nome italiano: {c}')
        usati = [c for c in E['stati'] if c in set(per_taglia['piccola'])]
        alf = {c: ALFABETO[i] for i, c in enumerate(usati)}
        out[anno] = {
            'titolo': E['titolo'],
            'stati': {c: {'nome': E['stati'][c][0], 'emblema': E['stati'][c][1]} for c in usati},
            'griglia': {t: codifica(T[t]['rows'], T[t]['cols'], T[t]['tiles'], per_taglia[t], alf) for t in T},
        }
        n_stati = len(usati)
        print(f'{anno}: {n_stati} stati, ' + ', '.join(f'{t} {len(out[anno]["griglia"][t]) // 1024} KB' for t in T),
              file=sys.stderr)
        if prev:
            anteprima(f'{prev}/epoca_{anno}.png', T['piccola']['rows'], T['piccola']['cols'],
                      T['piccola']['tiles'], per_taglia['piccola'], usati)
    riga = 'const EPOCHE = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';'
    h = open(html_path, encoding='utf-8').read()
    if re.search(r'^const EPOCHE = .*;$', h, re.M):
        h = re.sub(r'^const EPOCHE = .*;$', lambda m: riga, h, count=1, flags=re.M)
    else:
        h = re.sub(r'^(const BIOMI = .*;)$', lambda m: m.group(1) + '\n' + riga, h, count=1, flags=re.M)
    open(html_path, 'w', encoding='utf-8').write(h)


if __name__ == '__main__':
    main()
