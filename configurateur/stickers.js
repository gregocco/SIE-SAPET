// Stickers UV procéduraux : dessinés en Canvas2D, projetés en décalcomanies sur le modèle.
// Aucun relief réel : ce sont des textures transparentes.

const COPPER = '#b87333';
const COPPER_HI = '#d99a62';
const COPPER_LO = '#6e3f1c';
const BRASS = '#b59a4e';
const BRASS_HI = '#d8c27a';
const BRASS_LO = '#6b5a26';
const GRAPHITE = '#1b1c1f';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function rivet(ctx, x, y, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = r * 0.5;
  ctx.shadowOffsetY = r * 0.25;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#f0c08a');
  g.addColorStop(0.45, COPPER);
  g.addColorStop(1, COPPER_LO);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function screw(ctx, x, y, r, ang = 0.6) {
  rivet(ctx, x, y, r);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = 'rgba(40,20,8,.85)'; ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.7, 0); ctx.stroke();
  ctx.restore();
}

// --- Mât : plan d'ingénieur (bande verticale, symétrique) -----------------------------
function mast() {
  const W = 256, H = 1536;
  const [c, ctx] = canvas(W, H);
  ctx.lineCap = 'round';
  // filets extérieurs
  for (const [x, col, lw] of [[10, COPPER, 5], [22, BRASS, 2], [W - 10, COPPER, 5], [W - 22, BRASS, 2]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, H - 70); ctx.stroke();
  }
  // repères gradués
  ctx.strokeStyle = BRASS; ctx.fillStyle = BRASS_HI; ctx.font = '15px "Courier New", monospace';
  for (let y = 100, i = 0; y < H - 90; y += 20, i++) {
    const long = i % 5 === 0;
    const l = long ? 30 : 15;
    ctx.lineWidth = long ? 2.4 : 1.4;
    ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(30 + l, y); ctx.moveTo(W - 30, y); ctx.lineTo(W - 30 - l, y); ctx.stroke();
    if (i % 10 === 0) {
      ctx.save(); ctx.translate(72, y + 5); ctx.fillText(String(i * 2).padStart(3, '0'), 0, 0); ctx.restore();
      ctx.save(); ctx.translate(W - 72, y + 5); ctx.textAlign = 'right'; ctx.fillText(String(i * 2).padStart(3, '0'), 0, 0); ctx.restore();
    }
  }
  // axe central pointillé + losanges symétriques
  ctx.strokeStyle = COPPER; ctx.lineWidth = 2; ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.moveTo(W / 2, 150); ctx.lineTo(W / 2, H - 150); ctx.stroke(); ctx.setLineDash([]);
  for (let y = 260; y < H - 200; y += 240) {
    ctx.strokeStyle = COPPER; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2, y - 60); ctx.lineTo(W / 2 + 46, y); ctx.lineTo(W / 2, y + 60); ctx.lineTo(W / 2 - 46, y); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = BRASS; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(W / 2, y - 38); ctx.lineTo(W / 2 + 28, y); ctx.lineTo(W / 2, y + 38); ctx.lineTo(W / 2 - 28, y); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 - 62, y); ctx.lineTo(W / 2 - 14, y); ctx.moveTo(W / 2 + 14, y); ctx.lineTo(W / 2 + 62, y); ctx.stroke();
  }
  // inscriptions techniques
  ctx.save();
  ctx.translate(W / 2 + 4, H / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = BRASS_HI; ctx.textAlign = 'center'; ctx.font = 'bold 22px "Courier New", monospace';
  ctx.fillText('T2A  ·  MÂT V3  ·  N° 0001', 0, 0);
  ctx.font = '14px "Courier New", monospace'; ctx.fillStyle = BRASS;
  ctx.fillText('PLAN D\'ENSEMBLE — ÉCHELLE 1:10 — PL. 07/12', 0, 24);
  ctx.restore();
  // ornements d'extrémité (haut / bas, symétriques)
  for (const y of [38, H - 38]) {
    ctx.strokeStyle = COPPER; ctx.lineWidth = 3;
    for (const r of [26, 18, 10]) { ctx.beginPath(); ctx.arc(W / 2, y, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = BRASS; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 60, y); ctx.lineTo(W / 2 + 60, y); ctx.moveTo(W / 2, y - 36); ctx.lineTo(W / 2, y + 36); ctx.stroke();
  }
  return c;
}

// --- Réservoir : grille de ventilation à persiennes ---------------------------------
function vent() {
  const W = 768, H = 512;
  const [c, ctx] = canvas(W, H);
  // cadre cuivre biseauté
  roundRect(ctx, 6, 6, W - 12, H - 12, 22);
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COPPER_HI); g.addColorStop(0.5, COPPER); g.addColorStop(1, COPPER_LO);
  ctx.fillStyle = g; ctx.fill();
  // liseré laiton
  roundRect(ctx, 30, 30, W - 60, H - 60, 12);
  ctx.strokeStyle = BRASS; ctx.lineWidth = 4; ctx.stroke();
  // fond graphite
  roundRect(ctx, 38, 38, W - 76, H - 76, 8);
  ctx.fillStyle = GRAPHITE; ctx.fill();
  ctx.save(); ctx.clip();
  // profondeur : ombre portée intérieure
  g = ctx.createLinearGradient(0, 38, 0, 120);
  g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(38, 38, W - 76, 90);
  // lamelles
  const n = 11, top = 56, step = (H - 112) / n;
  for (let i = 0; i < n; i++) {
    const y = top + i * step;
    const lg = ctx.createLinearGradient(0, y, 0, y + step * 0.72);
    lg.addColorStop(0, '#8a8f96'); lg.addColorStop(0.18, '#c9ccd0'); lg.addColorStop(0.5, '#5a5e64'); lg.addColorStop(1, '#2a2c30');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(52, y + step * 0.18); ctx.lineTo(W - 52, y + step * 0.18); ctx.lineTo(W - 52, y + step * 0.78); ctx.lineTo(52, y + step * 0.78); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(52, y + step * 0.78, W - 104, step * 0.16);
  }
  ctx.restore();
  // montants latéraux de la grille
  ctx.fillStyle = BRASS_LO; ctx.fillRect(38, 38, 12, H - 76); ctx.fillRect(W - 50, 38, 12, H - 76);
  // vis aux quatre coins
  for (const [x, y] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) screw(ctx, x, y, 9, x * 0.01 + y * 0.02);
  // gravure
  ctx.fillStyle = BRASS_HI; ctx.font = 'bold 15px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillText('VENTILATION · RÉF. T2A-V07', W / 2, H - 14);
  return c;
}

// --- Cornière rivetée (bande à poser le long des arêtes) ------------------------------
function angle() {
  const W = 1024, H = 96;
  const [c, ctx] = canvas(W, H);
  roundRect(ctx, 2, 6, W - 4, H - 12, 6);
  const g = ctx.createLinearGradient(0, 6, 0, H - 6);
  g.addColorStop(0, '#d9a46e'); g.addColorStop(0.12, '#c88a52'); g.addColorStop(0.55, '#a8693a'); g.addColorStop(1, '#5e3519');
  ctx.fillStyle = g; ctx.fill();
  // patine laiton discrète
  ctx.globalAlpha = 0.18; ctx.fillStyle = BRASS;
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 4 + Math.random() * 10, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // arête de pliage
  ctx.strokeStyle = 'rgba(255,230,190,.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(8, H / 2 - 22); ctx.lineTo(W - 8, H / 2 - 22); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.moveTo(8, H / 2 + 22); ctx.lineTo(W - 8, H / 2 + 22); ctx.stroke();
  // rangée de rivets régulière
  const step = 48;
  for (let x = step / 2; x < W; x += step) rivet(ctx, x, H / 2, 9);
  return c;
}

// --- Plaque d'identification (texte libre) -------------------------------------------
export function textSticker(text, color = '#c88a52') {
  const [c, ctx] = canvas(768, 192);
  roundRect(ctx, 4, 4, 760, 184, 14);
  ctx.fillStyle = 'rgba(16,16,18,.92)'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = 84;
  ctx.font = `bold ${size}px "Courier New", monospace`;
  while (ctx.measureText(text).width > 700 && size > 18) { size -= 4; ctx.font = `bold ${size}px "Courier New", monospace`; }
  ctx.fillText(text, 384, 98);
  return c;
}

// `size` = hauteur du sticker en mètres (dans le repère de l'assemblage)
export const STICKERS = [
  { id: 'mast', label: 'Mât — plan d\'ingénieur', make: mast, aspect: 256 / 1536, size: 0.45, hint: 'bande verticale, à poser sur le mât' },
  { id: 'vent', label: 'Réservoir — grille de ventilation', make: vent, aspect: 768 / 512, size: 0.16, hint: 'persiennes graphite + cadre cuivre' },
  { id: 'angle', label: 'Cornière rivetée', make: angle, aspect: 1024 / 96, size: 0.03, hint: 'à répéter le long des arêtes' },
];
