# Costruisce i biomi fissi di Piccoli Imperi dai dati di OpenStreetMap.
#
# Fonte: il tema "base/land" di Overture Maps, cioe' i poligoni natural=* e
# landuse=forest di OpenStreetMap (licenza ODbL, © OpenStreetMap contributors),
# letto direttamente dal bucket pubblico S3 senza scaricare l'intero pianeta.
#
# Passi:
#   1) python3 build_biomi.py estrai DIR      rasterizza boschi, rocce, ghiacciai, sabbie,
#                                             zone umide, macchie, brughiere, praterie, le cime
#                                             (con quota) e, dal tema land_use, campi, vigneti e
#                                             frutteti, citta' e saline su una griglia di 0.01 gradi
#   2) node: esporta le caselle di terra di ogni taglia (vedi export_tiles.js)
#        cat stub.js game.js export_tiles.js > _run.js && OUT=tiles.json node _run.js
#   3) python3 build_biomi.py classifica DIR tiles.json piccoli_imperi.html
#                                             assegna un bioma a ogni casella e riscrive
#                                             la riga "const BIOMI = ..." nel gioco
# Dipendenze: pip install pyarrow shapely rasterio numpy scipy
import sys, os, re, json, glob
import numpy as np

REL = "2026-10-21.0"
LON0, LON1, LAT0, LAT1, RES = -18.0, 62.0, 26.0, 72.0, 0.01
W, H = round((LON1 - LON0) / RES), round((LAT1 - LAT0) / RES)
CH = {  # canale -> coppie (subtype, class) di Overture/OSM (tema base/land)
    'forest': {('forest', 'forest'), ('forest', 'wood')},
    'rock': {('rock', 'bare_rock'), ('rock', 'scree'), ('rock', 'rock'), ('rock', 'stone')},
    'glacier': {('glacier', 'glacier')},
    'sand': {('sand', 'sand'), ('sand', 'dune'), ('desert', 'desert'), ('sand', 'desert')},
    'wetland': {('wetland', 'wetland'), ('wetland', 'bog'), ('wetland', 'marsh'), ('wetland', 'swamp')},
    'shrub': {('shrub', 'heath'), ('shrub', 'scrub'), ('grass', 'fell'), ('shrub', 'tundra'), ('grass', 'tundra')},
    # i canali seguenti distinguono i biomi del prato (v66)
    'scrub': {('shrub', 'scrub'), ('shrub', 'shrub'), ('shrub', 'shrubbery')},
    'heath': {('shrub', 'heath')},
    'grassland': {('grass', 'grassland'), ('grass', 'meadow'), ('grass', 'grass')},
}
# canali dal tema base/land_use (landuse=* di OSM): per ognuno le coppie (subtype, class),
# oppure un insieme di soli subtype (chiave stringa)
USO = {
    'agri': {'agriculture', 'horticulture'},   # tutti i coltivi: serve al deserto del Nord Africa
    'campi': {('agriculture', 'farmland'), ('agriculture', 'farmyard'), ('horticulture', 'greenhouse_horticulture')},
    'vigne': {('horticulture', 'vineyard'), ('horticulture', 'orchard'), ('agriculture', 'plantation'),
              ('horticulture', 'plantation')},
    'urbano': {('residential', 'residential'), ('developed', 'industrial'), ('developed', 'commercial'),
               ('developed', 'retail'), ('developed', 'brownfield'), ('developed', 'works'),
               ('construction', 'construction'), ('residential', 'garages')},
    'sale': {('resource_extraction', 'salt_pond')},
}
NAMES = list(CH)
LOOK = {}  # coppia -> canali (una coppia puo' stare in piu' canali)
for i, n in enumerate(NAMES):
    for k in CH[n]:
        LOOK.setdefault(k, []).append(i)

# ---------------------------------------------------------------- 1) estrazione
def estrai_file(args):
    path, out = args
    import pyarrow.fs as pfs, pyarrow.parquet as pq, shapely
    from rasterio.features import rasterize
    from rasterio.transform import from_origin
    tr = from_origin(LON0, LAT1, RES, RES)
    s3 = pfs.S3FileSystem(anonymous=True, region='us-west-2')
    arr = np.zeros((len(NAMES), H, W), np.uint8)
    peaks = []
    pf = pq.ParquetFile(s3.open_input_file(path)); md = pf.metadata
    names = [md.schema.column(i).path for i in range(md.num_columns)]; ix = {n: i for i, n in enumerate(names)}
    for rg in range(md.num_row_groups):
        g = md.row_group(rg); st = lambda n: g.column(ix[n]).statistics
        if st('bbox.xmax').max < LON0 or st('bbox.xmin').min > LON1 or st('bbox.ymax').max < LAT0 or st('bbox.ymin').min > LAT1:
            continue
        tb = pf.read_row_group(rg, columns=['subtype', 'class', 'elevation', 'geometry', 'bbox'])
        sub = tb['subtype'].to_pylist(); cls = tb['class'].to_pylist()
        bb = tb['bbox'].combine_chunks()
        inb = ((bb.field('xmax').to_numpy() >= LON0) & (bb.field('xmin').to_numpy() <= LON1)
               & (bb.field('ymax').to_numpy() >= LAT0) & (bb.field('ymin').to_numpy() <= LAT1))
        idx = [i for i in np.nonzero(inb)[0] if (sub[i], cls[i]) in LOOK or cls[i] in ('peak', 'volcano')]
        if not idx:
            continue
        geoms = shapely.from_wkb(tb['geometry'].take(idx).to_numpy(zero_copy_only=False))
        elev = tb['elevation'].take(idx).to_pylist()
        groups = {}
        for j, i in enumerate(idx):
            if cls[i] in ('peak', 'volcano'):
                if elev[j] is not None and geoms[j].geom_type == 'Point':
                    peaks.append((geoms[j].x, geoms[j].y, elev[j]))
            elif geoms[j].geom_type in ('Polygon', 'MultiPolygon'):
                for c in LOOK[(sub[i], cls[i])]:
                    groups.setdefault(c, []).append(geoms[j])
        for c, gs in groups.items():
            rasterize(((x, 1) for x in gs), out=arr[c], transform=tr)
    np.savez_compressed(os.path.join(out, os.path.basename(path) + '.npz'), arr=arr,
                        peaks=np.array(peaks, np.float32).reshape(-1, 3))
    return path, len(peaks)

def estrai(out):
    import pyarrow.fs as pfs
    from multiprocessing import Pool
    os.makedirs(out, exist_ok=True)
    s3 = pfs.S3FileSystem(anonymous=True, region='us-west-2')
    files = [f.path for f in s3.get_file_info(pfs.FileSelector(f"overturemaps-us-west-2/release/{REL}/theme=base/type=land/"))]
    todo = [(f, out) for f in files if not os.path.exists(os.path.join(out, os.path.basename(f) + '.npz'))]
    print(len(files), 'file,', len(todo), 'da fare', flush=True)
    with Pool(4) as p:
        for r in p.imap_unordered(estrai_file, todo):
            print(r, flush=True)

# coperture del tema base/land_use (landuse=* di OSM): coltivi, vigneti e frutteti,
# citta', saline. Una griglia per canale, sulla stessa maglia di 0.01 gradi.
UNAMES = list(USO)
def estrai_uso_file(args):
    path, out = args
    import pyarrow.fs as pfs, pyarrow.parquet as pq, shapely
    from rasterio.features import rasterize
    from rasterio.transform import from_origin
    tr = from_origin(LON0, LAT1, RES, RES)
    s3 = pfs.S3FileSystem(anonymous=True, region='us-west-2')
    arr = np.zeros((len(UNAMES), H, W), np.uint8)
    pf = pq.ParquetFile(s3.open_input_file(path)); md = pf.metadata
    names = [md.schema.column(i).path for i in range(md.num_columns)]; ix = {n: i for i, n in enumerate(names)}
    for rg in range(md.num_row_groups):
        g = md.row_group(rg); st = lambda n: g.column(ix[n]).statistics
        if st('bbox.xmax').max < LON0 or st('bbox.xmin').min > LON1 or st('bbox.ymax').max < LAT0 or st('bbox.ymin').min > LAT1:
            continue
        tb = pf.read_row_group(rg, columns=['subtype', 'class', 'geometry', 'bbox'])
        sub = tb['subtype'].to_pylist(); cls = tb['class'].to_pylist()
        bb = tb['bbox'].combine_chunks()
        inb = ((bb.field('xmax').to_numpy() >= LON0) & (bb.field('xmin').to_numpy() <= LON1)
               & (bb.field('ymax').to_numpy() >= LAT0) & (bb.field('ymin').to_numpy() <= LAT1))
        chans = {}
        for i in np.nonzero(inb)[0]:
            for c, n in enumerate(UNAMES):
                if sub[i] in USO[n] or (sub[i], cls[i]) in USO[n]:
                    chans.setdefault(i, []).append(c)
        if not chans:
            continue
        idx = list(chans)
        geoms = shapely.from_wkb(tb['geometry'].take(idx).to_numpy(zero_copy_only=False))
        groups = {}
        for j, i in enumerate(idx):
            if geoms[j].geom_type in ('Polygon', 'MultiPolygon'):
                for c in chans[i]:
                    groups.setdefault(c, []).append(geoms[j])
        for c, gs in groups.items():
            rasterize(((x, 1) for x in gs), out=arr[c], transform=tr)
    np.savez_compressed(os.path.join(out, 'uso-' + os.path.basename(path) + '.npz'), arr=arr)
    return path

def estrai_uso(out):
    import pyarrow.fs as pfs
    from multiprocessing import Pool
    os.makedirs(out, exist_ok=True)
    s3 = pfs.S3FileSystem(anonymous=True, region='us-west-2')
    files = [f.path for f in s3.get_file_info(pfs.FileSelector(f"overturemaps-us-west-2/release/{REL}/theme=base/type=land_use/"))]
    todo = [(f, out) for f in files if not os.path.exists(os.path.join(out, 'uso-' + os.path.basename(f) + '.npz'))]
    print(len(files), 'file land_use,', len(todo), 'da fare', flush=True)
    with Pool(4) as p:
        for r in p.imap_unordered(estrai_uso_file, todo):
            print(r, flush=True)

# ---------------------------------------------------------------- 2) classificazione
KM_LON, KM_LAT = 82.5, 111.0  # la proiezione del gioco (GEO.kmLon, GEO.kmLat)

def carica(dirn):
    arr = None; peaks = []
    for f in sorted(glob.glob(os.path.join(dirn, 'part-*.npz'))):
        z = np.load(f)
        arr = z['arr'] if arr is None else np.maximum(arr, z['arr'])
        peaks.append(z['peaks'])
    return arr, np.concatenate(peaks)

def integrale(a):
    s = np.zeros((a.shape[0] + 1, a.shape[1] + 1), np.int32)
    np.cumsum(np.cumsum(a, axis=0, dtype=np.int32), axis=1, out=s[1:, 1:])
    return s

def frazioni(S, lon, lat, half_lon, half_lat):
    # frazione di celle coperte nel rettangolo equivalente all'esagono
    x0 = np.clip(np.floor((lon - half_lon - LON0) / RES).astype(int), 0, W)
    x1 = np.clip(np.ceil((lon + half_lon - LON0) / RES).astype(int), 0, W)
    y0 = np.clip(np.floor((LAT1 - (lat + half_lat)) / RES).astype(int), 0, H)
    y1 = np.clip(np.ceil((LAT1 - (lat - half_lat)) / RES).astype(int), 0, H)
    area = np.maximum(1, (x1 - x0) * (y1 - y0))
    return (S[y1, x1] - S[y0, x1] - S[y1, x0] + S[y0, x0]) / area

AFRICA = {'MA', 'DZ', 'TN', 'LY', 'EG'}

# i biomi del prato (v66): soglia di copertura di ciascuno; vince quello che la supera di piu'
PRATO = [('a', 'grassland', 0.12), ('b', 'heath', 0.08), ('k', 'scrub', 0.12), ('c', 'campi', 0.3),
         ('v', 'vigne', 0.08), ('p', 'wetland', 0.15), ('u', 'urbano', 0.15)]

def classifica(f, P, lat, paese, jit):
    fo, ro, gl, sa, we, sh, ag = (f[n] for n in NAMES[:6] + ['agri'])
    out = np.full(len(lat), 'g')
    out[fo >= 0.45] = 'f'                                     # bosco
    hill = (P >= 600) | ((ro >= 0.15) & (P >= 300))            # rilievi medi
    out[hill & (fo < 0.7)] = 'h'
    # tundra: brughiere, paludi e rocce senza bosco nel grande nord, e tutto il nudo oltre i 67°
    out[(lat >= 64.5) & (fo < 0.15) & (sh + we + ro >= 0.1)] = 'i'
    # oltre il Circolo Polare il limite della tundra e' frastagliato (fisso: dipende solo dalla casella)
    out[(lat >= 66.2 + 2.0 * jit) & (fo < 0.2)] = 'i'
    # Nord Africa: dove OSM non segna ne' verde ne' campi, e' deserto (di pietra se non e' sabbia)
    africa = np.isin(paese, list(AFRICA))
    verde = fo + ag + we + 0.5 * sh
    out[africa & (verde < 0.12) & (P < 1200)] = 'r'
    out[(sa >= 0.25) & (lat < 60)] = 'e'                      # dune e sabbie
    out[(ro >= 0.3) & (lat < 37.5) & (P < 1200)] = 'r'        # hamada e pietraie
    out[africa & (out == 'r') & (sa >= 0.08)] = 'e'
    mount = (gl >= 0.08) | (P >= 1900) | ((P >= 1200) & (ro >= 0.06)) | ((P >= 800) & (ro >= 0.3))
    out[mount] = 'm'                                          # montagne: ghiacciai, cime alte, roccia
    out[mount & (gl >= 0.05)] = 'z'                           # ghiacciaio
    # il prato si divide nei biomi di OSM: il bioma la cui copertura supera di piu' la sua soglia
    prato = out == 'g'
    best = np.ones(len(lat)); scelta = np.full(len(lat), 'g')
    for sym, ch, soglia in PRATO:
        r = f[ch] / soglia
        m = prato & (r >= best)
        scelta[m] = sym; best = np.where(m, r, best)
    out[prato] = scelta[prato]
    out[(out == 'f') & (we >= 0.45) & (we > fo)] = 'p'        # boschi allagati: torbiere e paludi
    out[((out == 'g') | (out == 'e') | (out == 'r')) & (f['sale'] >= 0.2)] = 's'  # saline
    return out

def rle(grid):
    s = []; prev = None; n = 0
    for ch in grid:
        if ch == prev: n += 1; continue
        if prev is not None: s.append((str(n) if n > 1 else '') + prev)
        prev, n = ch, 1
    s.append((str(n) if n > 1 else '') + prev)
    return ''.join(s)

def classifica_tutto(dirn, tiles_json, html):
    from scipy.spatial import cKDTree
    arr, peaks = carica(dirn)
    print('griglia', arr.shape, 'cime', len(peaks), flush=True)
    integ = {n: integrale(arr[i]) for i, n in enumerate(NAMES)}
    del arr
    uso = None
    for fu in sorted(glob.glob(os.path.join(dirn, 'uso-*.npz'))):
        a = np.load(fu)['arr']
        uso = a if uso is None else np.maximum(uso, a)
    for i, n in enumerate(UNAMES):
        integ[n] = integrale(uso[i])
    del uso
    data = json.load(open(tiles_json))
    biomi = {}; stat = {}
    for m, d in data.items():
        t = np.array([x[:4] for x in d['tiles']], dtype=np.float64)
        paese = np.array([x[4] for x in d['tiles']])
        r, c, lon, lat = t[:, 0].astype(int), t[:, 1].astype(int), t[:, 2], t[:, 3]
        half = 0.465 * d['hexKm']  # lato del quadrato con l'area dell'esagono, a meta'
        f = {n: frazioni(integ[n], lon, lat, half / KM_LON, half / KM_LAT) for n in NAMES + UNAMES}
        # quota della cima piu' alta dentro ogni esagono (la casella piu' vicina)
        tree = cKDTree(np.c_[lon * KM_LON, lat * KM_LAT])
        dd, ii = tree.query(np.c_[peaks[:, 0] * KM_LON, peaks[:, 1] * KM_LAT], distance_upper_bound=d['hexKm'] * 0.58)
        P = np.zeros(len(lon))
        ok = np.isfinite(dd)
        np.maximum.at(P, ii[ok], peaks[ok, 2])
        jit = ((r * 73856093) ^ (c * 19349663)) % 1009 / 1009.0
        cls = classifica(f, P, lat, paese, jit)
        grid = np.full(d['rows'] * d['cols'], '.')
        grid[r * d['cols'] + c] = cls
        biomi[m] = rle(grid)
        u, k = np.unique(cls, return_counts=True)
        stat[m] = {a: round(b / len(cls) * 100, 1) for a, b in zip(u, k)}
        print(m, len(biomi[m]), 'caratteri', stat[m], flush=True)
    line = 'const BIOMI = ' + json.dumps(biomi, separators=(',', ':')) + ';'
    s = open(html, encoding='utf-8').read()
    if re.search(r'^const BIOMI = .*;$', s, re.M):
        s = re.sub(r'^const BIOMI = .*;$', lambda _: line, s, count=1, flags=re.M)
    else:
        s = s.replace('const BIOMA_TERRENO = ', line + '\nconst BIOMA_TERRENO = ', 1)
    open(html, 'w', encoding='utf-8').write(s)
    return stat

if __name__ == '__main__':
    if sys.argv[1] == 'estrai':
        estrai(sys.argv[2])
        estrai_uso(sys.argv[2])
    elif sys.argv[1] == 'estrai_uso':
        estrai_uso(sys.argv[2])
    elif sys.argv[1] == 'classifica':
        classifica_tutto(sys.argv[2], sys.argv[3], sys.argv[4])
