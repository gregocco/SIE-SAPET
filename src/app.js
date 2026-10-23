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
const PAIRS = DATA.pairs || [];
const pairItems = (list) => list.flatMap(p => p.items.map((it, k) => ({ kind: 'pair', id: 'pair:' + p.ch + ':' + p.pi + ':' + k, ch: p.ch, title: p.title, a: p.a, b: p.b, s: it.s, v: it.v, w: it.w })));

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
function bookRef(r) { const P = DATA.pages || {}; let k = String(r); while (k && !(k in P)) { const i = k.lastIndexOf('.'); k = i < 0 ? '' : k.slice(0, i); } return k ? { sec: k, page: P[k], pdf: P[k] + 12 } : null; }
const refPill = r => { const b = bookRef(r); return `<span class="pill">Book §${esc(r)}${b ? ' · p.' + b.page + ' (PDF p.' + b.pdf + ')' : ''}</span>`; };
const clean = w => { const t = w.replace(/^(Correct|Wrong)(: |\.|—)?\s*/i, ''); return t.length > 3 ? t.charAt(0).toUpperCase() + t.slice(1) : w; };
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);

/* ---------- activation (a joke licence, not security) ---------- */
const cyrb53 = (s, seed = 7) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, c; i < s.length; i++) { c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0); };
const KEYHASH = 1660197817701199;

/* ---------- store ---------- */
const KEY = 'sie-prep.v1';
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
S = Object.assign({ used: {}, act: false, checks: {}, rec: {}, exams: [], examDate: '2026-11-30', theme: 'auto', log: {}, flags: {} }, S || {});
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

const pct = n => (Math.round(n * 100) / 100).toFixed(2) + '%';
DRILLS.push(
  { id: 'accrued', ch: 2, title: 'Accrued interest (30/360)', sub: 'Corporate and municipal bonds', gen() {
      const rate = pick([4, 4.5, 5, 5.5, 6, 6.5, 7, 8]), face = pick([1, 5, 10, 25]) * 1000, mo = ri(0, 5), d = ri(1, 29), days = mo * 30 + d;
      const ans = face * rate / 100 * days / 360;
      return { q: `A corporate bond with a ${rate}% coupon (par ${money(face)}) is sold. The last coupon was paid ${mo} month${mo === 1 ? '' : 's'} and ${d} day${d === 1 ? '' : 's'} before settlement (30/360 convention). How much accrued interest does the buyer pay?`, ans: Math.round(ans * 100) / 100, unit: '$', tol: 0.51,
        steps: ['Annual interest = ' + money(face * rate / 100) + '.', `Days accrued on a 30/360 basis = ${mo} × 30 + ${d} = ${days}.`, `Accrued = ${money(face * rate / 100)} × ${days} / 360 = $${ans.toFixed(2)}.`], tip: 'Corporates and munis count 30-day months and a 360-day year; Treasuries use actual days.' };
    } },
  { id: 'accruedtsy', ch: 2, title: 'Accrued interest (Treasuries)', sub: 'Actual days / actual days in the period', gen() {
      const rate = pick([3, 3.5, 4, 4.5, 5]), face = pick([10, 25, 100]) * 1000, per = pick([181, 182, 183, 184]), el = ri(10, per - 10, 3);
      const semi = face * rate / 100 / 2, ans = semi * el / per;
      return { q: `A ${rate}% Treasury note (par ${money(face)}) pays semiannually. ${el} of the ${per} days in the current coupon period have elapsed at settlement. How much accrued interest is owed?`, ans: Math.round(ans * 100) / 100, unit: '$', tol: 0.51,
        steps: [`Semiannual coupon = ${money(face)} × ${rate}% / 2 = $${semi.toFixed(2)}.`, `Accrued = $${semi.toFixed(2)} × ${el} / ${per} = $${ans.toFixed(2)}.`], tip: 'Actual/actual: use the real number of days in the period, not 180.' };
    } },
  { id: 'cy', ch: 2, title: 'Current yield', sub: 'Annual interest ÷ market price', gen() {
      const cpn = pick([4, 5, 6, 7, 8]), price = pick([88, 92, 95, 98, 101, 104, 108, 112]);
      const ans = (cpn * 10) / (price * 10) * 100;
      return { q: `A $1,000 par bond with a ${cpn}% coupon trades at ${price} (${money(price * 10)}). What is its current yield? (Percent, two decimals.)`, ans: Math.round(ans * 100) / 100, unit: '%', tol: 0.011,
        steps: [`Annual interest = ${money(cpn * 10)}.`, `Market price = ${money(price * 10)}.`, `Current yield = ${cpn * 10} / ${price * 10} = ${ans.toFixed(2)}%.`], tip: 'Current yield ignores the pull to par; premium bonds yield less than their coupon.' };
    } },
  { id: 'tey', ch: 3, title: 'Tax-equivalent yield', sub: 'Muni yield ÷ (1 − tax rate)', gen() {
      const y = pick([2.5, 3, 3.5, 4, 4.5, 5]), t = pick([24, 28, 32, 35, 37]);
      const ans = y / (1 - t / 100);
      return { q: `A municipal bond yields ${y}% tax-free. For an investor in the ${t}% federal bracket, what taxable yield is equivalent? (Percent, two decimals.)`, ans: Math.round(ans * 100) / 100, unit: '%', tol: 0.011,
        steps: [`Tax-equivalent yield = muni yield / (1 − tax rate).`, `= ${y}% / ${(1 - t / 100).toFixed(2)} = ${ans.toFixed(2)}%.`], tip: 'The higher the bracket, the more attractive munis become.' };
    } },
  { id: 'nav', ch: 4, title: 'Mutual fund NAV', sub: '(Assets − liabilities) ÷ shares', gen() {
      const sh = pick([5, 8, 10, 20, 25]) * 100000, nav = pick([12, 15, 18.5, 22, 30, 41.5]), L = pick([2, 5, 8]) * 1000000;
      const A = Math.round(nav * sh + L);
      return { q: `A mutual fund has total assets of ${money(A)}, liabilities of ${money(L)} and ${sh.toLocaleString('en-US')} shares outstanding. What is the NAV per share?`, ans: nav, unit: '$', tol: 0.011,
        steps: [`Net assets = ${money(A)} − ${money(L)} = ${money(A - L)}.`, `NAV = ${money(A - L)} / ${sh.toLocaleString('en-US')} = $${nav.toFixed(2)}.`], tip: 'Forward pricing: orders get the NAV calculated after the 4:00 pm ET close.' };
    } },
  { id: 'pop', ch: 4, title: 'Public offering price', sub: 'POP = NAV ÷ (1 − sales charge)', gen() {
      const nav = pick([10, 12, 15, 20, 25, 40]), sc = pick([4, 5, 5.5, 8.5]);
      const ans = nav / (1 - sc / 100);
      return { q: `A front-end load fund has a NAV of $${nav.toFixed(2)} and a maximum sales charge of ${sc}%. What is the public offering price? (Dollars, two decimals.)`, ans: Math.round(ans * 100) / 100, unit: '$', tol: 0.011,
        steps: [`POP = NAV / (1 − sales charge).`, `= ${nav} / ${(1 - sc / 100).toFixed(3)} = $${ans.toFixed(2)}.`], tip: 'The charge is a percentage of the POP, not of the NAV — divide, do not multiply.' };
    } },
  { id: 'divyield', ch: 1, title: 'Dividend yield', sub: 'Annual dividend ÷ price', gen() {
      const q = pick([0.25, 0.4, 0.5, 0.75, 1]), px = pick([20, 25, 40, 50, 80, 100]), ans = q * 4 / px * 100;
      return { q: `A stock pays a quarterly dividend of $${q.toFixed(2)} and trades at $${px}. What is its dividend yield? (Percent, two decimals.)`, ans: Math.round(ans * 100) / 100, unit: '%', tol: 0.011,
        steps: [`Annual dividend = 4 × $${q.toFixed(2)} = $${(q * 4).toFixed(2)}.`, `Yield = $${(q * 4).toFixed(2)} / $${px} = ${ans.toFixed(2)}%.`], tip: 'Always annualise a quarterly dividend before dividing by price.' };
    } },
  { id: 'optpl', ch: 6, title: 'Option profit / loss and breakeven', sub: 'Long and short calls and puts, per contract', gen() {
      const kind = pick(['call', 'put']), side = pick(['buy', 'sell']), K = pick([30, 40, 50, 60, 80, 100]), prem = pick([1, 1.5, 2, 3, 4, 5]);
      const S = K + pick([-12, -8, -5, -2, 2, 5, 8, 12]), intrinsic = kind === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0), buyer = (intrinsic - prem) * 100, ans = side === 'buy' ? buyer : -buyer;
      return { q: `An investor ${side === 'buy' ? 'buys' : 'sells (writes)'} 1 ${kind} contract on XYZ, strike ${K}, for a premium of $${prem.toFixed(2)}. At expiration XYZ closes at $${S}. What is the investor’s gain or loss on the position? (Use a negative number for a loss.)`, ans, unit: '$', tol: 0.51,
        steps: [`Intrinsic value at expiry = ${kind === 'call' ? 'max(' + S + ' − ' + K + ', 0)' : 'max(' + K + ' − ' + S + ', 0)'} = $${intrinsic}.`, `Option buyer’s result = (${intrinsic} − ${prem.toFixed(2)}) × 100 = ${money(buyer)}.`, side === 'buy' ? 'Investor is the buyer → same result.' : 'Investor is the writer → the opposite sign: ' + money(ans) + '.'], tip: 'Per contract (100 shares). Writer’s result is the mirror image of the buyer’s.' };
    } },
  { id: 'bondprice', ch: 3, title: 'Bond price from a quote', sub: 'Quote × $10 per $1,000 of par', gen() {
      const q = pick([96.5, 98, 99.25, 101.5, 103, 94]), n = pick([5, 10, 25, 50]), ans = q * 10 * n;
      return { q: `A corporate bond is quoted at ${q}. What is the total dollar price of ${n} bonds ($1,000 par each, excluding accrued interest)?`, ans, unit: '$', tol: 0.51,
        steps: [`Bond quotes are percentages of par: ${q}% × $1,000 = $${(q * 10).toFixed(2)} per bond.`, `× ${n} bonds = ${money(ans)}.`], tip: 'A quote below 100 = discount, above 100 = premium.' };
    } }
);

const fmtAns = p => p.unit === '%' ? p.ans.toFixed(2) + '%' : (p.ans < 0 ? '-' : '') + '$' + Math.abs(p.ans).toLocaleString('en-US', { minimumFractionDigits: p.ans % 1 ? 2 : 0, maximumFractionDigits: 2 });
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
const CHEV = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const ICON = {
  calc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>',
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


/* ---------- exam-day checklist (facts from the textbook introduction) ---------- */
const CHECK = [
  ['id', 'Valid government-issued ID with your signature and photo (driver’s licence, passport or military ID).'],
  ['early', 'Arrive (or log in for the remote exam) 30 minutes before the appointment.'],
  ['book', 'Nothing to bring in: closed book, no notes, no phone, no watch, no laptop. Personal items go in a locker.'],
  ['calc', 'Do NOT bring your own calculator. A basic four-function calculator (or an online one when remote) and scratch paper/notepad are provided.'],
  ['calcpractice', 'Practised with the in-app small calculator: abbreviate numbers (14.7 instead of 14,700,000).'],
  ['format', 'Format: 75 scored questions (+5 unscored), 4 choices, 1 h 45 min, 70% to pass. A confirmation box appears after each answer; you can flag questions for review.'],
  ['pace', 'Pace: about 1.4 minutes per question. Flag and move on; use the time left for the flagged ones.'],
  ['remote', 'Remote exam: read the FINRA/Prometric remote requirements in advance (finra.org → test online) and test your set-up.'],
  ['sleep', 'Sleep. Last two days = light review only: traps, formulas, missed questions.'],
];
function checklistCard(open) {
  return `<section class="card"><div class="row"><div style="flex:1"><div class="eyebrow">Exam day</div><h2 style="margin-top:4px">Checklist</h2></div><span class="pill ${open ? 'high' : ''}">${CHECK.filter(c => S.checks[c[0]]).length}/${CHECK.length}</span></div><ul class="list" style="margin-top:6px">${CHECK.map(c => `<li><button class="row" data-act="chk" data-k="${c[0]}" style="width:100%;background:none;border:0;padding:11px 0;text-align:left;align-items:flex-start"><span style="flex:none;width:24px;height:24px;border-radius:8px;border:1.5px solid ${S.checks[c[0]] ? 'var(--ok)' : 'var(--line)'};background:${S.checks[c[0]] ? 'var(--ok)' : 'transparent'};color:#fff;display:grid;place-items:center;font-size:.8rem">${S.checks[c[0]] ? '✓' : ''}</span><span class="small">${esc(c[1])}</span></button></li>`).join('')}</ul></section>`;
}

/* ---------- study plan (exam 30 Nov 2026, ~2-4 h/day) ---------- */
const PLAN = [
  ['2026-10-23', '2026-10-30', 'Week 1 · Accounts first', 'Customer accounts and tax-advantaged accounts are ~31% of the exam. Then investment companies.', [11, 12, 4]],
  ['2026-10-31', '2026-11-06', 'Week 2 · Products & risks', 'Suitability / Reg BI, equities, other managed products, bond types (munis, agencies).', [7, 1, 5, 3]],
  ['2026-11-07', '2026-11-13', 'Week 3 · Markets, rules, express chapters', 'Secondary market, registration, conduct. Skim what you already know from DCM: debt basics, issuance, economics, options essentials.', [9, 13, 14, 2, 8, 10, 6]],
  ['2026-11-14', '2026-11-20', 'Week 4 · Exams and remediation', 'Two full mock exams under exam conditions, then drill every weak section.', []],
  ['2026-11-21', '2026-11-27', 'Week 5 · Polish', 'Three more mock exams, weak spots, traps tabs, calculation drills until automatic.', []],
  ['2026-11-28', '2026-11-30', 'Final days', 'Light review only: traps, formulas, missed questions. Sleep. Bring a valid government ID.', []],
];
function planCard() {
  const d = new Date(); const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const cur = PLAN.find(p => iso >= p[0] && iso <= p[1]) || (iso < PLAN[0][0] ? PLAN[0] : null);
  if (!cur) return '';
  const chs = cur[4].map(id => { const m = META.find(x => x.id === id); return `<a class="pill ${m && m.live ? 'acc' : ''}" style="text-decoration:none" href="#/learn/${id}/brief">Ch. ${id}</a>`; }).join('');
  return `<section class="card"><div class="eyebrow">This week</div><h2 style="margin-top:4px">${esc(cur[2])}</h2><p class="muted small">${esc(cur[3])}</p>${chs ? `<div class="row wrapx" style="gap:6px;margin-top:8px">${chs}</div>` : ''}</section>`;
}

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
  const first = !S.exams.length && !Object.keys(S.rec).length;
  const start = first ? `<section class="card" style="border:2px solid var(--accent)"><div class="eyebrow" style="color:var(--accent)">Start here</div><h2 style="margin-top:4px">Take the 30-question diagnostic</h2>
    <p class="muted small">About 40 minutes, real exam format, all topics weighted like the real test. It shows where you stand by section so you study the right things first. Expect a low score: that is the point.</p>
    <button class="btn primary block" style="margin-top:10px" data-act="exstart" data-n="30">Start diagnostic</button>
    <ol class="small muted" style="margin:12px 0 0;padding-left:1.2em"><li>Follow “This week” below — chapters are ordered by exam value.</li><li>Do the daily review (10–15 min): missed items come back sooner.</li><li>Calculator is in the top bar; numbers, audio and traps are under Practice.</li><li>First full 75-question mock by mid-November; aim for 80%+ three times in a row.</li></ol></section>` : '';
  return `<div class="stack">${days !== null && days >= 0 && days <= 2 ? checklistCard(true) : ''}${start}${hero}${plan}${planCard()}${stats}<section><div class="row" style="margin:6px 0 10px"><h2 style="flex:1">Your chapters</h2><a class="small" href="#/learn" style="color:var(--accent);font-weight:650;text-decoration:none">All 14 →</a></div><div class="card" style="padding:0">${live}</div><p class="muted small" style="margin-top:10px">More chapters unlock as they’re produced. Highest-value first.</p></section>${bp}</div>`;
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
    body = `<div class="row wrapx"><button class="btn primary" style="flex:1" data-act="chcards" data-ch="${id}">Study flashcards (${Math.min(20, d.length)} of ${d.length})</button><button class="btn" data-act="listen" data-kind="cards" data-ch="${id}">🎧 Listen</button></div><section class="card" style="margin-top:14px"><h3>All cards</h3><ul class="list" style="margin-top:6px">${d.map(i => `<li style="padding:10px 0"><div style="font-weight:650">${esc(i.x.f)}</div><div class="muted small">${inline(i.x.b)}</div></li>`).join('')}</ul></section>`;
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
  ${PAIRS.length ? `<section class="card"><div class="row"><div style="flex:1"><h3>X or Y?</h3><p class="muted small">Rapid sorting of look-alike rules (JTIC vs JTWROS, FDIC vs SIPC…). ${PAIRS.length} decks · ${PAIRS.reduce((n, p) => n + p.items.length, 0)} statements.</p></div></div><div class="row wrapx" style="margin-top:10px"><button class="btn primary" data-act="pairmix">Random 20</button><button class="btn" data-act="pairlist">Choose a deck</button></div></section>` : ''}
  <section class="card"><h3>Memory tools</h3><p class="muted small">Short sessions for commutes and spare minutes.</p><div class="row wrapx" style="margin-top:10px"><button class="btn primary" data-act="listen" data-kind="cards">🎧 Listen to cards</button><button class="btn" data-act="listen" data-kind="traps">🎧 Listen to traps</button><button class="btn" data-act="trapsprint">⚠ Traps sprint</button><a class="btn" href="#/numbers">№ Numbers to know</a></div></section>
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
    if (R.state === 'show') body += `<div class="why"><b>${R.picked === q.a ? '✓ Correct' : '✗ Not quite'}</b><ul class="list" style="margin-top:6px">${q.w.map((w, k) => `<li class="${k === q.a ? 'c' : ''}"><b>${LET[k]}.</b> ${esc(clean(w))}</li>`).join('')}</ul><div class="row" style="margin-top:8px">${refPill(q.r)}<button class="btn sm ghost" data-act="flag" data-id="${it.id}">${S.flags[it.id] ? '⚑ Flagged' : '⚑ Flag as doubtful'}</button></div></div><button class="btn primary block" style="margin-top:14px" data-act="next">${R.i + 1 >= R.items.length ? 'Finish' : 'Next'}</button>`;
  } else if (it.kind === 'pair') {
    const bad = R.state === 'show' && R.picked !== it.v;
    body = `<div class="eyebrow">X or Y? · Ch. ${it.ch}</div><div class="small" style="margin-top:6px;font-weight:700;color:var(--accent)">${esc(it.title)}</div><div class="qstem" style="margin-top:10px">${esc(it.s)}</div><div class="grid2" style="margin-top:16px">${['a', 'b'].map(k => { let cl = ''; if (R.state === 'show') { cl = k === it.v ? 'ok locked' : (k === R.picked ? 'bad locked' : 'locked'); } return `<button class="opt ${cl}" style="margin:0;justify-content:center;text-align:center;min-height:64px;font-weight:700" data-act="pairpick" data-k="${k}"><span>${esc(it[k])}</span></button>`; }).join('')}</div>` +
      (R.state === 'show' ? `<div class="why"><b>${bad ? '✗ It is ' : '✓ '}${esc(it[it.v])}</b><div class="small" style="margin-top:6px">${esc(it.w)}</div></div><button class="btn primary block" style="margin-top:14px" data-act="next">${R.i + 1 >= R.items.length ? 'Finish' : 'Next'}</button>` : '');
  } else if (it.kind === 'trap') {
    body = `<div class="eyebrow">Trap · Ch. ${it.ch}</div><div class="prose" style="margin-top:10px;font-size:1.08rem">${md(it.text)}</div><div class="grid2" style="margin-top:16px"><button class="btn" data-act="gtrap" data-g="0" style="color:var(--bad)">Tricky, again</button><button class="btn primary" data-act="gtrap" data-g="1">Got it</button></div>`;
  } else if (it.kind === 'card') {
    const c = it.x;
    body = `<div class="eyebrow">Flashcard · §${esc(c.r)}</div><div class="flip" style="margin-top:10px"><div class="flipcard" data-act="flip">${R.shown ? `<div class="a">${inline(c.b)}<div class="tiny muted" style="margin-top:14px">${refPill(c.r)}</div></div>` : `<div class="q">${esc(c.f)}</div>`}</div></div>`;
    body += R.shown ? `<div class="grid3" style="margin-top:14px"><button class="btn" data-act="gcard" data-g="0" style="color:var(--bad)">Missed</button><button class="btn primary" data-act="gcard" data-g="1">Got it</button><button class="btn" data-act="gcard" data-g="2">Easy</button></div>` : `<button class="btn primary block" style="margin-top:14px" data-act="flip">Show answer</button>`;
  } else {
    const p = it.p;
    body = `<div class="eyebrow">Drill · ${esc(it.drill.title)}</div><div class="qstem" style="margin-top:8px">${esc(p.q)}</div>`;
    if (R.state === 'ask') body += `<div style="margin-top:14px"><input class="num-in" id="dans" inputmode="decimal" placeholder="${p.unit === '%' ? 'Answer in %' : 'Answer in $'}" autocomplete="off"></div><button class="btn primary block" style="margin-top:12px" data-act="dcheck">Check</button>`;
    else body += `<div class="why"><b>${R.picked ? '✓ Correct' : '✗ Answer: ' + fmtAns(p)}</b><ol style="margin:8px 0 0;padding-left:1.2em">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="tip">${esc(p.tip)}</div></div><button class="btn primary block" style="margin-top:14px" data-act="next">${R.i + 1 >= R.items.length ? 'Finish' : 'Next'}</button>`;
  }
  return `<div class="run-top"><button class="icon-btn" data-act="quit" aria-label="Close">✕</button><div class="bar"><i style="width:${pct}%"></i></div><span class="small muted num">${Math.min(R.done + 1, R.items.length)}/${R.items.length}</span></div><div class="card">${body}</div>`;
}
function runFinish() {
  const R = RUN, tot = R.done || 1, p = Math.round(R.ok / tot * 100);
  const miss = R.misses.map(i => i.kind === 'q' ? `<li style="padding:10px 0"><div style="font-weight:600">${esc(i.x.q)}</div><div class="small" style="color:var(--ok)">✓ ${esc(i.x.o[i.x.a])}</div></li>` : i.kind === 'card' ? `<li style="padding:10px 0"><div style="font-weight:600">${esc(i.x.f)}</div><div class="small" style="color:var(--ok)">${inline(i.x.b)}</div></li>` : i.kind === 'trap' ? `<li style="padding:10px 0" class="prose">${md(i.text)}</li>` : i.kind === 'pair' ? `<li style="padding:10px 0"><div style="font-weight:600">${esc(i.s)}</div><div class="small" style="color:var(--ok)">→ ${esc(i[i.v])} (${esc(i.title)})</div></li>` : '').join('');
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
const SECTIONS = [
  { name: 'Products & Risks', chs: [1, 2, 3, 4, 5, 6, 7], w: [5, 5, 5, 5, 5, 3.5, 5], n: 33 },
  { name: 'Capital Markets', chs: [8, 9, 10], w: [4, 4, 3], n: 12 },
  { name: 'Accounts & Trading', chs: [11, 12], w: [11.5, 11.5], n: 23 },
  { name: 'Regulation', chs: [13, 14], w: [3, 4], n: 7 },
];
const secOf = ch => SECTIONS.find(s => s.chs.includes(ch)).name;
function buildExam(total) {
  const picks = [];
  SECTIONS.forEach(sec => {
    const tgt = Math.round(sec.n * total / 75), sw = sec.w.reduce((a, b) => a + b, 0), raw = sec.w.map(w => w / sw * tgt), base = raw.map(Math.floor);
    let rem = tgt - base.reduce((a, b) => a + b, 0);
    raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0]).slice(0, rem).forEach(x => base[x[1]]++);
    sec.chs.forEach((ch, i) => {
      const pool = QUESTIONS.filter(q => q.ch === ch);
      picks.push(...shuffle(pool.filter(q => !S.used[q.id])).concat(shuffle(pool.filter(q => S.used[q.id]))).slice(0, base[i]));
    });
  });
  return shuffle(picks);
}
function readiness() {
  const full = S.exams.filter(e => e.n >= 70), last3 = full.slice(-3);
  return { n: last3.filter(e => e.pct >= 80).length, ready: last3.length === 3 && last3.every(e => e.pct >= 80), played: full.length };
}
function viewExam() {
  const hist = S.exams.slice(-6).reverse().map(e => `<li class="row" style="padding:12px 0"><div style="flex:1"><div style="font-weight:650">${new Date(e.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${e.n} Q</div><div class="muted small">${e.mins} min</div></div><span class="pill ${e.pct >= 80 ? 'low' : e.pct >= 70 ? 'med' : 'high'}">${e.pct}%</span></li>`).join('');
  const rd = readiness(), unseen = QUESTIONS.filter(q => !S.used[q.id]).length, fresh = Math.floor(unseen / 75);
  const gate = `<section class="card"><div class="row"><div style="flex:1"><div class="eyebrow">Readiness gate</div><h3 style="margin-top:4px">${rd.ready ? 'Ready to sit the exam ✓' : '3 full mocks in a row at 80%+'}</h3></div><div class="row" style="gap:6px">${[0, 1, 2].map(i => `<span style="width:14px;height:14px;border-radius:50%;background:${i < rd.n && !rd.ready ? 'var(--ok)' : rd.ready ? 'var(--ok)' : 'var(--line)'}"></span>`).join('')}</div></div><p class="muted small">The pass mark is 70%, but unscored questions and exam stress cost margin. Scoring 70–75% in mocks is not “ready”.</p></section>`;
  return `<div class="stack"><div><h1>Exam simulator</h1><p class="muted">Real format: 4 choices, no feedback until the end, flag and review. Mirrors the official weights: Products 33 · Accounts 23 · Capital Markets 12 · Regulation 7. The calculator (top bar) is the exam-style 4-function one.</p></div>
  <section class="card"><h3>Full mock · 75 questions · 1 h 45</h3><p class="muted small">${QUESTIONS.length} questions in the bank. Each mock prefers questions you haven’t seen in a previous mock (${unseen} unseen, ≈ ${fresh} fresh mock${fresh === 1 ? '' : 's'} left).</p><button class="btn primary block" style="margin-top:12px" data-act="exstart" data-n="75">Start full mock</button></section>
  <div class="grid2"><section class="card"><h3>Half · 35 Q</h3><p class="muted small">49 min</p><button class="btn block" style="margin-top:8px" data-act="exstart" data-n="35">Start</button></section><section class="card"><h3>Mini · 20 Q</h3><p class="muted small">28 min</p><button class="btn block" style="margin-top:8px" data-act="exstart" data-n="20">Start</button></section></div>
  ${gate}${checklistCard(false)}${hist ? `<section class="card"><h3>Recent attempts</h3><ul class="list">${hist}</ul></section>` : ''}</div>`;
}
function exStart(n) {
  const qs = buildExam(n), mins = Math.round(qs.length * 1.4);
  EX = { qs, ans: qs.map(() => null), flag: qs.map(() => false), i: 0, mins, end: Date.now() + mins * 60000, grid: false, result: null };
  clearInterval(exTimer); exTimer = setInterval(tick, 1000); go('#/exam/run');
}
function tick() { const el = $('#tm'); if (!EX || EX.result) { clearInterval(exTimer); return; } const left = Math.max(0, Math.round((EX.end - Date.now()) / 1000)); if (el) { el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); el.style.color = left < 300 ? 'var(--bad)' : ''; } if (!left) exFinish(); }
function viewExamRun() {
  if (!EX) return '<div class="empty">No exam in progress.</div>';
  if (EX.result) return viewExamResult();
  const q = EX.qs[EX.i].x, left = Math.max(0, Math.round((EX.end - Date.now()) / 1000));
  const grid = EX.grid ? `<section class="card" style="margin-bottom:12px"><div class="qgrid">${EX.qs.map((_, k) => `<button data-act="exgo" data-k="${k}" class="${EX.ans[k] !== null ? 'a' : ''} ${EX.flag[k] ? 'f' : ''} ${k === EX.i ? 'cur' : ''}">${k + 1}</button>`).join('')}</div><p class="tiny muted" style="margin-top:8px">Blue = answered · outlined = flagged · ${EX.ans.filter(x => x === null).length} unanswered</p></section>` : '';
  return `<div class="run-top"><button class="icon-btn" data-act="exquit" aria-label="Quit">✕</button><div style="flex:1" class="small muted num">Question ${EX.i + 1} of ${EX.qs.length}</div><span class="timer" id="tm">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span><button class="icon-btn" data-act="calc" aria-label="Calculator">${ICON.calc}</button><button class="icon-btn" data-act="exgrid" aria-label="Question map">▦</button></div>${grid}
  <div class="card"><div class="qstem">${esc(q.q)}</div>${q.o.map((o, k) => `<button class="opt ${EX.ans[EX.i] === k ? 'sel' : ''}" data-act="expick" data-k="${k}"><b>${LET[k]}</b><span>${esc(o)}</span></button>`).join('')}</div>
  <div class="row" style="margin-top:14px"><button class="btn" data-act="exprev" ${EX.i === 0 ? 'disabled' : ''}>‹ Prev</button><button class="btn ghost" data-act="exflag">${EX.flag[EX.i] ? '⚑ Flagged' : '⚐ Flag'}</button><div class="spacer"></div>${EX.i + 1 < EX.qs.length ? '<button class="btn primary" data-act="exnext">Next ›</button>' : '<button class="btn primary" data-act="exfinish">Finish</button>'}</div>`;
}
function exFinish() {
  if (!EX || EX.result) return;
  clearInterval(exTimer);
  let ok = 0; const by = {}, bs = {};
  EX.qs.forEach((it, k) => {
    const good = EX.ans[k] === it.x.a; if (good) ok++;
    (by[it.ch] = by[it.ch] || { n: 0, ok: 0 }); by[it.ch].n++; if (good) by[it.ch].ok++;
    const sn = secOf(it.ch); (bs[sn] = bs[sn] || { n: 0, ok: 0 }); bs[sn].n++; if (good) bs[sn].ok++;
    grade(it.id, good); S.used[it.id] = 1;
  });
  const pct = Math.round(ok / EX.qs.length * 100);
  EX.result = { ok, pct, by, bs };
  S.exams.push({ t: Date.now(), n: EX.qs.length, pct, mins: Math.round((Date.now() - (EX.end - EX.mins * 60000)) / 60000) }); save();
  go('#/exam/run'); render();
}
function viewExamResult() {
  const r = EX.result, pass = r.pct >= 70;
  const secRows = SECTIONS.filter(s => r.bs[s.name]).map(s => { const x = r.bs[s.name], p = Math.round(x.ok / x.n * 100); return `<li class="row" style="padding:10px 0"><div style="flex:1"><div style="font-weight:650">${s.name}</div><div class="bar" style="margin-top:6px"><i style="width:${p}%;background:${p >= 70 ? 'var(--ok)' : 'var(--bad)'}"></i></div></div><span class="num small" style="width:84px;text-align:right">${x.ok}/${x.n} · ${p}%</span></li>`; }).join('');
  const chRows = Object.keys(r.by).sort((a, b) => (r.by[a].ok / r.by[a].n) - (r.by[b].ok / r.by[b].n)).map(c => `<span class="pill ${r.by[c].ok / r.by[c].n >= .7 ? 'low' : 'high'}">Ch.${c} · ${r.by[c].ok}/${r.by[c].n}</span>`).join(' ');
  const rows = EX.qs.map((it, k) => { const q = it.x, a = EX.ans[k], good = a === q.a; return `<li style="padding:12px 0"><div class="row" style="align-items:flex-start"><span class="pill ${good ? 'low' : 'high'}">${k + 1}</span><div style="flex:1"><div style="font-weight:600">${esc(q.q)}</div><div class="small" style="color:var(--ok)">✓ ${LET[q.a]}. ${esc(q.o[q.a])}</div>${good ? '' : `<div class="small" style="color:var(--bad)">${a === null ? 'Unanswered' : '✗ ' + LET[a] + '. ' + esc(q.o[a])}</div><div class="small muted">${esc(clean(q.w[q.a]))}</div><div style="margin-top:4px">${refPill(q.r)}</div>`}</div></div></li>`; }).join('');
  return `<div class="stack"><section class="card" style="text-align:center"><div class="eyebrow">Result</div><div class="score num" style="margin-top:6px;color:${pass ? 'var(--ok)' : 'var(--bad)'}">${r.pct}%</div><p class="muted">${r.ok} / ${EX.qs.length} · ${pass ? 'Above' : 'Below'} the 70% pass mark${r.pct >= 70 && r.pct < 80 ? ' — but aim for 80%+' : ''}</p><div class="row wrapx" style="justify-content:center;margin-top:8px"><button class="btn primary" data-act="exstart" data-n="${EX.qs.length}">New mock (fresh questions)</button><a class="btn" href="#/exam" data-act="exdone">Close</a></div></section>
  <section class="card"><h3>By section</h3><ul class="list">${secRows}</ul><div class="eyebrow" style="margin:10px 0 6px">Weakest chapters first</div><div class="row wrapx" style="gap:6px">${chRows}</div></section>
  <section class="card"><h3>Review</h3><ul class="list">${rows}</ul></section></div>`;
}

/* ---------- tools: calculator, audio, numbers, traps ---------- */
let CALC = { d: '0', acc: null, op: null, fresh: true };
function calcFmt(x) { if (!isFinite(x) || Math.abs(x) >= 1e8) return 'E'; let s = String(Math.round(x * 1e8) / 1e8); if (s.replace('-', '').replace('.', '').length > 8) { const dp = Math.max(0, 8 - String(Math.trunc(Math.abs(x))).length); s = String(+x.toFixed(dp)); } return s; }
function calcPress(k) {
  const C = CALC, num = () => parseFloat(C.d);
  if (C.d === 'E' && k !== 'C') return;
  if (/\d/.test(k)) { if (C.fresh) { C.d = k; C.fresh = false; } else if (C.d.replace(/[-.]/g, '').length < 8) C.d = C.d === '0' ? k : C.d + k; }
  else if (k === '.') { if (C.fresh) { C.d = '0.'; C.fresh = false; } else if (!C.d.includes('.')) C.d += '.'; }
  else if (k === 'C') CALC = { d: '0', acc: null, op: null, fresh: true };
  else if (k === '⌫') { C.d = C.d.length > 1 ? C.d.slice(0, -1) : '0'; if (C.d === '-') C.d = '0'; }
  else if (k === '±') C.d = C.d === '0' ? '0' : C.d.startsWith('-') ? C.d.slice(1) : '-' + C.d;
  else if ('+-×÷'.includes(k) || k === '=') {
    if (C.op && !C.fresh) { const a = C.acc, b = num(); const r = C.op === '+' ? a + b : C.op === '-' ? a - b : C.op === '×' ? a * b : a / b; C.d = calcFmt(r); C.acc = C.d === 'E' ? null : r; } else C.acc = num();
    C.op = k === '=' ? null : k; C.fresh = true;
  }
  const el = $('#cdisp'); if (el) el.textContent = CALC.d;
}
function calcSheet() {
  if ($('#csheet')) { $('#csheet').remove(); return; }
  const s = document.createElement('div'); s.className = 'sheet'; s.id = 'csheet';
  const keys = ['C', '⌫', '±', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '=', ''];
  s.innerHTML = `<div style="max-width:340px"><div class="row"><b style="flex:1">Exam calculator</b><button class="icon-btn" data-act="calc" aria-label="Close">✕</button></div>
  <div id="cdisp" class="num" style="margin:12px 0;padding:14px;border-radius:12px;background:var(--surface2);border:1px solid var(--line);text-align:right;font-size:2rem;font-weight:700;min-height:62px;overflow:hidden">${CALC.d}</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${keys.map(k => k ? `<button class="btn ${'÷×-+='.includes(k) ? 'primary' : ''}" data-act="ck" data-k="${k}" style="min-height:54px;font-size:1.15rem;padding:0">${k}</button>` : '<span></span>').join('')}</div>
  <p class="tiny muted" style="margin-top:10px">Four functions, 8 digits, like the one on exam day. Work in thousands: 14.7 instead of 14,700,000.</p></div>`;
  s.addEventListener('click', e => { if (e.target === s) s.remove(); });
  document.body.appendChild(s);
}
const NUMRE = /(\$|%|\b\d+\s*(?:-|to)?\s*\d*\s*(?:days?|business|months?|years?|hours?|minutes?|shares|percent|trading)\b|\b\d{2,}\b|\d[,.]\d)/i;
const numCards = () => ITEMS.filter(i => i.kind === 'card' && NUMRE.test(i.x.b));
const allTraps = ch => { const out = []; DATA.chapters.forEach(c => { if (ch && c.id !== ch) return; c.traps.forEach((t, k) => out.push({ kind: 'trap', id: 'trap:' + c.id + ':' + k, ch: c.id, text: t })); }); return out; };
function viewNumbers() {
  const cs = numCards();
  return `<div class="stack"><div class="row"><a class="icon-btn" href="#/practice" aria-label="Back">${CHEV}</a><div style="flex:1"><h1>Numbers to know</h1><p class="muted small">${cs.length} cards where the answer is a number, deadline or limit. Searchable.</p></div></div>
  <div class="row wrapx"><button class="btn primary" data-act="numdrill">Quick drill · 25</button><button class="btn" data-act="listen" data-kind="numbers">🎧 Listen</button></div>
  <input class="search" id="nq" placeholder="Search (e.g. 30 days, SIPC, margin)…" autocomplete="off"><div class="card" style="padding:0 16px"><ul class="list" id="nl">${numHtml('')}</ul></div></div>`;
}
const numHtml = q => { const l = numCards().filter(i => (i.x.f + ' ' + i.x.b).toLowerCase().includes(q.toLowerCase())); return l.length ? l.map(i => `<li style="padding:11px 0"><div class="row" style="align-items:flex-start;gap:10px"><span class="pill acc">${i.ch}</span><div style="flex:1"><div style="font-weight:650">${esc(i.x.f)}</div><div class="muted small">${inline(i.x.b)}</div></div></div></li>`).join('') : '<li class="empty">No match.</li>'; };
/* audio */
let AUD = null;
const speechText = s => String(s).replace(/\*\*|`|\*/g, '').replace(/→/g, ' leads to ').replace(/≥/g, ' at least ').replace(/≤/g, ' at most ').replace(/&/g, ' and ').replace(/\s+/g, ' ');
function audioItems(kind, ch) {
  if (kind === 'traps') return shuffle(allTraps(ch)).map(t => ({ t: 'trap', ch: t.ch, text: t.text }));
  const cs = kind === 'numbers' ? shuffle(numCards()).slice(0, 60) : shuffle(ITEMS.filter(i => i.kind === 'card' && (!ch || i.ch === ch))).slice(0, 60);
  return cs.map(i => ({ t: 'card', ch: i.ch, f: i.x.f, b: i.x.b }));
}
function audioStart(kind, ch) {
  if (!('speechSynthesis' in window)) { toast('Audio is not supported on this browser.'); return; }
  speechSynthesis.cancel(); AUD = { items: audioItems(kind, ch), i: 0, playing: true, rate: 1, kind, ch, phase: 'f', tok: 0 };
  go('#/listen'); audioSpeak();
}
function say(text, A, tok, cb) { const u = new SpeechSynthesisUtterance(speechText(text)); u.lang = 'en-US'; u.rate = A.rate; u.onend = () => { if (AUD === A && A.tok === tok && A.playing) cb(); }; speechSynthesis.speak(u); }
function audioSpeak() {
  const A = AUD; if (!A || !A.playing) return;
  const it = A.items[A.i]; if (!it) { A.playing = false; render(); return; }
  const tok = ++A.tok, next = () => { setTimeout(() => { if (AUD === A && A.tok === tok && A.playing) { A.i++; A.phase = 'f'; render(); audioSpeak(); } }, 900); };
  speechSynthesis.cancel(); A.phase = 'f'; render();
  if (it.t === 'trap') say(it.text, A, tok, next);
  else say(it.f, A, tok, () => setTimeout(() => { if (AUD === A && A.tok === tok && A.playing) { A.phase = 'b'; render(); say(it.b, A, tok, next); } }, 2500 / A.rate));
}
function audioStop() { if (AUD) { AUD.playing = false; AUD.tok++; } try { speechSynthesis.cancel(); } catch (e) { } }
function viewListen() {
  const A = AUD; if (!A) return `<div class="empty"><p>No audio session.</p><a class="btn" href="#/practice">Back</a></div>`;
  const it = A.items[A.i], done = !it;
  const body = done ? '<h2>Finished 🎧</h2>' : it.t === 'trap' ? `<div class="eyebrow">Trap · Ch. ${it.ch}</div><div class="prose" style="margin-top:8px;font-size:1.1rem">${md(it.text)}</div>` : `<div class="eyebrow">Card · Ch. ${it.ch}</div><div class="qstem" style="margin-top:8px">${esc(it.f)}</div><div style="margin-top:14px;font-size:1.05rem;min-height:48px">${A.phase === 'b' ? inline(it.b) : '<span class="muted">…</span>'}</div>`;
  return `<div class="stack"><div class="run-top"><button class="icon-btn" data-act="audiostop" aria-label="Close">✕</button><div class="bar"><i style="width:${Math.round(A.i / A.items.length * 100)}%"></i></div><span class="small muted num">${Math.min(A.i + 1, A.items.length)}/${A.items.length}</span></div>
  <section class="card" style="min-height:220px">${body}</section>
  <div class="row" style="justify-content:center;gap:14px"><button class="icon-btn" style="width:52px;height:52px" data-act="aprev" aria-label="Previous">⏮</button><button class="btn primary" style="min-width:120px" data-act="aplay">${A.playing ? '⏸ Pause' : '▶ Play'}</button><button class="icon-btn" style="width:52px;height:52px" data-act="anext" aria-label="Next">⏭</button></div>
  <div class="row" style="justify-content:center;gap:8px">${[0.9, 1, 1.2, 1.4].map(r => `<button class="btn sm ${A.rate === r ? 'primary' : ''}" data-act="arate" data-r="${r}">${r}×</button>`).join('')}</div>
  <p class="tiny muted" style="text-align:center">Screen can lock on most phones; keep this page open. Uses your device’s built-in English voice.</p></div>`;
}

function pairSheet() {
  const s = document.createElement('div'); s.className = 'sheet'; s.id = 'psheet';
  s.innerHTML = `<div><div class="row"><h2 style="flex:1">Choose a deck</h2><button class="icon-btn" data-act="closep" aria-label="Close">✕</button></div><ul class="list" style="margin-top:8px">${PAIRS.map((p, k) => ({ p, k })).sort((x, y) => x.p.ch - y.p.ch).map(({ p, k }) => `<li><button class="row" data-act="pairdeck" data-k="${k}" style="width:100%;background:none;border:0;padding:12px 0;text-align:left"><span class="pill acc">${p.ch}</span><div style="flex:1;font-weight:650">${esc(p.title)}</div><span class="muted small">${p.items.length}</span></button></li>`).join('')}</ul></div>`;
  s.addEventListener('click', e => { if (e.target === s) s.remove(); });
  document.body.appendChild(s);
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
  if (!S.act) return;
  const h = (location.hash || '#/').slice(2).split('/'), r = h[0] || '';
  let html = '', tab = r;
  if (r === '') html = viewHome();
  else if (r === 'learn') { tab = 'learn'; html = h[1] ? viewChapter(h[1], h[2] || 'brief') : viewLearn(); }
  else if (r === 'practice' || r === 'glossary') { tab = 'practice'; html = r === 'glossary' ? viewGlossary() : viewPractice(); }
  else if (r === 'numbers') { tab = 'practice'; html = viewNumbers(); }
  else if (r === 'listen') { tab = 'practice'; html = viewListen(); }
  else if (r === 'run') { tab = 'practice'; html = viewRun(); }
  else if (r === 'exam') { tab = 'exam'; html = h[1] === 'run' ? viewExamRun() : viewExam(); }
  else html = viewHome();
  if (r !== 'listen' && AUD && AUD.playing) audioStop();
  APP.innerHTML = html;
  const nq = $('#nq'); if (nq) nq.addEventListener('input', () => ($('#nl').innerHTML = numHtml(nq.value)));
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
    case 'closep': $('#psheet').remove(); break;
    case 'closesheet': $('#sheet').remove(); break;
    case 'savesettings': S.examDate = $('#sd').value || null; S.theme = $('#st').value; save(); applyTheme(); $('#sheet').remove(); render(); break;
    case 'export': { const b = new Blob([JSON.stringify(S)], { type: 'application/json' }), u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'sie-prep-progress.json'; l.click(); break; }
    case 'reset': if (confirm('Erase all progress on this device?')) { S = { used: {}, act: S.act, checks: {}, rec: {}, exams: [], examDate: '2026-11-30', theme: 'auto', log: {}, flags: {} }; save(); applyTheme(); $('#sheet').remove(); go('#/'); render(); } break;
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
    case 'dcheck': { const it = R.items[R.i], v = parseFloat(($('#dans').value || '').replace(/[$,\s]/g, '')); if (isNaN(v)) { toast('Enter a number'); break; } const ok = Math.abs(v - it.p.ans) < (it.p.tol || 0.51); R.picked = ok; R.state = 'show'; R.lastOk = ok; render(); break; }
    case 'next': { const it = R.items[R.i]; advance(it.kind === 'q' || it.kind === 'pair' ? R.lastOk : R.picked === true); render(); break; }
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
    case 'calc': calcSheet(); break;
    case 'ck': calcPress(t.dataset.k); break;
    case 'listen': audioStart(t.dataset.kind, t.dataset.ch ? +t.dataset.ch : 0); break;
    case 'audiostop': audioStop(); AUD = null; go('#/practice'); break;
    case 'aplay': if (AUD) { if (AUD.playing) { audioStop(); } else { AUD.playing = true; audioSpeak(); } render(); } break;
    case 'anext': if (AUD) { const pl = AUD.playing; audioStop(); AUD.i = Math.min(AUD.items.length, AUD.i + 1); AUD.playing = pl; pl ? audioSpeak() : render(); } break;
    case 'aprev': if (AUD) { const pl = AUD.playing; audioStop(); AUD.i = Math.max(0, AUD.i - 1); AUD.playing = pl; pl ? audioSpeak() : render(); } break;
    case 'arate': if (AUD) { AUD.rate = +t.dataset.r; if (AUD.playing) audioSpeak(); else render(); } break;
    case 'numdrill': startRun('Numbers drill', shuffle(numCards()).slice(0, 25), { back: '#/numbers' }); break;
    case 'trapsprint': startRun('Traps sprint', shuffle(allTraps(0)).slice(0, 20), { back: '#/practice' }); break;
    case 'pairmix': startRun('X or Y? mix', shuffle(pairItems(PAIRS)).slice(0, 20), { back: '#/practice' }); break;
    case 'pairlist': pairSheet(); break;
    case 'pairdeck': { const p = PAIRS[+t.dataset.k]; $('#psheet') && $('#psheet').remove(); startRun(p.title, shuffle(pairItems([p])), { back: '#/practice' }); break; }
    case 'pairpick': { if (R.state !== 'ask') break; const it = R.items[R.i]; R.picked = t.dataset.k; R.state = 'show'; const ok = R.picked === it.v; if (!it.retry) grade(it.id, ok); R.lastOk = ok; render(); break; }
    case 'gtrap': advance(+t.dataset.g > 0); render(); break;
    case 'chk': S.checks[t.dataset.k] = !S.checks[t.dataset.k]; save(); render(); break;
    case 'unlock': { const v = ($('#akey').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (cyrb53(v) === KEYHASH) { S.act = true; save(); $('#gate').remove(); render(); } else { const g = $('#gate .card'); g.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 300 }); $('#gerr').textContent = 'Invalid activation key.'; } break; }
  }
});

/* ---------- nav + boot ---------- */
const nav = [['today', 'Today', '#/'], ['learn', 'Learn', '#/learn'], ['practice', 'Practice', '#/practice'], ['exam', 'Exam', '#/exam']];
$('#nav').innerHTML = '<div class="in">' + nav.map(n => `<a href="${n[2]}" data-t="${n[0]}">${ICON[n[0]]}${n[1]}</a>`).join('') + '</div>';
applyTheme();
function showGate() {
  const g = document.createElement('div'); g.id = 'gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100;background:var(--bg);display:grid;place-items:center;padding:20px';
  g.innerHTML = `<div class="card" style="width:100%;max-width:420px;text-align:center;padding:28px 22px"><div class="brand" style="justify-content:center;font-size:1.3rem"><i></i>SIE Prep</div>
  <p class="muted" style="margin:14px 0 4px">Licensed edition · single user</p><h2 style="margin:6px 0 16px">Enter your activation key</h2>
  <input class="num-in" id="akey" placeholder="XXXXXXXXXXXXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" style="text-align:center;letter-spacing:.12em;font-size:1.1rem">
  <div id="gerr" class="small" style="color:var(--bad);min-height:20px;margin:8px 0"></div><button class="btn primary block" data-act="unlock">Activate</button></div>`;
  document.body.appendChild(g); const i = $('#akey'); i.focus(); i.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-act=unlock]').click(); });
}
if (!S.act) showGate(); else render();
})();
