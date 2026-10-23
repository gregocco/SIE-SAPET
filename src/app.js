(function () {
'use strict';
const DATA = window.SIE_DATA;
const META = DATA.index;
const CHAPTERS = {};
DATA.chapters.forEach(c => (CHAPTERS[c.id] = c));
const ITEMS = [];
DATA.chapters.forEach(c => {
  c.cards.forEach(x => ITEMS.push({ kind: 'card', ch: c.id, id: x.id, x }));
  c.questions.forEach(x => ITEMS.push({ kind: 'q', ch: c.id, id: x.id, x }));
});
const BYID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const QUESTIONS = ITEMS.filter(i => i.kind === 'q');

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
function md(src) {
  const L = src.split('\n'); let out = '', i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('|')) {
      const rows = []; while (i < L.length && L[i].startsWith('|')) rows.push(L[i++]);
      const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]), body = rows.slice(2).map(cells);
      out += '<div class="tw"><table><thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>' +
        body.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ord = /^\d/.test(l), it = [];
      while (i < L.length && /^(- |\d+\. )/.test(L[i])) it.push(L[i++].replace(/^(- |\d+\. )/, ''));
      out += (ord ? '<ol>' : '<ul>') + it.map(x => '<li>' + inline(x) + '</li>').join('') + (ord ? '</ol>' : '</ul>');
      continue;
    }
    if (l.startsWith('> ')) { const t = []; while (i < L.length && L[i].startsWith('> ')) t.push(L[i++].slice(2)); out += '<div class="tip">' + inline(t.join(' ')) + '</div>'; continue; }
    out += '<p>' + inline(l) + '</p>'; i++;
  }
  return out;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const money = n => (n < 0 ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
const LET = ['A', 'B', 'C', 'D'];
const clean = w => { const t = w.replace(/^(Correct|Wrong)(: |\.|—)?\s*/i, ''); return t.length > 3 ? t.charAt(0).toUpperCase() + t.slice(1) : w; };
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);

/* ---------- store ---------- */
const KEY = 'sie-prep.v1';
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
S = Object.assign({ rec: {}, exams: [], examDate: null, theme: 'auto', log: {}, flags: {} }, S || {});
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
function applyTheme() { const r = document.documentElement; if (S.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.theme); }

/* ---------- spaced repetition (Leitner) ---------- */
const INT = [0, 1, 3, 7, 14, 30];
function grade(id, ok, easy) {
  const r = S.rec[id] || (S.rec[id] = { b: 0, due: 0, n: 0, w: 0 });
  r.n++;
  if (ok) r.b = Math.min(5, r.b + (easy ? 2 : 1)); else { r.b = 0; r.w++; }
  r.due = today() + INT[r.b];
  S.log[today()] = (S.log[today()] || 0) + 1;
  save();
}
const isDue = i => { const r = S.rec[i.id]; return r && r.due <= today(); };
const isNew = i => !S.rec[i.id];
function mastery(chId) {
  const its = ITEMS.filter(i => i.ch === chId); if (!its.length) return 0;
  return its.reduce((s, i) => s + (S.rec[i.id] ? Math.min(5, S.rec[i.id].b) / 5 : 0), 0) / its.length;
}
function accuracy() {
  let n = 0, w = 0; QUESTIONS.forEach(q => { const r = S.rec[q.id]; if (r) { n += r.n; w += r.w; } });
  return n ? Math.round((1 - w / n) * 100) : null;
}

/* ---------- drills (generated, unlimited) ---------- */
const ri = (a, b, st = 1) => a + Math.floor(Math.random() * ((b - a) / st + 1)) * st;
const DRILLS = [
  { id: 'initial', ch: 11, title: 'Initial margin deposit', sub: 'Reg T 50% vs FINRA $2,000 minimums', gen() {
      const type = pick(['long', 'short', 'cash']);
      const px = pick([10, 12, 15, 20, 25, 32, 40, 48, 60]), sh = pick([100, 100, 200, 500, 1000]);
      const v = px * sh; let ans, steps;
      if (type === 'cash') { ans = v; steps = ['Cash account → pay 100% of the price.', `${money(v)}`]; }
      else if (type === 'long') {
        ans = v <= 2000 ? v : v <= 4000 ? 2000 : v / 2;
        steps = [`Value = ${sh} × $${px} = ${money(v)}.`, v <= 2000 ? 'Up to $2,000 → 100% of price (FINRA).' : v <= 4000 ? '$2,000–$4,000 → flat $2,000 (FINRA minimum).' : 'Over $4,000 → 50% (Reg T).'];
      } else {
        ans = v <= 4000 ? 2000 : v / 2;
        steps = [`Short value = ${sh} × $${px} = ${money(v)}.`, v <= 4000 ? 'Short sale up to $4,000 → $2,000 minimum.' : 'Over $4,000 → 50% (Reg T).'];
      }
      const what = type === 'cash' ? `buy ${sh} shares at $${px} in a CASH account` : type === 'long' ? `buy ${sh} shares at $${px} in a MARGIN account` : `sell short ${sh} shares at $${px} in a MARGIN account`;
      return { q: `A customer wants to ${what}. What is the minimum cash deposit required to open the position?`, ans, unit: '$', steps, tip: 'Small trades are where the FINRA minimums bite: check the size BEFORE halving.' };
    } },
  { id: 'longmaint', ch: 11, title: 'Long margin: maintenance call', sub: '25% of long market value', gen() {
      const mv = ri(40, 200, 5) * 1000, debit = Math.round(mv * (ri(70, 84) / 100) / 500) * 500;
      const eq = mv - debit, req = mv * 0.25, call = Math.max(0, req - eq);
      return { q: `A long margin account holds securities worth ${money(mv)} with a debit balance of ${money(debit)}. How large is the maintenance call? (Enter 0 if none.)`, ans: call, unit: '$',
        steps: [`Equity = MV − debit = ${money(mv)} − ${money(debit)} = ${money(eq)}.`, `Requirement = 25% × ${money(mv)} = ${money(req)}.`, call ? `Call = ${money(req)} − ${money(eq)} = ${money(call)}.` : 'Equity ≥ requirement → no call.'], tip: 'Work in thousands on the small calculator: 60 × .25 = 15.' };
    } },
  { id: 'shortmaint', ch: 11, title: 'Short margin: maintenance call', sub: '30% of short market value', gen() {
      const sh = pick([100, 500, 1000]), p0 = pick([20, 30, 40, 50, 60]), p1 = Math.round(p0 * (1 + ri(10, 45) / 100));
      const credit = 1.5 * sh * p0, smv = sh * p1, eq = credit - smv, req = 0.3 * smv, call = Math.max(0, req - eq);
      return { q: `A customer sold short ${sh} shares at $${p0} and deposited the initial Reg T requirement. The stock now trades at $${p1}. What is the maintenance call? (Enter 0 if none.)`, ans: call, unit: '$',
        steps: [`Short proceeds = ${money(sh * p0)}; deposit 50% = ${money(0.5 * sh * p0)} → credit balance ${money(credit)}.`, `SMV now = ${sh} × $${p1} = ${money(smv)}.`, `Equity = credit − SMV = ${money(eq)}.`, `Requirement = 30% × ${money(smv)} = ${money(req)}.`, call ? `Call = ${money(call)}.` : 'No call.'], tip: 'Shorts: equity = credit balance − SMV. Requirement is 30%, not 25%.' };
    } },
  { id: 'sipc', ch: 11, title: 'SIPC coverage', sub: '$500k per customer, max $250k cash', gen() {
      const sec = ri(0, 600, 25) * 1000, cash = ri(0, 400, 25) * 1000, cc = Math.min(cash, 250000), ans = Math.min(500000, sec + cc);
      return { q: `A brokerage fails. A customer’s single account holds ${money(sec)} of securities and ${money(cash)} of cash. What is the maximum amount SIPC protects?`, ans, unit: '$',
        steps: [`Cash counts up to $250,000 → ${money(cc)}.`, `Securities + covered cash = ${money(sec + cc)}.`, `Cap at $500,000 → ${money(ans)}.`], tip: 'The $250k cash limit sits INSIDE the $500k total.' };
    } },
  { id: 'basis', ch: 11, title: 'Inherited shares: gain per share', sub: 'Stepped-up basis', gen() {
      const buy = ri(10, 40, 2), death = buy + ri(4, 30, 2), sale = death + pick([-6, -4, 2, 4, 6, 8]);
      return { q: `An investor buys stock at $${buy}. The investor dies when it trades at $${death}. The heir sells at $${sale}. What is the heir’s gain (or loss, as a negative number) per share?`, ans: sale - death, unit: '$',
        steps: [`Heir’s basis is stepped up to the date-of-death value: $${death}.`, `Gain = $${sale} − $${death} = $${sale - death}.`], tip: 'The original purchase price is irrelevant to the heir.' };
    } }
];
function drillSet(id, n = 5) { const d = DRILLS.find(x => x.id === id); return Array.from({ length: n }, () => ({ kind: 'drill', id: 'drill:' + id, drill: d, p: d.gen() })); }

/* ---------- sessions ---------- */
let RUN = null;
function startRun(title, items, opts = {}) {
  if (!items.length) { toast('Nothing to study here yet.'); return; }
  RUN = { title, items: items.slice(), i: 0, done: 0, ok: 0, misses: [], state: 'ask', picked: null, shown: false, back: opts.back || '#/' };
  go('#/run');
}
function sessionReview() {
  const due = shuffle(ITEMS.filter(isDue)).slice(0, 30);
  const fresh = shuffle(ITEMS.filter(isNew)).slice(0, due.length >= 25 ? 0 : 12);
  return due.concat(fresh);
}
function chQuiz(ch, n) {
  const qs = QUESTIONS.filter(q => q.ch === ch);
  const scored = shuffle(qs).sort((a, b) => ((S.rec[a.id] ? S.rec[a.id].b : -1) - (S.rec[b.id] ? S.rec[b.id].b : -1)));
  return shuffle(scored.slice(0, n || qs.length));
}
function chCards(ch) {
  const cs = ITEMS.filter(i => i.kind === 'card' && i.ch === ch);
  const ord = shuffle(cs).sort((a, b) => (isDue(b) ? 1 : 0) - (isDue(a) ? 1 : 0) || (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0));
  return ord.slice(0, 20);
}
const weakItems = () => shuffle(ITEMS.filter(i => S.rec[i.id] && S.rec[i.id].w > 0 && S.rec[i.id].b < 3)).slice(0, 20);

/* ---------- toast ---------- */
let toastT;
function toast(m) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:12px;z-index:80;font-weight:600;font-size:.9rem'; document.body.appendChild(t); } t.textContent = m; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => (t.style.display = 'none'), 2200); }

/* ---------- views ---------- */
const ICON = {
  today: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  learn: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5"/></svg>',
  practice: '<svg viewBox="0 0 24 24"><path d="M13 3L4 14h7l-1 7 9-11h-7z"/></svg>',
  exam: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',
  gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>'
};
const SEC_COL = { 'Capital Markets': '#2a56e8', 'Products': '#7c3aed', 'Accounts': '#0f9d8a', 'Regulation': '#d97706' };
const BLUEPRINT = [['Products & Risks', 44, '#7c3aed'], ['Accounts & Trading', 31, '#0f9d8a'], ['Capital Markets', 16, '#2a56e8'], ['Regulation', 9, '#d97706']];

function ring(p) {
  const r = 19, c = 2 * Math.PI * r;
  return `<div class="ring"><svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="${r}" fill="none" stroke="var(--line)" stroke-width="5"/><circle cx="23" cy="23" r="${r}" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="${p > 0 ? 'round' : 'butt'}" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}"/></svg><span class="num">${Math.round(p * 100)}</span></div>`;
}
const prio = p => ({ high: ['high', 'High value'], med: ['med', 'Medium'], low: ['low', 'Express'] }[p]);

function viewHome() {
  const dueN = ITEMS.filter(isDue).length, newN = ITEMS.filter(isNew).length, acc = accuracy();
  const days = S.examDate ? Math.ceil((new Date(S.examDate + 'T00:00:00') - new Date()) / 864e5) : null;
  const answered = Object.values(S.rec).reduce((s, r) => s + r.n, 0);
  const mastered = Object.values(S.rec).filter(r => r.b >= 3).length;
  const hero = `<section class="card hero"><div class="eyebrow" style="color:rgba(255,255,255,.75)">SIE exam</div>
    ${days === null ? `<div class="big" style="margin-top:8px">Set your date</div><p class="muted">A countdown keeps the plan honest.</p><button class="btn primary" data-act="settings">Set exam date</button>`
      : `<div class="big num" style="margin-top:8px">${Math.max(days, 0)} <span style="font-size:1.1rem;font-weight:650">days to go</span></div><p class="muted">${esc(new Date(S.examDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · pass mark 70%</p>`}
  </section>`;
  const plan = `<section class="card"><div class="row"><div style="flex:1"><div class="eyebrow">Today</div><h2 style="margin-top:4px">${dueN ? `${dueN} item${dueN > 1 ? 's' : ''} due for review` : 'Nothing due — learn something new'}</h2>
    <p class="muted small">${newN} new item${newN === 1 ? '' : 's'} available. A short daily review beats weekend cramming.</p></div></div>
    <div class="row wrapx" style="margin-top:12px"><button class="btn primary" data-act="review">${dueN ? 'Start review' : 'Study new material'}</button><a class="btn" href="#/learn/11/brief">Read a chapter</a></div></section>`;
  const stats = `<div class="grid3"><div class="stat"><span class="tiny muted">Answered</span><b class="num">${answered}</b></div><div class="stat"><span class="tiny muted">Accuracy</span><b class="num">${acc === null ? '—' : acc + '%'}</b></div><div class="stat"><span class="tiny muted">Mastered</span><b class="num">${mastered}</b></div></div>`;
  const bp = `<section class="card"><h3>What the exam tests</h3><p class="muted small">75 scored questions. Where the points are:</p>
    <div class="bp" style="margin-top:10px">${BLUEPRINT.map(([n, w, c]) => `<div style="flex:${w};background:${c}">${w}%</div>`).join('')}</div>
    <div class="row wrapx tiny muted" style="margin-top:8px;gap:12px">${BLUEPRINT.map(([n, w, c]) => `<span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${c};margin-right:5px"></i>${n}</span>`).join('')}</div></section>`;
  const live = META.filter(m => m.live).map(m => chRow(m)).join('');
  return `<div class="stack">${hero}${plan}${stats}<section><div class="row" style="margin:6px 0 10px"><h2 style="flex:1">Your chapters</h2><a class="small" href="#/learn" style="color:var(--accent);font-weight:650;text-decoration:none">All 14 →</a></div><div class="card" style="padding:0">${live}</div><p class="muted small" style="margin-top:10px">More chapters unlock as they’re produced. Highest-value first.</p></section>${bp}</div>`;
}
function chRow(m) {
  const p = prio(m.priority);
  return `<a class="ch-item ${m.live ? '' : 'off'}" href="#/learn/${m.id}/brief" style="border-top:1px solid var(--line)"><div class="ch-no">${m.id}</div>
    <div style="flex:1;min-width:0"><div style="font-weight:700">${esc(m.title)}</div><div class="row wrapx" style="gap:6px;margin-top:4px"><span class="pill ${p[0]}">${p[1]}</span><span class="pill">${esc(m.estQ)} Q</span>${m.live ? '' : '<span class="pill">Coming</span>'}</div></div>
    ${m.live ? ring(mastery(m.id)) : ''}</a>`;
}
function viewLearn() {
  const secs = ['Accounts', 'Products', 'Capital Markets', 'Regulation'];
  return `<div class="stack"><div><h1>Learn</h1><p class="muted">Ordered by expected points per hour of study, not by page number. “Q” is the estimated number of exam questions.</p></div>` +
    secs.map(s => `<section><div class="eyebrow" style="margin:6px 4px 8px;color:${SEC_COL[s]}">${s}</div><div class="card" style="padding:0">${META.filter(m => m.section === s).map(chRow).join('').replace('border-top:1px solid var(--line)', '')}</div></section>`).join('') + '</div>';
}
function viewChapter(id, tab) {
  const c = CHAPTERS[id], m = META.find(x => x.id === +id);
  if (!c) return `<div class="empty"><h2>Not produced yet</h2><p>This chapter is planned for a later lot.</p><a class="btn" href="#/learn">Back</a></div>`;
  const tabs = ['brief', 'traps', 'formulas', 'cards', 'quiz'], names = { brief: 'Brief', traps: 'Traps', formulas: 'Formulas', cards: 'Cards', quiz: 'Test' };
  const seg = `<div class="seg">${tabs.map(t => `<a href="#/learn/${id}/${t}" class="${t === tab ? 'on' : ''}">${names[t]}</a>`).join('')}</div>`;
  let body = '';
  if (tab === 'brief') body = c.brief.map((s, i) => `<section class="card prose"><div class="eyebrow">${id}.${i + 1}</div><h3 style="margin:4px 0 8px">${esc(s.h)}</h3>${md(s.md)}</section>`).join('') + `<div class="row"><button class="btn primary block" data-act="chquiz" data-ch="${id}">Test yourself on this chapter</button></div>`;
  else if (tab === 'traps') body = `<section class="card"><h3>Exam traps</h3><p class="muted small">Where candidates lose points. Read these the day before the exam.</p>${c.traps.map((t, i) => `<div class="trap"><i>${i + 1}</i><div class="prose">${md(t)}</div></div>`).join('')}</section>`;
  else if (tab === 'formulas') body = c.formulas.map(f => `<section class="card"><h3>${esc(f.name)}</h3><div class="formula prose" style="margin-top:10px">${md(f.rule)}<div class="ex"><span class="eyebrow">Example</span><div>${inline(f.example)}</div></div></div></section>`).join('') +
    `<div class="card"><h3>Practice the maths</h3><p class="muted small">Generated problems, unlimited. Same calculator constraints as exam day.</p><a class="btn primary block" href="#/practice" style="margin-top:8px">Go to drills</a></div>`;
  else if (tab === 'cards') {
    const d = ITEMS.filter(i => i.kind === 'card' && i.ch === +id);
    body = `<button class="btn primary block" data-act="chcards" data-ch="${id}">Study flashcards (${Math.min(20, d.length)} of ${d.length})</button><section class="card" style="margin-top:14px"><h3>All cards</h3><ul class="list" style="margin-top:6px">${d.map(i => `<li style="padding:10px 0"><div style="font-weight:650">${esc(i.x.f)}</div><div class="muted small">${inline(i.x.b)}</div></li>`).join('')}</ul></section>`;
  } else {
    const qs = QUESTIONS.filter(q => q.ch === +id).length;
    body = `<div class="stack"><section class="card"><h3>Practice questions</h3><p class="muted small">${qs} original questions. Every wrong answer is explained.</p><div class="row wrapx" style="margin-top:10px"><button class="btn primary" data-act="chquiz" data-ch="${id}" data-n="15">Quick quiz · 15</button><button class="btn" data-act="chquiz" data-ch="${id}" data-n="0">All ${qs}</button></div></section>
    <section class="card"><h3>Calculation drills</h3><ul class="list" style="margin-top:6px">${DRILLS.filter(d => d.ch === +id).map(d => `<li><button class="row" style="width:100%;background:none;border:0;padding:12px 0;text-align:left" data-act="drill" data-id="${d.id}"><div style="flex:1"><div style="font-weight:650">${esc(d.title)}</div><div class="muted small">${esc(d.sub)}</div></div><span class="pill acc">5 problems</span></button></li>`).join('')}</ul></section></div>`;
  }
  return `<div class="stack"><div class="row"><a class="icon-btn" href="#/learn" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a><div style="flex:1;min-width:0"><div class="eyebrow">Chapter ${id} · ${esc(m.section)}</div><h1>${esc(c.title)}</h1></div>${ring(mastery(+id))}</div>
    <div class="row wrapx" style="gap:6px"><span class="pill ${prio(m.priority)[0]}">${prio(m.priority)[1]}</span><span class="pill">${esc(m.estQ)} exam questions</span><span class="pill">${m.notes} flagged concepts</span><span class="pill">~${c.minutes} min</span></div>${seg}${body}</div>`;
}
function viewPractice() {
  const due = ITEMS.filter(isDue).length, weak = ITEMS.filter(i => S.rec[i.id] && S.rec[i.id].w > 0 && S.rec[i.id].b < 3).length;
  return `<div class="stack"><div><h1>Practice</h1><p class="muted">Test first, read later. Wrong answers come back sooner.</p></div>
  <section class="card"><div class="row"><div style="flex:1"><h3>Daily review</h3><p class="muted small">${due} due · new items fill the gap</p></div><button class="btn primary" data-act="review">Start</button></div></section>
  <section class="card"><div class="row"><div style="flex:1"><h3>Weak spots</h3><p class="muted small">${weak} item${weak === 1 ? '' : 's'} you’ve missed and not yet recovered</p></div><button class="btn" data-act="weak" ${weak ? '' : 'disabled'}>Drill</button></div></section>
  <section class="card"><h3>Mixed quiz</h3><p class="muted small">Random questions from every available chapter.</p><div class="row wrapx" style="margin-top:10px"><button class="btn primary" data-act="mixed" data-n="10">10 questions</button><button class="btn" data-act="mixed" data-n="25">25 questions</button></div></section>
  <section class="card"><h3>Calculation drills</h3><p class="muted small">Numbers are generated on the fly. Do them until they feel automatic.</p><ul class="list" style="margin-top:6px">${DRILLS.map(d => `<li><button class="row" style="width:100%;background:none;border:0;padding:12px 0;text-align:left" data-act="drill" data-id="${d.id}"><div style="flex:1"><div style="font-weight:650">${esc(d.title)}</div><div class="muted small">Ch. ${d.ch} · ${esc(d.sub)}</div></div><span class="pill acc">5</span></button></li>`).join('')}</ul></section>
  <a class="card row" href="#/glossary" style="text-decoration:none;color:inherit"><div style="flex:1"><h3>Glossary</h3><p class="muted small">${DATA.glossary.length} terms, searchable</p></div><span>›</span></a></div>`;
}
function viewGlossary() {
  return `<div class="stack"><div class="row"><a class="icon-btn" href="#/practice" aria-label="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a><h1>Glossary</h1></div><input class="search" id="gq" placeholder="Search a term…" autocomplete="off"><div class="card" style="padding:0 16px"><ul class="list" id="gl">${glossHtml('')}</ul></div></div>`;
}
const glossHtml = q => { const l = DATA.glossary.filter(g => (g.t + ' ' + g.d).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.t.localeCompare(b.t)); return l.length ? l.map(g => `<li style="padding:12px 0"><div style="font-weight:700">${esc(g.t)}</div><div class="muted small">${inline(g.d)}</div></li>`).join('') : '<li class="empty">No match.</li>'; };

/* ---------- runner ---------- */
function viewRun() {
  if (!RUN) return '<div class="empty">No session.</div>';
  const R = RUN;
  if (R.i >= R.items.length) return runFinish();
  const it = R.items[R.i], pct = Math.round(R.done / R.items.length * 100);
  let body = '';
  if (it.kind === 'q') {
    const q = it.x;
    body = `<div class="eyebrow">Question · §${esc(q.r)}</div><div class="qstem" style="margin-top:8px">${esc(q.q)}</div>` +
      q.o.map((o, k) => { let cl = ''; if (R.state === 'show') { if (k === q.a) cl = 'ok'; else if (k === R.picked) cl = 'bad'; cl += ' locked'; } return `<button class="opt ${cl}" data-act="pick" data-k="${k}"><b>${LET[k]}</b><span>${esc(o)}</span></button>`; }).join('');
    if (R.state === 'show') body += `<div class="why"><b>${R.picked === q.a ? '✓ Correct' : '✗ Not quite'}</b><ul class="list" style="margin-top:6px">${q.w.map((w, k) => `<li class="${k === q.a ? 'c' : ''}"><b>${LET[k]}.</b> ${esc(clean(w))}</li>`).join('')}</ul><div class="row" style="margin-top:8px"><span class="pill">Manual §${esc(q.r)}</span><button class="btn sm ghost" data-act="flag" data-id="${it.id}">${S.flags[it.id] ? '⚑ Flagged' : '⚑ Flag as doubtful'}</button></div></div><button class="btn primary block" style="margin-top:14px" data-act="next">${R.i + 1 >= R.items.length ? 'Finish' : 'Next'}</button>`;
  } else if (it.kind === 'card') {
    const c = it.x;
    body = `<div class="eyebrow">Flashcard · §${esc(c.r)}</div><div class="flip" style="margin-top:10px"><div class="flipcard" data-act="flip">${R.shown ? `<div class="a">${inline(c.b)}</div>` : `<div class="q">${esc(c.f)}</div>`}</div></div>`;
    body += R.shown ? `<div class="grid3" style="margin-top:14px"><button class="btn" data-act="gcard" data-g="0" style="color:var(--bad)">Missed</button><button class="btn primary" data-act="gcard" data-g="1">Got it</button><button class="btn" data-act="gcard" data-g="2">Easy</button></div>` : `<button class="btn primary block" style="margin-top:14px" data-act="flip">Show answer</button>`;
  } else {
    const p = it.p;
    body = `<div class="eyebrow">Drill · ${esc(it.drill.title)}</div><div class="qstem" style="margin-top:8px">${esc(p.q)}</div>`;
    if (R.state === 'ask') body += `<div style="margin-top:14px"><input class="num-in" id="dans" inputmode="decimal" placeholder="Answer in ${p.unit === '$' ? 'dollars' : ''}" autocomplete="off"></div><button class="btn primary block" style="margin-top:12px" data-act="dcheck">Check</button>`;
    else body += `<div class="why"><b>${R.picked ? '✓ Correct' : '✗ Answer: ' + money(p.ans)}</b><ol style="margin:8px 0 0;padding-left:1.2em">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="tip">${esc(p.tip)}</div></div><button class="btn primary block" style="margin-top:14px" data-act="next">${R.i + 1 >= R.items.length ? 'Finish' : 'Next'}</button>`;
  }
  return `<div class="run-top"><button class="icon-btn" data-act="quit" aria-label="Close">✕</button><div class="bar"><i style="width:${pct}%"></i></div><span class="small muted num">${Math.min(R.done + 1, R.items.length)}/${R.items.length}</span></div><div class="card">${body}</div>`;
}
function runFinish() {
  const R = RUN, tot = R.done || 1, p = Math.round(R.ok / tot * 100);
  const miss = R.misses.map(i => i.kind === 'q' ? `<li style="padding:10px 0"><div style="font-weight:600">${esc(i.x.q)}</div><div class="small" style="color:var(--ok)">✓ ${esc(i.x.o[i.x.a])}</div></li>` : i.kind === 'card' ? `<li style="padding:10px 0"><div style="font-weight:600">${esc(i.x.f)}</div><div class="small" style="color:var(--ok)">${inline(i.x.b)}</div></li>` : '').join('');
  return `<div class="stack"><section class="card" style="text-align:center"><div class="eyebrow">${esc(R.title)}</div><div class="score num" style="margin-top:8px">${p}%</div><p class="muted">${R.ok} of ${tot} correct</p><div class="row wrapx" style="justify-content:center;margin-top:10px"><button class="btn primary" data-act="again">Another round</button><a class="btn" href="${R.back}">Done</a></div></section>
  ${R.misses.length ? `<section class="card"><h3>To revisit (${R.misses.length})</h3><ul class="list">${miss}</ul></section>` : ''}</div>`;
}
function advance(ok) {
  const R = RUN, it = R.items[R.i];
  R.done++; if (ok) R.ok++; else { R.misses.push(it); if (!it.retry) R.items.push(Object.assign({}, it, { retry: true, p: it.kind === 'drill' ? it.drill.gen() : undefined })); }
  R.i++; R.state = 'ask'; R.picked = null; R.shown = false;
  // retried items don't count toward the score twice
  if (it.retry) { R.done--; if (ok) R.ok--; }
}

/* ---------- exam ---------- */
let EX = null, exTimer = null;
function viewExam() {
  const n = Math.min(QUESTIONS.length, 20), mins = Math.round(n * 1.4);
  const hist = S.exams.slice(-5).reverse().map(e => `<li class="row" style="padding:12px 0"><div style="flex:1"><div style="font-weight:650">${new Date(e.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${e.n} Q</div><div class="muted small">${e.mins} min</div></div><span class="pill ${e.pct >= 70 ? 'low' : 'high'}">${e.pct}%</span></li>`).join('');
  return `<div class="stack"><div><h1>Exam simulator</h1><p class="muted">Real format: 4 choices, no feedback until the end, flag and review, small-calculator discipline.</p></div>
  <section class="card"><h3>Mini exam · ${n} questions</h3><p class="muted small">${mins} minutes (the real exam gives ~1.4 min per question). Built from the ${QUESTIONS.length} questions currently available.</p><button class="btn primary block" style="margin-top:12px" data-act="exstart" data-n="${n}">Start mini exam</button></section>
  <section class="card" style="opacity:.75"><h3>Full simulation · 75 questions · 1 h 45</h3><p class="muted small">Unlocks when at least 150 questions are available (${QUESTIONS.length} now). Matches the official weights: 12 / 33 / 23 / 7.</p><button class="btn block" style="margin-top:12px" disabled>Locked</button></section>
  ${hist ? `<section class="card"><h3>Recent attempts</h3><ul class="list">${hist}</ul></section>` : ''}</div>`;
}
function exStart(n) {
  const qs = shuffle(QUESTIONS).slice(0, n);
  EX = { qs, ans: qs.map(() => null), flag: qs.map(() => false), i: 0, mins: Math.round(n * 1.4), end: Date.now() + Math.round(n * 1.4) * 60000, grid: false, result: null };
  clearInterval(exTimer); exTimer = setInterval(tick, 1000); go('#/exam/run');
}
function tick() { const el = $('#tm'); if (!EX || EX.result) { clearInterval(exTimer); return; } const left = Math.max(0, Math.round((EX.end - Date.now()) / 1000)); if (el) el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); if (!left) exFinish(); }
function viewExamRun() {
  if (!EX) return '<div class="empty">No exam in progress.</div>';
  if (EX.result) return viewExamResult();
  const q = EX.qs[EX.i].x, left = Math.max(0, Math.round((EX.end - Date.now()) / 1000));
  const grid = EX.grid ? `<section class="card" style="margin-bottom:12px"><div class="qgrid">${EX.qs.map((_, k) => `<button data-act="exgo" data-k="${k}" class="${EX.ans[k] !== null ? 'a' : ''} ${EX.flag[k] ? 'f' : ''} ${k === EX.i ? 'cur' : ''}">${k + 1}</button>`).join('')}</div><p class="tiny muted" style="margin-top:8px">Blue = answered · outlined = flagged</p></section>` : '';
  return `<div class="run-top"><button class="icon-btn" data-act="exquit" aria-label="Quit">✕</button><div style="flex:1" class="small muted num">Question ${EX.i + 1} of ${EX.qs.length}</div><span class="timer" id="tm">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span><button class="icon-btn" data-act="exgrid" aria-label="Question map">▦</button></div>${grid}
  <div class="card"><div class="qstem">${esc(q.q)}</div>${q.o.map((o, k) => `<button class="opt ${EX.ans[EX.i] === k ? 'sel' : ''}" data-act="expick" data-k="${k}"><b>${LET[k]}</b><span>${esc(o)}</span></button>`).join('')}</div>
  <div class="row" style="margin-top:14px"><button class="btn" data-act="exprev" ${EX.i === 0 ? 'disabled' : ''}>‹ Prev</button><button class="btn ghost" data-act="exflag">${EX.flag[EX.i] ? '⚑ Flagged' : '⚐ Flag'}</button><div class="spacer"></div>${EX.i + 1 < EX.qs.length ? '<button class="btn primary" data-act="exnext">Next ›</button>' : '<button class="btn primary" data-act="exfinish">Finish</button>'}</div>`;
}
function exFinish() {
  if (!EX || EX.result) return;
  clearInterval(exTimer);
  let ok = 0; const by = {};
  EX.qs.forEach((it, k) => { const good = EX.ans[k] === it.x.a; if (good) ok++; (by[it.ch] = by[it.ch] || { n: 0, ok: 0 }); by[it.ch].n++; if (good) by[it.ch].ok++; if (EX.ans[k] !== null) grade(it.id, good); else grade(it.id, false); });
  const pct = Math.round(ok / EX.qs.length * 100);
  EX.result = { ok, pct, by };
  S.exams.push({ t: Date.now(), n: EX.qs.length, pct, mins: Math.round((Date.now() - (EX.end - EX.mins * 60000)) / 60000) }); save();
  go('#/exam/run'); render();
}
function viewExamResult() {
  const r = EX.result, pass = r.pct >= 70;
  const rows = EX.qs.map((it, k) => { const q = it.x, a = EX.ans[k], good = a === q.a; return `<li style="padding:12px 0"><div class="row" style="align-items:flex-start"><span class="pill ${good ? 'low' : 'high'}">${k + 1}</span><div style="flex:1"><div style="font-weight:600">${esc(q.q)}</div><div class="small" style="color:var(--ok)">✓ ${LET[q.a]}. ${esc(q.o[q.a])}</div>${good ? '' : `<div class="small" style="color:var(--bad)">${a === null ? 'Unanswered' : '✗ ' + LET[a] + '. ' + esc(q.o[a])}</div><div class="small muted">${esc(clean(q.w[q.a]))}</div>`}</div></div></li>`; }).join('');
  return `<div class="stack"><section class="card" style="text-align:center"><div class="eyebrow">Result</div><div class="score num" style="margin-top:6px;color:${pass ? 'var(--ok)' : 'var(--bad)'}">${r.pct}%</div><p class="muted">${r.ok} / ${EX.qs.length} · ${pass ? 'Above' : 'Below'} the 70% pass mark</p><div class="row wrapx" style="justify-content:center;margin-top:8px"><button class="btn primary" data-act="exstart" data-n="${EX.qs.length}">Retake (new draw)</button><a class="btn" href="#/exam" data-act="exdone">Close</a></div></section>
  <section class="card"><h3>Review</h3><ul class="list">${rows}</ul></section></div>`;
}

/* ---------- settings ---------- */
function settingsSheet() {
  const s = document.createElement('div'); s.className = 'sheet'; s.id = 'sheet';
  s.innerHTML = `<div><div class="row"><h2 style="flex:1">Settings</h2><button class="icon-btn" data-act="closesheet" aria-label="Close">✕</button></div>
  <div class="field"><label for="sd">Exam date</label><input type="date" id="sd" value="${S.examDate || ''}"></div>
  <div class="field"><label for="st">Theme</label><select id="st"><option value="auto">Automatic</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
  <div class="row wrapx" style="margin-top:18px"><button class="btn primary" data-act="savesettings">Save</button><button class="btn" data-act="export">Export progress</button><label class="btn" style="cursor:pointer">Import<input type="file" id="imp" accept="application/json" hidden></label></div>
  <p class="tiny muted" style="margin-top:14px">Progress is stored on this device only. Export it now and then as a backup.</p>
  <button class="btn ghost sm" data-act="reset" style="margin-top:8px;color:var(--bad)">Reset all progress</button></div>`;
  document.body.appendChild(s); $('#st').value = S.theme;
}

/* ---------- router ---------- */
const APP = $('#app');
function go(h) { if (location.hash === h) render(); else location.hash = h; }
function render() {
  const h = (location.hash || '#/').slice(2).split('/'), r = h[0] || '';
  let html = '', tab = r;
  if (r === '') html = viewHome();
  else if (r === 'learn') { tab = 'learn'; html = h[1] ? viewChapter(h[1], h[2] || 'brief') : viewLearn(); }
  else if (r === 'practice' || r === 'glossary') { tab = 'practice'; html = r === 'glossary' ? viewGlossary() : viewPractice(); }
  else if (r === 'run') { tab = 'practice'; html = viewRun(); }
  else if (r === 'exam') { tab = 'exam'; html = h[1] === 'run' ? viewExamRun() : viewExam(); }
  else html = viewHome();
  APP.innerHTML = html;
  document.querySelectorAll('nav.tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === (tab || 'today')));
  const gq = $('#gq'); if (gq) gq.addEventListener('input', () => ($('#gl').innerHTML = glossHtml(gq.value)));
  const dans = $('#dans'); if (dans) dans.focus();
}
let lastRoute = '';
window.addEventListener('hashchange', () => { render(); const k = (location.hash.split('/')[1] || '') + (location.hash.split('/')[2] || ''); if (k !== lastRoute) window.scrollTo(0, 0); lastRoute = k; });

document.addEventListener('keydown', e => { if (e.key === 'Enter' && RUN && location.hash === '#/run') { const b = $('[data-act="dcheck"]') || $('[data-act="next"]'); if (b) b.click(); } });
document.addEventListener('change', e => {
  if (e.target.id === 'imp' && e.target.files[0]) { const f = new FileReader(); f.onload = () => { try { const d = JSON.parse(f.result); if (d && d.rec) { S = Object.assign(S, d); save(); applyTheme(); toast('Progress imported'); $('#sheet') && $('#sheet').remove(); render(); } else toast('Invalid file'); } catch (er) { toast('Invalid file'); } }; f.readAsText(e.target.files[0]); }
});
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, R = RUN;
  switch (a) {
    case 'settings': settingsSheet(); break;
    case 'closesheet': $('#sheet').remove(); break;
    case 'savesettings': S.examDate = $('#sd').value || null; S.theme = $('#st').value; save(); applyTheme(); $('#sheet').remove(); render(); break;
    case 'export': { const b = new Blob([JSON.stringify(S)], { type: 'application/json' }), u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'sie-prep-progress.json'; l.click(); break; }
    case 'reset': if (confirm('Erase all progress on this device?')) { S = { rec: {}, exams: [], examDate: null, theme: 'auto', log: {}, flags: {} }; save(); applyTheme(); $('#sheet').remove(); go('#/'); render(); } break;
    case 'review': startRun('Daily review', sessionReview(), { back: '#/' }); break;
    case 'weak': startRun('Weak spots', weakItems(), { back: '#/practice' }); break;
    case 'mixed': startRun('Mixed quiz', shuffle(QUESTIONS).slice(0, +t.dataset.n), { back: '#/practice' }); break;
    case 'chquiz': startRun('Chapter ' + t.dataset.ch + ' quiz', chQuiz(+t.dataset.ch, +t.dataset.n || 0), { back: '#/learn/' + t.dataset.ch + '/quiz' }); break;
    case 'chcards': startRun('Chapter ' + t.dataset.ch + ' cards', chCards(+t.dataset.ch), { back: '#/learn/' + t.dataset.ch + '/cards' }); break;
    case 'drill': startRun(DRILLS.find(d => d.id === t.dataset.id).title, drillSet(t.dataset.id), { back: '#/practice', drill: t.dataset.id }); RUN.drillId = t.dataset.id; break;
    case 'again': if (R.drillId) { startRun(R.title, drillSet(R.drillId), { back: R.back }); RUN.drillId = R.drillId; } else { const fresh = R.title === 'Daily review' ? sessionReview() : R.title === 'Weak spots' ? weakItems() : shuffle(R.items.filter(i => !i.retry)); startRun(R.title, fresh, { back: R.back }); } break;
    case 'quit': RUN = null; go('#/practice'); break;
    case 'pick': { if (R.state !== 'ask') break; const it = R.items[R.i], k = +t.dataset.k; R.picked = k; R.state = 'show'; const ok = k === it.x.a; grade(it.id, ok); R.lastOk = ok; render(); break; }
    case 'flip': R.shown = !R.shown; render(); break;
    case 'gcard': { const it = R.items[R.i], g = +t.dataset.g; if (!it.retry) grade(it.id, g > 0, g === 2); advance(g > 0); render(); break; }
    case 'dcheck': { const it = R.items[R.i], v = parseFloat(($('#dans').value || '').replace(/[$,\s]/g, '')); if (isNaN(v)) { toast('Enter a number'); break; } const ok = Math.abs(v - it.p.ans) < 0.51; R.picked = ok; R.state = 'show'; R.lastOk = ok; render(); break; }
    case 'next': { const it = R.items[R.i]; advance(it.kind === 'q' ? R.lastOk : R.picked === true); render(); break; }
    case 'flag': S.flags[t.dataset.id] = !S.flags[t.dataset.id]; save(); render(); break;
    case 'exstart': exStart(+t.dataset.n); break;
    case 'expick': EX.ans[EX.i] = +t.dataset.k; render(); break;
    case 'exnext': EX.i++; render(); break;
    case 'exprev': EX.i--; render(); break;
    case 'exflag': EX.flag[EX.i] = !EX.flag[EX.i]; render(); break;
    case 'exgrid': EX.grid = !EX.grid; render(); break;
    case 'exgo': EX.i = +t.dataset.k; EX.grid = false; render(); break;
    case 'exfinish': { const un = EX.ans.filter(x => x === null).length; if (!un || confirm(un + ' unanswered question(s). Finish anyway?')) exFinish(); break; }
    case 'exquit': if (confirm('Quit this exam? Progress will be lost.')) { clearInterval(exTimer); EX = null; go('#/exam'); } break;
    case 'exdone': EX = null; break;
  }
});

/* ---------- nav + boot ---------- */
const nav = [['today', 'Today', '#/'], ['learn', 'Learn', '#/learn'], ['practice', 'Practice', '#/practice'], ['exam', 'Exam', '#/exam']];
$('#nav').innerHTML = '<div class="in">' + nav.map(n => `<a href="${n[2]}" data-t="${n[0]}">${ICON[n[0]]}${n[1]}</a>`).join('') + '</div>';
applyTheme();
render();
})();
