// Capture v2 : un navigateur par travailleur (le rendu WebGL logiciel est sérialisé par processus GPU).
// node capture_v2.js timeline.json --frames DIR --width W --fps F --from a --to b --workers n --qc qc.json
// node capture_v2.js timeline.json --stills stills.json --width W --qc qc.json
// node capture_v2.js timeline.json --check --fps F --width W --qc qc.json     (contrôles sur toutes les images, sans WebGL)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const tlPath = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const has = k => argv.includes('--' + k);
const W = parseInt(opt('width', '1920'), 10);
const H = Math.round(W * 9 / 16);
const page_url = 'file://' + path.join(__dirname, 'web_v2', 'index.html');
const TL = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
const ARGS = ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--font-render-hinting=none', '--ignore-gpu-blocklist'];

async function openPage(browser, noGL) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 2; });
  page.on('console', m => { if (m.type() === 'error' && !/GL Driver|GPU stall/.test(m.text())) { console.error('console:', m.text()); process.exitCode = 2; } });
  await page.goto(page_url);
  if (noGL) await page.evaluate(() => { window.NO_GL = true; });
  await page.evaluate(async ([tl, w]) => { await window.setup(tl, w); }, [TL, W]);
  return page;
}

async function shot(page, t, file, type) {
  const issues = await page.evaluate(t => { window.renderAt(t); window.glFinish(); return window.qc(t); }, t);
  await page.screenshot({ path: file, type, quality: type === 'jpeg' ? 93 : undefined, clip: { x: 0, y: 0, width: W, height: H } });
  return issues.map(x => `t=${t.toFixed(2)} ${x}`);
}

(async () => {
  const qcFile = opt('qc');
  let issues = [];
  if (has('check')) {
    const browser = await chromium.launch({ args: ARGS });
    const page = await openPage(browser, true);
    const fps = parseFloat(opt('fps', '25'));
    const t0 = Date.now();
    const r = await page.evaluate(([fps, total]) => window.qcTimeline(fps, total), [fps, TL.total]);
    console.log(`contrôle : ${r.frames} images en ${((Date.now() - t0) / 1000).toFixed(0)} s, ${r.issues.length} problème(s)`);
    issues = r.issues;
    await browser.close();
  } else if (opt('stills')) {
    const list = JSON.parse(fs.readFileSync(opt('stills'), 'utf8'));
    const nw = Math.max(1, Math.min(parseInt(opt('workers', '2'), 10), list.length));
    let next = 0;
    await Promise.all(Array.from({ length: nw }, async () => {
      const browser = await chromium.launch({ args: ARGS });
      const page = await openPage(browser);
      while (true) { const k = next++; if (k >= list.length) break; issues.push(...await shot(page, list[k].t, list[k].path, 'png')); }
      await browser.close();
    }));
  } else {
    const dir = opt('frames'); const fps = parseFloat(opt('fps', '25'));
    const f0 = parseInt(opt('from', '0'), 10); const f1 = parseInt(opt('to', '0'), 10);
    const nw = parseInt(opt('workers', '4'), 10);
    let next = f0, done = 0; const t0 = Date.now();
    await Promise.all(Array.from({ length: nw }, async () => {
      const browser = await chromium.launch({ args: ARGS });
      const page = await openPage(browser);
      while (true) {
        const f = next++; if (f >= f1) break;
        issues.push(...await shot(page, f / fps, path.join(dir, String(f).padStart(6, '0') + '.jpg'), 'jpeg'));
        done++;
        if (done % 100 === 0) { const el = (Date.now() - t0) / 1000; process.stdout.write(`  ${done}/${f1 - f0} images, ${el.toFixed(0)} s, reste ~${(el / done * (f1 - f0 - done)).toFixed(0)} s\n`); }
      }
      await browser.close();
    }));
  }
  issues.sort();
  if (qcFile) fs.writeFileSync(qcFile, JSON.stringify(issues, null, 1));
  if (issues.length) { console.error(`CONTRÔLES : ${issues.length} problème(s)`); for (const x of issues.slice(0, 40)) console.error('  ' + x); }
})().catch(e => { console.error(e); process.exit(1); });
