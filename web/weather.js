// Prévisions Open-Meteo (sans clé) : vent par niveau de pression, rafales, convection. Appels faits depuis le navigateur.
(function (g) {
  const LEVELS = [[1000, 360], [975, 1100], [950, 1800], [925, 2500], [900, 3250], [850, 4800], [800, 6400], [700, 9900], [600, 13800], [500, 18400]];
  const UTC_OFFSET = 2; // l'horloge de référence est l'heure de Chambley (UTC+2)
  const VARS = ['wind_gusts_10m', 'wind_speed_10m', 'cape', 'precipitation', 'cloud_cover', 'boundary_layer_height', 'lifted_index'];

  const levelFor = (altFt) => LEVELS.reduce((b, l) => (Math.abs(l[1] - altFt) < Math.abs(b[1] - altFt) ? l : b))[0];
  const altOf = (hpa) => LEVELS.find((l) => l[0] === hpa)[1];

  // grid = {lats, lons} ; levels = liste de hPa ; firstDate = 'YYYY-MM-DD' du jour J1
  async function fetchForecast(grid, levels, firstDate, nDays, onProgress) {
    const pts = [];
    for (const la of grid.lats) for (const lo of grid.lons) pts.push([la, lo]);
    const end = new Date(Date.parse(firstDate + 'T00:00:00Z') + (nDays - 1) * 86400000).toISOString().slice(0, 10);
    const vars = [...levels.flatMap((l) => [`wind_speed_${l}hPa`, `wind_direction_${l}hPa`]), ...VARS];
    const batches = [];
    for (let i = 0; i < pts.length; i += 40) batches.push(pts.slice(i, i + 40));
    const out = new Array(pts.length);
    let done = 0;
    const run = async (batch, base) => {
      const url = 'https://api.open-meteo.com/v1/forecast?' +
        `latitude=${batch.map((p) => p[0]).join(',')}&longitude=${batch.map((p) => p[1]).join(',')}` +
        `&hourly=${vars.join(',')}&wind_speed_unit=kmh&timezone=UTC&start_date=${firstDate}&end_date=${end}`;
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(url);
          const j = await r.json();
          if (j.error) throw new Error(j.reason || 'erreur Open-Meteo');
          (Array.isArray(j) ? j : [j]).forEach((d, k) => { out[base + k] = d.hourly; });
          done += batch.length;
          if (onProgress) onProgress(done / pts.length);
          return;
        } catch (e) { lastErr = e; await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); }
      }
      throw lastErr;
    };
    let next = 0;
    const worker = async () => { while (next < batches.length) { const b = next++; await run(batches[b], b * 40); } };
    await Promise.all([worker(), worker(), worker()]);
    return { levels, grid, pts: out, t0: Date.parse(firstDate + 'T00:00:00Z'), nH: out[0].time.length, firstDate, nDays };
  }

  // vent moyen (u,v vers où il souffle, km/h) par point de grille sur les heures de vol prévues, pour un niveau
  function windField(fc, hpa, day0, day1, o) {
    const nla = fc.grid.lats.length, nlo = fc.grid.lons.length;
    const u = new Array(nla * nlo).fill(0), v = new Array(nla * nlo).fill(0), sp = new Array(nla * nlo).fill(0);
    const sk = `wind_speed_${hpa}hPa`, dk = `wind_direction_${hpa}hPa`;
    for (let p = 0; p < fc.pts.length; p++) {
      const h = fc.pts[p];
      let n = 0, su = 0, sv = 0, ss = 0;
      for (let d = day0; d <= Math.min(day1, fc.nDays - 1); d++) {
        for (let hh = 6; hh <= 21; hh++) {
          if (o.midday && hh >= 11 && hh < 16) continue;
          const idx = d * 24 + hh - UTC_OFFSET;
          if (idx < 0 || idx >= fc.nH || h[sk][idx] == null) continue;
          const w = h[sk][idx], a = h[dk][idx] * Math.PI / 180;
          su += -w * Math.sin(a); sv += -w * Math.cos(a); ss += w; n++;
        }
      }
      if (n) { u[p] = su / n; v[p] = sv / n; sp[p] = ss / n; }
    }
    return { lats: fc.grid.lats, lons: fc.grid.lons, u, v, speed: sp, src: `Open-Meteo ${hpa} hPa, J${day0 + 1}–J${Math.min(day1, fc.nDays - 1) + 1}` };
  }

  // champs horaires pour l'animation : u, v (vent au niveau), précipitations, rafales, CAPE, à l'heure de référence `clock`
  function fieldAt(fc, hpa, clock) {
    const n = fc.pts.length, idx = Math.round(clock - UTC_OFFSET);
    const out = { u: new Float32Array(n), v: new Float32Array(n), rain: new Float32Array(n), gust: new Float32Array(n), cape: new Float32Array(n), cloud: new Float32Array(n), ok: idx >= 0 && idx < fc.nH };
    if (!out.ok) return out;
    const sk = `wind_speed_${hpa}hPa`, dk = `wind_direction_${hpa}hPa`;
    for (let p = 0; p < n; p++) {
      const h = fc.pts[p], w = h[sk][idx] || 0, a = (h[dk][idx] || 0) * Math.PI / 180;
      out.u[p] = -w * Math.sin(a); out.v[p] = -w * Math.cos(a);
      out.rain[p] = h.precipitation[idx] || 0; out.gust[p] = h.wind_gusts_10m[idx] || 0; out.cape[p] = h.cape[idx] || 0; out.cloud[p] = h.cloud_cover[idx] || 0;
    }
    return out;
  }

  // interpolation bilinéaire d'un champ de grille régulière
  function sample(fc, arr, lat, lon) {
    const la = fc.grid.lats, lo = fc.grid.lons, nlo = lo.length;
    const fy = Math.max(0, Math.min(la.length - 1.001, (lat - la[0]) / (la[1] - la[0])));
    const fx = Math.max(0, Math.min(lo.length - 1.001, (lon - lo[0]) / (lo[1] - lo[0])));
    const i = Math.floor(fy), j = Math.floor(fx), a = fy - i, b = fx - j;
    return (arr[i * nlo + j] * (1 - b) + arr[i * nlo + j + 1] * b) * (1 - a) + (arr[(i + 1) * nlo + j] * (1 - b) + arr[(i + 1) * nlo + j + 1] * b) * a;
  }

  function nearestPt(fc, lat, lon) {
    const la = fc.grid.lats, lo = fc.grid.lons;
    const a = Math.max(0, Math.min(la.length - 1, Math.round((lat - la[0]) / (la[1] - la[0]))));
    const b = Math.max(0, Math.min(lo.length - 1, Math.round((lon - lo[0]) / (lo[1] - lo[0]))));
    return fc.pts[a * lo.length + b];
  }

  // conditions prévues le long d'un vol : samples = [{clock, lat, lon, hx, hy}]
  function stageConditions(fc, samples, hpa) {
    const sk = `wind_speed_${hpa}hPa`, dk = `wind_direction_${hpa}hPa`;
    let n = 0, wmax = 0, gust = 0, cape = 0, rain = 0, cloud = 0, li = 99, blh = 0, w10 = 0;
    for (const s of samples) {
      const idx = Math.round(s.clock - UTC_OFFSET);
      if (idx < 0 || idx >= fc.nH) continue;
      const h = nearestPt(fc, s.lat, s.lon);
      if (!h || h[sk][idx] == null) continue;
      wmax = Math.max(wmax, h[sk][idx]); gust = Math.max(gust, h.wind_gusts_10m[idx] || 0); w10 = Math.max(w10, h.wind_speed_10m[idx] || 0);
      cape = Math.max(cape, h.cape[idx] || 0); rain += (h.precipitation[idx] || 0); cloud += (h.cloud_cover[idx] || 0);
      li = Math.min(li, h.lifted_index[idx] == null ? 99 : h.lifted_index[idx]); blh = Math.max(blh, h.boundary_layer_height[idx] || 0);
      n++;
    }
    if (!n) return null;
    let turb = 0;
    if (cape > 300) turb++; if (cape > 1000) turb++; if (li < -2) turb++; if (gust > 35) turb++; if (gust > 50) turb++; if (blh > 2000) turb++;
    return { wmax, gust, w10, cape, rain: rain / n, cloud: cloud / n, li, blh, turb: Math.min(turb, 4), storm: cape > 800 && rain / n > 0.2, n };
  }

  g.WX = { fetchForecast, windField, fieldAt, sample, stageConditions, levelFor, altOf, UTC_OFFSET, LEVELS };
})(window);
