const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/home/user/SIE-SAPET/trailer/refs/';
const SETS = {
  details: {
    '7_roue_arriere_jambe':   [[1.5,0.55,2.3],[0.45,0.4,0.9]],
    '8_roue_avant_fourche':   [[3.1,0.75,1.3],[1.9,0.4,0]],
    '9_sieges_tableau_bord':  [[2.4,1.7,1.9],[1.0,0.9,0]],
    '10_moteur_helice_arriere':[[-2.7,1.3,1.7],[-0.5,0.9,0]],
    '11_helice_gros_plan':    [[-1.9,1.0,0.8],[-0.65,0.9,0]],
    '12_nez_aile_trapeze':    [[4.2,0.9,1.6],[1.0,1.9,0]],
  },
  hero: { '0_hero_fond_transparent': [[12,2.0,10],[0.2,1.7,0]] },
};
(async () => {
  const set = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const logs=[]; p.on('pageerror', e => logs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8765/index.html?test=1');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForSelector('body[data-ready="1"]', { timeout: 200000 });
  await p.addStyleTag({ content: '#panel{display:none!important} body{grid-template-columns:1fr!important}' });
  await p.evaluate(() => { const t = window.__t2a; t.applyPreset('base'); t.setWing(true); window.dispatchEvent(new Event('resize')); });
  await p.waitForTimeout(3500);
  if (set === 'hero') await p.evaluate(() => { const t = window.__t2a; t.scene.background = null; t.scene.traverse(o => { if (o.material && o.material.type === 'ShadowMaterial') o.visible = false; }); });
  for (const [name,[pos,tg]] of Object.entries(SETS[set])) {
    await p.evaluate(([pos,tg]) => { const t = window.__t2a; t.camera.position.set(...pos); t.controls.target.set(...tg); t.controls.update(); t.render(); }, [pos,tg]);
    await p.waitForTimeout(300);
    if (set === 'hero') {
      const url = await p.evaluate(() => document.querySelector('#view canvas').toDataURL('image/png'));
      fs.writeFileSync(OUT + name + '.png', Buffer.from(url.split(',')[1], 'base64'));
    } else await p.screenshot({ path: OUT + name + '.png' });
  }
  console.log(logs.join('\n')||'ok'); await b.close();
})();
