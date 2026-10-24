// Tête semi-réaliste : modèle 3D simplifié (points du visage avec profondeur, rotation lacet/tangage/roulis,
// projection), puis dessin vectoriel en couches : peau avec dégradés (lumière clé à gauche, contre-jour chaud),
// ombrages doux, yeux (sclère, iris, pupille, reflets, paupières, cils), sourcils effilés, nez, bouche
// articulée (lèvres, dents, langue), oreilles, barbe texturée (motif de poils), cheveux en mèches avec reflets,
// lunettes avec épaisseur et reflets.
'use strict';
(function () {
  const { F, clamp, lerp, D2R, shade, mixc } = window.U;
  const P2 = p => F(p[0]) + ',' + F(p[1]);
  // courbe lisse (Catmull-Rom -> Bézier) à travers des points
  function smooth(pts, closed, k = 1) {
    const n = pts.length; if (n < 2) return '';
    let d = 'M' + P2(pts[0]);
    const g = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k];
      d += 'C' + P2(c1) + ' ' + P2(c2) + ' ' + P2(p2);
    }
    return d + (closed ? 'Z' : '');
  }
  const poly = (pts, closed = true) => 'M' + pts.map(P2).join('L') + (closed ? 'Z' : '');
  const softEll = (c, rx, ry, fill, op, rot = 0) => `<ellipse cx="${F(c[0])}" cy="${F(c[1])}" rx="${F(rx)}" ry="${F(ry)}" fill="${fill}" opacity="${F(op)}"${rot ? ` transform="rotate(${F(rot)} ${F(c[0])} ${F(c[1])})"` : ''}/>`;

  // ---- définitions SVG partagées par membre (dégradés, motifs de poils) ----
  function headDefs(id, L) {
    const hairC = L.hair.color, hi = L.hair.hi || shade(hairC, 0.35);
    let d = '';
    d += `<radialGradient id="sk_${id}" cx="0.36" cy="0.34" r="0.78"><stop offset="0" stop-color="${L.skinL}"/><stop offset="0.5" stop-color="${L.skin}"/><stop offset="1" stop-color="${mixc(L.skin, L.skinD, 0.75)}"/></radialGradient>`;
    d += `<linearGradient id="skl_${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${L.skinL}"/><stop offset="0.45" stop-color="${L.skin}"/><stop offset="1" stop-color="${L.skinD}"/></linearGradient>`;
    d += `<radialGradient id="sh_${id}"><stop offset="0" stop-color="${L.skinD}" stop-opacity="0.9"/><stop offset="0.6" stop-color="${L.skinD}" stop-opacity="0.35"/><stop offset="1" stop-color="${L.skinD}" stop-opacity="0"/></radialGradient>`;
    d += `<radialGradient id="bl_${id}"><stop offset="0" stop-color="${L.blush}" stop-opacity="0.75"/><stop offset="1" stop-color="${L.blush}" stop-opacity="0"/></radialGradient>`;
    d += `<radialGradient id="ir_${id}" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="${shade(L.eye, 0.35)}"/><stop offset="0.55" stop-color="${L.eye}"/><stop offset="0.86" stop-color="${shade(L.eye, -0.35)}"/><stop offset="1" stop-color="${shade(L.eye, -0.65)}"/></radialGradient>`;
    d += `<radialGradient id="hs_${id}"><stop offset="0" stop-color="${hairC}" stop-opacity="0.9"/><stop offset="1" stop-color="${hairC}" stop-opacity="0"/></radialGradient>`;
    d += `<linearGradient id="hr_${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset="0.45" stop-color="${hairC}"/><stop offset="1" stop-color="${shade(hairC, -0.35)}"/></linearGradient>`;
    d += `<linearGradient id="hrx_${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hi}"/><stop offset="0.4" stop-color="${hairC}"/><stop offset="1" stop-color="${shade(hairC, -0.4)}"/></linearGradient>`;
    // motif de poils courts (barbe / repousse) : points et tirets déterministes, deux teintes
    const pat = (pid, c1, c2, n, r) => {
      let s = `<pattern id="${pid}" width="5" height="5" patternUnits="userSpaceOnUse">`;
      for (let i = 0; i < n; i++) {
        const x = (U.hash(i * 3.1 + pid.length) * 5), y = (U.hash(i * 7.7 + 1.3) * 5), a = U.hash(i * 1.9) * 60 - 30 + 90;
        const l = r * (1.6 + U.hash(i * 5.3) * 1.4); const dx = Math.cos(a * D2R) * l / 2, dy = Math.sin(a * D2R) * l / 2;
        s += `<path d="M${F(x - dx)},${F(y - dy)}L${F(x + dx)},${F(y + dy)}" stroke="${i % 3 ? c1 : c2}" stroke-width="${F(r)}" stroke-linecap="round"/>`;
      }
      return s + '</pattern>';
    };
    if (L.beard) {
      const bc = L.beard.color, g = L.beard.grey || 0;
      d += pat(`bd_${id}`, bc, g > 0.3 ? mixc(bc, '#ffffff', 0.5) : shade(bc, -0.3), 46, 0.2);
    }
    if (/buzz|fade|quiff/.test(L.hair.style)) d += pat(`sc_${id}`, hairC, shade(hairC, -0.25), 54, 0.17);
    d += `<filter id="sf_${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.55"/></filter>`;
    return d;
  }

  // ---- projection de la tête ----
  // pose.head : { yaw, pitch, roll } en degrés ; pivot de hochement à la base du crâne
  function makeProj(hp) {
    const ya = (hp.yaw || 0) * D2R, pi = (hp.pitch || 0) * D2R, ro = (hp.roll || 0) * D2R;
    const cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pi), sp = Math.sin(pi), cr = Math.cos(ro), sr = Math.sin(ro);
    const piv = [0, 15, -4];
    return (x, y, z) => {
      let X = x - piv[0], Y = y - piv[1], Z = z - piv[2];
      const Y1 = Y * cp + Z * sp, Z1 = -Y * sp + Z * cp;
      const X2 = X * cy + Z1 * sy, Z2 = -X * sy + Z1 * cy;
      X = X2 + piv[0]; Y = Y1 + piv[1];
      return [X * cr - Y * sr, X * sr + Y * cr, Z2 + piv[2]];
    };
  }

  // profondeur de la surface du visage (ellipsoïde) pour placer les traits
  function zAt(H, x, y) { const W = H.w + 0.6, R = 22; const u = 1 - (x / W) ** 2 - ((y + 3) / R) ** 2; return 15.5 * Math.sqrt(Math.max(0.02, u)); }

  // ---- contour de la tête ----
  function headOutline(L, P, jawDrop) {
    const H = L.head;
    const c = P(0, -4, 0);
    const Wk = H.w + 0.35, Hk = -H.crown - 4;
    const top = [];
    for (let i = 0; i <= 14; i++) { const a = Math.PI * (1.12 - 1.24 * i / 14); top.push([c[0] + Wk * Math.cos(a), c[1] - Hk * Math.sin(a) * (Math.sin(a) > 0 ? 1 : 0.6)]); }
    const jd = (y) => jawDrop * clamp((y - L.mouth.y + 1) / (H.chinY - L.mouth.y + 1));
    const half = (s) => [
      [s * H.cheek, H.cheekY, 5], [s * (H.cheek - 0.9 * (H.gaunt || 0)), H.cheekY + 5, 5.5], [s * H.jaw, H.jawY, 2],
      [s * (H.jaw * 0.7 + H.chin * 0.3 + 0.6), (H.jawY + H.chinY) / 2 + 3.2, 8.5], [s * (H.chin + 1.4), H.chinY - 0.7, 11]];
    const R = half(1).map(p => P(p[0], p[1] + jd(p[1]), p[2]));
    const Lh = half(-1).reverse().map(p => P(p[0], p[1] + jd(p[1]), p[2]));
    const chin = P(0, H.chinY + jd(H.chinY) + 0.35, 11.5);
    // ordre : arc du crâne (gauche -> droite), joue droite, menton, joue gauche
    const pts = top.concat(R, [chin], Lh);
    return { pts, d: smooth(pts, true, 0.9), c, Wk, Hk, chin };
  }

  // ---- yeux ----
  function eye(id, L, P, side, pose, fl) {
    const E = L.eyes, H = L.head;
    const zc = zAt(H, side * E.sep, 0);
    const C = P(side * E.sep, 0, zc - 1.2);
    const ny = Math.cos(((pose.head.yaw || 0) * D2R) + side * 0.35) / Math.cos(0.35);
    const sx = clamp(ny, 0.35, 1.15), syv = Math.cos((pose.head.pitch || 0) * D2R * 0.8);
    const ew = E.w * 0.94 * sx, eh = E.h * 0.9 * syv;
    const blink = clamp(fl.blink + (fl.wink === side ? 1 : 0), 0, 1);
    const sq = clamp((E.squint || 0) * fl.smile + fl.squint, 0, 0.85);
    const openU = 1 - blink, openL = 1 - 0.55 * sq;
    const t = (E.tilt || 0) * 0.18;
    const o = side; // vers l'extérieur
    const pt = (x, y) => [C[0] + o * x, C[1] + y];
    const I = pt(-ew, 0.25), O = pt(ew, -t);
    const up = [pt(-ew * 0.45, -eh * 1.62 * openU - 0.1), pt(ew * 0.4, -eh * 1.5 * openU - t * 0.6)];
    const lo = [pt(ew * 0.5, eh * 0.95 * openL - t * 0.3), pt(-ew * 0.35, eh * 0.9 * openL + 0.1)];
    const dUp = `M${P2(I)}C${P2(up[0])} ${P2(up[1])} ${P2(O)}`;
    const dLo = `C${P2(lo[0])} ${P2(lo[1])} ${P2(I)}`;
    const shape = dUp + dLo + 'Z';
    let s = '';
    // orbite (ombre douce entre sourcil et œil)
    s += softEll(pt(-ew * 0.2, -eh * 1.3), ew * 1.25, eh * 2.0, `url(#sh_${id})`, 0.30);
    if (E.bags) s += `<path d="M${P2(pt(-ew * 0.8, eh * 1.6))}Q${P2(pt(0, eh * 3.0 + E.bags))} ${P2(pt(ew * 0.95, eh * 1.2))}" stroke="${L.skinD}" stroke-width="0.32" fill="none" opacity="${F(0.25 + 0.35 * E.bags)}"/>`;
    if (openU > 0.08) {
      const cid = `ec_${id}_${side > 0 ? 'r' : 'l'}`;
      s += `<clipPath id="${cid}"><path d="${shape}"/></clipPath>`;
      s += `<path d="${shape}" fill="#f2ece4"/>`;
      s += `<g clip-path="url(#${cid})">`;
      s += softEll(pt(0, -eh * 1.8), ew * 1.3, eh * 1.4, `url(#sh_${id})`, 0.5);
      const ri = Math.min(E.w * 0.41, 1.85);
      const ic = [C[0] + (fl.lookX || 0) * ew * 0.32 + (pose.head.yaw || 0) * 0.02, C[1] + 0.15 + (fl.lookY || 0) * eh * 0.3];
      s += `<ellipse cx="${F(ic[0])}" cy="${F(ic[1])}" rx="${F(ri * sx)}" ry="${F(ri)}" fill="url(#ir_${id})"/>`;
      s += `<ellipse cx="${F(ic[0])}" cy="${F(ic[1])}" rx="${F(ri * sx)}" ry="${F(ri)}" fill="none" stroke="${shade(L.eye, -0.7)}" stroke-width="0.22" opacity="0.8"/>`;
      s += `<ellipse cx="${F(ic[0])}" cy="${F(ic[1])}" rx="${F(ri * 0.42 * sx)}" ry="${F(ri * 0.42)}" fill="#0b0807"/>`;
      // ombre de la paupière supérieure sur l'œil
      s += `<path d="${dUp}L${P2(pt(ew, -t + eh * 0.9))}L${P2(pt(-ew, eh * 0.9))}Z" fill="#3a2418" opacity="0.22"/>`;
      s += `<circle cx="${F(ic[0] - ri * 0.35)}" cy="${F(ic[1] - ri * 0.4)}" r="${F(ri * 0.24)}" fill="#ffffff" opacity="0.85"/>`;
      s += `<circle cx="${F(ic[0] + ri * 0.42)}" cy="${F(ic[1] + ri * 0.35)}" r="${F(ri * 0.13)}" fill="#ffffff" opacity="0.7"/>`;
      s += `</g>`;
      // ligne des cils (épaisse vers l'extérieur) + paupière inférieure
      s += `<path d="${dUp}" fill="none" stroke="#1d130e" stroke-width="${F(0.42 + 0.22 * (E.lashes || 0))}" stroke-linecap="round"/>`;
      s += `<path d="M${P2(pt(ew * 0.05, -eh * 1.2 * openU - 0.05))}Q${P2(pt(ew * 0.7, -eh * 1.15 * openU - t))} ${P2(O)}" fill="none" stroke="#1d130e" stroke-width="${F(0.75 + 0.35 * (E.lashes || 0))}" stroke-linecap="round"/>`;
      if (E.liner) s += `<path d="M${P2(O)}L${P2(pt(ew + 1.3, -t - 0.9))}" stroke="#1d130e" stroke-width="0.5" stroke-linecap="round"/>`;
      if (E.lashes) for (let k = 0; k < 4; k++) {
        const u = 0.45 + k * 0.17; const b = [C[0] + o * lerp(-ew * 0.1, ew, u), C[1] - eh * 1.2 * openU * (1 - u * u * 0.85) - t * u];
        s += `<path d="M${P2(b)}q${F(o * (0.5 + k * 0.25))},${F(-0.9 - 0.15 * k)} ${F(o * (1.0 + k * 0.3))},${F(-1.0 - 0.1 * k)}" stroke="#1d130e" stroke-width="0.24" fill="none" stroke-linecap="round" opacity="${F(0.85 * E.lashes)}"/>`;
      }
      s += `<path d="M${P2(O)}${dLo}" fill="none" stroke="${L.skinD}" stroke-width="0.3" opacity="0.65"/>`;
    } else {
      // œil fermé (clignement, clin d'œil) : arc des cils
      s += `<path d="M${P2(I)}Q${P2(pt(0, eh * 0.9))} ${P2(O)}" fill="none" stroke="#1d130e" stroke-width="0.6" stroke-linecap="round"/>`;
    }
    // pli de paupière
    const cr = (E.crease || 0.5);
    s += `<path d="M${P2(pt(-ew * 0.7, -eh * 1.9 - 0.4))}Q${P2(pt(0, -eh * 2.6 - 0.5 * cr))} ${P2(pt(ew * 0.95, -eh * 1.5 - t))}" fill="none" stroke="${L.skinD}" stroke-width="0.32" opacity="${F(0.35 + 0.3 * cr)}"/>`;
    // pattes d'oie
    const crow = (L.lines.crow || 0) * (0.4 + 0.8 * fl.smile);
    if (crow > 0.1) for (let k = -1; k <= 1; k++) s += `<path d="M${P2(pt(ew + 0.8, k * 0.9))}l${F(o * 1.8)},${F(k * 0.7 - 0.2)}" stroke="${L.skinD}" stroke-width="0.22" opacity="${F(Math.min(0.6, crow * 0.5))}"/>`;
    return { s, C };
  }

  function brow(L, P, side, fl, pose) {
    const B = L.brows, E = L.eyes, H = L.head;
    const up = (fl.browUp || 0) * 1.3, inn = (fl.browIn || 0);
    const yaw = (pose.head.yaw || 0) * D2R;
    const sx = clamp(Math.cos(yaw + side * 0.4) / Math.cos(0.4), 0.4, 1.12);
    const x0 = E.sep - 3.6 + inn * 0.4, x1 = E.sep + 4.7;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6, x = lerp(x0, x1, u);
      const arch = (0.35 + B.arch) * 1.1 * Math.exp(-(((u - 0.62) / 0.32) ** 2));
      const y = B.y - up * (0.55 + 0.45 * u) + inn * (1 - u) * 0.9 - arch + 0.25 * u * u + (B.tilt || 0) * 0.04 * (0.5 - u);
      pts.push([x, y]);
    }
    const th = u => B.thick * (1.15 - 0.75 * u);
    const top = pts.map((p, i) => { const q = P(side * p[0], p[1] - th(i / 6) * 0.55, zAt(H, p[0], p[1]) + 0.3); return q; });
    const bot = pts.map((p, i) => { const q = P(side * p[0], p[1] + th(i / 6) * 0.55, zAt(H, p[0], p[1]) + 0.3); return q; }).reverse();
    void sx;
    let s = `<path d="${smooth(top.concat(bot), true, 0.8)}" fill="${B.color}"/>`;
    // poils
    for (let i = 0; i < 6; i++) { const a = top[i], b = bot[5 - i]; s += `<path d="M${P2(b)}L${P2([lerp(a[0], b[0], 0.2) + side * 0.5, lerp(a[1], b[1], 0.2) - 0.2])}" stroke="${shade(B.color, 0.25)}" stroke-width="0.18" opacity="0.6"/>`; }
    return s;
  }

  // ---- bouche ----
  function mouth(id, L, P, fl) {
    const Mo = L.mouth, H = L.head;
    const open = clamp(fl.open), wide = clamp(fl.wide, -1, 1), sm = clamp(fl.smile, 0, 1.2);
    const teethSmile = (L.teeth || 0) * sm;
    const gap = Math.max(open * 4.0, teethSmile * 1.25);
    const hw = Mo.w * (1 + 0.14 * sm + 0.12 * Math.max(0, wide) - 0.2 * Math.max(0, -wide) - 0.06 * open);
    const my = Mo.y, z = zAt(H, 0, my) + 0.6;
    const cornerY = my - sm * 1.25 + open * 0.6;
    const Q = (x, y, dz = 0) => P(x, y, zAt(H, x, y) + 0.6 + dz);
    const Lc = Q(-hw, cornerY), Rc = Q(hw, cornerY);
    const ut = Mo.upper, lt = Mo.lower;
    // lèvre sup. : bord extérieur (arc de Cupidon) et bord intérieur
    const upOut = [Lc, Q(-hw * 0.55, my - ut * 0.9), Q(-hw * 0.16, my - ut * 1.25), Q(0, my - ut * 0.95), Q(hw * 0.16, my - ut * 1.25), Q(hw * 0.55, my - ut * 0.9), Rc];
    const upIn = [Rc, Q(hw * 0.5, my - sm * 0.35 + 0.15), Q(0, my + 0.25), Q(-hw * 0.5, my - sm * 0.35 + 0.15), Lc];
    const loIn = [Lc, Q(-hw * 0.5, my + gap * 0.85 - sm * 0.2), Q(0, my + gap + 0.25), Q(hw * 0.5, my + gap * 0.85 - sm * 0.2), Rc];
    const loOut = [Rc, Q(hw * 0.55, my + gap + lt * 0.95 - sm * 0.2), Q(0, my + gap + lt * 1.35), Q(-hw * 0.55, my + gap + lt * 0.95 - sm * 0.2), Lc];
    const lip = Mo.lip;
    let s = '';
    // ombre sous la lèvre inférieure + sillon sous-nasal (philtrum)
    s += softEll(Q(0, my + gap + lt * 2.3), hw * 0.7, 1.1, `url(#sh_${id})`, 0.35);
    s += softEll(Q(0, my - ut * 2.2), 1.2, 1.2, `url(#sh_${id})`, 0.22);
    if (gap > 0.15) {
      const inner = smooth(upIn.concat(loIn.slice(1, -1)), true, 0.9);
      const cid = `mc_${id}`;
      s += `<clipPath id="${cid}"><path d="${inner}"/></clipPath><path d="${inner}" fill="#3d1416"/>`;
      s += `<g clip-path="url(#${cid})">`;
      // dents du haut + dents du bas + langue
      const ty = my - 0.2;
      s += `<path d="M${P2(Q(-hw * 0.85, ty - 1))}L${P2(Q(hw * 0.85, ty - 1))}L${P2(Q(hw * 0.78, ty + 1.75))}Q${P2(Q(0, ty + 2.15))} ${P2(Q(-hw * 0.78, ty + 1.75))}Z" fill="#f4f0e8"/>`;
      for (let k = -2; k <= 2; k++) s += `<path d="M${P2(Q(k * hw * 0.22 + hw * 0.11, ty))}l0,1.7" stroke="#cfc6b8" stroke-width="0.15"/>`;
      s += `<path d="M${P2(Q(-hw * 0.85, ty + 1.75))}L${P2(Q(hw * 0.85, ty + 1.75))}" stroke="#bfb2a2" stroke-width="0.25" opacity="0.6"/>`;
      if (open > 0.3) {
        s += `<ellipse cx="${F(Q(0, my + gap * 0.95)[0])}" cy="${F(Q(0, my + gap * 0.95)[1])}" rx="${F(hw * 0.62)}" ry="${F(gap * 0.38)}" fill="#c4565a"/>`;
        s += `<path d="M${P2(Q(-hw * 0.7, my + gap + 0.6))}L${P2(Q(hw * 0.7, my + gap + 0.6))}L${P2(Q(hw * 0.6, my + gap - 1.0))}L${P2(Q(-hw * 0.6, my + gap - 1.0))}Z" fill="#ece6dc" opacity="${F(clamp((open - 0.4) * 2))}"/>`;
      }
      s += `</g>`;
    }
    const seg = pts => smooth(pts, false, 0.8).replace(/^M[^C]*/, '');
    const upPath = smooth(upOut, false, 0.8) + seg(upIn) + 'Z';
    const loPath = smooth(loIn, false, 0.8) + seg(loOut) + 'Z';
    s += `<path d="${upPath}" fill="${shade(lip, -0.12)}"/>`;
    s += `<path d="${loPath}" fill="${lip}"/>`;
    // reflet sur la lèvre inférieure
    s += softEll(Q(hw * -0.12, my + gap + lt * 0.75), hw * 0.4, lt * 0.32, 'url(#ghl)', L.female ? 0.32 : 0.16);
    if (gap <= 0.15) s += `<path d="${smooth([Lc, Q(-hw * 0.5, my - sm * 0.3 + 0.1), Q(0, my + 0.3), Q(hw * 0.5, my - sm * 0.3 + 0.1), Rc], false)}" fill="none" stroke="${shade(lip, -0.55)}" stroke-width="0.32" stroke-linecap="round"/>`;
    // commissures (sourire)
    if (sm > 0.2) for (const sd of [-1, 1]) { const c = sd < 0 ? Lc : Rc; s += `<path d="M${P2([c[0] + sd * 0.1, c[1] - 0.3])}q${F(sd * 0.9)},${F(-0.3)} ${F(sd * 1.1)},${F(0.9)}" stroke="${L.skinD}" stroke-width="0.3" fill="none" opacity="${F(0.55 * sm)}"/>`; }
    return { s, Lc, Rc };
  }

  // ---- nez ----
  function nose(id, L, P) {
    const N = L.nose, H = L.head;
    const tip = P(0, N.len - 1.2, 19.5), base = P(0, N.len, 17.2);
    const top = P(0, -1.5, 15.2);
    const wl = P(-N.w * 0.5, N.len - 0.6, 15.2), wr = P(N.w * 0.5, N.len - 0.6, 15.2);
    let s = '';
    // arête : ombre côté droit (lumière clé à gauche) + reflet côté gauche
    s += `<path d="M${P2([top[0] + 0.5, top[1]])}C${P2([top[0] + 1.9, top[1] + 4])} ${P2([tip[0] + 2.2, tip[1] - 3])} ${P2([wr[0] - 0.2, wr[1] - 0.6])}L${P2([wr[0] - 1.2, wr[1] - 1])}C${P2([tip[0] + 0.9, tip[1] - 3])} ${P2([top[0] + 0.8, top[1] + 4])} ${P2([top[0] - 0.2, top[1]])}Z" fill="url(#sh_${id})" opacity="0.8"/>`;
    s += `<path d="M${P2([top[0] - 0.9, top[1] + 1.5])}L${P2([tip[0] - 0.7, tip[1] - 1.8])}" stroke="#ffffff" stroke-width="0.7" opacity="0.13" stroke-linecap="round"/>`;
    s += softEll([tip[0] - 0.3, tip[1] - 0.35], 1.2, 0.8, 'url(#ghl)', 0.2);
    s += softEll([tip[0], tip[1] + 0.2], N.w * 0.42, 1.4, `url(#bl_${id})`, 0.45);
    // ailes et narines
    for (const [w, sd] of [[wl, -1], [wr, 1]]) {
      s += `<path d="M${P2([w[0] - sd * 0.2, w[1] - 1.6])}C${P2([w[0] + sd * 1.0, w[1] - 1.2])} ${P2([w[0] + sd * 0.9, w[1] + 0.7])} ${P2([w[0] - sd * 0.5, w[1] + 0.7])}" fill="none" stroke="${L.skinD}" stroke-width="0.5" stroke-linecap="round" opacity="0.95"/>`;
      s += `<ellipse cx="${F(lerp(base[0], w[0], 0.55))}" cy="${F(base[1] - 0.15)}" rx="0.85" ry="0.42" fill="${shade(L.skinD, -0.45)}" opacity="0.8" transform="rotate(${F(sd * 18)} ${F(lerp(base[0], w[0], 0.55))} ${F(base[1] - 0.15)})"/>`;
    }
    s += softEll([base[0] + 0.3, base[1] + 1.0], N.w * 0.6, 0.9, `url(#sh_${id})`, 0.6);
    s += softEll([tip[0] + 1.3, tip[1] + 0.2], 1.4, 1.6, `url(#sh_${id})`, 0.45);
    return s;
  }

  function ear(id, L, P, side, yaw) {
    const H = L.head, E = L.ears;
    const vis = clamp(1 - side * yaw * 0.035, 0.15, 1.3);
    const c = P(side * (H.w - 0.2), 4.2, -1.2);
    const w = 3.4 * E.size * vis + (E.out || 0) * 0.45, h = 9.4 * E.size;
    const o = side;
    const pt = (x, y) => [c[0] + o * x, c[1] + y];
    const d = `M${P2(pt(-0.6, -h * 0.55))}C${P2(pt(w * 1.1, -h * 0.75))} ${P2(pt(w * 1.25, h * 0.1))} ${P2(pt(w * 0.5, h * 0.45))}C${P2(pt(w * 0.2, h * 0.62))} ${P2(pt(-0.2, h * 0.55))} ${P2(pt(-0.6, h * 0.3))}Z`;
    let s = `<path d="${d}" fill="${L.skin}" stroke="${L.skinD}" stroke-width="0.3"/>`;
    s += `<path d="M${P2(pt(0.2, -h * 0.35))}C${P2(pt(w * 0.85, -h * 0.5))} ${P2(pt(w * 0.85, h * 0.05))} ${P2(pt(w * 0.3, h * 0.25))}" stroke="${L.skinD}" stroke-width="0.4" fill="none" opacity="0.7"/>`;
    s += softEll(pt(w * 0.35, -h * 0.05), w * 0.4, h * 0.25, `url(#sh_${id})`, 0.55);
    s += softEll(pt(w * 0.55, -h * 0.1), w * 0.6, h * 0.5, `url(#bl_${id})`, 0.45);
    return s;
  }

  window.HeadKit = { headDefs, makeProj, zAt, headOutline, eye, brow, mouth, nose, ear, smooth, poly, softEll, P2 };
})();
