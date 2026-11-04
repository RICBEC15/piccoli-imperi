# Costruisce i confini dell'Africa sotto il vecchio margine della mappa (v89): la mappa si allunga a sud
# da 11,5° N fino al Capo Agulhas (35° S), con il Madagascar e le isole dell'oceano Indiano.
# Scrive nel gioco "const POLY_AFRICA = ...", "const SEMI_AFRICA = ..." e "const LAGHI_AFRICA = ..."
# (i laghi tutti dentro un paese, che nei confini sono buchi: il gioco li fa diventare acqua).
#
# Fonte: Natural Earth 50m admin 0 "con i laghi" (pubblico dominio): i grandi laghi africani
# (Vittoria, Tanganica, Malawi, Turkana...) sono gia' bucati nei confini, quindi restano acqua.
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries_lakes.geojson
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson
# uso: python3 -B build_paesi_africa.py ne_50m_admin_0_countries_lakes.geojson ne_50m_lakes.geojson piccoli_imperi.html
# Dipendenze: pip install shapely
import sys, re, json
from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.ops import unary_union

# codice del gioco -> codici ADM0_A3 di Natural Earth: i paesi nuovi
NUOVI = {
    # l'Africa occidentale e il golfo di Guinea
    'SL': ['SLE'], 'LR': ['LBR'], 'CI': ['CIV'], 'GH': ['GHA'], 'TG': ['TGO'],
    'GQ': ['GNQ'], 'ST': ['STP'], 'GA': ['GAB'],
    # l'Africa centrale
    'CF': ['CAF'], 'CG': ['COG'], 'CD': ['COD'],
    # l'Africa orientale
    'UG': ['UGA'], 'KE': ['KEN'], 'RW': ['RWA'], 'BI': ['BDI'], 'TZ': ['TZA'],
    # l'Africa australe
    'AO': ['AGO'], 'ZM': ['ZMB'], 'MW': ['MWI'], 'MZ': ['MOZ'], 'ZW': ['ZWE'], 'NA': ['NAM'],
    'BW': ['BWA'], 'LS': ['LSO'], 'SZ': ['SWZ'], 'ZA': ['ZAF'],   # il Lesotho prima: e' un buco dentro il Sudafrica
    # l'oceano Indiano
    'MG': ['MDG'], 'KM': ['COM'], 'MU': ['MUS'], 'SC': ['SYC'],
}
# i paesi gia' in gioco che continuano sotto gli 11,5°: solo la loro parte a sud (il resto e' in POLY_EST),
# e le isole lontane di Francia (Riunione, Mayotte) e Regno Unito (Sant'Elena, Ascensione)
VECCHI = {
    'SD': ['SDN'], 'SS': ['SDS'], 'ET': ['ETH'], 'SO': ['SOM', 'SOL'], 'DJ': ['DJI'], 'GW': ['GNB'],
    'GN': ['GIN'], 'ML': ['MLI'], 'BF': ['BFA'], 'NG': ['NGA'], 'CM': ['CMR'], 'BJ': ['BEN'], 'TD': ['TCD'],
    'FR': ['FRA'], 'UK': ['SHN'],
}
NORD = 11.45         # appena sopra il vecchio margine di POLY_EST (11,4): nessun buco fra i due
SUD, OVEST, EST = -35.5, -26.0, 63.6
RECT = box(OVEST, SUD, EST, NORD)
TOLL = 0.02          # semplificazione: ~2 km, come gli altri confini
MIN_POLY = 0.01      # sotto quest'area (gradi^2) un'isola diventa un seme
MIN_SEME = 0.003     # sotto questa e' troppo piccola anche per un seme

def parti(g):
    if isinstance(g, MultiPolygon): return list(g.geoms)
    if isinstance(g, Polygon): return [g] if not g.is_empty else []
    if hasattr(g, 'geoms'): return [p for x in g.geoms for p in parti(x)]
    return []

def main(geojson, laghi_geojson, html):
    src = open(html, encoding='utf-8').read()
    ne = {f['properties']['ADM0_A3']: shape(f['geometry']) for f in json.load(open(geojson))['features']}
    poly, semi, laghi = {}, [], []
    lavoro = [(cc, cod, True) for cc, cod in NUOVI.items()] + [(cc, cod, False) for cc, cod in VECCHI.items()]
    for cc, codici, nuovo in lavoro:
        g = unary_union([ne[a].buffer(0) for a in codici]).intersection(RECT)
        rings = []
        for p in parti(g):
            q = p.simplify(TOLL, preserve_topology=True)
            if p.area >= MIN_POLY and q.area > 0:
                # i laghi dentro un paese (il Vittoria e' diviso fra tre, ma ce ne sono di interni): buchi
                rings.append([[round(x, 3), round(y, 3)] for x, y in q.exterior.coords[:-1]])
                # (i buchi si ignorano: sono paesi dentro il paese, come il Lesotho nel Sudafrica; i laghi
                # interni vengono da ne_50m_lakes, qui sotto)
            elif p.area >= MIN_SEME:
                c = p.representative_point()
                semi.append([cc, round(c.x, 3), round(c.y, 3)])
        if rings: poly[cc] = rings
        # ogni paese nuovo ha almeno un seme sulla sua parte piu' grande: c'e' a ogni risoluzione
        if nuovo and parti(g):
            c = max(parti(g), key=lambda p: p.area).representative_point()
            semi.append([cc, round(c.x, 3), round(c.y, 3)])
        print(cc, len(rings), 'anelli,', sum(len(r) for r in rings), 'punti, area', round(g.area, 2), file=sys.stderr)
    # i laghi che i confini "con i laghi" non bucano (il Volta, il Turkana, il Mweru, il Kyoga...): diventano acqua
    for f in json.load(open(laghi_geojson))['features']:
        g = shape(f['geometry']).buffer(0).intersection(RECT)
        for p in parti(g):
            if p.area < 0.05: continue
            q = p.simplify(TOLL, preserve_topology=True)
            laghi.append([[round(x, 3), round(y, 3)] for x, y in q.exterior.coords[:-1]])
            print('lago', f['properties'].get('name'), round(p.area, 2), file=sys.stderr)
    righe = ('const POLY_AFRICA = ' + json.dumps(poly, separators=(',', ':')) + ';\n'
             'const SEMI_AFRICA = ' + json.dumps(semi, separators=(',', ':')) + ';\n'
             'const LAGHI_AFRICA = ' + json.dumps(laghi, separators=(',', ':')) + ';')
    if re.search(r'^const POLY_AFRICA = .*;$', src, re.M):
        src = re.sub(r'^const POLY_AFRICA = .*;\nconst SEMI_AFRICA = .*;\nconst LAGHI_AFRICA = .*;$', lambda _: righe, src, count=1, flags=re.M)
    else:
        src = src.replace('\nconst SEMI_MADEIRA = ', '\n' + righe + '\nconst SEMI_MADEIRA = ', 1)
    open(html, 'w', encoding='utf-8').write(src)
    print(len(semi), 'semi,', len(laghi), 'laghi interni', file=sys.stderr)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
