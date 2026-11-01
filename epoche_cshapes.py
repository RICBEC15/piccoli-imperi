# Gli stati dal 1886 in poi per build_epoche.py, dai confini ufficiali di CShapes 2.0
# (Weidmann, Schvitz, Girardin; https://icr.ethz.ch/data/cshapes/; il pacchetto R e' GPL >= 2,
# i dati CC BY-NC-SA 4.0: uso non commerciale, citando la fonte). CShapes ha i confini giorno per
# giorno dal 1886 al 2019, con le colonie; non segna le occupazioni di guerra.
# Il file: https://raw.githubusercontent.com/cran/cshapes/master/inst/extdata/cshapes_2_gw.topojson.xz
# (va messo nella cartella DIR di build_epoche.py).
# Per ogni anno conta il 1° luglio; un anno nuovo nasce solo se cambiano confini o nomi.
import json, lzma

ANNO_PRIMO = 1886
ANNO_ULTIMO = 2007   # dal 2008 (il Kosovo) i confini sono quelli di oggi
DATA = '-07-01'

# il titolo dell'anno nel menu
ERE = [(1886, 'La Belle Époque'), (1914, 'La Grande Guerra'), (1919, 'Tra le due guerre'),
       (1939, 'La Seconda guerra mondiale'), (1946, 'La guerra fredda'), (1992, 'Dopo la guerra fredda')]

# caselle senza stato nei dati, per paese di oggi: [(fino_all_anno escluso, nome CShapes)]
# (prima del 1912 la Libia era ottomana, ma CShapes non la disegna)
SENZA_STATO = {'LY': [(1912, 'Turkey (Ottoman Empire)')],
               # v84: le terre nuove fuori dagli stati di CShapes (nomi con '_': stati non disegnati)
               'SA': [(2100, '_Arabia')], 'YE': [(2100, '_Arabia')], 'OM': [(2100, 'Oman')],
               'SD': [(1899, '_Mahdi')], 'TD': [(2100, '_Ciad')], 'NE': [(2100, '_Sahel')], 'ML': [(2100, '_Sahel')],
               'BF': [(2100, '_Sahel')], 'MR': [(2100, '_Sahel')], 'NG': [(2100, '_Nigeria')], 'CM': [(2100, '_Ciad')]}


# nomi italiani degli stati di CShapes 2.0, per periodo: [(dal_anno, codice, nome, emblema), ...]
# (il primo periodo vale anche prima del suo anno)
NOMI = {
  'Afghanistan': [(1886, 'AFG', 'Afghanistan', '🌙')],
  'Albania': [(1913, 'ALB', "Principato d'Albania", '🏰'), (1925, 'ALB', 'Repubblica albanese', '🏛️'),
              (1928, 'ALB', "Regno d'Albania", '🏰'), (1946, 'ALB', 'Albania', '🚩'), (1992, 'ALB', 'Albania', '🏛️')],
  'Algeria': [(1886, 'ALG', 'Algeria francese', '🏰'), (1962, 'ALG', 'Algeria', '🏛️')],
  'Armenia': [(1991, 'ARM', 'Armenia', '🏛️')],
  'Austria': [(1918, 'AUT', "Repubblica d'Austria", '🏛️')],
  'Austria-Hungary': [(1886, 'AUH', 'Impero austro-ungarico', '👑')],
  'Azerbaijan': [(1991, 'AZE', 'Azerbaigian', '🏛️')],
  'Belarus (Byelorussia)': [(1991, 'BIE', 'Bielorussia', '🏛️')],
  'Belgium': [(1886, 'BEL', 'Regno del Belgio', '🏰')],
  'Bokhara': [(1886, 'BUK', 'Emirato di Bukhara', '🌙')],
  'Bosnia': [(1886, 'BOS', 'Bosnia-Erzegovina austriaca', '🏰')],
  'Herzegovina': [(1886, 'BOS', 'Bosnia-Erzegovina austriaca', '🏰')],
  'Bosnia-Herzegovina': [(1992, 'BIH', 'Bosnia ed Erzegovina', '🏛️')],
  'Bulgaria': [(1886, 'BUL', 'Principato di Bulgaria', '🏰'), (1908, 'BUL', 'Regno di Bulgaria', '🏰'),
               (1946, 'BUL', 'Bulgaria', '🚩'), (1990, 'BUL', 'Bulgaria', '🏛️')],
  'Chad': [(1900, 'CIA', 'Ciad francese', '🏰'), (1960, 'CIA', 'Ciad', '🏛️')],
  'Croatia': [(1992, 'CRO', 'Croazia', '🏛️')],
  'Cyprus': [(1914, 'CIP', 'Cipro britannica', '🏰'), (1960, 'CIP', 'Cipro', '🏛️')],
  'Czech Republic': [(1993, 'CEK', 'Repubblica Ceca', '🏛️')],
  'Czechoslovakia': [(1918, 'CEC', 'Cecoslovacchia', '🏛️'), (1948, 'CEC', 'Cecoslovacchia', '🚩'), (1990, 'CEC', 'Cecoslovacchia', '🏛️')],
  'Danzig': [(1919, 'DAZ', 'Città libera di Danzica', '🏛️')],
  'Denmark': [(1886, 'DAN', 'Regno di Danimarca', '🏰')],
  'Egypt': [(1886, 'EGI', "Chedivato d'Egitto", '🌙'), (1914, 'EGI', "Sultanato d'Egitto", '🌙'),
            (1922, 'EGI', "Regno d'Egitto", '🏰'), (1953, 'EGI', 'Repubblica egiziana', '🏛️'),
            (1958, 'EGI', 'Repubblica Araba Unita', '🏛️'), (1971, 'EGI', 'Egitto', '🏛️')],
  'Estonia': [(1918, 'EST', 'Estonia', '🏛️')],
  'Finland': [(1917, 'FIN', 'Finlandia', '🏛️')],
  'France': [(1886, 'FRA', 'Repubblica francese', '🏛️'), (1940, 'FRA', 'Francia di Vichy', '🏛️'), (1944, 'FRA', 'Repubblica francese', '🏛️')],
  'French West Africa': [(1886, 'AOF', 'Africa occidentale francese', '🏰')],
  'Mali': [(1886, 'AOF', 'Sudan francese', '🏰'), (1960, 'MLI', 'Mali', '🏛️')],
  'Niger': [(1886, 'NIG', 'Niger francese', '🏰'), (1960, 'NIG', 'Niger', '🏛️')],
  'Mauritania': [(1886, 'MAU', 'Mauritania francese', '🏰'), (1960, 'MAU', 'Mauritania', '🌙')],
  'Congo': [(1886, 'AOF', 'Africa occidentale francese', '🏰')],
  'Georgia': [(1991, 'GEO', 'Georgia', '🏛️')],
  'German Democratic Republic': [(1945, 'DDR', 'Germania, zona sovietica', '🚩'), (1949, 'DDR', 'Germania Est', '🚩')],
  'German Federal Republic': [(1945, 'RFT', 'Germania, zone occidentali', '🏛️'), (1949, 'RFT', 'Germania Ovest', '🏛️'), (1990, 'RFT', 'Germania', '🏛️')],
  'Germany (Prussia)': [(1886, 'GER', 'Impero tedesco', '👑'), (1919, 'GER', 'Repubblica di Weimar', '🏛️'), (1933, 'GER', 'Germania nazista', '🏰')],
  'Greece': [(1886, 'GRE', 'Regno di Grecia', '🏰'), (1924, 'GRE', 'Repubblica ellenica', '🏛️'),
             (1935, 'GRE', 'Regno di Grecia', '🏰'), (1974, 'GRE', 'Repubblica ellenica', '🏛️')],
  'Hungary': [(1918, 'UNG', 'Ungheria', '🏛️'), (1920, 'UNG', "Regno d'Ungheria", '🏰'),
              (1946, 'UNG', 'Ungheria', '🚩'), (1989, 'UNG', 'Ungheria', '🏛️')],
  'Iceland': [(1886, 'ISL', 'Islanda danese', '🏰'), (1918, 'ISL', "Regno d'Islanda", '🏰'), (1944, 'ISL', 'Islanda', '🏛️')],
  'India': [(1886, 'IND', 'India britannica', '🏰')],
  'Iran (Persia)': [(1886, 'PER', 'Persia', '🌙'), (1935, 'PER', 'Iran', '🌙')],
  'Iraq': [(1920, 'IRQ', 'Iraq britannico', '🏰'), (1932, 'IRQ', "Regno dell'Iraq", '🏰'), (1958, 'IRQ', 'Iraq', '🏛️')],
  'Ireland': [(1921, 'IRL', "Stato libero d'Irlanda", '🏛️'), (1937, 'IRL', 'Irlanda', '🏛️')],
  'Israel': [(1948, 'ISR', 'Israele', '🏛️')],
  'Gaza': [(1948, 'GAZ', 'Striscia di Gaza', '🏛️')],
  'West Bank': [(1948, 'CIS', 'Cisgiordania', '🏛️')],
  'Palestine': [(1920, 'PAL', 'Palestina britannica', '🏰')],
  'Italy/Sardinia': [(1886, 'ITA', "Regno d'Italia", '🏰'), (1946, 'ITA', 'Repubblica italiana', '🏛️')],
  'Jordan': [(1920, 'GIO', 'Transgiordania britannica', '🏰'), (1946, 'GIO', 'Regno di Giordania', '🏰')],
  'Kazakhstan': [(1991, 'KAZ', 'Kazakistan', '🏛️')],
  'Khiva': [(1886, 'KHI', 'Khanato di Khiva', '🌙')],
  'Kosovo': [(2008, 'KOS', 'Kosovo', '🏛️')],
  'Latvia': [(1918, 'LET', 'Lettonia', '🏛️')],
  'Lebanon': [(1920, 'LIB', 'Libano francese', '🏰'), (1943, 'LIB', 'Libano', '🏛️')],
  'Libya': [(1912, 'LBA', 'Libia italiana', '🏰'), (1943, 'LBA', 'Libia sotto gli Alleati', '🏰'),
            (1951, 'LBA', 'Regno di Libia', '🏰'), (1969, 'LBA', 'Libia', '🏛️')],
  'Lithuania': [(1918, 'LIT', 'Lituania', '🏛️')],
  'Luxembourg': [(1886, 'LUX', 'Granducato di Lussemburgo', '🏰')],
  'Macedonia (FYROM/North Macedonia)': [(1991, 'MAC', 'Macedonia', '🏛️')],
  'Malta': [(1886, 'MAL', 'Malta britannica', '🏰'), (1964, 'MAL', 'Malta', '🏛️')],
  'Moldova': [(1991, 'MOL', 'Moldavia', '🏛️')],
  'Montenegro': [(1886, 'MON', 'Principato del Montenegro', '🏰'), (1910, 'MON', 'Regno del Montenegro', '🏰'), (2006, 'MON', 'Montenegro', '🏛️')],
  'Morocco': [(1886, 'MAR', 'Sultanato del Marocco', '🌙'), (1912, 'MAR', 'Marocco francese', '🌙'), (1956, 'MAR', 'Regno del Marocco', '🌙')],
  'Spanish Morocco': [(1912, 'MSP', 'Marocco spagnolo', '🏰')],
  'Southern zone of Spanish Morocco': [(1956, 'MSP', 'Marocco spagnolo del Sud', '🏰')],
  'Spanish Sahara': [(1958, 'SAH', 'Sahara spagnolo', '🏰')],
  'Spanish West Africa': [(1886, 'SAH', 'Africa occidentale spagnola', '🏰')],
  'Netherlands': [(1886, 'OLA', 'Regno dei Paesi Bassi', '🏰')],
  'Norway': [(1905, 'NOR', 'Regno di Norvegia', '🏰')],
  'Poland': [(1918, 'POL', 'Polonia', '🏛️'), (1947, 'POL', 'Polonia', '🚩'), (1989, 'POL', 'Polonia', '🏛️')],
  'Portugal': [(1886, 'POR', 'Regno di Portogallo', '🏰'), (1910, 'POR', 'Repubblica portoghese', '🏛️')],
  'Rumania': [(1886, 'ROM', 'Regno di Romania', '🏰'), (1947, 'ROM', 'Romania', '🚩'), (1990, 'ROM', 'Romania', '🏛️')],
  'Russia (Soviet Union)': [(1886, 'RUS', 'Impero russo', '👑'), (1917, 'RUS', 'Russia sovietica', '🚩'),
                            (1922, 'RUS', 'Unione Sovietica', '🚩'), (1992, 'RUS', 'Federazione Russa', '🏛️')],
  'Saudi Arabia': [(1932, 'SAU', 'Arabia Saudita', '🌙')],
  'Serbia': [(1886, 'SER', 'Regno di Serbia', '🏰'), (2006, 'SER', 'Serbia', '🏛️')],
  'Slovakia': [(1993, 'SLK', 'Slovacchia', '🏛️')],
  'Slovenia': [(1992, 'SLO', 'Slovenia', '🏛️')],
  'Spain': [(1886, 'SPA', 'Regno di Spagna', '🏰'), (1931, 'SPA', 'Repubblica spagnola', '🏛️'),
            (1939, 'SPA', 'Spagna franchista', '🏰'), (1975, 'SPA', 'Regno di Spagna', '🏰')],
  'Sudan': [(1899, 'SUD', 'Sudan anglo-egiziano', '🏰'), (1956, 'SUD', 'Sudan', '🏛️')],
  'Sweden': [(1886, 'SWE', 'Svezia e Norvegia', '🏰'), (1905, 'SWE', 'Regno di Svezia', '🏰')],
  'Switzerland': [(1886, 'SVI', 'Svizzera', '🏛️')],
  'Syria': [(1920, 'SIR', 'Siria francese', '🏰'), (1946, 'SIR', 'Siria', '🏛️')],
  'Tunisia': [(1886, 'TUN', 'Tunisia francese', '🌙'), (1956, 'TUN', 'Tunisia', '🏛️')],
  'Turkey (Ottoman Empire)': [(1886, 'OTT', 'Impero ottomano', '🌙'), (1922, 'OTT', 'Turchia', '🏛️')],
  'Turkmenistan': [(1991, 'TKM', 'Turkmenistan', '🏛️')],
  'Ukraine': [(1991, 'UCR', 'Ucraina', '🏛️')],
  'United Kingdom': [(1886, 'GBR', 'Regno Unito', '👑')],
  'Uzbekistan': [(1991, 'UZB', 'Uzbekistan', '🏛️')],
  'Yugoslavia': [(1918, 'JUG', 'Regno dei Serbi, Croati e Sloveni', '🏰'), (1929, 'JUG', 'Regno di Jugoslavia', '🏰'),
                 (1945, 'JUG', 'Jugoslavia', '🚩'), (1992, 'JUG', 'Serbia e Montenegro', '🏛️')],
  # v84: le terre nuove (Medio Oriente, Sahara e Sahel, Asia centrale)
  'Aden': [(1886, 'ADE', 'Aden britannica', '🏰')],
  'East Aden Protectorate': [(1886, 'APR', 'Protettorato di Aden', '🏰')],
  'Federation of South Arabia': [(1962, 'FAS', "Federazione dell'Arabia del Sud", '🏰')],
  "Yemen, People's Republic of": [(1967, 'YDS', 'Yemen del Sud', '🚩')],
  'Yemen (Arab Republic of Yemen)': [(1918, 'YEM', 'Regno dello Yemen', '🏰'), (1962, 'YEM', 'Repubblica Araba dello Yemen', '🏛️'), (1990, 'YEM', 'Yemen', '🏛️')],
  'Oman': [(1886, 'OMA', 'Sultanato di Mascate e Oman', '🌙'), (1970, 'OMA', 'Oman', '🌙')],
  'United Arab Emirates': [(1886, 'EAU', 'Stati della Tregua', '🌙'), (1971, 'EAU', 'Emirati Arabi Uniti', '🌙')],
  'Qatar': [(1886, 'QAT', 'Qatar britannico', '🌙'), (1971, 'QAT', 'Qatar', '🌙')],
  'Bahrain': [(1886, 'BAH', 'Bahrein', '🌙')],
  'Kuwait': [(1886, 'KUW', 'Kuwait', '🌙')],
  '_Arabia': [(1886, 'NEG', 'Emirati del Neged', '🌙'), (1926, 'NEG', 'Regno del Hegiaz e Neged', '🌙')],
  '_Mahdi': [(1886, 'MAH', 'Stato mahdista', '🌙')],
  '_Ciad': [(1886, 'WAD', 'Sultanati del Ciad', '🌙')],
  '_Sahel': [(1886, 'TOU', 'Regni del Sahel', '🏰')],
  '_Nigeria': [(1886, 'SOK', 'Califfato di Sokoto', '🌙')],
  'Pakistan': [(1947, 'PAK', 'Pakistan', '🌙')],
  'Eritrea': [(1886, 'ERI', 'Eritrea italiana', '🏰'), (1941, 'ERI', 'Eritrea britannica', '🏰'), (1993, 'ERI', 'Eritrea', '🏛️')],
  'Ethiopia': [(1886, 'ETI', 'Impero etiope', '👑'), (1974, 'ETI', 'Etiopia', '🚩'), (1991, 'ETI', 'Etiopia', '🏛️')],
  'Djibouti': [(1886, 'GIB', 'Somalia francese', '🏰'), (1967, 'GIB', 'Territorio degli Afar e degli Issa', '🏰'), (1977, 'GIB', 'Gibuti', '🏛️')],
  'British Somaliland (Somaliland Republic)': [(1886, 'SOB', 'Somalia britannica', '🏰')],
  'Italian Somaliland': [(1886, 'SOI', 'Somalia italiana', '🏰')],
  'Somalia': [(1960, 'SOM', 'Somalia', '🏛️')],
  'South Sudan': [(2011, 'SSU', 'Sudan del Sud', '🏛️')],
  'Senegal': [(1886, 'SEN', 'Senegal francese', '🏰'), (1960, 'SEN', 'Senegal', '🏛️')],
  'Gambia': [(1886, 'GAM', 'Gambia britannico', '🏰'), (1965, 'GAM', 'Gambia', '🏛️')],
  'Guinea': [(1886, 'GUI', 'Guinea francese', '🏰'), (1958, 'GUI', 'Guinea', '🏛️')],
  'Guinea-Bissau': [(1886, 'GBI', 'Guinea portoghese', '🏰'), (1974, 'GBI', 'Guinea-Bissau', '🏛️')],
  'Sierra Leone': [(1886, 'SLE', 'Sierra Leone britannica', '🏰')],
  "Cote D'Ivoire": [(1886, 'CIV', "Costa d'Avorio francese", '🏰')],
  'Cape Verde': [(1886, 'CVE', 'Capo Verde portoghese', '🏰'), (1975, 'CVE', 'Capo Verde', '🏛️')],
  'Burkina Faso (Upper Volta)': [(1886, 'VOL', 'Alto Volta francese', '🏰'), (1960, 'VOL', 'Alto Volta', '🏛️'), (1984, 'VOL', 'Burkina Faso', '🏛️')],
  'Benin': [(1886, 'DAH', 'Dahomey francese', '🏰'), (1960, 'DAH', 'Dahomey', '🏛️'), (1975, 'DAH', 'Benin', '🏛️')],
  'Northern Nigeria': [(1886, 'NGA', 'Nigeria settentrionale britannica', '🏰')],
  'Nigeria': [(1914, 'NGA', 'Nigeria britannica', '🏰'), (1960, 'NGA', 'Nigeria', '🏛️')],
  'Kamerun': [(1886, 'KAM', 'Camerun tedesco', '🏰')],
  'Cameroon': [(1916, 'CAM', 'Camerun francese', '🏰'), (1960, 'CAM', 'Camerun', '🏛️')],
  'British Cameroons': [(1916, 'CBR', 'Camerun britannico', '🏰')],
}


def titolo(anno):
    t = ERE[0][1]
    for a, n in ERE:
        if a <= anno:
            t = n
    return t


def nome(cn, anno):
    per = NOMI.get(cn)
    if not per:
        return None
    scelto = per[0]
    for p in per:
        if p[0] <= anno:
            scelto = p
    return scelto[1:]  # (codice, nome, emblema)


def leggi(path):
    """i poligoni di CShapes (topojson compresso) come shapely, con le loro proprieta'"""
    from shapely.geometry import shape, box
    d = json.loads(lzma.open(path).read())
    o = list(d['objects'].values())[0]
    tf = d.get('transform')
    arcs = []
    for a in d['arcs']:
        pts, x, y = [], 0, 0
        for p in a:
            if tf:
                x += p[0]; y += p[1]
                pts.append((x * tf['scale'][0] + tf['translate'][0], y * tf['scale'][1] + tf['translate'][1]))
            else:
                pts.append(tuple(p))
        arcs.append(pts)
    def ring(r):
        out = []
        for i in r:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(a if not out else a[1:])
        return out
    B = box(-27, 10, 67, 73)  # la mappa del gioco, larga (v84: fino allo Yemen e al Sahel)
    feats = []
    for g in o['geometries']:
        if g['type'] == 'Polygon':
            geo = {'type': 'Polygon', 'coordinates': [ring(r) for r in g['arcs']]}
        elif g['type'] == 'MultiPolygon':
            geo = {'type': 'MultiPolygon', 'coordinates': [[ring(r) for r in p] for p in g['arcs']]}
        else:
            continue
        p = g['properties']
        if p['end'] < f'{ANNO_PRIMO}-01-01':
            continue
        s = shape(geo).buffer(0)
        if not s.is_empty and s.intersects(B):
            s = s.simplify(0.01).buffer(0)  # circa un chilometro: le caselle sono di 8 km e piu'
            feats.append((s, p))
    return feats


def istantanee(path, T, assegna):
    """[(anno, titolo, stati {codice: (nome, emblema)}, codici per taglia, esatto)] dal 1886 al 2007"""
    feats = leggi(path)
    out, prima = [], None
    cache = {}  # (taglia, poligoni attivi) -> nomi CShapes delle caselle: molti anni hanno gli stessi
    for anno in range(ANNO_PRIMO, ANNO_ULTIMO + 1):
        d = f'{anno}{DATA}'
        attivi = [(g, p) for g, p in feats if p['start'] <= d <= p['end']]
        geoms = [g for g, _ in attivi]
        cn = [p['country_name'] for _, p in attivi]
        stati, per_taglia = {}, {}
        chiave_attivi = tuple(i for i, (g, p) in enumerate(feats) if p['start'] <= d <= p['end'])
        for taglia, M in T.items():
            k = (taglia, chiave_attivi)
            if k not in cache:
                cache[k] = assegna(M['tiles'], geoms, cn)
            nn = cache[k]
            codici = []
            for t, n in zip(M['tiles'], nn):
                if n is None:
                    for fino, alt in SENZA_STATO.get(t[4], []):
                        if anno < fino:
                            n = alt
                            break
                s = nome(n, anno) if n else None
                if n and not s:
                    codici.append('?' + n)
                elif s:
                    stati[s[0]] = (s[1], s[2])
                    codici.append(s[0])
                else:
                    codici.append(None)
            per_taglia[taglia] = codici
        firma = (json.dumps(per_taglia, sort_keys=True), json.dumps(stati, sort_keys=True, ensure_ascii=False), titolo(anno))
        if firma != prima:
            out.append((str(anno), titolo(anno), stati, per_taglia, True))
            prima = firma
    return out
