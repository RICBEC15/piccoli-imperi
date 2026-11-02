# Costruisce Madeira e Porto Santo (Portogallo) per Piccoli Imperi.
# Scrive nel gioco "const POLY_MADEIRA = ..." (il contorno di Madeira) e "const SEMI_MADEIRA = ..."
# (Porto Santo, troppo piccola per un poligono: un seme, come le altre isolette).
#
# Fonte: Natural Earth 10m admin 0 (pubblico dominio). Il 50m, usato per gli altri confini, non ha
# Porto Santo e disegna Madeira con soli 12 punti:
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
# uso: python3 build_madeira.py ne_10m_admin_0_countries.geojson piccoli_imperi.html
#   poi i biomi (build_biomi_est.py, vedi LEGGIMI in testa) e node build_mappe.js
# Dipendenze: pip install shapely
import sys, re, json
from shapely.geometry import shape, box

ARCIPELAGO = box(-17.5, 32.3, -16.0, 33.3)
TOLL = 0.02          # semplificazione: ~2 km, come gli altri confini
MIN_POLY = 0.01      # sotto quest'area (gradi^2) un'isola diventa un seme
MIN_SEME = 0.004     # sotto questa e' troppo piccola anche per un seme (le Desertas)

def main(geojson, html):
    src = open(html, encoding='utf-8').read()
    pt = next(f for f in json.load(open(geojson))['features'] if f['properties']['ADM0_A3'] == 'PRT')
    g = shape(pt['geometry']).buffer(0).intersection(ARCIPELAGO)
    rings, semi = [], []
    for p in sorted(getattr(g, 'geoms', [g]), key=lambda p: -p.area):
        if p.area >= MIN_POLY:
            q = p.simplify(TOLL, preserve_topology=True)
            rings.append([[round(x, 3), round(y, 3)] for x, y in q.exterior.coords])
        elif p.area >= MIN_SEME:
            c = p.representative_point()
            semi.append(['PT', round(c.x, 3), round(c.y, 3)])
    print(len(rings), 'poligoni,', sum(len(r) for r in rings), 'punti;', len(semi), 'semi', file=sys.stderr)
    righe = {'POLY_MADEIRA': json.dumps({'PT': rings}, separators=(',', ':')),
             'SEMI_MADEIRA': json.dumps(semi, separators=(',', ':'))}
    for nome, val in righe.items():
        riga = f'const {nome} = {val};'
        pat = re.compile(rf'^const {nome} = .*;$', re.M)
        if pat.search(src): src = pat.sub(lambda m: riga, src)
        else: src = re.sub(r'^(const SEMI_EST = .*;)$', lambda m: m.group(1) + '\n' + riga, src, count=1, flags=re.M)
    open(html, 'w', encoding='utf-8').write(src)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
