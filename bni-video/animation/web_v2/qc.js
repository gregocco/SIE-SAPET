// Contrôles automatiques de mise en forme (exécutés dans la page après chaque renderAt).
// qc(t) -> liste de messages ; qcTimeline(fps) parcourt toute la vidéo sans rendu WebGL (rapide) et ajoute
// les contrôles de continuité (sauts de caméra, ordre des membres, couleurs de ceinture).
'use strict';
(function () {
  const SAFE = { x0: 96, y0: 54, x1: 1824, y1: 1026 };
  const $ = id => document.getElementById(id);
  const scaleK = () => { const st = $('stage'); const m = /scale\(([\d.]+)\)/.exec(st.style.transform || ''); return m ? parseFloat(m[1]) : 1; };
  function box(el) { const r = el.getBoundingClientRect(), k = scaleK(); return [r.left / k, r.top / k, r.right / k, r.bottom / k]; }
  const vis = id => parseFloat($(id).style.opacity || '0');
  const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const area = a => Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);
  const inSafe = b => b[0] >= SAFE.x0 - 0.5 && b[1] >= SAFE.y0 - 0.5 && b[2] <= SAFE.x1 + 0.5 && b[3] <= SAFE.y1 + 0.5;
  const inFrame = (b, m = 0) => b[0] >= -m && b[1] >= -m && b[2] <= 1920 + m && b[3] <= 1080 + m;
  const fmt = b => '[' + b.map(v => Math.round(v)).join(',') + ']';

  function qc(t) {
    const out = [];
    const S = SCENE.S, MEM = SCENE.MEM(), FIN = SCENE.FIN(), BELTS = SCENE.BELTS();
    if (S.nan) out.push('valeur NaN/Infinity dans le SVG');
    const c = S.cam; if (!c || ![...c.pos, ...c.tgt, c.f].every(Number.isFinite)) out.push('caméra non finie');
    // incrustations visibles
    const ov = {};
    for (const id of ['title', 'ftitle', 'fkick', 'bandeau', 'beltHud']) if (vis(id) > 0.02) ov[id] = box($(id).id === 'title' || id === 'ftitle' ? $(id) : $(id));
    // le titre : on mesure le contenu réel (kicker + texte + soulignement), pas la boîte pleine largeur
    if (ov.title) { const b = [...$('title').children].map(box); ov.title = [Math.min(...b.map(x => x[0])), Math.min(...b.map(x => x[1])), Math.max(...b.map(x => x[2])), Math.max(...b.map(x => x[3]))]; }
    if (ov.ftitle) { const b = [...$('ftitle').children].filter(e => parseFloat(e.style.opacity || '1') > 0.02).map(box); ov.ftitle = [Math.min(...b.map(x => x[0])), Math.min(...b.map(x => x[1])), Math.max(...b.map(x => x[2])), Math.max(...b.map(x => x[3]))]; }
    if (ov.fkick) ov.fkick = box($('fkick').firstElementChild);
    const sp = $('subs').querySelector('span');
    if (vis('subs') > 0.02 && sp.textContent) {
      ov.subs = box(sp);
      const lines = sp.getClientRects().length;
      if (lines > 2) out.push(`sous-titre sur ${lines} lignes : « ${sp.textContent} »`);
    }
    for (const [k, b] of Object.entries(ov)) if (!inSafe(b)) out.push(`${k} hors zone sûre ${fmt(b)}`);
    const pairs = [['subs', 'bandeau'], ['subs', 'beltHud'], ['bandeau', 'beltHud'], ['title', 'beltHud'], ['ftitle', 'subs'], ['title', 'subs'], ['ftitle', 'beltHud'], ['fkick', 'subs'], ['fkick', 'ftitle']];
    for (const [a, b] of pairs) if (ov[a] && ov[b] && inter(ov[a], ov[b]) > 4) out.push(`chevauchement ${a} / ${b}`);
    // bandeau : bon nom, bon logo, logo chargé et entier
    const bandId = $('bandeau').dataset.id;
    if (vis('bandeau') > 0.02) {
      const m = MEM.find(x => x.id === bandId);
      if (!m) out.push('bandeau sans membre');
      else {
        if ($('bandeau').querySelector('.nm').textContent !== m.name) out.push(`bandeau : nom incorrect pour ${m.id}`);
        if (t < m.S || t > m.N) out.push(`bandeau de ${m.name} affiché hors de sa séquence`);
        const im = [...$('bandeau').querySelectorAll('img')].filter(x => x.style.display !== 'none');
        if (im.length !== 1 || im[0].dataset.id !== m.id) out.push(`bandeau : mauvais logo pour ${m.name}`);
        else { if (!im[0].complete || !im[0].naturalWidth) out.push(`logo du bandeau non chargé (${m.name})`); const ib = box(im[0]), lb = box($('bandeau').querySelector('.lg')); if (ib[0] < lb[0] - 0.5 || ib[2] > lb[2] + 0.5 || ib[1] < lb[1] - 0.5 || ib[3] > lb[3] + 0.5) out.push(`logo du bandeau coupé (${m.name})`); }
      }
    }
    // avatars
    const Q = S.qc || { avatars: [] };
    const speaker = MEM.find(m => t >= m.S && t < m.N);
    for (const a of Q.avatars) {
      const m = MEM[a.i];
      if (![...a.head, ...a.body].every(Number.isFinite)) out.push(`avatar ${m.id} : coordonnées non finies`);
      if (a.belt && a.belt !== BELTS[a.i]) out.push(`${m.name} : ceinture ${a.belt} au lieu de ${BELTS[a.i]}`);
      if (!a.hasLogo) out.push(`${m.name} : écusson manquant`);
      // visages jamais sous un texte
      const hh = a.head[3] - a.head[1];
      if (hh > 55) for (const [k, b] of Object.entries(ov)) {
        if (vis(k === 'subs' ? 'subs' : k) < 0.3) continue;
        const ia = inter(a.head, b); if (ia > 0.03 * area(a.head)) out.push(`visage de ${m.name} sous ${k} (${Math.round(100 * ia / area(a.head))} %)`);
      }
      // orateur : tête entière dans l'image, écusson visible et non masqué
      if (speaker && speaker.i === a.i && t > m.S + 0.35 && t < m.E) {
        if (!inFrame(a.head)) out.push(`tête de ${m.name} coupée par le cadre ${fmt(a.head)}`);
        if (a.logo && t > m.V && t < m.E && hh > 80) {
          if (!inFrame(a.logo)) out.push(`écusson de ${m.name} coupé par le cadre`);
          if (ov.subs && inter(a.logo, ov.subs) > 0.02 * area(a.logo)) out.push(`écusson de ${m.name} masqué par le sous-titre`);
        }
      }
      // podium et plan de groupe final : tout le monde entier dans le cadre
      if (t > FIN.S + 0.6 && t < FIN.N - 0.9 && !inFrame(a.body, 2)) out.push(`podium : ${m.name} hors cadre ${fmt(a.body)}`);
      const L7 = MEM[7];
      if (t > L7.E + 2.0 && t < L7.N && !inFrame(a.head)) out.push(`plan de groupe : ${m.name} hors cadre`);
    }
    // ouverture : le titre ne doit pas masquer la bannière « Tournoi des partenaires »
    if (ov.title && vis('title') > 0.3 && S.banner) { if (inter(ov.title, S.banner) > 0.02 * area(S.banner)) out.push('titre d’ouverture sur la bannière du dojo'); }
    if (ov.ftitle && vis('ftitle') > 0.3 && S.banner) { if (inter(ov.ftitle, S.banner) > 0.02 * area(S.banner)) out.push('titre final sur la bannière du dojo'); }
    return out;
  }

  // parcours complet sans rendu WebGL : continuité caméra / ordre / ceintures
  function qcTimeline(fps, total) {
    const res = { issues: [], frames: 0 };
    const MEM = SCENE.MEM(), CUTS = SCENE.CUTS();
    let prev = null, prevT = null, bandSeq = [];
    const n = Math.round(total * fps);
    for (let f = 0; f < n; f++) {
      const t = f / fps;
      window.renderAt(t);
      for (const x of qc(t)) res.issues.push(`t=${t.toFixed(2)} ${x}`);
      const c = SCENE.S.cam;
      if (prev) {
        const cut = CUTS.some(ct => ct > prevT - 1e-6 && ct <= t + 1e-6);
        const dp = Math.hypot(c.pos[0] - prev.pos[0], c.pos[1] - prev.pos[1], c.pos[2] - prev.pos[2]), dg = Math.hypot(c.tgt[0] - prev.tgt[0], c.tgt[1] - prev.tgt[1], c.tgt[2] - prev.tgt[2]);
        const df = Math.abs(Math.log(c.f / prev.f));
        if (!cut && (dp > 45 || dg > 60 || df > 0.08)) res.issues.push(`t=${t.toFixed(2)} saut de caméra non prévu (Δpos ${dp.toFixed(0)}, Δvisée ${dg.toFixed(0)})`);
      }
      const b = document.getElementById('bandeau').dataset.id; if (b && bandSeq[bandSeq.length - 1] !== b) bandSeq.push(b);
      prev = { pos: c.pos.slice(), tgt: c.tgt.slice(), f: c.f }; prevT = t; res.frames++;
    }
    const want = MEM.map(m => m.id).join(',');
    if (bandSeq.join(',') !== want) res.issues.push(`ordre des bandeaux ${bandSeq.join(',')} au lieu de ${want}`);
    // ceinture correcte juste après chaque passage
    for (const m of MEM) { const st = SCENE.stateAt(m, m.Tc + 0.6); if (st.pose.belt !== SCENE.BELTS()[m.i]) res.issues.push(`${m.name} : mauvaise ceinture après le passage`); }
    return res;
  }
  window.qc = qc; window.qcTimeline = qcTimeline;
})();
