import json,sys
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from collections import Counter
tiles=json.load(open('/tmp/claude-0/tiles_piccola.json'))
for y in sys.argv[1:]:
    fc=json.load(open(f'/tmp/claude-0/hb/world_{y}.geojson'))
    geoms=[];props=[]
    for f in fc['features']:
        if not f['geometry']: continue
        g=shape(f['geometry']).buffer(0); geoms.append(g); props.append(f['properties'])
    tree=STRtree(geoms)
    c=Counter(); none=0
    for r,cc,lo,la,_ in tiles:
        p=Point(lo,la); hit=[i for i in tree.query(p) if geoms[i].contains(p)]
        if not hit: none+=1; continue
        pr=props[hit[0]]; c[(pr.get('NAME'),pr.get('SUBJECTO'),pr.get('PARTOF'))]+=1
    print('=====',y,'senza stato:',none)
    for k,v in c.most_common(): print(v,k)
