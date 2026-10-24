// Dojo en vraie 3D (WebGL2 écrit à la main, sans bibliothèque).
// Géométrie construite une fois (boîtes, quads, tours) ; matériaux procéduraux dans le fragment shader ;
// lumière : hémisphère + lanternes (points) + soleil qui entre par les shoji ouverts (taches au sol calculées
// par lancer de rayon analytique vers le mur), ombres portées des personnages (capsules) dans ces taches,
// rayons volumétriques, poussière en suspension, puis post-traitement : profondeur de champ, bloom,
// tone mapping filmique, vignettage, grain. Tout dépend seulement de (caméra, t) : rendu déterministe.
'use strict';
(function () {
  const { V, rgb01 } = window.U;
  const CX = 955, WALLZ = 1000, CEIL = 460, XL = CX - 1950, XR = CX + 1950, ZNEAR = -1700;
  const ROOM = { CX, WALLZ, CEIL, XL, XR };

  // ---------------- géométrie ----------------
  class Geo {
    constructor() { this.d = []; }
    v(p, n, c, uv, m) { this.d.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], uv[0], uv[1], m); }
    quad(a, b, c, d, col, mat, uv, n) {
      n = n || V.norm(V.cross(V.sub(b, a), V.sub(d, a)));
      uv = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
      const C = typeof col === 'string' ? rgb01(col) : col;
      this.v(a, n, C, uv[0], mat); this.v(b, n, C, uv[1], mat); this.v(c, n, C, uv[2], mat);
      this.v(a, n, C, uv[0], mat); this.v(c, n, C, uv[2], mat); this.v(d, n, C, uv[3], mat);
    }
    // boîte alignée ; uv en unités monde, u le long de l'axe le plus long (fil du bois)
    box(x0, y0, z0, x1, y1, z1, col, mat, skip = '') {
      const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      const ax = dx >= dy && dx >= dz ? 0 : dy >= dz ? 1 : 2;
      const uvf = (p, fa, fb) => { // fa, fb : axes du plan de la face
        const ua = ax === fa ? fa : ax === fb ? fb : fa, va = ua === fa ? fb : fa;
        return [p[ua], p[va] + (x0 * 0.37 + z0 * 0.21)];
      };
      const F = (pts, n, fa, fb) => this.quad(pts[0], pts[1], pts[2], pts[3], col, mat, pts.map(p => uvf(p, fa, fb)), n);
      if (!skip.includes('f')) F([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1], 0, 1);
      if (!skip.includes('k')) F([[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], [0, 0, 1], 0, 1);
      if (!skip.includes('l')) F([[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], [-1, 0, 0], 2, 1);
      if (!skip.includes('r')) F([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [1, 0, 0], 2, 1);
      if (!skip.includes('t')) F([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], 0, 2);
      if (!skip.includes('b')) F([[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], [0, -1, 0], 0, 2);
    }
    // tour (révolution) autour d'un axe vertical : prof = [[r, y], ...]
    lathe(cx, cz, prof, col, mat, seg = 20) {
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        for (let k = 0; k < prof.length - 1; k++) {
          const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
          const P = (r, y, a) => [cx + r * Math.sin(a), y, cz - r * Math.cos(a)];
          const N = (r, y, a, rr, yy) => { const dr = rr - r, dy = yy - y; const l = Math.hypot(dr, dy) || 1; return [Math.sin(a) * dy / l, -dr / l, -Math.cos(a) * dy / l]; };
          const n0 = N(r0, y0, a0, r1, y1);
          const C = rgb01(col);
          const v = (r, y, a, u, w) => this.v(P(r, y, a), N(r0, y0, a, r1, y1), C, [u, w], mat);
          const u0 = i / seg, u1 = (i + 1) / seg, w0 = k / (prof.length - 1), w1 = (k + 1) / (prof.length - 1);
          void n0;
          v(r0, y0, a0, u0, w0); v(r0, y0, a1, u1, w0); v(r1, y1, a1, u1, w1);
          v(r0, y0, a0, u0, w0); v(r1, y1, a1, u1, w1); v(r1, y1, a0, u0, w1);
        }
      }
    }
    // cylindre d'axe Z (tambour)
    cylZ(cx, cy, z0, z1, r, col, mat, seg = 28, capCol, capMat) {
      const C = rgb01(col);
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        const p = (a, z) => [cx + r * Math.cos(a), cy + r * Math.sin(a), z];
        const n0 = [Math.cos(a0), Math.sin(a0), 0], n1 = [Math.cos(a1), Math.sin(a1), 0];
        this.v(p(a0, z0), n0, C, [a0 * r, z0], mat); this.v(p(a1, z0), n1, C, [a1 * r, z0], mat); this.v(p(a1, z1), n1, C, [a1 * r, z1], mat);
        this.v(p(a0, z0), n0, C, [a0 * r, z0], mat); this.v(p(a1, z1), n1, C, [a1 * r, z1], mat); this.v(p(a0, z1), n0, C, [a0 * r, z1], mat);
        if (capCol) {
          const K = rgb01(capCol);
          this.v([cx, cy, z0], [0, 0, -1], K, [0.5, 0.5], capMat); this.v(p(a0, z0), [0, 0, -1], K, [0.5 + 0.5 * Math.cos(a0), 0.5 + 0.5 * Math.sin(a0)], capMat); this.v(p(a1, z0), [0, 0, -1], K, [0.5 + 0.5 * Math.cos(a1), 0.5 + 0.5 * Math.sin(a1)], capMat);
        }
      }
    }
  }

  // matériaux
  const M = { TATAMI: 0, WOOD: 1, PLASTER: 2, SHOJI: 3, ATLAS: 4, LANTERN: 5, OUTSIDE: 6, PODIUM: 7, CLOTH: 9, LACQUER: 10, GOLD: 11, PLANKS: 12, RANMA: 13, DRUMSKIN: 14 };
  const WOOD_D = '#6b4426', WOOD_M = '#8a5a32', WOOD_L = '#b07c4a', WOOD_PIL = '#7a4b2a';

  function bayKind(k) {
    const a = Math.abs(k);
    if (a === 0) return 'kamiza';
    if (a === 2 || a === 5) return 'open';
    if (a === 3) return 'scroll';
    return 'shoji';
  }

  function buildRoom(atlas, belts) {
    const g = new Geo();
    const W = [];  // fenêtres ouvertes (soleil) : x0, y0, x1, y1 sur le plan du mur
    const lights = [];
    // sol : un seul grand quad, le tatami est procédural
    g.quad([XL, 0, ZNEAR], [XR, 0, ZNEAR], [XR, 0, WALLZ], [XL, 0, WALLZ], '#ffffff', M.TATAMI, [[XL, ZNEAR], [XR, ZNEAR], [XR, WALLZ], [XL, WALLZ]], [0, 1, 0]);
    // plafond (planches) + poutres
    g.quad([XL, CEIL, WALLZ], [XR, CEIL, WALLZ], [XR, CEIL, ZNEAR], [XL, CEIL, ZNEAR], '#7b5536', M.PLANKS, [[XL, WALLZ], [XR, WALLZ], [XR, ZNEAR], [XL, ZNEAR]].map(p => [p[1], p[0]]), [0, -1, 0]);
    for (let k = -7; k <= 6; k++) {
      const x = CX + (k + 0.5) * 300;
      g.box(x - 14, CEIL - 34, ZNEAR, x + 14, CEIL, WALLZ, WOOD_D, M.WOOD, 't');
    }
    for (const z of [-650, 120, 560]) g.box(XL, CEIL - 46, z - 15, XR, CEIL - 30, z + 15, WOOD_D, M.WOOD, 't');
    // mur du fond
    const SH0 = 56, SH1 = 262, NG0 = 262, NG1 = 280, RM1 = 346;
    g.box(XL, 0, WALLZ - 2, XR, SH0, WALLZ + 4, WOOD_M, M.PLANKS, 'k');                 // soubassement
    g.box(XL, SH0 - 4, WALLZ - 7, XR, SH0 + 2, WALLZ, WOOD_D, M.WOOD, 'k');             // lisse basse (shikii)
    g.box(XL, NG0, WALLZ - 10, XR, NG1, WALLZ, WOOD_D, M.WOOD, 'k');                    // nageshi
    g.box(XL, NG1 - 2, WALLZ - 4, XR, NG1 + 2, WALLZ, '#3b2414', M.WOOD, 'k');
    g.quad([XL, NG1, WALLZ], [XR, NG1, WALLZ], [XR, RM1, WALLZ], [XL, RM1, WALLZ], '#5a3a22', M.RANMA, [[XL, 0], [XR, 0], [XR, RM1 - NG1], [XL, RM1 - NG1]], [0, 0, -1]);
    g.box(XL, RM1, WALLZ - 6, XR, RM1 + 6, WALLZ, WOOD_D, M.WOOD, 'k');
    g.quad([XL, RM1 + 6, WALLZ], [XR, RM1 + 6, WALLZ], [XR, CEIL, WALLZ], [XL, CEIL, WALLZ], '#e9dcc0', M.PLASTER, [[XL, RM1], [XR, RM1], [XR, CEIL], [XL, CEIL]], [0, 0, -1]);
    for (let k = -6; k <= 6; k++) {
      const c = CX + k * 300, x0 = c - 138, x1 = c + 138, kind = bayKind(k);
      const shojiPanel = (a, b, z) => {
        g.quad([a, SH0, z], [b, SH0, z], [b, SH1, z], [a, SH1, z], '#fff6e2', M.SHOJI, [[a, SH0], [b, SH0], [b, SH1], [a, SH1]], [0, 0, -1]);
        // cadre (kamachi) et croisillons (kumiko) en relief devant le papier
        g.box(a, SH0, z - 7, a + 6, SH1, z - 1, WOOD_L, M.WOOD); g.box(b - 6, SH0, z - 7, b, SH1, z - 1, WOOD_L, M.WOOD);
        g.box(a, SH0, z - 7, b, SH0 + 8, z - 1, WOOD_L, M.WOOD); g.box(a, SH1 - 7, z - 7, b, SH1, z - 1, WOOD_L, M.WOOD);
        const iw = b - a - 12, ih = SH1 - SH0 - 15;
        for (let q = 1; q < 4; q++) { const x = a + 6 + iw * q / 4; g.box(x - 0.9, SH0 + 8, z - 3.5, x + 0.9, SH1 - 7, z - 1, '#c79c68', M.WOOD); }
        for (let q = 1; q < 6; q++) { const y = SH0 + 8 + ih * q / 6; g.box(a + 6, y - 0.9, z - 3.5, b - 6, y + 0.9, z - 1, '#c79c68', M.WOOD); }
      };
      if (kind === 'shoji') { shojiPanel(x0, c, WALLZ + 1); shojiPanel(c, x1, WALLZ + 1); }
      else if (kind === 'open') {
        // panneau gauche glissé derrière le droit : ouverture sur le jardin
        const right = k > 0;
        const pa = right ? c : x0, pb = right ? x1 : c;
        shojiPanel(pa, pb, WALLZ + 1); shojiPanel(pa + 4, pb + 4, WALLZ + 9);
        const oa = right ? x0 : c, ob = right ? c : x1;
        W.push([oa + 1, SH0 + 2, ob - 1, SH1 - 2]);
        // engawa (véranda) + jardin lumineux
        g.box(oa - 30, -4, WALLZ + 2, ob + 30, 0, WALLZ + 220, '#9a6a3e', M.PLANKS, 'b');
        g.quad([oa - 260, -40, WALLZ + 520], [ob + 260, -40, WALLZ + 520], [ob + 260, 420, WALLZ + 520], [oa - 260, 420, WALLZ + 520], '#ffffff', M.OUTSIDE, [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, -1]);
        g.box(oa - 30, SH1, WALLZ + 2, ob + 30, SH1 + 14, WALLZ + 240, '#4a2f1b', M.WOOD, '');   // avant-toit
      } else {
        g.quad([x0, SH0, WALLZ], [x1, SH0, WALLZ], [x1, SH1, WALLZ], [x0, SH1, WALLZ], '#e6d8b8', M.PLASTER, [[x0, SH0], [x1, SH0], [x1, SH1], [x0, SH1]], [0, 0, -1]);
        const reg = kind === 'kamiza' ? atlas.kanji : (k < 0 ? atlas.scroll : atlas.scroll2);
        const kw = kind === 'kamiza' ? 52 : 46, ky0 = 74, ky1 = 248;
        g.quad([c - kw, ky0, WALLZ - 3], [c + kw, ky0, WALLZ - 3], [c + kw, ky1, WALLZ - 3], [c - kw, ky1, WALLZ - 3], '#ffffff', M.ATLAS, [[reg[0], reg[3]], [reg[2], reg[3]], [reg[2], reg[1]], [reg[0], reg[1]]], [0, 0, -1]);
        g.box(c - kw - 5, ky1, WALLZ - 6, c + kw + 5, ky1 + 4, WALLZ - 2, '#2a1a10', M.LACQUER);
        g.box(c - kw - 6, ky0 - 4, WALLZ - 7, c + kw + 6, ky0, WALLZ - 2, '#2a1a10', M.LACQUER);
        if (kind === 'kamiza') { g.box(c - 120, 34, WALLZ - 40, c + 120, 40, WALLZ, WOOD_L, M.WOOD); g.box(c - 112, 0, WALLZ - 34, c - 104, 34, WALLZ - 6, WOOD_D, M.WOOD); g.box(c + 104, 0, WALLZ - 34, c + 112, 34, WALLZ - 6, WOOD_D, M.WOOD); }
      }
    }
    // poteaux (hashira) du mur du fond
    for (let k = -7; k <= 6; k++) { const x = CX + (k + 0.5) * 300; g.box(x - 13, 0, WALLZ - 14, x + 13, CEIL, WALLZ + 2, WOOD_PIL, M.WOOD, 'k'); }
    // murs latéraux
    for (const sd of [-1, 1]) {
      const x = sd < 0 ? XL : XR, n = [-sd, 0, 0];
      const Q = (y0, y1, col, mat) => g.quad([x, y0, ZNEAR], [x, y0, WALLZ], [x, y1, WALLZ], [x, y1, ZNEAR], col, mat, [[ZNEAR, y0], [WALLZ, y0], [WALLZ, y1], [ZNEAR, y1]], n);
      Q(0, SH0, WOOD_M, M.PLANKS); Q(SH0, NG0, '#e6d8b8', M.PLASTER); Q(NG1, CEIL, '#e9dcc0', M.PLASTER);
      g.box(x - (sd > 0 ? 10 : 0), NG0, ZNEAR, x + (sd < 0 ? 10 : 0), NG1, WALLZ, WOOD_D, M.WOOD);
      for (let z = -1500; z < WALLZ; z += 300) g.box(x - 12, 0, z - 12, x + 12, CEIL, z + 12, WOOD_PIL, M.WOOD);
    }
    // bannières (devant le ranma)
    const ban = (cx, w, reg) => {
      const z = WALLZ - 26, y0 = 286, y1 = 372;
      g.quad([cx - w, y0, z], [cx + w, y0, z], [cx + w, y1, z], [cx - w, y1, z], '#ffffff', M.ATLAS, [[reg[0], reg[3]], [reg[2], reg[3]], [reg[2], reg[1]], [reg[0], reg[1]]], [0, 0, -1]);
      g.box(cx - w - 12, y1, z - 3, cx + w + 12, y1 + 5, z + 3, '#24160c', M.LACQUER);
      for (const e of [-1, 1]) g.box(cx + e * (w + 6) - 1, y1 + 5, z - 1, cx + e * (w + 6) + 1, CEIL - 34, z + 1, '#c9a24a', M.GOLD);
    };
    ban(CX, 330, atlas.banner); ban(CX - 1050, 270, atlas.side); ban(CX + 1050, 270, atlas.side);
    // lanternes (chochin) : deux rangées + deux au premier plan pour le plan d'ouverture
    const lantern = (x, z, y = 360, r = 30) => {
      const prof = []; const hh = 44;
      for (let i = 0; i <= 12; i++) { const u = i / 12; const yy = y - hh + 2 * hh * u; const rr = r * Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * u)), 0.62); prof.push([rr, yy]); }
      g.lathe(x, z, prof, '#fff1d6', M.LANTERN, 18);
      g.lathe(x, z, [[0, y + hh + 6], [r * 0.42, y + hh + 6], [r * 0.42, y + hh - 1]], '#141010', M.LACQUER, 14);
      g.lathe(x, z, [[r * 0.45, y - hh + 1], [r * 0.45, y - hh - 6], [0, y - hh - 6]], '#141010', M.LACQUER, 14);
      g.box(x - 0.8, y + hh + 6, z - 0.8, x + 0.8, CEIL - 30, z + 0.8, '#1a120c', M.LACQUER);
      lights.push([x, y, z, 1.0]);
    };
    for (let q = -3; q <= 3; q++) lantern(CX + q * 600, 250);
    for (let q = -2; q <= 3; q++) lantern(CX + (q - 0.5) * 600, 690, 352);
    lantern(CX - 760, -420, 372, 32); lantern(CX + 760, -420, 372, 32);
    // guirlandes de fanions aux couleurs des ceintures (profondeur : deux rangées)
    for (const [z, ybase] of [[140, 412], [520, 404]]) {
      for (let x = XL + 20, i = 0; x < XR - 30; x += 34, i++) {
        const span = 600, u = ((x - XL) % span) / span; const sag = 22 * Math.sin(Math.PI * u);
        const u2 = ((x + 22 - XL) % span) / span; const sag2 = 22 * Math.sin(Math.PI * u2);
        const ya = ybase - sag, yb = ybase - sag2;
        const col = belts[i % belts.length];
        const C = rgb01(col);
        g.v([x, ya, z], [0, 0, -1], C, [0, 0], M.CLOTH); g.v([x + 22, yb, z], [0, 0, -1], C, [1, 0], M.CLOTH); g.v([x + 11, (ya + yb) / 2 - 30, z - 2], [0, 0, -1], C, [0.5, 1], M.CLOTH);
      }
      for (let x = XL; x < XR; x += 20) {
        const u0 = ((x - XL) % 600) / 600, u1 = ((x + 20 - XL) % 600) / 600;
        const y0 = ybase - 22 * Math.sin(Math.PI * u0) + 0.5, y1 = ybase - 22 * Math.sin(Math.PI * (u1 === 0 ? 1 : u1)) + 0.5;
        g.quad([x, y0 - 0.7, z], [x + 20, y1 - 0.7, z], [x + 20, y1 + 0.7, z], [x, y0 + 0.7, z], '#e8dcc0', M.CLOTH);
      }
    }
    // tambour taiko sur son support (côté droit) + banc (côté gauche)
    g.cylZ(CX + 1640, 96, 840, 920, 46, '#7d2418', M.LACQUER, 28, '#e9dcc0', M.DRUMSKIN);
    g.box(CX + 1585, 0, 860, CX + 1595, 70, 900, WOOD_D, M.WOOD); g.box(CX + 1685, 0, 860, CX + 1695, 70, 900, WOOD_D, M.WOOD);
    g.box(CX + 1580, 48, 870, CX + 1700, 56, 890, WOOD_D, M.WOOD);
    g.box(CX - 1820, 34, 760, CX - 1480, 42, 860, WOOD_L, M.WOOD);
    for (const x of [CX - 1800, CX - 1500]) g.box(x - 4, 0, 770, x + 4, 34, 850, WOOD_D, M.WOOD);
    return { g, W, lights };
  }

  function buildPodium(atlas, P) {
    const g = new Geo();
    for (const B of P.blocks) {
      const x0 = B.x0, x1 = B.x0 + B.w, z0 = P.zf, z1 = P.zf + P.depth, h = B.h;
      g.box(x0, 0, z0, x1, h, z1, '#f1f2f5', M.PODIUM, 'f');
      const reg = atlas['pod' + B.n];
      g.quad([x0, 0, z0], [x1, 0, z0], [x1, h, z0], [x0, h, z0], '#ffffff', M.ATLAS, [[reg[0], reg[3]], [reg[2], reg[3]], [reg[2], reg[1]], [reg[0], reg[1]]], [0, 0, -1]);
      g.box(x0 - 1, h - 2.5, z0 - 1.8, x1 + 1, h + 0.6, z0 + 3, '#d9ae3a', M.GOLD, 'b');
      g.box(x0 - 1, -0.1, z0 - 1.2, x1 + 1, 2.5, z1 + 1, '#1a2f5a', M.LACQUER, 't');
    }
    return g;
  }

  function buildStand(X, Z) {
    const g = new Geo();
    // petit plateau de bois laqué (sanbō) qui porte la ceinture pliée
    g.box(X - 30, 0, Z - 18, X + 30, 22, Z + 18, '#6a2a16', M.LACQUER);
    g.box(X - 36, 22, Z - 24, X + 36, 25, Z + 24, '#c9a24a', M.GOLD);
    g.box(X - 34, 25, Z - 22, X + 34, 28, Z + 22, '#1c120c', M.LACQUER);
    return g;
  }

  // ---------------- shaders ----------------
  const COMMON = `
precision highp float;
uniform vec4 uWin[8]; uniform int uNWin; uniform vec3 uSun;
uniform vec4 uChars[12]; uniform int uNChars;
const float WALLZ = ${WALLZ.toFixed(1)};
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x), mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.03; a*=.5;} return s; }
float winMask(vec2 h, float soft){ float m=0.; for(int i=0;i<8;i++){ if(i>=uNWin) break; vec4 w=uWin[i];
  float mx=smoothstep(w.x-soft,w.x+soft,h.x)*(1.-smoothstep(w.z-soft,w.z+soft,h.x));
  float my=smoothstep(w.y-soft,w.y+soft,h.y)*(1.-smoothstep(w.w-soft,w.w+soft,h.y));
  m=max(m,mx*my);} return m; }
float charOcc(vec3 p){ float o=1.; for(int i=0;i<12;i++){ if(i>=uNChars) break; vec4 c=uChars[i];
  float t=(c.y-p.z)/uSun.z; if(t<=0.) continue; vec3 q=p+uSun*t; float hh=c.w; float dy=q.y-c.z;
  if(dy<-3.||dy>hh+5.) continue; float u=dy/hh;
  float w = u>.84 ? 13. : (u>.78 ? 9.5 : (u>.47 ? 28. : 22.));
  float dx=abs(q.x-c.x); float sf=2.+t*.02;
  float s=(1.-smoothstep(w-sf,w+sf,dx))*(1.-smoothstep(hh-2.,hh+5.,dy));
  o*=1.-.88*s; } return o; }
uniform vec4 uWinBox;
float insun(vec3 p, bool chars){ if(p.z>=WALLZ-1.) return 0.; float t=(WALLZ-p.z)/uSun.z; vec3 h=p+uSun*t;
  float sf=1.5+t*.014; if(h.y<uWinBox.y-sf||h.y>uWinBox.w+sf||h.x<uWinBox.x-sf||h.x>uWinBox.z+sf) return 0.;
  float m=winMask(h.xy, sf); if(m<=0.) return 0.; if(chars) m*=charOcc(p); return m; }
`;

  const VS_SCENE = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aCol; layout(location=3) in vec2 aUv; layout(location=4) in float aMat;
uniform vec3 uCam, uR, uU, uFw; uniform float uFocal;
out vec3 vPos; out vec3 vNrm; out vec3 vCol; out vec2 vUv; flat out int vMat;
void main(){ vec3 d=aPos-uCam; float zc=dot(d,uFw);
  const float n=6., f=9000.;
  gl_Position=vec4(dot(d,uR)*uFocal/960., dot(d,uU)*uFocal/540., zc*(f+n)/(f-n)-2.*f*n/(f-n), zc);
  vPos=aPos; vNrm=aNrm; vCol=aCol; vUv=aUv; vMat=int(aMat+.5); }`;

  const FS_SCENE = `#version 300 es
${COMMON}
in vec3 vPos; in vec3 vNrm; in vec3 vCol; in vec2 vUv; flat in int vMat;
uniform vec3 uCam, uFw; uniform float uTime, uRays, uLampK, uAmbK;
uniform vec3 uSunCol;
uniform sampler2D uAtlas, uNoise;
float fbmT(vec2 p){ return texture(uNoise,p*.125).r; }
float vnT(vec2 p){ return texture(uNoise,p*.03125).g; }
uniform vec4 uLights[16]; uniform int uNLights;
uniform vec4 uTatami; // x0, z0, nx, nz (aire de compétition en carreaux de 120)
layout(location=0) out vec4 oCol; layout(location=1) out vec4 oDep;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 woodTex(vec2 uv, vec3 base, float k){
  float g=fbmT(vec2(uv.x*.010+k, uv.y*.30));
  float r=sin(uv.y*.55+g*10.+k*3.)*.5+.5;
  float fine=vnT(vec2(uv.x*.06, uv.y*2.6+k*7.));
  return base*mix(.74,1.10,r*.6+fine*.4);
}
vec3 shadeL(vec3 p, vec3 n, vec3 V, vec3 alb, float spec, float gloss, float ao, float sunK){
#ifndef NO_AO
  if(n.y>.6){ for(int i=0;i<12;i++){ if(i>=uNChars) break; vec4 c=uChars[i]; if(abs(p.y-c.z)>7.) continue;
      vec2 d=(p.xz-vec2(c.x,c.y))/vec2(36.,22.); ao*=1.-.62*exp(-dot(d,d)*1.7);
      vec2 d2=(p.xz-vec2(c.x,c.y+26.))/vec2(46.,40.); ao*=1.-.22*exp(-dot(d2,d2)*1.5); } }
#endif
  vec3 hemi=mix(vec3(.15,.11,.08), vec3(.40,.35,.29), n.y*.5+.5)*uAmbK;
  vec3 c=alb*hemi*ao;
  c+=alb*vec3(.20,.16,.12)*max(dot(n,normalize(vec3(-.2,.25,1.))),0.)*ao*uAmbK;
  c+=alb*vec3(.10,.09,.08)*max(dot(n,normalize(vec3(.3,.5,-1.))),0.)*ao*uAmbK;
#ifdef NO_SUN
  float s=0.; vec3 Hs=uSun;
#else
  float s=insun(p,true)*sunK; vec3 Hs=normalize(uSun+V);
#endif
  c+=uSunCol*s*max(dot(n,uSun),0.)*(alb+spec*pow(max(dot(n,Hs),0.),gloss));
#ifndef NO_LIGHTS
  for(int i=0;i<16;i++){ if(i>=uNLights) break; vec3 L=uLights[i].xyz-p; float d2=dot(L,L); L*=inversesqrt(d2);
    float att=uLights[i].w*uLampK/(1.+d2*(1./(230.*230.))); float nl=max(dot(n,L),0.); vec3 H=normalize(L+V);
    c+=vec3(1.,.64,.33)*att*nl*(alb+(spec>.01?spec*pow(max(dot(n,H),0.),gloss):0.)); }
#endif
  return c;
}
void main(){
  vec3 p=vPos; vec3 n=normalize(vNrm); vec3 V=normalize(uCam-p); if(dot(n,V)<0.) n=-n;
#ifdef FLAT
  oCol=vec4(vCol,1.); oDep=vec4(1.); return;
#endif
  vec3 alb=lin(vCol); vec3 emi=vec3(0); float spec=0., gloss=24., ao=1., sunK=1.;
  int m=vMat;
#ifdef NO_TEX
  m=99;
#endif
  if(m==0){ // tatami : carreaux de 120, joints, trame, aire de compétition
    vec2 q=(p.xz-uTatami.xy)/120.; vec2 ci=floor(q); vec2 lc=fract(q)*120.;
    vec2 de2=min(lc,120.-lc); float e=min(de2.x,de2.y);
    bool inner = ci.x>=0. && ci.x<uTatami.z && ci.y>=0.;
    bool border = !inner && ci.x>=-1. && ci.x<uTatami.z+1. && ci.y>=-1.;
    vec3 col = inner ? vec3(.40,.55,.25) : (border ? vec3(.66,.20,.16) : vec3(.36,.50,.24));
    col*=1.+(h12(ci+3.1)-.5)*.10;
    float px=fwidth(p.z*2.4); float wv=sin(p.z*2.4+sin(p.x*.05)*.6)*.5+.5; wv=mix(wv,.5,clamp(px*.7,0.,1.));
    col*=.90+.12*wv; col*=.90+.16*fbmT(p.xz*.02+ci*7.); col*=.96+.06*vnT(p.xz*.35);
    float pw=fwidth(e); float seam=smoothstep(.35-pw,1.5+pw,e); float dk=mix(.30,1.,seam);
    dk=mix(1.,dk,clamp(1.6-pw*.6,.25,1.));
    vec2 ed=vec2(lc.x<60.?-1.:1., lc.y<60.?-1.:1.); vec2 bv=vec2(de2.x<de2.y?ed.x:0., de2.y<=de2.x?ed.y:0.);
    float bev=1.-smoothstep(0.,3.,e); n=normalize(vec3(bv.x*bev*.55,1.,bv.y*bev*.55));
    alb=col*dk; spec=.10; gloss=18.;
    ao*=mix(.62,1.,smoothstep(0.,110.,WALLZ-p.z));
  } else if(m==1){ alb=woodTex(vUv,alb,vCol.r*9.); spec=.22; gloss=38.; }
  else if(m==12){ float idx=floor(vUv.y/19.); float lv=fract(vUv.y/19.); float sm=smoothstep(0.,.07,lv)*smoothstep(1.,.93,lv);
    alb=woodTex(vec2(vUv.x+idx*131.,vUv.y),alb,idx)*(.86+.24*h12(vec2(idx,4.)))*mix(.45,1.,sm); spec=.15; gloss=30.; }
  else if(m==2){ alb*=.93+.10*fbmT(vUv*.05); alb*=.97+.03*vnT(vUv*.8); ao*=mix(.75,1.,smoothstep(0.,40.,abs(p.y-${CEIL.toFixed(1)}))); }
  else if(m==3){ float f=fbmT(vUv*.05); float pl=smoothstep(.52,.74,fbmT(vUv*.011+vec2(3.,7.)));
    emi=lin(vec3(1.,.95,.84))*(1.75+.35*f)*(1.-.30*pl); alb*=.25; sunK=0.; }
  else if(m==4){ alb=lin(texture(uAtlas,vUv).rgb); alb*=.95+.08*vnT(p.xy*.9); spec=.05; }
  else if(m==5){ float band=step(vUv.y,.13)+step(.87,vUv.y); float rib=pow(abs(sin(vUv.y*3.14159*15.)),10.);
    float face=.55+.45*max(dot(n,V),0.);
    emi=mix(vec3(1.25,.80,.38),vec3(.95,.16,.07),clamp(band,0.,1.))*(2.4-1.1*rib)*face; alb*=.2; }
  else if(m==6){ float f=fbmT(vUv*vec2(9.,6.)); float sky=smoothstep(.45,.95,vUv.y+f*.25);
    emi=mix(vec3(.42,.58,.24)*1.4, vec3(1.25,1.12,.85)*2.6, sky)*(.8+.4*f); alb=vec3(0); }
  else if(m==7){ spec=.45; gloss=70.; alb*=.97+.04*vnT(vUv*.3); }
  else if(m==9){ emi=alb*.18; spec=.05; }
  else if(m==10){ spec=.55; gloss=90.; }
  else if(m==11){ alb=lin(vec3(.85,.66,.24)); spec=1.4; gloss=40.; }
  else if(m==13){ vec2 u=vUv; float d=abs(fract(u.x/26.)-.5)+abs(fract(u.y/22.+floor(u.x/26.)*.5)-.5);
    float hole=smoothstep(.30,.25,d)*smoothstep(4.,7.,u.y)*smoothstep(62.,59.,u.y);
    alb=woodTex(u,alb,2.)*(1.-hole); emi=lin(vec3(1.,.86,.62))*1.5*hole; }
  else if(m==14){ alb*=.9+.15*fbmT(vUv*6.); spec=.1; }
#ifdef SIMPLE
  oCol=vec4(vCol,1.); oDep=vec4(dot(p-uCam,uFw),0.,0.,1.); return;
#endif
  vec3 c=shadeL(p,n,V,alb,spec,gloss,ao,sunK)+emi;
  float L=length(p-uCam);
  c=mix(c,vec3(.30,.22,.15)*.55,1.-exp(-L*.00010));
  oCol=vec4(c,1.); oDep=vec4(dot(p-uCam,uFw),0.,0.,1.);
}`;

  const VS_DUST = `#version 300 es
${COMMON}
layout(location=0) in vec4 aSeed;
uniform vec3 uCam, uR, uU, uFw; uniform float uFocal, uTime, uPx;
out float vB;
void main(){ float t=uTime;
  vec3 p=vec3(mix(${(CX - 1500).toFixed(1)},${(CX + 1500).toFixed(1)},aSeed.x), 0., mix(-500.,990.,aSeed.z));
  p.y=8.+mod(aSeed.y*440.+t*(2.+6.*aSeed.w)+sin(t*.4+aSeed.x*30.)*6.,440.);
  p.x+=sin(t*.13+aSeed.w*40.)*28.; p.z+=cos(t*.11+aSeed.y*20.)*22.;
  vec3 d=p-uCam; float zc=dot(d,uFw);
  const float n=6., f=9000.;
  gl_Position=vec4(dot(d,uR)*uFocal/960., dot(d,uU)*uFocal/540., zc*(f+n)/(f-n)-2.*f*n/(f-n), zc);
  gl_PointSize=clamp(1.6*uFocal/max(zc,1.)*uPx,1.,9.);
  float s=insun(p,false);
  vB=(.035+1.3*s)*(.5+.5*aSeed.w)*smoothstep(30.,160.,zc);
}`;
  const FS_DUST = `#version 300 es
precision highp float; in float vB; layout(location=0) out vec4 o;
void main(){ float r=length(gl_PointCoord-.5)*2.; o=vec4(vec3(1.,.86,.62)*vB*max(0.,1.-r*r),1.); }`;

  const VS_FS = `#version 300 es
out vec2 vUv; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
  const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform float uSub; out vec4 o;
void main(){ vec2 px=1./vec2(textureSize(uTex,0)); vec3 c=vec3(0); vec2 lim=vec2(uSub)-.5*px;
  for(int i=0;i<4;i++) for(int j=0;j<4;j++) c+=texture(uTex,min(vUv*uSub+(vec2(i,j)-1.5)*px*uSub,lim)).rgb; c/=16.;
  float l=dot(c,vec3(.3,.59,.11)); o=vec4(c*smoothstep(.9,2.6,l),1.); }`;
  const FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){ vec2 px=uDir/vec2(textureSize(uTex,0)); vec3 c=texture(uTex,vUv).rgb*.2270;
  c+=(texture(uTex,vUv+px*1.38).rgb+texture(uTex,vUv-px*1.38).rgb)*.3162;
  c+=(texture(uTex,vUv+px*3.23).rgb+texture(uTex,vUv-px*3.23).rgb)*.0703; o=vec4(c,1.); }`;
  const FS_RAYS = `#version 300 es
${COMMON}
in vec2 vUv; uniform sampler2D uDep; uniform vec3 uCam, uR, uU, uFw; uniform float uFocal, uTime, uSub; out vec4 o;
void main(){ vec2 ndc=vUv*2.-1.; vec3 dir=normalize(uFw+uR*(ndc.x*960./uFocal)+uU*(ndc.y*540./uFocal));
  float zc=texture(uDep,vUv*uSub).r; float L=min(zc/max(dot(dir,uFw),.05), 2600.);
  float j=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))+uTime*7.31);
  float acc=0.; for(int i=0;i<20;i++){ vec3 q=uCam+dir*L*((float(i)+j)/20.); if(q.y>0.&&q.y<${CEIL.toFixed(1)}) acc+=insun(q,false)*(.6+.8*vn(q.xy*.010+vec2(uTime*.06,q.z*.004))); }
  acc*=L/20.; float ph=.30+1.6*pow(max(dot(dir,uSun),0.),3.);
  o=vec4(vec3(acc*ph),1.); }`;
  const FS_DOF = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uCol, uDep; uniform float uFocus, uAp, uFocal, uPx, uMaxCoc, uSub; out vec4 o;
float cocAt(float z){ return min(uAp*uFocal*abs(1./uFocus-1./max(z,1.)), uMaxCoc)*uPx; }
const vec2 PD[16]=vec2[16](vec2(.2,.04),vec2(-.13,.36),vec2(-.38,-.14),vec2(.05,-.46),vec2(.5,.33),vec2(.62,-.22),vec2(-.6,.36),vec2(-.27,-.69),
 vec2(.31,-.8),vec2(.86,.1),vec2(.08,.78),vec2(-.85,-.06),vec2(-.53,.78),vec2(.6,.73),vec2(-.92,-.38),vec2(.93,-.36));
void main(){ vec2 uv=vUv*uSub; vec2 lim=vec2(uSub)-.5/vec2(textureSize(uCol,0));
  float z=texture(uDep,uv).r; float coc=cocAt(z); vec3 c=texture(uCol,uv).rgb;
  if(coc>.4){ vec2 px=1./vec2(textureSize(uCol,0)); vec3 acc=c; float ws=1.;
    for(int i=0;i<16;i++){ vec2 su=min(uv+PD[i]*coc*px,lim); float zs=texture(uDep,su).r; float cs=cocAt(zs);
      float w=zs<z-40.?clamp(cs/coc,0.,1.):1.; acc+=texture(uCol,su).rgb*w; ws+=w; }
    c=acc/ws; }
  o=vec4(c,coc); }`;
  const FS_FINAL = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uCol, uDofT, uRaysT, uBloom;
uniform float uTime, uExpo, uBloomK, uVig, uRays, uSub; uniform vec3 uSunCol;
out vec4 o;
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){ vec3 c=texture(uCol,min(vUv*uSub,vec2(uSub)-.5/vec2(textureSize(uCol,0)))).rgb; vec4 d=texture(uDofT,vUv);
  c=mix(c,d.rgb,smoothstep(.35,1.6,d.a));
  c+=uSunCol*texture(uRaysT,vUv).r*uRays;
  c+=texture(uBloom,vUv).rgb*uBloomK;
  c*=uExpo; c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);
  c=pow(clamp(c,0.,1.),vec3(1./2.2));
  c=mix(c, c*c*(3.-2.*c), .18); c*=vec3(1.025,1.,.955);
  vec2 q=(vUv-.5)*vec2(1.,.82); c*=1.-uVig*smoothstep(.12,.62,dot(q,q)*2.);
  c+=(h12(gl_FragCoord.xy+fract(uTime*7.13)*517.)-.5)*.022;
  o=vec4(c,1.); }`;

  // ---------------- texture de bruit (déterministe, raccordable) ----------------
  // R : fbm 4 octaves (8 cellules par tuile à l'octave de base) ; G : bruit de valeur 32 cellules ; B : 64 ; A : hachage
  function makeNoise(S) {
    const out = new Uint8Array(S * S * 4);
    const h = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
    const vnoise = (x, y, P, s) => { // P cellules par tuile
      const fx = x * P, fy = y * P, ix = Math.floor(fx), iy = Math.floor(fy); let ux = fx - ix, uy = fy - iy;
      ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
      const a = h(ix % P, iy % P, s), b = h((ix + 1) % P, iy % P, s), c = h(ix % P, (iy + 1) % P, s), d = h((ix + 1) % P, (iy + 1) % P, s);
      return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
    };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = i / S, y = j / S;
      let f = 0, amp = 0.5, P = 8; for (let o = 0; o < 4; o++) { f += amp * vnoise(x, y, P, o); amp *= 0.5; P *= 2; }
      const k = (j * S + i) * 4;
      out[k] = Math.round(f / 0.9375 * 255); out[k + 1] = Math.round(vnoise(x, y, 32, 7) * 255); out[k + 2] = Math.round(vnoise(x, y, 64, 9) * 255); out[k + 3] = Math.round(h(i, j, 3) * 255);
    }
    return out;
  }

  // ---------------- renderer ----------------
  function makeAtlas(belts, podium) {
    const S = 2048, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const x = cv.getContext('2d');
    x.fillStyle = '#806040'; x.fillRect(0, 0, S, S);
    const reg = (px, py, w, h) => [px / S, py / S, (px + w) / S, (py + h) / S];
    const A = {};
    // bannière centrale
    { const X = 0, Y = 0, w = 1600, h = 210;
      const gr = x.createLinearGradient(0, Y, 0, Y + h); gr.addColorStop(0, '#c4262e'); gr.addColorStop(1, '#931b22');
      x.fillStyle = gr; x.fillRect(X, Y, w, h);
      x.strokeStyle = '#e7b93c'; x.lineWidth = 10; x.strokeRect(X + 14, Y + 14, w - 28, h - 28);
      x.lineWidth = 3; x.strokeRect(X + 28, Y + 28, w - 56, h - 56);
      x.fillStyle = '#ffffff'; x.font = '900 104px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('TOURNOI DES PARTENAIRES', X + w / 2, Y + h / 2 + 4);
      A.banner = reg(X, Y, w, h); }
    { const X = 0, Y = 220, w = 1300, h = 210;
      const gr = x.createLinearGradient(0, Y, 0, Y + h); gr.addColorStop(0, '#1f3a68'); gr.addColorStop(1, '#152a4e');
      x.fillStyle = gr; x.fillRect(X, Y, w, h);
      x.strokeStyle = '#e7b93c'; x.lineWidth = 8; x.strokeRect(X + 14, Y + 14, w - 28, h - 28);
      x.fillStyle = '#ffffff'; x.font = '900 96px Inter'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('PLUS LOIN ENSEMBLE', X + w / 2, Y + h / 2 + 4);
      A.side = reg(X, Y, w, h); }
    // kakémonos
    const scroll = (X, Y, draw) => {
      const w = 300, h = 1000;
      x.fillStyle = '#2b4a78'; x.fillRect(X, Y, w, h);
      x.fillStyle = '#c9a24a'; x.fillRect(X + 18, Y + 60, w - 36, h - 120);
      const gr = x.createLinearGradient(X, Y, X + w, Y); gr.addColorStop(0, '#efe5cc'); gr.addColorStop(0.5, '#f8f1df'); gr.addColorStop(1, '#ebe0c4');
      x.fillStyle = gr; x.fillRect(X + 26, Y + 70, w - 52, h - 140);
      draw(X + w / 2, Y, w, h);
      return reg(X, Y, w, h);
    };
    const enso = (cx, cy, r) => {
      x.save(); x.strokeStyle = '#151515'; x.lineCap = 'round';
      for (let i = 0; i < 70; i++) { const a0 = -1.1 + i * 0.075, a1 = a0 + 0.09; const wdt = 22 * Math.sin(Math.PI * (i / 70) * 0.95 + 0.15) + 3;
        x.lineWidth = wdt; x.globalAlpha = 0.92; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); }
      x.restore();
    };
    const seal = (cx, cy) => { x.fillStyle = '#c62828'; x.fillRect(cx - 22, cy - 22, 44, 44); x.fillStyle = '#f8f1df'; x.font = '700 26px "IPAGothic"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('和', cx, cy + 1); };
    A.scroll = scroll(1640, 0, (cx, Y) => {
      x.fillStyle = '#141414'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.font = 'bold 64px "DejaVu Serif"'; x.fillText('Plus', cx, Y + 210); x.fillText('loin', cx, Y + 300);
      x.font = 'bold 46px "DejaVu Serif"'; x.fillText('ensemble', cx, Y + 380);
      enso(cx, Y + 610, 92); seal(cx + 70, Y + 830);
    });
    A.scroll2 = scroll(1640, 1010, (cx, Y) => {
      x.fillStyle = '#141414'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 190px "IPAGothic"'; x.fillText('礼', cx, Y + 330);
      x.font = 'bold 50px "DejaVu Serif"'; x.fillText('respect', cx, Y + 560);
      enso(cx, Y + 760, 70); seal(cx + 70, Y + 900);
    });
    A.kanji = scroll(1320, 1010, (cx, Y) => {
      x.fillStyle = '#141414'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 200px "IPAGothic"'; x.fillText('柔', cx, Y + 300); x.fillText('道', cx, Y + 530);
      x.font = 'bold 44px "DejaVu Serif"'; x.fillText('la voie', cx, Y + 720); x.fillText('de la souplesse', cx, Y + 772);
      seal(cx + 70, Y + 890);
    });
    // faces avant du podium : texture au même rapport largeur/hauteur que la face, chiffre de même hauteur monde (36 u)
    let py = 1100;
    for (const B of podium.blocks) {
      const ppu = 640 / B.w, w = 640, h = Math.round(B.h * ppu), X = 0, Y = py; py += h + 10;
      const gr = x.createLinearGradient(0, Y, 0, Y + h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d6dbe5');
      x.fillStyle = gr; x.fillRect(X, Y, w, h);
      const band = Math.round(7 * ppu);
      x.fillStyle = '#1f4fa0'; x.fillRect(X, Y + h - band, w, band);
      x.fillStyle = '#e7b93c'; x.fillRect(X, Y + h - band - Math.round(1.4 * ppu), w, Math.round(1.4 * ppu));
      const fs = Math.round(44 * ppu); x.font = `900 ${fs}px "Inter Display"`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const cy = Y + (h - band) / 2 + fs * 0.04;
      x.lineJoin = 'round'; x.lineWidth = Math.max(4, fs * 0.07); x.strokeStyle = '#7a560e'; x.strokeText(B.n, X + w / 2, cy);
      const g2 = x.createLinearGradient(0, cy - fs / 2, 0, cy + fs / 2); g2.addColorStop(0, '#fff4c0'); g2.addColorStop(0.45, '#f2c230'); g2.addColorStop(1, '#a87808');
      x.fillStyle = g2; x.fillText(B.n, X + w / 2, cy);
      A['pod' + B.n] = reg(X, Y, w, h);
    }
    void belts;
    return { cv, A };
  }

  class DojoGL {
    constructor(canvas, W, H, opts) {
      this.OW = W; this.OH = H; this.cv = canvas;
      const sc = opts.sceneScale || 0.75;
      this.W = Math.round(W * sc); this.H = Math.round(H * sc);
      const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, alpha: false, depth: false });
      if (!gl) throw new Error('WebGL2 indisponible');
      this.gl = gl;
      if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float indisponible');
      this.samples = Math.min(opts.msaa == null ? 4 : opts.msaa, gl.getParameter(gl.MAX_SAMPLES));
      this.opts = opts;
      const DEF = (opts.defines || []).map(d => '#define ' + d + '\n').join('');
      this.progScene = this.prog(VS_SCENE, FS_SCENE.replace('precision highp float;', 'precision highp float;\n' + DEF));
      this.progDust = this.prog(VS_DUST, FS_DUST);
      this.progBright = this.prog(VS_FS, FS_BRIGHT);
      this.progBlur = this.prog(VS_FS, FS_BLUR);
      this.progFinal = this.prog(VS_FS, FS_FINAL);
      this.progRays = this.prog(VS_FS, FS_RAYS);
      this.progDof = this.prog(VS_FS, FS_DOF);
      const { cv, A } = makeAtlas(opts.belts, opts.podium);
      this.atlasA = A;
      this.atlas = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.atlas);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      this.noise = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.noise);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, makeNoise(512));
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      const room = buildRoom(A, opts.belts);
      this.windows = room.W; this.lights = room.lights;
      this.meshRoom = this.upload(room.g);
      this.meshPodium = this.upload(buildPodium(A, opts.podium));
      this.meshStand = this.upload(buildStand(opts.stand[0], opts.stand[1]));
      // poussière
      const N = 1100, seeds = new Float32Array(N * 4);
      for (let i = 0; i < N * 4; i++) seeds[i] = U.hash(i * 1.37 + 0.5);
      this.dustN = N; this.dustVao = gl.createVertexArray(); gl.bindVertexArray(this.dustVao);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      this.fsVao = gl.createVertexArray();
      this.makeTargets();
    }
    prog(vs, fs) {
      const gl = this.gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(o)); return o; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
      p.loc = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i); p.loc[u.name.replace('[0]', '')] = gl.getUniformLocation(p, u.name); }
      return p;
    }
    upload(geo) {
      const gl = this.gl; const data = new Float32Array(geo.d);
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const st = 12 * 4;
      [[0, 3, 0], [1, 3, 3], [2, 3, 6], [3, 2, 9], [4, 1, 11]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, st, o * 4); });
      return { vao, n: data.length / 12 };
    }
    tex(w, h, fmt = 'RGBA16F') {
      const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl[fmt], w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    fboFor(t) { const gl = this.gl, f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; }
    makeTargets() {
      const gl = this.gl, W = this.W, H = this.H, S = this.samples;
      this.msFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
      const rb = (fmt, att) => { const r = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, r); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, S, fmt, W, H); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, att, gl.RENDERBUFFER, r); return r; };
      rb(gl.RGBA16F, gl.COLOR_ATTACHMENT0); rb(gl.RGBA16F, gl.COLOR_ATTACHMENT1); rb(gl.DEPTH_COMPONENT24, gl.DEPTH_ATTACHMENT);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('FBO MSAA incomplet');
      this.tCol = this.tex(W, H); this.tDep = this.tex(W, H);
      this.fCol = this.fboFor(this.tCol); this.fDep = this.fboFor(this.tDep);
      const w2 = Math.max(8, W >> 1), h2 = Math.max(8, H >> 1), w4 = Math.max(8, W >> 2), h4 = Math.max(8, H >> 2);
      this.tDof = this.tex(w2, h2); this.fDof = this.fboFor(this.tDof);
      this.tRay = this.tex(w4, h4); this.fRay = this.fboFor(this.tRay);
      this.tB1 = this.tex(w4, h4); this.tB2 = this.tex(w4, h4); this.fB1 = this.fboFor(this.tB1); this.fB2 = this.fboFor(this.tB2);
      this.w2 = w2; this.h2 = h2; this.w4 = w4; this.h4 = h4;
    }
    setCam(p, cb) {
      const gl = this.gl, L = p.loc;
      gl.uniform3fv(L.uCam, cb.pos); if (L.uR) gl.uniform3fv(L.uR, cb.R); if (L.uU) gl.uniform3fv(L.uU, cb.U); if (L.uFw) gl.uniform3fv(L.uFw, cb.Fw);
      if (L.uFocal) gl.uniform1f(L.uFocal, cb.f);
    }
    setShared(p, st) {
      const gl = this.gl, L = p.loc;
      const win = new Float32Array(32); this.windows.slice(0, 8).forEach((w, i) => win.set(w, i * 4));
      if (L.uWin) { gl.uniform4fv(L.uWin, win); gl.uniform1i(L.uNWin, Math.min(8, this.windows.length)); }
      if (L.uSun) gl.uniform3fv(L.uSun, st.sun);
      if (L.uWinBox) { const wb = this.windows.reduce((a, w) => [Math.min(a[0], w[0]), Math.min(a[1], w[1]), Math.max(a[2], w[2]), Math.max(a[3], w[3])], [1e9, 1e9, -1e9, -1e9]); gl.uniform4fv(L.uWinBox, wb); }
      const ch = new Float32Array(48); st.chars.slice(0, 12).forEach((c, i) => ch.set(c, i * 4));
      if (L.uChars) { gl.uniform4fv(L.uChars, ch); gl.uniform1i(L.uNChars, Math.min(12, st.chars.length)); }
    }
    // st : { cam (base), t, chars:[[x,z,footY,h]], focus, ap, podium, stand, sun, sunCol, rays, expo, lampK, ambK }
    render(st) {
      const gl = this.gl, cb = st.cam, sub = Math.max(0.3, Math.min(1, st.res || 1));
      const W = Math.round(this.W * sub), H = Math.round(this.H * sub), SUB = W / this.W;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo); gl.viewport(0, 0, this.W, this.H);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.clearBufferfv(gl.COLOR, 0, [0.05, 0.04, 0.03, 1]); gl.clearBufferfv(gl.COLOR, 1, [9000, 0, 0, 1]); gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0);
      gl.viewport(0, 0, W, H);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      let p = this.progScene; gl.useProgram(p); const L = p.loc;
      this.setCam(p, cb); this.setShared(p, st);
      gl.uniform1f(L.uTime, st.t); gl.uniform3fv(L.uSunCol, st.sunCol);
      gl.uniform1f(L.uLampK, st.lampK); gl.uniform1f(L.uAmbK, st.ambK);
      // lanternes : les 6 plus proches de la cible de la caméra (les autres sont trop loin pour compter)
      const tg = cb.tgt;
      const near = this.lights.map(l => [l, (l[0] - tg[0]) ** 2 + (l[2] - tg[2]) ** 2 * 0.5]).sort((a, b) => a[1] - b[1]).slice(0, 5).map(x => x[0]);
      const lt = new Float32Array(64); near.forEach((l, i) => lt.set(l, i * 4));
      gl.uniform4fv(L.uLights, lt); gl.uniform1i(L.uNLights, near.length);
      gl.uniform4fv(L.uTatami, [ROOM.CX - 1080, 140, 18, 0]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.uniform1i(L.uAtlas, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.noise); gl.uniform1i(L.uNoise, 1); gl.activeTexture(gl.TEXTURE0);
      gl.bindVertexArray(this.meshRoom.vao); gl.drawArrays(gl.TRIANGLES, 0, this.meshRoom.n);
      if (st.podium) { gl.bindVertexArray(this.meshPodium.vao); gl.drawArrays(gl.TRIANGLES, 0, this.meshPodium.n); }
      if (st.stand) { gl.bindVertexArray(this.meshStand.vao); gl.drawArrays(gl.TRIANGLES, 0, this.meshStand.n); }
      // poussière (additive, pas d'écriture de profondeur)
      p = this.progDust; gl.useProgram(p); this.setCam(p, cb); this.setShared(p, st);
      gl.uniform1f(p.loc.uTime, st.t); gl.uniform1f(p.loc.uPx, W / 1920);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      gl.bindVertexArray(this.dustVao); gl.drawArrays(gl.POINTS, 0, this.dustN);
      gl.disable(gl.BLEND); gl.depthMask(true); gl.disable(gl.DEPTH_TEST);
      // résolution MSAA
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFbo);
      gl.readBuffer(gl.COLOR_ATTACHMENT0); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fCol); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.readBuffer(gl.COLOR_ATTACHMENT1); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fDep); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      const PR = () => { if (st.prof) { const px = new Float32Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, px); st.prof.push(performance.now()); } };
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fCol); PR();
      gl.bindVertexArray(this.fsVao);
      const tex = (unit, t, loc) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); };
      // rayons volumétriques (1/4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fRay); gl.viewport(0, 0, this.w4, this.h4);
      p = this.progRays; gl.useProgram(p); this.setCam(p, cb); this.setShared(p, st); gl.uniform1f(p.loc.uTime, st.t); gl.uniform1f(p.loc.uSub, SUB);
      tex(0, this.tDep, p.loc.uDep); gl.drawArrays(gl.TRIANGLES, 0, 3);
      p = this.progBlur; gl.useProgram(p); gl.uniform1i(p.loc.uTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fB2); gl.bindTexture(gl.TEXTURE_2D, this.tRay); gl.uniform2f(p.loc.uDir, 1, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fRay); gl.bindTexture(gl.TEXTURE_2D, this.tB2); gl.uniform2f(p.loc.uDir, 0, 1); gl.drawArrays(gl.TRIANGLES, 0, 3); PR();
      // profondeur de champ (1/2)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fDof); gl.viewport(0, 0, this.w2, this.h2);
      p = this.progDof; gl.useProgram(p);
      tex(0, this.tCol, p.loc.uCol); tex(1, this.tDep, p.loc.uDep);
      gl.uniform1f(p.loc.uFocus, st.focus); gl.uniform1f(p.loc.uAp, st.ap); gl.uniform1f(p.loc.uFocal, cb.f); gl.uniform1f(p.loc.uPx, W / 1920); gl.uniform1f(p.loc.uMaxCoc, 12); gl.uniform1f(p.loc.uSub, SUB);
      gl.drawArrays(gl.TRIANGLES, 0, 3); PR();
      // bloom (1/4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fB1); gl.viewport(0, 0, this.w4, this.h4);
      p = this.progBright; gl.useProgram(p); tex(0, this.tCol, p.loc.uTex); gl.uniform1f(p.loc.uSub, SUB); gl.drawArrays(gl.TRIANGLES, 0, 3);
      p = this.progBlur; gl.useProgram(p); gl.uniform1i(p.loc.uTex, 0);
      for (let k = 0; k < 2; k++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fB2); gl.bindTexture(gl.TEXTURE_2D, this.tB1); gl.uniform2f(p.loc.uDir, 1 + k, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fB1); gl.bindTexture(gl.TEXTURE_2D, this.tB2); gl.uniform2f(p.loc.uDir, 0, 1 + k); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      PR();
      // composition finale à la résolution de sortie
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.OW, this.OH);
      p = this.progFinal; gl.useProgram(p); const F = p.loc;
      tex(0, this.tCol, F.uCol); tex(1, this.tDof, F.uDofT); tex(2, this.tRay, F.uRaysT); tex(3, this.tB1, F.uBloom);
      gl.uniform1f(F.uTime, st.t); gl.uniform1f(F.uExpo, st.expo); gl.uniform1f(F.uBloomK, 0.30); gl.uniform1f(F.uVig, 0.55);
      gl.uniform1f(F.uRays, st.rays); gl.uniform3fv(F.uSunCol, st.sunCol); gl.uniform1f(F.uSub, SUB);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    }
    finish() { const px = new Uint8Array(4); this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, px); return px[0]; }
  }

  window.Dojo = { DojoGL, ROOM, bayKind };
})();
