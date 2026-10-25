'use strict';
// UAC Planner — interface, carte, orchestration du moteur et planning d'étapes.

const FACT = [1, 1.3, 5, 25];
const STATE_LABELS = ['Ignorer', 'Signaler', 'Éviter', 'Interdire'];
const STATE_COLORS = ['#888', '#e0a800', '#e8590c', '#c92a2a'];
const NO_TMA = ['Italy', 'Germany', 'Denmark'];
const TYPE_LABEL = {
  CTR: 'CTR (contrôle d\'aérodrome)', TMA: 'TMA / CTA', AWY: 'Voies aériennes', RMZ_TMZ: 'RMZ / TMZ (radio, transpondeur)',
  PLANEUR: 'Planeurs / ondes', PARC: 'Parcs et sites protégés', INTERDIT: 'Interdites (P)', RESTREINT: 'Restreintes (R)',
  DANGER: 'Dangereuses (D/Q)', DEROG: 'Dérogations', AUTRE: 'Autres',
};
const DEADLINE = 7 * 24 + 12; // 8 août 12h00, en heures depuis le 1er août 00h00
const $ = (id) => document.getElementById(id);

let beacons, cats, home, zones, wind, land;
let map, zoneLayer, routeLayer, pauseLayer, canvas;
let settings = loadSettings();
let userPauses = JSON.parse(localStorage.getItem('uac-pauses') || '[]');
let addingPause = false;
let lastRun = null;

function loadSettings() {
  try { return JSON.parse(localStorage.getItem('uac-settings')) || {}; } catch (e) { return {}; }
}
function saveSettings() {
  try { localStorage.setItem('uac-settings', JSON.stringify(settings)); } catch (e) { /* mode privé */ }
}

// ---------- règles par défaut selon les indications du pilote ----------
function defaultState(t, cond, country) {
  const key = t + (cond ? '*' : '');
  switch (key) {
    case 'DEROG': case 'AWY': case 'PLANEUR': return 0;
    case 'CTR': return 3;
    case 'TMA': return NO_TMA.includes(country) ? 2 : 1;
    case 'INTERDIT': return 3;
    case 'INTERDIT*': case 'RESTREINT': case 'DANGER': return 2;
    default: return 1;
  }
}
const zoneKey = (z) => `${z.t}${z.c ? '*' : ''}|${z.k}`;
function stateOf(z) {
  const k = zoneKey(z);
  return settings.states && k in settings.states ? settings.states[k] : defaultState(z.t, z.c, z.k);
}

// ---------- données ----------
async function loadData() {
  const [b, a, w, l] = await Promise.all(['beacons', 'airspaces', 'wind', 'land'].map((n) => fetch(`data/${n}.json`).then((r) => r.json())));
  beacons = b.beacons; cats = b.categories; home = b.home; zones = a; wind = w; land = l;
}

// ---------- interface ----------
function buildCategorySelect() {
  const sel = $('cat');
  for (const [k, [name, mult]] of Object.entries(cats)) sel.add(new Option(`${name} ×${mult}`, k));
  sel.value = settings.cat || 'AT';
}

function buildInventory() {
  const groups = {};
  for (const z of zones) {
    const g = (groups[z.t + (z.c ? '*' : '')] ||= { t: z.t, c: z.c, countries: {} });
    (g.countries[z.k] ||= []).push(z);
  }
  const order = ['CTR', 'TMA', 'INTERDIT', 'INTERDIT*', 'RESTREINT', 'RESTREINT*', 'DANGER', 'DANGER*', 'PARC', 'RMZ_TMZ', 'AWY', 'PLANEUR', 'AUTRE', 'DEROG'];
  const root = $('inventory');
  root.className = 'inv';
  root.innerHTML = '';
  for (const key of order.filter((k) => groups[k])) {
    const g = groups[key];
    const total = Object.values(g.countries).reduce((n, a) => n + a.length, 0);
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    const label = TYPE_LABEL[g.t] + (g.c ? ' · conditionnelles (NOTAM, semaine…)' : '');
    sum.innerHTML = `<span>${label}</span><span class="n">${total}</span>`;
    const all = document.createElement('select');
    all.title = 'Appliquer à tous les pays';
    all.add(new Option('— tous —', ''));
    STATE_LABELS.forEach((l, i) => all.add(new Option(l, i)));
    all.onclick = (e) => e.stopPropagation();
    sum.appendChild(all);
    det.appendChild(sum);
    const tbl = document.createElement('table');
    const selects = [];
    for (const [country, arr] of Object.entries(g.countries).sort()) {
      const tr = tbl.insertRow();
      tr.insertCell().textContent = country;
      tr.insertCell().textContent = arr.length;
      tr.cells[1].className = 'num';
      const sel = document.createElement('select');
      STATE_LABELS.forEach((l, i) => sel.add(new Option(l, i)));
      const k = `${key}|${country}`;
      sel.value = settings.states && k in settings.states ? settings.states[k] : defaultState(g.t, g.c, country);
      sel.onchange = () => { (settings.states ||= {})[k] = +sel.value; saveSettings(); refreshZones(); };
      tr.insertCell().appendChild(sel);
      selects.push([k, sel]);
    }
    all.onchange = () => {
      if (all.value === '') return;
      for (const [k, sel] of selects) { sel.value = all.value; (settings.states ||= {})[k] = +all.value; }
      all.value = ''; saveSettings(); refreshZones();
    };
    det.appendChild(tbl);
    root.appendChild(det);
  }
}

function bindSettings() {
  const map_ = { cat: 'cat', tas: 'tas', alt: 'alt', maxday: 'maxday', hours: 'hours', seamax: 'seamax', pausegap: 'pausegap', wsrc: 'wsrc', wfac: 'wfac', prec: 'prec', cell: 'cell' };
  for (const [id, key] of Object.entries(map_)) {
    const el = $(id);
    if (settings[key] != null) el.value = settings[key];
    el.addEventListener('change', () => { settings[key] = el.value; saveSettings(); onSettingsChanged(id); });
  }
  const md = $('midday');
  if (settings.midday != null) md.checked = settings.midday;
  md.addEventListener('change', () => { settings.midday = md.checked; saveSettings(); updateCapacity(); });
  $('showzones').addEventListener('change', refreshZones);
}
function onSettingsChanged(id) {
  if (id === 'alt') refreshZones();
  updateCapacity();
}

function cfg() {
  return {
    cat: $('cat').value, tas: +$('tas').value, alt: +$('alt').value, maxday: +$('maxday').value, midday: $('midday').checked,
    hours: $('hours').value ? +$('hours').value : null, seamax: +$('seamax').value, pausegap: +$('pausegap').value, wsrc: $('wsrc').value, wfac: +$('wfac').value,
    iters: +$('prec').value, cell: +$('cell').value,
  };
}
function schedOpts(c) {
  return { start: 10, dayStart: 6.5, dayEnd: 20.5, midday: c.midday, maxDay: c.maxday, pauseTarget: c.pausegap, pauseMin: 0.75, contMax: 4, deadline: DEADLINE };
}
function updateCapacity() {
  const c = cfg();
  const cap = schedule(1e6, schedOpts(c), [], true).air;
  $('capinfo').innerHTML = `Capacité théorique entre le départ (1 août 10h) et l'arrivée (8 août 12h) : <b>${cap.toFixed(1)} h</b> de vol` +
    ` (≈ ${Math.round(cap * c.tas)} km sans vent). Les pauses de 45 min et les nuits sont déduites. Fatigue, météo et incidents ne le sont pas.`;
}

// ---------- carte ----------
function initMap() {
  map = L.map('map', { preferCanvas: true }).setView([47, 12], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '© OpenStreetMap' }).addTo(map);
  canvas = L.canvas({ padding: 0.3 });
  zoneLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  pauseLayer = L.layerGroup().addTo(map);
  const vmax = Math.max(...beacons.map((b) => b.base));
  for (const b of beacons) {
    const m = L.circleMarker([b.lat, b.lon], { radius: 4 + 8 * b.base / vmax, color: '#1f5fd1', weight: 1.5, fillColor: '#5b92f0', fillOpacity: 0.7 }).addTo(map);
    m.bindTooltip(b.id.replace('UAC', ''), { permanent: true, direction: 'center', className: 'btip' });
    b.marker = m;
  }
  L.marker([home.lat, home.lon], { title: 'LFJY' }).addTo(map).bindPopup('Chambley LFJY — départ/arrivée');
  map.on('click', (e) => {
    if (!addingPause) return;
    const name = prompt('Nom du point de pause (terrain, contact…)', 'Pause');
    addingPause = false; $('addpause').textContent = '+ Ajouter un point (clic sur la carte)';
    if (name) { userPauses.push({ name, lat: e.latlng.lat, lon: e.latlng.lng }); savePauses(); }
  });
  updateBeaconPopups();
}
function updateBeaconPopups() {
  const mult = cats[cfg().cat][1];
  for (const b of beacons) b.marker.bindPopup(`<b>${b.id}</b><br>${Math.round(b.base * mult)} pts max (×${mult})<br>${b.lat.toFixed(3)}, ${b.lon.toFixed(3)}`);
}

let zoneTimer;
function refreshZones() {
  clearTimeout(zoneTimer);
  zoneTimer = setTimeout(drawZones, 150);
}
function activeZone(z, alt) { return z.f <= alt && z.h >= alt; }
function drawZones() {
  zoneLayer.clearLayers();
  if (!$('showzones').checked) return;
  const alt = +$('alt').value;
  for (const z of zones) {
    const s = stateOf(z);
    if (s < 2 || !activeZone(z, alt)) continue;
    const ll = [];
    for (let i = 0; i < z.r.length; i += 2) ll.push([z.r[i + 1] / 1000, z.r[i] / 1000]);
    L.polygon(ll, { renderer: canvas, color: STATE_COLORS[s], weight: 1, fillOpacity: 0.12, interactive: false, smoothFactor: 1.5 }).addTo(zoneLayer);
  }
}

function savePauses() {
  localStorage.setItem('uac-pauses', JSON.stringify(userPauses));
  const ul = $('pauselist');
  ul.innerHTML = '';
  pauseLayer.clearLayers();
  userPauses.forEach((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.name} <small>(${p.lat.toFixed(2)}, ${p.lon.toFixed(2)})</small></span>`;
    const x = document.createElement('button');
    x.textContent = '×';
    x.onclick = () => { userPauses.splice(i, 1); savePauses(); };
    li.appendChild(x);
    ul.appendChild(li);
    L.marker([p.lat, p.lon]).addTo(pauseLayer).bindTooltip(p.name);
  });
}

// ---------- planning d'étapes ----------
function schedule(totalT, o, pauses, limit) {
  const ev = [], dayAir = {};
  let s = 0, c = o.start, air = 0, guard = 0;
  const nextFlyable = (x) => {
    for (;;) {
      const d = Math.floor(x / 24), h = x - d * 24;
      if (h < o.dayStart - 1e-9) return d * 24 + o.dayStart;
      if (h >= o.dayEnd - 1e-9) return (d + 1) * 24 + o.dayStart;
      if (o.midday && h >= 11 - 1e-9 && h < 16 - 1e-9) return d * 24 + 16;
      return x;
    }
  };
  const winEnd = (x) => { const d = Math.floor(x / 24), h = x - d * 24; return d * 24 + ((o.midday && h < 11 - 1e-9) ? 11 : o.dayEnd); };
  while (s < totalT - 1e-6 && guard++ < 600) {
    c = nextFlyable(c);
    if (limit && c >= o.deadline) break;
    const d = Math.floor(c / 24), used = dayAir[d] || 0;
    let avail = Math.min(winEnd(c) - c, o.maxDay - used);
    if (limit) avail = Math.min(avail, o.deadline - c);
    if (avail < 0.05) {
      c = (o.maxDay - used < 0.05) ? (d + 1) * 24 + o.dayStart : winEnd(c) + 1e-6;
      continue;
    }
    const left = totalT - s;
    let L, kind = 'fin', name = '';
    // fenêtre de vol disponible : on la découpe en n tronçons égaux séparés par des pauses (tronçon ≤ pauseTarget, ≤ 4 h)
    let n = Math.max(1, Math.ceil(avail / o.pauseTarget - 1e-9));
    let ell = (avail - (n - 1) * o.pauseMin) / n;
    while (ell > o.contMax && n < 12) { n++; ell = (avail - (n - 1) * o.pauseMin) / n; }
    L = Math.min(ell, left);
    if (left > L + 1e-6) {
      if (n > 1) {
        kind = 'pause';
        let best = null;
        for (const p of pauses) {
          if (p.t > s + Math.max(1, ell - 1) && p.t <= s + Math.min(o.contMax, ell + 0.75) && (!best || Math.abs(p.t - (s + L)) < Math.abs(best.t - (s + L)))) best = p;
        }
        if (best) { L = best.t - s; name = best.name; }
      } else {
        kind = (o.maxDay - used - L < 0.05) ? 'nuit (plafond journalier)' : (o.midday && winEnd(c) === Math.floor(c / 24) * 24 + 11 ? 'arrêt de midi' : 'nuit');
      }
    }
    ev.push({ day: d, c0: c, c1: c + L, s0: s, s1: s + L, kind, name });
    s += L; c += L; air += L; dayAir[d] = used + L;
    if (kind === 'pause') c += o.pauseMin;
  }
  return { events: ev, air, end: c, finished: s >= totalT - 1e-6 };
}

const fmtClock = (c) => {
  const d = Math.floor(c / 24), h = c - d * 24;
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${d + 1} août ${String(mm === 60 ? hh + 1 : hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
};
const fmtH = (h) => `${Math.floor(h)}h${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`;

// ---------- calcul ----------
function callWorker(msg, transfer, onMsg) {
  return new Promise((resolve, reject) => {
    const w = new Worker('engine.js');
    w.onmessage = (e) => { if (e.data.type === msg.type) { resolve({ data: e.data, worker: w }); } else if (onMsg) onMsg(e.data); };
    w.onerror = (e) => reject(new Error(e.message));
    w.postMessage(msg, transfer || []);
  });
}
function progress(frac, text) {
  $('progress').hidden = false;
  $('bar').style.width = `${Math.round(frac * 100)}%`;
  $('ptext').textContent = text;
}

async function compute() {
  const c = cfg();
  const btn = $('run');
  btn.disabled = true;
  try {
    const nb = beacons.length, nn = nb + 1, HOME = nb;
    const K = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2));
    const nodes = beacons.map((b) => ({ lat: b.lat, lon: b.lon })).concat([{ lat: home.lat, lon: home.lon }]);
    const zs = [];
    for (const z of zones) { const s = stateOf(z); if (s > 0 && activeZone(z, c.alt)) zs.push({ r: z.r, s }); }
    progress(0.02, `Rastérisation de ${zs.length} zones…`);
    const prepRes = await callWorker({ type: 'prep', zones: zs, factors: FACT, cell: c.cell, nodes, wind, land, seaMax: c.seamax, windFactor: c.wsrc === 'none' ? 0 : c.wfac }, []);
    prepRes.worker.terminate();
    const prep = prepRes.data;

    // plus courts chemins en parallèle
    let doneSrc = 0;
    const jobs = [];
    for (let k = 0; k < K; k++) {
      const sources = [];
      for (let a = k; a < nn - 1; a += K) sources.push(a);
      jobs.push(callWorker({ type: 'dijk', sources, grid: prep.grid, cost: prep.cost.slice(), state: prep.state.slice(), wu: prep.wu, wv: prep.wv, nodeCells: prep.nodeCells, nodesXY: prep.nodesXY, nb, tas: c.tas }, [],
        (m) => { if (m.type === 'progress') { doneSrc++; progress(0.05 + 0.45 * doneSrc / (nn - 1), `Itinéraires entre balises (${doneSrc}/${nn - 1})…`); } }));
    }
    const legs = (await Promise.all(jobs)).flatMap((r) => { r.worker.terminate(); return r.data.legs; });
    const T = new Float64Array(nn * nn).fill(Infinity), M = new Float32Array(nn * nn * nb).fill(1e9);
    const Dm = new Float64Array(nn * nn).fill(Infinity), paths = new Map();
    for (let i = 0; i < nn; i++) T[i * nn + i] = 0;
    for (const l of legs) {
      if (!isFinite(l.D)) continue;
      T[l.a * nn + l.b] = l.Tab; T[l.b * nn + l.a] = l.Tba;
      Dm[l.a * nn + l.b] = Dm[l.b * nn + l.a] = l.D;
      M.set(l.M, (l.a * nn + l.b) * nb); M.set(l.M, (l.b * nn + l.a) * nb);
      paths.set(l.a * nn + l.b, l.pts);
    }

    // budget d'heures
    const so = schedOpts(c);
    const cap = schedule(1e6, so, [], true).air;
    const budget = c.hours || cap;
    const mult = cats[c.cat][1];
    const val = Float64Array.from(beacons, (b) => b.base * mult);

    progress(0.52, 'Optimisation du parcours…');
    const prog = new Array(K).fill(0);
    const sas = [];
    for (let k = 0; k < K; k++) {
      sas.push(callWorker({ type: 'sa', nb, M: M.slice(), T: T.slice(), val, budget, iters: c.iters, seed: 1000 + 77 * k, t0: 100 * mult }, [],
        (m) => { if (m.type === 'sa-progress') { prog[k] = m.k / m.iters; progress(0.52 + 0.43 * prog.reduce((a, b) => a + b, 0) / K, 'Optimisation du parcours…'); } }));
    }
    const res = await Promise.all(sas);
    res.forEach((r) => r.worker.terminate());
    const best = res.map((r) => r.data).sort((a, b) => b.score - a.score)[0];
    lastRun = { c, prep, nb, nn, T, M, Dm, paths, val, budget, cap, best, scores: res.map((r) => Math.round(r.data.score)) };
    progress(1, 'Terminé');
    finalize(lastRun);
  } catch (err) {
    progress(0, `Erreur : ${err.message}`);
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// ---------- résultat ----------
function finalize(run) {
  const { c, prep, nb, nn, best, paths, M, val } = run;
  const HOME = nb, grid = prep.grid;
  const seq = [HOME, ...best.route, HOME];
  const P = [];                  // polyligne projetée
  const wpIdx = [0];             // indice du sommet de chaque balise visée
  for (let q = 0; q < seq.length - 1; q++) {
    const a = seq[q], b = seq[q + 1];
    let pts;
    if (a < b) pts = paths.get(a * nn + b);
    else { const o = paths.get(b * nn + a); pts = new Float32Array(o.length); for (let k = 0; k < o.length / 2; k++) { pts[2 * k] = o[o.length - 2 - 2 * k]; pts[2 * k + 1] = o[o.length - 1 - 2 * k]; } }
    for (let k = q === 0 ? 0 : 1; k < pts.length / 2; k++) P.push(pts[2 * k], pts[2 * k + 1]);
    wpIdx.push(P.length / 2 - 1);
  }
  const PA = Float64Array.from(P);
  const st = GEO.segTimes(PA, grid, c.wsrc === 'none' ? null : prep.wu, c.wsrc === 'none' ? null : prep.wv, c.tas);
  const nv = PA.length / 2;
  const cumT = new Float64Array(nv), cumD = new Float64Array(nv);
  for (let i = 1; i < nv; i++) { cumT[i] = cumT[i - 1] + st.t[i - 1]; cumD[i] = cumD[i - 1] + st.len[i - 1]; }
  const total = cumT[nv - 1], km = cumD[nv - 1];

  // points par balise
  const dmin = new Float32Array(nb).fill(1e9);
  for (let q = 0; q < seq.length - 1; q++) {
    const base = (seq[q] * nn + seq[q + 1]) * nb;
    for (let k = 0; k < nb; k++) if (M[base + k] < dmin[k]) dmin[k] = M[base + k];
  }
  const wp = new Set(best.route);
  let score = 0;
  const rows = [];
  for (let k = 0; k < nb; k++) {
    let p = GEO.tierPct(dmin[k]);
    if (!wp.has(k) && p > 0.65) p = 0.65;
    score += p * val[k];
    if (p > 0) rows.push({ k, id: beacons[k].id, d: dmin[k], p, pts: p * val[k], visee: wp.has(k) });
  }
  rows.sort((a, b) => b.pts - a.pts);

  // pauses personnelles proches du tracé
  const pp = [];
  for (const u of userPauses) {
    const [ux, uy] = GEO.laea(u.lat, u.lon);
    let bd = 1e9, bi = 0;
    for (let i = 0; i < nv; i++) { const d = Math.hypot(PA[2 * i] - ux, PA[2 * i + 1] - uy); if (d < bd) { bd = d; bi = i; } }
    if (bd <= 30) pp.push({ t: cumT[bi], name: u.name, d: bd });
  }
  const sched = schedule(total, schedOpts(c), pp, false);
  const posAt = (s) => {
    let lo = 0, hi = nv - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cumT[m] <= s) lo = m; else hi = m; }
    const f = cumT[hi] > cumT[lo] ? Math.min(1, Math.max(0, (s - cumT[lo]) / (cumT[hi] - cumT[lo]))) : 0;
    const x = PA[2 * lo] + f * (PA[2 * hi] - PA[2 * lo]), y = PA[2 * lo + 1] + f * (PA[2 * hi + 1] - PA[2 * lo + 1]);
    return { ll: GEO.inv(x, y), x, y, d: cumD[lo] + f * (cumD[hi] - cumD[lo]) };
  };
  const nearestBeacon = (x, y) => {
    let bd = 1e9, bk = 0;
    beacons.forEach((b, k) => { const [bx, by] = GEO.laea(b.lat, b.lon); const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; bk = k; } });
    return `${beacons[bk].id.replace('UAC', 'balise ')} (${Math.round(bd)} km)`;
  };

  // carte
  routeLayer.clearLayers();
  const ll = [];
  for (let i = 0; i < nv; i += 1) ll.push(GEO.inv(PA[2 * i], PA[2 * i + 1]));
  L.polyline(ll, { color: '#e03131', weight: 3, opacity: 0.9 }).addTo(routeLayer);
  best.route.forEach((k, i) => {
    L.circleMarker([beacons[k].lat, beacons[k].lon], { radius: 9, color: '#e03131', weight: 2, fillOpacity: 0 }).addTo(routeLayer)
      .bindTooltip(`${i + 1}`, { permanent: false });
  });
  for (const e of sched.events) {
    if (e.kind === 'fin') continue;
    const pos = posAt(e.s1);
    const night = e.kind.startsWith('nuit');
    const label = e.kind === 'pause' ? (e.name ? `Pause : ${e.name}` : 'Zone de pause conseillée (±30 km)') : `${e.kind[0].toUpperCase()}${e.kind.slice(1)} · ${fmtClock(e.c1)}`;
    if (e.kind === 'pause' && !e.name) L.circle(pos.ll, { radius: 30000, color: '#2f9e44', weight: 1, dashArray: '4 4', fillOpacity: 0.08 }).addTo(routeLayer).bindTooltip(label);
    else L.circleMarker(pos.ll, { radius: night ? 7 : 5, color: night ? '#862e9c' : '#2f9e44', fillOpacity: 0.9 }).addTo(routeLayer).bindTooltip(label);
  }
  map.fitBounds(L.polyline(ll).getBounds().pad(0.1));

  // résumé
  const end = sched.end - (sched.events.length && sched.events.at(-1).kind === 'pause' ? 0.75 : 0);
  const late = sched.end > DEADLINE + 1e-6 || !sched.finished;
  $('results').hidden = false;
  $('summary').innerHTML = `
    <div class="kpi">
      <div><b>${Math.round(score).toLocaleString('fr-FR')}</b><span>points (${cats[c.cat][0]})</span></div>
      <div><b>${total.toFixed(1)} h · ${Math.round(km)} km</b><span>en vol (vent ${c.wsrc === 'none' ? 'ignoré' : 'moyen'})</span></div>
      <div><b>${best.route.length}</b><span>balises visées · ${rows.length - best.route.length} au passage</span></div>
    </div>
    <p class="${late ? 'bad' : 'good'}">Arrivée à LFJY : ${fmtClock(sched.end)} — ${late ? 'APRÈS la limite du 8 août 12h00 : réduis les heures de vol totales.' : 'avant la limite du 8 août 12h00.'}</p>
    <p class="note">Budget d'optimisation : ${run.budget.toFixed(1)} h${c.hours ? ' (imposé)' : ' (capacité calculée)'} · scores des ${run.scores.length} recuits : ${run.scores.join(', ')}.
    Si ces scores divergent beaucoup, relance en précision « Précise ».</p>`;

  // itinéraire
  let html = '<table><tr><th>Jour</th><th>Vol</th><th class="num">Durée</th><th class="num">km</th><th>Arrêt</th></tr>';
  for (const e of sched.events) {
    const a = posAt(e.s0), b = posAt(e.s1);
    const stop = e.kind === 'fin' ? 'arrivée LFJY' : `${e.kind}${e.name ? ' — ' + e.name : ''}<br><small>${nearestBeacon(b.x, b.y)}, ${b.ll[0].toFixed(2)}, ${b.ll[1].toFixed(2)}</small>`;
    html += `<tr><td>${e.day + 1} août</td><td>${fmtClock(e.c0).split(' ').pop()}→${fmtClock(e.c1).split(' ').pop()}</td><td class="num">${fmtH(e.s1 - e.s0)}</td><td class="num">${Math.round(b.d - a.d)}</td><td>${stop}</td></tr>`;
  }
  $('itin').innerHTML = html + '</table><p class="note">Les arrêts sont des zones conseillées, à confirmer sur place (terrain, carburant, météo). L\'heure locale est supposée identique partout.</p>';

  // balises
  let bh = '<table><tr><th>Balise</th><th class="num">Distance</th><th class="num">%</th><th class="num">Points</th><th></th></tr>';
  for (const r of rows) bh += `<tr><td>${r.id}</td><td class="num">${r.d < 1 ? Math.round(r.d * 1000) + ' m' : r.d.toFixed(1) + ' km'}</td><td class="num">${Math.round(r.p * 100)}</td><td class="num">${Math.round(r.pts)}</td><td>${r.visee ? 'visée' : 'passage'}</td></tr>`;
  $('btable').innerHTML = bh + '</table>';

  seaReport(PA, nv, prep, c);
  crossings(PA, nv, c.alt);
  $('results').scrollIntoView({ behavior: 'smooth' });
}

function seaReport(PA, nv, prep, c) {
  const g = prep.grid, segs = [];
  let cur = null, water = 0;
  for (let i = 0; i < nv - 1; i++) {
    const dx = PA[2 * i + 2] - PA[2 * i], dy = PA[2 * i + 3] - PA[2 * i + 1], L = Math.hypot(dx, dy);
    const ns = Math.max(1, Math.round(L / 3));
    for (let q = 0; q < ns; q++) {
      const x = PA[2 * i] + dx * (q + 0.5) / ns, y = PA[2 * i + 1] + dy * (q + 0.5) / ns;
      const ci = Math.max(0, Math.min(g.nx - 1, Math.floor((x - g.x0) / g.cell))), cj = Math.max(0, Math.min(g.ny - 1, Math.floor((y - g.y0) / g.cell)));
      const d = prep.coast[cj * g.nx + ci];
      if (d > 0) {
        water += L / ns;
        if (!cur) { cur = { km: 0, max: 0, at: GEO.inv(x, y) }; segs.push(cur); }
        cur.km += L / ns; cur.max = Math.max(cur.max, d);
      } else cur = null;
    }
  }
  const big = segs.filter((s) => s.km >= 10).sort((a, b) => b.max - a.max);
  const html = big.length
    ? '<table><tr><th>Traversée maritime (début)</th><th class="num">Longueur km</th><th class="num">Distance max à la côte km</th></tr>' +
      big.slice(0, 12).map((s) => `<tr><td>${s.at[0].toFixed(2)}, ${s.at[1].toFixed(2)}</td><td class="num">${Math.round(s.km)}</td><td class="num ${s.max > 20 ? 'warn' : ''}">${Math.round(s.max)}</td></tr>`).join('') +
      `</table><p class="note">${Math.round(water)} km au-dessus de l'eau au total. Distance côtière calculée sur le tracé de calcul (±10 km) : vérifie chaque traversée avec ta machine (finesse, gilet, plan de secours).</p>`
    : '<p class="note">Aucune traversée maritime de plus de 10 km.</p>';
  $('sea').innerHTML = html;
}

function crossings(PA, nv, alt) {
  const act = [];
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (let i = 0; i < nv; i++) { minx = Math.min(minx, PA[2 * i]); maxx = Math.max(maxx, PA[2 * i]); miny = Math.min(miny, PA[2 * i + 1]); maxy = Math.max(maxy, PA[2 * i + 1]); }
  for (const z of zones) {
    const s = stateOf(z);
    if (s < 1 || !activeZone(z, alt)) continue;
    const n = z.r.length / 2, xs = new Float64Array(n), ys = new Float64Array(n);
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (let k = 0; k < n; k++) {
      const [x, y] = GEO.laea(z.r[2 * k + 1] / 1000, z.r[2 * k] / 1000);
      xs[k] = x; ys[k] = y; a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y);
    }
    if (b < minx || a > maxx || d < miny || c > maxy) continue;
    act.push({ z, s, xs, ys, a, b, c, d, km: 0 });
  }
  const step = 3;
  for (let i = 0; i < nv - 1; i++) {
    const dx = PA[2 * i + 2] - PA[2 * i], dy = PA[2 * i + 3] - PA[2 * i + 1], L = Math.hypot(dx, dy);
    const ns = Math.max(1, Math.round(L / step));
    for (let q = 0; q < ns; q++) {
      const x = PA[2 * i] + dx * (q + 0.5) / ns, y = PA[2 * i + 1] + dy * (q + 0.5) / ns;
      for (const A of act) {
        if (x < A.a || x > A.b || y < A.c || y > A.d) continue;
        let inside = false;
        for (let k = 0, p = A.xs.length - 1; k < A.xs.length; p = k++) {
          if ((A.ys[k] > y) !== (A.ys[p] > y) && x < (A.xs[p] - A.xs[k]) * (y - A.ys[k]) / (A.ys[p] - A.ys[k]) + A.xs[k]) inside = !inside;
        }
        if (inside) A.km += L / ns;
      }
    }
  }
  const agg = {};
  for (const A of act) {
    if (A.km <= 0) continue;
    const key = `${A.z.k}|${A.z.t}${A.z.c ? '*' : ''}|${A.z.n}`;
    (agg[key] ||= { z: A.z, s: A.s, km: 0 }).km += A.km;
  }
  const list = Object.values(agg).sort((x, y) => y.s - x.s || y.km - x.km);
  let h = '<table><tr><th>Zone</th><th>Pays</th><th>Traitement</th><th class="num">km</th><th class="num">Plancher–plafond (ft)</th></tr>';
  for (const r of list.slice(0, 60)) {
    h += `<tr><td>${r.z.n}<br><small>${TYPE_LABEL[r.z.t]}${r.z.c ? ' · conditionnelle' : ''}</small></td><td>${r.z.k}</td><td class="${r.s >= 2 ? 'bad' : 'warn'}">${STATE_LABELS[r.s]}</td><td class="num">${r.km.toFixed(0)}</td><td class="num">${r.z.f}–${r.z.h >= 99999 ? '∞' : r.z.h}</td></tr>`;
  }
  $('crossings').innerHTML = list.length ? h + `</table><p class="note">${list.length} zones traversées au total (60 premières affichées). Vérifie leur statut réel (NOTAM, jours d'activité) avant le vol.</p>`
    : '<p class="note">Aucune zone signalée ou évitée n\'est traversée.</p>';
}

// ---------- démarrage ----------
(async function main() {
  await loadData();
  buildCategorySelect();
  bindSettings();
  buildInventory();
  initMap();
  savePauses();
  updateCapacity();
  drawZones();
  $('cat').addEventListener('change', updateBeaconPopups);
  $('addpause').onclick = () => { addingPause = true; $('addpause').textContent = 'Clique sur la carte…'; };
  $('run').onclick = compute;
  window.__ready = true;
})();
