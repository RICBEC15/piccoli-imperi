# v89: i biomi dell'Africa sotto gli 11,5° (e del Madagascar e delle isole), direttamente dai dati da satellite.
# In Africa OpenStreetMap disegna poco la copertura del suolo (savane e foreste quasi vuote), quindi qui
# si parte da ESA WorldCover 2021 (© ESA WorldCover project / Copernicus, CC BY 4.0) e dal modello del
# terreno Copernicus DEM GLO-90, gli stessi dati di correggi_biomi.py: prima il bioma di pianura dalla
# copertura (foresta, savana, macchia, campi, paludi, deserto, citta'), poi i rilievi e i ghiacci con le
# regole di correggi_biomi.py (colline e montagne dal dislivello, mai montagna accanto a una capitale).
# Si classificano solo le caselle che in BIOMI erano ancora mare ('.'): il resto della mappa non cambia.
#
# Passi:
#   1) python3 -B correggi_biomi.py scarica DIR -18.5 58.5 -35.5 12.0        (WorldCover e DEM, ~5 minuti)
#   2) cat stub.js game.js export_tiles.js > _run.js && OUT=tiles.json node _run.js
#   3) python3 -B build_biomi_africa.py DIR tiles.json piccoli_imperi.html
#   poi node build_mappe.js
# Dipendenze: pip install rasterio numpy
import sys, os, re, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import correggi_biomi as C

def pianura(f, lat):
    """il bioma di pianura dalla copertura WorldCover (frazioni sulla terra dell'esagono)"""
    al, ar, er, ca, co, nu, um = (f[k] for k in ('alberi', 'arbusti', 'erba', 'campi', 'costruito', 'nudo', 'umido'))
    n = len(lat)
    b = np.full(n, 'g')
    b[(er + ar >= 0.45) & (er >= ar)] = 'a'           # savana e praterie (gli altipiani d'erba)
    b[(er + ar >= 0.45) & (ar > er)] = 'k'            # boscaglia e macchia (il Karoo, il Corno d'Africa)
    b[(ca >= 0.35) & (ca >= al)] = 'c'                # campi coltivati
    b[al >= 0.5] = 'f'                                # foresta pluviale e miombo fitto
    b[(um >= 0.3) & (um >= al * 0.6)] = 'p'           # paludi (il Sudd, il delta dell'Okavango, il Bangweulu)
    deserto = nu >= 0.55
    b[deserto] = 'r'                                  # deserto di pietra (la Dancalia, l'Ogaden, il Namib roccioso)
    b[deserto & (nu >= 0.85) & (f['dislivello'] < 35)] = 'e'  # deserto di dune (il Namib)
    b[(co >= 0.2) & ~deserto] = 'u'                   # le citta' grandi
    b[~f['dati']] = 'g'                               # senza dati (isolette): prato
    return b

def main(dirn, tiles_json, html):
    s = open(html, encoding='utf-8').read()
    riga = re.search(r'^const BIOMI = (.*);$', s, re.M)
    BIOMI = json.loads(riga.group(1))
    taglie = json.load(open(tiles_json))
    blocco = s[s.index('const CAPITALI_REALI = {'):]
    blocco = blocco[:blocco.index('};')]
    CAP = [(float(a), float(b)) for a, b in re.findall(r"\[\s*(?:'[^']*'|\"[^\"]*\"),\s*(-?[\d.]+),\s*(-?[\d.]+)", blocco)]
    # solo le caselle nuove: terra in tiles.json, mare in BIOMI
    nuove = {}
    for m, d in taglie.items():
        grid = C.unrle(BIOMI[m], d['rows'] * d['cols'])
        sel = [x for x in d['tiles'] if grid[x[0] * d['cols'] + x[1]] == '.']
        nuove[m] = {'rows': d['rows'], 'cols': d['cols'], 'hexKm': d['hexKm'], 'tiles': sel}
        print(m, len(sel), 'caselle nuove', flush=True)
    F = C.misure(dirn, nuove)
    for m, d in nuove.items():
        if not d['tiles']: continue
        t = d['tiles']
        r = np.array([x[0] for x in t]); c = np.array([x[1] for x in t])
        lon = np.array([x[2] for x in t]); lat = np.array([x[3] for x in t])
        vicino = np.zeros(len(t), bool)  # entro 1,6 caselle dal punto vero di una capitale
        for clon, clat in CAP:
            vicino |= np.hypot((lon - clon) * C.KM_LON, (lat - clat) * C.KM_LAT) <= 1.6 * d['hexKm']
        bio = pianura(F[m], lat)
        bio, _ = C.correggi(bio, F[m], lat, vicino)   # colline, montagne, ghiacciai (il Kilimangiaro)
        grid = C.unrle(BIOMI[m], d['rows'] * d['cols'])
        grid[r * d['cols'] + c] = bio
        BIOMI[m] = C.rle(grid)
        u, k = np.unique(bio, return_counts=True)
        print(' ', m, {a: round(b / len(bio) * 100, 1) for a, b in zip(u, k)}, flush=True)
    line = 'const BIOMI = ' + json.dumps(BIOMI, separators=(',', ':')) + ';'
    s = s[:riga.start()] + line + s[riga.end():]
    open(html, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
