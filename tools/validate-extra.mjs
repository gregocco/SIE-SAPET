// Valide content/extra/chXX-q.json (questions de renfort) et chXX-pairs.json (tri X ou Y). node tools/validate-extra.mjs 12
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const n = +process.argv[2], xx = String(n).padStart(2, '0'), dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const err = [], need = (c, m) => { if (!c) err.push(m); };
const qf = join(dir, 'extra', `ch${xx}-q.json`), pf = join(dir, 'extra', `ch${xx}-pairs.json`);
need(existsSync(qf) && existsSync(pf), 'fichiers extra manquants');
if (!err.length) {
  const base = JSON.parse(readFileSync(join(dir, `ch-${xx}.json`), 'utf8')), ids = new Set([...base.questions, ...base.cards].map(x => x.id));
  const qs = JSON.parse(readFileSync(qf, 'utf8')), ps = JSON.parse(readFileSync(pf, 'utf8'));
  need(Array.isArray(qs) && qs.length >= 5, 'trop peu de questions'); need(Array.isArray(ps) && ps.length >= 3, 'trop peu de paires');
  qs.forEach(q => {
    need(q.id && q.id.startsWith(n + '-x'), 'id ' + q.id); need(!ids.has(q.id), 'id dupliqué ' + q.id); ids.add(q.id);
    need(q.q && q.r && ['concept', 'scenario', 'calc'].includes(q.k) && [1, 2, 3].includes(q.d), 'champs ' + q.id);
    need(Array.isArray(q.o) && q.o.length === 4 && new Set(q.o).size === 4, 'options ' + q.id);
    need(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, 'réponse ' + q.id);
    need(Array.isArray(q.w) && q.w.length === 4 && q.w.every(w => typeof w === 'string' && w.length >= 25), 'explications ' + q.id);
  });
  ps.forEach((p, i) => {
    need(p.title && p.a && p.b && Array.isArray(p.items) && p.items.length >= 5, 'paire ' + i);
    (p.items || []).forEach((it, k) => need(it.s && ['a', 'b'].includes(it.v) && typeof it.w === 'string' && it.w.length >= 20, `paire ${i} item ${k}`));
    const na = (p.items || []).filter(x => x.v === 'a').length; need(na >= 2 && (p.items || []).length - na >= 2, 'paire ' + i + ' déséquilibrée');
  });
  if (!err.length) console.log(`OK ch${n} extra: ${qs.length} questions de renfort, ${ps.length} paires (${ps.reduce((s, p) => s + p.items.length, 0)} items)`);
}
if (err.length) { console.log('INVALIDE:\n' + err.slice(0, 20).join('\n')); process.exit(1); }
