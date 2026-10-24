// Designs T2A : dessinés en Canvas2D (fond transparent, à plat), projetés en décalcomanies sur le modèle.
// Aucun relief réel. Inspirés de la planche de référence (mât, grille de réservoir avec cornières).

const COPPER = '#c98a52';
const COPPER_HI = '#e6b184';
const COPPER_LO = '#7a4522';
const BRASS = '#d4ac5e';
const BRASS_HI = '#f0d089';
const BRASS_LO = '#7d6128';

export const OPTS = { serial: '0427' };

// Palette des tracés (le mât, cuivre, reçoit un graphisme bleu foncé)
const PAL = { a: COPPER, b: BRASS, hi: BRASS_HI };
const NAVY_PAL = { a: '#0b1a4a', b: '#1d3478', hi: '#0b1a4a' };

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function poly(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

function octagon(x0, y0, x1, y1, cut) {
  return [[x0 + cut, y0], [x1 - cut, y0], [x1, y0 + cut], [x1, y1 - cut], [x1 - cut, y1], [x0 + cut, y1], [x0, y1 - cut], [x0, y0 + cut]];
}

function metalGradient(ctx, y0, y1, hi, mid, lo) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, hi); g.addColorStop(0.45, mid); g.addColorStop(1, lo);
  return g;
}

function rivet(ctx, x, y, r, brass = false) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.3;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  if (brass) { g.addColorStop(0, '#fff0bd'); g.addColorStop(0.4, BRASS); g.addColorStop(1, BRASS_LO); }
  else { g.addColorStop(0, '#f6c9a0'); g.addColorStop(0.4, COPPER); g.addColorStop(1, COPPER_LO); }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Emblème : roue dentée entre deux ailes
function wingedGear(ctx, cx, cy, s, col = PAL.a, col2 = PAL.b) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const y0 = (i - 2) * 0.095 * s, len = (2.3 - i * 0.2) * s;
      const x0 = side * 0.62 * s, x1 = side * (0.62 * s + len);
      const yTip = y0 - 0.34 * s + i * 0.03 * s;
      ctx.fillStyle = i % 2 ? col2 : col;
      ctx.beginPath();
      ctx.moveTo(x0, y0 - 0.05 * s);
      ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 0.12 * s + (yTip - y0) * 0.5, x1, yTip);
      ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 0.02 * s + (yTip - y0) * 0.35, x0, y0 + 0.05 * s);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = col; ctx.fillStyle = col;
  const teeth = 14;
  for (let i = 0; i < teeth; i++) {
    ctx.save(); ctx.rotate((i / teeth) * Math.PI * 2);
    ctx.fillRect(-0.06 * s, -0.66 * s, 0.12 * s, 0.14 * s);
    ctx.restore();
  }
  ctx.lineWidth = 0.1 * s; ctx.beginPath(); ctx.arc(0, 0, 0.5 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = col2; ctx.lineWidth = 0.045 * s; ctx.beginPath(); ctx.arc(0, 0, 0.36 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.05 * s;
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i / 6) * Math.PI * 2); ctx.beginPath(); ctx.moveTo(0, 0.08 * s); ctx.lineTo(0, 0.34 * s); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = col2; ctx.beginPath(); ctx.arc(0, 0, 0.1 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Rose des vents
function compass(ctx, cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy); ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.a; ctx.lineWidth = r * 0.05;
  for (const k of [1, 0.72, 0.5]) { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = PAL.b; ctx.lineWidth = r * 0.025;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, l = i % 6 === 0 ? 0.14 : 0.07;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r * (1 - l), Math.sin(a) * r * (1 - l)); ctx.stroke();
  }
  ctx.fillStyle = PAL.a;
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.rotate((i / 8) * Math.PI * 2);
    const long = i % 2 === 0 ? 1.18 : 0.7;
    ctx.beginPath(); ctx.moveTo(0, -r * long); ctx.lineTo(r * 0.09, 0); ctx.lineTo(-r * 0.09, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = PAL.b; ctx.beginPath(); ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function crosshair(ctx, cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.strokeStyle = PAL.a; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = PAL.b; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -r * 1.5); ctx.lineTo(0, -r * 0.3); ctx.moveTo(0, r * 1.5); ctx.lineTo(0, r * 0.3); ctx.moveTo(-r * 1.5, 0); ctx.lineTo(-r * 0.3, 0); ctx.moveTo(r * 1.5, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke();
  ctx.fillStyle = PAL.a; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Chevrons emboîtés (3 traits), pointe au centre ; dir = +1 vers le bas de l'image, -1 vers le haut
function chevrons(ctx, W, y, depth, dir, n = 3, gap = 30) {
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  for (let i = 0; i < n; i++) {
    const o = i * gap * dir;
    ctx.strokeStyle = i === 1 ? PAL.b : PAL.a;
    ctx.lineWidth = i === 0 ? 9 : i === 1 ? 4 : 2.5;
    poly(ctx, [[34, y + o], [W / 2, y + o + depth * dir], [W - 34, y + o]], false); ctx.stroke();
  }
}

// --- Mât : une longue bande (~1,2 m) ; app.js la pose en tronçons suivant la sangle (fenêtre v0..v1) ---
function mast() {
  Object.assign(PAL, NAVY_PAL);
  try { return drawMast(); } finally { Object.assign(PAL, { a: COPPER, b: BRASS, hi: BRASS_HI }); }
}
function drawMast() {
  const W = 352, H = 4096;
  const [c, ctx] = canvas(W, H);
  const cx = W / 2;
  ctx.lineCap = 'butt';
  for (const [x, col, lw] of [[12, PAL.a, 5], [24, PAL.b, 2], [W - 12, PAL.a, 5], [W - 24, PAL.b, 2]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, H - 60); ctx.stroke();
  }
  // axe central : trait fort + deux filets + repères gradués
  ctx.strokeStyle = PAL.a; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx, 140); ctx.lineTo(cx, H - 140); ctx.stroke();
  ctx.strokeStyle = PAL.b; ctx.lineWidth = 2.5;
  for (const dx of [-16, 16]) { ctx.beginPath(); ctx.moveTo(cx + dx, 140); ctx.lineTo(cx + dx, H - 140); ctx.stroke(); }
  ctx.lineWidth = 2;
  for (let y = 200; y < H - 200; y += 40) {
    const long = ((y - 200) / 40) % 5 === 0;
    ctx.beginPath(); ctx.moveTo(cx - 26, y); ctx.lineTo(cx - 26 - (long ? 22 : 10), y); ctx.moveTo(cx + 26, y); ctx.lineTo(cx + 26 + (long ? 22 : 10), y); ctx.stroke();
  }
  // canvas y=0 = haut du mât, y=H = pied du mât
  const clearAxis = (y0, y1) => ctx.clearRect(cx - 40, y0, 80, y1 - y0);
  chevrons(ctx, W, 240, 130, 1);
  chevrons(ctx, W, 560, 130, 1);
  clearAxis(840, 1320);
  wingedGear(ctx, cx, 940, 58);
  ctx.fillStyle = PAL.hi; ctx.font = 'bold 60px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N° ' + OPTS.serial, cx, 1245);
  ctx.strokeStyle = PAL.b; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx - 110, 1300); ctx.lineTo(cx + 110, 1300); ctx.moveTo(cx - 110, 1186); ctx.lineTo(cx + 110, 1186); ctx.stroke();
  for (const y of [1700, 2000]) chevrons(ctx, W, y, 130, -1);
  clearAxis(2260, 2560);
  crosshair(ctx, cx, 2400, 54);
  clearAxis(2680, 2840);
  wingedGear(ctx, cx, 2760, 44);
  for (const y of [3060, 3330]) chevrons(ctx, W, y, 130, 1);
  clearAxis(3560, 4030);
  compass(ctx, cx, 3800, 110);
  return c;
}

// --- Réservoir : grille à persiennes dans un cadre octogonal, emblème dessous ---
function vent() {
  const W = 1100, H = 800;
  const [c, ctx] = canvas(W, H);
  poly(ctx, octagon(24, 24, W - 24, 600, 140));
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.fillStyle = metalGradient(ctx, 24, 600, BRASS_HI, BRASS, BRASS_LO); ctx.fill(); ctx.restore();
  poly(ctx, octagon(46, 46, W - 46, 578, 124)); ctx.fillStyle = metalGradient(ctx, 46, 578, COPPER_HI, COPPER, COPPER_LO); ctx.fill();
  const inner = octagon(64, 64, W - 64, 560, 110);
  poly(ctx, inner); ctx.fillStyle = '#0b1226'; ctx.fill();
  ctx.save(); poly(ctx, inner); ctx.clip();
  const n = 8, top = 64, step = (560 - 64) / n;
  for (let i = 0; i < n; i++) {
    const y = top + i * step;
    ctx.fillStyle = '#050810'; ctx.fillRect(0, y, W, step);
    const lg = ctx.createLinearGradient(0, y + step * 0.1, 0, y + step * 0.82);
    lg.addColorStop(0, '#2c3a60'); lg.addColorStop(0.5, '#1b2646'); lg.addColorStop(1, '#0d142c');
    ctx.fillStyle = lg; ctx.fillRect(0, y + step * 0.1, W, step * 0.72);
    ctx.fillStyle = COPPER; ctx.fillRect(0, y + step * 0.1, W, 5);
    ctx.fillStyle = 'rgba(255,215,160,.55)'; ctx.fillRect(0, y + step * 0.1, W, 1.6);
  }
  const sh = ctx.createLinearGradient(0, 64, 0, 150); sh.addColorStop(0, 'rgba(0,0,0,.65)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, 64, W, 90);
  ctx.restore();
  const mid = octagon(35, 35, W - 35, 589, 132);
  for (let i = 0; i < mid.length; i++) {
    const [x0, y0] = mid[i], [x1, y1] = mid[(i + 1) % mid.length];
    const len = Math.hypot(x1 - x0, y1 - y0), k = Math.max(2, Math.round(len / 70));
    for (let j = 0; j < k; j++) rivet(ctx, x0 + (x1 - x0) * j / k, y0 + (y1 - y0) * j / k, 7, true);
  }
  wingedGear(ctx, W / 2, 690, 52);
  return c;
}

// --- Cadre de cornières rivetées (octogone à poser sur un flanc de réservoir) ---
function frame() {
  const W = 1200, H = 860;
  const [c, ctx] = canvas(W, H);
  const band = 50, cut = 150, m = band / 2 + 6;
  const octa = (d) => octagon(m + d, m + d, W - m - d, H - m - d, cut - d * 0.414);
  const path = octa(0);
  poly(ctx, path);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  ctx.lineJoin = 'miter'; ctx.lineWidth = band; ctx.strokeStyle = COPPER; ctx.stroke(); ctx.restore();
  for (const [d, col, lw] of [[-band / 2 + 3, 'rgba(255,225,185,.85)', 3], [-band / 4, 'rgba(255,200,150,.35)', 6], [band / 2 - 3, 'rgba(60,25,8,.7)', 4], [band / 4, 'rgba(90,45,18,.25)', 6]]) {
    poly(ctx, octa(d)); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
  }
  ctx.save(); poly(ctx, path); ctx.lineWidth = band; ctx.strokeStyle = 'rgba(212,172,94,.14)'; ctx.stroke(); ctx.restore();
  ctx.strokeStyle = 'rgba(50,20,6,.8)'; ctx.lineWidth = 3;
  for (const [x, y] of path) { ctx.beginPath(); ctx.arc(x, y, band * 0.42, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < path.length; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[(i + 1) % path.length];
    const len = Math.hypot(x1 - x0, y1 - y0), k = Math.max(2, Math.round(len / 66));
    for (let j = 0; j < k; j++) rivet(ctx, x0 + (x1 - x0) * j / k, y0 + (y1 - y0) * j / k, 8.5, true);
  }
  return c;
}

// --- Plaque d'identification (texte libre) ---
export function textSticker(text, color = '#d4ac5e') {
  const [c, ctx] = canvas(1024, 256);
  poly(ctx, octagon(6, 6, 1018, 250, 28));
  ctx.fillStyle = 'rgba(10,14,30,.94)'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = 120;
  ctx.font = `bold ${size}px Georgia, serif`;
  while (ctx.measureText(text).width > 930 && size > 20) { size -= 4; ctx.font = `bold ${size}px Georgia, serif`; }
  ctx.fillText(text, 512, 134);
  return c;
}

// `size` = hauteur du sticker en mètres
export const STICKERS = [
  { id: 'mast', label: 'Mât — graphisme aéro, bleu foncé (bande 1,2 m)', make: mast, aspect: 352 / 4096, size: 1.2, hint: 'chevrons, emblème ailé, n° de série, rose des vents' },
  { id: 'vent', label: 'Réservoir — grille à persiennes', make: vent, aspect: 1100 / 800, size: 0.2, hint: 'cadre laiton, lames cuivre, emblème' },
  { id: 'frame', label: 'Réservoir — cadre cornières rivetées', make: frame, aspect: 1200 / 860, size: 0.4, hint: 'octogone cuivre à rivets laiton' },
];
