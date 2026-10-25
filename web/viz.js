// Météo animée sur la carte : vent (particules), couche prévue (pluie, convection, rafales, nébulosité),
// radar réel RainViewer, et simulation du vol prévu avec les conditions prévues sous l'avion.
(function (g) {
  const B = { s: 33, n: 68, w: -14, e: 34 };
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const imerc = (y) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;

  let map, hooks, bar, canvas, ctx, overlay, particles = [], raf = 0, field = null, fcRef = null, hpa = 850;
  let clock = 10, playing = false, lastTick = 0, range = [0, 24], layerKind = 'rain', radar = { frames: [], layers: [], i: 0, on: false, timer: 0 };
  let plane, trail, windOn = true;

  const $ = (id) => bar.querySelector('#' + id);

  const ramp = {
    rain: (v) => (v < 0.05 ? null : v < 0.5 ? [90, 170, 255, 0.35 + v] : v < 2 ? [30, 90, 230, 0.6] : v < 5 ? [120, 40, 200, 0.7] : [220, 30, 120, 0.8]),
    cape: (v) => (v < 100 ? null : v < 500 ? [255, 220, 80, 0.3] : v < 1000 ? [255, 150, 40, 0.45] : v < 2000 ? [230, 60, 40, 0.55] : [150, 30, 150, 0.65]),
    gust: (v) => (v < 25 ? null : v < 35 ? [120, 200, 90, 0.3] : v < 50 ? [250, 200, 60, 0.45] : [230, 70, 50, 0.6]),
    cloud: (v) => (v < 20 ? null : [255, 255, 255, Math.min(0.55, v / 180)]),
  };
  const KIND_ARR = { rain: 'rain', cape: 'cape', gust: 'gust', cloud: 'cloud' };

  function init(m, h) {
    map = m; hooks = h;
    const c = map.getContainer();
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:450;';
    c.appendChild(canvas);
    ctx = canvas.getContext('2d');
    bar = document.createElement('div');
    bar.id = 'vizbar';
    bar.innerHTML = `
      <div class="vrow"><button id="vplay" title="Lecture / pause">▶</button>
        <input id="vslider" type="range" min="0" max="100" step="0.25" value="0">
        <span id="vtime">—</span><button id="vtoggle" title="Options">⚙</button></div>
      <div class="vrow vopts">
        <label><input id="vwind" type="checkbox" checked> Vent animé</label>
        <label>Couche <select id="vkind"><option value="rain">Pluie prévue</option><option value="cape">Convection (CAPE)</option><option value="gust">Rafales</option><option value="cloud">Nuages</option><option value="">aucune</option></select></label>
        <label><input id="vradar" type="checkbox"> Radar réel</label>
        <label>Vitesse <select id="vspeed"><option value="0.25">× lent</option><option value="0.5" selected>× normal</option><option value="1.5">× rapide</option></select></label>
      </div>
      <div id="vinfo"></div>`;
    c.appendChild(bar);
    L.DomEvent.disableClickPropagation(bar);
    L.DomEvent.disableScrollPropagation(bar);
    $('vtoggle').onclick = () => bar.classList.toggle('open');
    $('vplay').onclick = () => (playing ? pause() : play());
    $('vslider').oninput = () => setTime(+$('vslider').value);
    $('vkind').onchange = () => { layerKind = $('vkind').value; render(true); };
    $('vwind').onchange = () => { windOn = $('vwind').checked; if (!windOn) ctx.clearRect(0, 0, canvas.width, canvas.height); };
    $('vradar').onchange = () => toggleRadar($('vradar').checked);
    map.on('resize', resize); map.on('movestart zoomstart', () => ctx.clearRect(0, 0, canvas.width, canvas.height)); map.on('moveend zoomend', seed);
    resize(); seed();
    loop();
  }

  function resize() {
    const s = map.getSize();
    canvas.width = s.x; canvas.height = s.y;
    seed();
  }
  function seed() {
    const s = map.getSize();
    particles = [];
    for (let i = 0; i < 2200; i++) particles.push({ x: Math.random() * s.x, y: Math.random() * s.y, age: Math.random() * 80 });
  }

  // ---- champ et rendu ----
  function setRange(a, b, fc, h) {
    range = [a, b]; fcRef = fc; if (h) hpa = h;
    const sl = $('vslider');
    sl.min = a; sl.max = b;
    clock = Math.min(Math.max(clock, a), b);
    sl.value = clock;
    setTime(clock);
  }
  function setTime(t) {
    clock = t; $('vslider').value = t;
    const info = hooks.stateAt ? hooks.stateAt(t) : null;
    if (info && info.hpa) hpa = info.hpa;
    field = fcRef ? WX.fieldAt(fcRef, hpa, t) : null;
    render(false);
    const d = Math.floor(t / 24), h = t - d * 24;
    let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh++; mm = 0; }
    $('vtime').textContent = `${d + 1} août ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    updatePlane(info);
  }

  function render(force) {
    if (!fcRef || !field || !field.ok || !layerKind) { if (overlay) { map.removeLayer(overlay); overlay = null; } return; }
    const arr = field[KIND_ARR[layerKind]];
    const W = 200, xs = (B.e - B.w) * Math.PI / 180, ys = merc(B.n) - merc(B.s), H = Math.round(W * ys / xs);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      const lat = imerc(merc(B.n) - (j + 0.5) / H * ys);
      for (let i = 0; i < W; i++) {
        const lon = B.w + (i + 0.5) / W * (B.e - B.w);
        const col = ramp[layerKind](WX.sample(fcRef, arr, lat, lon));
        if (!col) continue;
        const o = 4 * (j * W + i);
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = Math.round(col[3] * 255);
      }
    }
    cx.putImageData(img, 0, 0);
    const url = cv.toDataURL();
    if (!overlay) { overlay = L.imageOverlay(url, [[B.s, B.w], [B.n, B.e]], { opacity: 1, interactive: false, zIndex: 300 }).addTo(map); } else overlay.setUrl(url);
  }

  // ---- particules de vent ----
  function loop() {
    raf = requestAnimationFrame(loop);
    if (playing) {
      const now = performance.now();
      if (now - lastTick > 90) {
        const sp = +$('vspeed').value; // heures simulées par seconde réelle ≈ sp × 2
        const next = clock + (now - lastTick) / 1000 * sp * 2;
        lastTick = now;
        if (next >= range[1]) { pause(); setTime(range[1]); } else setTime(next);
      }
    }
    if (!windOn || !fcRef || !field || !field.ok) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1.1;
    const s = map.getSize();
    for (const p of particles) {
      const ll = map.containerPointToLatLng([p.x, p.y]);
      const u = WX.sample(fcRef, field.u, ll.lat, ll.lng), v = WX.sample(fcRef, field.v, ll.lat, ll.lng);
      const spd = Math.hypot(u, v), k = 0.12;
      const nx = p.x + u * k, ny = p.y - v * k;
      ctx.strokeStyle = spd < 15 ? 'rgba(60,120,200,.85)' : spd < 30 ? 'rgba(40,160,120,.9)' : spd < 45 ? 'rgba(220,160,20,.95)' : 'rgba(210,50,40,.95)';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny; p.age++;
      if (p.age > 90 || p.x < 0 || p.y < 0 || p.x > s.x || p.y > s.y) { p.x = Math.random() * s.x; p.y = Math.random() * s.y; p.age = 0; }
    }
  }

  // ---- simulation de vol ----
  function updatePlane(info) {
    if (!info || !info.ll) { if (plane) { map.removeLayer(plane); plane = null; } $('vinfo').textContent = ''; return; }
    if (!plane) plane = L.marker(info.ll, { icon: L.divIcon({ className: 'plane', html: '✈', iconSize: [28, 28] }), zIndexOffset: 1000, interactive: false }).addTo(map);
    plane.setLatLng(info.ll);
    const el = plane.getElement();
    if (el) el.firstChild && (el.style.transform = el.style.transform.replace(/ rotate\([^)]*\)/, '') + ` rotate(${Math.round(info.hdg || 0)}deg)`);
    let txt = `<b>${info.label}</b>`;
    if (fcRef && field && field.ok) {
      const u = WX.sample(fcRef, field.u, info.ll[0], info.ll[1]), v = WX.sample(fcRef, field.v, info.ll[0], info.ll[1]);
      const rain = WX.sample(fcRef, field.rain, info.ll[0], info.ll[1]), gust = WX.sample(fcRef, field.gust, info.ll[0], info.ll[1]), cape = WX.sample(fcRef, field.cape, info.ll[0], info.ll[1]);
      const dir = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;
      txt += `<br>vent ${Math.round(Math.hypot(u, v))} km/h du ${Math.round(dir)}° à ${info.alt || '—'} ft · rafales sol ${Math.round(gust)} · pluie ${rain.toFixed(1)} mm/h · CAPE ${Math.round(cape)}`;
    }
    $('vinfo').innerHTML = txt;
  }
  function play() { if (range[1] <= range[0]) return; if (clock >= range[1] - 0.01) setTime(range[0]); playing = true; lastTick = performance.now(); $('vplay').textContent = '⏸'; }
  function pause() { playing = false; $('vplay').textContent = '▶'; }

  // ---- radar réel RainViewer ----
  async function toggleRadar(on) {
    radar.on = on;
    clearInterval(radar.timer);
    for (const l of radar.layers) map.removeLayer(l);
    radar.layers = [];
    if (!on) return;
    try {
      const j = await (await fetch('https://api.rainviewer.com/public/weather-maps.json')).json();
      const frames = [...j.radar.past, ...(j.radar.nowcast || [])];
      radar.frames = frames;
      radar.layers = frames.map((f) => L.tileLayer(`${j.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: 0, zIndex: 320, maxNativeZoom: 7, maxZoom: 12 }).addTo(map));
      radar.i = frames.length - 1;
      const show = () => {
        radar.layers.forEach((l, i) => l.setOpacity(i === radar.i ? 0.7 : 0));
        const t = new Date(frames[radar.i].time * 1000);
        $('vinfo').innerHTML = `Radar réel ${String(t.getUTCHours() + 2).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} (heure de Chambley)${radar.i >= j.radar.past.length ? ' · prévision immédiate' : ''}`;
      };
      show();
      radar.timer = setInterval(() => { radar.i = (radar.i + 1) % frames.length; show(); }, 600);
    } catch (e) {
      $('vinfo').textContent = `Radar indisponible (${e.message}).`;
      $('vradar').checked = false;
    }
  }

  g.VIZ = { init, setRange, setTime, play, pause, get clock() { return clock; } };
})(window);
