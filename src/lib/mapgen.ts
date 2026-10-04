/**
 * Maps background generator (runs at build time from MapsWindow.astro, so the browser gets
 * plain SVG and nothing is computed on open). Seeded, so a given seed always draws the same map.
 *
 * Drawn bottom to top: land → land use (residential / commercial) → minor streets → parks →
 * lake + river → roads (casings, bridges, fills) → route → shields → labels → pins.
 *
 *   Water: a lake at the start, a river of varying width running from it across the map.
 *   Roads: an arterial on each bank, an outer road on each bank (one is the highway), roads
 *     across the river on bridges, and a short connector from each stop to its arterial.
 *     The route is the shortest path through that network (Dijkstra), so it follows roads,
 *     turns at intersections and only crosses the water on bridges.
 *   Streets: neighbourhood patches (irregular polygons), each with two sets of evenly spaced,
 *     roughly perpendicular streets clipped to the patch; a few curvy suburban ones.
 *   Parks: small irregular polygons, some on the riverbank, kept off the roads.
 *
 * Everything is in map units (mapSize in src/data/route.ts). Labels are sized for zoom 1;
 * the client keeps them the same on-screen size when zooming in, so a layout with no
 * overlaps at zoom 1 stays overlap-free.
 */
import type { MapLabel, MapLabelType, PoiCategory } from '../data/mapLabels';
import type { Stop } from '../data/route';

// ---- Tunables (map units) ----
const EDGE = 64; // labels keep this far from the map edges
const RIVER = { width: 82, widthVar: 16, wide: 130, narrow: 30, minMarginY: 420 };
const LAKE = { x: 90, r: 360 };
const STOP = { bankGap: [24, 105] as const, flip: 0.45, gap: [0.65, 1.4] as const };
export const PIN = { r: 18, head: 28, labelGap: 8 }; // round head of radius r, centred `head` above the tip
const ROADS = { innerGap: 60, outerGap: [230, 290] as const, crossings: 7 };
const PATCH = { count: 30, r: [160, 290] as const, spacing: [26, 38] as const, stretch: [1, 1.9] as const, curvy: 0.22, commercial: 0.24 };
const PARKS = { random: 26, r: [30, 85] as const };
export const FONT = { stop: 22, neighbourhood: 20, street: 13, road: 14, park: 16, poi: 16, water: 20, lake: 30 };
export const POI_ICON = { r: 12, gap: 6 };

type Pt = [number, number];
type RoadKind = 'arterial' | 'highway' | 'connector';
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PlacedStop extends Stop {
  x: number;
  y: number;
  side: 1 | -1; // which bank (+1 = below the river)
  labelSide: 'left' | 'right';
}

export interface PlacedLabel {
  text: string;
  type: MapLabelType;
  category?: PoiCategory;
  x: number;
  y: number;
  // 'upright': always upright. 'path': follows a road/street/river along pathD (local coords);
  // pathRevD is the same curve reversed, used when the map is rotated past 90° so it never
  // reads upside down. angle = the curve's overall direction (degrees).
  kind: 'upright' | 'path';
  angle: number;
  pathD?: string;
  pathRevD?: string;
  w: number;
  h: number;
}

export interface GeneratedMap {
  width: number;
  height: number;
  lakeD: string;
  riverD: string;
  landuse: { d: string; kind: 'residential' | 'commercial' }[];
  streetsD: string[];
  parksD: string[];
  roads: { d: string; kind: RoadKind }[];
  bridges: { d: string; kind: RoadKind }[];
  shields: { x: number; y: number; text: string }[];
  routeD: string;
  stops: PlacedStop[];
  labels: PlacedLabel[];
  skipped: string[];
  hidden: string[];
}

// ---- Seeded random (mulberry32) ----
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (min: number, max: number) => min + next() * (max - min) };
}

// ---- Geometry helpers ----
const r1 = (n: number) => Math.round(n * 10) / 10;
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const boxAround = (x: number, y: number, w: number, h: number, pad = 6): Box => ({
  x0: x - w / 2 - pad,
  y0: y - h / 2 - pad,
  x1: x + w / 2 + pad,
  y1: y + h / 2 + pad,
});
const boxOfPoints = (pts: Pt[], pad: number): Box => ({
  x0: Math.min(...pts.map((p) => p[0])) - pad,
  y0: Math.min(...pts.map((p) => p[1])) - pad,
  x1: Math.max(...pts.map((p) => p[0])) + pad,
  y1: Math.max(...pts.map((p) => p[1])) + pad,
});
const inPoly = (p: Pt, poly: Pt[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const polyD = (pts: Pt[], closed = false) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p[0])} ${Math.round(p[1])}`).join('') + (closed ? 'Z' : '');

// Text width estimate (no font metrics at build time; slightly generous on purpose)
export function textWidth(text: string, type: MapLabelType | 'stop' | 'lake') {
  const size = FONT[type];
  if (type === 'neighbourhood') return text.length * size * 0.7 + text.length * 2.5;
  if (type === 'street' || type === 'road') return text.length * size * 0.7 + text.length * 1.2; // spaced capitals
  if (type === 'park' || type === 'poi') return text.length * size * 0.56 + POI_ICON.r * 2 + POI_ICON.gap;
  if (type === 'stop') return text.length * size * 0.56;
  return text.length * size * 0.52;
}

// Smooth path through points (Catmull-Rom → cubic Bézier)
function smoothPath(p: Pt[], closed = false): string {
  if (p.length < 2) return '';
  const n = p.length;
  const at = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(p[0][0])} ${r1(p[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

// A stretch of a polyline `len` long centred on point i (or null if it runs out / bends too much)
function stretchAround(pts: Pt[], i: number, len: number, maxBendDeg = 32): Pt[] | null {
  const walk = (dir: 1 | -1) => {
    const out: Pt[] = [];
    let left = len / 2;
    let j = i;
    while (left > 0) {
      const k = j + dir;
      if (k < 0 || k >= pts.length) return null;
      const d = dist(pts[j], pts[k]);
      if (d >= left) {
        const t = left / d;
        out.push([pts[j][0] + (pts[k][0] - pts[j][0]) * t, pts[j][1] + (pts[k][1] - pts[j][1]) * t]);
        left = 0;
      } else {
        out.push(pts[k]);
        left -= d;
      }
      j = k;
    }
    return out;
  };
  const back = walk(-1);
  const fwd = walk(1);
  if (!back || !fwd) return null;
  const s: Pt[] = [...back.reverse(), pts[i], ...fwd];
  const a1 = Math.atan2(pts[i][1] - s[0][1], pts[i][0] - s[0][0]);
  const a2 = Math.atan2(s[s.length - 1][1] - pts[i][1], s[s.length - 1][0] - pts[i][0]);
  let bend = Math.abs(a1 - a2) * (180 / Math.PI);
  if (bend > 180) bend = 360 - bend;
  return bend > maxBendDeg ? null : s;
}

// Resample a polyline to roughly even spacing
function resample(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = dist(a, b);
    let t = step - carry;
    while (t <= d) {
      out.push([a[0] + ((b[0] - a[0]) * t) / d, a[1] + ((b[1] - a[1]) * t) / d]);
      t += step;
    }
    carry = d - (t - step);
  }
  if (dist(out[out.length - 1], pts[pts.length - 1]) > 1) out.push(pts[pts.length - 1]);
  return out;
}

export function generateMap(opts: {
  seed: number;
  size: { width: number; height: number };
  stops: Stop[];
  labels: MapLabel[];
  shields?: string[];
}): GeneratedMap {
  const { width: W, height: H } = opts.size;
  const R = rng(opts.seed);
  const skipped: string[] = [];

  // ---------- River: y as a gentle function of x ----------
  const waves = [
    { a: R.range(80, 125), f: (2 * Math.PI) / R.range(1500, 2100), p: R.range(0, 6.28) },
    { a: R.range(30, 55), f: (2 * Math.PI) / R.range(650, 900), p: R.range(0, 6.28) },
    { a: R.range(10, 20), f: (2 * Math.PI) / R.range(280, 360), p: R.range(0, 6.28) },
  ];
  const widthWave = { f: (2 * Math.PI) / R.range(600, 900), p: R.range(0, 6.28) };
  const midY = H * R.range(0.46, 0.54);
  const xWide = R.range(W * 0.45, W * 0.75);
  let xNarrow = R.range(W * 0.25, W * 0.9);
  for (let t = 0; t < 20 && Math.abs(xNarrow - xWide) < 600; t++) xNarrow = R.range(W * 0.25, W * 0.9);
  const riverY = (x: number) => {
    const y = midY + waves.reduce((s, w) => s + w.a * Math.sin(x * w.f + w.p), 0);
    return Math.max(RIVER.minMarginY, Math.min(H - RIVER.minMarginY, y));
  };
  const riverW = (x: number) =>
    Math.max(
      46,
      RIVER.width +
        RIVER.widthVar * Math.sin(x * widthWave.f + widthWave.p) +
        RIVER.wide * Math.exp(-(((x - xWide) / 230) ** 2)) -
        RIVER.narrow * Math.exp(-(((x - xNarrow) / 200) ** 2)),
    );
  const slope = (x: number) => (riverY(x + 2) - riverY(x - 2)) / 4;
  const normal = (x: number): Pt => {
    const s = slope(x);
    const l = Math.hypot(1, s);
    return [-s / l, 1 / l];
  };
  const riverDist = (x: number, y: number) => (y - riverY(x)) * Math.cos(Math.atan(slope(x)));
  const bankPoint = (x: number, side: number, gap: number): Pt => {
    const n = normal(x);
    const off = riverW(x) / 2 + gap;
    return [x + n[0] * side * off, riverY(x) + n[1] * side * off];
  };

  // ---------- Lake at the start (irregular round shape) ----------
  const LY = riverY(LAKE.x);
  const harmonics = [
    { a: R.range(0.06, 0.11), k: 2, p: R.range(0, 6.28) },
    { a: R.range(0.04, 0.07), k: 3, p: R.range(0, 6.28) },
    { a: R.range(0.02, 0.04), k: 5, p: R.range(0, 6.28) },
  ];
  const lakeR = (th: number) => LAKE.r * (1 + harmonics.reduce((s, h) => s + h.a * Math.sin(h.k * th + h.p), 0));
  const inLake = (x: number, y: number, m = 0) =>
    Math.hypot(x - LAKE.x, y - LY) < lakeR(Math.atan2(y - LY, x - LAKE.x)) + m;
  const lakeEast = LAKE.x + lakeR(0);

  const inRiver = (x: number, y: number, m = 0) => x > LAKE.x && Math.abs(riverDist(x, y)) < riverW(x) / 2 + m;
  const onWater = (x: number, y: number, m = 0) => inLake(x, y, m) || inRiver(x, y, m);
  const boxOnWater = (b: Box, m = 4) => {
    for (let i = 0; i <= 4; i++) {
      const x = b.x0 + ((b.x1 - b.x0) * i) / 4;
      if (onWater(x, b.y0, m) || onWater(x, b.y1, m) || onWater(x, (b.y0 + b.y1) / 2, m)) return true;
    }
    const cx = (b.x0 + b.x1) / 2;
    return cx > LAKE.x && Math.sign(riverDist(cx, b.y0)) !== Math.sign(riverDist(cx, b.y1));
  };

  const lakePts: Pt[] = [];
  for (let i = 0; i < 36; i++) {
    const th = (i / 36) * Math.PI * 2;
    lakePts.push([LAKE.x + Math.cos(th) * lakeR(th), LY + Math.sin(th) * lakeR(th)]);
  }
  const lakeD = smoothPath(lakePts, true);
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let x = LAKE.x; x <= W + 80; x += 20) {
    top.push(bankPoint(x, -1, 0));
    bottom.push(bankPoint(x, 1, 0));
  }
  const riverD = smoothPath(top) + smoothPath(bottom.reverse()).replace(/^M/, 'L') + 'Z';

  // ---------- Stops: near the river, uneven spacing and distances ----------
  const stopLabelText = (s: Stop) => `${s.city} · ${s.dates.replace(/\s*–\s*/g, '–')}`;
  const pinBox = (x: number, y: number): Box => ({
    x0: x - PIN.r * 1.45,
    y0: y - PIN.head - PIN.r * 1.45,
    x1: x + PIN.r * 1.45,
    y1: y + 6,
  });
  const stopLabelBox = (x: number, y: number, text: string, side: 'left' | 'right'): Box => {
    const w = textWidth(text, 'stop');
    const h = FONT.stop * 1.3;
    const cy = y - PIN.head;
    const x0 = side === 'right' ? x + PIN.r * 1.45 + PIN.labelGap : x - PIN.r * 1.45 - PIN.labelGap - w;
    return { x0: x0 - 4, y0: cy - h / 2 - 4, x1: x0 + w + 4, y1: cy + h / 2 + 4 };
  };
  const inside = (b: Box) => b.x0 > EDGE && b.y0 > EDGE && b.x1 < W - EDGE && b.y1 < H - EDGE;

  const n = opts.stops.length;
  let placed: PlacedStop[] = [];
  let laidOut = false;
  for (let attempt = 0; attempt < 800 && !laidOut; attempt++) {
    const x0 = lakeEast + 90;
    const x1 = W * 0.93;
    const gaps = opts.stops.map((_, i) => (i === 0 ? 0 : R.range(STOP.gap[0], STOP.gap[1])));
    const total = gaps.reduce((a, b) => a + b, 0);
    let acc = 0;
    let side: 1 | -1 = R.next() < 0.5 ? 1 : -1;
    const taken: Box[] = [];
    placed = [];
    laidOut = true;
    for (const [i, s] of opts.stops.entries()) {
      acc += gaps[i];
      if (i > 0 && R.next() < STOP.flip) side = (side * -1) as 1 | -1;
      const xr = x0 + ((x1 - x0) * acc) / total;
      const text = stopLabelText(s);
      // A few distances from the bank and both label sides before giving up on this layout
      let ok = false;
      for (let t = 0; t < 14 && !ok; t++) {
        const [x, y] =
          s.x !== undefined && s.y !== undefined ? [s.x, s.y] : bankPoint(xr, side, R.range(STOP.bankGap[0], STOP.bankGap[1]));
        for (const labelSide of (R.next() < 0.8 ? ['right', 'left'] : ['left', 'right']) as ('left' | 'right')[]) {
          const boxes = [pinBox(x, y), stopLabelBox(x, y, text, labelSide)];
          if (!boxes.every(inside) || boxes.some((b) => boxOnWater(b, 6)) || boxes.some((b) => taken.some((o) => overlaps(o, b)))) continue;
          taken.push(...boxes);
          placed.push({ ...s, x, y, side: (riverDist(x, y) >= 0 ? 1 : -1) as 1 | -1, labelSide });
          ok = true;
          break;
        }
      }
      if (!ok) {
        laidOut = false;
        break;
      }
    }
  }
  if (!laidOut) skipped.push('(stops: no layout without overlaps; try another seed or set x/y in route.ts)');

  const obstacles: Box[] = placed.flatMap((s) => [pinBox(s.x, s.y), stopLabelBox(s.x, s.y, stopLabelText(s), s.labelSide)]);

  // ---------- Roads ----------
  interface Poly {
    pts: Pt[];
    kind: RoadKind;
    label: boolean; // can carry a road name
    crossing?: boolean; // runs across the river
  }
  const polys: Poly[] = [];
  const bankGapOf = (s: PlacedStop) => Math.abs(riverDist(s.x, s.y)) - riverW(s.x) / 2;
  // River centre averaged over ±reach: gentler curves for roads further from the water
  const riverYSmooth = (x: number, reach: number) => {
    let sum = 0;
    let k = 0;
    for (let d = -reach; d <= reach; d += 20, k++) sum += riverY(x + d);
    return sum / k;
  };
  const hwySide = R.next() < 0.5 ? 1 : -1;
  const innerFor: Record<number, number> = {};
  const smoothSlope = (x: number, reach: number) => (riverYSmooth(x + 4, reach) - riverYSmooth(x - 4, reach)) / 8;
  for (const side of [-1, 1]) {
    // Riverside road: runs through this bank's stops (their distance from the water,
    // interpolated between them), so the route travels along it instead of zigzagging
    const onSide = placed.filter((s) => s.side === side).sort((a, b) => a.x - b.x);
    const gapAt = (x: number) => {
      if (!onSide.length) return 120;
      if (x <= onSide[0].x) return bankGapOf(onSide[0]);
      if (x >= onSide[onSide.length - 1].x) return bankGapOf(onSide[onSide.length - 1]);
      const k = onSide.findIndex((s) => s.x >= x);
      const [a, b] = [onSide[k - 1], onSide[k]];
      const t = (x - a.x) / (b.x - a.x);
      const e = t * t * (3 - 2 * t); // ease between stops
      return bankGapOf(a) + (bankGapOf(b) - bankGapOf(a)) * e;
    };
    const runs: Pt[][] = [];
    let run: Pt[] = [];
    const xs: number[] = [];
    for (let x = lakeEast - 200; x <= W + 60; x += 22) xs.push(x);
    onSide.forEach((s) => xs.push(s.x)); // exact vertices at the stops
    xs.sort((a, b) => a - b);
    for (const x of xs) {
      const pt = bankPoint(x, side, gapAt(x));
      if (inLake(pt[0], pt[1], 40)) {
        if (run.length > 1) runs.push(run);
        run = [];
      } else run.push(pt);
    }
    if (run.length > 1) runs.push(run);
    const longest = runs.sort((a, b) => b.length - a.length)[0];
    innerFor[side] = polys.length;
    polys.push({ pts: longest, kind: 'arterial', label: true });

    // Outer road (one bank's is the highway): offset straight up/down from a smoothed river,
    // so it follows the river's general shape without looping at bends
    const outer = Math.max(110, ...onSide.map(bankGapOf)) + R.range(ROADS.outerGap[0], ROADS.outerGap[1]);
    const kind: RoadKind = side === hwySide ? 'highway' : 'arterial';
    const f = (2 * Math.PI) / R.range(700, 1100);
    const p = R.range(0, 6.28);
    const oruns: Pt[][] = [];
    run = [];
    for (let x = lakeEast - 200; x <= W + 60; x += 22) {
      const off = (riverW(x) / 2 + outer + 30 * Math.sin(x * f + p)) / Math.cos(Math.atan(smoothSlope(x, 300)));
      const pt: Pt = [x, riverYSmooth(x, 300) + side * off];
      if (inLake(pt[0], pt[1], 40)) {
        if (run.length > 1) oruns.push(run);
        run = [];
      } else run.push(pt);
    }
    if (run.length > 1) oruns.push(run);
    const olong = oruns.sort((a, b) => b.length - a.length)[0];
    if (olong) polys.push({ pts: olong, kind, label: true });
  }
  // Roads across the river, kept off the pins
  const span = W * 0.93 - (lakeEast + 120);
  for (let k = 0; k < ROADS.crossings; k++) {
    let xk = 0;
    for (let t = 0; t < 40; t++) {
      xk = lakeEast + 120 + (span * (k + 0.5)) / ROADS.crossings + R.range(-70, 70);
      if (placed.every((s) => Math.abs(s.x - xk) > 95)) break;
    }
    const f = (2 * Math.PI) / R.range(900, 1500);
    const p = R.range(0, 6.28);
    const tilt = R.range(-0.12, 0.12);
    let run: Pt[] = [];
    for (let y = -60; y <= H + 60; y += 22) {
      const pt: Pt = [xk + 40 * Math.sin(y * f + p) + (y - H / 2) * tilt, y];
      if (inLake(pt[0], pt[1], 40)) {
        if (run.length > 1) polys.push({ pts: run, kind: 'arterial', label: true, crossing: true });
        run = [];
      } else run.push(pt);
    }
    if (run.length > 1) polys.push({ pts: run, kind: 'arterial', label: true, crossing: true });
  }
  // Connector from each stop to the nearest point of its bank's arterial
  const stopPoly: number[] = [];
  const connectorEnd: number[] = [];
  placed.forEach((s) => {
    const art = polys[innerFor[s.side]];
    let best = 0;
    art.pts.forEach((p, i) => {
      if (dist(p, [s.x, s.y]) < dist(art.pts[best], [s.x, s.y])) best = i;
    });
    const target = art.pts[best];
    // The riverside road runs through the stop, so this is usually a zero-length join
    const mid: Pt = [(s.x + target[0]) / 2, (s.y + target[1]) / 2];
    const pts = dist([s.x, s.y], target) < 4 ? [[s.x, s.y] as Pt, target] : resample([[s.x, s.y], mid, target], 18);
    pts[pts.length - 1] = target;
    stopPoly.push(polys.length);
    connectorEnd.push(best);
    polys.push({ pts, kind: 'connector', label: false });
  });

  // ---------- Road graph: vertices + intersections → shortest paths ----------
  let nextId = 0;
  const pos: Pt[] = [];
  const vid = (p: Pt) => {
    pos.push(p);
    return nextId++;
  };
  const ids = polys.map((pl) => pl.pts.map(vid));
  // Connectors share their end vertex with the arterial they meet
  placed.forEach((s, i) => {
    ids[stopPoly[i]][polys[stopPoly[i]].pts.length - 1] = ids[innerFor[s.side]][connectorEnd[i]];
  });
  const inserts: { seg: number; t: number; id: number }[][] = polys.map(() => []);
  const segBox = (a: Pt, b: Pt) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const A = polys[i].pts;
      const B = polys[j].pts;
      for (let a = 0; a < A.length - 1; a++) {
        const ba = segBox(A[a], A[a + 1]);
        for (let b = 0; b < B.length - 1; b++) {
          const bb = segBox(B[b], B[b + 1]);
          if (ba[2] < bb[0] || bb[2] < ba[0] || ba[3] < bb[1] || bb[3] < ba[1]) continue;
          const [p1, p2, p3, p4] = [A[a], A[a + 1], B[b], B[b + 1]];
          const den = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
          if (Math.abs(den) < 1e-9) continue;
          const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / den;
          const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const id = vid([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
          inserts[i].push({ seg: a, t, id });
          inserts[j].push({ seg: b, t: u, id });
        }
      }
    }
  }
  const cost: Record<RoadKind, number> = { highway: 0.9, arterial: 1, connector: 1.1 };
  const adj: { to: number; w: number }[][] = [];
  const link = (a: number, b: number, w: number) => {
    (adj[a] ??= []).push({ to: b, w });
    (adj[b] ??= []).push({ to: a, w });
  };
  polys.forEach((pl, i) => {
    const order: number[] = [];
    for (let s = 0; s < pl.pts.length; s++) {
      order.push(ids[i][s]);
      inserts[i]
        .filter((x) => x.seg === s)
        .sort((a, b) => a.t - b.t)
        .forEach((x) => order.push(x.id));
    }
    for (let k = 1; k < order.length; k++) {
      if (order[k] !== order[k - 1]) link(order[k - 1], order[k], dist(pos[order[k - 1]], pos[order[k]]) * cost[pl.kind]);
    }
  });
  const shortest = (from: number, to: number): number[] => {
    const d = new Array(nextId).fill(Infinity);
    const prev = new Array(nextId).fill(-1);
    const done = new Uint8Array(nextId);
    d[from] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < nextId; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
      if (u < 0 || u === to) break;
      done[u] = 1;
      for (const e of adj[u] ?? []) {
        if (d[u] + e.w < d[e.to]) {
          d[e.to] = d[u] + e.w;
          prev[e.to] = u;
        }
      }
    }
    const path: number[] = [];
    for (let v = to; v >= 0; v = prev[v]) path.unshift(v);
    return path[0] === from ? path : [from, to];
  };
  const routePts: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const path = shortest(ids[stopPoly[i]][0], ids[stopPoly[i + 1]][0]).map((v) => pos[v]);
    routePts.push(...(i === 0 ? path : path.slice(1)));
  }
  const routeD = polyD(routePts);
  resample(routePts, 30).forEach(([x, y]) => obstacles.push({ x0: x - 15, y0: y - 15, x1: x + 15, y1: y + 15 }));

  // ---------- Bridges: road over water, with an outline ----------
  const bridges: { d: string; kind: RoadKind }[] = [];
  for (const pl of polys) {
    if (!pl.crossing) continue;
    for (let i = 1; i < pl.pts.length; i++) {
      const [a, b] = [pl.pts[i - 1], pl.pts[i]];
      if (a[0] <= LAKE.x || Math.sign(riverDist(a[0], a[1])) === Math.sign(riverDist(b[0], b[1]))) continue;
      const reach = riverW(b[0]) / 2 + 24;
      const seg = pl.pts.filter((p) => dist(p, b) <= reach + 22);
      if (seg.length >= 2) bridges.push({ d: polyD(seg), kind: pl.kind });
    }
  }

  // ---------- Highway shields ----------
  const shields: { x: number; y: number; text: string }[] = [];
  const hwy = polys.find((p) => p.kind === 'highway');
  if (hwy) {
    (opts.shields ?? []).forEach((text, k, all) => {
      for (let t = 0; t < 30; t++) {
        const i = Math.floor(hwy.pts.length * ((k + 1) / (all.length + 1) + (t % 2 ? 1 : -1) * t * 0.01));
        const p = hwy.pts[Math.max(0, Math.min(hwy.pts.length - 1, i))];
        const box = boxAround(p[0], p[1], 34 + text.length * 8, 30, 8);
        if (!inside(box) || obstacles.some((o) => overlaps(o, box))) continue;
        shields.push({ x: Math.round(p[0]), y: Math.round(p[1]), text });
        obstacles.push(box);
        break;
      }
    });
  }

  // ---------- Neighbourhood patches: land use + clipped street grids ----------
  interface Run {
    pts: Pt[];
  }
  interface Patch {
    cx: number;
    cy: number;
    r: number;
    poly: Pt[];
    runs: Run[];
  }
  const patches: Patch[] = [];
  const landuse: GeneratedMap['landuse'] = [];
  const streetsD: string[] = [];
  for (let tries = 0; tries < 4000 && patches.length < PATCH.count; tries++) {
    const cx = R.range(-60, W + 60);
    const cy = R.range(-60, H + 60);
    const r = R.range(PATCH.r[0], PATCH.r[1]);
    if (onWater(cx, cy, 50)) continue;
    if (patches.some((p) => Math.hypot(p.cx - cx, p.cy - cy) < (p.r + r) * 0.8)) continue;
    const k = 7 + Math.floor(R.next() * 3);
    const poly: Pt[] = [];
    for (let i = 0; i < k; i++) {
      const th = ((i + R.range(-0.25, 0.25)) / k) * Math.PI * 2;
      const rr = r * R.range(0.72, 1.08);
      poly.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]);
    }
    const angle = R.next() < 0.5 ? Math.atan(slope(cx)) + R.range(-0.3, 0.3) : R.range(-0.9, 0.9);
    const a = R.range(PATCH.spacing[0], PATCH.spacing[1]);
    const b = a * R.range(PATCH.stretch[0], PATCH.stretch[1]);
    const skew = R.range(-0.08, 0.08);
    const wob = R.next() < PATCH.curvy ? { a: R.range(10, 22), f: (2 * Math.PI) / R.range(220, 420), p: R.range(0, 6.28) } : null;
    const earlier = [...patches];
    const keep = (p: Pt) => inPoly(p, poly) && !earlier.some((q) => inPoly(p, q.poly)) && !onWater(p[0], p[1], 12);
    const runs: Run[] = [];
    let d = '';
    for (const dir of [0, 1]) {
      const th = angle + (dir ? Math.PI / 2 + skew : 0);
      const u: Pt = [Math.cos(th), Math.sin(th)];
      const v: Pt = [-Math.sin(th), Math.cos(th)];
      const gap = dir ? b : a;
      const reach = r * 1.15;
      for (let line = -Math.ceil(reach / gap); line <= Math.ceil(reach / gap); line++) {
        let run: Pt[] = [];
        const flush = () => {
          if (run.length >= 2) {
            runs.push({ pts: run });
            d += polyD(wob ? run.filter((_, i) => i % 2 === 0 || i === run.length - 1) : [run[0], run[run.length - 1]]);
          }
          run = [];
        };
        for (let t = -reach; t <= reach; t += 10) {
          const off = line * gap + (wob ? wob.a * Math.sin(t * wob.f + wob.p + line * 0.6) : 0);
          const p: Pt = [cx + u[0] * t + v[0] * off, cy + u[1] * t + v[1] * off];
          if (keep(p)) run.push(p);
          else flush();
        }
        flush();
      }
    }
    patches.push({ cx, cy, r, poly, runs });
    landuse.push({ d: polyD(poly, true), kind: R.next() < PATCH.commercial ? 'commercial' : 'residential' });
    if (d) streetsD.push(d);
  }

  // ---------- Parks: small irregular polygons, off the roads ----------
  const roadPts: Pt[] = polys.flatMap((p) => resample(p.pts, 16));
  const nearRoad = (x: number, y: number, r: number) => roadPts.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < r * r);
  const parks: { cx: number; cy: number; r: number }[] = [];
  const parksD: string[] = [];
  const parkPoly = (cx: number, cy: number, r: number) => {
    const k = 6 + Math.floor(R.next() * 5);
    const pts: Pt[] = [];
    for (let i = 0; i < k; i++) {
      const th = ((i + R.range(-0.3, 0.3)) / k) * Math.PI * 2;
      const rr = r * R.range(0.62, 1.12);
      pts.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]);
    }
    return polyD(pts, true);
  };
  const parkOk = (cx: number, cy: number, r: number, bank = false, named = false) => {
    if (!bank && onWater(cx, cy, r * 1.15)) return false;
    if (bank && onWater(cx, cy, r * 0.25)) return false;
    if (nearRoad(cx, cy, r * (named ? 0.95 : 1.12) + 10)) return false;
    if (cx - r < 0 || cx + r > W || cy - r < 0 || cy + r > H) return false;
    return parks.every((p) => Math.hypot(p.cx - cx, p.cy - cy) > p.r + r + 30);
  };
  const addPark = (cx: number, cy: number, r: number) => {
    parks.push({ cx, cy, r });
    parksD.push(parkPoly(cx, cy, r));
  };

  // ---------- Labels ----------
  const labels: PlacedLabel[] = [];
  const hidden: string[] = [];
  const free = (b: Box) => inside(b) && obstacles.every((o) => !overlaps(o, b));
  const stopById = Object.fromEntries(placed.map((s) => [s.id, s]));
  const ringCandidates = (s: PlacedStop | undefined, rMin: number, rMax: number): Pt[] => {
    const out: Pt[] = [];
    if (s) {
      for (let r = rMin; r <= rMax; r += 36) {
        const k = Math.round((2 * Math.PI * r) / 70);
        const off = R.next() * Math.PI * 2;
        for (let i = 0; i < k; i++) out.push([s.x + Math.cos(off + (i / k) * Math.PI * 2) * r, s.y - PIN.head + Math.sin(off + (i / k) * Math.PI * 2) * r]);
      }
    } else {
      for (let i = 0; i < 700; i++) out.push([R.range(EDGE, W - EDGE), R.range(EDGE, H - EDGE)]);
    }
    return out;
  };
  const h = (t: MapLabelType | 'lake') => FONT[t] * 1.3;
  // A label along a stretch of road/street/river: local path + reversed copy
  const pathLabel = (l: MapLabel, stretch: Pt[], w: number, hh: number): { label: PlacedLabel; box: Box } => {
    let s = stretch;
    if (s[s.length - 1][0] < s[0][0]) s = [...s].reverse(); // reads left to right
    const mid = s[Math.floor(s.length / 2)];
    const local = s.map((p) => [p[0] - mid[0], p[1] - mid[1]] as Pt);
    const ang = (Math.atan2(s[s.length - 1][1] - s[0][1], s[s.length - 1][0] - s[0][0]) * 180) / Math.PI;
    return {
      label: {
        text: l.text,
        type: l.type,
        x: r1(mid[0]),
        y: r1(mid[1]),
        kind: 'path',
        angle: r1(ang),
        pathD: smoothPath(local),
        pathRevD: smoothPath([...local].reverse()),
        w: Math.round(w),
        h: Math.round(hh),
      },
      box: boxOfPoints(s, hh / 2 + 3),
    };
  };
  const order: MapLabelType[] = ['water', 'park', 'poi', 'road', 'neighbourhood', 'street'];
  const queue = [...opts.labels].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  for (const l of queue) {
    if (/\[[^\]]*\]/.test(l.text)) {
      hidden.push(l.text); // placeholder: hidden until filled in
      continue;
    }
    const s = l.nearStop ? stopById[l.nearStop] : undefined;
    let done = false;

    if (l.type === 'water' && l.on === 'lake') {
      const w = textWidth(l.text, 'lake');
      for (let t = 0; t < 600 && !done; t++) {
        const x = R.range(EDGE + w / 2, lakeEast - w / 2);
        const y = LY + R.range(-LAKE.r * 0.6, LAKE.r * 0.6);
        const box = boxAround(x, y, w, h('lake'), 4);
        const corners: Pt[] = [
          [box.x0, box.y0],
          [box.x1, box.y0],
          [box.x0, box.y1],
          [box.x1, box.y1],
        ];
        if (!free(box) || !corners.every((c) => inLake(c[0], c[1], -14))) continue;
        labels.push({ text: l.text, type: l.type, x: r1(x), y: r1(y), kind: 'upright', angle: 0, w: Math.round(w), h: Math.round(h('lake')) });
        obstacles.push(box);
        done = true;
      }
    } else if (l.type === 'water') {
      // Along the river's centre line, where it's wide enough
      const w = textWidth(l.text, 'water');
      const centre: Pt[] = [];
      for (let x = lakeEast + 60; x <= W - EDGE; x += 10) centre.push([x, riverY(x)]);
      const idx = [...centre.keys()].sort(() => R.next() - 0.5);
      for (const i of idx) {
        if (riverW(centre[i][0]) < FONT.water * 1.9) continue;
        const st = stretchAround(centre, i, w + 30, 26);
        if (!st) continue;
        const { label, box } = pathLabel(l, st, w, h('water'));
        if (!free(box)) continue;
        labels.push(label);
        obstacles.push(box);
        done = true;
        break;
      }
    } else if (l.type === 'park') {
      // Each named park gets its own patch, badge + name in the middle
      const w = textWidth(l.text, 'park');
      // The name can run past the green, like Apple Maps; the park just needs to sit under it
      const r = Math.max(44, w * 0.3);
      for (const [cx, cy] of ringCandidates(s, 120, 640)) {
        if (!parkOk(cx, cy, r, false, true)) continue;
        const parkBox: Box = { x0: cx - Math.max(r, w / 2), y0: cy - r, x1: cx + Math.max(r, w / 2), y1: cy + r };
        if (!free(parkBox)) continue;
        addPark(cx, cy, r);
        labels.push({ text: l.text, type: l.type, category: l.category ?? 'park', x: r1(cx), y: r1(cy), kind: 'upright', angle: 0, w: Math.round(w), h: Math.round(h('park')) });
        obstacles.push(parkBox);
        done = true;
        break;
      }
    } else if (l.type === 'poi' || l.type === 'neighbourhood') {
      const w = textWidth(l.text, l.type);
      for (const [x, y] of ringCandidates(s, 120, 480)) {
        const box = boxAround(x, y, w, h(l.type));
        if (!free(box) || boxOnWater(box, 8)) continue;
        labels.push({ text: l.text, type: l.type, category: l.category, x: r1(x), y: r1(y), kind: 'upright', angle: 0, w: Math.round(w), h: Math.round(h(l.type)) });
        obstacles.push(box);
        done = true;
        break;
      }
    } else if (l.type === 'road') {
      // Along a road that can carry a name (not the connectors), near its stop if it has one
      const w = textWidth(l.text, 'road');
      const cands: { pl: Pt[]; i: number; d: number }[] = [];
      polys
        .filter((p) => p.label)
        .forEach((p) => {
          const pts = resample(p.pts, 10);
          for (let i = 0; i < pts.length; i += 3) {
            const d = s ? dist(pts[i], [s.x, s.y]) : R.next() * 1000;
            if (s && (d < 110 || d > 700)) continue;
            cands.push({ pl: pts, i, d });
          }
        });
      cands.sort((a, b) => a.d - b.d);
      for (const c of cands) {
        const st = stretchAround(c.pl, c.i, w + 24);
        if (!st) continue;
        const { label, box } = pathLabel(l, st, w, h('road'));
        if (!free(box) || boxOnWater(box, 2)) continue;
        labels.push(label);
        obstacles.push(box);
        done = true;
        break;
      }
    } else if (l.type === 'street') {
      // Along a street in a patch near the stop
      const w = textWidth(l.text, 'street');
      const near = [...patches].sort((a, b) =>
        s ? Math.hypot(a.cx - s.x, a.cy - s.y) - Math.hypot(b.cx - s.x, b.cy - s.y) : R.next() - 0.5,
      );
      for (const p of near.slice(0, s ? 5 : near.length)) {
        const runs = p.runs.filter((r) => r.pts.length * 10 > w + 40).sort(() => R.next() - 0.5);
        for (const run of runs) {
          const i = Math.floor(run.pts.length / 2 + R.range(-0.25, 0.25) * run.pts.length);
          if (s && dist(run.pts[i], [s.x, s.y]) > 520) continue;
          const st = stretchAround(run.pts, i, w + 20);
          if (!st) continue;
          const { label, box } = pathLabel(l, st, w, h('street'));
          if (!free(box) || boxOnWater(box, 6)) continue;
          labels.push(label);
          obstacles.push(box);
          done = true;
          break;
        }
        if (done) break;
      }
    }
    if (!done) skipped.push(l.text);
  }

  // Unnamed parks: some on the riverbank, the rest scattered
  for (let k = 0, tries = 0; k < PARKS.random && tries < 3000; tries++) {
    const r = R.range(PARKS.r[0], PARKS.r[1]);
    const bank = k % 3 === 0;
    let cx: number;
    let cy: number;
    if (bank) {
      const x = R.range(lakeEast, W - 40);
      [cx, cy] = bankPoint(x, R.next() < 0.5 ? 1 : -1, r * 0.55);
    } else {
      cx = R.range(40, W - 40);
      cy = R.range(40, H - 40);
    }
    if (!parkOk(cx, cy, r, bank)) continue;
    const box: Box = { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
    if (obstacles.some((o) => overlaps(o, box))) continue;
    addPark(cx, cy, r);
    k++;
  }

  return {
    width: W,
    height: H,
    lakeD,
    riverD,
    landuse,
    streetsD,
    parksD,
    roads: polys.map((p) => ({ d: p.kind === 'connector' ? polyD(p.pts) : smoothPath(p.pts), kind: p.kind })),
    bridges,
    shields,
    routeD,
    stops: placed,
    labels,
    skipped,
    hidden,
  };
}

// Every page includes the Maps window, so generate once per build (and log once)
let cached: { key: string; map: GeneratedMap } | null = null;
export function getMap(opts: Parameters<typeof generateMap>[0]): GeneratedMap {
  const key = JSON.stringify(opts);
  if (cached?.key === key) return cached.map;
  const map = generateMap(opts);
  if (map.skipped.length) console.warn(`[maps] Labels skipped (no room without overlapping): ${map.skipped.join(', ')}`);
  if (map.hidden.length) console.info(`[maps] Placeholder labels hidden until filled in: ${map.hidden.join(', ')}`);
  cached = { key, map };
  return map;
}
