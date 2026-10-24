// Cheveux, barbes, lunettes, et assemblage de la tête.
'use strict';
(function () {
  const { F, clamp, lerp, D2R, shade, mixc } = window.U;
  const HK = window.HeadKit;
  const { smooth, softEll, P2, zAt } = HK;
  const seg = pts => smooth(pts, false, 0.85).replace(/^M[^C]*/, '');

  // points 3D -> 2D sur la surface (décalage dz au-dessus de la peau)
  const S = (L, P, dz = 0) => (x, y, extra = 0) => P(x, y, zAt(L.head, x, y) + dz + extra);

  function hairlinePts(L, P, hl, rec, dz = 0.2) {
    const H = L.head, w = H.w, Q = S(L, P, dz);
    const xs = [-1.0, -0.86, -0.62, -0.36, 0, 0.36, 0.62, 0.86, 1.0];
    return xs.map(f => {
      const a = Math.abs(f);
      const y = a > 0.95 ? 1.5 : a > 0.8 ? hl + 4.2 : a > 0.5 ? hl - rec : a > 0.2 ? hl - 0.6 * (rec / 3) : hl;
      return Q(f * w * (a > 0.95 ? 1.0 : 0.98), y);
    });
  }
  // arc du crâne (2D) de droite à gauche en passant par le sommet
  function skullArc(O, grow = 0, a0 = -0.12, a1 = Math.PI + 0.12, n = 16) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); pts.push([O.c[0] + (O.Wk + grow) * Math.cos(a), O.c[1] - (O.Hk + grow) * Math.sin(a)]); }
    return pts;
  }

  // ---------------- cheveux ----------------
  function hairShort(id, L, P, O, fl) {
    const Hh = L.hair, H = L.head;
    const hl = Hh.hairline, rec = Hh.recede || 2;
    const line = hairlinePts(L, P, hl, rec);
    const black = Hh.style === 'buzzBlack';
    const grow = black ? 0.55 : 0.2;
    const arc = skullArc(O, grow);
    const cap = smooth(line.concat(arc.slice(1, -1)), true, 0.85);
    const dens = Hh.density || 0.6;
    let s = '';
    // ombre portée de la repousse + teinte (bord adouci), puis texture de poils
    s += `<path d="${cap}" fill="${Hh.color}" opacity="${F(black ? 0.93 : dens * 0.42)}"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
    if (!window.__LITE) s += `<path d="${cap}" fill="url(#sc_${id})" opacity="${F(black ? 0.6 : Math.min(1, dens * 1.15))}"/>`;
    else s += `<path d="${cap}" fill="${Hh.color}" opacity="${F(black ? 0.3 : dens * 0.35)}"/>`;
    // tempes plus denses (au-dessus des oreilles)
    for (const sd of [-1, 1]) s += softEll(P(sd * (H.w - 0.6), -3.5, 2), 2.4, 5.2, `url(#hs_${id})`, (Hh.sides || 0.6) * (black ? 0.5 : 0.45));
    // reflet du crâne (peau visible sous la repousse) / brillance des cheveux
    const top = [O.c[0] - O.Wk * 0.3, O.c[1] - O.Hk * 0.72];
    s += softEll(top, O.Wk * 0.42, O.Hk * 0.2, black ? '#8f8a86' : '#ffffff', black ? 0.10 : 0.32, -18);
    s += softEll([top[0] - 1.2, top[1] + 0.4], O.Wk * 0.12, O.Hk * 0.05, 'url(#ghl)', black ? 0.06 : 0.3, -18);
    // ligne de cheveux légèrement marquée (pas de bord net type bonnet)
    s += `<path d="${smooth(line, false)}" fill="none" stroke="${Hh.color}" stroke-width="0.9" opacity="${F(black ? 0.5 : dens * 0.35)}"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
    return { front: s, back: '' };
  }

  // mèche effilée le long d'une courbe de Bézier quadratique (racine large -> pointe fine)
  function lock(p0, p1, p2, w0, w1, fill, op = 1, extra = '') {
    const N = 8, A = [], B = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, v = 1 - u;
      const x = v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], y = v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1];
      const tx = 2 * v * (p1[0] - p0[0]) + 2 * u * (p2[0] - p1[0]), ty = 2 * v * (p1[1] - p0[1]) + 2 * u * (p2[1] - p1[1]);
      const tl = Math.hypot(tx, ty) || 1; const nx = -ty / tl, ny = tx / tl;
      const w = lerp(w0, w1, u) * (u < 0.15 ? 0.55 + 3 * u : 1) / 2;
      A.push([x + nx * w, y + ny * w]); B.push([x - nx * w, y - ny * w]);
    }
    return `<path d="${smooth(A.concat(B.reverse()), true, 0.8)}" fill="${fill}"${op < 1 ? ` opacity="${F(op)}"` : ''}${extra}/>`;
  }
  const qmid = (a, b, dx, dy) => [(a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy];
  function tones(L) { const c = L.hair.color, hi = L.hair.hi || shade(c, 0.35); return [shade(c, -0.32), c, shade(c, 0.1), mixc(c, hi, 0.55), hi]; }

  function hairTop(id, L, P, O, fl, opts) {
    // dessus texturé (fade de Maxime, houppe de Matthias) + côtés courts dégradés
    const Hh = L.hair, H = L.head, w = H.w, hl = Hh.hairline, rec = Hh.recede || 2;
    const T = tones(L);
    let s = '';
    const line = hairlinePts(L, P, hl, rec);
    const arc = skullArc(O, 0.25);
    const cap = smooth(line.concat(arc.slice(1, -1)), true, 0.85);
    let clip = `<path d="${cap}" fill="${Hh.color}" opacity="${F(opts.sideOp)}"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
    if (!window.__LITE) clip += `<path d="${cap}" fill="url(#sc_${id})" opacity="0.9"/>`;
    const c = O.c, Wk = O.Wk, Hk = O.Hk, v = opts.vol, sw = opts.sweep;
    const Q = S(L, P, 1.0);
    // masse du dessus
    const front = [Q(-0.78 * w, hl + 2.2), Q(-0.5 * w, hl - 0.2), Q(-0.15 * w, hl - 0.5), Q(0.2 * w, hl - 0.4), Q(0.55 * w, hl - 0.1), Q(0.8 * w, hl + 2.0)];
    const crestPts = [];
    for (let i = 0; i <= 8; i++) { const a = lerp(0.12, Math.PI - 0.12, i / 8); const lift = v * Math.pow(Math.sin(a), 0.35) * (1 + sw * Math.cos(a) * 0.35); crestPts.push([c[0] + (Wk + 0.8) * Math.cos(a) - sw * lift * 0.3, c[1] - (Hk + 0.6 + lift) * Math.sin(a)]); }
    s += `<path d="${smooth(front.concat(crestPts.slice(1, -1).map((p, i) => p), [Q(-0.95 * w, -8.5)]), true, 0.85)}" fill="${T[0]}"/>`;
    // mèches : du front vers le sommet (et vers l'arrière), avec une légère houppe
    const n = opts.n || 30;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, k = U.hash(i * 3.7 + 11), k2 = U.hash(i * 5.3 + 2);
      const x = lerp(-0.74 * w, 0.76 * w, u);
      const b = Q(x, hl + (Math.abs(x) > 0.6 * w ? 1.6 : -0.2) + k * 0.6);
      const crest = [c[0] + x * 0.85 - sw * v * 0.5 + (k - 0.5) * 1.5, c[1] - Hk - v * (0.55 + 0.3 * Math.sin(Math.PI * u)) + 1.6];
      const e = [lerp(b[0], crest[0], 0.9) + (k2 - 0.5) * 3 - sw * 3 - 1.2, lerp(b[1], crest[1], 0.9) + v * 0.2];
      const m = qmid(b, e, -sw * 2 + (k - 0.5) * 1.5, -v * 0.5 - 1.4);
      if (i % 2 === 0) s += lock(b, m, e, 3.2 + k * 1.6, 0.4, T[[1, 2, 1, 3][(i / 2) % 4]], 0.55);
    }
    // pointes vers l'avant sur le bord (texture) + reflet
    for (let i = 0; i < 10; i++) { const u = (i + 0.5) / 10; const b = Q(lerp(-0.62 * w, 0.64 * w, u), hl - 0.4); s += lock([b[0], b[1] - 2.0], [b[0] + 0.3, b[1] - 0.9], [b[0] + 0.4 + U.hash(i) * 0.5, b[1] + 0.5 + U.hash(i + 3) * 0.5], 1.2, 0.2, T[i % 2 ? 1 : 0], 0.8); }
    s += `<path d="M${P2([c[0] - Wk * 0.6, c[1] - Hk * 0.8 - v * 0.7])}Q${P2([c[0] - Wk * 0.05, c[1] - Hk - v * 1.0])} ${P2([c[0] + Wk * 0.5, c[1] - Hk * 0.86 - v * 0.75])}" stroke="${T[4]}" stroke-width="1.4" fill="none" opacity="0.5" stroke-linecap="round"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
    return { front: s, back: '', clip };
  }

  function hairPixie(id, L, P, O, fl) {
    // Estelle : pixie châtain cendré, mèche balayée vers la droite de l'image, épi sur le dessus
    const H = L.head, w = H.w; const T = tones(L);
    const Q = S(L, P, 1.6);
    const c = O.c, Wk = O.Wk, Hk = O.Hk;
    let s = '';
    const outer = [Q(-w - 1.0, 4.4), Q(-w - 1.9, -4.5), [c[0] - Wk - 1.9, c[1] - Hk * 0.6], [c[0] - Wk * 0.55, c[1] - Hk - 2.5], [c[0] + Wk * 0.25, c[1] - Hk - 2.9], [c[0] + Wk * 0.82, c[1] - Hk * 0.78 - 1.6], [c[0] + Wk + 2.0, c[1] - Hk * 0.3], Q(w + 1.7, -3.5), Q(w + 1.0, 3.8)];
    const inner = [Q(w - 0.3, 0.6), Q(w - 0.5, -3.2), Q(0.86 * w, -5.2), Q(0.5 * w, -6.4), Q(0.12 * w, -7.6), Q(-0.3 * w, -8.8), Q(-0.65 * w, -8.4), Q(-0.88 * w, -6.2), Q(-w + 0.5, -2.0), Q(-w + 0.3, 1.4)];
    s += `<path d="${smooth(outer.concat(inner), true, 0.85)}" fill="${T[0]}"/>`;
    const whorl = [c[0] - Wk * 0.55, c[1] - Hk * 0.92];
    // mèches balayées en diagonale (haut gauche -> front droit), pointes sur le front côté droit
    const tips = []; for (let i = 0; i < 15; i++) { const u = i / 14; tips.push(Q(lerp(-0.45 * w, 0.98 * w, u), lerp(-9.2, -4.4, Math.pow(u, 1.4)) + U.hash(i * 2.1) * 0.8)); }
    tips.forEach((e, i) => { const k = U.hash(i * 4.4 + 1); const b = [whorl[0] + (k - 0.5) * 3 - (i % 3), whorl[1] + (k - 0.5) * 2 - 1]; const m = [lerp(b[0], e[0], 0.45) - 1.0, Math.min(b[1], e[1]) - 2.0 - k * 1.2]; s += lock(b, m, e, 3.6 + k * 1.4, 0.35, T[[1, 2, 3, 1, 4][i % 5]]); });
    for (let i = 0; i < 5; i++) { const k = U.hash(i * 8.3); const e = Q(lerp(-0.85 * w, -0.5 * w, i / 4), -8.6 + k); const b = [whorl[0] + 1, whorl[1] - 1]; s += lock(b, [lerp(b[0], e[0], 0.5) - 1.5, lerp(b[1], e[1], 0.5) - 0.5], e, 3.0, 0.4, T[[2, 1, 3][i % 3]]); }
    // côtés : mèches qui descendent sur les oreilles
    for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) {
      const b = [c[0] + sd * Wk * (0.55 + k * 0.08), c[1] - Hk * (0.75 - k * 0.1)], e = Q(sd * (w + 0.6 - k * 0.25), 3.6 - k * 1.2 + U.hash(k + sd) * 0.6);
      s += lock(b, [b[0] + sd * 3.2, lerp(b[1], e[1], 0.5)], e, 3.0, 0.35, T[(k + (sd > 0 ? 1 : 2)) % 4 + 1]);
    }
    // épi : quelques mèches dressées
    const tp = [c[0] + Wk * 0.3, c[1] - Hk - 1.8];
    for (let k = 0; k < 4; k++) { const e = [tp[0] + 1.6 + k * 0.9, tp[1] - 2.6 - (k % 2) * 0.8]; s += lock([tp[0] - 1.2 + k * 0.6, tp[1] + 1.5], [tp[0] + k * 0.3, tp[1] - 2], e, 2.0, 0.25, T[2 + (k % 3)]); }
    s += `<path d="M${P2([c[0] - Wk * 0.5, c[1] - Hk * 0.9 - 1.4])}Q${P2([c[0], c[1] - Hk - 2.2])} ${P2([c[0] + Wk * 0.55, c[1] - Hk * 0.85 - 1.2])}" stroke="${T[4]}" stroke-width="1.5" opacity="0.4" fill="none"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
    return { front: s, back: '' };
  }

  function wavy(a, b, n, amp, ph) { const pts = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(a[0], b[0], u) + Math.sin(u * Math.PI * 2.4 + ph) * amp * Math.sin(Math.PI * u * 0.9 + 0.2), lerp(a[1], b[1], u)]); } return pts; }
  // mèche ondulée (ruban effilé le long d'une sinusoïde)
  function waveLock(a, b, amp, ph, w0, w1, fill, op = 1) {
    const N = 14, A = [], B = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N; const x = lerp(a[0], b[0], u) + Math.sin(u * Math.PI * 2.6 + ph) * amp * Math.min(1, u * 3), y = lerp(a[1], b[1], u);
      const u2 = Math.min(1, u + 0.02); const x2 = lerp(a[0], b[0], u2) + Math.sin(u2 * Math.PI * 2.6 + ph) * amp * Math.min(1, u2 * 3), y2 = lerp(a[1], b[1], u2);
      const tx = x2 - x, ty = y2 - y, tl = Math.hypot(tx, ty) || 1; const nx = -ty / tl, ny = tx / tl; const w = lerp(w0, w1, u) / 2;
      A.push([x + nx * w, y + ny * w]); B.push([x - nx * w, y - ny * w]);
    }
    return `<path d="${smooth(A.concat(B.reverse()), true, 0.8)}" fill="${fill}"${op < 1 ? ` opacity="${F(op)}"` : ''}/>`;
  }

  function hairLong(id, L, P, O, fl, t) {
    // Hélène : cheveux longs bruns ondulés tirés en arrière (front dégagé), mèches devant les épaules
    const H = L.head, w = H.w; const T = tones(L);
    const Q = S(L, P, 1.2);
    const c = O.c, Wk = O.Wk, Hk = O.Hk;
    const sw = Math.sin(t * 1.3) * 0.5;
    let back = '';
    const bl = wavy([c[0] - Wk - 0.2, c[1]], [c[0] - Wk - 8 + sw, c[1] + 64], 10, 1.4, 0.5);
    const br = wavy([c[0] + Wk + 8 + sw, c[1] + 64], [c[0] + Wk + 0.2, c[1]], 10, 1.4, 2.0);
    back += `<path d="${smooth(bl.concat(br, skullArc(O, 1.4, 0.05, Math.PI - 0.05, 8)), true, 0.8)}" fill="${T[0]}"/>`;
    for (let k = 0; k < 6; k++) { const sd = k % 2 ? 1 : -1; back += waveLock([c[0] + sd * (Wk + 0.8 + k * 0.6), c[1] + 10], [c[0] + sd * (Wk + 4 + k * 0.8) + sw, c[1] + 62], 1.6, k, 3.5, 1.2, T[1 + (k % 3)], 0.9); }
    const hl = -13.6;
    const line = [Q(-w + 0.2, 1.5), Q(-w + 0.5, -5), Q(-0.72 * w, -10.6), Q(-0.32 * w, hl), Q(0, hl - 0.3), Q(0.32 * w, hl), Q(0.72 * w, -10.6), Q(w - 0.5, -5), Q(w - 0.2, 1.5)];
    const arc = skullArc(O, 1.6, -0.25, Math.PI + 0.25, 14);
    let s = `<path d="${smooth(line.concat(arc.slice(1, -1)), true, 0.85)}" fill="${T[0]}"/>`;
    // mèches lisses tirées vers l'arrière (raie au milieu)
    const crown = [c[0], c[1] - Hk - 0.8];
    for (let i = 0; i < 12; i++) {
      const u = i / 11; const b = line[Math.round(1 + u * 6)]; const k = U.hash(i * 2.7);
      const bb = [lerp(line[1 + Math.floor(u * 6)][0], line[Math.min(8, 2 + Math.floor(u * 6))][0], (u * 6) % 1), lerp(line[1 + Math.floor(u * 6)][1], line[Math.min(8, 2 + Math.floor(u * 6))][1], (u * 6) % 1)];
      const e = [crown[0] + (u - 0.5) * Wk * 0.5, crown[1] + 1.5];
      void b; s += lock([bb[0], bb[1] - 1.2], [lerp(bb[0], e[0], 0.25) + (u - 0.5) * 4, lerp(bb[1], e[1], 0.55) - 1.5], e, 3.0 + k, 0.8, T[[1, 2, 1, 2, 3][i % 5]], 0.45);
    }
    s += `<path d="M${P2(Q(0, hl - 0.2))}L${P2([c[0], c[1] - Hk - 1.2])}" stroke="${shade(L.skin, -0.12)}" stroke-width="0.32" opacity="0.6"/>`;
    s += `<path d="M${P2([c[0] - Wk * 0.6, c[1] - Hk * 0.8 - 1])}Q${P2([c[0] - Wk * 0.1, c[1] - Hk - 1.8])} ${P2([c[0] + Wk * 0.3, c[1] - Hk * 0.95 - 1.2])}" stroke="${T[4]}" stroke-width="1.6" opacity="0.4" fill="none"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
    // mèches ondulées devant les épaules
    let locks = '';
    for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) {
      const a = [c[0] + sd * (Wk + 1.6 + k * 1.1), c[1] + 18 + k * 2];
      const b = [c[0] + sd * (Wk + 4.0 + k * 1.4) + sw, c[1] + 62 - k * 3];
      if (sd < 0) { back += waveLock(a, b, 1.2, k * 1.3, 5.2 - k * 0.5, 1.6, T[[0, 1, 2, 3][k]]); continue; } // côté écusson : mèches derrière l'épaule
      locks += waveLock(a, b, 1.2, k * 1.3 + (sd > 0 ? 0.9 : 0), 5.2 - k * 0.5, 1.6, T[[0, 1, 2, 3][k]], k === 3 ? 0.75 : 1);
    }
    return { front: s, back, locks };
  }

  function hairSide(id, L, P, O, fl, t) {
    // Samia : raie côté gauche de l'image, mèche balayée vers la droite (front visible), cheveux raides aux épaules
    const H = L.head, w = H.w; const T = tones(L);
    const Q = S(L, P, 2.0);
    const c = O.c, Wk = O.Wk, Hk = O.Hk;
    const sw = Math.sin(t * 1.1 + 1) * 0.35;
    let back = `<path d="M${P2([c[0] - Wk - 3, c[1] - 4])}L${P2([c[0] - Wk - 6.5 + sw, c[1] + 37])}Q${P2([c[0], c[1] + 41])} ${P2([c[0] + Wk + 6.5 + sw, c[1] + 37])}L${P2([c[0] + Wk + 3, c[1] - 4])}Z" fill="${T[0]}"/>`;
    const part = [c[0] - Wk * 0.38, c[1] - Hk - 2.0];
    const arc = skullArc(O, 2.6, -0.2, Math.PI + 0.2, 14);
    const hairline = [Q(w + 0.2, 0.5), Q(0.9 * w, -4.4), Q(0.62 * w, -8.0), Q(0.22 * w, -10.8), Q(-0.18 * w, -12.5), Q(-0.45 * w, -12.8), Q(-0.72 * w, -10.4), Q(-0.92 * w, -6.0), Q(-w + 0.3, -1.5)];
    let s = `<path d="${smooth(arc.concat(hairline.slice().reverse()), true, 0.85)}" fill="${T[0]}"/>`;
    // grande mèche balayée : de la raie vers la droite puis le long de la tempe
    for (let i = 0; i < 14; i++) {
      const u = i / 13, k = U.hash(i * 4.3);
      const e = i < 9 ? hairline[Math.min(4, Math.floor(u * 6.5))] : [c[0] + Wk + 1.5 + k, c[1] + 6 + (i - 9) * 3];
      const ee = i < 9 ? [lerp(hairline[Math.floor(u * 4.4)][0], hairline[Math.floor(u * 4.4) + 1][0], (u * 4.4) % 1), lerp(hairline[Math.floor(u * 4.4)][1], hairline[Math.floor(u * 4.4) + 1][1], (u * 4.4) % 1) + 0.6] : e;
      const b = [part[0] + (k - 0.5) * 2 + u * 2, part[1] + 0.8];
      s += lock(b, [lerp(b[0], ee[0], 0.6) + 1.5, Math.min(b[1], ee[1]) - 2.2], ee, 3.6 + k, 0.5, T[[1, 4, 2, 3, 1][i % 5]], 0.95);
    }
    // côté gauche : de la raie vers le bas
    for (let i = 0; i < 6; i++) { const k = U.hash(i * 7.1); const b = [part[0] - 0.5 - i * 0.6, part[1] + 0.6]; const e = Q(-w - 0.4 + k * 0.3, -2 + i * 0.8); s += lock(b, [b[0] - 4.5 - k, lerp(b[1], e[1], 0.4)], e, 3.0, 0.6, T[[2, 1, 3, 1][i % 4]]); }
    // rideaux latéraux jusqu'aux épaules (couvrent les oreilles)
    let locks = '';
    for (const sd of [-1, 1]) {
      const base = sd < 0 ? [[-w * 0.85, -7], [-w - 0.5, -1]] : [[w * 0.75, -7.5], [w + 0.4, -1]];
      for (let k = 0; k < 7; k++) {
        const u = k / 6, kk = U.hash(k * 3.9 + sd);
        const a = Q(lerp(base[0][0], base[1][0], u), lerp(base[0][1], base[1][1], u));
        const b = [c[0] + sd * (Wk + lerp(0.6, 5.8, u)) + sw, c[1] + 35 + kk * 2.5];
        const m = [lerp(a[0], b[0], 0.45) + sd * (2.2 + u * 1.5), lerp(a[1], b[1], 0.45)];
        locks += lock(a, m, b, 3.8 + kk * 1.2, 1.2, T[[1, 3, 0, 2, 4, 1, 3][k]], k === 4 ? 0.85 : 1);
      }
    }
    return { front: s, back, locks };
  }

  function hair(id, L, P, O, fl, t) {
    switch (L.hair.style) {
      case 'buzz': case 'buzzBlack': return hairShort(id, L, P, O, fl);
      case 'fade': return hairTop(id, L, P, O, fl, { vol: 2.4, sweep: 0.1, sideOp: 0.45, n: 30 });
      case 'quiff': return hairTop(id, L, P, O, fl, { vol: 3.6, sweep: 0.5, sideOp: 0.65, n: 26 });
      case 'pixie': return hairPixie(id, L, P, O, fl);
      case 'longBack': return hairLong(id, L, P, O, fl, t);
      case 'shoulderSide': return hairSide(id, L, P, O, fl, t);
    }
    return { front: '', back: '' };
  }

  // ---------------- barbes ----------------
  function beard(id, L, P, fl) {
    const B = L.beard; if (!B) return '';
    const H = L.head, Mo = L.mouth, w = H.w, my = Mo.y, mw = Mo.w;
    const jd = (y) => clamp(fl.open) * 4.0 * 0.6 * clamp((y - my + 1) / (H.chinY - my + 1));
    const Q = (x, y, dz = 0.3) => P(x, y + jd(y), zAt(H, x, y) + dz);
    const out = B.style === 'full' ? 0.35 : B.style === 'goatee' ? 0 : 0.1;
    const contour = s => [[s * (w - 0.2), 0.6], [s * (H.cheek + out * 0.3), H.cheekY + 2.5], [s * (H.jaw + out), H.jawY], [s * (H.jaw * 0.62 + H.chin * 0.38 + out * 0.6), (H.jawY + H.chinY) / 2 + 3 + out * 0.5], [s * (H.chin + out * 0.5), H.chinY - 0.9 + out]];
    const cheekLine = s => B.style === 'full'
      ? [[s * (w - 1.6), 1.6], [s * 0.72 * w, 5.8], [s * (mw + 2.6), my - 2.6]]
      : [[s * (w - 2.2), 2.6], [s * 0.62 * w, 7.6], [s * (mw + 2.2), my - 1.8]];
    const region = contour(-1).concat([[0, H.chinY + out * 1.2]], contour(1).reverse(), cheekLine(1), [[mw * 0.5, my - 3.8], [0, my - 4.1], [-mw * 0.5, my - 3.8]], cheekLine(-1).reverse());
    const reg = smooth(region.map(p => Q(p[0], p[1])), true, 0.85);
    const must = smooth([[-mw - 1.0, my + 0.2], [-mw * 0.8, my - 2.4], [-mw * 0.3, my - 3.7], [0, my - 3.4], [mw * 0.3, my - 3.7], [mw * 0.8, my - 2.4], [mw + 1.0, my + 0.2], [mw * 0.4, my - 1.4], [0, my - 1.2], [-mw * 0.4, my - 1.4]].map(p => Q(p[0], p[1], 0.6)), true, 0.8);
    const chinP = smooth([[-mw * 0.55, my + 2.6], [0, my + 2.2], [mw * 0.55, my + 2.6], [H.chin * 0.95, H.chinY - 1.2], [0, H.chinY + 0.4], [-H.chin * 0.95, H.chinY - 1.2]].map(p => Q(p[0], p[1], 0.6)), true, 0.8);
    let s = '';
    if (B.style === 'stubble' || B.style === 'mgoatee') {
      const d = B.density;
      s += `<path d="${reg}" fill="${B.color}" opacity="${F(d * (B.grey > 0.5 ? 0.18 : 0.26))}"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
      if (window.__LITE) { s += `<path d="${reg}" fill="${B.color}" opacity="${F(d * 0.35)}"/><path d="${must}" fill="${B.color}" opacity="${F(B.must * 0.5)}"/>`; }
      else {
      s += `<path d="${reg}" fill="url(#bd_${id})" opacity="${F(Math.min(1, d * 1.05))}"/>`;
      s += `<path d="${must}" fill="url(#bd_${id})" opacity="${F(B.must)}"/><path d="${must}" fill="${B.color}" opacity="${F(B.must * 0.32)}" filter="url(#sf_${id})"/>`;
      s += `<path d="${chinP}" fill="url(#bd_${id})" opacity="${F(B.goatee)}"/><path d="${chinP}" fill="${B.color}" opacity="${F(B.goatee * 0.3)}" filter="url(#sf_${id})"/>`; }
    } else if (B.style === 'full') {
      s += `<path d="${reg}" fill="${B.color}" opacity="0.55"${window.__LITE ? '' : ` filter="url(#sf_${id})"`}/>`;
      s += `<path d="${reg}" fill="${B.color}" opacity="0.62"/>`;
      if (!window.__LITE) s += `<path d="${reg}" fill="url(#bd_${id})" opacity="0.9"/>`;
      s += `<path d="${must}" fill="${B.color}" opacity="0.85"/>${window.__LITE ? '' : `<path d="${must}" fill="url(#bd_${id})"/>`}`;
      // relief : plus clair sur la joue gauche (lumière), plus sombre sous la mâchoire
      s += softEll(Q(-0.55 * w, 11), 3.5, 4, 'url(#ghl)', 0.08);
      for (let i = 0; i < 22; i++) { const u = i / 21; const k = U.hash(i * 9.1); const x = lerp(-H.jaw, H.jaw, u); const y = lerp(H.jawY, H.chinY, 1 - Math.abs(u - 0.5) * 2) + k * 1.5 - 1; const p = Q(x, y, 0.8); s += `<path d="M${P2(p)}l${F((u - 0.5) * 0.6)},${F(1.3 + k)}" stroke="${i % 2 ? shade(B.color, 0.25) : shade(B.color, -0.3)}" stroke-width="0.25" opacity="0.7"/>`; }
    } else if (B.style === 'goatee') {
      s += window.__LITE ? `<path d="${reg}" fill="${B.color}" opacity="0.15"/>` : `<path d="${reg}" fill="url(#bd_${id})" opacity="0.4"/>`;
      const g = smooth([[-mw - 1.2, my + 0.4], [-mw * 0.75, my - 2.9], [-mw * 0.25, my - 3.6], [0, my - 3.2], [mw * 0.25, my - 3.6], [mw * 0.75, my - 2.9], [mw + 1.2, my + 0.4],
        [mw + 0.8, my + 3.4], [H.chin * 1.05, H.chinY - 1.5], [H.chin * 0.6, H.chinY + 3.2], [0, H.chinY + 6.4], [-H.chin * 0.6, H.chinY + 3.2], [-H.chin * 1.05, H.chinY - 1.5], [-mw - 0.8, my + 3.4],
        [-mw * 0.7, my + 2.6], [0, my + 2.6], [mw * 0.7, my + 2.6], [mw * 0.95, my + 0.4], [mw * 0.4, my - 1.2], [0, my - 1.2], [-mw * 0.4, my - 1.2], [-mw * 0.95, my + 0.4], [-mw * 0.7, my + 2.6]].map(p => Q(p[0], p[1], 1.0)), true, 0.75);
      s += `<path d="${g}" fill="${B.color}" fill-rule="evenodd"/>`;
      for (let i = 0; i < 24; i++) { const k = U.hash(i * 3.3); const x = lerp(-H.chin, H.chin, U.hash(i * 7.1)); const y = lerp(my + 3.5, H.chinY + 4.5, k); const p = Q(x, y, 1.2); s += `<path d="M${P2(p)}q${F(x * 0.05)},${F(1)} ${F(x * 0.08)},${F(1.8)}" stroke="#4a4442" stroke-width="0.22" fill="none" opacity="0.55"/>`; }
    }
    return s;
  }

  // ---------------- lunettes ----------------
  function glasses(id, L, P, pose) {
    const G = L.glasses; if (!G) return '';
    const E = L.eyes, H = L.head;
    const yaw = (pose.head.yaw || 0) * D2R;
    let s = '';
    const lens = (side) => {
      const c = P(side * E.sep, 0.3, 17.2);
      const sx = clamp(Math.cos(yaw + side * 0.3) / Math.cos(0.3), 0.4, 1.15);
      return { c, sx };
    };
    const st = G.style;
    const dims = st === 'party' ? [5.4, 3.9, 1.6] : st === 'rectDark' ? [5.0, 3.4, 1.2] : st === 'pantoRed' ? [4.9, 4.4, 3.6] : [5.2, 3.2, 0.8];
    const shapeD = (side) => {
      const { c, sx } = lens(side); const [hw, hh, rr] = dims; const w = hw * sx;
      const o = side;
      if (st === 'pantoRed') {
        // panto : haut plus plat, bas arrondi
        return `M${F(c[0] - w)},${F(c[1] - hh * 0.55)}Q${F(c[0] - w * 0.2 * o)},${F(c[1] - hh * 1.05)} ${F(c[0] + w)},${F(c[1] - hh * 0.62)}C${F(c[0] + w * 1.12)},${F(c[1] + hh * 0.6)} ${F(c[0] + w * 0.4)},${F(c[1] + hh * 1.02)} ${F(c[0])},${F(c[1] + hh * 0.98)}C${F(c[0] - w * 0.6)},${F(c[1] + hh * 0.98)} ${F(c[0] - w * 1.08)},${F(c[1] + hh * 0.4)} ${F(c[0] - w)},${F(c[1] - hh * 0.55)}Z`;
      }
      if (st === 'party') {
        // grandes montures légèrement papillon (coins extérieurs relevés)
        const ox = c[0] + o * w, ix = c[0] - o * w;
        return `M${F(ix)},${F(c[1] - hh * 0.75)}L${F(ox)},${F(c[1] - hh * 1.05)}Q${F(ox + o * 0.6)},${F(c[1] - hh * 1.1)} ${F(ox + o * 0.3)},${F(c[1] - hh * 0.4)}Q${F(ox)},${F(c[1] + hh * 0.95)} ${F(c[0])},${F(c[1] + hh * 0.95)}Q${F(ix - o * 0.2)},${F(c[1] + hh * 0.95)} ${F(ix)},${F(c[1] - hh * 0.75)}Z`;
      }
      return `M${F(c[0] - w + rr)},${F(c[1] - hh)}L${F(c[0] + w - rr)},${F(c[1] - hh)}Q${F(c[0] + w)},${F(c[1] - hh)} ${F(c[0] + w)},${F(c[1] - hh + rr)}L${F(c[0] + w)},${F(c[1] + hh - rr)}Q${F(c[0] + w)},${F(c[1] + hh)} ${F(c[0] + w - rr)},${F(c[1] + hh)}L${F(c[0] - w + rr)},${F(c[1] + hh)}Q${F(c[0] - w)},${F(c[1] + hh)} ${F(c[0] - w)},${F(c[1] + hh - rr)}L${F(c[0] - w)},${F(c[1] - hh + rr)}Q${F(c[0] - w)},${F(c[1] - hh)} ${F(c[0] - w + rr)},${F(c[1] - hh)}Z`;
    };
    const Ld = shapeD(-1), Rd = shapeD(1);
    const frameW = st === 'party' ? 1.15 : st === 'rectDark' ? 1.05 : st === 'pantoRed' ? 1.2 : 0.55;
    const col = st === 'party' ? '#eef2f8' : st === 'rectDark' ? '#1a2130' : st === 'pantoRed' ? `url(#gl_${id})` : '#121212';
    if (st === 'pantoRed') s += `<linearGradient id="gl_${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3243f"/><stop offset="0.55" stop-color="#c41c34"/><stop offset="1" stop-color="#6e1620"/></linearGradient>`;
    // ombre de la monture sur la peau
    s += `<g transform="translate(0.45,0.9)" opacity="0.16"><path d="${Ld}" fill="none" stroke="#2a1508" stroke-width="${F(frameW + 0.3)}"/><path d="${Rd}" fill="none" stroke="#2a1508" stroke-width="${F(frameW + 0.3)}"/></g>`;
    // verres : légère teinte + reflet diagonal
    for (const [d, sd] of [[Ld, -1], [Rd, 1]]) {
      const cid = `glc_${id}_${sd}`; const { c } = lens(sd);
      s += `<clipPath id="${cid}"><path d="${d}"/></clipPath><path d="${d}" fill="#dfeaf6" opacity="0.10"/>`;
      s += `<g clip-path="url(#${cid})"><path d="M${F(c[0] - 6)},${F(c[1] + 1.5)}L${F(c[0] - 1)},${F(c[1] - 6)}L${F(c[0] + 1.2)},${F(c[1] - 6)}L${F(c[0] - 3.8)},${F(c[1] + 1.5)}Z" fill="#ffffff" opacity="0.22"/><path d="M${F(c[0] + 0.5)},${F(c[1] + 5)}L${F(c[0] + 5)},${F(c[1] - 2)}L${F(c[0] + 5.6)},${F(c[1] - 1.2)}L${F(c[0] + 1.3)},${F(c[1] + 5)}Z" fill="#ffffff" opacity="0.12"/></g>`;
    }
    const lc = lens(-1).c, rc = lens(1).c, hw = dims[0];
    // pont + branches vers les oreilles
    const bridge = st === 'pantoRed' ? `M${F(lc[0] + hw * 0.95)},${F(lc[1] - 1.6)}Q${F((lc[0] + rc[0]) / 2)},${F(lc[1] - 3.2)} ${F(rc[0] - hw * 0.95)},${F(rc[1] - 1.6)}` : `M${F(lc[0] + hw * 0.98)},${F(lc[1] - 1.2)}Q${F((lc[0] + rc[0]) / 2)},${F(lc[1] - 2.1)} ${F(rc[0] - hw * 0.98)},${F(rc[1] - 1.2)}`;
    const earL = P(-(H.w + 0.2), -0.6, 2), earR = P(H.w + 0.2, -0.6, 2);
    const temple = `M${F(lc[0] - hw * 0.98)},${F(lc[1] - 1.6)}L${P2(earL)}M${F(rc[0] + hw * 0.98)},${F(rc[1] - 1.6)}L${P2(earR)}`;
    const tcol = st === 'rectThin' ? '#9a9da3' : st === 'party' ? '#d4dbe8' : st === 'pantoRed' ? '#b31c30' : '#1a2130';
    s += `<path d="${temple}" stroke="${tcol}" stroke-width="${F(st === 'rectThin' ? 0.45 : 0.85)}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${Ld}" fill="none" stroke="${col}" stroke-width="${F(frameW)}" stroke-linejoin="round"/><path d="${Rd}" fill="none" stroke="${col}" stroke-width="${F(frameW)}" stroke-linejoin="round"/>`;
    s += `<path d="${bridge}" fill="none" stroke="${col}" stroke-width="${F(frameW * 0.9)}" stroke-linecap="round"/>`;
    if (st === 'party') {
      // motifs colorés (feuilles bleues, rouges, vertes, noires) sur la monture transparente
      const cols = ['#2347c6', '#e0313f', '#2e9e5a', '#1a1a1a', '#2347c6', '#e0313f'];
      cols.forEach((cc, k) => s += `<path d="${k % 2 ? Ld : Rd}" fill="none" stroke="${cc}" stroke-width="${F(frameW * 0.62)}" stroke-dasharray="${F(0.9 + k * 0.15)} ${F(2.6 + k * 0.4)}" stroke-dashoffset="${F(k * 1.7)}"/>`);
      cols.forEach((cc, k) => s += `<path d="${k % 2 ? Rd : Ld}" fill="none" stroke="${cc}" stroke-width="${F(frameW * 0.55)}" stroke-dasharray="${F(0.7 + k * 0.2)} ${F(3.1 + k * 0.3)}" stroke-dashoffset="${F(k * 2.3 + 1)}"/>`);
      for (const sd of [-1, 1]) { const c = lens(sd).c; s += `<path d="M${F(c[0] + sd * 4.4)},${F(c[1] - 4.1)}q${F(sd * 1.2)},${F(-0.8)} ${F(sd * 1.8)},${F(0.4)}q${F(-sd * 1)},${F(0.6)} ${F(-sd * 1.8)},${F(-0.4)}Z" fill="#2347c6"/>`; }
    } else {
      // arête claire (épaisseur de la monture)
      s += `<path d="${Ld}" fill="none" stroke="#ffffff" stroke-width="${F(frameW * 0.25)}" opacity="0.28" transform="translate(-0.15,-0.22)"/><path d="${Rd}" fill="none" stroke="#ffffff" stroke-width="${F(frameW * 0.25)}" opacity="0.28" transform="translate(-0.15,-0.22)"/>`;
    }
    return s;
  }

  // ---------------- assemblage ----------------
  // renvoie { back, head, locks, box } ; pose.head {yaw,pitch,roll}, fl : expressions
  function drawHead(m, L, pose, fl0, t) {
    const id = m.id;
    const fl = Object.assign({ open: 0, wide: 0, smile: 0, blink: 0, browUp: 0, browIn: 0, lookX: 0, lookY: 0, wink: 0, squint: 0 }, fl0);
    const P = HK.makeProj(pose.head);
    const O = HK.headOutline(L, P, clamp(fl.open) * 4.0 * 0.6);
    const Hr = hair(id, L, P, O, fl, t);
    const yaw = pose.head.yaw || 0;
    let s = '';
    s += HK.ear(id, L, P, -1, yaw) + HK.ear(id, L, P, 1, yaw);
    s += `<path d="${O.d}" fill="url(#sk_${id})"/>`;
    const cid = `fc_${id}`;
    s += `<clipPath id="${cid}"><path d="${O.d}"/></clipPath><g clip-path="url(#${cid})">`;
    const H = L.head;
    // modelé : ombre côté droit, tempes, joues creuses, front éclairé, pommettes, rougeurs
    s += HK.softEll(P(H.w * 0.95, 4, 6), 6.5, 20, `url(#sh_${id})`, 0.55);
    s += HK.softEll(P(-H.w * 1.05, 2, 6), 3.5, 16, `url(#sh_${id})`, 0.25);
    s += HK.softEll(P(0, H.chinY + 1, 10), H.jaw * 0.9, 3.2, `url(#sh_${id})`, 0.25);
    s += HK.softEll(P(-2.5, -11, 14), 8, 4.5, 'url(#ghl)', 0.13);
    for (const sd of [-1, 1]) {
      s += HK.softEll(P(sd * (L.eyes.sep + 1.5), 4.6, 12), 4.2, 2.4, 'url(#ghl)', sd < 0 ? 0.12 : 0.05);
      s += HK.softEll(P(sd * (L.eyes.sep + 2.2), 8.5, 11), 4.4, 3.4, `url(#bl_${id})`, L.female ? 0.5 : 0.35);
      if (H.gaunt) s += HK.softEll(P(sd * (H.cheek - 2.6), 10.5, 8), 2.2, 4.2, `url(#sh_${id})`, 0.35 * H.gaunt, sd * -12);
      s += HK.softEll(P(sd * (H.w - 1.2), -6, 6), 2.4, 4, `url(#sh_${id})`, 0.3);
    }
    // rides
    const Ln = L.lines || {};
    if (Ln.forehead > 0.05) for (let k = 0; k < 3; k++) { const y = -9.2 - k * 1.7 - (fl.browUp || 0) * 0.5; const a = P(-5.5 + k * 0.5, y, 14.5), b = P(0, y - 0.6, 15), c = P(5.5 - k * 0.5, y, 14.5); s += `<path d="M${P2(a)}Q${P2(b)} ${P2(c)}" stroke="${L.skinD}" stroke-width="0.28" fill="none" opacity="${F(Math.min(0.5, Ln.forehead * (0.35 + 0.3 * (fl.browUp || 0))))}"/>`; }
    if (Ln.freckles) for (let k = 0; k < 26; k++) { const x = (U.hash(k * 3.1) - 0.5) * 16, y = 3 + U.hash(k * 7.3) * 6; s += `<circle cx="${F(P(x, y, 13)[0])}" cy="${F(P(x, y, 13)[1])}" r="0.18" fill="${L.skinD}" opacity="0.4"/>`; }
    if (L.hair.style === 'buzz' || L.hair.style === 'buzzBlack') s += Hr.front;
    if (Hr.clip) s += Hr.clip;
    s += `</g>`;
    s += beard(id, L, P, fl);
    // sillons nasogéniens
    const naso = (Ln.naso || 0.3) * (0.55 + 0.6 * clamp(fl.smile));
    for (const sd of [-1, 1]) { const a = P(sd * (L.nose.w * 0.62 + 0.3), L.nose.len - 0.6, 15), b = P(sd * (L.mouth.w + 1.3), L.mouth.y - 0.3, 13.5), c = P(sd * (L.mouth.w + 1.2), L.mouth.y + 2.2, 13); s += `<path d="M${P2(a)}Q${P2([b[0] + sd * 0.6, b[1] - 1.5])} ${P2(c)}" stroke="${L.skinD}" stroke-width="0.38" fill="none" opacity="${F(Math.min(0.55, naso * 0.6))}" stroke-linecap="round"/>`; }
    s += HK.nose(id, L, P);
    const Mth = HK.mouth(id, L, P, fl);
    s += Mth.s;
    const eL = HK.eye(id, L, P, -1, pose, fl), eR = HK.eye(id, L, P, 1, pose, fl);
    s += eL.s + eR.s;
    s += HK.brow(L, P, -1, fl, pose) + HK.brow(L, P, 1, fl, pose);
    if (!/buzz/.test(L.hair.style)) s += Hr.front;
    s += glasses(id, L, P, pose);
    // contre-jour : liseré chaud sur les bords
    s += `<path d="${O.d}" fill="none" stroke="url(#rim)" stroke-width="0.55" opacity="0.55"/>`;
    // boîte englobante du visage (contrôles : chevauchement sous-titres / bandeau)
    const xs = O.pts.map(p => p[0]), ys = O.pts.map(p => p[1]);
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    return { back: Hr.back || '', head: s, locks: Hr.locks || '', box, eyes: [eL.C, eR.C], mouth: Mth };
  }

  window.HeadDraw = { drawHead };
})();
