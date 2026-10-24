// Moteur de scène : dojo 2.5D en perspective, caméra, mise en scène des 8 judokas, passage de ceinture, HUD.
// Tout est fonction pure de t (secondes) : renderAt(t) produit toujours la même image.
'use strict';
const CAMY = 110, FRONTZ = 450, BACKZ = 800, WALLZ = 900, SP = 300;
let TL, SEGS, MEM = [], BELTS, OPEN, FIN, SHOTS = [], PASSES = [];
const $ = id => document.getElementById(id);

// ---------- maths ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, t) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const eio = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const bump = (t, a, b, r = 0.3) => { const u = (t - a) / (b - a); if (u <= 0 || u >= 1) return 0; return sstep(0, r, u) * (1 - sstep(1 - r, 1, u)); };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise = (t, s) => (Math.sin(t * 1.31 + s) + 0.6 * Math.sin(t * 2.17 + s * 1.7) + 0.4 * Math.sin(t * 0.71 + s * 2.3)) / 2;
const F = v => (Math.round(v * 10) / 10).toString();

// ---------- caméra ----------
function frame(X, Y, Z, s, px = 960, py = 540) { return { x: X - (px - 960) / s, f: s * Z, sh: py - 540 - (CAMY - Y) * s }; }
function camLerp(a, b, u) { return { x: lerp(a.x, b.x, u), f: Math.exp(lerp(Math.log(a.f), Math.log(b.f), u)), sh: lerp(a.sh, b.sh, u) }; }
function proj(c, X, Y, Z) { const s = c.f / Z; return [960 + (X - c.x) * s, 540 + c.sh + (CAMY - Y) * s, s]; }
const MW = (X, d = 0) => frame(X + d, 105, FRONTZ, 2.75, 960, 640);
const MED = (X, k = 0) => frame(X, 150, FRONTZ, 4.9 + k, 1000, 500);
const CU = (X, k = 0) => frame(X, 168, FRONTZ, 8.4 + k, 1060, 470);
const TWO = (Xa, Xb) => frame((Xa + Xb) / 2, 110, FRONTZ, 2.5, 960, 650);

function shot(t0, t1, a, b, ease = 'io') { SHOTS.push({ t0, t1, a, b, ease }); }
function cameraAt(t) {
  let s = SHOTS[0];
  for (const x of SHOTS) if (t >= x.t0) s = x;
  const u = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0));
  return camLerp(s.a, s.b, s.ease === 'lin' ? u : eio(u));
}

// ---------- mise en scène ----------
function track(m, side, keys) { (m.tracks = m.tracks || []).push({ side, keys }); }
function evalTrack(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0] || t >= keys[n - 1][0]) return null;
  let w = 1;
  if (t < keys[1][0]) w = sstep(keys[0][0], keys[1][0], t);
  if (t > keys[n - 2][0]) w = 1 - sstep(keys[n - 2][0], keys[n - 1][0], t);
  let k = 1; while (k < n - 2 && t > keys[k + 1][0]) k++;
  const A = keys[Math.min(k, n - 2)], B = keys[Math.min(k + 1, n - 2)];
  const u = B[0] > A[0] ? sstep(A[0], B[0], t) : 0;
  return { w, a: lerp(A[1], B[1], u), b: lerp(A[2], B[2], u) };
}

function setupScene() {
  SEGS = TL.segs; BELTS = TL.belts; OPEN = SEGS[0]; FIN = SEGS[SEGS.length - 1];
  OPEN.E = OPEN.vstart + OPEN.vdur; OPEN.N = OPEN.start + OPEN.dur;
  FIN.S = FIN.start; FIN.V = FIN.vstart; FIN.E = FIN.vstart + FIN.vdur; FIN.N = FIN.start + FIN.dur;
  MEM = [];
  for (let i = 0; i < 8; i++) {
    const s = SEGS[i + 1];
    const m = Object.assign({}, s, { i, X: i * SP, look: LOOKS[s.id], tracks: [] });
    m.S = s.start; m.V = s.vstart; m.E = s.vstart + s.vdur; m.N = s.start + s.dur;
    const prev = SEGS[i]; m.Ep = prev.vstart + prev.vdur;
    m.walkIn = [m.Ep - 1.4, m.Ep - 0.1];
    m.Tc = m.S + 0.35;
    m.rei = [m.S + 0.55, m.S + 1.15];
    m.seed = i * 1.618 + 0.7;
    MEM.push(m);
  }
  // passages : p = receveur ; donneur = p-1 (ou le tatami pour p = 0)
  PASSES = [];
  for (let p = 0; p < 8; p++) {
    const r = MEM[p];
    const Tf = r.Ep + (p === 3 ? 0.7 : 0.45);
    PASSES.push({ p, Tf, Tc: r.Tc, kind: p === 0 ? 'floor' : p === 3 ? 'spool' : p === 6 ? 'hand' : 'throw' });
  }
  // gestes
  for (const m of MEM) {
    const { Tc } = m, P = PASSES[m.i];
    // réception
    if (m.i === 6) {
      track(m, 'L', [[P.Tf - 0.6, 0, 0], [P.Tf - 0.1, 80, 8], [Tc, 80, 8], [Tc + 0.15, -14, -72], [Tc + 0.4, -14, -72], [Tc + 0.6, 0, 0]]);
      track(m, 'R', [[Tc - 0.3, 0, 0], [Tc + 0.15, -14, -72], [Tc + 0.4, -14, -72], [Tc + 0.6, 0, 0]]);
    } else if (m.i === 7) {
      track(m, 'L', [[Tc - 0.6, 0, 0], [Tc - 0.25, 75, 35], [Tc, 60, 20], [Tc + 0.5, 0, 0]]);
      track(m, 'R', [[Tc - 0.6, 0, 0], [Tc - 0.25, 40, 50], [Tc, 30, 30], [Tc + 0.3, 22, 18], [m.E + 0.05, 22, 18], [m.E + 0.25, -14, -72], [m.E + 0.45, -14, -72], [m.E + 0.55, 35, -25], [m.E + 0.68, 35, -25], [m.E + 0.95, 0, 0]]);
      track(m, 'L', [[m.E - 0.1, 0, 0], [m.E + 0.25, -14, -72], [m.E + 0.45, -14, -72], [m.E + 0.55, 35, -25], [m.E + 0.68, 35, -25], [m.E + 0.95, 0, 0]]);
    } else {
      track(m, 'L', [[Tc - 0.6, 0, 0], [Tc - 0.25, 75, 35], [Tc, 60, 20], [Tc + 0.15, -14, -72], [Tc + 0.4, -14, -72], [Tc + 0.6, 0, 0]]);
      track(m, 'R', [[Tc - 0.6, 0, 0], [Tc - 0.25, 40, 50], [Tc, 30, 30], [Tc + 0.15, -14, -72], [Tc + 0.4, -14, -72], [Tc + 0.6, 0, 0]]);
    }
    // gestes imposés pendant la réplique
    if (m.i === 1) { // Christophe : mains jointes, « synergie »
      const c0 = m.V + m.vdur * 0.5;
      track(m, 'L', [[c0, 0, 0], [c0 + 0.35, -20, -80], [c0 + 1.5, -20, -80], [c0 + 1.9, 0, 0]]);
      track(m, 'R', [[c0, 0, 0], [c0 + 0.35, -20, -80], [c0 + 1.5, -20, -80], [c0 + 1.9, 0, 0]]);
    }
    if (m.i === 3) { // Haja : bras levé de l'arbitre = ippon
      m.ippon = [m.V + 0.35, m.V + 2.1];
      track(m, 'R', [[m.V + 0.2, 0, 0], [m.V + 0.5, 176, 0], [m.V + 1.8, 176, 0], [m.V + 2.2, 0, 0]]);
      track(m, 'L', [[m.V + 0.2, 0, 0], [m.V + 0.5, 25, -20], [m.V + 1.8, 25, -20], [m.V + 2.2, 0, 0]]);
    }
    if (m.i === 6) { // Samia désigne Matthias
      m.point = [m.E - 1.7, m.E + 0.2];
      track(m, 'R', [[m.E - 1.7, 0, 0], [m.E - 1.35, 108, -6], [m.E + 0.0, 108, -6], [m.E + 0.25, 0, 0]]);
    }
    // donner la ceinture
    if (m.i < 7) {
      const N = PASSES[m.i + 1];
      if (N.kind === 'hand') {
        track(m, 'R', [[m.E - 0.1, 0, 0], [m.E + 0.4, 80, 6], [N.Tc, 80, 6], [N.Tc + 0.6, 0, 0]]);
      } else if (N.kind === 'spool') {
        track(m, 'R', [[m.E - 0.1, 0, 0], [m.E + 0.25, 105, 45], [N.Tf - 0.22, 105, 45], [N.Tf, 150, 30], [N.Tf + 0.15, 95, 0], [N.Tf + 0.35, 95, 0], [N.Tf + 0.9, 0, 0]]);
      } else {
        track(m, 'R', [[m.E + 0.05, 0, 0], [m.E + 0.25, 35, 35], [N.Tf - 0.25, 35, 35], [N.Tf, 150, 35], [N.Tf + 0.15, 95, 0], [N.Tf + 0.35, 95, 0], [N.Tf + 0.9, 0, 0]]);
      }
    }
  }
  buildShots();
}

function buildShots() {
  SHOTS = [];
  const m0 = MEM[0];
  const WIDE_A = frame(1050, 120, BACKZ, 0.66, 960, 600), WIDE_B = frame(1050, 120, BACKZ, 0.72, 960, 600);
  shot(0, 5.0, WIDE_A, WIDE_B, 'lin');
  shot(5.0, m0.Tc, WIDE_B, MW(m0.X), 'io');
  for (const m of MEM) {
    const X = m.X, last = m.i === 7;
    const mid = cutPoint(m);
    const NX = last ? X : MEM[m.i + 1].X;
    shot(m.Tc, m.V + 0.25, MW(X, -8), MW(X, 8), 'lin');
    if (m.i === 3) { // ippon : plan moyen large pour voir le bras levé
      shot(m.V + 0.25, mid, MED(X, -1.2), MED(X, -0.9), 'lin');
    } else shot(m.V + 0.25, mid, MED(X, -0.2), MED(X, 0.4), 'lin');
    const cuEnd = m.i === 4 ? m.E + 0.4 : m.i === 6 ? m.E - 1.8 : m.E - 0.05;
    shot(mid, cuEnd, CU(X, -0.2), CU(X, 0.4), 'lin');
    if (m.i === 6) shot(cuEnd, m.E + 0.45, TWO(X, X + SP * 0.9), TWO(X + 6, X + SP * 0.9 + 6), 'lin');
    if (last) {
      shot(m.E - 0.05, m.E + 0.72, MW(X, -6), MW(X, 4), 'lin');
      const G0 = frame(1330, 110, BACKZ, 0.70, 960, 600), G1 = frame(1330, 110, BACKZ, 0.72, 960, 600);
      shot(m.E + 0.72, m.N, G0, G1, 'lin');
      continue;
    }
    const P = PASSES[m.i + 1];
    if (P.kind === 'hand') {
      shot(m.E - 0.05, P.Tc + 0.3, TWO(X, NX), TWO(X + 8, NX + 8), 'lin');
      shot(P.Tc + 0.3, MEM[m.i + 1].Tc + 0.6, TWO(X + 8, NX + 8), MW(NX), 'io');
    } else {
      if (m.i !== 4 && m.i !== 6) shot(m.E - 0.05, P.Tf, MW(X, -4), MW(X, 4), 'lin');
      else if (m.i === 4) shot(m.E + 0.4, P.Tf, MW(X, 0), MW(X, 4), 'lin');
      shot(P.Tf, P.Tc, MW(X, 4), MW(NX), 'io');
    }
  }
  // final
  const P0 = frame(1050, 150, 640, 1.42, 960, 640), P1 = frame(1050, 150, 640, 1.52, 960, 640), P2 = frame(1050, 150, 640, 1.38, 960, 650);
  shot(FIN.S, FIN.S + 6.0, P0, P1, 'lin');
  shot(FIN.S + 6.0, FIN.N + 0.1, P1, P2, 'io');
  SHOTS.sort((a, b) => a.t0 - b.t0);
}

function cutPoint(m) {
  // passage plan moyen -> gros plan sur une frontière de sous-titre, la plus proche du milieu de la réplique
  const ch = m.chunks || [m.line]; const tot = ch.reduce((a, c) => a + c.length, 0);
  let acc = 0, best = m.V + m.vdur * 0.5, bd = 1e9;
  for (let k = 0; k < ch.length - 1; k++) {
    acc += ch[k].length; const tt = m.V + m.vdur * acc / tot;
    if (Math.abs(tt - (m.V + m.vdur * 0.5)) < bd) { bd = Math.abs(tt - (m.V + m.vdur * 0.5)); best = tt; }
  }
  if (m.i === 3) best = Math.max(best, m.V + 2.4);
  return clamp(best, m.V + 1.2, m.E - 1.5);
}

function envAt(seg, t) {
  const e = seg.env; const x = (t - seg.vstart) * 100;
  if (x < 0 || x >= e.length - 1) return 0;
  const k = Math.floor(x); return lerp(e[k], e[k + 1], x - k);
}

// ---------- pose d'un membre ----------
const PODIUM = { cx: 1050, zf: 560, depth: 130, blocks: [ { x0: 1050 - 125 - 330, w: 330, h: 45, n: '2' }, { x0: 1050 - 125, w: 250, h: 70, n: '1' }, { x0: 1050 + 125, w: 330, h: 28, n: '3' } ] };
const PODIUM_SLOTS = { 1: [0, -105], 2: [0, 0], 3: [0, 105], 0: [1, -60], 7: [1, 60], 4: [2, -105], 5: [2, 0], 6: [2, 105] };

function stateAt(m, t) {
  const p = { armL: { a: 7, b: 6 }, armR: { a: 7, b: 6 }, bow: 0, bob: 0, walk: 0, phase: 0, mouth: 0, blink: 0, smile: 0.3 };
  const sd = m.seed;
  p.breath = Math.sin(t * 2.1 + sd);
  p.armL.a = 7 + 2.5 * Math.sin(t * 1.3 + sd); p.armR.a = 7 + 2.5 * Math.sin(t * 1.25 + sd * 2);
  // clignements pseudo-aléatoires déterministes
  const per = 2.9 + 1.6 * hash(m.i + 3), ph = ((t + hash(m.i) * 9) % per) / per;
  p.blink = ph < 0.045 ? Math.sin(ph / 0.045 * Math.PI) : 0;
  let x = m.X, z = BACKZ, y = 0, sway = Math.sin(t * 0.9 + sd) * 0.8;

  if (t >= FIN.S) return finalState(m, t, p);

  // entrée (de la ligne du fond au tatami) puis retour au fond après le passage
  const wi = sstep(m.walkIn[0], m.walkIn[1], t);
  z = lerp(BACKZ, FRONTZ, wi);
  let walking = bump(t, m.walkIn[0], m.walkIn[1], 0.15);
  if (m.i === 6) { const off = 40 * (sstep(m.walkIn[0], m.walkIn[1], t) - sstep(m.Tc + 0.25, m.Tc + 0.8, t)); x -= off; walking = Math.max(walking, bump(t, m.Tc + 0.25, m.Tc + 0.8, 0.3) * 0.6); }
  if (m.i === 5) { x += 45 * (sstep(m.E, m.E + 0.5, t) - sstep(m.N + 0.4, m.N + 1.6, t)); walking = Math.max(walking, bump(t, m.E, m.E + 0.5, 0.3) * 0.6); }
  if (m.i < 7) {
    const wb = sstep(m.N + 0.4, m.N + 1.6, t);
    z = lerp(z, BACKZ, wb); walking = Math.max(walking, bump(t, m.N + 0.4, m.N + 1.6, 0.15));
  }
  p.walk = walking; p.phase = t * Math.PI * 2 * 1.7 + sd;
  p.bob = -Math.abs(Math.sin(p.phase)) * 3 * walking;
  if (walking > 0.01) { p.armL.a = 6 + 12 * Math.sin(p.phase) * walking; p.armR.a = 6 - 12 * Math.sin(p.phase) * walking; }

  // parole : bouche sur l'enveloppe + gestes de discours
  const talking = t >= m.V - 0.05 && t <= m.E + 0.05;
  if (talking) {
    const e = envAt(m, t); p.mouth = Math.pow(e, 0.8);
    const k = bump(t, m.V - 0.2, m.E + 0.2, 0.08);
    const g1 = 0.5 + 0.5 * noise(t * 1.4, sd), g2 = 0.5 + 0.5 * noise(t * 1.2, sd + 4), g3 = 0.5 + 0.5 * noise(t * 1.6, sd + 9);
    p.armL.a = lerp(p.armL.a, 14 + 22 * g1, k); p.armL.b = lerp(p.armL.b, 30 + 70 * g2 * (0.6 + 0.4 * e), k);
    p.armR.a = lerp(p.armR.a, 12 + 16 * g3, k); p.armR.b = lerp(p.armR.b, 25 + 55 * g1 * (0.6 + 0.4 * e), k);
    p.browRaise = e * 0.8; p.bob += -e * 1.2;
    p.headTurn = 0.4 * noise(t * 0.8, sd + 2);
  }
  // salut (rei)
  p.bow = bump(t, m.rei[0], m.rei[1], 0.35);
  if (p.bow > 0) { p.armL.a = lerp(p.armL.a, 3, p.bow); p.armL.b = lerp(p.armL.b, 0, p.bow); p.armR.a = lerp(p.armR.a, 3, p.bow); p.armR.b = lerp(p.armR.b, 0, p.bow); }
  // pistes de gestes
  for (const tr of m.tracks) {
    const v = evalTrack(tr.keys, t); if (!v) continue;
    const A = tr.side === 'L' ? p.armL : p.armR;
    A.a = lerp(A.a, v.a, v.w); A.b = lerp(A.b, v.b, v.w);
  }
  // ceinture
  const P = PASSES[m.i], Nx = PASSES[m.i + 1];
  if (t >= P.Tc) {
    if (m.i === 7) {
      if (t < m.E + 0.4) p.hold = { side: 'R', kind: 'dangle', color: BELTS[7] };
      else { p.beltColor = BELTS[7]; p.beltPulse = clamp((t - m.E - 0.55) / 0.5); if (t < m.E + 0.55) p.beltPulse = 0; }
    } else if (t < m.E + 0.1) { p.beltColor = BELTS[m.i]; p.beltPulse = clamp((t - P.Tc) / 0.45); if (p.beltPulse >= 1) p.beltPulse = 0; }
    else if (Nx && t < Nx.Tf) p.hold = { side: 'R', kind: Nx.kind === 'spool' && t > m.E + 0.2 ? 'spool' : 'dangle', color: BELTS[m.i], spin: t * 13 };
  }
  // spécifiques
  if (m.i === 3 && m.ippon) { p.bob += -7 * bump(t, m.ippon[0], m.ippon[0] + 0.5, 0.5); p.smile = 1; }
  if (m.i === 4) { if (t > m.E - 0.15 && t < m.E + 0.5) { p.wink = 'L'; p.smile = 1; p.mouth = Math.min(p.mouth, 0.05); } }
  if (m.i === 6 && m.point && t > m.point[0] && t < m.point[1]) p.headTurn = 0.9 * bump(t, m.point[0], m.point[1], 0.2);
  if (m.i === 7) {
    const u = clamp((t - (m.E + 0.75)) / 0.32);
    if (u > 0) { p.scaleX = Math.max(0.08, Math.abs(Math.cos(Math.PI * u))); p.back = u > 0.5; }
    // il rejoint le groupe : quelques pas vers le fond
    const g = sstep(m.E + 0.9, m.E + 1.6, t);
    z = lerp(z, 620, g); const wk = bump(t, m.E + 0.9, m.E + 1.6, 0.2);
    if (wk > 0) { p.walk = wk; p.bob = -Math.abs(Math.sin(p.phase)) * 3 * wk; }
  }
  // la ligne du fond acclame Matthias quand il se retourne
  const L7 = MEM[7];
  if (m.i < 7 && t > L7.E + 0.85) {
    const k = sstep(L7.E + 0.85, L7.E + 1.15, t);
    const hop = Math.abs(Math.sin((t + m.i * 0.13) * 7));
    p.armL = { a: lerp(p.armL.a, 160, k), b: lerp(p.armL.b, 12, k) }; p.armR = { a: lerp(p.armR.a, 160, k), b: lerp(p.armR.b, 12, k) };
    p.bob -= 6 * hop * k; p.smile = 1;
  }
  return { x, y, z, sway, pose: p };
}

function finalState(m, t, p) {
  const [bi, dx] = PODIUM_SLOTS[m.i]; const B = PODIUM.blocks[bi];
  const x = B.x0 + B.w / 2 + dx, y = B.h, z = PODIUM.zf + PODIUM.depth / 2;
  p.beltColor = BELTS[m.i]; p.smile = 1;
  const order = [1, 2, 3, 0, 7, 4, 5, 6].indexOf(m.i);
  const md0 = FIN.S + 0.5 + order * 0.2;
  p.medal = clamp((t - md0) / 0.55);
  if (p.medal <= 0) p.medal = null;
  if (t > FIN.V - 0.05 && t < FIN.E + 0.1) p.mouth = Math.pow(envAt(FIN, t), 0.8);
  // salut collectif
  const r0 = FIN.E + 0.35;
  p.bow = bump(t, r0, r0 + 1.3, 0.3);
  if (p.bow > 0) { p.armL = { a: 3, b: 0 }; p.armR = { a: 3, b: 0 }; }
  // médaille brandie pendant la voix, bras levés à la fin
  const raise = sstep(FIN.V - 0.3, FIN.V + 0.2, t) * (1 - sstep(FIN.E, FIN.E + 0.3, t));
  if (raise > 0) { p.armR = { a: lerp(p.armR.a, 150, raise), b: lerp(p.armR.b, 20, raise) }; }
  const cheer = sstep(r0 + 1.4, r0 + 1.8, t);
  if (cheer > 0) {
    p.armL = { a: lerp(p.armL.a, 158, cheer), b: lerp(p.armL.b, 14, cheer) }; p.armR = { a: lerp(p.armR.a, 158, cheer), b: lerp(p.armR.b, 14, cheer) };
    p.bob = -5 * Math.abs(Math.sin((t + m.i * 0.17) * 6)) * cheer;
  }
  return { x, y, z, sway: Math.sin(t * 0.9 + m.seed) * 0.8, pose: p };
}

function handWorld(m, t, side) {
  const st = stateAt(m, t); const r = rig(m.look, st.pose);
  const H = side === 'L' ? r.L : r.R; const sx = st.pose.scaleX || 1;
  return [st.x + H.hx * sx, st.y - H.hy, st.z];
}

// ---------- décor ----------
function buildWall() {
  let s = '';
  s += `<rect x="-1600" y="-1700" width="5400" height="1090" fill="#3d2a1b"/>`;
  for (let k = 0; k < 9; k++) s += `<rect x="-1600" y="${-1650 + k * 120}" width="5400" height="14" fill="#2c1e13"/>`;
  // lanternes de papier suspendues sous le plafond
  for (let x = -1350; x < 3700; x += 600) {
    s += `<path d="M${x},-1500 L${x},-905" stroke="#1d140c" stroke-width="3"/>`;
    s += `<rect x="${x - 22}" y="-912" width="44" height="10" rx="3" fill="#2a1d12"/><rect x="${x - 22}" y="-788" width="44" height="10" rx="3" fill="#2a1d12"/>`;
    s += `<ellipse cx="${x}" cy="-845" rx="44" ry="62" fill="url(#lantern)"/>`;
    for (let k = -2; k <= 2; k++) s += `<path d="M${x - 42},${-845 + k * 22} Q${x},${-845 + k * 22 + 4} ${x + 42},${-845 + k * 22}" stroke="#d98b3a" stroke-width="1.5" fill="none" opacity="0.6"/>`;
    s += `<circle cx="${x}" cy="-845" r="14" fill="none" stroke="#b3202a" stroke-width="5"/>`;
  }
  s += `<rect x="-1600" y="-625" width="5400" height="530" fill="#ecdfc4"/>`;
  // ranma (frise ajourée au-dessus de la poutre)
  s += `<rect x="-1600" y="-625" width="5400" height="70" fill="#d8c39d"/>`;
  for (let x = -1600; x < 3800; x += 30) s += `<rect x="${x}" y="-620" width="4" height="60" fill="#b49468"/>`;
  s += `<rect x="-1600" y="-560" width="5400" height="10" fill="#7a4d2c"/>`;
  // bannières « Plus loin ensemble »
  const banner = (cx, txt) => `<g><rect x="${cx - 300}" y="-548" width="600" height="86" rx="6" fill="#b3202a" stroke="#e7b93c" stroke-width="5"/>` +
    `<text x="${cx}" y="-492" text-anchor="middle" font-family="Inter" font-weight="900" font-size="40" letter-spacing="5" fill="#fff">${txt}</text></g>`;
  // poutre (nageshi)
  s += `<rect x="-1600" y="-455" width="5400" height="24" fill="#6e4528"/><rect x="-1600" y="-433" width="5400" height="4" fill="#4e3019"/>`;
  // poteaux (derrière les judokas) et travées
  for (let k = -5; k <= 13; k++) {
    const x = k * SP;
    s += `<rect x="${x - 12}" y="-625" width="24" height="625" fill="#7a4d2c"/><rect x="${x + 6}" y="-625" width="6" height="625" fill="#5e3a20"/>`;
  }
  for (let k = -5; k <= 12; k++) {
    const cx = k * SP + SP / 2;
    if (((k % 2) + 2) % 2 === 0) {
      // kakémono
      s += `<rect x="${cx - 52}" y="-420" width="104" height="9" rx="4" fill="#3b2414"/>`;
      s += `<rect x="${cx - 44}" y="-412" width="88" height="232" fill="#26406a"/>`;
      s += `<rect x="${cx - 36}" y="-402" width="72" height="206" fill="#f7f0de"/>`;
      s += `<text font-family="Brush" font-weight="700" font-size="17" fill="#1a1a1a" text-anchor="middle">` +
        `<tspan x="${cx}" y="-366">Plus</tspan><tspan x="${cx}" y="-340">loin</tspan><tspan x="${cx}" y="-314" font-size="13.5">ensemble</tspan></text>`;
      s += `<circle cx="${cx}" cy="-262" r="22" fill="none" stroke="#1a1a1a" stroke-width="6" stroke-dasharray="118 22" stroke-linecap="round" transform="rotate(-70 ${cx} -262)"/>`;
      s += `<rect x="${cx + 14}" y="-222" width="12" height="12" fill="#c62828"/>`;
      s += `<rect x="${cx - 50}" y="-182" width="100" height="10" rx="5" fill="#3b2414"/>`;
    } else {
      // shoji
      s += `<rect x="${cx - 92}" y="-404" width="184" height="226" fill="#6e4528"/>`;
      s += `<rect x="${cx - 84}" y="-396" width="168" height="210" fill="url(#shojiGlow)"/>`;
      for (let c = 1; c < 4; c++) s += `<rect x="${cx - 84 + c * 42 - 1.5}" y="-396" width="3" height="210" fill="#a37b52"/>`;
      for (let r = 1; r < 5; r++) s += `<rect x="${cx - 84}" y="${-396 + r * 42 - 1.5}" width="168" height="3" fill="#a37b52"/>`;
    }
  }
  s += banner(150, 'PLUS LOIN ENSEMBLE') + banner(1050, 'TOURNOI DES PARTENAIRES') + banner(1950, 'PLUS LOIN ENSEMBLE');
  // guirlande de fanions aux couleurs des ceintures
  for (let x = -1500, k = 0; x < 3700; x += 46, k++) {
    const sag = 10 * Math.sin(((x + 1500) % 460) / 460 * Math.PI);
    const c = TL.belts[k % 8];
    s += `<path d="M${x},${F(-596 + sag)} L${x + 40},${F(-596 + 10 * Math.sin(((x + 1540) % 460) / 460 * Math.PI))} L${x + 20},${F(-566 + sag)} Z" fill="${c}" stroke="${beltEdge(c)}" stroke-width="1.5"/>`;
  }
  // soubassement bois
  s += `<rect x="-1600" y="-104" width="5400" height="104" fill="#8b5a33"/><rect x="-1600" y="-108" width="5400" height="10" fill="#6a4226"/>`;
  s += `<rect x="-1600" y="-70" width="5400" height="3" fill="#74482a"/><rect x="-1600" y="-36" width="5400" height="3" fill="#74482a"/>`;
  s += `<rect x="-1600" y="-8" width="5400" height="8" fill="#4a2d18"/>`;
  return s;
}

function drawFloor(c) {
  let s = '';
  const z0 = 60, z1 = WALLZ, dz = 120, dx = 240;
  for (let z = z1; z > z0; z -= dz) {
    const za = Math.max(z0, z - dz), zb = z;
    for (let x = -1530; x < 3600; x += dx) {
      const a = proj(c, x, 0, zb), b = proj(c, x + dx, 0, zb), cc = proj(c, x + dx, 0, za), d = proj(c, x, 0, za);
      const minx = Math.min(a[0], d[0]), maxx = Math.max(b[0], cc[0]);
      if (maxx < -50 || minx > 1970 || Math.min(a[1], b[1]) > 1130) continue;
      const cxm = x + dx / 2, czm = (za + zb) / 2;
      const inside = Math.abs(cxm - 1050) < 1500 && czm > 250 && czm < 790;
      const chk = ((Math.round((x + 1530) / dx) + Math.round(z / dz)) % 2) === 0;
      let col = inside ? (chk ? '#a9c26c' : '#9db862') : (chk ? '#c2503f' : '#b84a3a');
      col = shade(col, -0.10 * ((czm - z0) / (z1 - z0)));
      s += `<path d="M${F(a[0])},${F(a[1])} L${F(b[0])},${F(b[1])} L${F(cc[0])},${F(cc[1])} L${F(d[0])},${F(d[1])} Z" fill="${col}" stroke="rgba(60,64,30,0.45)" stroke-width="${F(Math.max(0.8, a[2] * 0.6))}"/>`;
      // trame de paille : 3 lignes discrètes dans le sens long
      const st = Math.max(0.5, a[2] * 0.35);
      for (let q = 1; q < 4; q++) {
        const zq = za + (zb - za) * q / 4; const p1 = proj(c, x + 6, 0, zq), p2 = proj(c, x + dx - 6, 0, zq);
        s += `<path d="M${F(p1[0])},${F(p1[1])} L${F(p2[0])},${F(p2[1])}" stroke="rgba(255,255,230,0.13)" stroke-width="${F(st)}"/>`;
      }
    }
  }
  // lumière des fenêtres sur le tatami
  for (let k = -5; k <= 12; k++) {
    if (((k % 2) + 2) % 2 === 0) continue;
    const cx = k * SP + SP / 2;
    const a = proj(c, cx - 80, 0, 880), b = proj(c, cx + 80, 0, 880), cc = proj(c, cx + 150, 0, 520), d = proj(c, cx - 10, 0, 520);
    if (Math.max(a[0], cc[0]) < -50 || Math.min(d[0], a[0]) > 1970) continue;
    s += `<path d="M${F(a[0])},${F(a[1])} L${F(b[0])},${F(b[1])} L${F(cc[0])},${F(cc[1])} L${F(d[0])},${F(d[1])} Z" fill="url(#sunPatch)"/>`;
  }
  return s;
}

function drawShadow(c, x, y, z, w = 40) {
  const p = proj(c, x, y, z); const q = proj(c, x, y, z + 24);
  const ry = Math.max(2, Math.abs(p[1] - q[1]) * 0.9);
  return `<ellipse cx="${F(p[0])}" cy="${F(p[1] - ry * 0.2)}" rx="${F(w * p[2])}" ry="${F(ry)}" fill="url(#shadowG)"/>`;
}

function drawPodium(c, part) {
  let s = '';
  for (const B of PODIUM.blocks) {
    const x0 = B.x0, x1 = B.x0 + B.w, zf = PODIUM.zf, zb = zf + PODIUM.depth;
    if (part === 'top') {
      const a = proj(c, x0, B.h, zb), b = proj(c, x1, B.h, zb), cc = proj(c, x1, B.h, zf), d = proj(c, x0, B.h, zf);
      s += `<path d="M${F(a[0])},${F(a[1])} L${F(b[0])},${F(b[1])} L${F(cc[0])},${F(cc[1])} L${F(d[0])},${F(d[1])} Z" fill="#f4f1ea" stroke="#c9c2b2" stroke-width="2"/>`;
    } else {
      const tl = proj(c, x0, B.h, zf), br = proj(c, x1, 0, zf);
      const w = br[0] - tl[0], h = br[1] - tl[1];
      // face latérale visible selon la position de la caméra
      const side = x1 < c.x ? [proj(c, x1, B.h, zf), proj(c, x1, B.h, zb), proj(c, x1, 0, zb), proj(c, x1, 0, zf)] : x0 > c.x ? [proj(c, x0, B.h, zf), proj(c, x0, B.h, zb), proj(c, x0, 0, zb), proj(c, x0, 0, zf)] : null;
      if (side) s += `<path d="M${side.map(p => F(p[0]) + ',' + F(p[1])).join(' L')} Z" fill="#c9cfdb"/>`;
      s += `<rect x="${F(tl[0])}" y="${F(tl[1])}" width="${F(w)}" height="${F(h)}" fill="#e6eaf2" stroke="#b9c0cf" stroke-width="2"/>`;
      s += `<rect x="${F(tl[0])}" y="${F(tl[1])}" width="${F(w)}" height="${F(Math.min(h, 10 * tl[2]))}" fill="#f6c945"/>`;
      s += `<text x="${F(tl[0] + w / 2)}" y="${F(tl[1] + h * 0.5 + 15 * tl[2])}" text-anchor="middle" font-family="InterD" font-weight="900" font-size="${F(Math.min(h * 0.75, 44 * tl[2]))}" fill="#1f4fa0">${B.n}</text>`;
    }
  }
  return s;
}

// ---------- ceinture libre (au sol, en vol, de main à main) ----------
function beltStroke(pts, color, wpx) {
  const d = 'M' + pts.map(p => F(p[0]) + ',' + F(p[1])).join(' L');
  return `<path d="${d}" fill="none" stroke="${beltEdge(color)}" stroke-width="${F(wpx * 1.35)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${F(wpx)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function sparkle(cx, cy, r, k, color) {
  let s = '';
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 + k * 2; const rr = r * (0.6 + 0.4 * hash(i + 3));
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    const sz = Math.max(2, r * 0.12) * (1 - k);
    s += `<path d="M${F(x)},${F(y - sz)} L${F(x + sz * 0.3)},${F(y - sz * 0.3)} L${F(x + sz)},${F(y)} L${F(x + sz * 0.3)},${F(y + sz * 0.3)} L${F(x)},${F(y + sz)} L${F(x - sz * 0.3)},${F(y + sz * 0.3)} L${F(x - sz)},${F(y)} L${F(x - sz * 0.3)},${F(y - sz * 0.3)} Z" fill="${i % 2 ? '#fff6c2' : color}" opacity="${F(1 - k * 0.8)}"/>`;
  }
  return s;
}

function drawFreeBelt(c, t) {
  if (t >= FIN.S) return '';
  const P0 = PASSES[0];
  if (t < P0.Tf) {
    // pliée sur le tatami devant la place de Mathieu
    const X = MEM[0].X + 70, Z = 360; let s = '';
    for (let k = 0; k < 3; k++) {
      const pts = []; for (let q = 0; q <= 8; q++) pts.push(proj(c, X - 34 + q * 8.5, 2 + k * 2.5, Z + k * 7));
      s += beltStroke(pts, BELTS[0], 7.5 * pts[0][2]);
    }
    const g = 0.5 + 0.5 * Math.sin(t * 3); const p = proj(c, X, 10, Z + 7);
    s += `<circle cx="${F(p[0])}" cy="${F(p[1])}" r="${F(46 * p[2])}" fill="url(#glowG)" opacity="${F(0.35 + 0.35 * g)}"/>`;
    return s;
  }
  for (const P of PASSES) {
    if (t < P.Tf || t >= P.Tc) continue;
    const u = (t - P.Tf) / (P.Tc - P.Tf);
    const recv = MEM[P.p], giver = P.p > 0 ? MEM[P.p - 1] : null;
    const c0 = P.p > 0 ? BELTS[P.p - 1] : BELTS[0], c1 = BELTS[P.p];
    const col = mixColor(c0, c1, sstep(0.35, 0.65, u));
    let s = '';
    if (P.kind === 'hand') {
      const A = handWorld(giver, t, 'R'), B = handWorld(recv, t, 'L');
      const k = eio(u); const X = lerp(A[0], B[0], k), Y = lerp(A[1], B[1], k), Z = lerp(A[2], B[2], k);
      const sw = Math.sin(t * 4) * 3; const pts1 = [], pts2 = [];
      for (let q = 0; q <= 8; q++) { const v = q / 8; pts1.push(proj(c, X - 5 * v + sw * v, Y - 44 * v, Z)); pts2.push(proj(c, X + 6 * v + sw * v, Y - 40 * v, Z)); }
      const w = 5 * pts1[0][2];
      s += beltStroke(pts1, col, w) + beltStroke(pts2, col, w);
      const pc = proj(c, X, Y - 20, Z);
      if (u > 0.3 && u < 0.8) s += sparkle(pc[0], pc[1], 40 * pc[2], (u - 0.3) / 0.5, c1);
      return s;
    }
    const A = P.kind === 'floor' ? [MEM[0].X + 70, 4, 367] : handWorld(giver, P.Tf, 'R');
    const B0 = handWorld(recv, P.Tc, 'L'), B1 = handWorld(recv, P.Tc, 'R');
    const B = P.kind === 'floor' ? [recv.X, 92, FRONTZ - 2] : [(B0[0] + B1[0]) / 2, (B0[1] + B1[1]) / 2, (B0[2] + B1[2]) / 2];
    const h = P.kind === 'floor' ? 75 : 75;
    const pos = v => [lerp(A[0], B[0], v), lerp(A[1], B[1], v) + h * 4 * v * (1 - v), lerp(A[2], B[2], v)];
    const ue = u;
    const C = pos(ue), C2 = pos(Math.min(1, ue + 0.02));
    let dx = C2[0] - C[0], dy = C2[1] - C[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const L = (P.kind === 'floor' ? 60 : 120) * (0.3 + 0.7 * Math.sin(Math.PI * clamp(u * 1.1)));
    const N = 46, rib = [];
    for (let q = 0; q < N; q++) {
      const v = q / (N - 1) - 0.5;
      const wv = Math.sin(q * 0.26 - t * 16) * 9 * Math.sin(Math.PI * u);
      rib.push([C[0] - dx * v * L - dy * wv, C[1] - dy * v * L + dx * wv, C[2]]);
    }
    let pts = rib, bw = 7;
    if (P.kind === 'spool') {
      const mk = sstep(0.5, 0.85, u); const sp = [];
      for (let q = 0; q < N; q++) {
        const v = q / (N - 1); const r = 2 + 13 * v; const th = v * 5.2 * Math.PI + t * 14;
        sp.push([C[0] + r * Math.cos(th), C[1] + r * Math.sin(th), C[2]]);
      }
      pts = rib.map((p, q) => [lerp(sp[q][0], p[0], mk), lerp(sp[q][1], p[1], mk), C[2]]);
      bw = lerp(4.2, 7, mk);
    }
    const pp = pts.map(p => proj(c, p[0], p[1], p[2]));
    s += beltStroke(pp, col, bw * pp[0][2]);
    // pan de nœud au centre + traînée
    const pc = proj(c, C[0], C[1], C[2]);
    if (u > 0.3 && u < 0.85) s += sparkle(pc[0], pc[1], 70 * pc[2], (u - 0.3) / 0.55, c1);
    return s;
  }
  return '';
}

// ---------- confettis (final) ----------
function confetti(t) {
  const t0 = FIN.S + 0.4; if (t < t0) return '';
  let s = ''; const cols = ['#f6c945', '#e74c3c', '#2e86de', '#27ae60', '#ffffff', '#e67e22', '#8e44ad'];
  for (let i = 0; i < 110; i++) {
    const st = t0 + hash(i) * 2.5; if (t < st) continue;
    const v = 140 + 160 * hash(i + 50); const y = -30 + (t - st) * v; if (y > 1110) continue;
    const x = hash(i + 7) * 1920 + Math.sin((t - st) * (1.5 + hash(i + 9) * 2) + i) * 40;
    const rot = (t - st) * (180 + 300 * hash(i + 11)) + i * 37; const w = 10 + 8 * hash(i + 13);
    s += `<rect x="${F(-w / 2)}" y="-4" width="${F(w)}" height="8" fill="${cols[i % cols.length]}" transform="translate(${F(x)},${F(y)}) rotate(${F(rot)}) scale(1,${F(Math.cos((t - st) * 5 + i))})"/>`;
  }
  return s;
}

// ---------- rendu ----------
let lastBand = null;
function renderAt(t) {
  const c = cameraAt(t);
  const sw = c.f / WALLZ;
  $('wallG').setAttribute('transform', `translate(${F(960 - c.x * sw)},${F(540 + c.sh + CAMY * sw)}) scale(${sw.toFixed(5)})`);
  let s = drawFloor(c);
  const finalOn = t >= FIN.S;
  if (finalOn) s += drawPodium(c, 'top');
  const ents = MEM.map(m => ({ m, st: stateAt(m, t) })).sort((a, b) => b.st.z - a.st.z || a.m.i - b.m.i);
  for (const e of ents) s += drawShadow(c, e.st.x, e.st.y, e.st.z, finalOn ? 34 : 40);
  const floorBelt = !finalOn && t < PASSES[0].Tf ? drawFreeBelt(c, t) : '';
  s += floorBelt;
  for (const e of ents) {
    const p = proj(c, e.st.x, e.st.y, e.st.z);
    const { svg } = drawAvatar(e.m, e.m.look, e.st.pose, t);
    const sx = (e.st.pose.scaleX || 1) * p[2];
    s += `<g transform="translate(${F(p[0])},${F(p[1])}) rotate(${F(e.st.sway)}) scale(${sx.toFixed(4)},${p[2].toFixed(4)})">${svg}</g>`;
    // éclat « ippon »
    if (e.m.i === 3 && e.m.ippon && t > e.m.ippon[0] + 0.2 && t < e.m.ippon[1]) {
      const r = rig(e.m.look, e.st.pose); const h = proj(c, e.st.x + r.R.hx, -r.R.hy, e.st.z);
      const k = clamp((t - e.m.ippon[0] - 0.2) / 0.5);
      for (let q = 0; q < 10; q++) {
        const a = q / 10 * Math.PI * 2; const r0 = (12 + 10 * k) * p[2], r1 = r0 + 16 * p[2] * (1 - 0.3 * k);
        s += `<path d="M${F(h[0] + Math.cos(a) * r0)},${F(h[1] + Math.sin(a) * r0)} L${F(h[0] + Math.cos(a) * r1)},${F(h[1] + Math.sin(a) * r1)}" stroke="#ffd23f" stroke-width="${F(3.2 * p[2])}" stroke-linecap="round" opacity="${F(1 - 0.5 * k)}"/>`;
      }
    }
  }
  if (finalOn) s += drawPodium(c, 'front');
  if (!finalOn && t >= PASSES[0].Tf) s += drawFreeBelt(c, t);
  // clin d'œil d'Hélène : petite étincelle
  const H = MEM[4];
  if (t > H.E - 0.1 && t < H.E + 0.45) {
    const st = stateAt(H, t); const r = rig(H.look, st.pose); const p = proj(c, st.x - 9.5 + (st.pose.headTurn || 0) * 3 - 14, -(r.headY - 8), st.z);
    s += sparkle(p[0], p[1], 14 * p[2], clamp((t - H.E + 0.1) / 0.55), '#ffffff');
  }
  if (finalOn) s += confetti(t);
  $('dyn').innerHTML = s;
  hud(t);
}

function setOv(id, op, extra) { const el = $(id); el.style.opacity = op.toFixed(3); if (extra !== undefined) el.style.transform = extra; }

function hud(t) {
  // titre d'ouverture
  const ti = sstep(0.3, 0.9, t) * (1 - sstep(5.0, 5.6, t));
  setOv('title', ti, `translateY(${F((1 - sstep(0.3, 1.0, t)) * -30)}px)`);
  $('title').querySelector('.u').style.width = F(120 + 780 * sstep(0.6, 1.6, t)) + 'px';
  // bandeau du membre
  let band = null;
  for (const m of MEM) if (t >= m.S + 0.9 && t < m.E + 0.25) band = m;
  if (band) {
    if (lastBand !== band.id) {
      lastBand = band.id; const b = $('bandeau');
      for (const im of b.querySelectorAll('img')) im.style.display = im.dataset.id === band.id ? 'block' : 'none';
      b.querySelector('.lg').style.background = band.logo_bg || '#fff';
      b.querySelector('.nm').textContent = band.name; b.querySelector('.co').textContent = band.company;
      b.querySelector('.ac').textContent = band.activity; b.querySelector('.tx').style.borderLeftColor = band.belt === '#ffffff' ? '#e8ebf2' : band.belt;
    }
    const k = sstep(band.S + 0.9, band.S + 1.25, t) * (1 - sstep(band.E, band.E + 0.25, t));
    setOv('bandeau', k, `translateX(${F((1 - k) * -60)}px)`);
  } else setOv('bandeau', 0);
  // HUD ceintures (fil rouge)
  const inMembers = t >= MEM[0].S && t < FIN.S;
  let owner = -1; for (const P of PASSES) if (t >= P.Tc - 0.1) owner = P.p;
  const hudEl = $('beltHud');
  if (hudEl.dataset.o !== String(owner)) {
    hudEl.dataset.o = String(owner);
    hudEl.innerHTML = BELTS.map((b, i) => `<i style="background:${b};opacity:${i <= owner ? 1 : 0.28};transform:scale(${i === owner ? 1.3 : 1})"></i>`).join('');
  }
  setOv('beltHud', inMembers ? sstep(MEM[0].S, MEM[0].S + 0.5, t) * (1 - sstep(FIN.S - 0.4, FIN.S, t)) : 0);
  // sous-titres (texte = champ line)
  let sub = '', so = 0;
  for (const sg of SEGS) {
    if (sg.kind === 'final') continue;
    const v0 = sg.vstart, v1 = sg.vstart + sg.vdur;
    if (t < v0 - 0.1 || t > v1 + 0.3) continue;
    const ch = sg.chunks || [sg.line]; const tot = ch.reduce((a, x) => a + x.length, 0);
    let acc = v0;
    for (const x of ch) { const d = sg.vdur * x.length / tot; if (t < acc + d || x === ch[ch.length - 1]) { sub = x; break; } acc += d; }
    so = sstep(v0 - 0.1, v0 + 0.1, t) * (1 - sstep(v1 + 0.1, v1 + 0.3, t));
  }
  const se = $('subs').querySelector('span'); if (se.textContent !== sub) se.textContent = sub;
  setOv('subs', so);
  // titre final
  const ft = sstep(FIN.V - 0.1, FIN.V + 0.35, t);
  setOv('ftitle', ft, `scale(${F(0.85 + 0.15 * eio(clamp((t - FIN.V + 0.1) / 0.45)))})`);
  $('ftitle').querySelector('.k').style.opacity = sstep(FIN.E + 0.3, FIN.E + 0.8, t).toFixed(3);
  setOv('flash', t >= FIN.S ? 1 - sstep(FIN.S, FIN.S + 0.5, t) : 0);
  setOv('fade', Math.max(1 - sstep(0, 0.35, t), sstep(FIN.N - 0.7, FIN.N, t)));
}

async function setup(tl, width) {
  TL = tl;
  const k = width / 1920; $('stage').style.transform = `scale(${k})`;
  document.body.style.width = width + 'px'; document.body.style.height = Math.round(width * 9 / 16) + 'px';
  setupScene();
  let defs = `<radialGradient id="shadowG"><stop offset="0" stop-color="#000" stop-opacity="0.38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="lantern" cx="0.45" cy="0.4" r="0.65"><stop offset="0" stop-color="#fff7dc"/><stop offset="0.7" stop-color="#ffd98f"/><stop offset="1" stop-color="#e9a04a"/></radialGradient>` +
    `<radialGradient id="glowG"><stop offset="0" stop-color="#fff6c2" stop-opacity="0.9"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="shojiGlow" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#fffdf3"/><stop offset="1" stop-color="#f1e5c8"/></radialGradient>` +
    `<linearGradient id="sunPatch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8dc" stop-opacity="0.28"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="vignette" cx="0.5" cy="0.48" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/></radialGradient>` +
    `<linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9a0" stop-opacity="0.16"/><stop offset="0.5" stop-color="#ffd9a0" stop-opacity="0"/></linearGradient>`;
  const loads = [];
  for (const m of MEM) {
    const h = 800 / m.logo_ar > 800 ? 800 : 800 / m.logo_ar;
    defs += `<symbol id="logo_${m.id}" viewBox="0 0 ${F(800)} ${F(h)}" preserveAspectRatio="xMidYMid meet"><image href="${m.logo}" width="800" height="${F(h)}" preserveAspectRatio="xMidYMid meet"/></symbol>`;
    const im = new Image(); im.src = m.logo; loads.push(im.decode().catch(() => {}));
  }
  $('defs').innerHTML = defs;
  $('bandeau').querySelector('.lg').innerHTML = MEM.map(m => `<img data-id="${m.id}" src="${m.logo}" style="display:none">`).join('');
  $('wallG').innerHTML = buildWall();
  $('title').querySelector('.k').textContent = TL.chapter;
  $('title').querySelector('.t').textContent = TL.title;
  $('ftitle').querySelector('.t').textContent = FIN.line;
  $('ftitle').querySelector('.k').textContent = TL.chapter + ' · ' + TL.title;
  await Promise.all(loads);
  await document.fonts.load('900 40px Inter'); await document.fonts.load('700 40px Inter'); await document.fonts.load('600 40px Inter');
  await document.fonts.load('500 40px Inter'); await document.fonts.load('900 40px InterD'); await document.fonts.load('700 20px Brush');
  // préchauffe : un rendu pour décoder toutes les images SVG
  renderAt(MEM[1].S + 2); for (const m of MEM) { lastBand = null; renderAt(m.S + 2); }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await document.fonts.ready;
}

window.setup = setup; window.renderAt = renderAt;
