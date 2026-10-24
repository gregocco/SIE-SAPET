// Capture déterministe image par image : charge web/index.html, appelle window.renderAt(t), screenshot.
// node capture.js timeline.json --frames DIR --width W --fps F --from a --to b --workers n
// node capture.js timeline.json --stills stills.json --width W
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const tlPath = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const W = parseInt(opt('width', '1920'), 10);
const H = Math.round(W * 9 / 16);
const page_url = 'file://' + path.join(__dirname, 'web', 'index.html');
const TL = JSON.parse(fs.readFileSync(tlPath, 'utf8'));

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 2; });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(page_url);
  await page.evaluate(async ([tl, w]) => { await window.setup(tl, w); }, [TL, W]);
  return page;
}

async function shot(page, t, file, type) {
  await page.evaluate(t => window.renderAt(t), t);
  await page.screenshot({ path: file, type, quality: type === 'jpeg' ? 92 : undefined, clip: { x: 0, y: 0, width: W, height: H } });
}

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu', '--font-render-hinting=none'] });
  const stills = opt('stills');
  if (stills) {
    const list = JSON.parse(fs.readFileSync(stills, 'utf8'));
    const page = await openPage(browser);
    for (const s of list) await shot(page, s.t, s.path, 'png');
    await browser.close();
    return;
  }
  const dir = opt('frames'); const fps = parseFloat(opt('fps', '25'));
  const f0 = parseInt(opt('from', '0'), 10); const f1 = parseInt(opt('to', '0'), 10);
  const nw = parseInt(opt('workers', '4'), 10);
  let next = f0, done = 0; const t0 = Date.now();
  const worker = async () => {
    const page = await openPage(browser);
    while (true) {
      const f = next++; if (f >= f1) break;
      await shot(page, f / fps, path.join(dir, String(f).padStart(6, '0') + '.jpg'), 'jpeg');
      done++;
      if (done % 100 === 0) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`  ${done}/${f1 - f0} images, ${el.toFixed(0)} s, reste ~${(el / done * (f1 - f0 - done)).toFixed(0)} s\n`);
      }
    }
  };
  await Promise.all(Array.from({ length: nw }, worker));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
