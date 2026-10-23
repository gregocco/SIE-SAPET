// Fusionne les morceaux d'un chapitre en content/ch-XX.json puis le valide.
// node tools/merge-parts.mjs <dossier-parts> <numéro>   (fichiers : chXX-meta.json, chXX-cards*.json, chXX-q*.json)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const [dir, n] = process.argv.slice(2), xx = String(n).padStart(2, '0');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(dir).filter(f => f.startsWith(`ch${xx}-`) && f.endsWith('.json')).sort();
const rd = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const meta = rd(`ch${xx}-meta.json`);
meta.cards = files.filter(f => /-cards/.test(f)).flatMap(rd);
meta.questions = files.filter(f => /-q\d*\.json$|-q[a-z0-9]*\.json$/.test(f) && !/-cards|-meta/.test(f)).flatMap(rd);
const out = join(root, 'content', `ch-${xx}.json`);
writeFileSync(out, JSON.stringify(meta, null, 1));
const r = spawnSync('node', [join(root, 'tools/validate-chapter.mjs'), out], { encoding: 'utf8' });
process.stdout.write(r.stdout + r.stderr); process.exit(r.status);
