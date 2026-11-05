# Costruisce i confini dell'Asia oltre il vecchio margine della mappa (v90): la mappa si allarga a est
# dall'Iran (63,5° E) fino allo stretto di Bering (190,5° E, cioe' 169,5° O: la Cukotka intera) e sale a
# nord da Capo Nord (71,3°) fino al Tajmyr (78°). L'Oceania (Australia, Nuova Guinea orientale, Nuova
# Zelanda, isole del Pacifico) per ora resta mare: la cornice le lascia il posto.
# Scrive nel gioco "const POLY_ASIA = ...", "const SEMI_ASIA = ..." e "const LAGHI_ASIA = ...".
#
# Fonte: Natural Earth 50m admin 0 "con i laghi" (pubblico dominio) e i laghi 50m:
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries_lakes.geojson
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson
# uso: python3 -B build_paesi_asia.py ne_50m_admin_0_countries_lakes.geojson ne_50m_lakes.geojson piccoli_imperi.html
# Dipendenze: pip install shapely
import sys, re, json
from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.affinity import translate

# codice del gioco -> codici ADM0_A3 di Natural Earth: i paesi nuovi
NUOVI = {
    # l'Asia orientale
    'CN': ['CHN', 'HKG', 'MAC'], 'MN': ['MNG'], 'KP': ['PRK'], 'KR': ['KOR'], 'JP': ['JPN'], 'TW': ['TWN'],
    # l'Asia centrale
    'KG': ['KGZ'], 'TJ': ['TJK'],
    # il subcontinente indiano
    'IN': ['IND', 'KAS'], 'NP': ['NPL'], 'BT': ['BTN'], 'BD': ['BGD'], 'LK': ['LKA'], 'MV': ['MDV'],
    # il sud-est asiatico
    'MM': ['MMR'], 'TH': ['THA'], 'LA': ['LAO'], 'KH': ['KHM'], 'VN': ['VNM'], 'MY': ['MYS'], 'SG': ['SGP'],
    'BN': ['BRN'], 'ID': ['IDN'], 'TL': ['TLS'], 'PH': ['PHL'],
}
# i paesi gia' in gioco che continuano oltre il vecchio margine (solo la parte nuova), e l'arcipelago
# delle Chagos (Regno Unito) in mezzo all'oceano Indiano
VECCHI = {
    'RU': ['RUS'], 'KZ': ['KAZ'], 'UZ': ['UZB'], 'TM': ['TKM'], 'AF': ['AFG'], 'PK': ['PAK'], 'IR': ['IRN'],
    'UK': ['IOT'],
}
EST_VECCHIO, NORD_VECCHIO = 63.55, 71.35  # appena dentro i vecchi margini (POLY_EST arriva a 63,6 e 71,4)
OVEST, EST, SUD, NORD = -26.0, 190.5, -47.5, 78.0
# la parte nuova: a est del vecchio margine, o a nord di Capo Nord (la Novaja Zemlja)
NUOVA = box(EST_VECCHIO, SUD, EST, NORD).union(box(OVEST, NORD_VECCHIO, EST_VECCHIO + 0.1, NORD))
TOLL = 0.02          # semplificazione: ~2 km, come gli altri confini
MIN_POLY = 0.01      # sotto quest'area (gradi^2) un'isola diventa un seme
MIN_SEME = 0.003     # sotto questa e' troppo piccola anche per un seme

def parti(g):
    if isinstance(g, MultiPolygon): return list(g.geoms)
    if isinstance(g, Polygon): return [g] if not g.is_empty else []
    if hasattr(g, 'geoms'): return [p for x in g.geoms for p in parti(x)]
    return []

def oltre180(g):
    """i pezzi a ovest dell'antimeridiano (la punta della Cukotka, l'isola di Wrangel) vanno a destra di 180°"""
    return unary_union([translate(p, 360, 0) if p.bounds[2] < -150 else p for p in parti(g)])

def main(geojson, laghi_geojson, html):
    src = open(html, encoding='utf-8').read()
    ne = {f['properties']['ADM0_A3']: shape(f['geometry']) for f in json.load(open(geojson))['features']}
    poly, semi, laghi = {}, [], []
    asia = []  # le terre dei paesi in gioco: i laghi dell'Australia (l'Eyre...) restano fuori con l'Oceania
    lavoro = [(cc, cod, True) for cc, cod in NUOVI.items()] + [(cc, cod, False) for cc, cod in VECCHI.items()]
    for cc, codici, nuovo in lavoro:
        g = oltre180(unary_union([ne[a].buffer(0) for a in codici])).intersection(NUOVA)
        asia.append(g)
        rings = []
        for p in parti(g):
            q = p.simplify(TOLL, preserve_topology=True)
            if p.area >= MIN_POLY and q.area > 0:
                # (i buchi si ignorano: i laghi interni vengono da ne_50m_lakes, qui sotto)
                rings.append([[round(x, 3), round(y, 3)] for x, y in q.exterior.coords[:-1]])
            elif p.area >= MIN_SEME:
                c = p.representative_point()
                semi.append([cc, round(c.x, 3), round(c.y, 3)])
        if rings: poly[cc] = rings
        # ogni paese nuovo ha almeno un seme sulla sua parte piu' grande: c'e' a ogni risoluzione
        if nuovo and parti(g):
            c = max(parti(g), key=lambda p: p.area).representative_point()
            semi.append([cc, round(c.x, 3), round(c.y, 3)])
        # e le isolette piu' piccole delle Maldive: un seme ciascuna, sono il paese intero
        if cc == 'MV':
            for p in parti(g):
                c = p.representative_point(); semi.append([cc, round(c.x, 3), round(c.y, 3)])
        print(cc, len(rings), 'anelli,', sum(len(r) for r in rings), 'punti, area', round(g.area, 2), file=sys.stderr)
    # i laghi (il Bajkal, il Balkhash, l'Issyk-Kul, il Qinghai, il Tonle Sap...): diventano acqua
    asia = unary_union(asia).buffer(0.1)
    for f in json.load(open(laghi_geojson))['features']:
        g = oltre180(shape(f['geometry']).buffer(0)).intersection(NUOVA)
        for p in parti(g):
            if p.area < 0.05 or not asia.contains(p.representative_point()): continue
            q = p.simplify(TOLL, preserve_topology=True)
            anello = [[round(x, 3), round(y, 3)] for x, y in q.exterior.coords[:-1]]
            if anello in laghi: continue  # (lo Zaysan e' due volte nei dati)
            laghi.append(anello)
            print('lago', f['properties'].get('name'), round(p.area, 2), file=sys.stderr)
    semi = [s for i, s in enumerate(semi) if s not in semi[:i]]
    righe = ('const POLY_ASIA = ' + json.dumps(poly, separators=(',', ':')) + ';\n'
             'const SEMI_ASIA = ' + json.dumps(semi, separators=(',', ':')) + ';\n'
             'const LAGHI_ASIA = ' + json.dumps(laghi, separators=(',', ':')) + ';')
    if re.search(r'^const POLY_ASIA = .*;$', src, re.M):
        src = re.sub(r'^const POLY_ASIA = .*;\nconst SEMI_ASIA = .*;\nconst LAGHI_ASIA = .*;$', lambda _: righe, src, count=1, flags=re.M)
    else:
        src = src.replace('\nconst SEMI_MADEIRA = ', '\n' + righe + '\nconst SEMI_MADEIRA = ', 1)
    open(html, 'w', encoding='utf-8').write(src)
    print(len(semi), 'semi,', len(laghi), 'laghi', file=sys.stderr)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
