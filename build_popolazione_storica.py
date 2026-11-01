#!/usr/bin/env python3
# Costruisce POP_STORICA di Piccoli Imperi (v81): gli abitanti di ogni citta' di CITTA_REALI
# negli anni dal 1000 a oggi, cosi' la popolazione cambia con l'anno scelto.
#
# Fonti (in ordine di preferenza, per ogni citta' la piu' vicina entro pochi km):
#  1. World City Populations, dr Andrea Biguzzi, http://www.worldcitypop.com ("You are welcome
#     to use the data", citando la fonte). Serie storiche degli agglomerati, dall'antichita' al 2000.
#     Usata la copia pulita e geolocalizzata di Stadester (github.com/ConfoederatioVF/Stadester,
#     licenza MIT): input/worldcitypop/chandler_modelski_cities.json
#  2. E. Buringh, "The Population of European Cities from 700 to 2000" (2021, Research Data
#     Journal for the Humanities and Social Sciences, CC BY 4.0): 2.262 citta' europee ogni
#     secolo (ogni 50 anni dal 1500). Stessa copia di Stadester: input/buringh/ (UTF-16, '@').
#     Dal 1900 e' la citta' amministrativa: si avvicina piano piano all'agglomerato di oggi.
#  3. Reba, Reitsma e Seto, "Spatializing 6,000 years of global urbanization" (Scientific Data
#     2016, CC BY 4.0; da Chandler 1987 e Modelski 2003): alldata.csv da
#     github.com/fasiha/Historical-Urban-Population-Growth-Data
#  Oggi: gli abitanti di CITTA_REALI (Natural Earth, pubblico dominio).
# Dove una citta' non ha dati per un anno, si interpola (in scala logaritmica) fra gli anni
# noti; prima del primo dato si segue l'andamento delle 10 citta' vicine con dati completi.
#
# Come prendere i file (in una cartella FONTI_DIR):
#   git clone --depth 1 --filter=blob:none --sparse https://github.com/ConfoederatioVF/Stadester.git
#   (cd Stadester && git sparse-checkout set input/worldcitypop input/buringh)
#   cp Stadester/input/worldcitypop/chandler_modelski_cities.json FONTI_DIR/worldcitypop.json
#   iconv -f UTF-16 -t UTF-8 "Stadester/input/buringh/European urban population, 700 - 2000.txt" > FONTI_DIR/buringh.txt
#   curl -L -o FONTI_DIR/reba_alldata.csv https://raw.githubusercontent.com/fasiha/Historical-Urban-Population-Growth-Data/master/alldata.csv
# Uso (dalla cartella del gioco; riscrive il blocco POP_STORICA in piccoli_imperi.html,
# da rifare ogni volta che build_popolazione.js rifa' CITTA_REALI):
#   python3 build_popolazione_storica.py FONTI_DIR
import csv, json, math, re, sys, statistics, unicodedata

FONTI = sys.argv[1] if len(sys.argv) > 1 else 'fonti'
HTML = 'piccoli_imperi.html'
ANNI = [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1750, 1800, 1850, 1900, 1925, 1950, 1975, 2000]
OGGI = 2020    # l'anno dei numeri di Natural Earth
MINIMO = 1000  # nessuna citta' sotto i 1.000 abitanti

html = open(HTML, encoding='utf8').read()
blocco = re.search(r'const CITTA_REALI = \[(.*?)\n\];', html, re.S).group(1)
citta = json.loads('[' + blocco + ']')

def km(lon1, lat1, lon2, lat2):
    return math.hypot((lon1 - lon2) * 111.32 * math.cos(math.radians((lat1 + lat2) / 2)), (lat1 - lat2) * 110.57)

def piatto(s):
    s = unicodedata.normalize('NFKD', s.lower())
    return re.sub(r'[^a-z]', '', ''.join(c for c in s if not unicodedata.combining(c)))

def numero(s):
    return float(str(s).replace(',', '.'))

# --- le fonti: [(nomi, lon, lat, {anno: abitanti})]
wcp = []
for v in json.load(open(f'{FONTI}/worldcitypop.json', encoding='utf8')).values():
    if 'longitude' not in v or not v.get('population'): continue
    pts = {int(float(a)): float(p) for a, p in v['population'].items() if p is not None and float(p) > 0}
    nomi = {piatto(v['name'])} | {piatto(n) for n in v.get('other_names', []) or []}
    if pts: wcp.append((nomi, float(v['longitude']), float(v['latitude']), pts))

buringh = {}
righe = open(f'{FONTI}/buringh.txt', encoding='utf8').read().splitlines()[1:]
for r in righe:
    f = r.split('@')
    if len(f) < 10 or not f[9].strip(): continue
    k = (f[0], f[3])
    if k not in buringh:
        nomi = {piatto(f[0])} | {piatto(n) for n in f[1].split(',') if n.strip()}
        buringh[k] = (nomi, numero(f[6]), numero(f[5]), {})
    if numero(f[9]) > 0: buringh[k][3][int(f[8])] = numero(f[9]) * 1000  # 0 = non ancora citta': dato mancante
buringh = [x for x in buringh.values() if x[3]]

reba = {}
for r in csv.DictReader(open(f'{FONTI}/reba_alldata.csv', encoding='latin-1')):
    k = (r['City'], r['Country'])
    if k not in reba:
        nomi = {piatto(r['City'])} | {piatto(n) for n in r['OtherName'].split(',') if n.strip()}
        reba[k] = (nomi, float(r['Longitude']), float(r['Latitude']), {})
    reba[k][3][int(float(r['year']))] = float(r['pop'])
reba = list(reba.values())

def trova(fonte, nome, lon, lat, ab, raggio):
    # prima la citta' con lo stesso nome entro 40 km; se no la piu' vicina entro il raggio,
    # preferendo una taglia simile (Parigi, non Saint-Denis)
    n = piatto(nome)
    stessi = [x for x in fonte if n in x[0] and km(lon, lat, x[1], x[2]) <= 40]
    if stessi: return min(stessi, key=lambda x: km(lon, lat, x[1], x[2]))
    best, bp = None, 1e9
    for x in fonte:
        d = km(lon, lat, x[1], x[2])
        if d > raggio: continue
        massimo = max(x[3].values())
        pen = d + 3 * abs(math.log(max(massimo, 1000) / max(ab, 1000)))
        if pen < bp: bp, best = pen, x
    # un sobborgo che non e' mai stato grande non fa da citta' (Afragola per Napoli)
    if best and max(best[3].values()) < ab / 20: return None
    return best

def stessoNome(x, nome): return x is not None and piatto(nome) in x[0]

def lerp_log(pts, a):
    # pts ordinati: interpolazione logaritmica fra i due anni noti piu' vicini
    ks = sorted(pts)
    if a <= ks[0]: return pts[ks[0]]
    if a >= ks[-1]: return pts[ks[-1]]
    for i in range(len(ks) - 1):
        if ks[i] <= a <= ks[i + 1]:
            t = (a - ks[i]) / (ks[i + 1] - ks[i])
            p0, p1 = max(pts[ks[i]], 1), max(pts[ks[i + 1]], 1)
            return math.exp(math.log(p0) * (1 - t) + math.log(p1) * t)

serie, origine = [], []
for nome, lon, lat, ab in citta:
    pts = {}
    w = trova(wcp, nome, lon, lat, ab, 20)
    b = trova(buringh, nome, lon, lat, ab, 15)
    r = trova(reba, nome, lon, lat, ab, 15)
    if w and b and stessoNome(b, nome) and not stessoNome(w, nome): w = None
    if w:
        pts = {a: p for a, p in w[3].items() if a <= 2000}
        ult = max(pts)
        if ult > 1850:  # dopo il 1850 la serie si avvicina piano piano agli abitanti di oggi
            for a in [a for a in pts if a > 1850]:
                pts[a] *= (ab / pts[ult]) ** (((a - 1850) / (ult - 1850)) ** 2)
        primo = min(a for a in pts if a >= 0) if any(a >= 0 for a in pts) else 2000
        if b:  # prima del primo dato di worldcitypop, i secoli di Buringh
            for a, p in b[3].items():
                if a < primo and a <= 1850: pts[a] = p
        origine.append('wcp')
    elif b:
        b2000 = b[3].get(2000, 0)
        for a, p in b[3].items():
            if a <= 1850: pts[a] = p
            elif b2000 > 0:  # dal 1900 la citta' amministrativa cresce verso l'agglomerato di oggi
                peso = ((a - 1850) / (OGGI - 1850)) ** 2
                pts[a] = p * (ab / b2000) ** peso
        origine.append('buringh')
    elif r:
        pts = {a: p for a, p in r[3].items() if a <= 2000}
        origine.append('reba')
    else:
        origine.append('stima')
    pts = {a: p for a, p in pts.items() if a >= 0}
    pts[OGGI] = ab
    serie.append(pts)

# le citta' con dati gia' dal 1000 (o prima): l'andamento della zona
complete = [i for i, s in enumerate(serie) if origine[i] != 'stima' and min(s) <= 1000]
def andamento(i):
    _, lon, lat, _ = citta[i]
    vic = sorted(complete, key=lambda j: km(lon, lat, citta[j][1], citta[j][2]))[:11]
    vic = [j for j in vic if j != i][:10]
    return {a: statistics.median(lerp_log(serie[j], a) / citta[j][3] for j in vic) for a in ANNI + [OGGI]}

tabella = []
for i, (nome, lon, lat, ab) in enumerate(citta):
    s = serie[i]
    noti = [a for a in s if a != OGGI]
    vals = []
    if not noti:  # nessun dato: come le citta' vicine
        z = andamento(i)
        vals = [ab * z[a] for a in ANNI]
    else:
        primo = min(noti)
        z = andamento(i) if primo > ANNI[0] else None
        for a in ANNI:
            if a >= primo: vals.append(lerp_log(s, a))
            else:  # prima del primo dato: segue la zona, mai sopra il primo dato
                p0 = lerp_log(s, primo)
                zp = lerp_log(z, primo)
                vals.append(min(p0, max(p0 / 10, p0 * z[a] / zp)) if zp > 0 else p0)
    tabella.append([max(MINIMO, v) for v in vals])

def cento(v):  # in centinaia di abitanti, due o tre cifre significative
    c = v / 100
    if c >= 1000: c = round(c, -int(math.log10(c)) + 2)
    return int(round(c))

# per nome (se un nome si ripete vale il primo, il piu' popoloso, come nel gioco): cosi' la
# lista resta giusta anche se CITTA_REALI cresce o cambia ordine
voci, visti = [], set()
for (nome, *_), t in zip(citta, tabella):
    if nome in visti: continue
    visti.add(nome)
    voci.append(json.dumps(nome, ensure_ascii=False) + ':"' + ' '.join(str(cento(v)) for v in t) + '"')
righe = ['  ' + ','.join(voci[i:i + 4]) for i in range(0, len(voci), 4)]
blocco = ('// POP_STORICA_INIZIO (scritto da build_popolazione_storica.py)\n'
          f'const POP_ANNI = {json.dumps(ANNI)};\n'
          'const POP_STORICA = {\n' + ',\n'.join(righe) + '\n};\n// POP_STORICA_FINE')
if '// POP_STORICA_INIZIO' in html:
    html = re.sub(r'// POP_STORICA_INIZIO[\s\S]*?// POP_STORICA_FINE', lambda m: blocco, html)
else:
    html = html.replace('// CITTA_REALI_FINE', '// CITTA_REALI_FINE\n' + blocco, 1)
open(HTML, 'w', encoding='utf8').write(html)
from collections import Counter
print('citta', len(citta), Counter(origine))
for nome in ['Roma', 'Parigi', 'Londra', 'Istanbul', 'Mosca', 'Il Cairo', 'Milano', 'Venezia', 'Napoli', 'Madrid', 'Berlino', 'Vienna', 'Cordova', 'Ankara', 'Algeri', 'Tunisi', 'Napoli', 'Siviglia', 'Granada', 'Firenze', 'Genova', 'Lisbona', 'Atene', 'Kiev', 'Damasco', 'Baghdad', 'Tbilisi']:
    for i, c in enumerate(citta):
        if c[0] == nome:
            print(f'{nome:12s} {origine[i]:8s}', ' '.join(f'{a}:{int(v/1000)}k' for a, v in zip(ANNI, tabella[i])), f'oggi:{c[3]//1000}k')
