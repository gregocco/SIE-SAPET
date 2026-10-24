// Scène v2 : chorégraphie des 8 judokas, caméra 3D (travellings, dolly, grue), ceinture physique (chaîne
// verlet simulée à l'initialisation, donc déterministe), effets, HUD. renderAt(t) est une fonction pure de t.
'use strict';
(function () {
  const { clamp, lerp, sstep, s5, eio, bump, hash, noise1, D2R, F, V, camBasis, project, camLerp, mixc, shade, lum } = U;
  const R = Dojo.ROOM, CX = R.CX, FRONTZ = 450, BACKZ = 880;
  const frontX = i => 255 + i * 200;
  const backX = i => CX + (i - 3.5) * 140;
  const PODIUM = { zf: 560, depth: 160, blocks: [{ x0: CX - 125 - 340, w: 340, h: 72, n: '2' }, { x0: CX - 125, w: 250, h: 96, n: '1' }, { x0: CX + 125, w: 340, h: 56, n: '3' }] };
  const PODIUM_SLOTS = { 1: [0, -105], 2: [0, 0], 3: [0, 105], 0: [1, -58], 7: [1, 58], 4: [2, -105], 5: [2, 0], 6: [2, 105] };
  const STAND = [frontX(0) + 100, 372];
  const SUN = V.norm([-0.35, 0.62, 1.0]), SUNCOL = [3.0, 2.35, 1.6];
  let TL, SEGS, OPEN, FIN, MEM = [], BELTS, PASSES = [], SHOTS = [], CUTS = [], DOJO, OW, OH;
  const S = {}; // état exposé aux contrôles (qc.js)

  // ---------------- temps des mots ----------------
  function wordT(m, w, k = 0) {
    const ws = m.words || []; let n = 0;
    for (const x of ws) if (x.w.toLowerCase().includes(w.toLowerCase())) { if (n === k) return x.t; n++; }
    return null;
  }

  // ---------------- bibliothèque de poses des bras (repère local de l'avatar) ----------------
  function GP(name, sd, L) {
    const sw = L.sw;
    switch (name) {
      case 'rest': return { w: [sd * (sw + 5.5), -88, 8], hand: 'relax' };
      case 'open': return { w: [sd * (sw + 5), -124, 26], hand: 'open' };
      case 'openHi': return { w: [sd * (sw + 8), -136, 24], hand: 'open' };
      case 'wide': return { w: [sd * (sw + 22), -132, 14], hand: 'open' };
      case 'present': return { w: [sd * (sw + 16), -122, 24], hand: 'open' };
      case 'heart': return { w: [sd * 6, -142, 22], hand: 'flat' };
      case 'fist': return { w: [sd * (sw - 2), -128, 26], hand: 'fist' };
      case 'fistLow': return { w: [sd * (sw - 6), -108, 26], hand: 'fist' };
      case 'guard': return sd < 0 ? { w: [-10, -152, 34], hand: 'fist' } : { w: [18, -138, 30], hand: 'fist' };
      case 'pointUp': return { w: [sd * (sw + 8), -146, 24], hand: 'open' };
      case 'thumb': return { w: [sd * (sw - 5), -130, 28], hand: 'thumb' };
      case 'temple': return { w: [sd * 37, -193, 8], hand: 'point', abs: sd * 100 };
      case 'glasses': return { w: [sd * 35, -191, 10], hand: 'pinch', abs: sd * 100 };
      case 'lips': return { w: [sd * 6, -142, 22], hand: 'flat' };
      case 'raise': return { w: [sd * (sw + 1), -230, 4], hand: 'open' };
      case 'cheer': return { w: [sd * (sw + 9), -226, 6], hand: 'open' };
      case 'fistUp': return { w: [sd * (sw + 3), -224, 6], hand: 'fist' };
      case 'pointSide': return { w: [sd * (sw + 52), -150, 6], hand: 'point', abs: -sd * 92 };
      case 'push': return { w: [sd * 11, -140, 38], hand: 'open' };
      case 'clasp': return { w: [sd * 3.5, -132, 28], hand: 'fist' };
      case 'pinchOut': return { w: [sd * (sw + 12), -136, 22], hand: 'pinch', abs: sd * 90 };
      case 'pinchIn': return { w: [sd * 5, -136, 28], hand: 'pinch', abs: sd * 90 };
      case 'down': return { w: [sd * (sw + 8), -112, 20], hand: 'open' };
      case 'catch': return { w: [sd * 9, -130, 30], hand: 'open' };
      case 'tie': return { w: [sd * 4, -117, 18], hand: 'grip' };
      case 'knot': return sd > 0 ? { w: [4, -116, 18], hand: 'grip' } : GP('rest', sd, L);
      case 'pulled': return { w: [sd * (sw + 12), -146, 14], hand: 'grip' };
      case 'windup': return { w: [sd * (sw + 6), -170, -8], hand: 'grip' };
      case 'release': return { w: [sd * (sw - 2), -158, 42], hand: 'open' };
      case 'give': return { w: [sd * (sw + 26), -128, 22], hand: 'grip' };
      case 'take': return { w: [sd * (sw + 22), -128, 22], hand: 'grip' };
      case 'holdBelt': return { w: [sd * (sw + 4), -120, 22], hand: 'grip' };
      case 'rei': return { w: [sd * 11, -70, 10], hand: 'flat' };
      case 'slap': return { w: [sd * (sw + 52), -126, 0], hand: 'flat' };
      case 'tuck': return { w: [sd * 8, -150, 30], hand: 'fist' };
    }
    return GP('rest', sd, L);
  }

  // ---------------- mise en place ----------------
  function setupScene() {
    SEGS = TL.segs; BELTS = TL.belts; OPEN = SEGS[0]; FIN = SEGS[SEGS.length - 1];
    OPEN.E = OPEN.vstart + OPEN.vdur; OPEN.N = OPEN.start + OPEN.dur;
    FIN.S = FIN.start; FIN.V = FIN.vstart; FIN.E = FIN.vstart + FIN.vdur; FIN.N = FIN.start + FIN.dur;
    MEM = [];
    for (let i = 0; i < 8; i++) {
      const s = SEGS[i + 1];
      const m = Object.assign({}, s, { i, look: LOOKS[s.id], X: frontX(i), BX: backX(i) });
      m.k = m.look.height; m.S = s.start; m.V = s.vstart; m.E = s.vstart + s.vdur; m.N = s.start + s.dur;
      m.Ep = i === 0 ? OPEN.E : SEGS[i].vstart + SEGS[i].vdur;
      m.walkIn = [m.Ep - 1.75, m.Ep - 0.15];
      m.Tc = m.S + 0.3; m.tie = [m.Tc, m.Tc + 0.45]; m.rei = [m.S + 0.78, m.S + 1.52];
      m.walkBack = i < 7 ? [m.N + 0.3, m.N + 1.9] : null;
      m.seed = i * 1.618 + 0.7;
      MEM.push(m);
    }
    PASSES = [];
    for (let p = 0; p < 8; p++) {
      const r = MEM[p];
      PASSES.push({ p, Tf: r.Ep + 0.45, Tc: r.Tc, kind: p === 0 ? 'stand' : p === 3 ? 'spool' : p === 6 ? 'hand' : 'throw' });
    }
    // gestes (pistes de clés par bras)
    for (const m of MEM) buildKeys(m);
    for (const P of PASSES) if (P.kind !== 'hand') simulatePass(P);
    buildShots();
  }

  // ---------------- clés de gestes ----------------
  function buildKeys(m) {
    const L = m.look, i = m.i, K = [];
    const key = (t, l, r, dur = 0.35) => { if (t != null) K.push({ t, L: l, R: r, dur }); };
    const W = (w, k = 0, off = 0) => { const x = wordT(m, w, k); return x == null ? null : x + off; };
    key(-100, 'rest', 'rest');
    // réception, nœud, salut
    const P = PASSES[i];
    if (P.kind === 'hand') { key(P.Tf + 0.1, null, 'take', 0.45); key(P.Tf + 0.7, null, 'holdBelt', 0.4); }
    else key(m.Tc - 0.45, 'catch', 'catch', 0.4);
    key(m.Tc + 0.02, 'tie', 'tie', 0.22);
    key(m.Tc + 0.42, 'rest', 'rest', 0.3);
    key(m.rei[0] - 0.05, 'rei', 'rei', 0.3);
    key(m.rei[1] - 0.32, 'rest', 'rest', 0.32);
    if (i === 3) { // Haja : chute amortie (yoko ukemi) avant de parler
      const U0 = m.S + 1.55; m.ukemi = U0;
      key(U0, 'tuck', 'tuck', 0.3); key(U0 + 0.42, 'slap', 'tuck', 0.18); key(U0 + 1.1, 'rest', 'rest', 0.4); key(U0 + 1.55, 'open', 'open', 0.25); key(U0 + 1.9, 'rest', 'rest', 0.3);
    }
    // gestes de la réplique
    const V0 = m.V;
    switch (i) {
      case 0: key(V0 + 0.05, 'open', 'open'); key(W('garde', 0, -0.25), 'guard', 'guard'); key(W('vision', 0, -0.2), 'rest', 'temple'); key(W('XL', 0, -0.2), 'present', 'present'); key(W('deux', 0, -0.25), 'open', 'pointUp'); break;
      case 1: key(V0 + 0.05, 'rest', 'pointUp'); key(W('combat', 0, -0.2), 'rest', 'fist'); key(W('synergie', 0, -0.35), 'clasp', 'clasp'); key(W('équipes', 0, -0.2), 'wide', 'wide'); key(W('GF', 0, -0.2), 'rest', 'thumb'); break;
      case 2: key(V0 + 0.05, 'open', 'open'); key(W('fil', 0, -0.3), 'pinchIn', 'pinchIn', 0.25); key(W('fil', 0, 0.05), 'pinchIn', 'pinchOut', 0.45); key(W('prise', 0, -0.2), 'fist', 'fist'); key(W('contrôle', 0, -0.2), 'down', 'down'); key(W('fluidité', 0, -0.2), 'open', 'present'); key(W('Bobine', 0, -0.2), 'present', 'present'); key(W('tient', 0, -0.2), 'pinchIn', 'pinchIn', 0.25); key(W('fil', 1, -0.05), 'pinchIn', 'pinchOut', 0.45); break;
      case 3: key(V0 + 0.05, 'rest', 'open'); key(W('projection', 0, -0.25), 'rest', 'raise', 0.28); key(W('adhérence', 0, -0.25), 'fistLow', 'fistLow'); key(W('stabilité', 0, -0.2), 'down', 'down'); key(W('Idéal', 0, -0.2), 'rest', 'thumb'); key(W('pieds', 0, -0.2), 'down', 'down'); key(W('route', 0, -0.3), 'rest', 'present'); break;
      case 4: key(V0 + 0.0, 'rest', 'lips'); key(W('anticiper', 0, -0.25), 'rest', 'temple'); key(W('Voir', 0, -0.2), 'rest', 'glasses'); key(W('arrive', 0, -0.1), 'open', 'open'); key(W('Optic', 0, -0.2), 'present', 'present'); key(W('regard', 0, -0.35), 'rest', 'glasses'); break;
      case 5: key(V0 + 0.05, 'rest', 'pinchIn'); key(W('changer', 0, -0.25), 'open', 'open'); key(W('Mloctet', 0, -0.2), 'rest', 'present'); key(W('optimise', 0, -0.2), 'pinchIn', 'pinchOut'); key(W('performance', 0, -0.3), 'rest', 'thumb'); break;
      case 6: key(V0 + 0.05, 'rest', 'fist'); key(W('coordination', 0, -0.25), 'open', 'open'); key(W('coach', 0, -0.15), 'rest', 'present'); key(W('athlètes', 0, -0.15), 'open', 'open'); key(W('outils', 0, -0.15), 'present', 'rest'); key(W('connecte', 0, -0.25), 'clasp', 'clasp'); key(m.E - 1.6, 'rest', 'pointSide', 0.4); break;
      case 7: key(V0 + 0.05, 'open', 'open'); key(W('force', 0, -0.3), 'push', 'push'); key(W('Arc', 0, -0.3), 'rest', 'present'); key(W('Ciel', 0, 0.0), 'rest', 'raise', 0.45); key(W('déchets', 0, -0.2), 'fistLow', 'fistLow'); key(W('transforme', 0, -0.2), 'open', 'open'); key(W('ressources', 0, -0.25), 'wide', 'wide'); break;
    }
    key(m.E + 0.0, 'rest', 'rest', 0.35);
    // don de la ceinture au suivant
    if (i < 7) {
      const N = PASSES[i + 1];
      if (N.kind === 'hand') { key(m.E + 0.05, 'rest', 'knot', 0.25); key(m.E + 0.3, 'rest', 'pulled', 0.2); key(N.Tf + 0.0, 'rest', 'give', 0.5); key(N.Tf + 0.85, 'rest', 'rest', 0.4); }
      else {
        key(m.E + 0.05, 'rest', 'knot', 0.22); key(m.E + 0.27, 'rest', 'pulled', 0.15);
        key(N.Tf - 0.18, 'rest', 'windup', 0.14); key(N.Tf - 0.03, 'rest', 'release', 0.1); key(N.Tf + 0.45, 'rest', 'rest', 0.5);
      }
    } else {
      key(m.E + 0.1, 'rest', 'fistUp', 0.3); key(m.N - 1.0, 'cheer', 'cheer', 0.35);
    }
    // acclamations de la ligne du fond à la fin (Matthias)
    const L7 = MEM[7] || m;
    void L7;
    K.sort((a, b) => a.t - b.t);
    m.keys = K;
  }
  function evalArm(m, t, side) {
    const K = m.keys, L = m.look, sd = side === 'L' ? -1 : 1;
    let cur = GP('rest', sd, L), prev = cur, k0 = null;
    for (const k of K) {
      const nm = side === 'L' ? k.L : k.R; if (nm == null) continue;
      if (k.t > t) break;
      prev = cur; cur = GP(nm, sd, L); k0 = k;
      if (t < k.t + k.dur) { const u = s5(k.t, k.t + k.dur, t); const q = u < 0.5 ? prev : cur; return { w: V.lerp(prev.w, cur.w, u), hand: q.hand, abs: q.abs, u }; }
    }
    return { w: cur.w.slice(), hand: cur.hand, abs: cur.abs, u: 1 };
  }

  // ---------------- chaîne verlet de la ceinture en vol ----------------
  const NB = 18, SEGL = 6.0;
  function simulatePass(P) {
    const r = MEM[P.p], g = P.p > 0 ? MEM[P.p - 1] : null;
    const A = P.kind === 'stand' ? [STAND[0], 34, STAND[1]] : handWorld(g, P.Tf, 'R');
    const B = [r.X + 0, 130 * r.k, FRONTZ - 26 * r.k];
    P.A = A; P.B = B;
    const dur = P.Tc - P.Tf, dt = 1 / 240, steps = Math.ceil(dur / dt);
    const arc = P.kind === 'stand' ? 95 : P.kind === 'spool' ? 120 : 85;
    const lead = u => { const v = u; return [lerp(A[0], B[0], v), lerp(A[1], B[1], v) + arc * 4 * v * (1 - v), lerp(A[2], B[2], v)]; };
    let pos = [], prv = [];
    const dir = V.norm(V.sub(B, A));
    for (let k = 0; k < NB; k++) {
      let q;
      if (P.kind === 'stand') { const row = Math.floor(k / 6), c = k % 6; q = [A[0] - 15 + (row % 2 ? 5 - c : c) * 6, 31 + row * 2.2, A[2] - 4 + row * 2]; }
      else if (P.kind === 'spool') { const a = k * 0.9; q = [A[0] + Math.cos(a) * (2 + k * 0.5), A[1] + Math.sin(a) * (2 + k * 0.5), A[2]]; }
      else q = [A[0] - dir[0] * k * SEGL * 0.6, A[1] - k * SEGL * 0.75, A[2] - dir[2] * k * SEGL * 0.6];
      pos.push(q); prv.push(q.slice());
    }
    const frames = [];
    for (let s = 0; s <= steps; s++) {
      const tt = s * dt, u = clamp(tt / dur);
      pos[0] = lead(u);
      for (let k = 1; k < NB; k++) {
        const p = pos[k], q = prv[k];
        const vx = (p[0] - q[0]) * 0.986, vy = (p[1] - q[1]) * 0.986, vz = (p[2] - q[2]) * 0.986;
        prv[k] = p.slice();
        const flut = Math.sin(tt * 19 - k * 0.95) * 11000 * Math.pow(k / NB, 0.7) * Math.sin(Math.PI * clamp(u * 1.15));
        pos[k] = [p[0] + vx + (-dir[2]) * flut * dt * dt, p[1] + vy - 900 * dt * dt + flut * 0.4 * dt * dt, p[2] + vz + dir[0] * flut * dt * dt * 0.5];
      }
      for (let it = 0; it < 8; it++) for (let k = 1; k < NB; k++) {
        const a = pos[k - 1], b = pos[k]; const d = V.sub(b, a); const l = V.len(d) || 1; const diff = (l - SEGL) / l;
        if (k === 1) pos[k] = V.sub(b, V.mul(d, diff)); else { pos[k - 1] = V.add(a, V.mul(d, diff * 0.5)); pos[k] = V.sub(b, V.mul(d, diff * 0.5)); }
      }
      if (P.kind === 'spool') { const w = Math.pow(1 - u, 1.6); for (let k = 1; k < NB; k++) { const a = k * 0.75 + tt * 12; const tq = [pos[0][0] + Math.cos(a) * (3 + k * 0.9), pos[0][1] + Math.sin(a) * (3 + k * 0.9), pos[0][2]]; pos[k] = V.lerp(pos[k], tq, w); } }
      if (s % 2 === 0) frames.push(pos.map(p => p.slice()));
    }
    P.frames = frames; P.fdt = dt * 2;
  }
  function chainAt(P, t) {
    const x = (t - P.Tf) / P.fdt; const k = clamp(Math.floor(x), 0, P.frames.length - 2); const u = clamp(x - k);
    return P.frames[k].map((p, i) => V.lerp(p, P.frames[k + 1][i], u));
  }

  // ---------------- caméra ----------------
  function camM(m, kind, dx = 0, dz = 0) {
    const X = m.mx != null ? m.mx : m.X, Z = FRONTZ, k = m.k;
    if (kind === 'MW') return { pos: [X + dx, 152 * k, Z - 560 + dz], tgt: [X + dx * 0.25, 100 * k, Z], f: 1500, ap: 0.55, focus: 560 - dz, res: 0.8 };
    if (kind === 'MWW') return { pos: [X - 60 + dx, 140, Z - 700 + dz], tgt: [X - 70 + dx * 0.25, 90, Z], f: 1450, ap: 0.4, focus: 700 - dz, res: 0.85 };
    if (kind === 'MED') return { pos: [X + dx, 165 * k, Z - 340 + dz], tgt: [X - 26 + dx * 0.25, 146 * k, Z], f: 1620, ap: 1.15, focus: 340 - dz, res: 0.6 };
    if (kind === 'CU') return { pos: [X + dx, 184 * k, Z - 255 + dz], tgt: [X - 20 + dx * 0.25, 170 * k, Z], f: 1720, ap: 1.6, focus: 255 - dz, res: 0.55 };
  }
  function shot(t0, t1, a, b, ease = 'io', via = null) { SHOTS.push({ t0, t1, a, b, ease, via }); }
  function buildShots() {
    SHOTS = [];
    const m0 = MEM[0];
    const O1a = { pos: [CX, 245, -1350], tgt: [CX, 168, 800], f: 1380, ap: 0.12, focus: 2100, res: 1 }, O1b = { pos: [CX, 196, -640], tgt: [CX, 150, 800], f: 1380, ap: 0.15, focus: 1440, res: 1 };
    shot(0, 5.6, O1a, O1b, 'out');
    const O2 = { pos: [m0.X + 150, 150, FRONTZ - 640], tgt: [m0.X + 70, 98, 430], f: 1480, ap: 0.4, focus: 640, res: 0.9 };
    shot(5.6, PASSES[0].Tf + 0.1, O1b, O2, 'io');
    shot(PASSES[0].Tf + 0.1, m0.Tc, O2, camM(m0, 'MW', -30), 'io');
    for (const m of MEM) {
      const last = m.i === 7, mid = cutPoint(m);
      if (m.i === 3) {
        shot(m.Tc, m.ukemi - 0.05, camM(m, 'MW', -30, 0), camM(m, 'MW', -10, 40), 'lin');
        shot(m.ukemi - 0.05, m.V + 0.25, camM(m, 'MWW', 0, 0), camM(m, 'MWW', 20, 40), 'lin');
      } else shot(m.Tc, m.V + 0.25, camM(m, 'MW', -30, 0), camM(m, 'MW', 30, 60), 'lin');
      shot(m.V + 0.25, mid, camM(m, 'MED', -18, 0), camM(m, 'MED', 18, 26), 'lin');
      shot(mid, m.E - 0.05, camM(m, 'CU', 12, 0), camM(m, 'CU', -12, 22), 'lin');
      if (last) {
        shot(m.E - 0.05, m.E + 0.1, camM(m, 'MW', -20, 30), camM(m, 'MW', -16, 24), 'lin');
        const G = { pos: [1000, 205, -330], tgt: [1000, 112, 720], f: 1700, ap: 0.25, focus: 1050, res: 1 };
        shot(m.E + 0.1, m.E + 2.0, camM(m, 'MW', -16, 24), G, 'io');
        shot(m.E + 2.0, m.N + 0.05, G, { pos: [1000, 205, -300], tgt: [1000, 112, 720], f: 1700, ap: 0.25, focus: 1020, res: 1 }, 'lin');
        continue;
      }
      const n = MEM[m.i + 1], P = PASSES[m.i + 1];
      if (P.kind === 'hand') {
        const two = (dx, dz) => { const X = (m.X + n.X) / 2; return { pos: [X + dx, 140, FRONTZ - 640 + dz], tgt: [X + dx * 0.3, 112, FRONTZ], f: 1500, ap: 0.45, focus: 640 - dz, res: 0.85 }; };
        shot(m.E - 0.05, P.Tf + 0.45, two(-20, 0), two(-5, 30), 'lin');
        shot(P.Tf + 0.45, n.Tc, two(-5, 30), camM(n, 'MW', -30), 'io');
      } else {
        shot(m.E - 0.05, P.Tf, camM(m, 'MW', -20, 30), camM(m, 'MW', 10, 50), 'lin');
        shot(P.Tf, n.Tc, camM(m, 'MW', 10, 50), camM(n, 'MW', -30), 'io', { pos: [0, 42, -120], tgt: [0, 40, 0] });
      }
    }
    const P0 = { pos: [CX, 238, 640 - 960], tgt: [CX, 152, 660], f: 1640, ap: 0.25, focus: 960, res: 1 };
    const P1 = { pos: [CX, 232, 640 - 900], tgt: [CX, 150, 660], f: 1640, ap: 0.25, focus: 900, res: 1 };
    const P2 = { pos: [CX - 40, 236, 640 - 960], tgt: [CX - 20, 152, 660], f: 1640, ap: 0.25, focus: 960, res: 1 };
    shot(FIN.S, FIN.S + 6.0, P0, P1, 'lin');
    shot(FIN.S + 6.0, FIN.N + 0.1, P1, P2, 'io');
    SHOTS.sort((a, b) => a.t0 - b.t0);
    CUTS = [];
    for (let k = 1; k < SHOTS.length; k++) {
      const a = SHOTS[k - 1].b, b = SHOTS[k].a; if (V.len(V.sub(a.pos, b.pos)) > 2 || V.len(V.sub(a.tgt, b.tgt)) > 2 || Math.abs(a.f - b.f) > 5) CUTS.push(SHOTS[k].t0);
    }
    S.CUTS = CUTS;
  }
  function cutPoint(m) {
    const ch = m.chunks || []; let best = m.V + m.vdur * 0.5, bd = 1e9;
    for (let k = 1; k < ch.length; k++) { const tt = ch[k].t0; if (Math.abs(tt - (m.V + m.vdur * 0.5)) < bd) { bd = Math.abs(tt - (m.V + m.vdur * 0.5)); best = tt; } }
    if (m.i === 3) best = Math.max(best, m.V + 2.6);
    return clamp(best, m.V + 1.4, m.E - 1.6);
  }
  function cameraAt(t) {
    let s = SHOTS[0];
    for (const x of SHOTS) if (t >= x.t0) s = x;
    const u = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0));
    const e = s.ease === 'lin' ? u : s.ease === 'out' ? 1 - Math.pow(1 - u, 2.2) : eio(u);
    const c = camLerp(s.a, s.b, e);
    c.res = lerp(s.a.res || 1, s.b.res || 1, e);
    if (s.via) { const k = Math.sin(Math.PI * e); c.pos = V.add(c.pos, V.mul(s.via.pos, k)); c.tgt = V.add(c.tgt, V.mul(s.via.tgt, k)); }
    // secousse à l'impact de la chute de Haja
    const H = MEM[3]; if (H.ukemi) { const ti = H.ukemi + 0.75; const sh = bump(t, ti, ti + 0.35, 0.1) * 3; if (sh > 0) { c.pos = V.add(c.pos, [Math.sin(t * 71) * sh, Math.sin(t * 57) * sh * 0.7, 0]); } }
    return c;
  }

  // ---------------- état d'un membre ----------------
  function walkGait(p, phase, w, sw) {
    const s1 = Math.sin(phase);
    p.legs.L = { lift: Math.max(0, s1) * 9 * w }; p.legs.R = { lift: Math.max(0, -s1) * 9 * w };
    p.bob += -Math.abs(Math.cos(phase)) * 2.2 * w;
    p.armL.w = V.add(p.armL.w, [0, -Math.max(0, -s1) * 4 * w, -s1 * 12 * w]);
    p.armR.w = V.add(p.armR.w, [0, -Math.max(0, s1) * 4 * w, s1 * 12 * w]);
    void sw;
  }
  function stateAt(m, t) {
    const L = m.look, sd = m.seed;
    const p = { bow: 0, bob: 0, breath: Math.sin(t * 2.0 + sd), head: { yaw: 0, pitch: 0, roll: 0 },
      face: { open: 0, wide: 0, smile: L.smile * 0.8, blink: 0, browUp: 0, browIn: 0, lookX: 0, lookY: 0, wink: 0, squint: 0 }, legs: {}, belt: null, rot: 0 };
    // clignements déterministes
    const per = 3.1 + 1.7 * hash(m.i + 3), ph = ((t + hash(m.i) * 9) % per) / per; p.face.blink = ph < 0.05 ? Math.sin(ph / 0.05 * Math.PI) : 0;
    p.head.yaw = 3 * noise1(t * 0.5, sd); p.head.pitch = 1.5 * noise1(t * 0.4, sd + 3); p.head.roll = 1.2 * noise1(t * 0.35, sd + 6);
    if (t >= FIN.S) return finalState(m, t, p);
    const a = evalArm(m, t, 'L'), b = evalArm(m, t, 'R');
    p.armL = { w: a.w, hand: a.hand, abs: a.abs }; p.armR = { w: b.w, hand: b.hand, abs: b.abs };
    // micro-mouvements des bras au repos
    p.armL.w = V.add(p.armL.w, [noise1(t * 0.6, sd) * 1.2, noise1(t * 0.5, sd + 1) * 1.0, 0]);
    p.armR.w = V.add(p.armR.w, [noise1(t * 0.55, sd + 2) * 1.2, noise1(t * 0.45, sd + 4) * 1.0, 0]);
    // position : entrée (fond -> avant), retour (avant -> fond)
    const wi = s5(m.walkIn[0], m.walkIn[1], t);
    let x = lerp(m.BX, m.X, wi), z = lerp(BACKZ, FRONTZ, wi), y = 0;
    let dist = wi * Math.hypot(m.X - m.BX, FRONTZ - BACKZ), walkW = clamp((s5(m.walkIn[0], m.walkIn[1], t + 0.03) - s5(m.walkIn[0], m.walkIn[1], t - 0.03)) / 0.06 * 0.7);
    if (m.walkBack) {
      const wb = s5(m.walkBack[0], m.walkBack[1], t);
      if (wb > 0) { const fx = x + (m.offX ? 0 : 0); x = lerp(fx, m.BX, wb); z = lerp(z, BACKZ, wb); dist += wb * Math.hypot(m.X - m.BX, FRONTZ - BACKZ) * 0.8; walkW = Math.max(walkW, clamp((s5(m.walkBack[0], m.walkBack[1], t + 0.03) - s5(m.walkBack[0], m.walkBack[1], t - 0.03)) / 0.06 * 0.55)); }
    }
    // passage de main à main (Maxime -> Samia)
    const PH = PASSES[6];
    if (m.i === 5) { const o = 70 * (s5(m.E, m.E + 0.65, t) - s5(PH.Tf + 0.7, PH.Tf + 1.3, t)); x += o; walkW = Math.max(walkW, 0.5 * (bump(t, m.E, m.E + 0.65, 0.3) + bump(t, PH.Tf + 0.7, PH.Tf + 1.3, 0.3))); dist += o; }
    if (m.i === 6) { const o = -60 * (s5(PH.Tf - 0.45, PH.Tf + 0.1, t) - s5(PH.Tf + 0.7, m.Tc + 0.1, t)); x += o; walkW = Math.max(walkW, 0.5 * (bump(t, PH.Tf - 0.45, PH.Tf + 0.1, 0.3) + bump(t, PH.Tf + 0.7, m.Tc + 0.1, 0.3))); dist -= o; }
    // Matthias rejoint le groupe à la fin
    if (m.i === 7) { const g = s5(m.E + 0.55, m.E + 1.5, t); x = lerp(x, 1450, g); z = lerp(z, 650, g); walkW = Math.max(walkW, bump(t, m.E + 0.55, m.E + 1.5, 0.25) * 0.8); dist += g * 260; }
    p.walk = walkW;
    if (walkW > 0.01) walkGait(p, dist / 48 * Math.PI, walkW, L.sw);
    // salut
    p.bow = (() => { const [a0, a1] = m.rei; if (t <= a0 || t >= a1) return 0; const u = (t - a0) / (a1 - a0); return u < 0.4 ? s5(0, 0.4, u) : u < 0.6 ? 1 : 1 - s5(0.6, 1, u); })();
    if (p.bow > 0) { p.face.smile *= 0.6; p.face.lookY = 0.6 * p.bow; }
    // ceinture
    const P = PASSES[m.i], Nx = PASSES[m.i + 1];
    if (t >= m.Tc + 0.28) {
      p.belt = BELTS[m.i];
      p.beltGlow = bump(t, m.Tc + 0.28, m.Tc + 1.0, 0.25);
    }
    // ceinture tenue (réception, passage de main)
    if (P.kind === 'hand' && t >= P.Tf + 0.55 && t < m.Tc + 0.3) p.held = heldBelt(m, BELTS[m.i], 'R', 'dangle', t);
    else if (t >= m.Tc - 0.02 && t < m.Tc + 0.3) p.held = heldBelt(m, BELTS[m.i], 'both', 'catch', t);
    // don : ceinture lumineuse tirée du nœud puis lancée
    if (Nx) {
      if (Nx.kind === 'hand') { if (t > m.E + 0.25 && t < Nx.Tf + 0.55) p.held = heldBelt(m, mixc(BELTS[m.i], BELTS[m.i + 1], sstep(Nx.Tf + 0.3, Nx.Tf + 0.55, t)), 'R', 'dangle', t, true); }
      else if (t > m.E + 0.2 && t < Nx.Tf) p.held = heldBelt(m, BELTS[m.i], 'R', Nx.kind === 'spool' && t > m.E + 0.3 ? 'spool' : 'pull', t, true);
    }
    // pans de ceinture : balancement selon la vitesse
    p.tailSway = clamp(walkW * Math.sin(dist / 48 * Math.PI) * 2.5 + noise1(t * 1.5, sd) * 0.6, -4, 4);
    // parole : synchro labiale + expressions + tête
    const talking = t >= m.V - 0.05 && t <= m.E + 0.1;
    if (talking) {
      const e = envAt(m, t), sh = shapeAt(m, t);
      p.face.open = Math.pow(e, 0.85) * 0.72; p.face.wide = sh * 0.8;
      p.face.smile = L.smile * 0.55 + 0.15 + 0.15 * noise1(t * 0.7, sd + 5);
      const pk = clamp(envAt(m, t) - envAt(m, t - 0.12)) * 3;
      p.face.browUp = clamp(0.25 * e + pk * 0.6);
      p.head.pitch += 3.5 * (e - 0.4) + 2.5 * noise1(t * 1.3, sd + 8);
      p.head.yaw += 5 * noise1(t * 0.7, sd + 2);
      p.bob += -e * 0.8;
    } else if (t > m.E + 0.1 && t < m.N) p.face.smile = L.smile * 0.6 + 0.3;
    // spécifiques
    if (m.i === 3 && m.ukemi) applyUkemi(m, t, p);
    if (m.i === 3) { const r0 = wordT(m, 'projection'); if (r0 && t > r0 && t < r0 + 1.3) { p.face.smile = 1; p.face.browUp = 0.6; } }
    if (m.i === 4 && t > m.E - 0.25 && t < m.E + 0.4) { p.face.wink = 1; p.face.smile = 1; p.face.open = Math.min(p.face.open, 0.05); }
    if (m.i === 6 && t > m.E - 1.6 && t < m.E + 0.3) p.head.yaw = lerp(p.head.yaw, 16, bump(t, m.E - 1.6, m.E + 0.3, 0.2));
    if (m.i === 7) {
      const r = wordT(m, 'ressources'); if (r) p.beltRainbow = bump(t, r - 0.2, m.E + 1.0, 0.25);
      if (t > m.E + 0.1) { p.face.smile = 1; p.face.open = 0.25 * bump(t, m.E + 0.2, m.E + 1.2, 0.3); }
    }
    // regards : les autres regardent l'orateur ; à la réception on regarde la ceinture
    const sp = speakerAt(t);
    if (sp && sp !== m && !talking) { const dx = (sp.mx != null ? sp.mx : sp.X) - x; p.head.yaw += clamp(dx / 25, -14, 14); p.face.lookX = clamp(dx / 400, -0.7, 0.7); }
    if (t > P.Tf && t < m.Tc + 0.2 && P.kind !== 'hand') { p.face.lookY = -0.35; p.head.pitch -= 4; p.face.browUp = 0.4; }
    // acclamations finales (ligne du fond) quand Matthias conclut
    const L7 = MEM[7];
    if (m.i < 7 && t > L7.E + 0.35) {
      const kk = sstep(L7.E + 0.35, L7.E + 0.75, t); const hop = Math.abs(Math.sin((t + m.i * 0.13) * 7.5));
      const c1 = GP('cheer', -1, L), c2 = GP('cheer', 1, L);
      p.armL = { w: V.lerp(p.armL.w, V.add(c1.w, [0, hop * 3, 0]), kk), hand: kk > 0.5 ? 'open' : p.armL.hand };
      p.armR = { w: V.lerp(p.armR.w, V.add(c2.w, [0, hop * 3, 0]), kk), hand: kk > 0.5 ? 'open' : p.armR.hand };
      p.bob -= 5 * hop * kk; p.face.smile = 1; p.face.open = 0.3 * kk;
    }
    m.mx = x;
    return { x, y, z, pose: p };
  }

  function applyUkemi(m, t, p) {
    const U0 = m.ukemi; if (t < U0 || t > U0 + 2.0) return;
    const sw = m.look.sw;
    const fall = s5(U0 + 0.3, U0 + 0.75, t) * (1 - s5(U0 + 1.1, U0 + 1.6, t));
    const crouch = bump(t, U0, U0 + 0.5, 0.4) + bump(t, U0 + 1.15, U0 + 1.7, 0.4);
    p.crouch = Math.max(crouch * 0.7, fall * 0.5);
    p.bob += crouch * 14;
    p.rot = -86 * fall; p.rotPivot = [0, -100];
    p.rootDx = -22 * fall; p.rootDy = 72 * fall;
    p.legs.L = { lift: 26 * fall, kneeOut: 4 * fall }; p.legs.R = { lift: 14 * fall, kneeOut: 6 * fall };
    p.head.pitch -= 18 * fall; p.head.roll += 0;
    p.face.squint = 0.4 * fall; p.face.smile = lerp(p.face.smile, 0.2, fall);
    void sw;
  }

  function heldBelt(m, color, side, kind, t, glow) {
    return (info) => {
      let s = '';
      const H = side === 'L' ? info.handL : info.handR;
      if (kind === 'catch') {
        const a = info.handL, b = info.handR; if (!a || !b) return '';
        const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 10 * Math.sin(Math.PI * u) + 3]); }
        s += AvatarKit.ribbon(pts, 5, color);
        const tl = [a[0] + 0.5, a[1] + 1]; s += AvatarKit.ribbon([tl, [tl[0] - 2, tl[1] + 9], [tl[0] - 1 + Math.sin(t * 5) * 1.5, tl[1] + 17]], 5, color);
        return s;
      }
      if (!H) return '';
      if (kind === 'pull') {
        // ruban lumineux étiré du nœud vers la main
        const k0 = [0.6, -114.5]; const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push([lerp(k0[0], H[0], u), lerp(k0[1], H[1], u) + 6 * Math.sin(Math.PI * u)]); }
        s += `<path d="M${pts.map(q => F(q[0]) + ',' + F(q[1])).join('L')}" stroke="#fff3c4" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.35" filter="url(#soft1)"/>`;
        s += AvatarKit.ribbon(pts, 6.0, color);
        if (glow) s += `<ellipse cx="${F(H[0])}" cy="${F(H[1] + 4)}" rx="14" ry="14" fill="url(#ghl)" opacity="0.8"/>`;
        return s;
      }
      if (kind === 'spool') {
        const pts = []; for (let k = 0; k < 40; k++) { const u = k / 39; const r = 1.5 + 8 * u; const a = u * 5.4 * Math.PI + t * 10; pts.push([H[0] + Math.cos(a) * r, H[1] + 8 + Math.sin(a) * r]); }
        s += AvatarKit.ribbon(pts, 3.2, color);
        if (glow) s += `<ellipse cx="${F(H[0])}" cy="${F(H[1] + 8)}" rx="14" ry="14" fill="url(#ghl)" opacity="0.45"/>`;
        return s;
      }
      // pendante
      const sw = Math.sin(t * 4.3) * 2.2;
      for (const [dx, len] of [[-1.5, 30], [1.8, 26]]) { const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([H[0] + dx * u * 2 + sw * u * u, H[1] + 4 + len * u]); } s += AvatarKit.ribbon(pts, 4.8, color); }
      if (glow) s += `<ellipse cx="${F(H[0])}" cy="${F(H[1] + 14)}" rx="12" ry="20" fill="url(#ghl)" opacity="0.4"/>`;
      return s;
    };
  }

  function finalState(m, t, p) {
    const L = m.look;
    const [bi, dx] = PODIUM_SLOTS[m.i]; const B = PODIUM.blocks[bi];
    const x = B.x0 + B.w / 2 + dx, y = B.h, z = PODIUM.zf + PODIUM.depth / 2 + (m.i % 2 ? 6 : -6);
    p.belt = BELTS[m.i]; p.face.smile = 1;
    p.armL = GP('rest', -1, L); p.armR = GP('rest', 1, L);
    const order = [1, 2, 3, 0, 7, 4, 5, 6].indexOf(m.i);
    const md0 = FIN.S + 0.6 + order * 0.22;
    p.medal = t > md0 ? clamp((t - md0) / 0.55) : null;
    if (t > FIN.V - 0.05 && t < FIN.E + 0.1) { p.face.open = Math.pow(envAt(FIN, t), 0.85) * 0.8; p.face.wide = shapeAt(FIN, t); }
    const r0 = FIN.E + 0.35;
    p.bow = (() => { const a0 = r0, a1 = r0 + 1.25; if (t <= a0 || t >= a1) return 0; const u = (t - a0) / (a1 - a0); return u < 0.4 ? s5(0, 0.4, u) : u < 0.6 ? 1 : 1 - s5(0.6, 1, u); })();
    if (p.bow > 0) { p.armL = GP('rei', -1, L); p.armR = GP('rei', 1, L); }
    const raise = sstep(FIN.V - 0.3, FIN.V + 0.2, t) * (1 - sstep(FIN.E, FIN.E + 0.3, t));
    if (raise > 0) { const f = GP('fistUp', 1, L); p.armR = { w: V.lerp(p.armR.w, f.w, raise), hand: raise > 0.5 ? 'fist' : 'relax' }; }
    const cheer = sstep(r0 + 1.3, r0 + 1.7, t);
    if (cheer > 0) {
      const hop = Math.abs(Math.sin((t + m.i * 0.17) * 6.5));
      p.armL = { w: V.lerp(p.armL.w, V.add(GP('cheer', -1, L).w, [0, hop * 3, 0]), cheer), hand: 'open' }; p.armR = { w: V.lerp(p.armR.w, V.add(GP('cheer', 1, L).w, [0, hop * 3, 0]), cheer), hand: 'open' };
      p.bob = -5 * hop * cheer;
    }
    p.head.yaw += clamp((CX - x) / 40, -8, 8);
    p.tailSway = noise1(t * 1.5, m.seed) * 0.6;
    m.mx = x;
    return { x, y, z, pose: p };
  }

  function envAt(seg, t) { const e = seg.env; if (!e) return 0; const x = (t - seg.vstart) * 100; if (x < 0 || x >= e.length - 1) return 0; const k = Math.floor(x); return lerp(e[k], e[k + 1], x - k); }
  function shapeAt(seg, t) { const e = seg.shape; if (!e) return 0; const x = (t - seg.vstart) * 100; if (x < 0 || x >= e.length - 1) return 0; const k = Math.floor(x); return lerp(e[k], e[k + 1], x - k); }
  function speakerAt(t) { for (const m of MEM) if (t >= m.S && t < m.N) return m; return null; }

  // position monde d'une main (cible du poignet) : billboard -> monde
  function handWorld(m, t, side) {
    const st = stateAt(m, t); const a = side === 'L' ? st.pose.armL : st.pose.armR;
    return [st.x + a.w[0] * m.k, st.y - a.w[1] * m.k, st.z - a.w[2] * m.k];
  }

  // ---------------- rendu ----------------
  const SAFE = { x0: 96, y0: 54, x1: 1824, y1: 1026 };
  function cocPx(cam, zc) { return Math.min(12, (cam.ap || 0) * cam.f * Math.abs(1 / (cam.focus || 600) - 1 / Math.max(zc, 1))); }

  function renderAt(t) {
    const cam = cameraAt(t); const cb = camBasis(cam);
    const finalOn = t >= FIN.S;
    const ents = MEM.map(m => ({ m, st: stateAt(m, t) }));
    // ombres / occultation solaire des personnages pour le shader
    const chars = ents.map(e => { const p = e.st.pose; const lying = p.rot ? Math.abs(p.rot) / 90 : 0; return [e.st.x + (p.rootDx || 0) * e.m.k, e.st.z, e.st.y, lerp(206 * e.m.k, 46, lying)]; });
    if (!window.NO_GL) DOJO.render({ cam: cb, t, chars, focus: cam.focus || 600, ap: cam.ap || 0, res: cam.res || 1, podium: finalOn, stand: !finalOn && t < PASSES[0].Tf + 1.4,
      sun: SUN, sunCol: SUNCOL, rays: 0.0011, expo: 0.84, lampK: 1.0, ambK: 1.0 });
    let s = '';
    const items = [];
    const qc = { avatars: [], t };
    for (const e of ents) {
      const P0 = project(cb, [e.st.x, e.st.y, e.st.z]);
      if (P0[2] < 20) continue;
      const pose = e.st.pose;
      const view = { zc: P0[2], camH: cam.pos[1] - e.st.y, k: e.m.k };
      const coc0 = cocPx(cam, P0[2]);
      window.__LITE = P0[3] * e.m.k < 2.3 || coc0 > 2.2;
      const r = AvatarKit.drawAvatar(e.m, e.m.look, pose, view, t);
      window.__LITE = false;
      const sc = P0[3] * e.m.k;
      const dx = (pose.rootDx || 0), dy = (pose.rootDy || 0) + (pose.bob || 0);
      let inner = r.svg;
      if (pose.rot) inner = `<g transform="translate(${F(dx)},${F(dy)}) rotate(${F(pose.rot)} ${F(pose.rotPivot[0])} ${F(pose.rotPivot[1])})">${inner}</g>`;
      else if (dy || dx) inner = `<g transform="translate(${F(dx)},${F(dy)})">${inner}</g>`;
      const coc = cocPx(cam, P0[2]);
      const blur = coc > 0.9 ? Math.min(16, Math.round(coc * 0.9 * 2)) : 0;
      const g = `<g transform="translate(${F(P0[0])},${F(P0[1])}) scale(${sc.toFixed(4)})">${inner}</g>`;
      items.push({ z: P0[2], svg: blur ? `<g filter="url(#dof${blur})">${g}</g>` : g });
      // boîtes écran pour les contrôles (tête, logo) — tiennent compte de la rotation (chute) approximativement
      const tr = (q) => { let x = q[0], y = q[1]; if (pose.rot) { const a = pose.rot * D2R, px = pose.rotPivot[0], py = pose.rotPivot[1]; const X = x - px, Y = y - py; x = px + X * Math.cos(a) - Y * Math.sin(a); y = py + X * Math.sin(a) + Y * Math.cos(a); } return [P0[0] + (x + dx) * sc, P0[1] + (y + dy) * sc]; };
      const hb = r.info.headBox; const hc = [tr([hb[0], hb[1]]), tr([hb[2], hb[3]]), tr([hb[0], hb[3]]), tr([hb[2], hb[1]])];
      const lb = r.info.logo ? [tr([r.info.logo[0], r.info.logo[1]]), tr([r.info.logo[2], r.info.logo[3]])] : null;
      const body = [tr([-40, -215]), tr([40, 0])];
      qc.avatars.push({ i: e.m.i, id: e.m.id, head: [Math.min(...hc.map(q => q[0])), Math.min(...hc.map(q => q[1])), Math.max(...hc.map(q => q[0])), Math.max(...hc.map(q => q[1]))],
        logo: lb ? [lb[0][0], lb[0][1], lb[1][0], lb[1][1]] : null, body: [body[0][0], body[0][1], body[1][0], body[1][1]], zc: P0[2], belt: pose.belt, hasLogo: !!r.info.logo });
    }
    // ceinture sur le support (ouverture), ceinture en vol
    if (!finalOn) for (const it of freeBelt(cb, t)) items.push(it);
    if (!finalOn) { const rb = rainbowItem(cb, t, ents); if (rb) items.push(rb); }
    items.sort((a, b) => b.z - a.z);
    for (const it of items) s += it.svg;
    s += effects(cb, cam, t, ents);
    if (finalOn) s += confetti(cb, t);
    document.getElementById('dyn').innerHTML = s;
    hud(t);
    S.cam = cam; S.qc = qc; S.svgLen = s.length; S.nan = /NaN|Infinity/.test(s);
    const bc = [[CX - 330, 286, 974], [CX + 330, 286, 974], [CX - 330, 372, 974], [CX + 330, 372, 974]].map(q => project(cb, q));
    S.banner = [Math.min(...bc.map(q => q[0])), Math.min(...bc.map(q => q[1])), Math.max(...bc.map(q => q[0])), Math.max(...bc.map(q => q[1]))];
  }

  function ribbonScreen(cb, pts3, color, wWorld, twist) {
    const pp = pts3.map(p => project(cb, p));
    const w = wWorld * pp[Math.floor(pp.length / 2)][3];
    return { svg: AvatarKit.ribbon(pp.map(p => [p[0], p[1]]), w, color, twist), z: pp[0][2], pp };
  }

  function freeBelt(cb, t) {
    const out = [];
    const P0 = PASSES[0];
    if (t < P0.Tf) {
      // ceinture blanche pliée sur le plateau, halo doré pulsant
      const pts = []; for (let r = 0; r < 3; r++) { const row = []; for (let c = 0; c <= 6; c++) row.push([STAND[0] - 18 + c * 6, 31.5 + r * 2.2, STAND[1] - 4 + r * 2.4]); pts.push(row); }
      let svg = ''; for (const row of pts) svg += ribbonScreen(cb, row, BELTS[0], 5.2).svg;
      const c = project(cb, [STAND[0], 36, STAND[1]]); const g = 0.5 + 0.5 * Math.sin(t * 2.6);
      svg += `<ellipse cx="${F(c[0])}" cy="${F(c[1])}" rx="${F(40 * c[3])}" ry="${F(26 * c[3])}" fill="url(#ghl)" opacity="${F(0.25 + 0.3 * g)}"/>`;
      out.push({ z: c[2] - 1, svg });
      return out;
    }
    for (const P of PASSES) {
      if (P.kind === 'hand' || t < P.Tf || t >= P.Tc) continue;
      const u = (t - P.Tf) / (P.Tc - P.Tf);
      const c0 = P.p > 0 ? BELTS[P.p - 1] : BELTS[0], c1 = BELTS[P.p];
      const col = mixc(c0, c1, sstep(0.3, 0.7, u));
      const ch = chainAt(P, t);
      const tw = q => Math.cos(q * 5.5 + t * 7 + P.p);
      const r = ribbonScreen(cb, ch, col, 9.5, tw);
      const gw = 26 * r.pp[0][3];
      let svg = `<path d="M${r.pp.map(q => F(q[0]) + ',' + F(q[1])).join('L')}" stroke="${lum(col) < 0.2 ? '#c9a6ff' : '#fff3c4'}" stroke-width="${F(gw)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.22" filter="url(#dof8)"/>` + r.svg;
      const tr = []; for (let q = 0; q <= 8; q++) { const tq = t - q * 0.03; if (tq < P.Tf) break; tr.push(project(cb, chainAt(P, tq)[0])); }
      if (tr.length > 2) svg += `<path d="M${tr.map(q => F(q[0]) + ',' + F(q[1])).join('L')}" stroke="#fff7d6" stroke-width="${F(5 * r.pp[0][3])}" fill="none" stroke-linecap="round" opacity="0.5" filter="url(#dof6)"/>`;
      const c = r.pp[0];
      if (u > 0.25 && u < 0.8) svg += sparkle(c[0], c[1], 60 * c[3], (u - 0.25) / 0.55, c1, P.p);
      out.push({ z: c[2], svg });
    }
    return out;
  }

  function sparkle(cx, cy, r, k, color, seed = 0) {
    let s = '';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + k * 2.2 + seed; const rr = r * (0.45 + 0.55 * hash(i + 3 + seed)) * (0.6 + 0.6 * k);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; const sz = Math.max(2.5, r * 0.11) * (1 - k) * (0.6 + 0.6 * hash(i * 7 + seed));
      s += `<path d="M${F(x)},${F(y - sz)}L${F(x + sz * 0.22)},${F(y - sz * 0.22)}L${F(x + sz)},${F(y)}L${F(x + sz * 0.22)},${F(y + sz * 0.22)}L${F(x)},${F(y + sz)}L${F(x - sz * 0.22)},${F(y + sz * 0.22)}L${F(x - sz)},${F(y)}L${F(x - sz * 0.22)},${F(y - sz * 0.22)}Z" fill="${i % 2 ? '#fff7cf' : color}" opacity="${F(1 - k * 0.7)}"/>`;
    }
    return s;
  }

  function effects(cb, cam, t, ents) {
    let s = '';
    for (const e of ents) {
      const m = e.m, st = e.st, p = st.pose;
      const at = (lx, ly, lz = 0) => project(cb, [st.x + lx * m.k, st.y - ly * m.k, st.z - lz * m.k]);
      // éclat d'acquisition de la ceinture
      if (p.beltGlow > 0.05 && t < m.Tc + 1.0) { const c = at(0, -114, 8); s += sparkle(c[0], c[1], 55 * c[3] * m.k, clamp((t - m.Tc - 0.28) / 0.7), BELTS[m.i] === '#ffffff' ? '#ffe9a0' : BELTS[m.i], m.i); }
      // Haja : éclat « ippon » sur le bras levé ; poussière et onde à l'impact de la chute
      if (m.i === 3) {
        const r0 = wordT(m, 'projection');
        if (r0 && t > r0 + 0.1 && t < r0 + 1.3) { const k = clamp((t - r0 - 0.1) / 1.2); const c = at(m.look.sw + 1, -236, 4); const sc = c[3] * m.k; for (let q = 0; q < 12; q++) { const a = q / 12 * Math.PI * 2; const r1 = (10 + 14 * k) * sc, r2 = r1 + (12 - 6 * k) * sc; s += `<path d="M${F(c[0] + Math.cos(a) * r1)},${F(c[1] + Math.sin(a) * r1)}L${F(c[0] + Math.cos(a) * r2)},${F(c[1] + Math.sin(a) * r2)}" stroke="#ffd23f" stroke-width="${F(2.6 * sc)}" stroke-linecap="round" opacity="${F(1 - k)}"/>`; } }
        if (m.ukemi) { const ti = m.ukemi + 0.75; if (t > ti && t < ti + 0.9) { const k = (t - ti) / 0.9; const c = project(cb, [st.x - 70 * m.k, 2, st.z]); const sc = c[3];
          for (let q = 0; q < 14; q++) { const a = Math.PI + (q / 13) * Math.PI; const rr = (20 + 70 * k) * sc * (0.7 + 0.5 * hash(q)); s += `<circle cx="${F(c[0] + Math.cos(a) * rr * 1.4)}" cy="${F(c[1] + Math.sin(a) * rr * 0.35)}" r="${F((5 + 9 * k) * sc)}" fill="#f3e6c8" opacity="${F(0.55 * (1 - k))}"/>`; }
          s += `<ellipse cx="${F(c[0])}" cy="${F(c[1])}" rx="${F((40 + 120 * k) * sc)}" ry="${F((8 + 22 * k) * sc)}" fill="none" stroke="#fff2c8" stroke-width="${F(3 * sc * (1 - k))}" opacity="${F(0.8 * (1 - k))}"/>`;
          for (let q = 0; q < 5; q++) { const a = -Math.PI * (0.2 + q * 0.15); const r1 = 30 * sc, r2 = (52 + 20 * k) * sc; s += `<path d="M${F(c[0] + Math.cos(a) * r1)},${F(c[1] + Math.sin(a) * r1)}L${F(c[0] + Math.cos(a) * r2)},${F(c[1] + Math.sin(a) * r2)}" stroke="#ffffff" stroke-width="${F(3 * sc)}" stroke-linecap="round" opacity="${F(0.9 * (1 - k))}"/>`; } } }
      }
      // Hélène : étincelle du clin d'œil
      if (m.i === 4 && t > m.E - 0.2 && t < m.E + 0.45) { const c = at(-14, -194, 14); s += sparkle(c[0], c[1], 16 * c[3] * m.k, clamp((t - m.E + 0.2) / 0.65), '#ffffff', 9); }
      // Estelle : le fil tendu entre ses doigts
      if (m.i === 2) { for (const [w, len] of [['fil', 1.6], ['tient', 1.9]]) { const a0 = wordT(m, w, w === 'fil' ? 0 : 0); if (a0 && t > a0 - 0.05 && t < a0 + len) { const st2 = st; const aL = p.armL.w, aR = p.armR.w; const A = project(cb, [st2.x + aL[0] * m.k, -aL[1] * m.k, st2.z - aL[2] * m.k]), B = project(cb, [st2.x + aR[0] * m.k, -aR[1] * m.k, st2.z - aR[2] * m.k]); const k = bump(t, a0 - 0.05, a0 + len, 0.15);
          s += `<path d="M${F(A[0])},${F(A[1] + 10 * A[3])}Q${F((A[0] + B[0]) / 2)},${F((A[1] + B[1]) / 2 + 14 * A[3])} ${F(B[0])},${F(B[1] + 10 * B[3])}" stroke="#ff5aa5" stroke-width="${F(1.4 * A[3])}" fill="none" opacity="${F(k)}"/>`; } } }
    }
    return s;
  }

  function rainbowItem(cb, t, ents) {
    const e = ents[7]; const m = e.m, st = e.st;
    const at = (lx, ly, lz = 0) => project(cb, [st.x + lx * m.k, st.y - ly * m.k, st.z - lz * m.k]);
    let s = '';
    { const a0 = wordT(m, 'Arc'); if (a0 && t > a0 && t < a0 + 2.0) { const k = bump(t, a0, a0 + 2.0, 0.25); const c = at(-40, -150, -60); const sc = c[3] * m.k; const cols = ['#e74c3c', '#f39c12', '#f4d03f', '#27ae60', '#2e86de', '#8e44ad']; const sweep = clamp((t - a0) / 0.8);
          cols.forEach((cc, q) => { const r = (84 - q * 5) * sc; const a1 = Math.PI * (1 - sweep); s += `<path d="M${F(c[0] - r)},${F(c[1])}A${F(r)},${F(r)} 0 0 1 ${F(c[0] + r * Math.cos(a1))},${F(c[1] - r * Math.sin(a1))}" stroke="${cc}" stroke-width="${F(5 * sc)}" fill="none" opacity="${F(0.38 * k)}" stroke-linecap="round"/>`; }); } }
    return s ? { z: project(cb, [st.x, st.y, st.z + 60])[2], svg: s } : null;
  }

  function confetti(cb, t) {
    const t0 = FIN.S + 0.35; if (t < t0) return '';
    let s = ''; const cols = ['#f6c945', '#e74c3c', '#2e86de', '#27ae60', '#ffffff', '#e67e22', '#8e44ad'];
    for (let i = 0; i < 170; i++) {
      const st = t0 + hash(i) * 3.0; if (t < st) continue;
      const age = t - st; const X = CX + (hash(i + 7) - 0.5) * 1500 + Math.sin(age * (1.4 + hash(i + 9) * 2) + i) * 28; const Z = 300 + hash(i + 21) * 700;
      const Y = 470 - age * (90 + 80 * hash(i + 50)); if (Y < -5) continue;
      const p = project(cb, [X, Y, Z]); if (p[2] < 30 || p[0] < -40 || p[0] > 1960 || p[1] < -40 || p[1] > 1120) continue;
      const w = (5 + 4 * hash(i + 13)) * p[3], hgt = 3.2 * p[3]; const rot = age * (160 + 300 * hash(i + 11)) + i * 37; const fl = Math.cos(age * (5 + 3 * hash(i)) + i);
      const c = cols[i % cols.length]; const shd = fl < 0 ? shade(c, -0.3) : c;
      s += `<rect x="${F(-w / 2)}" y="${F(-hgt / 2)}" width="${F(w)}" height="${F(hgt)}" fill="${shd}" transform="translate(${F(p[0])},${F(p[1])}) rotate(${F(rot)}) scale(1,${F(Math.max(0.15, Math.abs(fl)))})"/>`;
    }
    return s;
  }

  // ---------------- HUD ----------------
  let lastBand = null;
  function setOv(id, op, extra) { const el = document.getElementById(id); el.style.opacity = op.toFixed(3); if (extra !== undefined) el.style.transform = extra; }
  function hud(t) {
    const $ = id => document.getElementById(id);
    const ti = sstep(0.4, 1.0, t) * (1 - sstep(5.0, 5.6, t));
    setOv('title', ti, `translateY(${F((1 - sstep(0.4, 1.1, t)) * 20)}px)`);
    $('title').querySelector('.u').style.width = F(120 + 720 * sstep(0.7, 1.7, t)) + 'px';
    let band = null;
    for (const m of MEM) if (t >= m.S + 1.0 && t < m.E + 0.25) band = m;
    if (band) {
      if (lastBand !== band.id) {
        lastBand = band.id; const b = $('bandeau');
        for (const im of b.querySelectorAll('img')) im.style.display = im.dataset.id === band.id ? 'block' : 'none';
        b.querySelector('.lg').style.background = band.logo_bg || '#fff';
        b.querySelector('.nm').textContent = band.name; b.querySelector('.co').textContent = band.company;
        b.querySelector('.ac').textContent = band.activity; b.querySelector('.tx').style.borderLeftColor = band.belt === '#ffffff' ? '#e8ebf2' : band.belt;
        b.dataset.id = band.id;
      }
      const k = sstep(band.S + 1.0, band.S + 1.35, t) * (1 - sstep(band.E, band.E + 0.25, t));
      setOv('bandeau', k, `translateX(${F((1 - k) * 36)}px)`);
    } else { setOv('bandeau', 0); $('bandeau').dataset.id = ''; }
    const inMembers = t >= MEM[0].S && t < FIN.S;
    let owner = -1; for (const m of MEM) if (t >= m.Tc + 0.28) owner = m.i;
    const hudEl = $('beltHud');
    if (hudEl.dataset.o !== String(owner)) {
      hudEl.dataset.o = String(owner);
      hudEl.innerHTML = BELTS.map((b, i) => `<i style="background:${b};opacity:${i <= owner ? 1 : 0.28};transform:scale(${i === owner ? 1.28 : 1})"></i>`).join('');
    }
    setOv('beltHud', inMembers ? sstep(MEM[0].S, MEM[0].S + 0.5, t) * (1 - sstep(FIN.S - 0.4, FIN.S, t)) : 0);
    // sous-titres (alignés sur la voix)
    let sub = '', so = 0;
    for (const sg of SEGS) {
      if (sg.kind === 'final') continue;
      const v0 = sg.vstart, v1 = sg.vstart + sg.vdur;
      if (t < v0 - 0.12 || t > v1 + 0.3) continue;
      const ch = sg.chunks; let cur = ch[0];
      for (const c of ch) if (t >= c.t0 - 0.05) cur = c;
      sub = cur.text;
      so = sstep(v0 - 0.12, v0 + 0.08, t) * (1 - sstep(v1 + 0.1, v1 + 0.3, t));
    }
    const se = $('subs').querySelector('span'); if (se.textContent !== sub) se.textContent = sub;
    setOv('subs', so);
    const ft = sstep(FIN.V - 0.1, FIN.V + 0.35, t);
    setOv('ftitle', ft, `scale(${F(0.86 + 0.14 * eio(clamp((t - FIN.V + 0.1) / 0.45)))})`);
    setOv('fkick', sstep(FIN.E + 0.3, FIN.E + 0.8, t) * (1 - sstep(FIN.N - 0.8, FIN.N, t)));
    setOv('flash', t >= FIN.S ? 0.9 * (1 - sstep(FIN.S, FIN.S + 0.55, t)) : sstep(FIN.S - 0.18, FIN.S, t) * 0.9);
    setOv('fade', Math.max(1 - sstep(0, 0.4, t), sstep(FIN.N - 0.8, FIN.N, t)));
  }

  // ---------------- initialisation ----------------
  async function setup(tl, width) {
    TL = tl; OW = width; OH = Math.round(width * 9 / 16);
    const k = width / 1920; document.getElementById('stage').style.transform = `scale(${k})`;
    document.body.style.width = width + 'px'; document.body.style.height = OH + 'px';
    const cv = document.getElementById('gl'); cv.width = width; cv.height = OH; cv.style.width = '1920px'; cv.style.height = '1080px';
    await document.fonts.load('900 40px Inter'); await document.fonts.load('800 40px Inter'); await document.fonts.load('700 40px Inter'); await document.fonts.load('600 40px Inter');
    await document.fonts.load('500 40px Inter'); await document.fonts.load('900 40px InterD'); await document.fonts.load('900 40px "Inter Display"');
    await document.fonts.load('700 40px IPAGothic'); await document.fonts.load('bold 40px "DejaVu Serif"');
    setupScene();
    DOJO = new Dojo.DojoGL(cv, width, OH, { belts: tl.belts, podium: PODIUM, stand: STAND, sceneScale: tl.sceneScale || 0.8 });
    let defs = AvatarKit.globalDefs() + AvatarKit.beltDefs(Array.from(new Set(tl.belts.concat(tl.belts.map((c, i) => i < 7 ? mixc(c, tl.belts[i + 1], 0.5) : c)))));
    for (let q = 1; q <= 16; q++) defs += `<filter id="dof${q}" x="-12%" y="-8%" width="124%" height="116%"><feGaussianBlur stdDeviation="${F(q * 0.5)}"/></filter>`;
    const loads = [];
    for (const m of MEM) {
      defs += HeadKit.headDefs(m.id, m.look);
      const h = 800 / m.logo_ar;
      defs += `<symbol id="logo_${m.id}" viewBox="0 0 800 ${F(h)}" preserveAspectRatio="xMidYMid meet"><image href="${m.logo}" width="800" height="${F(h)}"/></symbol>`;
      const im = new Image(); im.src = m.logo; loads.push(im.decode().catch(() => {}));
    }
    document.getElementById('defs').innerHTML = defs;
    document.getElementById('bandeau').querySelector('.lg').innerHTML = MEM.map(m => `<img data-id="${m.id}" src="${m.logo}" style="display:none">`).join('');
    document.getElementById('title').querySelector('.k').textContent = TL.chapter;
    document.getElementById('title').querySelector('.t').textContent = TL.title;
    document.getElementById('ftitle').querySelector('.t').textContent = FIN.line;
    document.getElementById('fkick').querySelector('.k').textContent = TL.chapter + ' · ' + TL.title;
    await Promise.all(loads);
    for (const im of document.querySelectorAll('#bandeau img')) await im.decode().catch(() => {});
    renderAt(MEM[1].S + 2); for (const m of MEM) { lastBand = null; renderAt(m.S + 2); }
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await document.fonts.ready;
  }
  function glFinish() { return DOJO.finish(); }

  window.SCENE = { S, MEM: () => MEM, PASSES: () => PASSES, SEGS: () => SEGS, FIN: () => FIN, OPEN: () => OPEN, SAFE, PODIUM, cameraAt, stateAt, BELTS: () => BELTS, CUTS: () => CUTS };
  window.setup = setup; window.renderAt = renderAt; window.glFinish = glFinish;
})();
