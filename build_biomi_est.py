# v83: i biomi delle terre nuove (Medio Oriente, Sahara sotto i 27°, Sahel, Asia centrale), con le
# stesse regole di build_biomi.py e gli stessi dati (OpenStreetMap tramite Overture). Le caselle che
# hanno gia' un bioma in BIOMI non cambiano: si classificano solo quelle che erano mare ('.').
#
# Passi:
#   1) estrazione su due rettangoli (lo stesso codice di build_biomi.py, ~20 minuti in tutto):
#        python3 build_biomi_est.py estrai DIR_A -25.5 64.5 11.5 44.5    il sud e il Medio Oriente
#        python3 build_biomi_est.py estrai DIR_B 59.5 64.5 44.0 72.0     la striscia est fino all'Artico
#        python3 build_biomi_est.py estrai DIR_C 55.5 59.6 44.0 46.0     l'Uzbekistan intorno all'Aral
#   2) cat stub.js game.js export_tiles.js > _run.js && OUT=tiles.json node _run.js
#   3) python3 build_biomi_est.py classifica DIR_A DIR_B DIR_C tiles.json piccoli_imperi.html
#   poi node build_mappe.js
# Dipendenze: pip install pyarrow shapely rasterio numpy scipy
import sys, os, re, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_biomi as B

# le terre aride: dove OSM non segna ne' verde ne' campi e' deserto (come il Nord Africa di prima)
ARIDI = set(B.AFRICA) | {'SY', 'LB', 'IL', 'PS', 'JO', 'IQ', 'IR', 'KW', 'SA', 'BH', 'QA', 'AE', 'OM', 'YE',
                         'MR', 'ML', 'NE', 'TD', 'SD', 'SS', 'ER', 'ET', 'DJ', 'SO', 'SN', 'GM', 'GW', 'GN',
                         'BF', 'NG', 'CM', 'BJ', 'CV', 'TM', 'UZ', 'AF', 'PK'}
AFRICA_SAHEL = {'MR', 'ML', 'NE', 'TD', 'SD', 'SS', 'ER', 'ET', 'DJ', 'SO', 'SN', 'GM', 'GW', 'GN', 'BF', 'NG',
                'CM', 'BJ', 'CV'}

def imposta(lon0, lon1, lat0, lat1):
    B.LON0, B.LON1, B.LAT0, B.LAT1 = lon0, lon1, lat0, lat1
    B.W, B.H = round((lon1 - lon0) / B.RES), round((lat1 - lat0) / B.RES)

def dec(s, n):
    out = []; k = 0
    for ch in s:
        if ch.isdigit(): k = k * 10 + int(ch); continue
        out.extend([ch] * (k or 1)); k = 0
    assert len(out) == n, (len(out), n)
    return np.array(out)

def rettangolo(dirn, box, d, sel):
    """frazioni di copertura e quota delle cime per le caselle sel, con il raster di dirn"""
    from scipy.spatial import cKDTree
    imposta(*box)
    arr, peaks = B.carica(dirn)
    integ = {n: B.integrale(arr[i]) for i, n in enumerate(B.NAMES)}
    del arr
    uso = None
    for fu in sorted(__import__('glob').glob(os.path.join(dirn, 'uso-*.npz'))):
        a = np.load(fu)['arr']; uso = a if uso is None else np.maximum(uso, a)
    for i, n in enumerate(B.UNAMES): integ[n] = B.integrale(uso[i])
    del uso
    t = np.array([x[:4] for x in sel], dtype=np.float64)
    lon, lat = t[:, 2], t[:, 3]
    half = 0.465 * d['hexKm']
    f = {n: B.frazioni(integ[n], lon, lat, half / B.KM_LON, half / B.KM_LAT) for n in B.NAMES + B.UNAMES}
    tree = cKDTree(np.c_[lon * B.KM_LON, lat * B.KM_LAT])
    dd, ii = tree.query(np.c_[peaks[:, 0] * B.KM_LON, peaks[:, 1] * B.KM_LAT], distance_upper_bound=d['hexKm'] * 0.58)
    P = np.zeros(len(lon)); ok = np.isfinite(dd)
    np.maximum.at(P, ii[ok], peaks[ok, 2])
    return f, P

def classifica(dir_a, dir_b, dir_c, tiles_json, html):
    B.AFRICA = ARIDI   # la regola del deserto vale per tutte le terre aride nuove
    src = open(html, encoding='utf-8').read()
    m = re.search(r'^const BIOMI = (.*);$', src, re.M)
    biomi = json.loads(m.group(1))
    data = json.load(open(tiles_json))
    # ogni casella usa il primo rettangolo che la contiene; l'ultima riga in fondo (sotto gli 11,5°)
    # usa comunque il rettangolo A, con le coperture calcolate sulla parte che c'e'
    BOXES = [(dir_b, (59.5, 64.5, 44.0, 72.0)), (dir_c, (55.5, 59.6, 44.0, 46.0)), (dir_a, (-25.5, 64.5, 11.5, 44.5))]
    for taglia, d in data.items():
        cols, rows = d['cols'], d['rows']
        grid = dec(biomi[taglia], rows * cols)
        nuove = [x for x in d['tiles'] if grid[x[0] * cols + x[1]] == '.']
        print(taglia, len(nuove), 'caselle nuove', flush=True)
        for dirn, box in BOXES:
            lat0 = 10.5 if dirn is dir_a else box[2]
            sel = [x for x in nuove if box[0] <= x[2] < box[1] and lat0 <= x[3] < box[3]]
            fatte = {(x[0], x[1]) for x in sel}
            nuove = [x for x in nuove if (x[0], x[1]) not in fatte]
            if not sel: continue
            f, P = rettangolo(dirn, box, d, sel)
            t = np.array([x[:4] for x in sel], dtype=np.float64)
            r, c, lat = t[:, 0].astype(int), t[:, 1].astype(int), t[:, 3]
            paese = np.array([x[4] for x in sel])
            jit = ((r * 73856093) ^ (c * 19349663)) % 1009 / 1009.0
            cls = B.classifica(f, P, lat, paese, jit)
            # il Sahel non e' deserto: sotto i 15° la terra senza dati e' savana (prateria),
            # fra 15° e 17° il passaggio e' frastagliato (fisso per casella)
            sahel = np.isin(paese, list(AFRICA_SAHEL)) & (cls == 'r') & (f['sand'] < 0.08)
            cls[sahel & (lat < 15.0 + 2.0 * jit)] = 'a'
            grid[r * cols + c] = cls
            u, k = np.unique(cls, return_counts=True)
            print(' ', dirn, len(sel), {a: round(b / len(cls) * 100, 1) for a, b in zip(u, k)}, flush=True)
        biomi[taglia] = B.rle(grid)
    line = 'const BIOMI = ' + json.dumps(biomi, separators=(',', ':')) + ';'
    src = src[:m.start()] + line + src[m.end():]
    open(html, 'w', encoding='utf-8').write(src)

if __name__ == '__main__':
    if sys.argv[1] == 'estrai':
        imposta(*map(float, sys.argv[3:7]))
        B.estrai(sys.argv[2]); B.estrai_uso(sys.argv[2])
    elif sys.argv[1] == 'classifica':
        classifica(*sys.argv[2:7])
