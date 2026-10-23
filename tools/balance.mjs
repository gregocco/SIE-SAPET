// Rééquilibre la position de la bonne réponse (A-D) dans chaque chapitre, de façon déterministe.
// Échange la bonne option (et son explication) avec l'option occupant la position cible. Usage : node tools/balance.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
import { existsSync } from 'node:fs';
const targets = readdirSync(dir).filter(f => /^ch-\d+\.json$/.test(f)).map(f => [join(dir, f), 'chapter']);
if (existsSync(join(dir, 'extra'))) readdirSync(join(dir, 'extra')).filter(f => /-q\.json$/.test(f)).forEach(f => targets.push([join(dir, 'extra', f), 'extra']));
for (const [p, kind] of targets) {
  const f = p.split('/').pop();
  const raw = JSON.parse(readFileSync(p, 'utf8')), d = kind === 'extra' ? { questions: raw } : raw;
  let bag = [];
  for (const q of d.questions) {
    if (!bag.length) { bag = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    const t = bag.pop();
    if (q.a !== t) { [q.o[q.a], q.o[t]] = [q.o[t], q.o[q.a]]; [q.w[q.a], q.w[t]] = [q.w[t], q.w[q.a]]; q.a = t; }
  }
  writeFileSync(p, JSON.stringify(kind === 'extra' ? d.questions : d, null, 1));
  const c = [0, 0, 0, 0]; d.questions.forEach(q => c[q.a]++);
  console.log(f, c.join('/'));
}
