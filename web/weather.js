// Prévisions Open-Meteo (sans clé) : vent au niveau de croisière, rafales, convection. Appels faits depuis le navigateur.
(function (g) {
  const LEVELS = [[1000, 360], [975, 1100], [950, 1800], [925, 2500], [900, 3250], [850, 4800], [800, 6400], [700, 9900], [600, 13800], [500, 18400]];
  const UTC_OFFSET = 2; // heure locale supposée = UTC+2 (Europe centrale en été)
  const VARS = ['wind_gusts_10m', 'wind_speed_10m', 'cape', 'precipitation', 'cloud_cover', 'boundary_layer_height', 'lifted_index'];

  function levelFor(altFt) {
    return LEVELS.reduce((b, l) => (Math.abs(l[1] - altFt) < Math.abs(b[1] - altFt) ? l : b))[0];
  }

  // grid = {lats, lons} (même grille que la climatologie) ; firstDate = 'YYYY-MM-DD' du jour J1 ; nDays
  async function fetchForecast(grid, altFt, firstDate, nDays, onProgress) {
    const hpa = levelFor(altFt);
    const pts = [];
    for (const la of grid.lats) for (const lo of grid.lons) pts.push([la, lo]);
    const end = new Date(Date.parse(firstDate + 'T00:00:00Z') + (nDays - 1) * 86400000).toISOString().slice(0, 10);
    const vars = [`wind_speed_${hpa}hPa`, `wind_direction_${hpa}hPa`, ...VARS];
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
          const arr = Array.isArray(j) ? j : [j];
          arr.forEach((d, k) => { out[base + k] = d.hourly; });
          done += batch.length;
          if (onProgress) onProgress(done / pts.length);
          return;
        } catch (e) { lastErr = e; await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); }
      }
      throw lastErr;
    };
    // 3 requêtes en parallèle
    let next = 0;
    const worker = async () => { while (next < batches.length) { const b = next++; await run(batches[b], b * 40); } };
    await Promise.all([worker(), worker(), worker()]);
    return { hpa, grid, pts: out, t0: Date.parse(firstDate + 'T00:00:00Z'), nH: out[0].time.length, firstDate, nDays, hpaVars: vars };
  }

  // vent moyen (u,v vers où il souffle, km/h) par point de grille sur les heures de vol prévues
  function windField(fc, day0, day1, o) {
    const nla = fc.grid.lats.length, nlo = fc.grid.lons.length;
    const u = new Array(nla * nlo).fill(0), v = new Array(nla * nlo).fill(0), sp = new Array(nla * nlo).fill(0);
    const sk = `wind_speed_${fc.hpa}hPa`, dk = `wind_direction_${fc.hpa}hPa`;
    for (let p = 0; p < fc.pts.length; p++) {
      const h = fc.pts[p];
      let n = 0, su = 0, sv = 0, ss = 0;
      for (let d = day0; d <= Math.min(day1, fc.nDays - 1); d++) {
        for (let hh = 6; hh <= 20; hh++) {
          if (o.midday && hh >= 11 && hh < 16) continue;
          const idx = d * 24 + hh - UTC_OFFSET;
          if (idx < 0 || idx >= fc.nH || h[sk][idx] == null) continue;
          const w = h[sk][idx], a = h[dk][idx] * Math.PI / 180;
          su += -w * Math.sin(a); sv += -w * Math.cos(a); ss += w; n++;
        }
      }
      if (n) { u[p] = su / n; v[p] = sv / n; sp[p] = ss / n; }
    }
    return { lats: fc.grid.lats, lons: fc.grid.lons, u, v, speed: sp, src: `Open-Meteo, niveau ${fc.hpa} hPa, jours J${day0 + 1}–J${Math.min(day1, fc.nDays - 1) + 1}` };
  }

  function nearestPt(fc, lat, lon) {
    const la = fc.grid.lats, lo = fc.grid.lons;
    const a = Math.max(0, Math.min(la.length - 1, Math.round((lat - la[0]) / (la[1] - la[0]))));
    const b = Math.max(0, Math.min(lo.length - 1, Math.round((lon - lo[0]) / (lo[1] - lo[0]))));
    return fc.pts[a * lo.length + b];
  }

  // conditions prévues le long d'un tronçon : samples = [{clock, lat, lon, hx, hy}] (hx,hy cap unitaire dans le plan projeté)
  function stageConditions(fc, samples, tas) {
    const sk = `wind_speed_${fc.hpa}hPa`, dk = `wind_direction_${fc.hpa}hPa`;
    let n = 0, head = 0, wmax = 0, gust = 0, cape = 0, rain = 0, cloud = 0, li = 99, blh = 0, w10 = 0;
    for (const s of samples) {
      const idx = Math.round(s.clock - UTC_OFFSET);
      if (idx < 0 || idx >= fc.nH) continue;
      const h = nearestPt(fc, s.lat, s.lon);
      if (h[sk][idx] == null) continue;
      const w = h[sk][idx], a = h[dk][idx] * Math.PI / 180;
      const u = -w * Math.sin(a), v = -w * Math.cos(a);
      head += u * s.hx + v * s.hy; // >0 : vent arrière
      wmax = Math.max(wmax, w); gust = Math.max(gust, h.wind_gusts_10m[idx] || 0);
      w10 = Math.max(w10, h.wind_speed_10m[idx] || 0);
      cape = Math.max(cape, h.cape[idx] || 0); rain += (h.precipitation[idx] || 0); cloud += (h.cloud_cover[idx] || 0);
      li = Math.min(li, h.lifted_index[idx] == null ? 99 : h.lifted_index[idx]); blh = Math.max(blh, h.boundary_layer_height[idx] || 0);
      n++;
    }
    if (!n) return null;
    // indice de turbulence indicatif : convection (CAPE, indice de soulèvement), rafales, hauteur de couche limite
    let turb = 0;
    if (cape > 300) turb++; if (cape > 1000) turb++; if (li < -2) turb++; if (gust > 35) turb++; if (gust > 50) turb++; if (blh > 2000) turb++;
    const storm = cape > 800 && rain / n > 0.2;
    return { tail: head / n, wmax, gust, w10, cape, rain: rain / n, cloud: cloud / n, li, blh, turb: Math.min(turb, 4), storm, n };
  }

  g.WX = { fetchForecast, windField, stageConditions, levelFor, UTC_OFFSET };
})(window);
