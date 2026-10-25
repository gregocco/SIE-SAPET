// Fonctions géométriques partagées (page + workers) : projection LAEA, grille, temps de vol avec vent.
(function (g) {
  const R = 6371.0, D2R = Math.PI / 180;
  const LAT0 = 52 * D2R, LON0 = 10 * D2R;

  function laea(lat, lon) {
    const p = lat * D2R, l = lon * D2R;
    const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l - LON0)));
    return [R * k * Math.cos(p) * Math.sin(l - LON0),
      R * k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l - LON0))];
  }

  function inv(x, y) {
    const rho = Math.hypot(x, y);
    if (rho < 1e-9) return [LAT0 / D2R, LON0 / D2R];
    const c = 2 * Math.asin(Math.min(1, rho / (2 * R)));
    const sc = Math.sin(c), cc = Math.cos(c);
    const lat = Math.asin(cc * Math.sin(LAT0) + y * sc * Math.cos(LAT0) / rho);
    const lon = LON0 + Math.atan2(x * sc, rho * Math.cos(LAT0) * cc - y * Math.sin(LAT0) * sc);
    return [lat / D2R, lon / D2R];
  }

  function makeGrid(cell) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let lat = 33; lat <= 68; lat += 1) {
      for (const lon of [-13, -5, 5, 15, 25, 33]) {
        const [x, y] = laea(lat, lon);
        minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
      }
    }
    const x0 = Math.floor(minx / cell) * cell, y0 = Math.floor(miny / cell) * cell;
    return { cell, x0, y0, nx: Math.ceil((maxx - x0) / cell), ny: Math.ceil((maxy - y0) / cell) };
  }

  // vent (km/h, vers où il souffle) par cellule de grille, plus proche point de la grille météo
  function cellWind(grid, wind, factor) {
    const N = grid.nx * grid.ny;
    const wu = new Float32Array(N), wv = new Float32Array(N);
    const la0 = wind.lats[0], lo0 = wind.lons[0];
    const dla = wind.lats[1] - la0, dlo = wind.lons[1] - lo0;
    const nla = wind.lats.length, nlo = wind.lons.length;
    for (let j = 0; j < grid.ny; j++) {
      for (let i = 0; i < grid.nx; i++) {
        const [lat, lon] = inv(grid.x0 + (i + 0.5) * grid.cell, grid.y0 + (j + 0.5) * grid.cell);
        const a = Math.max(0, Math.min(nla - 1, Math.round((lat - la0) / dla)));
        const b = Math.max(0, Math.min(nlo - 1, Math.round((lon - lo0) / dlo)));
        wu[j * grid.nx + i] = wind.u[a * nlo + b] * factor;
        wv[j * grid.nx + i] = wind.v[a * nlo + b] * factor;
      }
    }
    return { wu, wv };
  }

  // temps (h) de chaque segment d'une polyligne projetée [x0,y0,x1,y1,...] avec le vent de la cellule
  function segTimes(pts, grid, wu, wv, tas) {
    const n = pts.length / 2 - 1, out = new Float64Array(n), len = new Float64Array(n);
    for (let s = 0; s < n; s++) {
      const dx = pts[2 * s + 2] - pts[2 * s], dy = pts[2 * s + 3] - pts[2 * s + 1];
      const L = Math.hypot(dx, dy);
      len[s] = L;
      if (L < 1e-9) continue;
      const mx = (pts[2 * s] + pts[2 * s + 2]) / 2, my = (pts[2 * s + 1] + pts[2 * s + 3]) / 2;
      const i = Math.max(0, Math.min(grid.nx - 1, Math.floor((mx - grid.x0) / grid.cell)));
      const j = Math.max(0, Math.min(grid.ny - 1, Math.floor((my - grid.y0) / grid.cell)));
      const hx = dx / L, hy = dy / L;
      const u = wu ? wu[j * grid.nx + i] : 0, v = wv ? wv[j * grid.nx + i] : 0;
      const par = u * hx + v * hy, perp = Math.abs(u * hy - v * hx);
      const gs = par + Math.sqrt(Math.max(tas * tas - perp * perp, 1));
      out[s] = L / Math.max(gs, 20);
    }
    return { t: out, len };
  }

  function tierPct(d) {
    return d <= 0.1 ? 1 : d <= 0.25 ? 0.95 : d <= 0.5 ? 0.9 : d <= 1 ? 0.8 : d <= 5 ? 0.65 : d <= 25 ? 0.4 : 0;
  }

  g.GEO = { R, laea, inv, makeGrid, cellWind, segTimes, tierPct };
})(typeof self !== 'undefined' ? self : window);
