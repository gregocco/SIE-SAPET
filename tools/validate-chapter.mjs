// Valide UN fichier de chapitre : node tools/validate-chapter.mjs content/ch-12.json
import { readFileSync } from 'node:fs';
const f = process.argv[2], d = JSON.parse(readFileSync(f, 'utf8')), err = [];
const need = (c, m) => { if (!c) err.push(m); };
const id = d.id;
need(Number.isInteger(id), 'id entier manquant');
for (const k of ['title', 'section']) need(typeof d[k] === 'string' && d[k], k + ' manquant');
need(Number.isFinite(d.minutes), 'minutes manquant');
for (const k of ['brief', 'traps', 'formulas', 'cards', 'questions'].concat(id === 11 ? [] : ['glossary'])) need(Array.isArray(d[k]) && d[k].length, k + ' vide');
(d.brief || []).forEach((s, i) => need(s.h && s.md && s.md.length > 80, 'brief[' + i + '] incomplet'));
(d.traps || []).forEach((t, i) => need(typeof t === 'string' && t.length > 30, 'trap[' + i + '] invalide'));
(d.formulas || []).forEach((x, i) => need(x.name && x.rule && x.example, 'formula[' + i + '] incomplète'));
const ids = new Set();
(d.cards || []).forEach(c => { need(c.id && c.id.startsWith(id + '-c'), 'id carte ' + c.id); need(!ids.has(c.id), 'id dupliqué ' + c.id); ids.add(c.id); need(c.f && c.b && c.r, 'carte incomplète ' + c.id); });
const pos = [0, 0, 0, 0];
(d.questions || []).forEach(q => {
  need(q.id && q.id.startsWith(id + '-q'), 'id question ' + q.id); need(!ids.has(q.id), 'id dupliqué ' + q.id); ids.add(q.id);
  need(q.q && q.r && ['concept', 'scenario', 'calc'].includes(q.k) && [1, 2, 3].includes(q.d), 'champs question ' + q.id);
  need(Array.isArray(q.o) && q.o.length === 4 && new Set(q.o).size === 4, 'options ' + q.id);
  need(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, 'réponse ' + q.id);
  need(Array.isArray(q.w) && q.w.length === 4 && q.w.every(w => typeof w === 'string' && w.length >= 25), 'explications trop courtes ' + q.id);
  if (Number.isInteger(q.a)) pos[q.a]++;
});
(d.glossary || []).forEach((g, i) => need(g.t && g.d, 'glossaire[' + i + ']'));
const n = d.questions ? d.questions.length : 0;
if (n >= 20 && pos.some(c => c / n < 0.15 || c / n > 0.35)) console.log('AVERTISSEMENT positions de réponses déséquilibrées (' + pos.join('/') + ') -> lancer node tools/balance.mjs');
if (err.length) { console.log('INVALIDE (' + err.length + '):\n' + err.slice(0, 25).join('\n')); process.exit(1); }
console.log(`OK ch${id}: brief ${d.brief.length}, pièges ${d.traps.length}, formules ${d.formulas.length}, cartes ${d.cards.length}, QCM ${n} (A/B/C/D = ${pos.join('/')}), glossaire ${(d.glossary || []).length}`);
