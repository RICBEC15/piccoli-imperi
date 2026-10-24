// Estrae il confine REALE della Russia (Natural Earth 50m, via world-atlas) e lo
// ritaglia al rettangolo della mappa (fino agli Urali e al Circolo Polare), con lo
// stesso metodo (clip + Douglas-Peucker) usato per gli altri paesi in build_extra.js.
"use strict";
const topojson = require('topojson-client');
const world = require('world-atlas/countries-50m.json');
const geo = topojson.feature(world, world.objects.countries);
const ru = geo.features.find(f => f.id === '643'); // Russia, codice ISO numerico

// rettangolo di ritaglio: dal confine con Bielorussia/Baltici/Finlandia (~18E) fino
// agli Urali (~61E, un filo oltre GRECIA_EST=60.7 per sicurezza sul bordo), dal
// Caucaso (~40N, sotto il vecchio RU_POLY) al Mar Glaciale Artico (~71N, un filo
// oltre SCOZIA_NORD=69.35 per non tagliare la costa)
const LON_MIN = 18.0, LON_MAX = 61.2, LAT_MIN = 40.5, LAT_MAX = 71.2;

function clipRect(ring) {
  // Sutherland-Hodgman contro le 4 rette del rettangolo
  function clipEdge(points, inside, intersect) {
    const out = [];
    for (let i = 0; i < points.length; i++) {
      const cur = points[i], prev = points[(i - 1 + points.length) % points.length];
      const curIn = inside(cur), prevIn = inside(prev);
      if (curIn) {
        if (!prevIn) out.push(intersect(prev, cur));
        out.push(cur);
      } else if (prevIn) out.push(intersect(prev, cur));
    }
    return out;
  }
  let pts = ring;
  pts = clipEdge(pts, p => p[0] >= LON_MIN, (a, b) => {
    const t = (LON_MIN - a[0]) / (b[0] - a[0]); return [LON_MIN, a[1] + t * (b[1] - a[1])];
  });
  if (pts.length < 3) return null;
  pts = clipEdge(pts, p => p[0] <= LON_MAX, (a, b) => {
    const t = (LON_MAX - a[0]) / (b[0] - a[0]); return [LON_MAX, a[1] + t * (b[1] - a[1])];
  });
  if (pts.length < 3) return null;
  pts = clipEdge(pts, p => p[1] >= LAT_MIN, (a, b) => {
    const t = (LAT_MIN - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), LAT_MIN];
  });
  if (pts.length < 3) return null;
  pts = clipEdge(pts, p => p[1] <= LAT_MAX, (a, b) => {
    const t = (LAT_MAX - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), LAT_MAX];
  });
  if (pts.length < 3) return null;
  return pts;
}

// Douglas-Peucker (tolleranza ~0.02 gradi ~ 1.5-2 km alle nostre latitudini)
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + t * dx, py = a[1] + t * dy;
  return Math.hypot(p[0] - px, p[1] - py);
}
function simplify(points, eps) {
  if (points.length < 3) return points;
  let maxD = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const left = simplify(points.slice(0, idx + 1), eps);
    const right = simplify(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function ringBBox(ring) {
  let x1 = 1e9, x2 = -1e9, y1 = 1e9, y2 = -1e9;
  for (const [x, y] of ring) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  return [x1, x2, y1, y2];
}
function bboxOverlap(a, b) { return a[0] <= b[1] && a[1] >= b[0] && a[2] <= b[3] && a[3] >= b[2]; }

const target = [LON_MIN, LON_MAX, LAT_MIN, LAT_MAX];
const outRings = [];
let candCount = 0;
for (const ring of ru.geometry.coordinates) {
  // MultiPolygon: ogni elemento e' un array di anelli [esterno, buchi...]; qui la
  // Russia non ha grandi enclave/exclave rilevanti nell'area di interesse, quindi
  // trattiamo solo l'anello esterno di ogni poligono
  const outer = ring[0];
  const bb = ringBBox(outer);
  if (!bboxOverlap(bb, target)) continue;
  candCount++;
  const clipped = clipRect(outer);
  if (!clipped || clipped.length < 4) continue;
  const simplified = simplify(clipped, 0.015);
  if (simplified.length < 4) continue;
  outRings.push(simplified.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]));
}
console.log('poligoni candidati (bbox overlap):', candCount, '-> ritagliati validi:', outRings.length);
for (const r of outRings) console.log('  anello:', r.length, 'punti, bbox', ringBBox(r).map(v => v.toFixed(2)));

require('fs').writeFileSync('russia_clipped.json', JSON.stringify(outRings));
console.log('scritto russia_clipped.json');
