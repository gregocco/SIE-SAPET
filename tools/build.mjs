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
const data = { index: JSON.parse(read('content/index.json')), glossary: JSON.parse(read('content/glossary.json')), chapters };

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
