# Costruisce i confini dei paesi europei aggiunti per ultimi (v65: Polonia, Scandinavia,
# Baltici, Bielorussia, Islanda, Caucaso, i microstati...) e li scrive nel gioco come
# "const POLY_NORD = ..." e "const SEMI_NORD = ...".
#
# Fonte: Natural Earth 50m admin 0 (pubblico dominio), la stessa dei confini gia' presenti:
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
# uso: python3 build_paesi_nord.py ne_50m_admin_0_countries.geojson piccoli_imperi.html
# Dipendenze: pip install shapely
import sys, re, json
from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.ops import unary_union

# codice del gioco -> codici ADM0_A3 di Natural Earth (le Faer Oer vanno alla Danimarca)
PAESI = {
    'PL': ['POL'], 'CZ': ['CZE'], 'SK': ['SVK'], 'DK': ['DNK', 'FRO'], 'SE': ['SWE'], 'NO': ['NOR'],
    'FI': ['FIN'], 'EE': ['EST'], 'LV': ['LVA'], 'LT': ['LTU'], 'BY': ['BLR'], 'IS': ['ISL'],
    'MT': ['MLT'], 'AM': ['ARM'], 'AZ': ['AZE'], 'KZ': ['KAZ'], 'RU': ['RUS'],
}
# San Marino e il Vaticano sono piu' piccoli di una casella: li fa il gioco (MICROSTATI)
RECT = box(-24.8, 27.0, 61.2, 71.4)   # il rettangolo della mappa, Islanda e Capo Nord compresi
TOLL = 0.02                           # semplificazione: ~2 km, come gli altri confini
MIN_POLY = 0.01                       # sotto quest'area (gradi^2) un'isola diventa un seme
MIN_SEME = 0.004                      # sotto questa e' troppo piccola anche per un seme

def parti(g):
    return list(g.geoms) if isinstance(g, MultiPolygon) else [g] if isinstance(g, Polygon) else []

def main(geojson, html):
    src = open(html, encoding='utf-8').read()
    ru = Polygon(json.loads(re.search(r'^const RU_POLY = (.*?);$', src, re.M).group(1)))
    ne = {f['properties']['ADM0_A3']: shape(f['geometry']) for f in json.load(open(geojson))['features']}
    poly, semi = {}, []
    for cc, codici in PAESI.items():
        g = unary_union([ne[a] for a in codici]).intersection(RECT)
        rings = []
        for p in parti(g):
            # la Russia c'e' gia' (RU_POLY): qui solo Kaliningrad e le isole artiche
            if cc == 'RU' and (p.representative_point().y < 54 or ru.buffer(0.05).contains(p.representative_point())):
                continue
            q = p.simplify(TOLL, preserve_topology=True)
            if p.area >= MIN_POLY and q.area > 0:
                rings.append([[round(x, 3), round(y, 3)] for x, y in q.exterior.coords[:-1]])
            elif p.area >= MIN_SEME or (not rings and cc == 'MT'):
                c = p.representative_point()
                semi.append([cc, round(c.x, 3), round(c.y, 3)])
        if rings:
            poly[cc] = rings
        # ogni paese ha almeno un seme sulla sua parte piu' grande: c'e' a ogni risoluzione
        grande = max(parti(g), key=lambda p: p.area) if cc != 'RU' else None
        if grande is not None:
            c = grande.representative_point()
            semi.append([cc, round(c.x, 3), round(c.y, 3)])
        print(cc, len(rings), 'anelli,', sum(len(r) for r in rings), 'punti', file=sys.stderr)
    righe = ('const POLY_NORD = ' + json.dumps(poly, separators=(',', ':')) + ';\n'
             'const SEMI_NORD = ' + json.dumps(semi, separators=(',', ':')) + ';')
    if re.search(r'^const POLY_NORD = .*;$', src, re.M):
        src = re.sub(r'^const POLY_NORD = .*;\nconst SEMI_NORD = .*;$', lambda _: righe, src, count=1, flags=re.M)
    else:
        src = src.replace('\nconst NUOVI_SEMI = ', '\n' + righe + '\nconst NUOVI_SEMI = ', 1)
    open(html, 'w', encoding='utf-8').write(src)
    print(len(semi), 'semi', file=sys.stderr)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
