const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const logs=[]; p.on('pageerror', e => logs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8765/index.html?test=1');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForSelector('body[data-ready="1"]', { timeout: 200000 });
  await p.addStyleTag({ content: '#panel{display:none!important} body{grid-template-columns:1fr!important}' });
  await p.evaluate(() => { const t = window.__t2a; t.applyPreset('base'); t.setWing(true); window.dispatchEvent(new Event('resize')); });
  await p.waitForTimeout(3500);
  const shots = {
    '1_trois_quarts_avant': [[12,2.0,10],[0.2,1.7,0]],
    '2_profil':             [[0.5,1.8,10.5],[0.5,1.75,0]],
    '3_face':               [[22,2.4,1.2],[0,1.8,0]],
    '4_trois_quarts_arriere':[[-12.5,2.2,9.5],[0.2,1.7,0]],
    '5_dessous':            [[6.8,0.4,4.0],[0.3,2.2,0]],
    '6_dessus':             [[-2,14,7],[0.4,1.8,0]],
  };
  for (const [name,[pos,tg]] of Object.entries(shots)) {
    await p.evaluate(([pos,tg]) => { const t = window.__t2a; t.camera.position.set(...pos); t.controls.target.set(...tg); t.controls.update(); t.render(); }, [pos,tg]);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `/home/user/SIE-SAPET/trailer/refs/${name}.png` });
  }
  console.log(logs.join('\n')||'ok'); await b.close();
})();
