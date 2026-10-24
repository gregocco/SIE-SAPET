// Traits des 8 membres, relevés sur assets/portraits (la ressemblance est le critère n° 1).
// Repère tête : origine au milieu de la ligne des yeux ; x vers la droite de l'écran ; y vers le bas ;
// unités monde (~0,83 cm). Les visages sont stylisés semi-réalistes (tête ~1/5,2 de la hauteur).
'use strict';
const LOOKS = {
  // Mathieu Gonnelaz (p_B_xlglass_polo) : ~40 ans, crâne rasé (repousse grise très courte), golfs marqués,
  // visage long et anguleux, pommettes saillantes, joues creuses, yeux marron en amande un peu tombants,
  // barbe de 3 jours poivre et sel (moustache + bouc plus denses), nez droit et long, teint hâlé, rides du front.
  '01': {
    height: 1.0, sw: 28, skin: '#d9a07a', skinD: '#a8694a', skinL: '#efc4a2', blush: '#d0715a', eye: '#6a4122',
    head: { w: 13.2, cheek: 12.6, jaw: 10.6, chin: 4.6, chinY: 21.5, crown: -22, jawY: 13, cheekY: 3.5, gaunt: 0.55 },
    eyes: { sep: 5.4, w: 4.3, h: 1.5, tilt: -2, lid: 0.6, crease: 0.6, bags: 0.35 },
    brows: { color: '#4b4038', y: -4.2, thick: 1.15, arch: 0.6, tilt: 3 },
    nose: { len: 10.2, w: 3.6, bridge: 0.7 }, mouth: { y: 14.6, w: 5.8, lip: '#a8644e', upper: 0.9, lower: 1.4 },
    ears: { size: 1.08, out: 1.2 }, smile: 0.25, teeth: 0.1,
    hair: { style: 'buzz', color: '#5c544d', hairline: -12.8, recede: 3.6, density: 0.62, sides: 0.65 },
    beard: { style: 'stubble', color: '#5a534e', grey: 0.45, density: 0.62, must: 0.75, goatee: 0.8 },
    lines: { forehead: 0.55, crow: 0.4, naso: 0.5, cheekHollow: 0.5 },
    female: false, age: 40,
  },
  // Christophe Flacher (p_D_homme_terrasse) : ~60 ans, visage large et rond, cheveux gris-blond rasés très courts,
  // front haut très dégarni, rides du front et pattes d'oie, petits yeux gris-bleu plissés, barbe courte blanche,
  // nez large, joues rosées, sourire bouche entrouverte.
  '02': {
    height: 0.96, sw: 30, belly: 3, skin: '#e7b294', skinD: '#b97b5d', skinL: '#f6d2b8', blush: '#db7c66', eye: '#7c8e96',
    head: { w: 14.6, cheek: 15.0, jaw: 14.0, chin: 7.4, chinY: 20.5, crown: -21.5, jawY: 13.5, cheekY: 4, gaunt: 0 },
    eyes: { sep: 5.6, w: 4.0, h: 1.3, tilt: -3, lid: 0.7, crease: 0.8, bags: 0.8, squint: 0.45 },
    brows: { color: '#a59886', y: -4.0, thick: 1.0, arch: 0.3, tilt: 6 },
    nose: { len: 10.6, w: 5.4, bridge: 0.6 }, mouth: { y: 14.8, w: 6.8, lip: '#c07d68', upper: 0.8, lower: 1.3 },
    ears: { size: 1.18, out: 1.0 }, smile: 0.6, teeth: 0.45,
    hair: { style: 'buzz', color: '#a8997f', hairline: -13.4, recede: 3.6, density: 0.68, sides: 0.8 },
    beard: { style: 'stubble', color: '#ece6dc', grey: 1.0, density: 0.75, must: 0.65, goatee: 0.6 },
    lines: { forehead: 1.0, crow: 1.0, naso: 0.8, cheekHollow: 0 },
    female: false, age: 60,
  },
  // Estelle Lopez (p_H_tshirt_rose) : ~48 ans, cheveux courts châtain cendré, coupe pixie avec épi sur le dessus,
  // mèche balayée, visage rond, teint clair rosé, grandes lunettes transparentes à motifs bleus/rouges/verts/noirs,
  // yeux gris-bleu, grand sourire franc qui montre les dents.
  '03': {
    height: 0.93, sw: 25, skin: '#f0c4a8', skinD: '#c58a6c', skinL: '#fbe0cc', blush: '#e88a7a', eye: '#6f8b9c',
    head: { w: 13.8, cheek: 14.0, jaw: 12.4, chin: 6.6, chinY: 20.5, crown: -21.5, jawY: 13, cheekY: 4, gaunt: 0 },
    eyes: { sep: 5.4, w: 4.2, h: 1.65, tilt: 0, lid: 0.4, crease: 0.6, bags: 0.3, squint: 0.3, lashes: 0.4 },
    brows: { color: '#7d6a55', y: -4.6, thick: 0.85, arch: 0.6, tilt: 2 },
    nose: { len: 9.6, w: 4.0, bridge: 0.5 }, mouth: { y: 14.2, w: 6.8, lip: '#c97c78', upper: 0.8, lower: 1.3 },
    ears: { size: 1.0, out: 0.8 }, smile: 1.0, teeth: 1.0,
    hair: { style: 'pixie', color: '#8c7258', hi: '#b59a7a' },
    glasses: { style: 'party' },
    lines: { forehead: 0.15, crow: 0.6, naso: 0.6 },
    female: true, age: 48, tee: '#f7f3f2',
  },
  // Haja Rajonson (p_C_ideal_pneu) : ~40 ans, peau brune, cheveux noirs très courts (légers golfs),
  // lunettes rectangulaires épaisses noir bleuté, bouc noir fourni en pointe relié à la moustache,
  // visage ovale un peu plein, sourire qui montre les dents, carrure solide.
  '04': {
    height: 0.97, sw: 31, belly: 2, skin: '#8a5636', skinD: '#5e3620', skinL: '#a8714c', blush: '#9a4e34', eye: '#2a1910',
    head: { w: 13.8, cheek: 13.9, jaw: 12.5, chin: 6.2, chinY: 21, crown: -22, jawY: 13.5, cheekY: 4, gaunt: 0 },
    eyes: { sep: 5.5, w: 4.3, h: 1.7, tilt: 0, lid: 0.45, crease: 0.5, bags: 0.4 },
    brows: { color: '#17110d', y: -4.4, thick: 1.15, arch: 0.4, tilt: 2 },
    nose: { len: 10.0, w: 5.2, bridge: 0.45 }, mouth: { y: 14.8, w: 6.2, lip: '#5e2f22', upper: 1.1, lower: 1.6 },
    ears: { size: 1.02, out: 1.0 }, smile: 0.75, teeth: 0.8,
    hair: { style: 'buzzBlack', color: '#151110', hairline: -12.4, recede: 2.6, density: 0.95, sides: 0.9 },
    beard: { style: 'goatee', color: '#121010', grey: 0, density: 1, must: 1, goatee: 1 },
    glasses: { style: 'rectDark' },
    lines: { forehead: 0.1, crow: 0.2, naso: 0.5 },
    female: false, age: 40,
  },
  // Hélène Papadopulo (p_E_lunettes_rouges) : ~35 ans, longs cheveux bruns ondulés tirés en arrière (raie au milieu),
  // front haut, lunettes pantos rouges (rouge vif en haut, bordeaux en bas), yeux vert-noisette, cils marqués,
  // sourire doux bouche fermée, lèvres rosées, taches de rousseur, collier de perles, visage ovale allongé.
  '05': {
    height: 0.93, sw: 24, skin: '#efc0a0', skinD: '#c48464', skinL: '#fbdcc6', blush: '#e48c7c', eye: '#6b6d3c',
    head: { w: 13.2, cheek: 12.8, jaw: 11.0, chin: 5.0, chinY: 21.5, crown: -22.5, jawY: 13.5, cheekY: 4, gaunt: 0 },
    eyes: { sep: 5.3, w: 4.4, h: 1.75, tilt: 1, lid: 0.35, crease: 0.6, bags: 0.15, lashes: 1.0 },
    brows: { color: '#3b2619', y: -4.9, thick: 0.85, arch: 0.35, tilt: 0 },
    nose: { len: 10.0, w: 3.9, bridge: 0.5 }, mouth: { y: 14.6, w: 5.8, lip: '#cf7e86', upper: 0.85, lower: 1.4 },
    ears: { size: 0.95, out: 0.6 }, smile: 0.55, teeth: 0.0,
    hair: { style: 'longBack', color: '#3a2318', hi: '#6e4632' },
    glasses: { style: 'pantoRed' },
    lines: { forehead: 0.0, crow: 0.1, naso: 0.25, freckles: 0.6 },
    female: true, age: 35, pearls: true, tee: '#f5f1ee',
  },
  // Maxime Lombard Dessaix (p_G_couleur_polo_blanc) : ~27 ans, cheveux bruns foncés courts, côtés dégradés (fade),
  // dessus texturé, golfs légers ; fines lunettes rectangulaires noires ; barbe courte fournie et soignée
  // avec moustache ; grand sourire ; oreilles décollées ; teint clair aux joues rosées.
  '06': {
    height: 1.01, sw: 29, skin: '#efc0a2', skinD: '#c08062', skinL: '#fbdac4', blush: '#e5806e', eye: '#4a3020',
    head: { w: 13.6, cheek: 13.4, jaw: 12.6, chin: 6.4, chinY: 21.5, crown: -22, jawY: 14, cheekY: 4, gaunt: 0 },
    eyes: { sep: 5.4, w: 4.3, h: 1.5, tilt: -1, lid: 0.5, crease: 0.5, bags: 0.2, squint: 0.35 },
    brows: { color: '#2e221a', y: -4.4, thick: 1.15, arch: 0.35, tilt: 1 },
    nose: { len: 10.2, w: 4.2, bridge: 0.55 }, mouth: { y: 14.8, w: 6.4, lip: '#c26f66', upper: 0.8, lower: 1.25 },
    ears: { size: 1.12, out: 2.0 }, smile: 0.9, teeth: 0.35,
    hair: { style: 'fade', color: '#2e2119', hi: '#5a4232', hairline: -13.6, recede: 2.8 },
    beard: { style: 'full', color: '#2c1f17', grey: 0, density: 1, must: 1, goatee: 1 },
    glasses: { style: 'rectThin' },
    lines: { forehead: 0, crow: 0.35, naso: 0.4 },
    female: false, age: 27,
  },
  // Samia Fournier (p_I_samia_rose) : ~45 ans, cheveux bruns raides mi-longs (aux épaules) avec reflets caramel,
  // raie sur le côté (à gauche de l'image), grande mèche balayée ; teint mat chaud ; sourcils bruns arqués ;
  // yeux bruns maquillés ; rouge à lèvres prune ; grand sourire qui montre les dents.
  '07': {
    height: 0.93, sw: 24, skin: '#c48b66', skinD: '#935a3c', skinL: '#dba882', blush: '#c86a52', eye: '#3a2214',
    head: { w: 13.4, cheek: 13.2, jaw: 11.4, chin: 5.4, chinY: 21, crown: -22, jawY: 13.5, cheekY: 4, gaunt: 0 },
    eyes: { sep: 5.4, w: 4.4, h: 1.6, tilt: 2, lid: 0.45, crease: 0.6, bags: 0.25, squint: 0.3, lashes: 1.0, liner: 1 },
    brows: { color: '#24160e', y: -4.9, thick: 1.0, arch: 0.65, tilt: 0 },
    nose: { len: 10.0, w: 4.4, bridge: 0.5 }, mouth: { y: 14.6, w: 6.6, lip: '#7e1f36', upper: 1.0, lower: 1.5 },
    ears: { size: 0.95, out: 0.6 }, smile: 1.0, teeth: 1.0,
    hair: { style: 'shoulderSide', color: '#33201a', hi: '#9a6436' },
    lines: { forehead: 0, crow: 0.4, naso: 0.55 },
    female: true, age: 45, tee: '#211a1c',
  },
  // Matthias Girond (p_A_costume_bleu) : ~30 ans, cheveux brun foncé texturés relevés en houppe (côtés plus courts),
  // visage large et carré, joues pleines, yeux vert-noisette, moustache + barbiche légère, barbe de quelques jours,
  // sourire en coin bouche fermée, cou large.
  '08': {
    height: 1.01, sw: 31, skin: '#e8b48f', skinD: '#b9785a', skinL: '#f6d2b6', blush: '#df7c66', eye: '#6f805a',
    head: { w: 14.4, cheek: 14.6, jaw: 13.6, chin: 7.0, chinY: 21, crown: -22, jawY: 13.5, cheekY: 4.5, gaunt: 0 },
    eyes: { sep: 5.5, w: 4.2, h: 1.45, tilt: -1, lid: 0.55, crease: 0.5, bags: 0.25 },
    brows: { color: '#3a281b', y: -4.0, thick: 1.15, arch: 0.3, tilt: 1 },
    nose: { len: 10.4, w: 4.4, bridge: 0.6 }, mouth: { y: 14.8, w: 6.0, lip: '#c07462', upper: 0.85, lower: 1.4 },
    ears: { size: 1.05, out: 1.2 }, smile: 0.45, teeth: 0.0,
    hair: { style: 'quiff', color: '#3a271a', hi: '#6c4c34', hairline: -12.6, recede: 1.6 },
    beard: { style: 'mgoatee', color: '#4a3424', grey: 0, density: 0.75, must: 0.85, goatee: 0.8 },
    lines: { forehead: 0.1, crow: 0.2, naso: 0.4 },
    female: false, age: 30,
  },
};
window.LOOKS = LOOKS;
