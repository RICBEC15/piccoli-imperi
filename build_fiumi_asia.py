# v90: i grandi fiumi dell'Asia nei percorsi veri, da Natural Earth 50m "rivers + lake centerlines"
# (pubblico dominio). Scrive le righe da mettere in FIUMI_ITALIA (fra FIUMI_ASIA_INIZIO e FIUMI_ASIA_FINE).
# Ogni fiume unisce i tratti con i suoi nomi (lo Yangtze e' Tuotuo, Tongtian, Jinsha, Chang Jiang),
# si semplifica a ~0,25° e finisce alla foce (o alla confluenza): l'ultimo punto e' quello piu' vicino
# a "foce". Solo a est del vecchio margine (63,6° E): i fiumi di prima non cambiano.
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson
# uso: python3 -B build_fiumi_asia.py ne_50m_rivers_lake_centerlines.geojson piccoli_imperi.html
import sys, re, json, math
from shapely.geometry import shape, box, LineString, MultiLineString
from shapely.ops import linemerge, unary_union

# nome italiano, nomi in Natural Earth, foce o confluenza (lon, lat), sfocia nel mare?
FIUMI = [
    ('lo Yangtze', ['Tuotuo', 'Tongtian', 'Jinsha', 'Yangtze', 'Chang Jiang'], (121.5, 31.6), True),
    ('il Fiume Giallo', ['Huang'], (119.0, 37.7), True),
    ('il Fiume delle Perle', ['Xi', 'Xun', 'Hongshui', 'Nanpan'], (113.5, 22.5), True),
    ('il Mekong', ['Za', 'Lancang', 'Mekong'], (106.6, 9.8), True),
    ('il Fiume Rosso', ['Hong'], (106.6, 20.3), True),
    ('il Salween', ['Nu', 'Salween'], (97.6, 16.5), True),
    ("l'Irrawaddy", ['Nmai', 'Ayeyarwady'], (95.3, 16.0), True),
    ('il Brahmaputra', ['Maquan', 'Yarlung', 'Dihang', 'Brahmaputra'], (90.6, 23.8), False),
    ('il Gange', ['Ganges'], (90.6, 22.3), True),
    ('lo Yamuna', ['Yamuna'], (81.9, 25.4), False),
    ("l'Indo", ['Shiquan', 'Indus'], (67.5, 24.0), True),
    ('il Sutlej', ['Sutlej'], (71.0, 29.3), False),
    ('il Godavari', ['Godävari'], (82.3, 16.6), True),
    ('il Krishna', ['Krishna'], (81.1, 15.8), True),
    ('il Narmada', ['Narmada'], (72.7, 21.6), True),
    ('il Mahanadi', ['Mahäna Nadï'], (86.6, 20.3), True),
    ("l'Amur", ['Argun’', 'Heilong Jiang', 'Amur'], (140.7, 53.0), True),
    ('il Sungari', ['Songhua'], (132.5, 47.7), False),
    ('il Liao', ['Liao', 'Xiliao', 'Xar Moron'], (122.0, 40.9), True),
    ('la Lena', ['Lena'], (127.0, 72.4), True),
    ("l'Aldan", ['Aldan'], (129.4, 63.4), False),
    ('il Viljuj', ['Vilyuy'], (121.3, 64.4), False),
    ("l'Enisej", ['Malyy Yenisey', 'Kyzyl-Khem', 'Verkhniy Yenisey', 'Yenisey'], (82.6, 71.4), True),
    ("l'Angara", ['Angara'], (92.4, 58.1), False),
    ('la Tunguska Inferiore', ['Lower Tunguska'], (87.9, 65.8), False),
    ("l'Ob", ['Biya', 'Ob'], (72.5, 66.6), True),
    ("l'Irtyš", ['Ertix', 'Ertis', 'Irtysh'], (69.0, 61.1), False),
    ('il Tobol', ['Tobol'], (68.2, 58.2), False),
    ('il Tom', ['Tom’'], (84.6, 56.8), False),
    ('il Taz', ['Taz'], (78.6, 67.4), True),
    ('la Kolyma', ['Kolyma'], (161.0, 69.4), True),
    ("l'Indigirka", ['Indigirka'], (149.5, 70.9), True),
    ("l'Olenëk", ['Olenëk'], (120.0, 73.0), True),
    ('la Chatanga', ['Kheta', 'Khatanga'], (102.5, 72.8), True),
    ("l'Anadyr", ['Anadyr’'], (176.5, 64.7), True),
    ('la Selenga', ['Selenge (Selenga)', 'Ideriyn'], (106.3, 52.2), False),
    ('il Syr Darya', ['Naryn', 'Syr Darya'], (63.6, 45.0), False),
    ("l'Amu Darya (Panj)", ['Pamir', 'Panj', 'Amu  Darya'], (63.6, 39.3), False),
    ('il Tarim', ['Yarkant', 'Tarim'], (87.8, 40.5), False),
    ('il Kapuas (Borneo)', ['Kapuas'], (109.2, -0.1), True),
]
# il Chao Phraya non e' nei dati 50m: a mano
A_MANO = [('il Chao Phraya', [[99.15, 15.7], [100.1, 15.7], [100.2, 14.9], [100.5, 14.0], [100.55, 13.55]], True)]
# i delta senza nome nei dati: il tratto fino al mare, a mano
CODE = {'il Mekong': [[105.4, 10.9], [106.0, 10.3], [106.6, 9.8]],
        'il Gange': [[88.6, 24.1], [89.7, 23.6], [90.4, 23.0], [90.6, 22.3]],      # la Padma e la Meghna
        'il Syr Darya': [[62.6, 45.9], [61.9, 46.1], [61.3, 46.2]]}               # fino al lago d'Aral
MARGINE = box(63.6, -12, 190.5, 78)
TOLL = 0.25

def linee(g):
    if isinstance(g, LineString): return [g]
    if hasattr(g, 'geoms'): return [x for y in g.geoms for x in linee(y)]
    return []

def main(src, html):
    fs = json.load(open(src))['features']
    out = []
    for nome, nomi, foce, mare in FIUMI:
        tratti = [shape(f['geometry']) for f in fs if f['properties'].get('name') in nomi]
        u = unary_union(tratti)
        g = (linemerge(u) if not isinstance(u, LineString) else u).intersection(MARGINE)
        parti = sorted(linee(g), key=lambda l: -l.length)
        # il tratto piu' lungo, poi si attaccano gli altri ai capi (i buchi fra i tratti dei dati)
        catena = list(parti[0].coords)
        resto = parti[1:]
        while resto:
            best = None
            for i, l in enumerate(resto):
                c = list(l.coords)
                for cand, (a, b) in ((c, (catena[-1], c[0])), (c[::-1], (catena[-1], c[-1])),
                                      (c, (catena[0], c[-1])), (c[::-1], (catena[0], c[0]))):
                    d = math.dist(a, b)
                    if best is None or d < best[0]: best = (d, i, cand, a is catena[0])
            d, i, cand, davanti = best
            if d > 1.5 or resto[i].length < 0.5: resto.pop(i); continue
            catena = (cand + catena) if davanti else (catena + cand)
            resto.pop(i)
        if math.dist(catena[0], foce) < math.dist(catena[-1], foce): catena = catena[::-1]
        pts = [[round(x, 2), round(y, 2)] for x, y in LineString(catena).simplify(TOLL).coords]
        pts += CODE.get(nome, [])
        out.append((nome, pts, mare))
        print(nome, len(pts), 'punti, da', pts[0], 'a', pts[-1], file=sys.stderr)
    out += A_MANO
    righe = ['  // FIUMI_ASIA_INIZIO (v90, build_fiumi_asia.py)']
    for i, (nome, pts, mare) in enumerate(out):
        sep = ',' if i < len(out) - 1 else ''
        righe.append('  { pts: ' + json.dumps(pts, separators=(',', ':')) + ', toSea: ' + ('true' if mare else 'false') + ' }' + sep + ' // ' + nome)
    righe.append('  // FIUMI_ASIA_FINE')
    blocco = '\n'.join(righe)
    s = open(html, encoding='utf-8').read()
    if 'FIUMI_ASIA_INIZIO' in s:
        s = re.sub(r'  // FIUMI_ASIA_INIZIO.*?// FIUMI_ASIA_FINE', lambda _: blocco, s, count=1, flags=re.S)
    else:
        a = "{ pts: [[41.0,7.5],[42.3,6.6],[43.55,5.95],[44.6,5.3],[45.2,4.74],[45.5,3.2],[45.3,2.4],[44.5,1.8],[43.5,1.1]], toSea: false } // lo Uebi Scebeli\n"
        assert s.count(a) == 1
        s = s.replace(a, a.replace('toSea: false } //', 'toSea: false }, //') + blocco + '\n')
    open(html, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
