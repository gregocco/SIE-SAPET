// Assemble le site en UN SEUL fichier HTML autonome (hors-ligne, ouvrable depuis n'importe quel appareil).
// Usage : node tools/build.mjs   ->  dist/sie-prep.html
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

const chapters = readdirSync(join(root, 'content'))
  .filter(f => /^ch-\d+\.json$/.test(f)).sort()
  .map(f => JSON.parse(read('content/' + f)));
import { existsSync } from 'node:fs';
const pairs = [];
for (const c of chapters) {
  const xx = String(c.id).padStart(2, '0'), qf = join(root, 'content/extra', 'ch' + xx + '-q.json'), pf = join(root, 'content/extra', 'ch' + xx + '-pairs.json');
  if (existsSync(qf)) c.questions.push(...JSON.parse(readFileSync(qf, 'utf8')));
  if (existsSync(pf)) JSON.parse(readFileSync(pf, 'utf8')).forEach((p, i) => pairs.push({ ...p, ch: c.id, pi: i }));
}
const index = JSON.parse(read('content/index.json')).map(m => ({ ...m, live: chapters.some(c => c.id === m.id) }));
const glossary = JSON.parse(read('content/glossary.json'));
for (const c of chapters) for (const g of c.glossary || []) if (!glossary.some(x => x.t.toLowerCase() === g.t.toLowerCase())) glossary.push({ t: g.t, d: g.d, ch: c.id });
const pages = JSON.parse(read('content/pages.json'));
const data = { index, glossary, chapters, pages, pairs };

// garde-fous contenu
const ids = new Set();
for (const c of chapters) {
  for (const x of [...c.cards, ...c.questions]) { if (ids.has(x.id)) throw new Error('id en double: ' + x.id); ids.add(x.id); }
  for (const q of c.questions) {
    if (q.o.length !== 4 || q.w.length !== 4 || !(q.a >= 0 && q.a < 4)) throw new Error('question invalide: ' + q.id);
    if (new Set(q.o).size !== 4) throw new Error('options dupliquées: ' + q.id);
  }
}

const html = read('src/index.html')
  .replace('/*CSS*/', () => read('src/styles.css'))
  .replace('/*DATA*/', () => 'window.SIE_DATA=' + JSON.stringify(data).replace(/</g, '\\u003c') + ';')
  .replace('/*JS*/', () => read('src/app.js'));
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/sie-prep.html'), html);
console.log(`OK dist/sie-prep.html  ${(html.length / 1024).toFixed(0)} Ko  ·  ${chapters.length} chapitre(s), ${ids.size} items`);
