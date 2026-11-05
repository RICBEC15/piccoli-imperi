# v90: i biomi dell'Asia aggiunta nella v90 (oltre il vecchio margine dell'Iran e sopra Capo Nord),
# direttamente dai dati da satellite, come l'Africa nella v89 (build_biomi_africa.py): ESA WorldCover 2021
# (© ESA WorldCover project / Copernicus, CC BY 4.0) e Copernicus DEM GLO-90. Prima il bioma di pianura
# dalla copertura (taiga, tundra, steppa, campi e risaie, giungla, paludi, deserti di pietra e di dune,
# citta'), poi i rilievi e i ghiacci con le regole di correggi_biomi.py (l'Himalaya, il Tian Shan, il Pamir).
# Si classificano solo le caselle che in BIOMI erano ancora mare ('.'): il resto della mappa non cambia.
# L'Asia e' grande: i dati si scaricano a riquadri di 30 gradi (la Cukotka oltre i 180° a parte).
#
# Passi:
#   1) for b in "60 90 -12 18" "60 90 18 48" "60 90 48 78" "90 120 -12 18" "90 120 18 48" "90 120 48 78" \
#               "120 150 -12 18" "120 150 18 48" "120 150 48 78" "150 180 18 48" "150 180 48 78" "-180 -169 48 78" "50 60 70 78"; do
#        set -- $b; python3 -B correggi_biomi.py scarica SAT/b_$1_$3 $1 $2 $3 $4; done      (~4 minuti in tutto)
#   2) cat stub.js game.js export_tiles.js > _run.js && OUT=tiles.json node _run.js
#   3) python3 -B build_biomi_asia.py SAT tiles.json piccoli_imperi.html
#   poi node build_mappe.js
# Dipendenze: pip install rasterio numpy
import sys, os, re, json, glob
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import correggi_biomi as C
from build_biomi_africa import pianura as pianura_africa

def pianura(f, lat):
    """il bioma di pianura: come in Africa, piu' la tundra dell'Artico e della Siberia"""
    b = pianura_africa(f, lat)
    al, ar, nu, um, mu = (f[k] for k in ('alberi', 'arbusti', 'nudo', 'umido', 'muschio'))
    ca = f['campi']
    # a nord dei 62° (la Cukotka, la Kolyma, il Tajmyr) senza alberi ne' campi: tundra (le paludi restano paludi)
    tundra = (lat >= 62) & (al < 0.2) & (ca < 0.2) & (um < 0.3) & f['dati']
    b[tundra] = 'i'
    return b

def main(sat, tiles_json, html):
    s = open(html, encoding='utf-8').read()
    riga = re.search(r'^const BIOMI = (.*);$', s, re.M)
    BIOMI = json.loads(riga.group(1))
    taglie = json.load(open(tiles_json))
    blocco = s[s.index('const CAPITALI_REALI = {'):]
    blocco = blocco[:blocco.index('};')]
    CAP = [(float(a), float(b)) for a, b in re.findall(r"\[\s*(?:'[^']*'|\"[^\"]*\"),\s*(-?[\d.]+),\s*(-?[\d.]+)", blocco)]
    # i riquadri scaricati: SAT/b_LON0_LAT0 (30x30 gradi; b_-180_48 e' la Cukotka, b_50_70 la Novaja Zemlja)
    riquadri = []
    for d in sorted(glob.glob(os.path.join(sat, 'b_*'))):
        lon0, lat0 = map(int, os.path.basename(d)[2:].split('_'))
        lon1 = lon0 + (11 if lon0 == -180 else 10 if lon0 == 50 else 30)
        lat1 = lat0 + (8 if lon0 == 50 else 30)
        riquadri.append((d, lon0, lon1, lat0, lat1))
    griglie = {m: C.unrle(BIOMI[m], d['rows'] * d['cols']) for m, d in taglie.items()}
    fatte = {m: 0 for m in taglie}
    for dirn, lon0, lon1, lat0, lat1 in riquadri:
        sub = {}
        for m, d in taglie.items():
            g = griglie[m]
            sel = []
            for x in d['tiles']:
                if g[x[0] * d['cols'] + x[1]] != '.': continue
                if not (x[2] > 63.55 or x[3] > 71.3): continue   # solo le terre nuove della v90
                lon = x[2] - 360 if x[2] > 180 else x[2]
                if lon0 <= lon < lon1 and lat0 <= x[3] < lat1: sel.append([x[0], x[1], lon, x[3], x[4]])
            sub[m] = {'rows': d['rows'], 'cols': d['cols'], 'hexKm': d['hexKm'], 'tiles': sel}
        if not any(v['tiles'] for v in sub.values()): continue
        print(os.path.basename(dirn), {m: len(v['tiles']) for m, v in sub.items()}, flush=True)
        F = C.misure(dirn, sub)
        for m, d in sub.items():
            t = d['tiles']
            if not t: continue
            r = np.array([x[0] for x in t]); c = np.array([x[1] for x in t])
            lon = np.array([x[2] for x in t]); lat = np.array([x[3] for x in t])
            vicino = np.zeros(len(t), bool)  # entro 1,6 caselle dal punto vero di una capitale
            for clon, clat in CAP:
                vicino |= np.hypot((lon - clon) * C.KM_LON, (lat - clat) * C.KM_LAT) <= 1.6 * d['hexKm']
            bio = pianura(F[m], lat)
            bio, _ = C.correggi(bio, F[m], lat, vicino)   # colline, montagne, ghiacciai (l'Himalaya)
            griglie[m][r * d['cols'] + c] = bio
            fatte[m] += len(t)
            u, k = np.unique(bio, return_counts=True)
            print(' ', m, {a: round(b / len(bio) * 100, 1) for a, b in zip(u, k)}, flush=True)
    for m in taglie: BIOMI[m] = C.rle(griglie[m])
    print('caselle classificate:', fatte, flush=True)
    line = 'const BIOMI = ' + json.dumps(BIOMI, separators=(',', ':')) + ';'
    s = s[:riga.start()] + line + s[riga.end():]
    open(html, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
