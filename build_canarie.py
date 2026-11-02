# Costruisce i contorni veri delle isole Canarie (v87): tutte e sette le isole grandi
# (Tenerife, Fuerteventura, Gran Canaria, Lanzarote, La Palma, La Gomera, El Hierro) e La Graciosa.
# Scrive nel gioco la riga "const POLY_CANARIE = ...": per ogni isola il suo anello e il suo punto
# interno (il seme: una casella di terra a ogni risoluzione, anche dove l'isola e' piu' piccola
# di una casella).
#
# Fonte: Natural Earth 10m admin 0 (pubblico dominio), il poligono della Spagna:
#   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
# Passi (dalla cartella del gioco):
#   1) python3 build_canarie.py contorni ne_10m_admin_0_countries.geojson piccoli_imperi.html
#   2) i biomi delle caselle nuove (erano mare: '.' in BIOMI), con le regole di build_biomi.py:
#        python3 build_biomi_est.py estrai DIR -18.5 -13.2 27.4 29.6         (OpenStreetMap, ~2 minuti)
#        cat stub.js game.js export_tiles.js > _run.js && OUT=tiles.json node _run.js
#        python3 build_canarie.py biomi DIR tiles.json piccoli_imperi.html
#      poi il controllo con i satelliti, solo sulle Canarie:
#        python3 correggi_biomi.py scarica SAT -18.5 -13.2 27.4 29.6
#        python3 correggi_biomi.py correggi SAT tiles.json piccoli_imperi.html -18.5 -13.2 27.4 29.6
#   3) node build_mappe.js; le citta' (build_popolazione.js, poi build_popolazione_storica.py)
#      e i confini storici (build_epoche.py, con FIUMI=1 in export_tiles.js), come dice il loro inizio.
# Dipendenze: pip install shapely (per i biomi anche pyarrow rasterio numpy scipy)
import sys, os, re, json
from shapely.geometry import shape, box, Point

BOX = box(-18.5, 27.4, -13.2, 29.6)
TOLL = 0.008  # semplificazione: meno di 1 km, le isole sono piccole
# codice dell'isola -> un punto che ci cade dentro
ISOLE = {
    'TF': (-16.6, 28.27),   # Tenerife
    'FV': (-14.0, 28.40),   # Fuerteventura
    'GC': (-15.6, 27.96),   # Gran Canaria
    'LZ': (-13.63, 29.04),  # Lanzarote
    'LP': (-17.85, 28.66),  # La Palma
    'GO': (-17.22, 28.11),  # La Gomera
    'HI': (-18.0, 27.75),   # El Hierro
    'LG': (-13.5, 29.26),   # La Graciosa
}

def main(geojson, html):
    src = open(html, encoding='utf-8').read()
    esp = next(shape(f['geometry']) for f in json.load(open(geojson))['features']
               if f['properties']['ADM0_A3'] == 'ESP')
    parti = list(esp.intersection(BOX).geoms)
    out = {}
    for cod, (lon, lat) in ISOLE.items():
        p = min(parti, key=lambda q: q.distance(Point(lon, lat)))
        assert p.distance(Point(lon, lat)) < 0.02, cod
        q = p.simplify(TOLL, preserve_topology=True)
        c = p.representative_point()
        out[cod] = {'anello': [[round(x, 3), round(y, 3)] for x, y in q.exterior.coords[:-1]],
                    'seme': [round(c.x, 3), round(c.y, 3)]}
        print(cod, len(out[cod]['anello']), 'punti, circa', round(p.area * 82.5 * 111), 'km2', file=sys.stderr)
    riga = 'const POLY_CANARIE = ' + json.dumps(out, separators=(',', ':')) + ';'
    src, n = re.subn(r'^const POLY_CANARIE = .*;$', lambda _: riga, src, count=1, flags=re.M)
    assert n == 1, 'manca la riga const POLY_CANARIE nel gioco'
    open(html, 'w', encoding='utf-8').write(src)

def biomi(dirn, tiles_json, html):
    import numpy as np
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_biomi as B, build_biomi_est as E
    src = open(html, encoding='utf-8').read()
    m = re.search(r'^const BIOMI = (.*);$', src, re.M)
    tutti = json.loads(m.group(1))
    data = json.load(open(tiles_json))
    box = (-18.5, -13.2, 27.4, 29.6)
    for taglia, d in data.items():
        cols, rows = d['cols'], d['rows']
        grid = E.dec(tutti[taglia], rows * cols)
        sel = [x for x in d['tiles'] if grid[x[0] * cols + x[1]] == '.'
               and box[0] <= x[2] < box[1] and box[2] <= x[3] < box[3]]
        print(taglia, len(sel), 'caselle nuove alle Canarie', file=sys.stderr)
        if not sel: continue
        f, P = E.rettangolo(dirn, box, d, sel)
        t = np.array([x[:4] for x in sel], dtype=np.float64)
        r, c, lat = t[:, 0].astype(int), t[:, 1].astype(int), t[:, 3]
        jit = ((r * 73856093) ^ (c * 19349663)) % 1009 / 1009.0
        cls = B.classifica(f, P, lat, np.array([x[4] for x in sel]), jit)
        grid[r * cols + c] = cls
        u, k = np.unique(cls, return_counts=True)
        print(' ', dict(zip(u.tolist(), k.tolist())), file=sys.stderr)
        tutti[taglia] = B.rle(grid)
    line = 'const BIOMI = ' + json.dumps(tutti, separators=(',', ':')) + ';'
    open(html, 'w', encoding='utf-8').write(src[:m.start()] + line + src[m.end():])

if __name__ == '__main__':
    if sys.argv[1] == 'contorni': main(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'biomi': biomi(*sys.argv[2:5])
