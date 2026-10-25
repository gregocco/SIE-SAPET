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
      if (key === 'alt') { refreshZones(); fc = null; setFcInfo(); }
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
    midday: $('midday').checked, cutmode: $('cutmode').value, hours: $('hours').value ? f('hours') : null, seamax: f('seamax'),
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
function schedOpts(c, start) {
  return { start: start ?? 10, dayStart: 6.5, dayEnd: 20.5, midday: c.midday, maxDay: c.maxday, pauseTarget: c.pausegap, pauseMin: 0.75, contMax: 4, deadline: DEADLINE, cutmode: c.cutmode };
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
    const stopKind = (len) => ((o.maxDay - used - len < 0.05) ? 'nuit' : (o.midday && winEnd(c) === d * 24 + 11 ? 'arrêt de midi' : 'nuit'));
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
    ev.push({ day: d, c0: c, c1: c + L, s0: s, s1: s + L, kind, name, fuel });
    const wE = winEnd(c);
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
function setFcInfo(msg) {
  $('fcinfo').textContent = msg || (fc ? `Prévisions chargées : ${fc.pts.length} points, niveau ${fc.hpa} hPa (≈ ${WX.levelFor ? '' : ''}${$('alt').value} ft), jours J1–J${fc.nDays}.` : 'Prévisions disponibles jusqu\'à 16 jours : avant cela, la climatologie reste utilisée.');
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
    fc = await WX.fetchForecast(wind, c.alt, c.d1, nDays, (f) => setFcInfo(`Téléchargement des prévisions… ${Math.round(f * 100)} %`));
    setFcInfo(`Prévisions chargées : niveau ${fc.hpa} hPa, jours J1–J${fc.nDays} (J1 = ${c.d1}). Résolution ≈ 270 km : indicatif.`);
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

async function compute() {
  const c = cfg(), btn = $('run');
  btn.disabled = true;
  try {
    const ms = missionStart(c);
    if (c.mode === 'replan' && !ms.set) { progress(0, 'Renseigne ta position (carte ou trace GPX) pour replanifier.'); return; }
    if (c.wsrc === 'fc' && !fc) await loadForecast();
    const nb = beacons.length, HOME = nb;
    const replan = c.mode === 'replan';
    const nodes = beacons.map((b) => ({ lat: b.lat, lon: b.lon })).concat([{ lat: home.lat, lon: home.lon }]);
    if (replan) nodes.push({ lat: ms.lat, lon: ms.lon });
    const nn = nodes.length, START = replan ? nb + 1 : HOME;
    const K = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2));

    let windObj = wind, wf = c.wsrc === 'none' ? 0 : c.wfac, windNote = 'climatologie';
    if (c.wsrc === 'fc' && fc) {
      const day0 = Math.floor(ms.clock / 24);
      windObj = WX.windField(fc, day0, day0 + c.fcdays - 1, { midday: c.midday }); wf = 1; windNote = windObj.src;
    }
    const zs = [];
    for (const z of zones) { const s = stateOf(z); if (s > 0 && activeZone(z, c.alt)) zs.push({ r: z.r, s }); }
    progress(0.02, `Rastérisation de ${zs.length} zones…`);
    const prepRes = await callWorker({ type: 'prep', zones: zs, factors: FACT, cell: c.cell, nodes, wind: windObj, windFactor: wf, land, seaMax: c.seamax });
    prepRes.worker.terminate();
    const prep = prepRes.data;

    let doneSrc = 0;
    const jobs = [];
    for (let k = 0; k < K; k++) {
      const sources = [];
      for (let a = k; a < nn - 1; a += K) sources.push(a);
      jobs.push(callWorker({ type: 'dijk', sources, grid: prep.grid, cost: prep.cost.slice(), state: prep.state.slice(), wu: prep.wu, wv: prep.wv, nodeCells: prep.nodeCells, nodesXY: prep.nodesXY, nb, tas: c.tas },
        (m) => { if (m.type === 'progress') { doneSrc++; progress(0.05 + 0.45 * doneSrc / (nn - 1), `Itinéraires entre balises (${doneSrc}/${nn - 1})…`); } }));
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

    const cap = schedule(1e6, schedOpts(c, ms.clock), [], true).air;
    const budget = c.hours || cap;
    const mult = cats[c.cat][1];
    const val = Float64Array.from(beacons, (b) => b.base * mult);
    const bank = mission.bank && replan ? Float32Array.from(mission.bank) : new Float32Array(nb);

    progress(0.52, 'Optimisation du parcours…');
    const prog = new Array(K).fill(0);
    const sas = [];
    for (let k = 0; k < K; k++) {
      sas.push(callWorker({ type: 'sa', nb, nn, M: M.slice(), T: T.slice(), val, bank, budget, iters: c.iters, seed: 1000 + 77 * k, t0: 100 * mult, startNode: START, endNode: HOME },
        (m) => { if (m.type === 'sa-progress') { prog[k] = m.k / m.iters; progress(0.52 + 0.43 * prog.reduce((a, b) => a + b, 0) / K, 'Optimisation du parcours…'); } }));
    }
    const res = await Promise.all(sas);
    res.forEach((r) => r.worker.terminate());
    const best = res.map((r) => r.data).sort((a, b) => b.score - a.score)[0];
    lastRun = { c, ms, prep, nb, nn, T, M, paths, val, bank, budget, cap, best: { route: best.route.slice() }, START, HOME, windNote, scores: res.map((r) => Math.round(r.data.score)) };
    progress(1, 'Terminé');
    finalize(lastRun);
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

// ---------- résultat ----------
function finalize(run, edited) {
  const { c, prep, nb, nn, paths, M, val, bank, START, HOME } = run;
  const route = run.best.route, grid = prep.grid;
  const seq = [START, ...route, HOME];
  const P = [], wpIdx = [0];
  for (let q = 0; q < seq.length - 1; q++) {
    const a = seq[q], b = seq[q + 1];
    let pts;
    if (a < b) pts = paths.get(a * nn + b);
    else { const o = paths.get(b * nn + a); pts = new Float32Array(o.length); for (let k = 0; k < o.length / 2; k++) { pts[2 * k] = o[o.length - 2 - 2 * k]; pts[2 * k + 1] = o[o.length - 1 - 2 * k]; } }
    for (let k = q === 0 ? 0 : 1; k < pts.length / 2; k++) P.push(pts[2 * k], pts[2 * k + 1]);
    wpIdx.push(P.length / 2 - 1);
  }
  const PA = Float64Array.from(P);
  const useWind = c.wsrc !== 'none';
  const st = GEO.segTimes(PA, grid, useWind ? prep.wu : null, useWind ? prep.wv : null, c.tas);
  const nv = PA.length / 2;
  const cumT = new Float64Array(nv), cumD = new Float64Array(nv);
  for (let i = 1; i < nv; i++) { cumT[i] = cumT[i - 1] + st.t[i - 1]; cumD[i] = cumD[i - 1] + st.len[i - 1]; }
  const total = cumT[nv - 1], km = cumD[nv - 1];
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

  // pauses personnelles
  const pp = [];
  for (const u of userPauses) {
    const [ux, uy] = GEO.laea(u.lat, u.lon);
    let bd = 1e9, bi = 0;
    for (let i = 0; i < nv; i++) { const d = Math.hypot(PA[2 * i] - ux, PA[2 * i + 1] - uy); if (d < bd) { bd = d; bi = i; } }
    if (bd <= 30) pp.push({ t: cumT[bi], name: u.name, fuel: u.fuel, d: bd });
  }
  const sched = schedule(total, schedOpts(c, run.ms.clock), pp, false);
  const idxAt = (s) => { let lo = 0, hi = nv - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cumT[m] <= s) lo = m; else hi = m; } return lo; };
  const posAt = (s) => {
    const lo = idxAt(s), hi = Math.min(nv - 1, lo + 1);
    const f = cumT[hi] > cumT[lo] ? Math.min(1, Math.max(0, (s - cumT[lo]) / (cumT[hi] - cumT[lo]))) : 0;
    const x = PA[2 * lo] + f * (PA[2 * hi] - PA[2 * lo]), y = PA[2 * lo + 1] + f * (PA[2 * hi + 1] - PA[2 * lo + 1]);
    return { ll: GEO.inv(x, y), x, y, d: cumD[lo] + f * (cumD[hi] - cumD[lo]) };
  };
  const clockAt = (s) => {
    for (const e of sched.events) if (s <= e.s1 + 1e-9) return e.c0 + Math.max(0, s - e.s0);
    return sched.end;
  };
  const nearestBeacon = (x, y) => {
    let bd = 1e9, bk = 0;
    beacons.forEach((b, k) => { const [bx, by] = GEO.laea(b.lat, b.lon); const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; bk = k; } });
    return `${beacons[bk].id.replace('UAC', 'balise ')} (${Math.round(bd)} km)`;
  };

  // conditions par vol
  const conds = sched.events.map((e) => {
    const dur = e.s1 - e.s0, dkm = posAt(e.s1).d - posAt(e.s0).d;
    const gs = dur > 0 ? dkm / dur : 0;
    let w = null;
    if (fc) {
      const samples = [];
      const n = Math.max(1, Math.ceil(dur / 0.25));
      for (let i = 0; i < n; i++) {
        const s = e.s0 + (i + 0.5) * dur / n, a = posAt(s), b = posAt(Math.min(total, s + 0.05));
        const hx = b.x - a.x, hy = b.y - a.y, hl = Math.hypot(hx, hy) || 1;
        samples.push({ clock: e.c0 + (i + 0.5) * dur / n, lat: a.ll[0], lon: a.ll[1], hx: hx / hl, hy: hy / hl });
      }
      w = WX.stageConditions(fc, samples, c.tas);
    }
    return { gs, tail: gs - c.tas, w, dkm };
  });

  // carte
  routeLayer.clearLayers(); dayLayers = {};
  sched.events.forEach((e, i) => {
    const i0 = idxAt(e.s0), i1 = Math.min(nv - 1, idxAt(e.s1) + 1);
    const line = [posAt(e.s0).ll, ...LL.slice(i0 + 1, i1), posAt(e.s1).ll];
    const col = DAY_COLORS[e.day % DAY_COLORS.length];
    const pl = L.polyline(line, { color: col, weight: 4, opacity: 0.9 }).addTo(routeLayer);
    pl.bindTooltip(`${e.day + 1} août · ${hhmm(e.c0)}→${hhmm(e.c1)} · ${fmtH(e.s1 - e.s0)}`);
    (dayLayers[e.day] ||= []).push(pl);
  });
  route.forEach((k, i) => {
    L.circleMarker([beacons[k].lat, beacons[k].lon], { radius: 10, color: '#222', weight: 2, fillOpacity: 0, interactive: false }).addTo(routeLayer);
  });
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
  $('results').hidden = false;
  $('summary').innerHTML = `
    <div class="kpi">
      <div><b>${Math.round(ev.score + acquired).toLocaleString('fr-FR')}</b><span>points au total (${cats[c.cat][0]})${acquired ? ` dont ${Math.round(acquired).toLocaleString('fr-FR')} acquis` : ''}</span></div>
      <div><b>${total.toFixed(1)} h · ${Math.round(km)} km</b><span>de vol prévus · vent : ${run.windNote}</span></div>
      <div><b>${route.length}</b><span>balises visées · ${rows.filter((r) => !r.visee).length} au passage</span></div>
    </div>
    <p class="${late ? 'bad' : 'good'}">Arrivée à LFJY : ${fmtClock(sched.end)} — ${late ? 'APRÈS la limite du 8 août 12h00 : réduis les heures de vol ou retire des balises.' : 'avant la limite du 8 août 12h00.'}</p>
    <p class="note">Budget d'optimisation : ${run.budget.toFixed(1)} h${c.hours ? ' (imposé)' : ' (capacité calculée)'}${edited ? ' · itinéraire modifié à la main' : ` · scores des ${run.scores.length} recuits : ${run.scores.join(', ')}`}.
    Si ces scores divergent beaucoup, relance en précision « Précise ». Clique une balise sur la carte pour l'ajouter ou la retirer.</p>`;

  // pastilles de jours
  const days = [...new Set(sched.events.map((e) => e.day))];
  $('daychips').innerHTML = days.map((d) => `<button class="chip" data-day="${d}" style="--c:${DAY_COLORS[d % DAY_COLORS.length]}">${d + 1} août</button>`).join('');
  $('daychips').querySelectorAll('.chip').forEach((b) => { b.onclick = () => focusDay(+b.dataset.day); });
  dayFocus = null;

  // itinéraire
  let html = '<table><tr><th>Jour</th><th>Décollage</th><th>Atterrissage</th><th class="num">Durée</th><th class="num">km</th><th>Vitesse sol</th><th>Conditions prévues</th><th>Arrêt</th></tr>';
  sched.events.forEach((e, i) => {
    const a = posAt(e.s0), b = posAt(e.s1), cd = conds[i];
    const stop = e.kind === 'fin' ? 'arrivée LFJY' : `${e.kind}${e.name ? ' — ' + e.name : ''}${e.fuel ? ' ⛽' : ''}<br><small>${nearestBeacon(b.x, b.y)}, ${b.ll[0].toFixed(2)}, ${b.ll[1].toFixed(2)}</small>`;
    html += `<tr data-day="${e.day}"><td style="border-left:4px solid ${DAY_COLORS[e.day % DAY_COLORS.length]}">${e.day + 1} août</td><td>${hhmm(e.c0)}</td><td>${hhmm(e.c1)}</td><td class="num">${fmtH(e.s1 - e.s0)}</td><td class="num">${Math.round(b.d - a.d)}</td>` +
      `<td>${Math.round(cd.gs)} km/h<br><small class="${cd.tail >= 0 ? 'good' : 'warn'}">${cd.tail >= 0 ? 'vent arrière' : 'vent de face'} ${Math.abs(Math.round(cd.tail))}</small></td><td>${condCell(cd.w, c)}</td><td>${stop}</td></tr>`;
  });
  $('itin').innerHTML = html + '</table>' + `<p class="note">${fc ? '' : 'Conditions détaillées : charge les prévisions (section 2). '}Les arrêts sont des zones conseillées, à confirmer sur place (terrain, carburant, météo). Heure locale supposée UTC+2 partout.</p>`;
  $('itin').querySelectorAll('tr[data-day]').forEach((tr) => { tr.onclick = () => focusDay(+tr.dataset.day); });

  fuelPlan(sched, c);

  // balises du parcours (avec retrait)
  let bh = '<table><tr><th>#</th><th>Balise</th><th>Passage</th><th class="num">%</th><th class="num">Points</th><th></th></tr>';
  route.forEach((k, i) => {
    const r = rows.find((x) => x.k === k);
    const s = cumT[wpIdx[i + 1]];
    bh += `<tr><td>${i + 1}</td><td>${beacons[k].id}</td><td>${fmtClock(clockAt(s))}</td><td class="num">${r ? Math.round(r.p * 100) : ''}</td><td class="num">${r ? Math.round(r.pts) : ''}</td><td><button class="mini" onclick="editRoute('del',${k})">retirer</button></td></tr>`;
  });
  for (const r of rows.filter((x) => !x.visee).sort((a, b) => b.pts - a.pts)) bh += `<tr><td></td><td>${r.id}</td><td>au passage (${r.d.toFixed(1)} km)</td><td class="num">${Math.round(r.p * 100)}</td><td class="num">${Math.round(r.pts)}</td><td></td></tr>`;
  $('btable').innerHTML = bh + '</table>';

  seaReport(PA, nv, prep);
  crossings(PA, nv, c.alt);
  if (!edited) $('results').scrollIntoView({ behavior: 'smooth' });
  run.view = { sched, total, km };
}

function condCell(w, c) {
  if (!w) return '<small>—</small>';
  const dots = '●'.repeat(w.turb) + '○'.repeat(4 - w.turb);
  const bad = w.gust > c.gmax || w.storm;
  return `<small>vent ${Math.round(w.wmax)} km/h en route<br>rafales sol ${Math.round(w.gust)}${w.gust > c.gmax ? ' ⚠' : ''}<br>turbulence <span class="${w.turb >= 3 ? 'bad' : w.turb >= 2 ? 'warn' : ''}">${dots}</span>` +
    `${w.storm ? '<br><b class="bad">orage possible</b>' : ''}${w.rain > 0.3 ? `<br>pluie ${w.rain.toFixed(1)} mm/h` : ''}${bad ? '' : ''}</small>`;
}

function focusDay(d) {
  dayFocus = dayFocus === d ? null : d;
  for (const [day, layers] of Object.entries(dayLayers)) {
    for (const l of layers) l.setStyle({ weight: dayFocus === null ? 4 : (+day === dayFocus ? 8 : 3), opacity: dayFocus === null || +day === dayFocus ? 0.95 : 0.2 });
  }
  document.querySelectorAll('#daychips .chip').forEach((b) => b.classList.toggle('on', dayFocus !== null && +b.dataset.day === dayFocus));
  if (dayFocus !== null && dayLayers[dayFocus]) map.fitBounds(L.featureGroup(dayLayers[dayFocus]).getBounds().pad(0.3));
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
  for (let i = 0; i < nv - 1; i++) {
    const dx = PA[2 * i + 2] - PA[2 * i], dy = PA[2 * i + 3] - PA[2 * i + 1], L = Math.hypot(dx, dy);
    const ns = Math.max(1, Math.round(L / 3));
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

// ---------- démarrage ----------
(async function main() {
  await loadData();
  const cs = $('cat');
  for (const [k, [name, mult]] of Object.entries(cats)) cs.add(new Option(`${name} ×${mult}`, k));
  cs.value = 'AT';
  bindSettings();
  buildInventory();
  initMap();
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
  window.__ready = true;
})();
