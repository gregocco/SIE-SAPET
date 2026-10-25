'use strict';
// UAC Planner — interface, carte, orchestration du moteur, planning d'étapes, météo, replanification.

const FACT = [1, 1.3, 5, 25];
const STATE_LABELS = ['Ignorer', 'Signaler', 'Éviter', 'Interdire'];
const STATE_COLORS = ['#888', '#e0a800', '#e8590c', '#c92a2a'];
const NO_TMA = ['Italy', 'Germany', 'Denmark'];
const DAY_COLORS = ['#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b6', '#0c8599', '#c2255c', '#5c7cfa'];
const TYPE_LABEL = {
  CTR: 'CTR (contrôle d\'aérodrome)', TMA: 'TMA / CTA', AWY: 'Voies aériennes', RMZ_TMZ: 'RMZ / TMZ (radio, transpondeur)',
  PLANEUR: 'Planeurs / ondes', PARC: 'Parcs et sites protégés', INTERDIT: 'Interdites (P)', RESTREINT: 'Restreintes (R)',
  DANGER: 'Dangereuses (D/Q)', DEROG: 'Dérogations', AUTRE: 'Autres',
};
const PROFILES = {
  prudent: { midday: true, maxday: 8, pausegap: 3.75, cutmode: 'full' },
  intensif: { midday: false, maxday: 12, pausegap: 4, cutmode: 'full' },
};
const DEADLINE = 7 * 24 + 12; // 8 août 12h00, en heures depuis le 1er août 00h00
const TIERS = [[0.1, 1], [0.25, 0.95], [0.5, 0.9], [1, 0.8], [5, 0.65], [25, 0.4]];
const $ = (id) => document.getElementById(id);

let beacons, cats, home, zones, wind, land;
let map, zoneLayer, routeLayer, pauseLayer, canvas;
let settings = loadSettings();
let userPauses = JSON.parse(localStorage.getItem('uac-pauses') || '[]');
let mapMode = null;            // 'pause' | 'pos' | null
let lastRun = null;
let fc = null;                 // prévisions chargées
let mission = { bank: null, trace: null };
let dayLayers = {}, dayFocus = null;

function loadSettings() { try { return JSON.parse(localStorage.getItem('uac-settings')) || {}; } catch (e) { return {}; } }
function saveSettings() { try { localStorage.setItem('uac-settings', JSON.stringify(settings)); } catch (e) { /* navigation privée */ } }

// ---------- règles par défaut selon les indications du pilote ----------
function defaultState(t, cond, country) {
  switch (t + (cond ? '*' : '')) {
    case 'DEROG': case 'AWY': case 'PLANEUR': return 0;
    case 'CTR': return 3;
    case 'TMA': return NO_TMA.includes(country) ? 2 : 1;
    case 'INTERDIT': return 3;
    case 'INTERDIT*': case 'RESTREINT': case 'DANGER': return 2;
    default: return 1;
  }
}
function stateOf(z) {
  const k = `${z.t}${z.c ? '*' : ''}|${z.k}`;
  return settings.states && k in settings.states ? settings.states[k] : defaultState(z.t, z.c, z.k);
}
const activeZone = (z, alt) => z.f <= alt && z.h >= alt;

// ---------- données ----------
async function loadData() {
  const [b, a, w, l] = await Promise.all(['beacons', 'airspaces', 'wind', 'land'].map((n) => fetch(`data/${n}.json`).then((r) => r.json())));
  beacons = b.beacons; cats = b.categories; home = b.home; zones = a; wind = w; land = l;
}

// ---------- réglages ----------
function bindSettings() {
  settings.ui ||= {};
  const els = document.querySelectorAll('#panel input[id], #panel select[id]');
  for (const el of els) {
    if (el.type === 'file' || el.closest('#inventory') || ['trace'].includes(el.id)) continue;
    const key = el.id;
    if (key in settings.ui) { if (el.type === 'checkbox') el.checked = settings.ui[key]; else el.value = settings.ui[key]; }
    el.addEventListener('change', () => {
      settings.ui[key] = el.type === 'checkbox' ? el.checked : el.value;
      saveSettings();
      if (key === 'profil') applyProfile();
      else if (['maxday', 'pausegap', 'midday', 'cutmode'].includes(key) && $('profil').value !== 'libre') { $('profil').value = 'libre'; settings.ui.profil = 'libre'; }
      if (key === 'alt') refreshZones();
      if (key === 'mode') $('replanbox').hidden = el.value !== 'replan';
      if (key === 'cat') updateBeaconStyles();
      updateCapacity();
    });
  }
  $('replanbox').hidden = $('mode').value !== 'replan';
}
function applyProfile() {
  const p = PROFILES[$('profil').value];
  if (!p) return;
  for (const [k, v] of Object.entries(p)) {
    const el = $(k);
    if (el.type === 'checkbox') el.checked = v; else el.value = v;
    settings.ui[k] = el.type === 'checkbox' ? el.checked : el.value;
  }
  saveSettings();
}
function cfg() {
  const f = (id) => +$(id).value;
  return {
    mode: $('mode').value, d1: $('d1').value, cat: $('cat').value, tas: f('tas'), alt: f('alt'), maxday: f('maxday'), pausegap: f('pausegap'),
    midday: $('midday').checked, cutmode: $('cutmode').value, hours: $('hours').value ? f('hours') : null, seamax: f('seamax'), margin: f('margin'), optalt: $('optalt').checked, altmax: f('altmax'), climb: f('climb'),
    conso: f('conso'), tank: f('tank'), reserve: f('reserve'), wsrc: $('wsrc').value, wfac: f('wfac'), gmax: f('gmax'), fcdays: f('fcdays'),
    iters: f('prec'), cell: f('cell'),
  };
}
function missionStart(c) {
  if (c.mode !== 'replan') return { clock: 10, lat: home.lat, lon: home.lon };
  const [hh, mm] = ($('nowtime').value || '06:30').split(':').map(Number);
  const lat = parseFloat($('nowlat').value), lon = parseFloat($('nowlon').value);
  return { clock: (f1($('nowday').value) - 1) * 24 + hh + mm / 60, lat: isFinite(lat) ? lat : home.lat, lon: isFinite(lon) ? lon : home.lon, set: isFinite(lat) && isFinite(lon) };
}
const f1 = (v) => parseFloat(v);
function schedOpts(c, start, loc) {
  return { start: start ?? 10, margin: (c.margin || 0) / 60, d1: c.d1, loc, midday: c.midday, maxDay: c.maxday, pauseTarget: c.pausegap, pauseMin: 0.75, contMax: 4, deadline: DEADLINE, cutmode: c.cutmode };
}
function updateCapacity() {
  const c = cfg(), ms = missionStart(c);
  const cap = schedule(1e6, schedOpts(c, ms.clock), [], true).air;
  $('capinfo').innerHTML = `Capacité théorique de ${fmtClock(ms.clock)} jusqu'à l'arrivée (8 août 12h) : <b>${cap.toFixed(1)} h</b> de vol` +
    ` (≈ ${Math.round(cap * c.tas)} km sans vent), pauses de 45 min et nuits déduites. Fatigue, météo et incidents ne le sont pas.`;
}

// ---------- inventaire des espaces aériens ----------
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
    sum.innerHTML = `<span>${TYPE_LABEL[g.t]}${g.c ? ' · conditionnelles (NOTAM, semaine…)' : ''}</span><span class="n">${total}</span>`;
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

// ---------- carte ----------
function catValue(b, cat) { return Math.round(b.base * cats[cat || $('cat').value][1]); }

function initMap() {
  map = L.map('map', { preferCanvas: true }).setView([47, 12], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '© OpenStreetMap' }).addTo(map);
  canvas = L.canvas({ padding: 0.3 });
  zoneLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  pauseLayer = L.layerGroup().addTo(map);
  for (const b of beacons) {
    const m = L.circleMarker([b.lat, b.lon], { radius: 8, color: '#1f5fd1', weight: 1.5, fillColor: '#5b92f0', fillOpacity: 0.7 }).addTo(map);
    m.bindTooltip(b.id.replace('UAC', ''), { permanent: true, direction: 'center', className: 'btip' });
    m.bindPopup(() => beaconPopup(beacons.indexOf(b)), { minWidth: 230 });
    b.marker = m;
  }
  updateBeaconStyles();
  L.marker([home.lat, home.lon], { title: 'LFJY' }).addTo(map).bindPopup('Chambley LFJY — départ et arrivée');
  map.on('click', (e) => {
    if (mapMode === 'pause') {
      const name = prompt('Nom du point de pause (terrain, contact…)', 'Pause');
      const fuel = name ? confirm('Y a-t-il de l\'essence sur place ?') : false;
      mapMode = null; $('addpause').textContent = '+ Ajouter un point (clic sur la carte)';
      if (name) { userPauses.push({ name, lat: e.latlng.lat, lon: e.latlng.lng, fuel }); savePauses(); }
    } else if (mapMode === 'pos') {
      $('nowlat').value = e.latlng.lat.toFixed(3); $('nowlon').value = e.latlng.lng.toFixed(3);
      for (const id of ['nowlat', 'nowlon']) settings.ui[id] = $(id).value;
      saveSettings(); mapMode = null; $('pickpos').textContent = 'Choisir la position sur la carte'; showStart(); updateCapacity();
    }
  });
  map.on('popupopen', (e) => {
    const root = e.popup.getElement();
    root.querySelectorAll('[data-act]').forEach((btn) => {
      btn.onclick = () => {
        const k = +btn.dataset.k;
        if (btn.dataset.act === 'add') editRoute('add', k); else editRoute('del', k);
        map.closePopup();
      };
    });
  });
}
let startMarker;
function showStart() {
  const c = cfg(), ms = missionStart(c);
  if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
  if (c.mode === 'replan' && ms.set) startMarker = L.marker([ms.lat, ms.lon], { title: 'Position actuelle' }).addTo(map).bindTooltip('Position actuelle');
}

function updateBeaconStyles() {
  const vals = beacons.map((b) => catValue(b));
  const vmax = Math.max(...vals);
  beacons.forEach((b, k) => {
    const banked = mission.bank ? mission.bank[k] : 0;
    b.marker.setRadius(5 + 9 * vals[k] / vmax);
    b.marker.setStyle(banked >= 0.95 ? { color: '#2b8a3e', fillColor: '#69db7c' } : banked > 0 ? { color: '#e67700', fillColor: '#ffc078' } : { color: '#1f5fd1', fillColor: '#5b92f0' });
  });
}

function beaconPopup(k) {
  const b = beacons[k], c = cfg(), v = catValue(b);
  let h = `<b>${b.id}</b> · ${b.lat.toFixed(3)}, ${b.lon.toFixed(3)}<br>Valeur max : <b>${v.toLocaleString('fr-FR')} pts</b> (${cats[c.cat][0]})`;
  h += '<table class="mini"><tr><th>Approche</th><th>%</th><th>Points</th></tr>';
  const labels = ['≤ 100 m', '≤ 250 m', '≤ 500 m', '≤ 1 km', '≤ 5 km', '≤ 25 km'];
  TIERS.forEach(([, p], i) => { h += `<tr><td>${labels[i]}</td><td>${Math.round(p * 100)}</td><td>${Math.round(p * v)}</td></tr>`; });
  h += '</table>';
  const others = Object.entries(cats).filter(([id]) => id !== c.cat).map(([id, [n, m]]) => `${n} ${Math.round(b.base * m)}`).join(' · ');
  h += `<div class="note">${others}</div>`;
  if (mission.bank && mission.bank[k] > 0) h += `<div class="good">Déjà acquis par ta trace : ${Math.round(mission.bank[k] * 100)} % (${Math.round(mission.bank[k] * v)} pts)</div>`;
  if (lastRun) {
    const run = lastRun, route = run.best.route, idx = route.indexOf(k);
    const cur = evalRoute(run, route);
    if (idx >= 0) {
      const r2 = route.filter((x) => x !== k), e2 = evalRoute(run, r2);
      h += `<div>Dans l'itinéraire (n° ${idx + 1})</div><button data-act="del" data-k="${k}" class="mini">Retirer : ${Math.round(e2.score - cur.score)} pts, ${fmtDelta(e2.t - cur.t)}</button>`;
    } else {
      const ins = bestInsertion(run, k);
      h += `<button data-act="add" data-k="${k}" class="mini">Ajouter : ${ins.dScore >= 0 ? '+' : ''}${Math.round(ins.dScore)} pts, ${fmtDelta(ins.dT)}</button>`;
    }
  }
  return h;
}
const fmtDelta = (dh) => `${dh >= 0 ? '+' : '−'}${fmtH(Math.abs(dh))} de vol`;

let zoneTimer;
function refreshZones() { clearTimeout(zoneTimer); zoneTimer = setTimeout(drawZones, 150); }
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
    li.innerHTML = `<span>${p.name}${p.fuel ? ' ⛽' : ''} <small>(${p.lat.toFixed(2)}, ${p.lon.toFixed(2)})</small></span>`;
    const x = document.createElement('button');
    x.textContent = '×';
    x.onclick = () => { userPauses.splice(i, 1); savePauses(); };
    li.appendChild(x);
    ul.appendChild(li);
    L.marker([p.lat, p.lon]).addTo(pauseLayer).bindTooltip(p.name + (p.fuel ? ' ⛽' : ''));
  });
}

// ---------- planning d'étapes ----------
// totalT : heures de vol à placer ; o.loc(s) : position [lat, lon] à l'heure de vol cumulée s (lever/coucher du soleil locaux)
function schedule(totalT, o, pauses, limit) {
  const ev = [], dayAir = {};
  const loc = o.loc || (() => [home.lat, home.lon]);
  let s = 0, c = o.start, air = 0, guard = 0;
  const bounds = (d, sx) => { const [la, lo] = loc(sx); const t = SUN.times(la, lo, o.d1, d); return [t.rise + o.margin, t.set - o.margin]; };
  const nextFlyable = (x, sx) => {
    for (let i = 0; i < 40; i++) {
      const d = Math.floor(x / 24), h = x - d * 24, [a, b] = bounds(d, sx);
      if (h < a - 1e-9) return d * 24 + a;
      if (h >= b - 1e-9) { x = (d + 1) * 24; continue; }
      if (o.midday && h >= 11 - 1e-9 && h < 16 - 1e-9) return d * 24 + Math.max(16, a);
      return x;
    }
    return x;
  };
  const winEnd = (x, sx) => { const d = Math.floor(x / 24), h = x - d * 24, [, b] = bounds(d, sx); return d * 24 + ((o.midday && h < 11 - 1e-9) ? Math.min(11, b) : b); };
  while (s < totalT - 1e-6 && guard++ < 600) {
    c = nextFlyable(c, s);
    if (limit && c >= o.deadline) break;
    const d = Math.floor(c / 24), used = dayAir[d] || 0;
    let avail = Math.min(winEnd(c, s) - c, o.maxDay - used);
    if (limit) avail = Math.min(avail, o.deadline - c);
    if (avail < 0.05) {
      c = (o.maxDay - used < 0.05) ? (d + 1) * 24 + 0.01 : winEnd(c, s) + 1e-6;
      continue;
    }
    const left = totalT - s;
    const wE = winEnd(c, s);
    const stopKind = (len) => ((o.maxDay - used - len < 0.05) ? 'nuit' : (o.midday && wE === d * 24 + 11 ? 'arrêt de midi' : 'nuit'));
    let L, kind = 'fin', name = '', fuel = false;
    if (o.cutmode === 'balanced') {
      let n = Math.max(1, Math.ceil(avail / o.pauseTarget - 1e-9));
      let ell = (avail - (n - 1) * o.pauseMin) / n;
      while (ell > o.contMax && n < 12) { n++; ell = (avail - (n - 1) * o.pauseMin) / n; }
      L = Math.min(ell, left);
      if (left > L + 1e-6) kind = n > 1 ? 'pause' : stopKind(L);
      if (kind === 'pause') {
        let best = null;
        for (const p of pauses) if (p.t > s + Math.max(1, ell - 1) && p.t <= s + Math.min(o.contMax, ell + 0.75) && (!best || Math.abs(p.t - (s + L)) < Math.abs(best.t - (s + L)))) best = p;
        if (best) { L = best.t - s; name = best.name; fuel = best.fuel; }
      }
    } else {
      L = Math.min(o.pauseTarget, o.contMax, avail, left);
      if (left > L + 1e-6) {
        if (avail - L < o.pauseMin + 0.75) { L = Math.min(avail, o.contMax, left); kind = stopKind(L); } else kind = 'pause';
        if (kind === 'pause') {
          let best = null;
          for (const p of pauses) if (p.t > s + Math.max(1, L - 1.25) && p.t <= s + Math.min(o.contMax, L + 0.25) && (!best || Math.abs(p.t - (s + L)) < Math.abs(best.t - (s + L)))) best = p;
          if (best) { L = best.t - s; name = best.name; fuel = best.fuel; }
        }
      }
    }
    // coucher du soleil au lieu d'arrivée : on raccourcit le vol si besoin
    const endLimit = d * 24 + bounds(d, s + L)[1];
    if (c + L > endLimit + 1e-6) {
      L = Math.max(0.05, endLimit - c);
      kind = left > L + 1e-6 ? 'nuit' : 'fin'; name = ''; fuel = false;
    }
    ev.push({ day: d, c0: c, c1: c + L, s0: s, s1: s + L, kind, name, fuel });
    s += L; c += L; air += L; dayAir[d] = used + L;
    if (kind === 'pause') c += o.pauseMin;
    else if (kind !== 'fin') c = Math.max(c, wE + 1e-6); // arrêt de midi ou nuit : on ne reprend pas dans la même fenêtre
  }
  return { events: ev, air, end: c, finished: s >= totalT - 1e-6 };
}

const fmtClock = (c) => {
  const d = Math.floor(c / 24), h = c - d * 24;
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh++; mm = 0; }
  return `${d + 1} août ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
const hhmm = (c) => fmtClock(c).split(' ').pop();
function fmtH(h) { let hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return `${hh}h${String(mm).padStart(2, '0')}`; }
// heure locale (fuseau du lieu) si elle diffère de l'heure de Chambley
function localNote(c, lat, lon) {
  const off = SUN.tzOffset(lat, lon);
  return off === SUN.REF_OFFSET ? '' : `<span class="sun">loc. ${hhmm(c + off - SUN.REF_OFFSET)} (UTC+${off})</span>`;
}

// ---------- trace GPX ----------
function parseTrace(text) {
  const pts = [];
  if (/<gpx|<trkpt/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    for (const p of doc.querySelectorAll('trkpt, rtept')) {
      const t = p.querySelector('time');
      pts.push({ lat: +p.getAttribute('lat'), lon: +p.getAttribute('lon'), t: t ? Date.parse(t.textContent) : null });
    }
  } else {
    for (const line of text.split(/\r?\n/)) {
      const f = line.split(/[;,\t]/).map((x) => x.trim());
      const lat = parseFloat(f[0]), lon = parseFloat(f[1]);
      if (!isFinite(lat) || !isFinite(lon)) continue;
      let t = null;
      if (f[2]) { const n = Number(f[2]); t = isFinite(n) && n > 1e9 ? (n < 1e12 ? n * 1000 : n) : Date.parse(f[2]); if (!isFinite(t)) t = null; }
      pts.push({ lat, lon, t });
    }
  }
  return pts.filter((p) => isFinite(p.lat) && isFinite(p.lon));
}

function applyTrace(pts) {
  const n = pts.length;
  if (!n) { $('traceinfo').textContent = 'Aucun point lisible dans ce fichier.'; return; }
  const xy = new Float64Array(2 * n);
  pts.forEach((p, i) => { const [x, y] = GEO.laea(p.lat, p.lon); xy[2 * i] = x; xy[2 * i + 1] = y; });
  // trous de trace : plus de 2 min sans enregistrement (hors règlement : un point par seconde)
  const gaps = [];
  for (let i = 1; i < n; i++) if (pts[i].t && pts[i - 1].t && pts[i].t - pts[i - 1].t > 120000) gaps.push(i);
  const bank = new Float32Array(beacons.length);
  const flags = [];
  beacons.forEach((b, k) => {
    const [bx, by] = GEO.laea(b.lat, b.lon);
    let bd = 1e9;
    for (let i = 0; i < n; i++) { const d = Math.hypot(xy[2 * i] - bx, xy[2 * i + 1] - by); if (d < bd) bd = d; }
    let gd = 1e9;
    for (const i of gaps) { // corde entre les deux points qui encadrent le trou
      const ax = xy[2 * i - 2], ay = xy[2 * i - 1], dx = xy[2 * i] - ax, dy = xy[2 * i + 1] - ay;
      const t = Math.max(0, Math.min(1, ((bx - ax) * dx + (by - ay) * dy) / (dx * dx + dy * dy || 1)));
      gd = Math.min(gd, Math.hypot(bx - ax - t * dx, by - ay - t * dy));
    }
    bank[k] = GEO.tierPct(bd);
    if (gd < bd && GEO.tierPct(gd) > bank[k]) flags.push(`${b.id} (approche probable dans un trou de trace)`);
  });
  mission.bank = bank; mission.trace = pts;
  const v = (k) => catValue(beacons[k]);
  const acquired = beacons.reduce((s, b, k) => s + bank[k] * v(k), 0);
  const last = pts[n - 1];
  $('nowlat').value = last.lat.toFixed(3); $('nowlon').value = last.lon.toFixed(3);
  if (last.t) {
    const local = new Date(last.t + WX.UTC_OFFSET * 3600000);
    $('nowday').value = local.getUTCDate();
    $('nowtime').value = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
  }
  for (const id of ['nowlat', 'nowlon', 'nowday', 'nowtime']) settings.ui[id] = $(id).value;
  saveSettings();
  $('traceinfo').innerHTML = `${n.toLocaleString('fr-FR')} points · dernière position ${last.lat.toFixed(3)}, ${last.lon.toFixed(3)}<br>` +
    `<b>${Math.round(acquired).toLocaleString('fr-FR')} pts déjà acquis</b> sur ${bank.filter((x) => x > 0).length} balises` +
    (gaps.length ? `<br><span class="warn">${gaps.length} trou(s) de trace de plus de 2 min — les balises dans un trou ne comptent pas.</span>` : '') +
    (flags.length ? `<br><span class="bad">À vérifier : ${flags.join(', ')}</span>` : '');
  updateBeaconStyles(); showStart(); updateCapacity();
}

// ---------- prévisions ----------
function neededLevels(c) {
  if (c.wsrc !== 'fc') return [WX.levelFor(c.alt)];
  if (c.optalt) { const l = [925, 850, 800, 700].filter((h) => WX.altOf(h) <= c.altmax); if (l.length) return l; }
  return [WX.levelFor(c.alt)];
}
function fcValid(c) { return !!fc && fc.firstDate === c.d1 && neededLevels({ ...c, wsrc: 'fc' }).every((h) => fc.levels.includes(h)); }
function setFcInfo(msg) {
  $('fcinfo').textContent = msg || (fc ? `Prévisions chargées : niveaux ${fc.levels.join(', ')} hPa, jours J1–J${fc.nDays} (J1 = ${fc.firstDate}).` : 'Prévisions disponibles jusqu\'à 16 jours : avant cela, la climatologie reste utilisée.');
}
async function loadForecast() {
  const c = cfg();
  const today = new Date().toISOString().slice(0, 10);
  const maxEnd = Date.parse(today + 'T00:00:00Z') + 15 * 86400000;
  const first = Date.parse(c.d1 + 'T00:00:00Z');
  const nDays = Math.min(8, Math.floor((maxEnd - first) / 86400000) + 1);
  if (!isFinite(first) || nDays < 1) { setFcInfo(`Le jour J1 (${c.d1}) est à plus de 16 jours : prévisions indisponibles, climatologie utilisée.`); return false; }
  $('loadfc').disabled = true;
  try {
    setFcInfo('Téléchargement des prévisions…');
    fc = await WX.fetchForecast(wind, neededLevels({ ...c, wsrc: 'fc' }), c.d1, nDays, (f) => setFcInfo(`Téléchargement des prévisions… ${Math.round(f * 100)} %`));
    setFcInfo();
    $('fcinfo').textContent += ' Résolution ≈ 270 km : indicatif.';
    if (!lastRun) VIZ.setRange(0, nDays * 24 - 1, fc, fc.levels[0]);
    return true;
  } catch (e) {
    fc = null; setFcInfo(`Prévisions indisponibles (${e.message}). Climatologie utilisée.`); return false;
  } finally { $('loadfc').disabled = false; }
}

// ---------- calcul ----------
function callWorker(msg, onMsg) {
  return new Promise((resolve, reject) => {
    const w = new Worker('engine.js');
    w.onmessage = (e) => { if (e.data.type === msg.type) resolve({ data: e.data, worker: w }); else if (onMsg) onMsg(e.data); };
    w.onerror = (e) => reject(new Error(e.message));
    w.postMessage(msg);
  });
}
function progress(frac, text) {
  $('progress').hidden = false;
  $('bar').style.width = `${Math.round(frac * 100)}%`;
  $('ptext').textContent = text;
}
const climbPenalty = (c, alt) => Math.max(0, alt - 1500) / c.climb / 60 / 2; // heures, par tronçon (montée partagée entre tronçons voisins)

async function computeLevel(c, ms, nodes, nb, hpa, altFt, K, useFc, label, p0, p1) {
  const nn = nodes.length;
  let windObj = wind, wf;
  if (useFc) { const day0 = Math.floor(ms.clock / 24); windObj = WX.windField(fc, hpa, day0, day0 + c.fcdays - 1, { midday: c.midday }); wf = 1; }
  else wf = c.wsrc === 'none' ? 0 : c.wfac;
  const zs = [];
  for (const z of zones) { const s = stateOf(z); if (s > 0 && activeZone(z, altFt)) zs.push({ r: z.r, s }); }
  progress(p0, `${label}Rastérisation de ${zs.length} zones…`);
  const prepRes = await callWorker({ type: 'prep', zones: zs, factors: FACT, cell: c.cell, nodes, wind: windObj, windFactor: wf, land, seaMax: c.seamax });
  prepRes.worker.terminate();
  const prep = prepRes.data;
  let doneSrc = 0;
  const jobs = [];
  for (let k = 0; k < K; k++) {
    const sources = [];
    for (let a = k; a < nn - 1; a += K) sources.push(a);
    jobs.push(callWorker({ type: 'dijk', sources, grid: prep.grid, cost: prep.cost.slice(), state: prep.state.slice(), wu: prep.wu, wv: prep.wv, nodeCells: prep.nodeCells, nodesXY: prep.nodesXY, nb, tas: c.tas },
      (m) => { if (m.type === 'progress') { doneSrc++; progress(p0 + (p1 - p0) * doneSrc / (nn - 1), `${label}Itinéraires entre balises (${doneSrc}/${nn - 1})…`); } }));
  }
  const legs = (await Promise.all(jobs)).flatMap((r) => { r.worker.terminate(); return r.data.legs; });
  const T = new Float64Array(nn * nn).fill(Infinity), M = new Float32Array(nn * nn * nb).fill(1e9);
  const paths = new Map();
  for (let i = 0; i < nn; i++) T[i * nn + i] = 0;
  for (const l of legs) {
    if (!isFinite(l.D)) continue;
    T[l.a * nn + l.b] = l.Tab; T[l.b * nn + l.a] = l.Tba;
    M.set(l.M, (l.a * nn + l.b) * nb); M.set(l.M, (l.b * nn + l.a) * nb);
    paths.set(l.a * nn + l.b, l.pts);
  }
  return { alt: altFt, hpa, prep, T, M, paths };
}

async function runSA(run, budget, iters, label) {
  const { nb, nn, K } = run;
  const prog = new Array(K).fill(0), sas = [];
  for (let k = 0; k < K; k++) {
    sas.push(callWorker({ type: 'sa', nb, nn, M: run.M.slice(), T: run.T.slice(), val: run.val, bank: run.bank, budget, iters, seed: 1000 + 77 * k + Math.floor(budget * 10), t0: 100 * run.mult, startNode: run.START, endNode: run.HOME },
      (m) => { if (m.type === 'sa-progress') { prog[k] = m.k / m.iters; progress(0.55 + 0.4 * prog.reduce((a, b) => a + b, 0) / K, label); } }));
  }
  const res = await Promise.all(sas);
  res.forEach((r) => r.worker.terminate());
  const sorted = res.map((r) => r.data).sort((a, b) => b.score - a.score);
  return { route: sorted[0].route, scores: sorted.map((r) => Math.round(r.score)) };
}

async function compute() {
  const c = cfg(), btn = $('run');
  btn.disabled = true;
  try {
    const ms = missionStart(c);
    if (c.mode === 'replan' && !ms.set) { progress(0, 'Renseigne ta position (carte ou trace GPX) pour replanifier.'); return; }
    if (c.wsrc === 'fc' && !fcValid(c)) await loadForecast();
    const useFc = c.wsrc === 'fc' && fcValid(c);
    const nb = beacons.length, HOME = nb, replan = c.mode === 'replan';
    const nodes = beacons.map((b) => ({ lat: b.lat, lon: b.lon })).concat([{ lat: home.lat, lon: home.lon }]);
    if (replan) nodes.push({ lat: ms.lat, lon: ms.lon });
    const nn = nodes.length, START = replan ? nb + 1 : HOME;
    const K = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2));

    const hpas = useFc ? neededLevels(c) : [useFc ? WX.levelFor(c.alt) : null];
    const multi = hpas.length > 1;
    const levels = [];
    for (let i = 0; i < hpas.length; i++) {
      const altFt = multi ? WX.altOf(hpas[i]) : c.alt;
      const label = multi ? `Altitude ${altFt} ft (${i + 1}/${hpas.length}) · ` : '';
      levels.push(await computeLevel(c, ms, nodes, nb, hpas[i], altFt, K, useFc, label, 0.02 + 0.5 * i / hpas.length, 0.02 + 0.5 * (i + 1) / hpas.length));
    }
    // fusion : pour chaque tronçon orienté, l'altitude la plus rapide (montée comprise)
    const legAlt = new Uint8Array(nn * nn);
    let T, M;
    if (levels.length === 1) { T = levels[0].T; M = levels[0].M; } else {
      T = new Float64Array(nn * nn).fill(Infinity); M = new Float32Array(nn * nn * nb).fill(1e9);
      for (let a = 0; a < nn; a++) for (let b = 0; b < nn; b++) {
        if (a === b) { T[a * nn + b] = 0; continue; }
        let bi = -1, bt = Infinity;
        levels.forEach((l, i) => { const t = l.T[a * nn + b] + climbPenalty(c, l.alt); if (t < bt) { bt = t; bi = i; } });
        if (bi < 0) continue;
        T[a * nn + b] = bt; legAlt[a * nn + b] = bi;
        M.set(levels[bi].M.subarray((a * nn + b) * nb, (a * nn + b + 1) * nb), (a * nn + b) * nb);
      }
    }
    const mult = cats[c.cat][1];
    const run = {
      c, ms, levels, legAlt, nb, nn, T, M, K, START, HOME, mult, multi, useFc,
      val: Float64Array.from(beacons, (b) => b.base * mult),
      bank: mission.bank && replan ? Float32Array.from(mission.bank) : new Float32Array(nb),
      windNote: useFc ? `Open-Meteo ${hpas.join('/')} hPa` : (c.wsrc === 'none' ? 'ignoré' : 'climatologie'),
    };
    run.cap = schedule(1e6, schedOpts(c, ms.clock), [], true).air;

    // optimisation, puis recalage du budget d'heures sur le planning réel (lever/coucher, fuseaux)
    let budget = c.hours || run.cap;
    const cand = [];
    for (let pass = 0; pass < 3; pass++) {
      const label = `Optimisation du parcours${pass ? ` (passe ${pass + 1}, budget ${budget.toFixed(1)} h)` : ''}…`;
      progress(0.55, label);
      const res = await runSA(run, budget, pass ? Math.round(c.iters * 0.7) : c.iters, label);
      run.best = { route: res.route.slice() };
      const tl = buildTimeline(run), sch = scheduleFor(run, tl);
      const ok = sch.finished && sch.end <= DEADLINE + 1e-6;
      cand.push({ ok, sc: evalRoute(run, run.best.route).score, route: res.route.slice(), budget, scores: res.scores, sch });
      if (c.hours) break;
      const slack = sch.finished ? DEADLINE - sch.end : -12;
      if (ok && slack < 2.5) break;
      const ratio = Math.max(0.35, Math.min(0.95, sch.air / Math.max(1, sch.end - ms.clock)));
      budget = Math.max(5, budget + slack * ratio * (ok ? 0.85 : 1.1));
    }
    const pick = cand.filter((x) => x.ok).sort((a, b) => b.sc - a.sc)[0] || cand[cand.length - 1];
    run.best = { route: pick.route.slice() };
    run.budget = pick.budget; run.scores = pick.scores; run.passes = cand.length;
    lastRun = run;
    progress(1, 'Terminé');
    finalize(run);
  } catch (err) {
    progress(0, `Erreur : ${err.message}`);
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// ---------- évaluation d'un itinéraire dans la page (édition manuelle) ----------
function evalRoute(run, route) {
  const { nb, nn, T, M, val, bank, START, HOME } = run;
  const dm = new Float32Array(nb).fill(1e9);
  let t = 0, prev = START;
  for (let q = 0; q <= route.length; q++) {
    const n = q < route.length ? route[q] : HOME;
    t += T[prev * nn + n];
    const base = (prev * nn + n) * nb;
    for (let k = 0; k < nb; k++) if (M[base + k] < dm[k]) dm[k] = M[base + k];
    prev = n;
  }
  const wp = new Set(route);
  let score = 0;
  for (let k = 0; k < nb; k++) {
    let p = GEO.tierPct(dm[k]);
    if (!wp.has(k) && p > 0.65) p = 0.65;
    p -= bank[k];
    if (p > 0) score += p * val[k];
  }
  return { score, t };
}
function bestInsertion(run, k) {
  const base = evalRoute(run, run.best.route);
  let best = null;
  for (let pos = 0; pos <= run.best.route.length; pos++) {
    const r = run.best.route.slice(); r.splice(pos, 0, k);
    const e = evalRoute(run, r);
    if (isFinite(e.t) && (!best || e.score - base.score > best.dScore + 1e-6 || (Math.abs(e.score - base.score - best.dScore) < 1e-6 && e.t < best.t))) best = { pos, dScore: e.score - base.score, dT: e.t - base.t, t: e.t };
  }
  return best || { pos: run.best.route.length, dScore: 0, dT: 0 };
}
function editRoute(act, k) {
  const run = lastRun;
  if (!run) return;
  if (act === 'add') { const ins = bestInsertion(run, k); run.best.route.splice(ins.pos, 0, k); } else run.best.route = run.best.route.filter((x) => x !== k);
  finalize(run, true);
}
window.editRoute = editRoute;

// ---------- chronologie du vol : polyligne, temps, altitude par tronçon ----------
function legPts(run, a, b) {
  const nn = run.nn, lvl = run.levels[run.levels.length > 1 ? run.legAlt[a * nn + b] : 0];
  if (a < b) return { pts: lvl.paths.get(a * nn + b), lvl };
  const o = lvl.paths.get(b * nn + a), pts = new Float32Array(o.length);
  for (let k = 0; k < o.length / 2; k++) { pts[2 * k] = o[o.length - 2 - 2 * k]; pts[2 * k + 1] = o[o.length - 1 - 2 * k]; }
  return { pts, lvl };
}
function buildTimeline(run) {
  const { c, START, HOME } = run, route = run.best.route, seq = [START, ...route, HOME];
  const P = [], segT = [], segLen = [], segAlt = [], segHpa = [], wpIdx = [0];
  const useWind = c.wsrc !== 'none';
  for (let q = 0; q < seq.length - 1; q++) {
    const { pts, lvl } = legPts(run, seq[q], seq[q + 1]);
    const pa = Float64Array.from(pts), n = pa.length / 2;
    const st = GEO.segTimes(pa, lvl.prep.grid, useWind ? lvl.prep.wu : null, useWind ? lvl.prep.wv : null, c.tas);
    for (let k = q === 0 ? 0 : 1; k < n; k++) P.push(pa[2 * k], pa[2 * k + 1]);
    for (let s = 0; s < n - 1; s++) {
      segT.push(st.t[s] + (s === 0 && run.levels.length > 1 ? climbPenalty(c, lvl.alt) : 0));
      segLen.push(st.len[s]); segAlt.push(lvl.alt); segHpa.push(lvl.hpa);
    }
    wpIdx.push(P.length / 2 - 1);
  }
  const PA = Float64Array.from(P), nv = PA.length / 2;
  const cumT = new Float64Array(nv), cumD = new Float64Array(nv);
  for (let i = 1; i < nv; i++) { cumT[i] = cumT[i - 1] + segT[i - 1]; cumD[i] = cumD[i - 1] + segLen[i - 1]; }
  const idxAt = (s) => { let lo = 0, hi = nv - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cumT[m] <= s) lo = m; else hi = m; } return lo; };
  const posAt = (s) => {
    const lo = idxAt(s), hi = Math.min(nv - 1, lo + 1);
    const f = cumT[hi] > cumT[lo] ? Math.min(1, Math.max(0, (s - cumT[lo]) / (cumT[hi] - cumT[lo]))) : 0;
    const x = PA[2 * lo] + f * (PA[2 * hi] - PA[2 * lo]), y = PA[2 * lo + 1] + f * (PA[2 * hi + 1] - PA[2 * lo + 1]);
    return { ll: GEO.inv(x, y), x, y, d: cumD[lo] + f * (cumD[hi] - cumD[lo]) };
  };
  return { PA, nv, cumT, cumD, segAlt, segHpa, wpIdx, total: cumT[nv - 1], km: cumD[nv - 1], idxAt, posAt, seq };
}
function userPausesOnPath(tl) {
  const pp = [];
  for (const u of userPauses) {
    const [ux, uy] = GEO.laea(u.lat, u.lon);
    let bd = 1e9, bi = 0;
    for (let i = 0; i < tl.nv; i++) { const d = Math.hypot(tl.PA[2 * i] - ux, tl.PA[2 * i + 1] - uy); if (d < bd) { bd = d; bi = i; } }
    if (bd <= 30) pp.push({ t: tl.cumT[bi], name: u.name, fuel: u.fuel, d: bd });
  }
  return pp;
}
function scheduleFor(run, tl) {
  const o = schedOpts(run.c, run.ms.clock, (s) => tl.posAt(s).ll);
  return schedule(tl.total, o, userPausesOnPath(tl), false);
}

// ---------- résultat ----------
function finalize(run, edited) {
  const { c, nb, nn, M, val, bank, START, HOME } = run;
  const route = run.best.route, grid = run.levels[0].prep.grid;
  const tl = buildTimeline(run);
  const { PA, nv, cumT, cumD, total, km, posAt, idxAt, wpIdx, seq } = tl;
  const LL = []; for (let i = 0; i < nv; i++) LL.push(GEO.inv(PA[2 * i], PA[2 * i + 1]));

  // points
  const ev = evalRoute(run, route);
  const dmin = new Float32Array(nb).fill(1e9);
  for (let q = 0; q < seq.length - 1; q++) { const base = (seq[q] * nn + seq[q + 1]) * nb; for (let k = 0; k < nb; k++) if (M[base + k] < dmin[k]) dmin[k] = M[base + k]; }
  const wp = new Set(route);
  const rows = [];
  for (let k = 0; k < nb; k++) {
    let p = GEO.tierPct(dmin[k]);
    if (!wp.has(k) && p > 0.65) p = 0.65;
    const gain = Math.max(0, p - bank[k]);
    if (p > 0 && (gain > 0 || wp.has(k))) rows.push({ k, id: beacons[k].id, d: dmin[k], p, pts: gain * val[k], visee: wp.has(k) });
  }
  const acquired = beacons.reduce((s, b, k) => s + bank[k] * val[k], 0);

  const sched = scheduleFor(run, tl);
  const clockAt = (s) => { for (const e of sched.events) if (s <= e.s1 + 1e-9) return e.c0 + Math.max(0, s - e.s0); return sched.end; };
  const nearestBeacon = (x, y) => {
    let bd = 1e9, bk = 0;
    beacons.forEach((b, k) => { const [bx, by] = GEO.laea(b.lat, b.lon); const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; bk = k; } });
    return `${beacons[bk].id.replace('UAC', 'balise ')} (${Math.round(bd)} km)`;
  };

  // conditions prévues par vol
  const conds = sched.events.map((e) => {
    const dur = e.s1 - e.s0, dkm = posAt(e.s1).d - posAt(e.s0).d;
    const gs = dur > 0 ? dkm / dur : 0;
    let w = null;
    if (fc && dur > 0) {
      const samples = [];
      const n = Math.max(1, Math.ceil(dur / 0.25));
      for (let i = 0; i < n; i++) {
        const s = e.s0 + (i + 0.5) * dur / n, a = posAt(s);
        samples.push({ clock: e.c0 + (i + 0.5) * dur / n, lat: a.ll[0], lon: a.ll[1] });
      }
      const mid = tl.segHpa[Math.min(tl.segHpa.length - 1, idxAt((e.s0 + e.s1) / 2))] || fc.levels[0];
      w = WX.stageConditions(fc, samples, fc.levels.includes(mid) ? mid : fc.levels[0]);
    }
    return { gs, tail: gs - c.tas, w, dkm };
  });

  // carte
  routeLayer.clearLayers(); dayLayers = {};
  sched.events.forEach((e) => {
    const i0 = idxAt(e.s0), i1 = Math.min(nv - 1, idxAt(e.s1) + 1);
    const line = [posAt(e.s0).ll, ...LL.slice(i0 + 1, i1), posAt(e.s1).ll];
    const pl = L.polyline(line, { color: DAY_COLORS[e.day % DAY_COLORS.length], weight: 4, opacity: 0.9 }).addTo(routeLayer);
    pl.bindTooltip(`${e.day + 1} août · ${hhmm(e.c0)}→${hhmm(e.c1)} · ${fmtH(e.s1 - e.s0)}`);
    (dayLayers[e.day] ||= []).push(pl);
  });
  route.forEach((k) => L.circleMarker([beacons[k].lat, beacons[k].lon], { radius: 10, color: '#222', weight: 2, fillOpacity: 0, interactive: false }).addTo(routeLayer));
  sched.events.forEach((e, i) => {
    if (e.kind === 'fin') return;
    const pos = posAt(e.s1), night = e.kind.startsWith('nuit');
    const next = sched.events[i + 1];
    const txt = `Atterrissage ${hhmm(e.c1)} (${e.kind})${next ? ` · décollage ${hhmm(next.c0)}` : ''}${e.name ? `<br>${e.name}` : ''}`;
    if (e.kind === 'pause' && !e.name) L.circle(pos.ll, { radius: 30000, color: '#2f9e44', weight: 1, dashArray: '4 4', fillOpacity: 0.08 }).addTo(routeLayer).bindTooltip(txt);
    else L.circleMarker(pos.ll, { radius: night ? 7 : 5, color: night ? '#862e9c' : '#2f9e44', fillOpacity: 0.9 }).addTo(routeLayer).bindTooltip(txt);
  });
  if (!edited) map.fitBounds(L.polyline(LL).getBounds().pad(0.1));

  // résumé
  const late = sched.end > DEADLINE + 1e-6 || !sched.finished;
  const altNote = run.multi ? ` · altitudes ${[...new Set(tl.segAlt)].sort((a, b) => a - b).join('/')} ft` : '';
  $('results').hidden = false; $('noresult').hidden = true;
  $('summary').innerHTML = `
    <div class="kpi">
      <div><b>${Math.round(ev.score + acquired).toLocaleString('fr-FR')}</b><span>points au total (${cats[c.cat][0]})${acquired ? ` dont ${Math.round(acquired).toLocaleString('fr-FR')} acquis` : ''}</span></div>
      <div><b>${total.toFixed(1)} h · ${Math.round(km)} km</b><span>de vol prévus · vent : ${run.windNote}${altNote}</span></div>
      <div><b>${route.length}</b><span>balises visées · ${rows.filter((r) => !r.visee).length} au passage</span></div>
    </div>
    <p class="${late ? 'bad' : 'good'}">Arrivée à LFJY : ${fmtClock(sched.end)} (heure de Chambley) — ${late ? 'APRÈS la limite du 8 août 12h00 : réduis les heures de vol ou retire des balises.' : 'avant la limite du 8 août 12h00.'}</p>
    <p class="note">Budget d'optimisation : ${run.budget.toFixed(1)} h${c.hours ? ' (imposé)' : ` (recalé sur le planning réel en ${run.passes || 1} passe${(run.passes || 1) > 1 ? 's' : ''})`}${edited ? ' · itinéraire modifié à la main' : ` · scores des recuits : ${run.scores.join(', ')}`}.
    Si ces scores divergent beaucoup, relance en précision « Précise ». Clique une balise sur la carte pour l'ajouter ou la retirer.</p>`;

  // pastilles de jours + export GPX
  const days = [...new Set(sched.events.map((e) => e.day))];
  $('daychips').innerHTML = days.map((d) => `<button class="chip" data-day="${d}" style="--c:${DAY_COLORS[d % DAY_COLORS.length]}">${d + 1} août</button>`).join('');
  $('daychips').querySelectorAll('.chip').forEach((b) => { b.onclick = () => focusDay(+b.dataset.day); });
  $('gpxbtns').innerHTML = `<button class="mini" data-gpx="all">⬇ GPX complet</button> ` + days.map((d) => `<button class="mini" data-gpx="${d}">⬇ ${d + 1} août</button>`).join(' ');
  $('gpxbtns').querySelectorAll('button').forEach((b) => { b.onclick = () => exportGPX(b.dataset.gpx === 'all' ? null : +b.dataset.gpx); });
  dayFocus = null;

  // itinéraire
  let html = '<table><tr><th>Jour</th><th>Décollage</th><th>Atterrissage</th><th class="num">Durée</th><th class="num">km</th><th>Vitesse sol</th><th>Conditions prévues</th><th>Arrêt</th></tr>';
  let lastDay = -1;
  sched.events.forEach((e, i) => {
    const a = posAt(e.s0), b = posAt(e.s1), cd = conds[i];
    const stop = e.kind === 'fin' ? 'arrivée LFJY' : `${e.kind}${e.name ? ' — ' + e.name : ''}${e.fuel ? ' ⛽' : ''}<br><small>${nearestBeacon(b.x, b.y)}, ${b.ll[0].toFixed(2)}, ${b.ll[1].toFixed(2)}</small>`;
    const sun = e.day !== lastDay ? (() => { const t = SUN.times(a.ll[0], a.ll[1], c.d1, e.day); return `<span class="sun">☀ ${hhmm(e.day * 24 + t.rise)}–${hhmm(e.day * 24 + t.set)}</span>`; })() : '';
    lastDay = e.day;
    const alt = tl.segAlt[Math.min(tl.segAlt.length - 1, idxAt((e.s0 + e.s1) / 2))];
    html += `<tr data-day="${e.day}"><td style="border-left:4px solid ${DAY_COLORS[e.day % DAY_COLORS.length]}">${e.day + 1} août${sun}</td><td>${hhmm(e.c0)}${localNote(e.c0, a.ll[0], a.ll[1])}</td><td>${hhmm(e.c1)}${localNote(e.c1, b.ll[0], b.ll[1])}</td><td class="num">${fmtH(e.s1 - e.s0)}</td><td class="num">${Math.round(b.d - a.d)}</td>` +
      `<td>${Math.round(cd.gs)} km/h<br><small class="${cd.tail >= 0 ? 'good' : 'warn'}">${cd.tail >= 0 ? 'vent arrière' : 'vent de face'} ${Math.abs(Math.round(cd.tail))}</small>${run.multi ? `<small class="sun">${alt} ft</small>` : ''}</td><td>${condCell(cd.w, c)}</td><td>${stop}</td></tr>`;
  });
  $('itin').innerHTML = html + '</table>' + `<p class="note">${fc ? '' : 'Conditions détaillées : charge les prévisions (section 2). '}Heures données à l'heure de Chambley (UTC+2), avec l'heure locale en gris si elle diffère. ☀ lever–coucher du soleil au lieu de départ du jour. Les arrêts sont des zones conseillées, à confirmer sur place.</p>`;
  $('itin').querySelectorAll('tr[data-day]').forEach((tr) => { tr.onclick = () => focusDay(+tr.dataset.day); });

  fuelPlan(sched, c);

  let bh = '<table><tr><th>#</th><th>Balise</th><th>Passage</th><th class="num">%</th><th class="num">Points</th><th></th></tr>';
  route.forEach((k, i) => {
    const r = rows.find((x) => x.k === k);
    bh += `<tr><td>${i + 1}</td><td>${beacons[k].id}</td><td>${fmtClock(clockAt(cumT[wpIdx[i + 1]]))}</td><td class="num">${r ? Math.round(r.p * 100) : ''}</td><td class="num">${r ? Math.round(r.pts) : ''}</td><td><button class="mini" onclick="editRoute('del',${k})">retirer</button></td></tr>`;
  });
  for (const r of rows.filter((x) => !x.visee).sort((a, b) => b.pts - a.pts)) bh += `<tr><td></td><td>${r.id}</td><td>au passage (${r.d.toFixed(1)} km)</td><td class="num">${Math.round(r.p * 100)}</td><td class="num">${Math.round(r.pts)}</td><td></td></tr>`;
  $('btable').innerHTML = bh + '</table>';

  seaReport(PA, nv, run.levels[0].prep);
  crossings(PA, nv, tl.segAlt);
  if (!edited) showTab('results');

  // simulation / météo animée
  const hpaMain = fc ? (fc.levels.includes(WX.levelFor(c.alt)) ? WX.levelFor(c.alt) : fc.levels[0]) : null;
  run.view = {
    tl, sched, clockAt,
    stateAt: (t) => {
      const evs = sched.events;
      if (!evs.length) return null;
      let e = evs.find((x) => t >= x.c0 - 1e-9 && t <= x.c1 + 1e-9), s, label, kind = 'vol';
      if (e) { s = e.s0 + (t - e.c0); label = `En vol · ${e.day + 1} août`; } else {
        const prev = [...evs].reverse().find((x) => x.c1 <= t);
        if (!prev) { s = 0; label = 'Au sol · départ'; } else { s = prev.s1; label = `Au sol · ${prev.kind === 'fin' ? 'arrivée' : prev.kind}`; }
        kind = 'sol';
      }
      const p = posAt(s), q = posAt(Math.min(total, s + 0.03)), i = Math.min(tl.segAlt.length - 1, idxAt(s));
      const hdg = (Math.atan2(q.x - p.x, q.y - p.y) * 180 / Math.PI + 360) % 360;
      const alt = tl.segAlt[i], h = tl.segHpa[i];
      if (kind === 'vol') label += ` · ${Math.round(c.tas)} km/h air`;
      return { ll: p.ll, hdg: hdg - 45, label, alt, hpa: fc && h && fc.levels.includes(h) ? h : hpaMain };
    },
  };
  VIZ.setRange(Math.floor(sched.events[0].c0) - 1, Math.ceil(sched.end) + 1, fc, hpaMain);
}

function condCell(w, c) {
  if (!w) return '<small>—</small>';
  const dots = '●'.repeat(w.turb) + '○'.repeat(4 - w.turb);
  return `<small>vent ${Math.round(w.wmax)} km/h en route<br>rafales sol ${Math.round(w.gust)}${w.gust > c.gmax ? ' ⚠' : ''}<br>turbulence <span class="${w.turb >= 3 ? 'bad' : w.turb >= 2 ? 'warn' : ''}">${dots}</span>` +
    `${w.storm ? '<br><b class="bad">orage possible</b>' : ''}${w.rain > 0.3 ? `<br>pluie ${w.rain.toFixed(1)} mm/h` : ''}</small>`;
}

function focusDay(d) {
  dayFocus = dayFocus === d ? null : d;
  for (const [day, layers] of Object.entries(dayLayers)) {
    for (const l of layers) l.setStyle({ weight: dayFocus === null ? 4 : (+day === dayFocus ? 8 : 3), opacity: dayFocus === null || +day === dayFocus ? 0.95 : 0.2 });
  }
  document.querySelectorAll('#daychips .chip').forEach((b) => b.classList.toggle('on', dayFocus !== null && +b.dataset.day === dayFocus));
  if (dayFocus !== null && dayLayers[dayFocus]) map.fitBounds(L.featureGroup(dayLayers[dayFocus]).getBounds().pad(0.3));
}

// ---------- export GPX (waypoints, route des balises, trace prévue horodatée) ----------
function exportGPX(day) {
  const run = lastRun;
  if (!run || !run.view) return;
  const { tl, sched, clockAt } = run.view, c = run.c;
  const iso = (clk) => new Date(Date.parse(c.d1 + 'T00:00:00Z') + (clk - SUN.REF_OFFSET) * 3600000).toISOString().replace(/\.\d+Z$/, 'Z');
  const esc = (s) => String(s).replace(/[<>&"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m]));
  const evs = sched.events.filter((e) => day === null || e.day === day);
  if (!evs.length) return;
  const s0 = evs[0].s0, s1 = evs[evs.length - 1].s1;
  let wpts = '', rte = '', trk = '';
  const route = run.best.route;
  route.forEach((k, i) => {
    const s = tl.cumT[tl.wpIdx[i + 1]];
    if (s < s0 - 1e-6 || s > s1 + 1e-6) return;
    const b = beacons[k];
    const d = `${b.id} · ${catValue(b).toLocaleString('fr-FR')} pts max · passage prévu ${fmtClock(clockAt(s))} (heure de Chambley)`;
    wpts += `<wpt lat="${b.lat}" lon="${b.lon}"><time>${iso(clockAt(s))}</time><name>${esc(b.id)}</name><desc>${esc(d)}</desc><sym>Flag, Blue</sym></wpt>\n`;
    rte += `<rtept lat="${b.lat}" lon="${b.lon}"><name>${esc(b.id)}</name></rtept>\n`;
  });
  evs.forEach((e, i) => {
    if (e.kind === 'fin') return;
    const p = tl.posAt(e.s1), nx = evs[i + 1];
    wpts += `<wpt lat="${p.ll[0].toFixed(5)}" lon="${p.ll[1].toFixed(5)}"><time>${iso(e.c1)}</time><name>${esc(`${e.day + 1}/08 ${e.kind}${e.name ? ' ' + e.name : ''}`)}</name>` +
      `<desc>${esc(`Zone de pause/arrêt conseillée (à confirmer). Atterrissage ${hhmm(e.c1)}${nx ? `, décollage ${hhmm(nx.c0)}` : ''} heure de Chambley.`)}</desc><sym>Airport</sym></wpt>\n`;
  });
  trk = '<trk><name>Trace prévue UAC</name>\n';
  for (const e of evs) {
    trk += '<trkseg>\n';
    const i0 = tl.idxAt(e.s0), i1 = Math.min(tl.nv - 1, tl.idxAt(e.s1) + 1);
    const pt = (ll, clk) => `<trkpt lat="${ll[0].toFixed(5)}" lon="${ll[1].toFixed(5)}"><time>${iso(clk)}</time></trkpt>\n`;
    trk += pt(tl.posAt(e.s0).ll, e.c0);
    for (let i = i0 + 1; i < i1; i++) { const ll = GEO.inv(tl.PA[2 * i], tl.PA[2 * i + 1]); trk += pt(ll, e.c0 + (tl.cumT[i] - e.s0)); }
    trk += pt(tl.posAt(e.s1).ll, e.c1);
    trk += '</trkseg>\n';
  }
  trk += '</trk>\n';
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="UAC Planner" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>UAC ${day === null ? 'parcours complet' : `${day + 1} août`}</name></metadata>\n${wpts}<rte><name>Balises</name>\n${rte}</rte>\n${trk}</gpx>\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
  a.download = day === null ? 'uac-parcours.gpx' : `uac-${day + 1}-aout.gpx`;
  document.body.appendChild(a); a.click(); a.remove();
}

// ---------- carburant ----------
function fuelPlan(sched, c) {
  const byDay = {};
  for (const e of sched.events) (byDay[e.day] ||= []).push(e);
  let h = '<table><tr><th>Jour</th><th>Vols</th><th class="num">Besoin</th><th>Ravitaillements</th><th>Verdict</th></tr>';
  for (const [d, evs] of Object.entries(byDay)) {
    // segments entre ravitaillements garantis : nuit, arrêt de midi, point perso avec carburant
    const segs = []; let cur = 0;
    for (const e of evs) {
      cur += e.s1 - e.s0;
      if (e.kind.startsWith('nuit') || e.kind === 'arrêt de midi' || e.fuel || e.kind === 'fin') { segs.push(cur); cur = 0; }
    }
    if (cur > 0) segs.push(cur);
    const need = segs.map((s) => (s + c.reserve) * c.conso);
    const worst = Math.max(...need);
    const ok = worst <= c.tank + 1e-6;
    const flights = evs.map((e) => fmtH(e.s1 - e.s0)).join(' + ');
    const first = (evs[0].s1 - evs[0].s0 + c.reserve) * c.conso;
    h += `<tr><td>${+d + 1} août</td><td>${flights}</td><td class="num">${need.map((n) => Math.round(n) + ' L').join(' / ')}</td>` +
      `<td><small>plein au départ conseillé : ${Math.round(Math.min(first, c.tank))} L (départ léger), le reste en réservoir auxiliaire</small></td>` +
      `<td class="${ok ? 'good' : 'bad'}">${ok ? 'OK' : `manque ${Math.round(worst - c.tank)} L : ravitailler en pause (⛽) ou raccourcir`}</td></tr>`;
  }
  $('fuel').innerHTML = h + `</table><p class="note">Capacité ${c.tank} L à ${c.conso} L/h, réserve ${c.reserve} h. Ravitaillement garanti seulement à la nuit, à l'arrêt de midi et aux points personnels marqués ⛽. Les pauses conseillées ne comptent pas.</p>`;
}

// ---------- mer et espaces aériens ----------
function seaReport(PA, nv, prep) {
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
  $('sea').innerHTML = big.length
    ? '<table><tr><th>Traversée (début)</th><th class="num">Longueur km</th><th class="num">Dist. max côte km</th></tr>' +
      big.slice(0, 12).map((s) => `<tr><td>${s.at[0].toFixed(2)}, ${s.at[1].toFixed(2)}</td><td class="num">${Math.round(s.km)}</td><td class="num ${s.max > 20 ? 'warn' : ''}">${Math.round(s.max)}</td></tr>`).join('') +
      `</table><p class="note">${Math.round(water)} km au-dessus de l'eau au total (tracé de calcul, ±10 km).</p>`
    : '<p class="note">Aucune traversée maritime de plus de 10 km.</p>';
}

function crossings(PA, nv, segAlt) {
  const alts = [...new Set(segAlt)];
  const act = [];
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (let i = 0; i < nv; i++) { minx = Math.min(minx, PA[2 * i]); maxx = Math.max(maxx, PA[2 * i]); miny = Math.min(miny, PA[2 * i + 1]); maxy = Math.max(maxy, PA[2 * i + 1]); }
  for (const z of zones) {
    const s = stateOf(z);
    if (s < 1 || !alts.some((a) => activeZone(z, a))) continue;
    const n = z.r.length / 2, xs = new Float64Array(n), ys = new Float64Array(n);
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (let k = 0; k < n; k++) {
      const [x, y] = GEO.laea(z.r[2 * k + 1] / 1000, z.r[2 * k] / 1000);
      xs[k] = x; ys[k] = y; a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y);
    }
    if (b < minx || a > maxx || d < miny || c > maxy) continue;
    act.push({ z, s, xs, ys, a, b, c, d, km: 0 });
  }
  for (let i = 0; i < nv - 1; i++) {
    const dx = PA[2 * i + 2] - PA[2 * i], dy = PA[2 * i + 3] - PA[2 * i + 1], L = Math.hypot(dx, dy);
    const ns = Math.max(1, Math.round(L / 3));
    for (let q = 0; q < ns; q++) {
      const x = PA[2 * i] + dx * (q + 0.5) / ns, y = PA[2 * i + 1] + dy * (q + 0.5) / ns;
      for (const A of act) {
        if (x < A.a || x > A.b || y < A.c || y > A.d) continue;
        if (!activeZone(A.z, segAlt[Math.min(segAlt.length - 1, i)])) continue;
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
    (agg[`${A.z.k}|${A.z.t}${A.z.c ? '*' : ''}|${A.z.n}`] ||= { z: A.z, s: A.s, km: 0 }).km += A.km;
  }
  const list = Object.values(agg).sort((x, y) => y.s - x.s || y.km - x.km);
  let h = '<table><tr><th>Zone</th><th>Pays</th><th>Traitement</th><th class="num">km</th><th class="num">Plancher–plafond (ft)</th></tr>';
  for (const r of list.slice(0, 60)) {
    h += `<tr><td>${r.z.n}<br><small>${TYPE_LABEL[r.z.t]}${r.z.c ? ' · conditionnelle' : ''}</small></td><td>${r.z.k}</td><td class="${r.s >= 2 ? 'bad' : 'warn'}">${STATE_LABELS[r.s]}</td><td class="num">${r.km.toFixed(0)}</td><td class="num">${r.z.f}–${r.z.h >= 99999 ? '∞' : r.z.h}</td></tr>`;
  }
  $('crossings').innerHTML = list.length ? h + `</table><p class="note">${list.length} zones traversées au total (60 premières affichées). Vérifie leur statut réel (NOTAM, jours d'activité) avant le vol.</p>`
    : '<p class="note">Aucune zone signalée ou évitée n\'est traversée.</p>';
}

// ---------- onglets, réinitialisation, mode hors ligne ----------
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === `tab-${name}`));
  document.querySelectorAll('.tabbtn').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  const el = $(`tab-${name}`); if (el) el.scrollTop = 0;
}

// ---------- démarrage ----------
(async function main() {
  await loadData();
  const cs = $('cat');
  for (const [k, [name, mult]] of Object.entries(cats)) cs.add(new Option(`${name} ×${mult}`, k));
  cs.value = 'AT';
  bindSettings();
  buildInventory();
  initMap();
  VIZ.init(map, { stateAt: (t) => (lastRun && lastRun.view ? lastRun.view.stateAt(t) : null) });
  savePauses();
  updateCapacity();
  drawZones();
  showStart();
  $('addpause').onclick = () => { mapMode = 'pause'; $('addpause').textContent = 'Clique sur la carte…'; };
  $('pickpos').onclick = () => { mapMode = 'pos'; $('pickpos').textContent = 'Clique sur la carte…'; };
  $('loadfc').onclick = loadForecast;
  $('trace').onchange = async (e) => { const f = e.target.files[0]; if (f) applyTrace(parseTrace(await f.text())); };
  for (const id of ['nowlat', 'nowlon', 'nowday', 'nowtime']) $(id).addEventListener('change', () => { showStart(); updateCapacity(); });
  $('run').onclick = compute;
  document.querySelectorAll('.tabbtn').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });
  $('resetui').onclick = () => { if (confirm('Réinitialiser tous les réglages (les points de pause sont conservés) ?')) { localStorage.removeItem('uac-settings'); location.reload(); } };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__ready = true;
})();
