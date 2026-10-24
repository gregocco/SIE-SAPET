// Corps : judogi (veste croisée, revers piqués, plis, jupe), pantalon, pieds nus, ceinture à double tour
// avec nœud et pans, écusson du logo, bras en cinématique inverse 3D (épaule-coude-poignet) avec manches
// amples, mains à doigts, médaille. Repère local : pieds à l'origine, y vers le bas, ~210 unités de haut.
'use strict';
(function () {
  const { F, clamp, lerp, D2R, shade, mixc, lum, V } = window.U;
  const { smooth, softEll, P2 } = window.HeadKit;
  const GI = '#f7f5f2', GI_D = '#cfc7c2', GI_DD = '#aca39e', GI_LINE = '#b5aca7';
  const BOW_MAX = 52;

  function beltEdge(c) { return lum(c) > 0.85 ? '#a7aebd' : lum(c) < 0.12 ? '#000000' : shade(c, -0.38); }
  function beltDefs(colors) {
    let d = '';
    for (const c of colors) {
      const id = 'blt_' + c.replace('#', '');
      const top = lum(c) < 0.12 ? '#4a4a4a' : shade(c, 0.28), bot = lum(c) > 0.85 ? '#d4d8e0' : shade(c, -0.25);
      d += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.35" stop-color="${c}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`;
    }
    return d;
  }
  const beltFill = c => `url(#blt_${c.replace('#', '')})`;

  function globalDefs() {
    return `<linearGradient id="gi_t" x1="0" y1="0" x2="1" y2="0.15"><stop offset="0" stop-color="#ffffff"/><stop offset="0.42" stop-color="${GI}"/><stop offset="0.8" stop-color="#e6e0db"/><stop offset="1" stop-color="${GI_D}"/></linearGradient>` +
      `<linearGradient id="gi_s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="${GI}"/><stop offset="1" stop-color="${GI_D}"/></linearGradient>` +
      `<linearGradient id="gi_l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#faf8f5"/><stop offset="0.55" stop-color="#ebe6e1"/><stop offset="1" stop-color="${GI_D}"/></linearGradient>` +
      `<linearGradient id="gi_v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a2a22" stop-opacity="0.16"/></linearGradient>` +
      `<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe2b0" stop-opacity="0.8"/><stop offset="0.12" stop-color="#ffe2b0" stop-opacity="0"/><stop offset="0.86" stop-color="#ffe2b0" stop-opacity="0"/><stop offset="1" stop-color="#fff0d0" stop-opacity="0.95"/></linearGradient>` +
      `<radialGradient id="gsoft"><stop offset="0" stop-color="#3a2a22" stop-opacity="0.5"/><stop offset="1" stop-color="#3a2a22" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="ghl"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="medalG" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#fff6c4"/><stop offset="0.35" stop-color="#f6cf43"/><stop offset="0.8" stop-color="#c8920f"/><stop offset="1" stop-color="#8a5f06"/></radialGradient>` +
      `<linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#e74c3c"/><stop offset="0.2" stop-color="#f39c12"/><stop offset="0.4" stop-color="#f4d03f"/><stop offset="0.6" stop-color="#27ae60"/><stop offset="0.8" stop-color="#2e86de"/><stop offset="1" stop-color="#8e44ad"/></linearGradient>` +
      `<filter id="soft1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.9"/></filter>`;
  }

  // ---------- mains ----------
  // repère canonique : poignet à l'origine, doigts vers +y, pouce côté +x (paume face caméra).
  function finger(x0, y0, ang, len, w, skin, dark, nail) {
    const a = ang * D2R; const x1 = x0 + Math.sin(a) * len * 0.52, y1 = y0 + Math.cos(a) * len * 0.52;
    const x2 = x0 + Math.sin(a + 0.08) * len, y2 = y0 + Math.cos(a + 0.08) * len;
    const d = `M${F(x0)},${F(y0)}Q${F(x1)},${F(y1)} ${F(x2)},${F(y2)}`;
    let s = `<path d="${d}" stroke="${dark}" stroke-width="${F(w + 0.45)}" stroke-linecap="round" fill="none"/>` +
      `<path d="${d}" stroke="${skin}" stroke-width="${F(w)}" stroke-linecap="round" fill="none"/>` +
      `<path d="M${F(x0 - 0.35)},${F(y0 + 0.5)}Q${F(x1 - 0.35)},${F(y1)} ${F(x2 - 0.3)},${F(y2 - 0.5)}" stroke="#ffffff" stroke-width="${F(w * 0.22)}" stroke-linecap="round" fill="none" opacity="0.18"/>`;
    const jx = x0 + Math.sin(a) * len * 0.5, jy = y0 + Math.cos(a) * len * 0.5;
    s += `<path d="M${F(jx - w * 0.35)},${F(jy)}l${F(w * 0.7)},0" stroke="${dark}" stroke-width="0.16" opacity="0.6"/>`;
    if (nail) s += `<ellipse cx="${F(x2 - Math.sin(a) * 0.9)}" cy="${F(y2 - Math.cos(a) * 0.9)}" rx="${F(w * 0.32)}" ry="${F(w * 0.42)}" fill="#ffffff" opacity="0.33" transform="rotate(${F(-ang)} ${F(x2)} ${F(y2)})"/>`;
    return s;
  }
  function hand(pose, L, k = 1) {
    const sk = L.skin, dk = L.skinD, pal = mixc(L.skin, '#f2b8a6', 0.25);
    let s = '';
    const palm = (fill) => `<path d="M-3.4,0C-4.6,3 -4.8,6.5 -4.4,9.8L4.3,10.0C4.9,6.4 4.6,2.6 3.4,0Z" fill="${fill}" stroke="${dk}" stroke-width="0.35"/>`;
    switch (pose) {
      case 'open': {
        s += finger(-3.1, 9.2, -9, 7.6, 2.05, sk, dk, false) + finger(-1.0, 9.8, -3, 9.4, 2.25, sk, dk, false) + finger(1.2, 9.9, 2, 10.1, 2.3, sk, dk, false) + finger(3.3, 9.6, 8, 9.2, 2.2, sk, dk, false);
        s += palm(pal);
        s += `<path d="M-3.2,6.6Q0,5.4 3.9,7.4M-2.8,4.4Q0.5,4.2 3.6,2.4" stroke="${dk}" stroke-width="0.22" fill="none" opacity="0.55"/>`;
        s += finger(3.4, 2.4, 48, 7.2, 2.5, sk, dk, false);
        break;
      }
      case 'flat': {
        s += finger(-3.3, 9.6, -6, 9.2, 2.2, sk, dk, true) + finger(-1.1, 9.9, -2, 10.1, 2.3, sk, dk, true) + finger(1.1, 9.8, 3, 9.4, 2.25, sk, dk, true) + finger(3.1, 9.2, 8, 7.6, 2.0, sk, dk, true);
        s += palm(`url(#skl_${L.__id})`);
        s += `<path d="M-2.8,9.4l0.8,-0.4M-0.8,9.8l0.8,-0.4M1.3,9.7l0.8,-0.4" stroke="${dk}" stroke-width="0.3" opacity="0.6"/>`;
        s += `<path d="M-1.5,2.5L-1.8,8.5M1.2,2.5L1.0,8.5" stroke="${dk}" stroke-width="0.2" opacity="0.35"/>`;
        s += finger(-3.5, 2.6, -40, 6.6, 2.4, sk, dk, true);
        break;
      }
      case 'fist': case 'grip': {
        s += `<path d="M-3.6,0C-5.0,3 -5.2,7 -4.6,10.4Q-4.4,12.6 -2.2,12.8L3.4,12.6Q5.2,12.3 5.0,9.6C5.2,6.2 4.8,2.6 3.6,0Z" fill="${sk}" stroke="${dk}" stroke-width="0.4"/>`;
        for (let i = 0; i < 4; i++) { const x = -3.6 + i * 2.25; s += `<path d="M${F(x)},${F(9.6)}Q${F(x + 1.1)},${F(13.2)} ${F(x + 2.25)},${F(9.8)}" stroke="${dk}" stroke-width="0.32" fill="none" opacity="0.75"/>`; }
        s += softEll([-1, 6], 3.2, 3.6, 'url(#ghl)', 0.12);
        s += `<path d="M4.2,3.2Q5.6,7.8 2.2,9.2" stroke="${dk}" stroke-width="2.9" stroke-linecap="round" fill="none"/><path d="M4.2,3.2Q5.6,7.8 2.2,9.2" stroke="${sk}" stroke-width="2.45" stroke-linecap="round" fill="none"/>`;
        break;
      }
      case 'point': { // vue de profil (côté pouce) : poing lâche, index tendu dans l'axe, pouce posé dessus
        s += `<path d="M-2.8,0C-3.8,3.5 -4.2,7.5 -3.4,10.6Q-2.6,13.2 -0.4,13.0Q1.6,12.6 2.4,10.4C3.2,7 3.2,3.5 2.8,0Z" fill="${sk}" stroke="${dk}" stroke-width="0.4"/>`;
        s += `<path d="M-3.2,9.2Q-1.8,10.4 -3.0,12.2M-2.6,11.6Q-1.2,12.8 -2.0,13.4" stroke="${dk}" stroke-width="0.28" fill="none" opacity="0.6"/>`;
        s += finger(1.2, 10.2, 2, 10.6, 2.3, sk, dk, true);
        s += `<path d="M2.6,3.0Q3.6,6.4 2.6,9.6" stroke="${dk}" stroke-width="2.7" stroke-linecap="round" fill="none"/><path d="M2.6,3.0Q3.6,6.4 2.6,9.6" stroke="${sk}" stroke-width="2.25" stroke-linecap="round" fill="none"/>`;
        break;
      }
      case 'pinch': { // vue de profil : pouce et index se touchent en anneau, autres doigts repliés
        s += `<path d="M-2.8,0C-3.8,3.5 -4.2,7.5 -3.4,10.6Q-2.6,13.2 -0.4,13.0Q1.6,12.6 2.4,10.4C3.2,7 3.2,3.5 2.8,0Z" fill="${sk}" stroke="${dk}" stroke-width="0.4"/>`;
        s += `<path d="M-3.2,9.2Q-1.8,10.4 -3.0,12.2M-2.6,11.6Q-1.2,12.8 -2.0,13.4" stroke="${dk}" stroke-width="0.28" fill="none" opacity="0.6"/>`;
        s += `<path d="M0.8,10.8Q1.4,16.4 4.6,15.6" stroke="${dk}" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M0.8,10.8Q1.4,16.4 4.6,15.6" stroke="${sk}" stroke-width="2.15" stroke-linecap="round" fill="none"/>`;
        s += `<path d="M2.6,3.2Q6.4,8.6 4.9,14.8" stroke="${dk}" stroke-width="2.7" stroke-linecap="round" fill="none"/><path d="M2.6,3.2Q6.4,8.6 4.9,14.8" stroke="${sk}" stroke-width="2.25" stroke-linecap="round" fill="none"/>`;
        s += `<circle cx="3.4" cy="13.2" r="0.9" fill="${shade(L.skinD, -0.2)}" opacity="0.5"/>`;
        break;
      }
      case 'thumb': {
        s += `<path d="M-3.6,0C-5.0,3 -5.2,7 -4.6,10.4Q-4.4,12.6 -2.2,12.8L3.4,12.6Q5.2,12.3 5.0,9.6C5.2,6.2 4.8,2.6 3.6,0Z" fill="${sk}" stroke="${dk}" stroke-width="0.4"/>`;
        for (let i = 0; i < 4; i++) { const x = -3.6 + i * 2.25; s += `<path d="M${F(x)},${F(9.6)}Q${F(x + 1.1)},${F(13.2)} ${F(x + 2.25)},${F(9.8)}" stroke="${dk}" stroke-width="0.32" fill="none" opacity="0.75"/>`; }
        s += finger(3.0, 3.2, 172, 8.6, 3.0, sk, dk, true);
        break;
      }
      default: { // relax : main pendante vue de profil (côté pouce)
        s += `<path d="M-2.6,0C-3.6,4 -3.8,9 -3.0,13.5Q-2.4,17.6 -0.4,18.6Q1.4,19 1.8,16.8C2.8,12.6 3.2,6 2.8,0Z" fill="${sk}" stroke="${dk}" stroke-width="0.4"/>`;
        s += `<path d="M-2.4,10.5Q-1.2,12 -2.6,14.2M-2.2,13.6Q-0.8,15.4 -2.0,17.0" stroke="${dk}" stroke-width="0.28" fill="none" opacity="0.6"/>`;
        s += softEll([0, 7], 2.0, 5, 'url(#ghl)', 0.12);
        s += finger(1.8, 3.0, -8, 8.4, 2.6, sk, dk, true);
      }
    }
    return `<g transform="scale(${F(k)})">${s}</g>`;
  }

  // ---------- cinématique inverse 3D (épaule -> coude -> poignet) ----------
  function ik(S, W, L1, L2, pole) {
    let d = V.sub(W, S); let dist = V.len(d);
    const dmax = L1 + L2 - 0.05, dmin = Math.abs(L1 - L2) + 0.5;
    if (dist > dmax) { W = V.add(S, V.mul(d, dmax / dist)); d = V.sub(W, S); dist = dmax; }
    if (dist < dmin) { W = V.add(S, V.mul(V.norm(d), dmin)); d = V.sub(W, S); dist = dmin; }
    const dir = V.mul(d, 1 / dist);
    const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist); const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    let pp = V.sub(pole, V.mul(dir, V.dot(pole, dir))); pp = V.norm(pp);
    const E = V.add(V.add(S, V.mul(dir, a)), V.mul(pp, h));
    return { S, E, W };
  }

  // contour d'une manche (2D) : épaule -> coude -> manchette
  function sleeve(S, E, C, wS, wE, wC) {
    const n = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const n1 = n(S, E), n2 = n(E, C); let ne = [n1[0] + n2[0], n1[1] + n2[1]]; const l = Math.hypot(ne[0], ne[1]) || 1; ne = [ne[0] / l, ne[1] / l];
    const off = (p, nn, w, sg) => [p[0] + nn[0] * w * sg, p[1] + nn[1] * w * sg];
    const A = [off(S, n1, wS, 1), off(E, ne, wE, 1), off(C, n2, wC, 1)], B = [off(C, n2, wC, -1), off(E, ne, wE, -1), off(S, n1, wS, -1)];
    const u = [n1[1], -n1[0]]; // de S vers E
    const k = wS * 0.95, b0 = B[2], a0 = A[0];
    const cap = `C${F(b0[0] - u[0] * k)},${F(b0[1] - u[1] * k)} ${F(a0[0] - u[0] * k)},${F(a0[1] - u[1] * k)} ${P2(a0)}`;
    return { d: smooth(A, false, 0.9) + 'L' + smooth(B, false, 0.9).slice(1) + cap + 'Z', A, B, n2 };
  }

  // ---------- ceinture portée ----------
  function beltWorn(c, T, wb, sway, glow, rainbow, t) {
    const e = beltEdge(c);
    let s = '';
    const top = [T(-wb - 0.6, -118.4), T(0, -117.3), T(wb + 0.6, -118.4)], bot = [T(wb + 0.6, -111.0), T(0, -109.8), T(-wb - 0.6, -111.0)];
    const band = `M${P2(top[0])}Q${P2(top[1])} ${P2(top[2])}L${P2(bot[0])}Q${P2(bot[1])} ${P2(bot[2])}Z`;
    s += `<path d="M${P2([bot[2][0], bot[2][1] + 0.6])}Q${P2([bot[1][0], bot[1][1] + 0.8])} ${P2([bot[0][0], bot[0][1] + 0.6])}" stroke="#202840" stroke-width="1.4" opacity="0.18" fill="none"${window.__LITE ? '' : ' filter="url(#soft1)"'}/>`;
    s += `<path d="${band}" fill="${beltFill(c)}" stroke="${e}" stroke-width="0.35"/>`;
    // séparation des deux tours + piqûres
    const mid = [T(-wb - 0.6, -114.6), T(0, -113.4), T(wb + 0.6, -114.6)];
    s += `<path d="M${P2(mid[0])}Q${P2(mid[1])} ${P2(mid[2])}" stroke="${e}" stroke-width="0.32" fill="none" opacity="0.8"/>`;
    if (!window.__LITE) for (const yy of [-117.3, -116.2, -113.6, -112.4]) { const a = T(-wb, yy), b = T(0, yy + 1.1), cc = T(wb, yy); s += `<path d="M${P2(a)}Q${P2(b)} ${P2(cc)}" stroke="${e}" stroke-width="0.12" fill="none" opacity="0.45"/>`; }
    if (rainbow > 0) s += `<path d="${band}" fill="url(#rainbow)" opacity="${F(rainbow * 0.75)}" style="mix-blend-mode:screen"/>`;
    // pans (sous le nœud)
    const tail = (x0, ang, len, w) => {
      const p0 = T(x0, -112.2);
      const a = ang * D2R; const p1 = [p0[0] + Math.sin(a) * len * 0.5 + sway * 0.4, p0[1] + Math.cos(a) * len * 0.5];
      const p2 = [p0[0] + Math.sin(a) * len + sway, p0[1] + Math.cos(a) * len];
      const nn = [Math.cos(a), -Math.sin(a)];
      const q = (p, k) => [p[0] + nn[0] * w / 2 * k, p[1] + nn[1] * w / 2 * k];
      const d = `M${P2(q(p0, -1))}Q${P2(q(p1, -1))} ${P2(q(p2, -1))}L${P2(q([p2[0] + 0.3, p2[1] + 0.2], 1))}Q${P2(q(p1, 1))} ${P2(q(p0, 1))}Z`;
      let r = `<path d="${d}" fill="${beltFill(c)}" stroke="${e}" stroke-width="0.35"/>`;
      r += `<path d="M${P2(p0)}Q${P2(p1)} ${P2(p2)}" stroke="${e}" stroke-width="0.14" fill="none" opacity="0.5"/>`;
      if (rainbow > 0) r += `<path d="${d}" fill="url(#rainbow)" opacity="${F(rainbow * 0.7)}"/>`;
      return r;
    };
    s += tail(-1.6, 22 + sway * 1.5, 21, 5.2) + tail(2.6, -18 + sway * 1.2, 19.5, 5.2);
    // nœud
    const k0 = T(0.6, -114.5);
    const knot = `M${F(k0[0] - 3.4)},${F(k0[1] - 3.9)}L${F(k0[0] + 3.2)},${F(k0[1] - 4.2)}Q${F(k0[0] + 4.3)},${F(k0[1])} ${F(k0[0] + 3.4)},${F(k0[1] + 3.9)}L${F(k0[0] - 3.2)},${F(k0[1] + 4.1)}Q${F(k0[0] - 4.4)},${F(k0[1])} ${F(k0[0] - 3.4)},${F(k0[1] - 3.9)}Z`;
    s += `<path d="${knot}" fill="${beltFill(c)}" stroke="${e}" stroke-width="0.4"/>`;
    s += `<path d="M${F(k0[0] - 3.2)},${F(k0[1] - 3.4)}L${F(k0[0] + 3.1)},${F(k0[1] + 3.6)}" stroke="${e}" stroke-width="0.35" opacity="0.8"/>`;
    s += `<path d="M${F(k0[0] - 2.6)},${F(k0[1] - 3.6)}L${F(k0[0] + 2.8)},${F(k0[1] + 2.4)}" stroke="#ffffff" stroke-width="0.5" opacity="0.22"/>`;
    if (rainbow > 0) s += `<path d="${knot}" fill="url(#rainbow)" opacity="${F(rainbow * 0.7)}"/>`;
    if (glow > 0) s += `<ellipse cx="${F(k0[0])}" cy="${F(k0[1])}" rx="${F(wb + 6)}" ry="9" fill="url(#ghl)" opacity="${F(glow * 0.75)}"/>`;
    return s;
  }

  // ruban de ceinture (tenu, en vol, sur le support) : polyligne 2D + largeur, torsion (face / revers)
  function ribbon(pts, w, c, twist) {
    const e = beltEdge(c); let s = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l, ny = dx / l;
      const tw = twist ? twist(i / (pts.length - 1)) : 1; const tw2 = twist ? twist((i + 1) / (pts.length - 1)) : 1;
      const wa = w / 2 * Math.max(0.18, Math.abs(tw)), wb = w / 2 * Math.max(0.18, Math.abs(tw2));
      const col = tw < 0 ? shade(c, lum(c) < 0.12 ? 0.12 : -0.22) : c;
      s += `<path d="M${F(a[0] + nx * wa)},${F(a[1] + ny * wa)}L${F(b[0] + nx * wb)},${F(b[1] + ny * wb)}L${F(b[0] - nx * wb)},${F(b[1] - ny * wb)}L${F(a[0] - nx * wa)},${F(a[1] - ny * wa)}Z" fill="${col}" stroke="${col}" stroke-width="0.25"/>`;
    }
    const d = 'M' + pts.map(P2).join('L');
    s = `<path d="${d}" stroke="${e}" stroke-width="${F(w + 0.7)}" fill="none" stroke-linejoin="round" stroke-linecap="butt" opacity="0.9"/>` + s;
    s += `<path d="${d}" stroke="${e}" stroke-width="0.15" fill="none" opacity="0.5"/>`;
    return s;
  }

  // ---------- assemblage ----------
  // view : { zc (profondeur caméra, unités monde), camH (hauteur caméra au-dessus des pieds, unités monde), k (échelle perso) }
  function drawAvatar(m, L, p, view, t) {
    const id = m.id; L.__id = id;
    const sw = L.sw, belly = L.belly || 0, fem = L.female;
    const k = view.k;
    const bowA = clamp(p.bow || 0) * BOW_MAX * D2R;
    const T = (x, y) => {
      if (y >= -100 || bowA === 0) return [x, y];
      const h = -100 - y; const d = h * Math.sin(bowA) * k;
      const mm = view.zc / Math.max(40, view.zc - d);
      const yr = -100 - h * Math.cos(bowA);
      return [x * mm, yr * mm + (view.camH / k) * (mm - 1) * 1.0 + (-100) * (1 - mm) * 0];
    };
    const Tb = (x, y) => { const b = T(x, y); const br = (p.breath || 0) * 0.35; return [b[0] * (1 + (y < -120 ? br * 0.01 : 0)), b[1]]; };
    let s = '';
    const out = { };

    // ----- tête (préparée d'abord : la masse de cheveux arrière passe derrière le corps) -----
    const pitchBow = clamp(p.bow || 0) * 40;
    const headPose = { yaw: (p.head && p.head.yaw) || 0, pitch: ((p.head && p.head.pitch) || 0) + pitchBow, roll: (p.head && p.head.roll) || 0 };
    const Hd = window.HeadDraw.drawHead(m, L, { head: headPose }, p.face || {}, t);
    const nt = T(0, -175);
    const mh = (() => { if (!bowA) return 1; const h = 75; const d = h * Math.sin(bowA) * k; return view.zc / Math.max(40, view.zc - d); })();
    const headT = `translate(${F(nt[0])},${F(nt[1])}) scale(${F(mh)}) translate(0,-15)`;
    if (Hd.back) s += `<g transform="${headT}">${Hd.back}</g>`;

    // ----- jambes et pieds -----
    const legs = p.legs || {};
    const crouch = p.crouch || 0;
    for (const sd of [-1, 1]) {
      const lg = legs[sd < 0 ? 'L' : 'R'] || {};
      const lift = lg.lift || 0, kx = (lg.kneeOut || 0) + crouch * 7;
      const hip = [sd * 10.5, -97], ank = [sd * 11.5 + (lg.x || 0), -8 - lift], knee = [sd * (11.8 + kx) + (lg.x || 0) * 0.5, -52 - lift * 0.55 + crouch * 6];
      const sl = sleeve(hip, knee, [ank[0], ank[1] - 1.5], 9.6, 8.6, 8.0);
      s += `<path d="${sl.d}" fill="url(#gi_l)" stroke="${GI_LINE}" stroke-width="0.45"/>`;
      // plis du genou et de la cheville
      s += `<path d="M${F(knee[0] - 5)},${F(knee[1] - 2)}Q${F(knee[0])},${F(knee[1] + 1.5)} ${F(knee[0] + 5)},${F(knee[1] - 1.5)}M${F(knee[0] - 4)},${F(knee[1] + 3)}Q${F(knee[0] + 0.5)},${F(knee[1] + 5)} ${F(knee[0] + 4.5)},${F(knee[1] + 2.5)}" stroke="${GI_D}" stroke-width="0.55" fill="none" opacity="0.8"/>`;
      s += `<path d="M${F(ank[0] - 7)},${F(ank[1] - 6)}Q${F(ank[0])},${F(ank[1] - 3)} ${F(ank[0] + 7)},${F(ank[1] - 6)}" stroke="${GI_D}" stroke-width="0.5" fill="none" opacity="0.7"/>`;
      s += `<path d="M${F(hip[0] + sd * 4)},${F(hip[1] + 6)}L${F(knee[0] + sd * 3)},${F(knee[1] - 6)}" stroke="${GI_D}" stroke-width="0.45" opacity="0.5"/>`;
      // pied nu vu de face
      const fx = ank[0] + sd * 1.2, fy = ank[1] + 8;
      const foot = `M${F(fx - 3.6)},${F(fy - 9.5)}C${F(fx - 4.4)},${F(fy - 5)} ${F(fx - 5.8 + sd * 0.8)},${F(fy - 2)} ${F(fx - 5.4 + sd * 0.6)},${F(fy - 0.6)}Q${F(fx)},${F(fy + 0.9)} ${F(fx + 5.4 + sd * 0.6)},${F(fy - 0.6)}C${F(fx + 5.8 + sd * 0.8)},${F(fy - 2)} ${F(fx + 4.4)},${F(fy - 5)} ${F(fx + 3.6)},${F(fy - 9.5)}Z`;
      s += `<path d="${foot}" fill="url(#skl_${id})" stroke="${L.skinD}" stroke-width="0.4"/>`;
      for (let q = 0; q < 5; q++) { const tx = fx + sd * 0.6 + (q - 2) * 2.0; s += `<ellipse cx="${F(tx)}" cy="${F(fy - 1.0)}" rx="${F(q === 2 - sd * 2 ? 1.2 : 0.95)}" ry="0.85" fill="${L.skin}" stroke="${L.skinD}" stroke-width="0.25"/>`; }
      s += `<path d="M${F(fx - 7.6)},${F(ank[1] - 1.6)}Q${F(fx)},${F(ank[1] + 0.8)} ${F(fx + 7.6)},${F(ank[1] - 1.6)}" stroke="${GI_LINE}" stroke-width="0.6" fill="${GI}"/>`;
    }

    // ----- veste -----
    const wsh = fem ? 2.2 : 0;
    const half = sd => [[sd * 6.8, -164.5], [sd * (sw * 0.55), -162.2], [sd * (sw + 0.6), -158.4], [sd * (sw + 3.2), -151.5], [sd * (sw + 2.6), -140], [sd * (sw + 1.8 + belly * 0.4 - wsh * 0.5), -128], [sd * (sw + 1.0 + belly * 0.7 - wsh), -119], [sd * (sw + 0.2 + belly * 0.5 - wsh), -112], [sd * (sw + 1.6), -96], [sd * (sw + 2.6), -80.5]];
    const right = half(1).map(q => Tb(q[0], q[1])), left = half(-1).map(q => Tb(q[0], q[1]));
    const hem = [[sw * 0.5, -79.4], [0, -79.0], [-sw * 0.5, -79.4]];
    const torsoPts = left.slice().reverse().concat(right, hem);
    const torsoD = smooth(torsoPts, true, 0.75);
    s += `<path d="${torsoD}" fill="url(#gi_t)" stroke="${GI_LINE}" stroke-width="0.5"/>`;
    s += `<path d="${torsoD}" fill="url(#gi_v)"/>`;
    s += `<path d="${torsoD}" fill="none" stroke="url(#rim)" stroke-width="0.9" opacity="0.7"/>`;
    // ouverture en V (peau ou tee-shirt), col arrière
    const nB = [Tb(-6.8, -165), Tb(0.2, -147.2), Tb(6.8, -165), Tb(0, -161)];
    const vFill = fem ? L.tee : `url(#skl_${id})`;
    s += `<path d="M${P2(nB[0])}L${P2(nB[1])}L${P2(nB[2])}Q${P2(nB[3])} ${P2(nB[0])}Z" fill="${vFill}"/>`;
    if (!fem) s += `<path d="M${P2(Tb(-2.5, -156))}Q${P2(Tb(0, -152))} ${P2(Tb(2.5, -156))}" stroke="${L.skinD}" stroke-width="0.35" fill="none" opacity="0.4"/>`;
    else s += `<path d="M${P2(Tb(-5.6, -163))}Q${P2(Tb(0, -157.5))} ${P2(Tb(5.6, -163))}" stroke="${shade(L.tee, -0.25)}" stroke-width="0.5" fill="none" opacity="0.7"/>`;
    s += softEll(Tb(0, -160), 7, 3.2, 'url(#gsoft)', 0.6);
    if (L.pearls) for (let q = -5; q <= 5; q++) { const pp = Tb(q * 1.15, -160.6 + Math.abs(q) * -0.38 + q * q * 0.04); s += `<circle cx="${F(pp[0])}" cy="${F(pp[1])}" r="0.62" fill="#fbf5e8" stroke="#c9bba0" stroke-width="0.15"/><circle cx="${F(pp[0] - 0.2)}" cy="${F(pp[1] - 0.2)}" r="0.2" fill="#fff"/>`; }
    // revers (col épais, piqûres)
    const lapel = (a, b, nsg, len) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); const n = [-dy / l * nsg, dx / l * nsg];
      const W = 5.0; const bb = [a[0] + dx * len, a[1] + dy * len];
      const q = [Tb(a[0], a[1]), Tb(bb[0], bb[1]), Tb(bb[0] + n[0] * W, bb[1] + n[1] * W), Tb(a[0] + n[0] * W, a[1] + n[1] * W)];
      let r = `<path d="M${P2(q[3])}L${P2(q[2])}" stroke="#3a2a22" stroke-width="1.2" opacity="0.16"${window.__LITE ? '' : ' filter="url(#soft1)"'} transform="translate(${F(n[0] * 0.8)},${F(n[1] * 0.8)})"/>`;
      r += `<path d="M${q.map(P2).join('L')}Z" fill="#f0ece8" stroke="${GI_LINE}" stroke-width="0.4"/>`;
      if (!window.__LITE) for (const o of [1.0, 2.0, 3.0, 4.0]) { const a1 = Tb(a[0] + n[0] * o, a[1] + n[1] * o), b1 = Tb(bb[0] + n[0] * o, bb[1] + n[1] * o); r += `<path d="M${P2(a1)}L${P2(b1)}" stroke="#c8bfb8" stroke-width="0.14" opacity="0.9"/>`; }
      r += `<path d="M${P2(q[0])}L${P2(q[1])}" stroke="#ffffff" stroke-width="0.45" opacity="0.8"/>`;
      return r;
    };
    s += lapel([-6.8, -165.5], [14, -112], -1, 0.42);
    s += lapel([6.8, -165.5], [-13, -112], -1, 1.0);
    // bord du pan supérieur sous la ceinture + fente latérale
    s += `<path d="M${P2(Tb(-13.2, -111))}L${P2([-15.6, -80])}" stroke="${GI_DD}" stroke-width="0.55" opacity="0.8"/>`;
    s += `<path d="M${F(-14.6)},-110L${F(-16.6)},-80.5" stroke="#3a2a22" stroke-width="1.2" opacity="0.1"${window.__LITE ? '' : ' filter="url(#soft1)"'}/>`;
    // plis : aisselles -> ceinture, blousant au-dessus de la ceinture, jupe
    for (const sd of [-1, 1]) {
      const a = Tb(sd * (sw - 1), -146), b = Tb(sd * 9, -121), c2 = Tb(sd * (sw - 3), -138), d2 = Tb(sd * 14, -122);
      s += `<path d="M${P2(a)}Q${P2(Tb(sd * (sw * 0.6), -128))} ${P2(b)}" stroke="${GI_D}" stroke-width="0.7" fill="none" opacity="0.55"/>`;
      s += `<path d="M${P2(c2)}Q${P2(Tb(sd * (sw * 0.75), -128))} ${P2(d2)}" stroke="${GI_D}" stroke-width="0.5" fill="none" opacity="0.45"/>`;
      s += `<path d="M${F(sd * (sw - 4))},-108Q${F(sd * (sw - 2))},-96 ${F(sd * (sw - 1))},-82" stroke="${GI_D}" stroke-width="0.6" fill="none" opacity="0.5"/>`;
      s += `<path d="M${F(sd * 6)},-108Q${F(sd * 7)},-96 ${F(sd * 6.5)},-82" stroke="${GI_D}" stroke-width="0.45" fill="none" opacity="0.35"/>`;
      s += `<path d="M${P2(Tb(sd * (sw + 0.5), -159.5))}Q${P2(Tb(sd * (sw - 4), -156))} ${P2(Tb(sd * (sw - 6), -150))}" stroke="${GI_D}" stroke-width="0.45" fill="none" opacity="0.5"/>`;
    }
    s += `<path d="M${P2(Tb(-sw + 2, -121.5))}Q${P2(Tb(0, -119.6))} ${P2(Tb(sw - 2, -121.5))}" stroke="${GI_D}" stroke-width="0.8" fill="none" opacity="0.5"/>`;
    s += `<path d="M${P2(Tb(-sw + 5, -124.5))}Q${P2(Tb(0, -122.8))} ${P2(Tb(sw - 5, -124.5))}" stroke="${GI_D}" stroke-width="0.5" fill="none" opacity="0.35"/>`;
    // ombre portée de la tête sur le col
    s += softEll(T(1.5, -163), 9, 3.5, 'url(#gsoft)', 0.8);

    // ----- écusson du logo (poitrine, côté gauche de l'image) -----
    if (m.logo) {
      const ar = m.logo_ar;
      const maxW = Math.min(22, sw - 4.5), maxH = 13.5;
      let pw = maxW, ph = pw / ar + 2.2; if (ph > maxH) { ph = maxH; pw = Math.min(maxW, (ph - 2.2) * ar); }
      pw = Math.max(pw, 11);
      const cx = -(sw * 0.5 + 2.6), cy = -136.5;
      const c0 = Tb(cx - pw / 2, cy - ph / 2), c1 = Tb(cx + pw / 2, cy + ph / 2);
      const x0 = c0[0], y0 = c0[1], w = c1[0] - c0[0], h = c1[1] - c0[1];
      s += `<rect x="${F(x0 + 0.3)}" y="${F(y0 + 0.5)}" width="${F(w)}" height="${F(h)}" rx="1.2" fill="#3a2a22" opacity="0.18"${window.__LITE ? '' : ' filter="url(#soft1)"'}/>`;
      s += `<rect x="${F(x0)}" y="${F(y0)}" width="${F(w)}" height="${F(h)}" rx="1.2" fill="${m.logo_bg || '#ffffff'}" stroke="#b4bccb" stroke-width="0.35"/>`;
      s += `<use href="#logo_${id}" x="${F(x0 + 0.9)}" y="${F(y0 + 0.8)}" width="${F(w - 1.8)}" height="${F(h - 1.6)}"/>`;
      s += `<rect x="${F(x0 + 0.45)}" y="${F(y0 + 0.45)}" width="${F(w - 0.9)}" height="${F(h - 0.9)}" rx="0.9" fill="none" stroke="${(m.logo_bg && lum(m.logo_bg) < 0.4) ? '#8890a0' : '#c9cfdb'}" stroke-width="0.18" stroke-dasharray="0.6 0.45"/>`;
      s += `<rect x="${F(x0)}" y="${F(y0)}" width="${F(w)}" height="${F(h)}" rx="1.2" fill="url(#gi_v)" opacity="0.7"/>`;
      out.logo = [x0, y0, x0 + w, y0 + h];
    }

    // ----- ceinture -----
    const wb = sw + 0.2 + belly * 0.5 - (fem ? 2.2 : 0);
    if (p.belt) s += beltWorn(p.belt, Tb, wb, p.tailSway || 0, p.beltGlow || 0, p.beltRainbow || 0, t);

    // ----- médaille -----
    if (p.medal != null && p.medal > 0) {
      const md = clamp(p.medal); const off = -(1 - md) * (1 - md) * 60;
      const mc = T(0, -128 + off * 0); const my = mc[1] + off;
      const a1 = Tb(-6.2, -163.5), a2 = Tb(6.2, -163.5);
      for (const [a, sg] of [[a1, -1], [a2, 1]]) {
        const b = [mc[0] + sg * 1.6, my - 4.4];
        s += `<path d="M${F(a[0])},${F(a[1] + off)}L${P2(b)}" stroke="#1f4fa0" stroke-width="2.6" stroke-linecap="round"/><path d="M${F(a[0])},${F(a[1] + off)}L${P2(b)}" stroke="#f2c94c" stroke-width="0.6"/>`;
      }
      s += `<circle cx="${F(mc[0] + 0.4)}" cy="${F(my + 0.6)}" r="5.1" fill="#3a2a22" opacity="0.25"${window.__LITE ? '' : ' filter="url(#soft1)"'}/>`;
      s += `<circle cx="${F(mc[0])}" cy="${F(my)}" r="5.0" fill="url(#medalG)" stroke="#8a5f06" stroke-width="0.45"/>`;
      s += `<circle cx="${F(mc[0])}" cy="${F(my)}" r="3.7" fill="none" stroke="#b8860b" stroke-width="0.35"/>`;
      const st = []; for (let q = 0; q < 10; q++) { const r = q % 2 ? 1.2 : 2.8; const a = -Math.PI / 2 + q * Math.PI / 5; st.push([mc[0] + Math.cos(a) * r, my + Math.sin(a) * r]); }
      s += `<path d="M${st.map(P2).join('L')}Z" fill="#fff0a8" stroke="#c9961a" stroke-width="0.2"/>`;
      const gl = 0.5 + 0.5 * Math.sin(t * 2.3 + m.i * 0.9);
      s += `<ellipse cx="${F(mc[0] - 1.6)}" cy="${F(my - 1.9)}" rx="1.9" ry="0.8" fill="#ffffff" opacity="${F(0.35 + 0.5 * gl)}" transform="rotate(-35 ${F(mc[0] - 1.6)} ${F(my - 1.9)})"/>`;
      if (gl > 0.82) { const g2 = (gl - 0.82) / 0.18; const cx = mc[0] + 2.2, cy = my - 2.6; s += `<path d="M${F(cx)},${F(cy - 3 * g2)}L${F(cx + 0.5)},${F(cy - 0.5)}L${F(cx + 3 * g2)},${F(cy)}L${F(cx + 0.5)},${F(cy + 0.5)}L${F(cx)},${F(cy + 3 * g2)}L${F(cx - 0.5)},${F(cy + 0.5)}L${F(cx - 3 * g2)},${F(cy)}L${F(cx - 0.5)},${F(cy - 0.5)}Z" fill="#ffffff"/>`; }
    }

    // ----- cou + col arrière -----
    const nw = fem ? 5.6 : (L.sw > 29 ? 7.8 : 7.0);
    const nTop = T(0, -172), nBot = Tb(0, -161);
    s = s.replace('<!--NECK-->', '');
    const neck = `M${F(nTop[0] - nw)},${F(nTop[1])}C${F(nTop[0] - nw)},${F(nTop[1] + 4)} ${F(nBot[0] - nw - 0.8)},${F(nBot[1] - 3)} ${F(nBot[0] - nw - 1.6)},${F(nBot[1])}Q${F(nBot[0])},${F(nBot[1] + 2.2)} ${F(nBot[0] + nw + 1.6)},${F(nBot[1])}C${F(nBot[0] + nw + 0.8)},${F(nBot[1] - 3)} ${F(nTop[0] + nw)},${F(nTop[1] + 4)} ${F(nTop[0] + nw)},${F(nTop[1])}Z`;
    const backCol = `M${P2(Tb(-8.6, -163.5))}Q${P2(Tb(0, -170.5))} ${P2(Tb(8.6, -163.5))}L${P2(Tb(6.5, -162.5))}Q${P2(Tb(0, -167.6))} ${P2(Tb(-6.5, -162.5))}Z`;
    s += `<path d="${backCol}" fill="#e3e7ef" stroke="${GI_LINE}" stroke-width="0.35"/>`;
    s += `<path d="${neck}" fill="url(#skl_${id})"/>`;
    s += softEll([nTop[0] + 0.5, nTop[1] + 1.2], nw * 1.05, 3.2, `url(#sh_${id})`, 0.85);
    if (!fem) s += `<path d="M${F(nTop[0] - nw * 0.55)},${F(nTop[1] + 3)}Q${F(nBot[0] - 1.5)},${F(nBot[1] - 3)} ${F(nBot[0] - 0.8)},${F(nBot[1] - 0.5)}M${F(nTop[0] + nw * 0.55)},${F(nTop[1] + 3)}Q${F(nBot[0] + 1.5)},${F(nBot[1] - 3)} ${F(nBot[0] + 0.8)},${F(nBot[1] - 0.5)}" stroke="${L.skinD}" stroke-width="0.3" fill="none" opacity="0.35"/>`;
    // ----- tête -----
    s += `<g transform="${headT}">${Hd.head}</g>`;
    if (Hd.locks) s += `<g transform="${headT}">${Hd.locks}</g>`;

    // ----- bras -----
    const hk = fem ? 1.0 : 1.1;
    const arms = [];
    for (const [key, sd] of [['armL', -1], ['armR', 1]]) {
      const a = p[key] || { w: [sd * 30, -88, 2] };
      const S0 = Tb(sd * (sw - 0.4), -153.2); const dS = bowA ? 55 * Math.sin(bowA) : 0;
      const S = [S0[0], S0[1], dS];
      const pole = a.pole || (a.w[2] > 14 ? [sd * 0.5, 0.75, -0.45] : [sd * 1.0, 0.15, -0.4]);
      const R = ik(S, a.w, 36, 31, pole);
      arms.push({ R, a, sd });
    }
    for (const { R, a, sd } of arms) {
      const S = [R.S[0], R.S[1]], E = [R.E[0], R.E[1]], W = [R.W[0], R.W[1]];
      const fdir = V.sub(R.W, R.E); const fl = V.len(fdir) || 1;
      const fz = fdir[2] / fl; // composante vers la caméra
      const C = [lerp(E[0], W[0], 0.83), lerp(E[1], W[1], 0.83)];
      const sl = sleeve(S, E, C, 7.4, 6.2, 6.0);
      s += `<path d="${sl.d}" fill="#3a2a22" opacity="0.22"${window.__LITE ? '' : ' filter="url(#soft1)"'} transform="translate(${F(-sd * 1.6)},1.2)"/>`;
      s += `<path d="${sl.d}" fill="url(#gi_s)" stroke="${GI_LINE}" stroke-width="0.5"/>`;
      // couture d'épaule (arrondi du deltoïde) + plis du coude + liseré de contre-jour
      s += `<path d="M${F(S[0] - sd * 5.5)},${F(S[1] - 3.5)}Q${F(S[0] + sd * 1.5)},${F(S[1] - 7)} ${F(S[0] + sd * 6.5)},${F(S[1] - 1.5)}" stroke="${GI_D}" stroke-width="0.5" fill="none" opacity="0.5"/>`;
      const ed = [E[0] - S[0], E[1] - S[1]]; const el = Math.hypot(ed[0], ed[1]) || 1;
      for (const o of [-2.5, 0.5, 3]) s += `<path d="M${F(E[0] + ed[1] / el * 5 + ed[0] / el * o)},${F(E[1] - ed[0] / el * 5 + ed[1] / el * o)}Q${F(E[0] + ed[0] / el * (o + 1.5))},${F(E[1] + ed[1] / el * (o + 1.5))} ${F(E[0] - ed[1] / el * 4.5 + ed[0] / el * o)},${F(E[1] + ed[0] / el * 4.5 + ed[1] / el * o)}" stroke="${GI_D}" stroke-width="0.45" fill="none" opacity="0.55"/>`;
      s += `<path d="M${sl.A.map(P2).join('L')}" stroke="url(#rim)" stroke-width="0.6" fill="none" opacity="0.6"/>`;
      // poignet + manchette (ouverture visible si l'avant-bras pointe vers la caméra)
      const n2 = sl.n2;
      const cuffMinor = 7.2 * Math.min(1, Math.abs(fz) * 1.1);
      const cang = Math.atan2(n2[1], n2[0]) / D2R;
      if (fz > 0.25) {
        s += `<ellipse cx="${F(C[0])}" cy="${F(C[1])}" rx="5.9" ry="${F(Math.max(1.0, cuffMinor * 0.8))}" fill="#9a908a" transform="rotate(${F(cang)} ${F(C[0])} ${F(C[1])})"/>`;
        s += `<ellipse cx="${F(C[0])}" cy="${F(C[1])}" rx="5.9" ry="${F(Math.max(1.0, cuffMinor * 0.8))}" fill="none" stroke="${GI}" stroke-width="0.9" transform="rotate(${F(cang)} ${F(C[0])} ${F(C[1])})"/>`;
      }
      s += `<path d="M${P2(C)}L${P2(W)}" stroke="${L.skinD}" stroke-width="5.9" stroke-linecap="round"/><path d="M${P2(C)}L${P2(W)}" stroke="${L.skin}" stroke-width="5.2" stroke-linecap="round"/>`;
      if (fz <= 0.25) s += `<path d="M${F(C[0] + n2[0] * 7.2)},${F(C[1] + n2[1] * 7.2)}L${F(C[0] - n2[0] * 7.2)},${F(C[1] - n2[1] * 7.2)}" stroke="${GI_LINE}" stroke-width="0.7"/>`;
      // main
      let ang = Math.atan2(W[1] - E[1], W[0] - E[0]) / D2R - 90;
      const pose = a.hand || 'relax'; let hpose = pose;
      let mir = sd < 0 ? -1 : 1;
      if (pose === 'flat') mir = -mir;
      if (a.abs != null) { ang = a.abs; }
      else if (pose === 'thumb') { ang = 0; }
      else if (fz > 0.5 && pose === 'open') { hpose = 'relax'; ang = 180 + sd * 58; mir = sd < 0 ? 1 : -1; } // avant-bras vers la caméra : main de profil, paume vers le haut, doigts vers l'extérieur
      else if (fz > 0.5 && (pose === 'fist' || pose === 'grip')) ang = 180 + sd * 25; // poings dressés
      else if (pose === 'point' || pose === 'pinch') ang = sd * 95; // jamais un doigt dressé à la verticale : orienté vers l'intérieur
      ang += a.handRot || 0;
      const hs = hand(hpose, L, hk);
      s += `<g transform="translate(${F(W[0])},${F(W[1])}) rotate(${F(ang)}) scale(${mir},1)">${hs}</g>`;
      out['hand' + (sd < 0 ? 'L' : 'R')] = W;
    }
    // objets tenus (ceinture pendante, bobine)
    if (p.held) s += p.held(out);
    out.headBox = (() => { const b = Hd.box; const tr = (x, y) => [nt[0] + x * mh, nt[1] + (y - 15) * mh]; const a = tr(b[0], b[1]), c = tr(b[2], b[3]); return [a[0], a[1], c[0], c[1]]; })();
    out.headTop = nt[1] - 15 * mh + (L.head.crown - 4) * mh;
    return { svg: s, info: out };
  }

  window.AvatarKit = { drawAvatar, globalDefs, beltDefs, beltEdge, beltFill, ribbon, hand };
})();
