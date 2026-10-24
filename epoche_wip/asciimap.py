import json,sys
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
tiles=json.load(open('/tmp/claude-0/tiles_piccola.json'))
y=sys.argv[1]
fc=json.load(open(f'/tmp/claude-0/hb/world_{y}.geojson'))
geoms=[];props=[]
for f in fc['features']:
    if not f['geometry']: continue
    geoms.append(shape(f['geometry']).buffer(0)); props.append(f['properties'])
tree=STRtree(geoms)
names={};sym='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=<>?!'
g=[[' ']*249 for _ in range(210)]
for r,c,lo,la,_ in tiles:
    p=Point(lo,la); hit=[i for i in tree.query(p) if geoms[i].contains(p)]
    if not hit: g[r][c]='.'; continue
    n=props[hit[0]].get('NAME') or '-'
    if n=='-': g[r][c]='-'; continue
    if n not in names: names[n]=sym[len(names)%len(sym)]
    g[r][c]=names[n]
for r in range(0,210,2): print(''.join(g[r][::2]))
print(names)
