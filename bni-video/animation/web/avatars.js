// Avatars judokas : style cartoon vectoriel commun, traits relevés sur les portraits (assets/portraits).
// Repère local : origine aux pieds, y vers le bas (SVG), unités monde (~212 de haut).
'use strict';

const LOOKS = {
  // Mathieu : crâne rasé, golfs dégarnis, barbe de 3 jours poivre et sel, visage fin, yeux marron, teint hâlé
  '01': { skin: '#e7b48f', hair: '#5a534c', hairStyle: 'buzz', hairline: -0.50, brow: '#4a4038', eye: '#6b4423',
          beard: 'stubble', beardColor: '#6f6a64', beardOp: 0.55, face: [23, 29], male: true },
  // Christophe : cheveux très courts gris-blond, front dégarni, barbe blanche courte, visage rond, yeux gris-bleu, rides
  '02': { skin: '#efbf9f', hair: '#b4a58e', hairStyle: 'buzz', hairline: -0.44, brow: '#9a8a74', eye: '#6f8796',
          beard: 'stubble', beardColor: '#e4ded4', beardOp: 0.85, face: [26, 28], wrinkles: true, male: true },
  // Estelle : cheveux courts châtain clair cendré avec épi, grandes lunettes colorées (bleu/rouge), grand sourire
  '03': { skin: '#f2c6ab', hair: '#94795c', hairStyle: 'pixie', brow: '#7d6449', eye: '#6d8a99',
          glasses: 'party', bigSmile: true, face: [25, 28], male: false },
  // Haja : cheveux noirs très courts, lunettes rectangulaires noires, bouc noir, teint brun
  '04': { skin: '#94603f', hair: '#1d1714', hairStyle: 'buzz', hairline: -0.58, brow: '#1d1714', eye: '#2b1a10',
          glasses: 'rect', beard: 'goatee', beardColor: '#1d1714', beardOp: 1, face: [25, 28], male: true },
  // Hélène : longs cheveux bruns ondulés tirés en arrière, lunettes rondes rouges, collier de perles
  '05': { skin: '#f1c3a2', hair: '#3d261a', hairStyle: 'longBack', brow: '#3d261a', eye: '#6b6a3a',
          glasses: 'roundRed', lips: '#c96b78', pearls: true, face: [24, 29], male: false },
  // Maxime : cheveux bruns courts dégradés, tempes dégagées, lunettes rectangulaires noires, barbe courte foncée
  '06': { skin: '#f0c2a3', hair: '#3a2a1f', hairStyle: 'fade', brow: '#3a2a1f', eye: '#5a3a22',
          glasses: 'rect', beard: 'full', beardColor: '#3a2a1f', beardOp: 0.92, face: [25, 28], male: true },
  // Samia : cheveux bruns raides mi-longs avec reflets caramel, raie sur le côté, teint mat chaud,
  // rouge à lèvres prune, grand sourire (portrait p_I_samia_rose.jpg)
  '07': { skin: '#c98f6a', hair: '#3a2519', hairHi: '#9a6538', hairStyle: 'shoulderSide', brow: '#2a1b12', eye: '#3a2416',
          lips: '#8e1f3c', bigSmile: true, face: [24, 29], male: false },
  // Matthias : cheveux bruns texturés en houppe, moustache et barbe légère, yeux verts
  '08': { skin: '#ebb792', hair: '#4b3221', hairStyle: 'quiff', brow: '#3e2a1c', eye: '#5f7d55',
          beard: 'light', beardColor: '#6b4a33', beardOp: 0.6, face: [24, 28], male: true },
};

const OUTLINE = '#2b2f3a';
const GI = '#fbfbfd', GI_SH = '#dfe3ec', GI_LINE = '#9aa1b2';

function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function rgbToHex(r) { return '#' + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function shade(h, k) { const c = hexToRgb(h); return rgbToHex(c.map(v => k < 0 ? v * (1 + k) : v + (255 - v) * k)); }
function mixColor(a, b, u) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * u)); }
function lum(h) { const c = hexToRgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
function beltEdge(c) { return lum(c) > 0.8 ? '#8d93a3' : lum(c) < 0.15 ? '#000000' : shade(c, -0.35); }
const f1 = v => (Math.round(v * 10) / 10).toString();
const D2R = Math.PI / 180;

// Cinématique d'un bras : a = angle épaule (0 = pendant, + = vers l'extérieur/haut), b = pli du coude (même sens).
function armFK(side, sx, sy, a, b) {
  const U = 33, F = 30;
  const ex = sx + side * U * Math.sin(a * D2R), ey = sy + U * Math.cos(a * D2R);
  const hx = ex + side * F * Math.sin((a + b) * D2R), hy = ey + F * Math.cos((a + b) * D2R);
  return { sx, sy, ex, ey, hx, hy };
}

function rig(look, p) {
  const bow = p.bow || 0;
  const breath = p.breath || 0;
  const lift = (p.bob || 0);
  const shY = -150 + 30 * bow + breath * 1.3 + lift;
  const headY = -184 + 54 * bow + breath * 1.0 + lift;
  const L = armFK(-1, -33, shY + 5, p.armL.a, p.armL.b);
  const R = armFK(1, 33, shY + 5, p.armR.a, p.armR.b);
  return { shY, headY, L, R, waistY: -87 + lift * 0.6, lift };
}

// Ceinture portée (bandeau + nœud + pans)
function beltWorn(c, t, pulse, lift) {
  const e = beltEdge(c); const y = -92 + lift * 0.6;
  const sw = Math.sin(t * 3.1) * 1.5;
  let s = `<g>`;
  s += `<path d="M-30,${f1(y)} Q0,${f1(y - 2)} 30,${f1(y)} L30,${f1(y + 9)} Q0,${f1(y + 7)} -30,${f1(y + 9)} Z" fill="${c}" stroke="${e}" stroke-width="1.4"/>`;
  s += `<path d="M-2,${f1(y + 7)} L${f1(-10 + sw)},${f1(y + 30)}" stroke="${e}" stroke-width="7.4" stroke-linecap="round"/>`;
  s += `<path d="M-2,${f1(y + 7)} L${f1(-10 + sw)},${f1(y + 30)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M2,${f1(y + 7)} L${f1(9 - sw)},${f1(y + 31)}" stroke="${e}" stroke-width="7.4" stroke-linecap="round"/>`;
  s += `<path d="M2,${f1(y + 7)} L${f1(9 - sw)},${f1(y + 31)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  s += `<rect x="-6" y="${f1(y - 1)}" width="12" height="11" rx="3" fill="${c}" stroke="${e}" stroke-width="1.4"/>`;
  if (pulse > 0) s += `<circle cx="0" cy="${f1(y + 4)}" r="${f1(10 + 26 * pulse)}" fill="none" stroke="#ffe27a" stroke-width="${f1(3 * (1 - pulse))}" opacity="${f1(1 - pulse)}"/>`;
  return s + '</g>';
}

// Ceinture tenue à la main (pendante) ou enroulée en bobine
function beltHeld(h, hx, hy, t) {
  const c = h.color, e = beltEdge(c);
  if (h.kind === 'spool') {
    // spirale d'Archimède qui tourne (Estelle)
    const n = 46, pts = [];
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1); const r = 2 + 13 * u; const th = u * 5.2 * Math.PI + h.spin;
      pts.push(`${f1(hx + r * Math.cos(th))},${f1(hy - 10 + r * Math.sin(th))}`);
    }
    const tail = `${f1(hx + 15 * Math.cos(5.2 * Math.PI + h.spin))},${f1(hy - 10 + 15 * Math.sin(5.2 * Math.PI + h.spin))}`;
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${e}" stroke-width="6.4" stroke-linejoin="round"/>` +
      `<polyline points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="4.4" stroke-linejoin="round"/>` +
      `<circle cx="${tail.split(',')[0]}" cy="${tail.split(',')[1]}" r="2.6" fill="${c}" stroke="${e}" stroke-width="1"/>`;
  }
  // deux pans pendants qui ondulent
  const sw = Math.sin(t * 4.2) * 3;
  const p1 = `M${f1(hx)},${f1(hy)} Q${f1(hx - 6 + sw)},${f1(hy + 22)} ${f1(hx - 4 + sw * 1.6)},${f1(hy + 46)}`;
  const p2 = `M${f1(hx)},${f1(hy)} Q${f1(hx + 7 + sw)},${f1(hy + 20)} ${f1(hx + 6 + sw * 1.3)},${f1(hy + 42)}`;
  return [p1, p2].map(d => `<path d="${d}" fill="none" stroke="${e}" stroke-width="7.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`).join('');
}

function arm(A, skin) {
  const fx = A.ex + (A.hx - A.ex) * 0.8, fy = A.ey + (A.hy - A.ey) * 0.8;
  const pts = `${f1(A.sx)},${f1(A.sy)} ${f1(A.ex)},${f1(A.ey)} ${f1(fx)},${f1(fy)}`;
  return `<polyline points="${pts}" fill="none" stroke="${GI_LINE}" stroke-width="17.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<polyline points="${pts}" fill="none" stroke="${GI}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${f1(A.hx)}" cy="${f1(A.hy)}" r="6.6" fill="${skin}" stroke="${shade(skin, -0.3)}" stroke-width="1.3"/>`;
}

// Cheveux : couche arrière (derrière tête/épaules) et couche avant
function hairBack(look, hx, hy, R, RY) {
  const c = look.hair;
  if (look.hairStyle === 'longBack') {
    const w = (x, y) => `${f1(hx + x)},${f1(hy + y)}`;
    return `<path d="M${w(-R * 1.02, -6)} C${w(-R * 1.5, 30)} ${w(-R * 1.05, 50)} ${w(-R * 1.45, 72)} Q${w(-R * 1.1, 86)} ${w(-R * 0.6, 78)} L${w(R * 0.6, 78)} Q${w(R * 1.1, 86)} ${w(R * 1.45, 72)} C${w(R * 1.05, 50)} ${w(R * 1.5, 30)} ${w(R * 1.02, -6)} A${f1(R * 1.05)},${f1(RY * 1.05)} 0 0 0 ${w(-R * 1.02, -6)} Z" fill="${c}"/>`;
  }
  if (look.hairStyle === 'shoulderSide') {
    const w = (x, y) => `${f1(hx + x)},${f1(hy + y)}`;
    return `<path d="M${w(-R * 1.08, -4)} L${w(-R * 1.32, 60)} Q${w(0, 70)} ${w(R * 1.32, 60)} L${w(R * 1.08, -4)} A${f1(R * 1.1)},${f1(RY * 1.08)} 0 0 0 ${w(-R * 1.08, -4)} Z" fill="${c}"/>`;
  }
  return '';
}

function capPath(hx, hy, R, RY, o) {
  // calotte : arc extérieur au-dessus du crâne, puis ligne frontale (avec golfs) de droite à gauche
  const w = (x, y) => `${f1(hx + x)},${f1(hy + y)}`;
  const sd = o.side * RY, ext = o.ext || 0, hl = o.hairline * RY, rec = (o.recede || 0) * RY, tY = o.temple * RY;
  const rx = R * 1.04 + ext * 0.4, ry = RY * 1.04 + ext;
  return `M${w(-R * 1.03, sd)} A${f1(rx)},${f1(ry)} 0 ${sd > 0 ? 1 : 0} 1 ${w(R * 1.03, sd)} ` +
    `L${w(R * 0.9, tY)} C${w(R * 0.72, hl - rec)} ${w(R * 0.35, hl)} ${w(0, hl)} C${w(-R * 0.35, hl)} ${w(-R * 0.72, hl - rec)} ${w(-R * 0.9, tY)} Z`;
}

function hairFront(look, hx, hy, R, RY, pitch) {
  const c = look.hair, st = look.hairStyle;
  const w = (x, y) => `${f1(hx + x)},${f1(hy + y)}`;
  const pd = pitch * RY * 0.6; // inclinaison (salut) : la calotte descend
  let s = '';
  if (st === 'buzz') {
    s += `<path d="${capPath(hx, hy, R, RY, { side: -0.05, hairline: look.hairline + pd / RY, recede: 0.10, temple: -0.22 })}" fill="${c}" opacity="0.92"/>`;
  } else if (st === 'fade') {
    s += `<path d="${capPath(hx, hy, R, RY, { side: 0.02, hairline: -0.56 + pd / RY, recede: 0.12, temple: -0.2 })}" fill="${c}" opacity="0.5"/>`;
    s += `<path d="${capPath(hx, hy, R * 0.86, RY, { side: -0.38, ext: 5, hairline: -0.58 + pd / RY, recede: 0.08, temple: -0.45 })}" fill="${c}"/>`;
  } else if (st === 'quiff') {
    s += `<path d="${capPath(hx, hy, R, RY, { side: 0.0, ext: 2, hairline: -0.52 + pd / RY, recede: 0.05, temple: -0.15 })}" fill="${c}"/>`;
    s += `<path d="M${w(-R * 0.98, -RY * 0.3)} Q${w(-R * 1.0, -RY * 1.15)} ${w(-R * 0.2, -RY * 1.28)} Q${w(R * 0.7, -RY * 1.42)} ${w(R * 1.02, -RY * 0.9)} Q${w(R * 1.1, -RY * 0.5)} ${w(R * 0.95, -RY * 0.28)} Q${w(R * 0.55, -RY * 0.72 + pd)} ${w(0, -RY * 0.58 + pd)} Q${w(-R * 0.6, -RY * 0.68 + pd)} ${w(-R * 0.98, -RY * 0.3)} Z" fill="${c}"/>`;
    s += `<path d="M${w(-R * 0.5, -RY * 0.95)} Q${w(R * 0.1, -RY * 1.3)} ${w(R * 0.75, -RY * 1.0)} M${w(-R * 0.2, -RY * 0.8)} Q${w(R * 0.3, -RY * 1.1)} ${w(R * 0.85, -RY * 0.7)}" stroke="${shade(c, 0.22)}" stroke-width="1.5" fill="none"/>`;
  } else if (st === 'pixie') {
    s += `<path d="${capPath(hx, hy, R, RY, { side: 0.18, ext: 3, hairline: -0.42 + pd / RY, recede: -0.05, temple: 0.05 })}" fill="${c}"/>`;
    // frange balayée + épi
    s += `<path d="M${w(-R * 0.95, -RY * 0.3 + pd)} Q${w(-R * 0.2, -RY * 0.75 + pd)} ${w(R * 0.75, -RY * 0.45 + pd)} Q${w(R * 0.2, -RY * 0.95)} ${w(-R * 0.6, -RY * 0.85)} Z" fill="${shade(c, -0.08)}"/>`;
    s += `<path d="M${w(-R * 0.1, -RY * 1.05)} L${w(R * 0.05, -RY * 1.32)} L${w(R * 0.2, -RY * 1.04)} L${w(R * 0.38, -RY * 1.25)} L${w(R * 0.45, -RY * 0.98)} Z" fill="${c}"/>`;
  } else if (st === 'longBack') {
    s += `<path d="${capPath(hx, hy, R, RY, { side: 0.25, ext: 2, hairline: -0.6 + pd / RY, recede: -0.02, temple: 0.0 })}" fill="${c}"/>`;
    for (const k of [-0.5, 0, 0.5]) s += `<path d="M${w(R * k * 1.2, -RY * 0.62 + pd)} Q${w(R * k * 0.6, -RY * 0.95)} ${w(R * k * 0.2, -RY * 1.05)}" stroke="${shade(c, 0.22)}" stroke-width="1.3" fill="none"/>`;
  } else if (st === 'shoulderSide') {
    s += `<path d="${capPath(hx, hy, R, RY, { side: 0.3, ext: 3, hairline: -0.55 + pd / RY, recede: -0.05, temple: 0.1 })}" fill="${c}"/>`;
    // raie à gauche + mèche balayée vers la droite
    s += `<path d="M${w(-R * 0.35, -RY * 1.06)} Q${w(R * 0.2, -RY * 0.75 + pd)} ${w(R * 0.98, -RY * 0.05 + pd)} L${w(R * 1.05, -RY * 0.5)} Q${w(R * 0.5, -RY * 1.05)} ${w(-R * 0.35, -RY * 1.06)} Z" fill="${shade(c, 0.06)}"/>`;
    s += `<path d="M${w(-R * 0.35, -RY * 1.04)} Q${w(R * 0.25, -RY * 0.85)} ${w(R * 0.85, -RY * 0.25)}" stroke="${look.hairHi}" stroke-width="1.6" fill="none"/>`;
  }
  return s;
}

// Mèches qui tombent devant les épaules (par-dessus le judogi)
function hairLocks(look, hx, hy, R, RY) {
  const c = look.hair;
  const w = (x, y) => `${f1(hx + x)},${f1(hy + y)}`;
  if (look.hairStyle === 'longBack') {
    let s = '';
    for (const sd of [-1, 1]) {
      s += `<path d="M${w(sd * R * 0.95, -RY * 0.1)} C${w(sd * R * 1.35, 25)} ${w(sd * R * 0.95, 45)} ${w(sd * R * 1.35, 70)} Q${w(sd * R * 1.5, 82)} ${w(sd * R * 1.62, 66)} C${w(sd * R * 1.35, 45)} ${w(sd * R * 1.62, 20)} ${w(sd * R * 1.12, -RY * 0.25)} Z" fill="${c}"/>`;
      s += `<path d="M${w(sd * R * 1.15, 10)} Q${w(sd * R * 1.38, 35)} ${w(sd * R * 1.3, 60)}" stroke="${shade(c, 0.22)}" stroke-width="1.2" fill="none"/>`;
    }
    return s;
  }
  if (look.hairStyle === 'shoulderSide') {
    let s = '';
    for (const sd of [-1, 1]) {
      s += `<path d="M${w(sd * R * 0.92, -RY * 0.3)} L${w(sd * R * 1.02, 58)} Q${w(sd * R * 1.2, 64)} ${w(sd * R * 1.38, 57)} L${w(sd * R * 1.12, -RY * 0.4)} Z" fill="${c}"/>`;
      s += `<path d="M${w(sd * R * 1.06, 0)} L${w(sd * R * 1.16, 50)} M${w(sd * R * 1.2, 5)} L${w(sd * R * 1.28, 48)}" stroke="${look.hairHi}" stroke-width="1.6" fill="none" opacity="0.85"/>`;
    }
    return s;
  }
  return '';
}

function beard(look, hx, hy, R, RY, pitch) {
  if (!look.beard) return '';
  const c = look.beardColor, op = look.beardOp;
  const w = (x, y) => `${f1(hx + x)},${f1(hy + y + pitch * 6)}`;
  if (look.beard === 'goatee') {
    return `<path d="M${w(-9, 12)} Q${w(0, 9)} ${w(9, 12)} L${w(10, 19)} Q${w(8, 30)} ${w(0, 33)} Q${w(-8, 30)} ${w(-10, 19)} Z" fill="${c}" opacity="${op}"/>`;
  }
  if (look.beard === 'full') {
    return `<path d="M${w(-R * 0.97, -2)} Q${w(-R * 0.9, 22)} ${w(0, RY + 3)} Q${w(R * 0.9, 22)} ${w(R * 0.97, -2)} L${w(R * 0.8, 4)} Q${w(R * 0.55, 18)} ${w(0, 10)} Q${w(-R * 0.55, 18)} ${w(-R * 0.8, 4)} Z" fill="${c}" opacity="${op}"/>` +
      `<path d="M${w(-8, 11)} Q${w(0, 7.5)} ${w(8, 11)} L${w(7, 13)} Q${w(0, 10.5)} ${w(-7, 13)} Z" fill="${c}" opacity="${op}"/>`;
  }
  if (look.beard === 'stubble') {
    return `<path d="M${w(-R * 0.92, 2)} Q${w(-R * 0.85, 22)} ${w(0, RY + 1)} Q${w(R * 0.85, 22)} ${w(R * 0.92, 2)} Q${w(R * 0.5, 13)} ${w(0, 9)} Q${w(-R * 0.5, 13)} ${w(-R * 0.92, 2)} Z" fill="${c}" opacity="${op * 0.55}"/>` +
      `<path d="M${w(-9, 11)} Q${w(0, 7.5)} ${w(9, 11)} L${w(8, 13)} Q${w(0, 10.5)} ${w(-8, 13)} Z" fill="${c}" opacity="${op * 0.9}"/>` +
      `<path d="M${w(-6, 20)} Q${w(0, 18)} ${w(6, 20)} L${w(5, 27)} Q${w(0, 29)} ${w(-5, 27)} Z" fill="${c}" opacity="${op * 0.8}"/>`;
  }
  if (look.beard === 'light') {
    return `<path d="M${w(-R * 0.9, 4)} Q${w(-R * 0.8, 22)} ${w(0, RY + 1)} Q${w(R * 0.8, 22)} ${w(R * 0.9, 4)} Q${w(R * 0.5, 14)} ${w(0, 10)} Q${w(-R * 0.5, 14)} ${w(-R * 0.9, 4)} Z" fill="${c}" opacity="${op * 0.45}"/>` +
      `<path d="M${w(-8.5, 11)} Q${w(0, 8)} ${w(8.5, 11)} L${w(7.5, 13)} Q${w(0, 10.8)} ${w(-7.5, 13)} Z" fill="${c}" opacity="${op}"/>`;
  }
  return '';
}

function glasses(look, hx, ey) {
  const g = look.glasses; if (!g) return '';
  if (g === 'rect') {
    return `<g fill="rgba(220,235,255,0.18)" stroke="#16181d" stroke-width="2.2">` +
      `<rect x="${f1(hx - 17)}" y="${f1(ey - 6)}" width="13.5" height="10.5" rx="2"/><rect x="${f1(hx + 3.5)}" y="${f1(ey - 6)}" width="13.5" height="10.5" rx="2"/>` +
      `<path d="M${f1(hx - 3.5)},${f1(ey - 2.5)} Q${f1(hx)},${f1(ey - 4)} ${f1(hx + 3.5)},${f1(ey - 2.5)}" fill="none"/>` +
      `<path d="M${f1(hx - 17)},${f1(ey - 4)} L${f1(hx - 24)},${f1(ey - 3)} M${f1(hx + 17)},${f1(ey - 4)} L${f1(hx + 24)},${f1(ey - 3)}" fill="none"/></g>`;
  }
  if (g === 'roundRed') {
    return `<g fill="rgba(255,230,230,0.15)" stroke="#d01f3c" stroke-width="2.6">` +
      `<circle cx="${f1(hx - 10)}" cy="${f1(ey)}" r="7.6"/><circle cx="${f1(hx + 10)}" cy="${f1(ey)}" r="7.6"/>` +
      `<path d="M${f1(hx - 2.6)},${f1(ey - 2)} Q${f1(hx)},${f1(ey - 4)} ${f1(hx + 2.6)},${f1(ey - 2)} M${f1(hx - 17.5)},${f1(ey - 2)} L${f1(hx - 24)},${f1(ey - 2)} M${f1(hx + 17.5)},${f1(ey - 2)} L${f1(hx + 24)},${f1(ey - 2)}" fill="none"/></g>`;
  }
  if (g === 'party') {
    // monture transparente aux motifs bleus et rouges (forme papillon)
    const lens = (cx) => `M${f1(cx - 8)},${f1(ey - 6)} L${f1(cx + 8)},${f1(ey - 7)} Q${f1(cx + 9)},${f1(ey + 6)} ${f1(cx)},${f1(ey + 6)} Q${f1(cx - 9)},${f1(ey + 6)} ${f1(cx - 8)},${f1(ey - 6)} Z`;
    const L = lens(hx - 10), R = lens(hx + 10);
    return `<g fill="rgba(235,240,255,0.18)"><path d="${L}" stroke="#e9eef6" stroke-width="3"/><path d="${R}" stroke="#e9eef6" stroke-width="3"/>` +
      `<path d="${L}" stroke="#2747c4" stroke-width="1.7" stroke-dasharray="2.5 3.5" fill="none"/><path d="${R}" stroke="#2747c4" stroke-width="1.7" stroke-dasharray="2.5 3.5" fill="none"/>` +
      `<path d="${L}" stroke="#e0313f" stroke-width="1.7" stroke-dasharray="1.8 4.2" stroke-dashoffset="3" fill="none"/><path d="${R}" stroke="#e0313f" stroke-width="1.7" stroke-dasharray="1.8 4.2" stroke-dashoffset="3" fill="none"/>` +
      `<path d="M${f1(hx - 2)},${f1(ey - 4)} L${f1(hx + 2)},${f1(ey - 4)}" stroke="#e9eef6" stroke-width="2.4"/></g>`;
  }
  return '';
}

function eye(cx, cy, look, closed, wink) {
  const sk = shade(look.skin, -0.45);
  if (wink) return `<path d="M${f1(cx - 5)},${f1(cy + 1)} Q${f1(cx)},${f1(cy - 4)} ${f1(cx + 5)},${f1(cy + 1)}" stroke="${OUTLINE}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  if (closed > 0.8) return `<path d="M${f1(cx - 5)},${f1(cy)} Q${f1(cx)},${f1(cy + 2)} ${f1(cx + 5)},${f1(cy)}" stroke="${OUTLINE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const ry = 5.4 * (1 - closed);
  return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="4.9" ry="${f1(ry)}" fill="#fff" stroke="${sk}" stroke-width="0.8"/>` +
    `<circle cx="${f1(cx)}" cy="${f1(cy + 0.4)}" r="${f1(Math.min(3.4, ry))}" fill="${look.eye}"/>` +
    `<circle cx="${f1(cx)}" cy="${f1(cy + 0.4)}" r="${f1(Math.min(1.8, ry * 0.6))}" fill="#111"/>` +
    `<circle cx="${f1(cx + 1.1)}" cy="${f1(cy - 1)}" r="0.95" fill="#fff"/>`;
}

function mouth(look, mx, my, open, smile) {
  const lip = look.lips || shade(look.skin, -0.42);
  if (open < 0.06) {
    if (look.bigSmile || smile > 0.5) {
      return `<path d="M${f1(mx - 8)},${f1(my - 1)} Q${f1(mx)},${f1(my + 2)} ${f1(mx + 8)},${f1(my - 1)} Q${f1(mx)},${f1(my + 8)} ${f1(mx - 8)},${f1(my - 1)} Z" fill="#fff" stroke="${lip}" stroke-width="1.6"/>`;
    }
    return `<path d="M${f1(mx - 7)},${f1(my)} Q${f1(mx)},${f1(my + 4.5)} ${f1(mx + 7)},${f1(my)}" stroke="${lip}" stroke-width="${look.lips ? 2.6 : 1.9}" fill="none" stroke-linecap="round"/>`;
  }
  const h = 1.5 + open * 7.5, wdt = 6.5 + open * 1.2;
  return `<ellipse cx="${f1(mx)}" cy="${f1(my + h * 0.35)}" rx="${f1(wdt)}" ry="${f1(h * 0.62)}" fill="#5c1a1d" stroke="${lip}" stroke-width="${look.lips ? 2.4 : 1.5}"/>` +
    `<ellipse cx="${f1(mx)}" cy="${f1(my + h * 0.68)}" rx="${f1(wdt * 0.55)}" ry="${f1(h * 0.22)}" fill="#d9626a"/>` +
    (open > 0.35 ? `<rect x="${f1(mx - wdt * 0.6)}" y="${f1(my + h * 0.35 - h * 0.6)}" width="${f1(wdt * 1.2)}" height="${f1(h * 0.18)}" rx="1" fill="#fff"/>` : '');
}

function logoPatch(m, look) {
  if (!m.logo) return '';
  const ar = m.logo_ar;
  let w = 25, h = Math.max(10, Math.min(17, 25 / ar + 3));
  if (ar < 1.35) { w = 19; h = 19; }
  const x = 25 - w, y = -142;
  return `<rect x="${f1(x - 1)}" y="${f1(y)}" width="${f1(w + 2)}" height="${f1(h)}" rx="2.2" fill="${m.logo_bg || '#fff'}" stroke="${GI_LINE}" stroke-width="0.9"/>` +
    `<use href="#logo_${m.id}" x="${f1(x)}" y="${f1(y + 1)}" width="${f1(w)}" height="${f1(h - 2)}"/>`;
}

// p : pose. Renvoie la chaîne SVG (repère local) du judoka.
function drawAvatar(m, look, p, t) {
  const r = rig(look, p);
  const [R, RY] = look.face;
  const hx = (p.headTurn || 0) * 3, hy = r.headY;
  const skin = look.skin, skinD = shade(skin, -0.28);
  let s = '';
  const back = !!p.back;

  if (!back) s += hairBack(look, hx, hy, R, RY);

  // jambes
  const ph = p.phase || 0, wk = p.walk || 0;
  const lift = r.lift;
  for (const sd of [-1, 1]) {
    const ang = sd * Math.sin(ph) * 0.32 * wk;
    const hipX = sd * 13, hipY = -80 + lift * 0.4;
    const fx = hipX + sd * 2 + Math.sin(ang) * 76, fy = hipY + Math.cos(ang) * 76 - Math.max(0, -Math.sin(ph * sd) * 6 * wk);
    s += `<path d="M${f1(hipX)},${f1(hipY)} L${f1(fx)},${f1(fy - 6)}" stroke="${GI_LINE}" stroke-width="25" stroke-linecap="round"/>`;
    s += `<path d="M${f1(hipX)},${f1(hipY)} L${f1(fx)},${f1(fy - 6)}" stroke="${GI}" stroke-width="22.5" stroke-linecap="round"/>`;
    s += `<ellipse cx="${f1(fx + sd * 4)}" cy="${f1(fy)}" rx="10.5" ry="5" fill="${skin}" stroke="${skinD}" stroke-width="1.2"/>`;
  }

  // veste
  const sy = r.shY;
  const torso = `M-36,${f1(sy + 7)} Q-37,${f1(sy)} -27,${f1(sy - 2)} L27,${f1(sy - 2)} Q37,${f1(sy)} 36,${f1(sy + 7)} L31,${f1(-60 + lift * 0.5)} Q0,${f1(-55 + lift * 0.5)} -31,${f1(-60 + lift * 0.5)} Z`;
  s += `<path d="${torso}" fill="${GI}" stroke="${GI_LINE}" stroke-width="1.6"/>`;
  s += `<path d="M18,${f1(sy)} Q30,${f1(sy + 20)} 31,${f1(-60 + lift * 0.5)} L24,${f1(-58 + lift * 0.5)} Q24,${f1(sy + 25)} 18,${f1(sy)} Z" fill="${GI_SH}" opacity="0.8"/>`;
  if (!back) {
    // encolure en V + revers croisés
    const vb = -114 + lift * 0.5 + (p.bow || 0) * 12;
    s += `<path d="M-11,${f1(sy - 1)} L11,${f1(sy - 1)} L1,${f1(vb)} Z" fill="${look.male ? skin : '#eef1f6'}"/>`;
    if (look.pearls) for (let k = -3; k <= 3; k++) s += `<circle cx="${f1(k * 2.4)}" cy="${f1(sy + 3 + Math.abs(k) * -0.6 + 2.5)}" r="1.25" fill="#fbf4e6" stroke="#cdbfa6" stroke-width="0.4"/>`;
    s += `<path d="M11,${f1(sy - 1)} L-3,${f1(-96 + lift * 0.5)}" stroke="${GI_LINE}" stroke-width="8.5" stroke-linecap="round"/><path d="M11,${f1(sy - 1)} L-3,${f1(-96 + lift * 0.5)}" stroke="#f0f2f7" stroke-width="6.5" stroke-linecap="round"/>`;
    s += `<path d="M-11,${f1(sy - 1)} L7,${f1(-90 + lift * 0.5)}" stroke="${GI_LINE}" stroke-width="8.5" stroke-linecap="round"/><path d="M-11,${f1(sy - 1)} L7,${f1(-90 + lift * 0.5)}" stroke="#f0f2f7" stroke-width="6.5" stroke-linecap="round"/>`;
    s += logoPatch(m, look);
  } else {
    s += `<path d="M0,${f1(sy)} L0,${f1(-92)}" stroke="${GI_SH}" stroke-width="1.5"/>`;
  }
  if (p.beltColor) s += back ? `<path d="M-30,-92 Q0,-94 30,-92 L30,-83 Q0,-85 -30,-83 Z" fill="${p.beltColor}" stroke="${beltEdge(p.beltColor)}" stroke-width="1.4"/>`
    : beltWorn(p.beltColor, t, p.beltPulse || 0, lift);

  // cou
  s += `<path d="M-7,${f1(hy + RY - 6)} L-7,${f1(sy + 2)} L7,${f1(sy + 2)} L7,${f1(hy + RY - 6)} Z" fill="${skinD}"/>`;

  // médaille
  if (p.medal != null && p.medal > 0) {
    const md = Math.min(1, p.medal); const off = -(1 - md) * (1 - md) * 170;
    const my = -112 + lift * 0.5 + off;
    s += `<path d="M-13,${f1(sy + 1 + off)} L-2,${f1(my - 8)} M13,${f1(sy + 1 + off)} L2,${f1(my - 8)}" stroke="#1f4fa0" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M-13,${f1(sy + 1 + off)} L-2,${f1(my - 8)} M13,${f1(sy + 1 + off)} L2,${f1(my - 8)}" stroke="#e8c33a" stroke-width="1.2"/>`;
    s += `<circle cx="0" cy="${f1(my)}" r="9.5" fill="#f2c230" stroke="#a87a10" stroke-width="1.6"/><circle cx="0" cy="${f1(my)}" r="6.2" fill="none" stroke="#c9961a" stroke-width="1.2"/>`;
    s += `<path d="M0,${f1(my - 4)} L1.2,${f1(my - 1.2)} L4,${f1(my - 1.2)} L1.8,${f1(my + 0.6)} L2.6,${f1(my + 3.6)} L0,${f1(my + 1.8)} L-2.6,${f1(my + 3.6)} L-1.8,${f1(my + 0.6)} L-4,${f1(my - 1.2)} L-1.2,${f1(my - 1.2)} Z" fill="#fff3b0"/>`;
    s += `<ellipse cx="-3" cy="${f1(my - 4)}" rx="2.6" ry="1.4" fill="#fff" opacity="0.7"/>`;
  }

  // tête
  if (!back) {
    for (const sd of [-1, 1]) s += `<ellipse cx="${f1(hx * 0.4 + sd * R * 0.98)}" cy="${f1(hy + 3)}" rx="5" ry="7" fill="${skin}" stroke="${skinD}" stroke-width="1.1"/>`;
    s += `<ellipse cx="${f1(hx * 0.3)}" cy="${f1(hy)}" rx="${R}" ry="${RY}" fill="${skin}" stroke="${skinD}" stroke-width="1.3"/>`;
    const pitch = (p.bow || 0);
    const fy = hy + pitch * 11;
    if (look.wrinkles) s += `<path d="M${f1(hx - 9)},${f1(fy - 15)} Q${f1(hx)},${f1(fy - 17)} ${f1(hx + 9)},${f1(fy - 15)} M${f1(hx - 7)},${f1(fy - 12)} Q${f1(hx)},${f1(fy - 13.5)} ${f1(hx + 7)},${f1(fy - 12)}" stroke="${skinD}" stroke-width="0.8" fill="none" opacity="0.7"/>`;
    s += `<circle cx="${f1(hx - 14)}" cy="${f1(fy + 8)}" r="4.5" fill="#ff7b6b" opacity="0.18"/><circle cx="${f1(hx + 14)}" cy="${f1(fy + 8)}" r="4.5" fill="#ff7b6b" opacity="0.18"/>`;
    s += beard(look, hx, hy, R, RY, pitch);
    const ey = fy - 1;
    const bl = p.blink || 0;
    s += eye(hx - 9.5, ey, look, bl, p.wink === 'L');
    s += eye(hx + 9.5, ey, look, bl, false);
    const br = (p.browRaise || 0) * 2.5;
    s += `<path d="M${f1(hx - 14)},${f1(ey - 8 - br + (p.wink === 'L' ? 2 : 0))} Q${f1(hx - 9.5)},${f1(ey - 11 - br)} ${f1(hx - 5)},${f1(ey - 9 - br)}" stroke="${look.brow}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${f1(hx + 5)},${f1(ey - 9 - br - (p.wink === 'L' ? 1.5 : 0))} Q${f1(hx + 9.5)},${f1(ey - 11 - br - (p.wink === 'L' ? 1.5 : 0))} ${f1(hx + 14)},${f1(ey - 8 - br)}" stroke="${look.brow}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${f1(hx + 0.5)},${f1(fy + 1)} Q${f1(hx + 3.2)},${f1(fy + 6)} ${f1(hx - 0.5)},${f1(fy + 6.6)}" stroke="${skinD}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    s += mouth(look, hx, fy + 14, p.mouth || 0, p.smile || 0);
    s += hairFront(look, hx * 0.3, hy, R, RY, pitch);
    s += glasses(look, hx, ey);
    s += hairLocks(look, hx * 0.3, hy, R, RY);
  } else {
    for (const sd of [-1, 1]) s += `<ellipse cx="${f1(sd * R * 0.98)}" cy="${f1(hy + 3)}" rx="5" ry="7" fill="${skin}" stroke="${skinD}" stroke-width="1.1"/>`;
    s += `<ellipse cx="0" cy="${f1(hy)}" rx="${R}" ry="${RY}" fill="${skin}" stroke="${skinD}" stroke-width="1.3"/>`;
    s += `<path d="M${-R * 1.03},${f1(hy + 8)} A${R * 1.05},${RY * 1.06} 0 1 1 ${R * 1.03},${f1(hy + 8)} Q0,${f1(hy + 16)} ${-R * 1.03},${f1(hy + 8)} Z" fill="${look.hair}"/>`;
  }

  // bras (devant le torse)
  s += arm(r.L, skin) + arm(r.R, skin);
  if (p.hold) {
    const H = p.hold.side === 'L' ? r.L : r.R;
    s += beltHeld(p.hold, H.hx, H.hy, t);
  }
  return { svg: s, rig: r };
}

window.LOOKS = LOOKS; window.drawAvatar = drawAvatar; window.rig = rig;
window.colorUtil = { shade, mixColor, beltEdge, lum };
