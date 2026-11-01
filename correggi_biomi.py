# Controlla e corregge i biomi di Piccoli Imperi con i dati da satellite (v82).
#
# I biomi di BIOMI vengono da OpenStreetMap (build_biomi.py), che in molte zone e' incompleto:
# boschi non disegnati (Russia, Finlandia, Svezia), campi non segnati (Russia, Ucraina, Turchia),
# deserti dove c'e' verde (costa del Maghreb, valle del Nilo), rilievi stimati solo dalle cime.
# Questo script confronta ogni casella con due fonti indipendenti e uniformi:
#   - ESA WorldCover 2021 (10 m, © ESA WorldCover project / Copernicus, licenza CC BY 4.0):
#     alberi, arbusti, erba, campi, costruito, nudo, neve, acqua, zone umide, muschi e licheni;
#   - Copernicus DEM GLO-90 (© DLR / Airbus, distribuito dall'ESA, licenza Copernicus):
#     quota media e dislivello (deviazione standard della quota) dentro l'esagono.
# e corregge solo dove i dati veri smentiscono con chiarezza il bioma di OSM (regole in `correggi`).
#
# Passi:
#   1) python3 correggi_biomi.py scarica DIR LON0 LON1 LAT0 LAT1   (circa 2 minuti, file pubblici su AWS S3)
#   2) node: esporta le caselle di terra di ogni taglia (vedi export_tiles.js)
#        cat stub.js game.js export_tiles.js > _run.js && OUT=tiles.json node _run.js
#   3) python3 correggi_biomi.py correggi DIR tiles.json piccoli_imperi.html
#        riscrive la riga "const BIOMI = ..." partendo da quella che c'e'
#   4) node build_mappe.js
# Va rilanciato anche dopo build_biomi.py (che riparte da OSM e cancellerebbe le correzioni).
# Dipendenze: pip install rasterio numpy
import sys, os, re, json
import numpy as np

KM_LON, KM_LAT = 82.5, 111.0  # la proiezione del gioco (GEO.kmLon, GEO.kmLat)
CLASSI = {'alberi': [10], 'arbusti': [20], 'erba': [30], 'campi': [40], 'costruito': [50], 'nudo': [60],
          'neve': [70], 'acqua': [80], 'umido': [90, 95], 'muschio': [100]}

# ---------------------------------------------------------------- 1) scarico
def _leggi(url, n, resampling):
    import rasterio
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_MAX_RETRY='3'):
        try:
            with rasterio.open(url) as d:
                return d.read(1, out_shape=(n, n), resampling=resampling)
        except rasterio.errors.RasterioIOError as e:
            s = str(e)
            if any(x in s for x in ('not recognized', '404', 'No such file', 'does not exist')):
                return None  # mare: la tessera non esiste
            raise

def _griglia(lats, lons, passo, n, url, resampling, dtype, vuoto, conv=lambda x: x):
    from concurrent.futures import ThreadPoolExecutor
    lon0, lat1 = lons[0], lats[-1] + passo
    G = np.full((len(lats) * n, len(lons) * n), vuoto, dtype)
    def una(a):
        lat, lon = a
        for k in range(4):
            try:
                x = _leggi(url(lat, lon), n, resampling)
                break
            except Exception:
                if k == 3: raise
        if x is None: return 0
        r = (lat1 - (lat + passo)) // passo * n; c = (lon - lon0) // passo * n
        G[r:r + n, c:c + n] = conv(x)
        return 1
    with ThreadPoolExecutor(24) as ex:
        ok = sum(ex.map(una, [(a, b) for a in lats for b in lons]))
    return G, lon0, lat1, ok

def scarica(out, lon0, lon1, lat0, lat1):
    from rasterio.enums import Resampling
    os.makedirs(out, exist_ok=True)
    ns = lambda v, w: ('N' if v >= 0 else 'S') + f'{abs(v):0{w}d}'
    ew = lambda v, w: ('E' if v >= 0 else 'W') + f'{abs(v):0{w}d}'
    # WorldCover: tessere di 3 gradi, lette a 450 pixel (1/150 di grado, ~600 m), classe piu' frequente
    lats = list(range(int(np.floor(lat0 / 3)) * 3, int(np.ceil(lat1 / 3)) * 3, 3))
    lons = list(range(int(np.floor(lon0 / 3)) * 3, int(np.ceil(lon1 / 3)) * 3, 3))
    wc = lambda la, lo: ('/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/'
                         f'ESA_WorldCover_10m_2021_v200_{ns(la, 2)}{ew(lo, 3)}_Map.tif')
    G, l0, t, ok = _griglia(lats, lons, 3, 450, wc, Resampling.mode, np.uint8, 0)
    np.savez_compressed(os.path.join(out, 'worldcover.npz'), g=G, lon0=l0, lat1=t, res=3 / 450)
    print('WorldCover:', ok, 'tessere', flush=True)
    # Copernicus DEM 90 m: tessere di 1 grado, lette a 120 pixel (1/120 di grado), quota media
    lats = list(range(int(np.floor(lat0)), int(np.ceil(lat1))))
    lons = list(range(int(np.floor(lon0)), int(np.ceil(lon1))))
    def dem(la, lo):
        n = f'Copernicus_DSM_COG_30_{ns(la, 2)}_00_{ew(lo, 3)}_00_DEM'
        return f'/vsicurl/https://copernicus-dem-90m.s3.amazonaws.com/{n}/{n}.tif'
    G, l0, t, ok = _griglia(lats, lons, 1, 120, dem, Resampling.average, np.int16, -32768,
                            lambda x: np.clip(x, -500, 9000).astype(np.int16))
    np.savez_compressed(os.path.join(out, 'dem.npz'), g=G, lon0=l0, lat1=t, res=1 / 120)
    print('DEM:', ok, 'tessere', flush=True)

# ---------------------------------------------------------------- 2) misure per casella
def _integrale(a):
    s = np.zeros((a.shape[0] + 1, a.shape[1] + 1), np.float64)
    np.cumsum(np.cumsum(a, 0, dtype=np.float64), 1, out=s[1:, 1:])
    return s

def _somma(S, lon, lat, hl, ht, l0, top, res):
    h, w = S.shape[0] - 1, S.shape[1] - 1
    x0 = np.clip(np.floor((lon - hl - l0) / res).astype(int), 0, w); x1 = np.clip(np.ceil((lon + hl - l0) / res).astype(int), 0, w)
    y0 = np.clip(np.floor((top - (lat + ht)) / res).astype(int), 0, h); y1 = np.clip(np.ceil((top - (lat - ht)) / res).astype(int), 0, h)
    return S[y1, x1] - S[y0, x1] - S[y1, x0] + S[y0, x0], np.maximum(1, (x1 - x0) * (y1 - y0))

def misure(dirn, taglie):
    """per ogni taglia: frazione di ogni classe WorldCover sulla terra dell'esagono, quota e dislivello"""
    wc = np.load(os.path.join(dirn, 'worldcover.npz')); W = wc['g']
    wl0, wt, wr = float(wc['lon0']), float(wc['lat1']), float(wc['res'])
    dm = np.load(os.path.join(dirn, 'dem.npz')); D = dm['g'].astype(np.float32)
    dl0, dt, dr = float(dm['lon0']), float(dm['lat1']), float(dm['res'])
    geo = {}
    for m, d in taglie.items():
        lon = np.array([x[2] for x in d['tiles']]); lat = np.array([x[3] for x in d['tiles']])
        half = 0.465 * d['hexKm']  # lato del quadrato con l'area dell'esagono, a meta' (come build_biomi.py)
        geo[m] = (lon, lat, half / KM_LON, half / KM_LAT)
    out = {m: {} for m in taglie}
    terra = (W != 0) & (W != 80)
    S = _integrale(terra)
    for m, (lon, lat, hl, ht) in geo.items():
        out[m]['_terra'], out[m]['_area'] = _somma(S, lon, lat, hl, ht, wl0, wt, wr)
    for k, v in CLASSI.items():
        S = _integrale(np.isin(W, v))
        for m, (lon, lat, hl, ht) in geo.items():
            n, a = _somma(S, lon, lat, hl, ht, wl0, wt, wr)
            out[m][k] = n / np.maximum(1, out[m]['_terra'])
    ok = D > -1000; Dz = np.where(ok, D, 0)
    Sv, S1, S2 = _integrale(ok), _integrale(Dz), _integrale(Dz * Dz)
    for m, (lon, lat, hl, ht) in geo.items():
        nv, _ = _somma(Sv, lon, lat, hl, ht, dl0, dt, dr)
        s1, _ = _somma(S1, lon, lat, hl, ht, dl0, dt, dr); s2, _ = _somma(S2, lon, lat, hl, ht, dl0, dt, dr)
        q = s1 / np.maximum(1, nv)
        out[m]['quota'] = q
        out[m]['dislivello'] = np.sqrt(np.maximum(0, s2 / np.maximum(1, nv) - q * q))
        out[m]['dem'] = nv > 0
        out[m]['dati'] = out[m]['_terra'] / out[m]['_area'] >= 0.3  # casella con abbastanza terra misurata
    return out

# ---------------------------------------------------------------- 3) correzione
PIANI = set('gakbi')  # prato, prateria, macchia, brughiera, tundra: i biomi "vuoti" che OSM lascia dove non sa

def correggi(bio, f, lat):
    """bio: biomi OSM (array di lettere); f: misure; ritorna i biomi corretti e il motivo di ogni cambio"""
    b = bio.copy(); perche = np.full(len(b), '', object)
    al, ca, co, nu, ne, um, mu, er = (f[k] for k in ('alberi', 'campi', 'costruito', 'nudo', 'neve', 'umido', 'muschio', 'erba'))
    q, dl = f['quota'], f['dislivello']
    ok = f['dati']; dem = ok & f['dem']
    def metti(m, sym, motivo):
        m = m & (b != sym)
        b[m] = sym[m] if isinstance(sym, np.ndarray) else sym; perche[m] = motivo
    def piano():  # il bioma di pianura che dicono i dati veri
        s = np.full(len(b), 'g')
        s[(er >= 0.4) & (er >= ca)] = 'a'
        s[ca >= 0.45] = 'c'
        s[um >= 0.35] = 'p'
        s[al >= 0.55] = 'f'
        s[(nu >= 0.6) & (lat < 60)] = 'r'
        s[(lat >= 64.5) & (al < 0.25) & (mu + nu + um >= 0.3)] = 'i'
        return s
    P = piano()
    # 1) deserti dove c'e' verde (costa del Maghreb, valle del Nilo, steppa kazaka) e citta' fantasma
    metti(ok & np.isin(b, ['e', 'r']) & (nu < 0.3), P, 'deserto verde')
    metti(ok & (b == 'u') & (co < 0.04), P, 'citta senza case')
    metti(ok & (b == 'p') & (um < 0.03) & (P != 'g'), P, 'palude asciutta')
    metti(ok & (b == 'f') & (al < 0.15), P, 'bosco senza alberi')
    metti(ok & (b == 'i') & (al >= 0.5) & (lat < 69), 'f', 'taiga, non tundra')
    # 2) i biomi che OSM non ha disegnato, dove la casella e' "vuota"
    vuoto = ok & np.isin(b, list(PIANI))
    metti(vuoto & (al >= 0.6), 'f', 'bosco mancante')
    metti(vuoto & (b != 'i') & (al < 0.6) & (ca >= 0.55), 'c', 'campi mancanti')
    metti(vuoto & (al < 0.6) & (um >= 0.4), 'p', 'palude mancante')
    metti(ok & np.isin(b, list(PIANI) + ['p']) & (nu >= 0.7) & (lat < 60), 'r', 'deserto mancante')
    # 3) rilievi dal modello del terreno (OSM li stimava solo dalle cime segnate)
    rilievo_ok = np.isin(b, list(PIANI) + ['f', 'e', 'r', 'p'])
    collina = dem & (dl >= 110)
    metti(collina & rilievo_ok & ~((b == 'f') & (al >= 0.7)), 'h', 'collina mancante')
    monte = dem & ((dl >= 250) | ((q >= 2200) & (dl >= 120)))
    metti(monte & (rilievo_ok | (b == 'h')), 'm', 'montagna mancante')
    metti(dem & (b == 'm') & (dl < 60) & (q < 700), P, 'montagna piatta')
    metti(dem & (b == 'h') & (dl < 30) & (q < 400), P, 'collina piatta')
    # 4) ghiacci
    metti(ok & (ne >= 0.4) & ~np.isin(b, ['z']), 'z', 'ghiacciaio mancante')
    metti(ok & (b == 'z') & (ne < 0.05), 'm', 'ghiacciaio senza ghiaccio')
    return b, perche

def rle(grid):
    s = []; prev = None; n = 0
    for ch in grid:
        if ch == prev: n += 1; continue
        if prev is not None: s.append((str(n) if n > 1 else '') + prev)
        prev, n = ch, 1
    s.append((str(n) if n > 1 else '') + prev)
    return ''.join(s)

def unrle(s, n):
    out = []
    for k, ch in re.findall(r'(\d*)(\D)', s): out.extend(ch * int(k or 1))
    return np.array(out[:n] + ['.'] * (n - len(out)))

def correggi_tutto(dirn, tiles_json, html, solo=None):
    s = open(html, encoding='utf-8').read()
    riga = re.search(r'^const BIOMI = (.*);$', s, re.M)
    BIOMI = json.loads(riga.group(1))
    taglie = json.load(open(tiles_json))
    F = misure(dirn, taglie)
    rapporto = {}
    for m, d in taglie.items():
        r = np.array([x[0] for x in d['tiles']]); c = np.array([x[1] for x in d['tiles']])
        lat = np.array([x[3] for x in d['tiles']]); paese = np.array([x[4] for x in d['tiles']])
        grid = unrle(BIOMI[m], d['rows'] * d['cols'])
        idx = r * d['cols'] + c
        bio = grid[idx]
        nuovo, perche = correggi(bio, F[m], lat)
        if solo is not None:  # solo le caselle nella zona indicata (lon0, lon1, lat0, lat1)
            lon = np.array([x[2] for x in d['tiles']])
            fuori = ~((lon >= solo[0]) & (lon <= solo[1]) & (lat >= solo[2]) & (lat <= solo[3]))
            nuovo[fuori] = bio[fuori]; perche[fuori] = ''
        nuovo[bio == '.'] = '.'; perche[bio == '.'] = ''  # caselle senza bioma (non dovrebbero esserci)
        grid[idx] = nuovo
        BIOMI[m] = rle(grid)
        cambi = perche != ''
        conta = {}
        for p, pa in zip(perche[cambi], paese[cambi]):
            conta.setdefault(p, {}); conta[p][pa] = conta[p].get(pa, 0) + 1
        rapporto[m] = {'caselle': int(len(bio)), 'cambiate': int(cambi.sum()),
                       'motivi': {p: dict(sorted(v.items(), key=lambda x: -x[1])) for p, v in conta.items()}}
        print(m, f'{cambi.sum()} caselle cambiate su {len(bio)} ({cambi.mean() * 100:.1f}%)', flush=True)
        for p, v in sorted(conta.items(), key=lambda x: -sum(x[1].values())):
            print(f'   {p}: {sum(v.values())}', ' '.join(f'{k or "--"}={n}' for k, n in sorted(v.items(), key=lambda x: -x[1])[:8]))
    line = 'const BIOMI = ' + json.dumps(BIOMI, separators=(',', ':')) + ';'
    s = s[:riga.start()] + line + s[riga.end():]
    open(html, 'w', encoding='utf-8').write(s)
    return rapporto

if __name__ == '__main__':
    if sys.argv[1] == 'scarica':
        scarica(sys.argv[2], *[float(x) for x in sys.argv[3:7]])
    elif sys.argv[1] == 'correggi':
        solo = [float(x) for x in sys.argv[5:9]] if len(sys.argv) >= 9 else None
        rep = correggi_tutto(sys.argv[2], sys.argv[3], sys.argv[4], solo)
        if os.environ.get('RAPPORTO'): json.dump(rep, open(os.environ['RAPPORTO'], 'w'), indent=1)
