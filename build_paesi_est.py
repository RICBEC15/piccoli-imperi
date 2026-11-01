# Costruisce i confini del Medio Oriente e delle terre intorno (v83): la mappa si allarga a sud
# fino a 11,5° N (lo Yemen, il Sahel) e a est fino a 63,5° E (l'Iran, l'Asia centrale).
# Scrive nel gioco "const POLY_EST = ..." e "const SEMI_EST = ...".
#
# Fonte: Natural Earth 50m admin 0 (pubblico dominio), la stessa degli altri confini:
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
# uso: python3 build_paesi_est.py ne_50m_admin_0_countries.geojson piccoli_imperi.html
# Dipendenze: pip install shapely
import sys, re, json
from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.ops import unary_union

# codice del gioco -> codici ADM0_A3 di Natural Earth
NUOVI = {
    # il Medio Oriente
    'SY': ['SYR'], 'LB': ['LBN'], 'IL': ['ISR'], 'PS': ['PSX'], 'JO': ['JOR'], 'IQ': ['IRQ'],
    'IR': ['IRN'], 'KW': ['KWT'], 'SA': ['SAU'], 'BH': ['BHR'], 'QA': ['QAT'], 'AE': ['ARE'],
    'OM': ['OMN'], 'YE': ['YEM'],
    # l'Africa sotto il vecchio margine: il Sahara e il Sahel
    'MR': ['MRT'], 'ML': ['MLI'], 'NE': ['NER'], 'TD': ['TCD'], 'SD': ['SDN'], 'SS': ['SDS'],
    'ER': ['ERI'], 'ET': ['ETH'], 'DJ': ['DJI'], 'SO': ['SOM', 'SOL'], 'SN': ['SEN'], 'GM': ['GMB'],
    'GW': ['GNB'], 'GN': ['GIN'], 'BF': ['BFA'], 'NG': ['NGA'], 'CM': ['CMR'], 'BJ': ['BEN'], 'CV': ['CPV'],
    # l'Asia centrale oltre il vecchio margine est
    'TM': ['TKM'], 'UZ': ['UZB'], 'AF': ['AFG'], 'PK': ['PAK'],
}
# i paesi gia' in gioco che continuano nelle terre nuove: solo la parte FUORI dal loro vecchio ritaglio
VECCHI = {
    'MA': (['MAR', 'SAH'], box(-30, 27.0, 70, 80)),     # il Sahara occidentale, come prima
    'DZ': (['DZA'], box(-30, 27.0, 70, 80)),
    'LY': (['LBY'], box(-30, 27.0, 70, 80)),
    'EG': (['EGY'], box(-30, 27.0, 35.0, 80)),
    'RU': (['RUS'], box(-30, 0, 61.2, 80)),
    'KZ': (['KAZ'], box(-30, 0, 61.2, 80)),
}
SUD, EST = 11.5, 63.5
RECT = box(-24.8, SUD - 0.1, EST + 0.1, 71.4)
TOLL = 0.02          # semplificazione: ~2 km, come gli altri confini
MIN_POLY = 0.01      # sotto quest'area (gradi^2) un'isola diventa un seme
MIN_SEME = 0.004     # sotto questa e' troppo piccola anche per un seme
MIN_PAESE = 0.05     # un paese che entra nella mappa con meno di cosi' resta fuori

def parti(g):
    if isinstance(g, MultiPolygon): return list(g.geoms)
    if isinstance(g, Polygon): return [g] if not g.is_empty else []
    if hasattr(g, 'geoms'): return [p for x in g.geoms for p in parti(x)]
    return []

def main(geojson, html):
    src = open(html, encoding='utf-8').read()
    ne = {f['properties']['ADM0_A3']: shape(f['geometry']) for f in json.load(open(geojson))['features']}
    poly, semi = {}, []
    lavoro = [(cc, cod, None) for cc, cod in NUOVI.items()] + [(cc, cod, via) for cc, (cod, via) in VECCHI.items()]
    for cc, codici, via in lavoro:
        g = unary_union([ne[a].buffer(0) for a in codici]).intersection(RECT)
        if via is not None: g = g.difference(via)
        if g.area < MIN_PAESE and cc not in ('BH', 'CV'):
            print(cc, 'fuori: solo', round(g.area, 3), 'gradi quadri', file=sys.stderr); continue
        rings = []
        for p in parti(g):
            q = p.simplify(TOLL, preserve_topology=True)
            if p.area >= MIN_POLY and q.area > 0:
                rings.append([[round(x, 3), round(y, 3)] for x, y in q.exterior.coords[:-1]])
            elif p.area >= MIN_SEME or (not rings and cc == 'BH'):
                c = p.representative_point()
                semi.append([cc, round(c.x, 3), round(c.y, 3)])
        if rings: poly[cc] = rings
        # ogni paese nuovo ha almeno un seme sulla sua parte piu' grande: c'e' a ogni risoluzione
        if via is None and parti(g):
            c = max(parti(g), key=lambda p: p.area).representative_point()
            semi.append([cc, round(c.x, 3), round(c.y, 3)])
        print(cc, len(rings), 'anelli,', sum(len(r) for r in rings), 'punti, area', round(g.area, 2), file=sys.stderr)
    righe = ('const POLY_EST = ' + json.dumps(poly, separators=(',', ':')) + ';\n'
             'const SEMI_EST = ' + json.dumps(semi, separators=(',', ':')) + ';')
    if re.search(r'^const POLY_EST = .*;$', src, re.M):
        src = re.sub(r'^const POLY_EST = .*;\nconst SEMI_EST = .*;$', lambda _: righe, src, count=1, flags=re.M)
    else:
        src = src.replace('\nconst NUOVI_SEMI = ', '\n' + righe + '\nconst NUOVI_SEMI = ', 1)
    open(html, 'w', encoding='utf-8').write(src)
    print(len(semi), 'semi', file=sys.stderr)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
