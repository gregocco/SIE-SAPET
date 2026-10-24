// Outils communs (maths, couleurs, caméra). Tout est déterministe : aucune source d'aléa.
'use strict';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, t) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const s5 = (a, b, t) => { const u = clamp((t - a) / (b - a)); return u * u * u * (u * (u * 6 - 15) + 10); };
const eio = u => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const bump = (t, a, b, r = 0.3) => { const u = (t - a) / (b - a); if (u <= 0 || u >= 1) return 0; return sstep(0, r, u) * (1 - sstep(1 - r, 1, u)); };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise1 = (t, s) => (Math.sin(t * 1.31 + s) + 0.6 * Math.sin(t * 2.17 + s * 1.7) + 0.4 * Math.sin(t * 0.71 + s * 2.3)) / 2;
const D2R = Math.PI / 180;
const F = v => (Math.round(v * 100) / 100).toString();   // coordonnées SVG
const F1 = v => (Math.round(v * 10) / 10).toString();

const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)],
};

// couleurs
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function rgbToHex(r) { return '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function shade(h, k) { const c = hexToRgb(h); return rgbToHex(c.map(v => k < 0 ? v * (1 + k) : v + (255 - v) * k)); }
function mixc(a, b, u) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * u)); }
function lum(h) { const c = hexToRgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
const rgb01 = h => hexToRgb(h).map(v => v / 255);

// ---------- caméra ----------
// cam = { pos:[x,y,z], tgt:[x,y,z], f } ; f = focale en pixels pour une image de 1920 de large.
// Repère monde : X à droite, Y vers le haut, Z vers le fond (le mur du fond est à Z = WALLZ).
function camBasis(c) {
  const Fw = V.norm(V.sub(c.tgt, c.pos));
  const R = V.norm(V.cross([0, 1, 0], Fw));
  const U = V.cross(Fw, R);
  return { pos: c.pos, R, U, Fw, f: c.f, tgt: c.tgt };
}
// -> [sx, sy, zc, s] en pixels virtuels 1920x1080 ; s = pixels par unité monde à cette profondeur
function project(cb, P) {
  const d = V.sub(P, cb.pos); const zc = V.dot(d, cb.Fw);
  const s = cb.f / Math.max(1e-3, zc);
  return [960 + V.dot(d, cb.R) * s, 540 - V.dot(d, cb.U) * s, zc, s];
}
function camLerp(a, b, u) {
  return { pos: V.lerp(a.pos, b.pos, u), tgt: V.lerp(a.tgt, b.tgt, u), f: Math.exp(lerp(Math.log(a.f), Math.log(b.f), u)),
           ap: lerp(a.ap || 0, b.ap || 0, u), focus: lerp(a.focus || 600, b.focus || 600, u) };
}

window.U = { clamp, lerp, sstep, s5, eio, bump, hash, noise1, D2R, F, F1, V, hexToRgb, rgbToHex, shade, mixc, lum, rgb01, camBasis, project, camLerp };
