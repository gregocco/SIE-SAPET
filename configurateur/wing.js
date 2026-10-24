// Aile delta souple (type ORYX 16.9) : portage lisible de la construction paramétrique du configurateur DTA Evolution.
// Repère de l'assemblage : x vers l'avant, y vers le haut, z en envergure. Origine locale = point d'accroche de la quille.
import * as THREE from 'three';

const { Vector3 } = THREE;
const rad = THREE.MathUtils.degToRad;

export const KA = {
  span: 10, noseAngleDeg: 128, keelLength: 3.1, hangFromNose: 1.55, rootChord: 2.75, tipChord: 0.85,
  billowRoot: 0.075, billowTip: 0.04, washoutDeg: 11, anhedral: 0.08, pitchDeg: 4, leHeight: 0.06,
  doubleSurface: { root: 0.64, tip: 0.86 }, battensPerSide: 13, scallop: 0.035,
  crossbarStation: 0.58, haubanStation: 0.52,
  trapeze: { baseBar: [0.87, 1.06], halfWidth: 0.72, apexAhead: 0.05 },
  hangAboveMastTop: 0.085, bandFromLE: 1.2, registrationSide: -1,
  keelFrontX: 0.14,   // la quille démarre ici (juste devant la ferrure d'accroche)
};

// ---------------------------------------------------------------- géométrie de la voile
const UB = KA.span / 2;
const MR = UB / Math.tan(rad(KA.noseAngleDeg / 2));
const xB = e => KA.hangFromNose - MR * e;                                    // position x du bord d'attaque à l'abscisse e (0 = emplanture, 1 = saumon)
const chord = e => KA.rootChord + (KA.tipChord - KA.rootChord) * Math.pow(e, 1.15);
const chordScalloped = e => chord(e) - KA.scallop * (1 - Math.abs(Math.cos(Math.PI * e * KA.battensPerSide))) * (0.4 + 0.6 * e);
const leH = e => KA.leHeight - KA.anhedral * e * e;
const washout = e => rad(KA.washoutDeg) * Math.pow(e, 1.3);
const camber = e => 2.6 * Math.sqrt(e) * (1 - e);
const billow = e => KA.billowRoot + (KA.billowTip - KA.billowRoot) * e;
const dblSurf = e => KA.doubleSurface.root + (KA.doubleSurface.tip - KA.doubleSurface.root) * e;

function topPoint(e, a) {
  const c = chord(e), q = a * (chordScalloped(e) / c);
  return new Vector3(xB(e) - q * c, leH(e) + q * c * Math.sin(washout(e)) + billow(e) * c * camber(Math.min(q, 1)), 0);
}
function bottomPoint(e, a) {
  const d = dblSurf(e), c = chord(e), t = topPoint(e, d), k = Math.pow(a, 1.6), y0 = leH(e) - 0.03;
  const y = y0 + (t.y - y0) * k - 0.018 * c * Math.sin(Math.PI * a) * (1 - 0.4 * e) - 0.008 * Math.pow(a, 4);   // léger retrait au raccord avec l'extrados
  return new Vector3(xB(e) - a * d * c, y, 0);
}
const sR = KA.hangFromNose - MR - KA.tipChord - 0.05;
const uvOf = (x, z) => [(z + UB) / (2 * UB), (KA.hangFromNose - x) / (KA.hangFromNose - sR)];

function sailSurface(fn, nSpan, nChord, power) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nSpan; i++) {
    const z = -UB + 2 * UB * i / nSpan, r = Math.min(1, Math.abs(z) / UB);
    for (let j = 0; j <= nChord; j++) {
      const p = fn(r, Math.pow(j / nChord, power));
      pos.push(p.x, p.y, z); uv.push(...uvOf(p.x, z));
    }
  }
  const row = nChord + 1;
  for (let i = 0; i < nSpan; i++) for (let j = 0; j < nChord; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- livrées (textures canvas)
const lite = matchMedia('(max-width: 900px), (pointer: coarse)').matches || (navigator.deviceMemory || 8) <= 4;
const TW = lite ? 1024 : 2048;
const TH = Math.round(TW * (KA.hangFromNose - sR) / KA.span);
const px = (x, z) => { const [u, v] = uvOf(x, z); return [u * TW, v * TH]; };
// Trace une courbe le long de l'envergure. `cont` : on continue le sous-tracé en cours (sinon on en démarre un nouveau),
// indispensable pour fermer une bande entre deux courbes.
function spanPath(ctx, fn, from = -1, to = 1, n = 120, cont = false) {
  for (let i = 0; i <= n; i++) {
    const z = (from + (to - from) * i / n) * UB;
    const [x, y] = px(fn(Math.abs(z) / UB), z);
    (i || cont) ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}
function paintTop(ctx, L) {
  ctx.fillStyle = L.top; ctx.fillRect(0, 0, TW, TH);
  if (L.tip) {   // saumons colorés
    ctx.fillStyle = L.tip;
    for (const side of [1, -1]) {
      ctx.beginPath();
      spanPath(ctx, e => xB(e) + 0.5, side * 0.72, side, 60);
      spanPath(ctx, e => xB(e) - chord(e) - 0.5, side, side * 0.72, 60, true);
      ctx.closePath(); ctx.fill();
    }
  }
  if (L.mylar) {   // panneaux translucides entre les lattes, derrière le bord d'attaque
    ctx.fillStyle = L.mylar;
    for (const s of [1, -1]) for (let i = 1; i < KA.battensPerSide - 2; i++) {
      const e0 = i / KA.battensPerSide, e1 = (i + 1) / KA.battensPerSide, m = 0.045 * UB / KA.battensPerSide;
      const pts = [[xB(e0) - 0.2, (e0 * UB + m) * s], [xB(e0) - 1.15 * (1 - e0 * 0.4), (e0 * UB + m) * s], [xB(e1) - 1.15 * (1 - e1 * 0.4), (e1 * UB - m) * s], [xB(e1) - 0.2, (e1 * UB - m) * s]];
      ctx.beginPath(); pts.forEach(([x, z], k) => { const [X, Y] = px(x, z); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(40,45,55,0.16)'; ctx.lineWidth = 3;
  for (let b = 0; b <= KA.battensPerSide; b++) for (const s of [1, -1]) {
    const e = b / KA.battensPerSide, z = e * UB * s;
    const [x0, y0] = px(xB(e), z), [x1, y1] = px(xB(e) - chord(e), z);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 10; ctx.beginPath(); spanPath(ctx, e => xB(e) - 0.12); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 6; ctx.beginPath(); spanPath(ctx, e => xB(e) - chordScalloped(e) + 0.02, -1, 1, 400); ctx.stroke();
}
function paintBottom(ctx, L, reg) {
  ctx.fillStyle = L.bottom; ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = L.band; ctx.beginPath();
  spanPath(ctx, e => xB(e) - KA.bandFromLE);
  spanPath(ctx, e => xB(e) - dblSurf(e) * chord(e) - 0.3, 1, -1, 120, true);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 3;
  for (const q of [0.55, KA.bandFromLE]) { ctx.beginPath(); spanPath(ctx, e => xB(e) - q); ctx.stroke(); }
  for (const q of [0.3, 0.62]) for (const s of [1, -1]) {
    const z = q * UB * s, [x0, y0] = px(xB(q), z), [x1, y1] = px(xB(q) - chord(q), z);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  if (reg.show && reg.text) {
    const z = 0.34 * UB * KA.registrationSide, [cx, cy] = px(xB(0.34) - 0.62, z);
    const [ax, ay] = px(xB(0.1), 0.1 * UB * KA.registrationSide), [bx, by] = px(xB(0.6), 0.6 * UB * KA.registrationSide);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(by - ay, bx - ax) + Math.PI); ctx.scale(-1, 1);
    ctx.fillStyle = '#111'; ctx.font = `700 ${Math.round(TH * 0.15)}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(reg.text, 0, 0); ctx.restore();
  }
}
function canvasTex() {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = false;
  return t;
}

// ---------------------------------------------------------------- pièces de structure
function tag(m, name) { m.name = name; m.castShadow = m.receiveShadow = true; return m; }
function cyl(mats, a, b, r, mat, name, seg = 20) {
  const A = new Vector3(...a), B = new Vector3(...b);
  const m = tag(new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg, 1), mats[mat]), name);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
// tube qui suit une polyligne, angles arrondis
function bentTube(mats, pts, r, mat, name, round = 0.12) {
  const P = pts.map(p => new Vector3(...p)), path = new THREE.CurvePath();
  let cur = P[0].clone();
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1], u = b.clone().sub(a), v = c.clone().sub(b);
    const s = Math.min(round, u.length() * 0.45, v.length() * 0.45);
    const p0 = b.clone().sub(u.normalize().multiplyScalar(s)), p1 = b.clone().add(v.normalize().multiplyScalar(s));
    path.add(new THREE.LineCurve3(cur, p0)); path.add(new THREE.QuadraticBezierCurve3(p0, b.clone(), p1)); cur = p1;
  }
  path.add(new THREE.LineCurve3(cur, P[P.length - 1]));
  return tag(new THREE.Mesh(new THREE.TubeGeometry(path, 24 * P.length, r, 16, false), mats[mat]), name);
}
function roundedBox(mats, [w, h, d], pos, mat, name, bevel = 0) {
  let geo;
  if (bevel > 0) {
    const q = Math.min(bevel, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4), s = new THREE.Shape();
    const x0 = -w / 2 + q, y0 = -h / 2 + q, W = w - 2 * q, H = h - 2 * q;
    s.moveTo(x0, y0 - q); s.lineTo(x0 + W, y0 - q); s.quadraticCurveTo(x0 + W + q, y0 - q, x0 + W + q, y0);
    s.lineTo(x0 + W + q, y0 + H); s.quadraticCurveTo(x0 + W + q, y0 + H + q, x0 + W, y0 + H + q);
    s.lineTo(x0, y0 + H + q); s.quadraticCurveTo(x0 - q, y0 + H + q, x0 - q, y0 + H);
    s.lineTo(x0 - q, y0); s.quadraticCurveTo(x0 - q, y0 - q, x0, y0 - q);
    geo = new THREE.ExtrudeGeometry(s, { depth: d - 2 * q, bevelEnabled: true, bevelThickness: q, bevelSize: q * 0.98, bevelSegments: 4, curveSegments: 6 });
    geo.translate(0, 0, -(d - 2 * q) / 2); geo.computeVertexNormals();
  } else geo = new THREE.BoxGeometry(w, h, d);
  const m = tag(new THREE.Mesh(geo, mats[mat]), name); m.position.set(...pos); return m;
}
function ellipticTube(mats, a, b, r, sx, mat, name) {   // montant profilé (section aplatie)
  const A = new Vector3(...a), B = new Vector3(...b), g = new THREE.CylinderGeometry(r, r, A.distanceTo(B), 20); g.scale(sx, 1, 1);
  const m = tag(new THREE.Mesh(g, mats[mat]), name);
  const R = B.clone().sub(A).normalize(), G = new Vector3(1, 0, 0).addScaledVector(R, -R.x).normalize(), H = new Vector3().crossVectors(G, R);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(G, R, H)); m.position.copy(A).add(B).multiplyScalar(0.5);
  return m;
}

export const LIVERIES = {
  oryx: { label: 'ORYX — blanc / bleu / rouge (photos)', top: '#F2F2EE', tip: '#1F4FB5', bottom: '#20214F', band: '#C1121C', le: '#B9BEC2', mylar: 'rgba(140,180,220,0.55)' },
  dta: { label: 'DTA — gris clair / ardoise', top: '#F2F2EE', tip: null, bottom: '#34424F', band: '#8E9CAA' },
  steampunk: { label: 'Nuit & cuivre', top: '#E8E6DF', tip: '#20214F', bottom: '#14214D', band: '#C47E52' },
};

// ---------------------------------------------------------------- assemblage
// hang : point d'accroche = sommet du mât, dans le repère de l'assemblage.
export function buildWing(hang) {
  const mats = {
    ALU: new THREE.MeshPhysicalMaterial({ color: '#C9CDD1', metalness: 1, roughness: 0.32 }),
    BLACK: new THREE.MeshPhysicalMaterial({ color: '#1b1c1e', roughness: 0.5, metalness: 0.1 }),
    STEEL: new THREE.MeshPhysicalMaterial({ color: '#A7ABAF', roughness: 0.35, metalness: 0.9 }),
    RUBBER: new THREE.MeshPhysicalMaterial({ color: '#111', roughness: 0.9 }),
    SAIL_TOP: new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0.78, sheen: 0.25, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff'), side: THREE.DoubleSide }),
    SAIL_BOTTOM: new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0.78, sheen: 0.25, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff'), side: THREE.DoubleSide }),
    LE: new THREE.MeshPhysicalMaterial({ color: '#B9BEC2', roughness: 0.85, sheen: 0.3, sheenColor: new THREE.Color('#fff') }),   // fourreau de bord d'attaque
    TIP: new THREE.MeshPhysicalMaterial({ color: '#1F4FB5', roughness: 0.7 }),                                                    // bout d'aile
  };
  const root = new THREE.Group(); root.name = 'AILE';
  const Q = new Vector3(...hang).add(new Vector3(0, KA.hangAboveMastTop, 0));
  const body = new THREE.Group(); body.name = 'WingBody'; body.position.copy(Q); body.rotation.z = rad(KA.pitchDeg); root.add(body);

  const sail = new THREE.Group(); sail.name = 'Voile';
  const texTop = canvasTex(), texBot = canvasTex();
  mats.SAIL_TOP.map = texTop; mats.SAIL_BOTTOM.map = texBot;
  sail.add(tag(new THREE.Mesh(sailSurface(topPoint, 160, 40, 1.4), mats.SAIL_TOP), 'Extrados'));
  sail.add(tag(new THREE.Mesh(sailSurface(bottomPoint, 160, 24, 1.3), mats.SAIL_BOTTOM), 'Intrados'));
  for (const k of [1, -1]) {
    const pts = []; for (let i = 0; i <= 20; i++) { const l = i / 20; pts.push([xB(l) - 0.012, leH(l) - 0.005, l * UB * k]); }
    sail.add(bentTube(mats, pts, 0.042, 'LE', 'Poche de bord d\'attaque', 0.01));
    const tip = topPoint(1, 0);
    const fair = tag(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 16), mats.TIP), 'Carénage de saumon');
    fair.position.set(tip.x - 0.1, tip.y, UB * k); fair.rotation.z = Math.PI / 2; sail.add(fair);
    for (let i = 1; i <= KA.battensPerSide; i++) {
      const l = i / KA.battensPerSide, o = topPoint(l, 1);
      const bt = roundedBox(mats, [0.045, 0.012, 0.018], [o.x + 0.01, o.y + 0.004, l * UB * k], 'BLACK', 'Bout de latte');
      bt.rotation.z = washout(l); sail.add(bt);
    }
  }
  body.add(sail);

  const frame = new THREE.Group(); frame.name = 'Structure';
  // La quille n'est visible que derrière la ferrure d'accroche : à l'avant elle est enfermée dans la voile (pas de tube sous le nez).
  frame.add(cyl(mats, [KA.keelFrontX, 0, 0], [KA.hangFromNose - KA.keelLength, 0, 0], 0.028, 'ALU', 'Quille'));
  const cap = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.04, 24), mats.BLACK), 'Embout de quille'); cap.position.set(KA.hangFromNose - KA.keelLength, 0, 0); cap.rotation.z = Math.PI / 2; frame.add(cap);
  const cbX = KA.hangFromNose - 1.3;
  for (const k of [1, -1]) {
    const pts = []; for (let i = 0; i <= 12; i++) { const l = i / 12; pts.push([xB(l) - 0.012, leH(l) - 0.005, l * UB * k]); }
    frame.add(bentTube(mats, pts, 0.026, 'ALU', 'Bord d\'attaque', 0.01));
    const s = KA.crossbarStation;
    frame.add(cyl(mats, [cbX, 0.12, 0.03 * k], [xB(s) - 0.06, leH(s) + 0.035, s * UB * k], 0.024, 'ALU', 'Traverse'));
  }
  frame.add(roundedBox(mats, [0.1, 0.09, 0.09], [cbX, 0.07, 0], 'ALU', 'Jonction de traverses', 0.008));
  frame.add(roundedBox(mats, [0.16, 0.05, 0.06], [0, -0.03, 0], 'ALU', 'Ferrure d\'accroche', 0.008));
  const toLocal = p => new Vector3(...p).sub(Q).applyAxisAngle(new Vector3(0, 0, 1), -rad(KA.pitchDeg)).toArray();
  const tz = KA.trapeze, apex = [tz.apexAhead, -0.03, 0];
  const corners = [1, -1].map(k => toLocal([tz.baseBar[0], tz.baseBar[1], tz.halfWidth * k]));
  frame.add(roundedBox(mats, [0.08, 0.06, 0.08], [apex[0], apex[1] - 0.02, 0], 'BLACK', 'Sommet de trapèze'));
  corners.forEach((c, i) => {
    const k = i === 0 ? 1 : -1, st = KA.haubanStation;
    frame.add(ellipticTube(mats, [apex[0], apex[1] - 0.04, 0.04 * k], c, 0.016, 2.4, 'BLACK', 'Montant de trapèze'));
    const sp = tag(new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 14), mats.BLACK), 'Coin de trapèze'); sp.position.set(...c); frame.add(sp);
    frame.add(ellipticTube(mats, c, [xB(st) - 0.03, leH(st) - 0.03, st * UB * k], 0.015, 2.6, 'BLACK', 'Hauban rigide'));
    frame.add(cyl(mats, c, [KA.hangFromNose - 0.04, 0, 0], 0.0022, 'STEEL', 'Câble avant', 6));
    frame.add(cyl(mats, c, [KA.hangFromNose - KA.keelLength + 0.05, -0.01, 0], 0.0022, 'STEEL', 'Câble arrière', 6));
  });
  frame.add(cyl(mats, corners[0], corners[1], 0.017, 'ALU', 'Barre de contrôle'));
  for (const c of corners) frame.add(cyl(mats, c, [c[0], c[1], c[2] * 0.62], 0.021, 'RUBBER', 'Poignée'));
  body.add(frame);

  const reg = { text: '', show: false };
  let cur = LIVERIES.oryx;
  root.userData.setLivery = (L = cur, r = reg) => {
    cur = { ...cur, ...L }; Object.assign(reg, r);
    mats.LE.color.set(cur.le || '#B9BEC2'); mats.TIP.color.set(cur.tip || cur.le || '#B9BEC2');
    paintTop(texTop.image.getContext('2d'), cur); paintBottom(texBot.image.getContext('2d'), cur, reg);
    texTop.needsUpdate = texBot.needsUpdate = true;
  };
  root.userData.getLivery = () => ({ ...cur, text: reg.text, show: reg.show });
  root.userData.span = KA.span;
  root.userData.setLivery();
  return root;
}
