// Moteur de calcul (Web Worker) : rastérisation des espaces aériens, plus courts chemins, recuit simulé.
importScripts('geo.js');

const NB_DIRS = [];
for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) NB_DIRS.push([dx, dy, Math.hypot(dx, dy)]);

onmessage = (e) => {
  const m = e.data;
  if (m.type === 'prep') prep(m);
  else if (m.type === 'dijk') dijk(m);
  else if (m.type === 'sa') sa(m);
};

// ---------- 1. grille de coûts ----------
function prep(m) {
  const grid = GEO.makeGrid(m.cell);
  const { nx, ny, x0, y0, cell } = grid;
  const N = nx * ny;
  const cost = new Float32Array(N).fill(1);
  const state = new Uint8Array(N);
  const counts = [0, 0, 0, 0, 0];
  for (const z of m.zones) {
    const r = z.r, n = r.length / 2;
    const xs = new Float64Array(n), ys = new Float64Array(n);
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let k = 0; k < n; k++) {
      const [x, y] = GEO.laea(r[2 * k + 1] / 1000, r[2 * k] / 1000);
      xs[k] = x; ys[k] = y;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
    const j0 = Math.max(0, Math.floor((miny - y0) / cell)), j1 = Math.min(ny - 1, Math.floor((maxy - y0) / cell));
    let filled = 0;
    const cut = [];
    for (let j = j0; j <= j1; j++) {
      const yc = y0 + (j + 0.5) * cell;
      cut.length = 0;
      for (let k = 0, p = n - 1; k < n; p = k++) {
        const ya = ys[p], yb = ys[k];
        if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) cut.push(xs[p] + (yc - ya) * (xs[k] - xs[p]) / (yb - ya));
      }
      cut.sort((a, b) => a - b);
      for (let c = 0; c + 1 < cut.length; c += 2) {
        const i0 = Math.max(0, Math.ceil((cut[c] - x0) / cell - 0.5));
        const i1 = Math.min(nx - 1, Math.floor((cut[c + 1] - x0) / cell - 0.5));
        for (let i = i0; i <= i1; i++) {
          const idx = j * nx + i;
          if (z.s > state[idx]) { state[idx] = z.s; cost[idx] = m.factors[z.s]; }
          filled++;
        }
      }
    }
    if (!filled && n > 2) { // zone plus petite qu'une cellule : on marque la cellule du centre
      const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
      const i = Math.floor((cx - x0) / cell), j = Math.floor((cy - y0) / cell);
      if (i >= 0 && j >= 0 && i < nx && j < ny && z.s > state[j * nx + i]) { state[j * nx + i] = z.s; cost[j * nx + i] = m.factors[z.s]; }
    }
  }
  // mer : distance à la côte ; au-delà de seaMax km, la cellule devient quasi interdite (état 4)
  const coast = new Float32Array(N);
  if (m.land) {
    const land = new Uint8Array(N);
    for (const r of m.land) {
      const n = r.length / 2, xs = new Float64Array(n), ys = new Float64Array(n);
      let miny = 1e9, maxy = -1e9;
      for (let k = 0; k < n; k++) {
        const [x, y] = GEO.laea(r[2 * k + 1] / 1000, r[2 * k] / 1000);
        xs[k] = x; ys[k] = y; if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
      const j0 = Math.max(0, Math.floor((miny - y0) / cell)), j1 = Math.min(ny - 1, Math.floor((maxy - y0) / cell));
      const cut = [];
      for (let j = j0; j <= j1; j++) {
        const yc = y0 + (j + 0.5) * cell;
        cut.length = 0;
        for (let k = 0, p = n - 1; k < n; p = k++) {
          const ya = ys[p], yb = ys[k];
          if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) cut.push(xs[p] + (yc - ya) * (xs[k] - xs[p]) / (yb - ya));
        }
        cut.sort((a, b) => a - b);
        for (let c = 0; c + 1 < cut.length; c += 2) {
          const i0 = Math.max(0, Math.ceil((cut[c] - x0) / cell - 0.5)), i1 = Math.min(nx - 1, Math.floor((cut[c + 1] - x0) / cell - 0.5));
          for (let i = i0; i <= i1; i++) land[j * nx + i] = 1;
        }
      }
    }
    // distance (km) à la terre la plus proche : chamfer 2 passes
    const INF = 1e6, d2 = cell * Math.SQRT2;
    for (let k = 0; k < N; k++) coast[k] = land[k] ? 0 : INF;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i; let v = coast[k];
      if (i > 0) v = Math.min(v, coast[k - 1] + cell);
      if (j > 0) { v = Math.min(v, coast[k - nx] + cell); if (i > 0) v = Math.min(v, coast[k - nx - 1] + d2); if (i < nx - 1) v = Math.min(v, coast[k - nx + 1] + d2); }
      coast[k] = v;
    }
    for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) {
      const k = j * nx + i; let v = coast[k];
      if (i < nx - 1) v = Math.min(v, coast[k + 1] + cell);
      if (j < ny - 1) { v = Math.min(v, coast[k + nx] + cell); if (i < nx - 1) v = Math.min(v, coast[k + nx + 1] + d2); if (i > 0) v = Math.min(v, coast[k + nx - 1] + d2); }
      coast[k] = v;
    }
    for (let k = 0; k < N; k++) if (!land[k] && coast[k] > m.seaMax) { cost[k] = Math.max(cost[k], m.factors[3]); state[k] = 4; }
  }
  // les nœuds (balises + LFJY) sont dégagés sur 5x5 cellules
  const nodeCells = [], nodesXY = [];
  for (const nd of m.nodes) {
    const [x, y] = GEO.laea(nd.lat, nd.lon);
    nodesXY.push(x, y);
    const i = Math.max(0, Math.min(nx - 1, Math.floor((x - x0) / cell)));
    const j = Math.max(0, Math.min(ny - 1, Math.floor((y - y0) / cell)));
    for (let jj = Math.max(0, j - 2); jj <= Math.min(ny - 1, j + 2); jj++)
      for (let ii = Math.max(0, i - 2); ii <= Math.min(nx - 1, i + 2); ii++) { cost[jj * nx + ii] = 1; state[jj * nx + ii] = 0; }
    nodeCells.push(j * nx + i);
  }
  for (let k = 0; k < N; k++) counts[state[k]]++;
  const { wu, wv } = GEO.cellWind(grid, m.wind, m.windFactor);
  postMessage({ type: 'prep', grid, cost, state, wu, wv, coast, nodeCells, nodesXY, counts },
    [cost.buffer, state.buffer, wu.buffer, wv.buffer, coast.buffer]);
}

// ---------- 2. plus courts chemins ----------
class Heap {
  constructor() { this.k = new Float32Array(1 << 18); this.v = new Int32Array(1 << 18); this.n = 0; }
  push(key, val) {
    if (this.n === this.k.length) {
      const k2 = new Float32Array(this.n * 2); k2.set(this.k); this.k = k2;
      const v2 = new Int32Array(this.n * 2); v2.set(this.v); this.v = v2;
    }
    let i = this.n++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p] <= key) break;
      this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p;
    }
    this.k[i] = key; this.v[i] = val;
  }
  pop() {
    const topK = this.k[0], topV = this.v[0];
    const key = this.k[--this.n], val = this.v[this.n];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= this.n) break;
      if (c + 1 < this.n && this.k[c + 1] < this.k[c]) c++;
      if (this.k[c] >= key) break;
      this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c;
    }
    this.k[i] = key; this.v[i] = val;
    this.popK = topK;
    return topV;
  }
}

function dijkstra(src, cost, nx, ny, cell, targets) {
  const N = nx * ny;
  const dist = new Float32Array(N).fill(Infinity), pred = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  const h = new Heap();
  dist[src] = 0; h.push(0, src);
  let remaining = targets.size;
  while (h.n > 0 && remaining > 0) {
    const u = h.pop();
    if (done[u]) continue;
    done[u] = 1;
    if (targets.has(u)) remaining--;
    const du = dist[u], iu = u % nx, ju = (u - iu) / nx, cu = cost[u];
    for (let q = 0; q < NB_DIRS.length; q++) {
      const i = iu + NB_DIRS[q][0], j = ju + NB_DIRS[q][1];
      if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
      const v = j * nx + i;
      if (done[v]) continue;
      const nd = du + NB_DIRS[q][2] * cell * (cu + cost[v]) * 0.5;
      if (nd < dist[v]) { dist[v] = nd; pred[v] = u; h.push(nd, v); }
    }
  }
  return pred;
}

function dijk(m) {
  const { grid, cost, state, wu, wv, nodeCells, nodesXY, nb, tas } = m;
  const { nx, ny, x0, y0, cell } = grid;
  const nn = nodeCells.length;
  const targets = new Set(nodeCells);
  const legs = [];
  for (const a of m.sources) {
    const pred = dijkstra(nodeCells[a], cost, nx, ny, cell, targets);
    for (let b = a + 1; b < nn; b++) {
      const seq = [];
      let n = nodeCells[b];
      let guard = 0;
      while (n !== nodeCells[a] && n >= 0 && guard++ < 100000) { seq.push(n); n = pred[n]; }
      if (n !== nodeCells[a]) { legs.push({ a, b, D: Infinity }); continue; }
      seq.push(nodeCells[a]);
      seq.reverse();
      // 1 point sur 2 (lissage léger), extrémités exactes
      const pts = [nodesXY[2 * a], nodesXY[2 * a + 1]];
      for (let k = 2; k < seq.length - 1; k += 2) {
        const i = seq[k] % nx, j = (seq[k] - i) / nx;
        pts.push(x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell);
      }
      pts.push(nodesXY[2 * b], nodesXY[2 * b + 1]);
      const P = Float32Array.from(pts);
      const st = GEO.segTimes(P, grid, wu, wv, tas);
      const rev = new Float32Array(P.length);
      for (let k = 0; k < P.length / 2; k++) { rev[2 * k] = P[P.length - 2 - 2 * k]; rev[2 * k + 1] = P[P.length - 1 - 2 * k]; }
      const st2 = GEO.segTimes(rev, grid, wu, wv, tas);
      let D = 0, Tab = 0, Tba = 0;
      for (let s = 0; s < st.len.length; s++) { D += st.len[s]; Tab += st.t[s]; Tba += st2.t[s]; }
      // distance minimale de chaque balise au tracé + km par état d'espace aérien
      const M = new Float32Array(nb).fill(1e9);
      const X = new Float32Array(5);
      for (let s = 0; s < st.len.length; s++) {
        const ax = P[2 * s], ay = P[2 * s + 1], dx = P[2 * s + 2] - ax, dy = P[2 * s + 3] - ay;
        const L2 = dx * dx + dy * dy || 1e-9;
        for (let k = 0; k < nb; k++) {
          const px = nodesXY[2 * k] - ax, py = nodesXY[2 * k + 1] - ay;
          let t = (px * dx + py * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const d = Math.hypot(px - t * dx, py - t * dy);
          if (d < M[k]) M[k] = d;
        }
        const ns = Math.max(1, Math.round(st.len[s] / 4));
        for (let q = 0; q < ns; q++) {
          const t = (q + 0.5) / ns;
          const i = Math.max(0, Math.min(nx - 1, Math.floor((ax + t * dx - x0) / cell)));
          const j = Math.max(0, Math.min(ny - 1, Math.floor((ay + t * dy - y0) / cell)));
          X[state[j * nx + i]] += st.len[s] / ns;
        }
      }
      if (a < nb) M[a] = 0;
      if (b < nb) M[b] = 0;
      legs.push({ a, b, D, Tab, Tba, M, X, pts: P });
    }
    postMessage({ type: 'progress', a });
  }
  postMessage({ type: 'dijk', legs });
}

// ---------- 3. recuit simulé ----------
function sa(m) {
  const { nb, M, T, val, budget, iters, seed } = m;
  const nn = nb + 1, HOME = nb;
  let rs = seed >>> 0 || 1;
  const rnd = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
  const ri = (n) => Math.floor(rnd() * n);
  const dm = new Float32Array(nb), wp = new Uint8Array(nb);
  let lastT = 0;
  function score(route) {
    dm.fill(1e9);
    let t = 0, prev = HOME;
    for (let q = 0; q <= route.length; q++) {
      const n = q < route.length ? route[q] : HOME;
      t += T[prev * nn + n];
      const base = (prev * nn + n) * nb;
      for (let k = 0; k < nb; k++) { const d = M[base + k]; if (d < dm[k]) dm[k] = d; }
      prev = n;
    }
    lastT = t;
    if (t > budget) return -1;
    for (const c of route) wp[c] = 1;
    let s = 0;
    for (let k = 0; k < nb; k++) {
      let p = GEO.tierPct(dm[k]);
      if (!wp[k] && p > 0.65) p = 0.65;
      s += p * val[k];
    }
    for (const c of route) wp[c] = 0;
    return s;
  }
  let route = [], cur = 0, best = { s: 0, r: [] };
  const T0 = m.t0;
  for (let k = 0; k < iters; k++) {
    const temp = T0 * Math.pow(1 - k / iters, 2) + 1;
    const nw = route.slice();
    const r = rnd();
    if (r < 0.3 || !nw.length) {
      const c = ri(nb);
      if (nw.includes(c)) continue;
      nw.splice(ri(nw.length + 1), 0, c);
    } else if (r < 0.45) nw.splice(ri(nw.length), 1);
    else if (r < 0.6 && nw.length > 1) { const i = ri(nw.length), j = ri(nw.length); const t = nw[i]; nw[i] = nw[j]; nw[j] = t; }
    else if (r < 0.8 && nw.length > 1) {
      let i = ri(nw.length), j = ri(nw.length); if (i > j) { const t = i; i = j; j = t; }
      const seg = nw.slice(i, j + 1).reverse(); nw.splice(i, seg.length, ...seg);
    } else if (nw.length > 1) {
      const i = ri(nw.length), seg = nw.splice(i, 1 + ri(3));
      nw.splice(ri(nw.length + 1), 0, ...seg);
    } else continue;
    const s = score(nw);
    if (s < 0) continue;
    if (s >= cur || rnd() < Math.exp((s - cur) / temp)) {
      route = nw; cur = s;
      if (s > best.s) best = { s, r: nw.slice() };
    }
    if ((k & 0x3ffff) === 0) postMessage({ type: 'sa-progress', seed, k, iters, best: best.s });
  }
  // polissage : insertions / retraits qui améliorent strictement
  let rr = best.r.slice(), bs = score(rr), improved = true;
  while (improved) {
    improved = false;
    for (let c = 0; c < nb && !improved; c++) {
      if (rr.includes(c)) continue;
      for (let pos = 0; pos <= rr.length; pos++) {
        const nw = rr.slice(); nw.splice(pos, 0, c);
        const s = score(nw);
        if (s > bs) { bs = s; rr = nw; improved = true; break; }
      }
    }
    for (let i = 0; i < rr.length && !improved; i++) {
      const nw = rr.slice(); nw.splice(i, 1);
      const s = score(nw);
      if (s > bs) { bs = s; rr = nw; improved = true; }
    }
  }
  score(rr);
  postMessage({ type: 'sa', seed, score: bs, route: rr, time: lastT });
}
