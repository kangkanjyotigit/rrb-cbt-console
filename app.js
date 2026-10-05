"use strict";
/* SECTION CONTROL — CBT CONSOLE app logic. Works offline (content.js is embedded). */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const EXAM_TS = new Date("2026-10-12T09:00:00+05:30").getTime();
const LS = "rrb-console-v1";

/* ---------- tiny markdown renderer (headings, tables, lists, bold, code, quote, hr) ---------- */
function md(src) {
  const lines = String(src).split("\n");
  let html = "", i = 0, inList = null;
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|\W)\*([^*\n]+)\*/g, "$1<i>$2</i>");
  const closeList = () => { if (inList) { html += inList === "ol" ? "</ol>" : "</ul>"; inList = null; } };
  while (i < lines.length) {
    const ln = lines[i];
    if (/^\s*$/.test(ln)) { closeList(); i++; continue; }
    if (/^```/.test(ln)) {
      closeList(); let code = [];
      i++; while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; html += "<pre><code>" + esc(code.join("\n")) + "</code></pre>"; continue;
    }
    if (/^\s*---+\s*$/.test(ln)) { closeList(); html += "<hr>"; i++; continue; }
    const h = ln.match(/^(#{1,4})\s+(.*)$/);
    if (h) { closeList(); const lv = Math.min(h[1].length + 1, 4); html += "<h" + lv + ">" + inline(h[2]) + "</h" + lv + ">"; i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|[\s:\-|]+\|\s*$/.test(lines[i + 1])) {
      closeList();
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => inline(c.trim()));
      const head = cells(ln); i += 2;
      html += "<table><tr>" + head.map(c => "<th>" + c + "</th>").join("") + "</tr>";
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        html += "<tr>" + cells(lines[i]).map(c => "<td>" + c + "</td>").join("") + "</tr>"; i++;
      }
      html += "</table>"; continue;
    }
    const li = ln.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
    if (li) {
      const kind = /^\s*\d/.test(ln) ? "ol" : "ul";
      if (inList !== kind) { closeList(); html += "<" + kind + ">"; inList = kind; }
      html += "<li>" + inline(li[1]) + "</li>"; i++; continue;
    }
    const bq = ln.match(/^\s*>\s?(.*)$/);
    if (bq) { closeList(); html += "<blockquote>" + inline(bq[1]) + "</blockquote>"; i++; continue; }
    const dt = ln.match(/^\s*>>\s?(.*)$/);
    if (dt) { closeList(); html += "<details class='reveal'><summary>Check answer</summary><p>" + inline(dt[1]) + "</p></details>"; i++; continue; }
    closeList(); html += "<p>" + inline(ln.trim()) + "</p>"; i++;
  }
  closeList();
  return html;
}

/* ---------- store ---------- */
function load() {
  try { return Object.assign({ attempts: [], errors: [], mocks: [], checks: {} }, JSON.parse(localStorage.getItem(LS) || "{}")); }
  catch (e) { return { attempts: [], errors: [], mocks: [], checks: {} }; }
}
let S = load();
const save = () => localStorage.setItem(LS, JSON.stringify(S));

/* ---------- header clocks ---------- */
function tickHead() {
  const now = Date.now();
  const c = $("#clock"); if (c) c.textContent = new Date().toLocaleString("en-IN", { hour12: false });
  const el = $("#countdown"); if (!el) return;
  let d = EXAM_TS - now;
  if (d <= 0) { el.textContent = "LIVE"; return; }
  const dd = Math.floor(d / 864e5), hh = Math.floor(d % 864e5 / 36e5),
    mm = Math.floor(d % 36e5 / 6e4), ss = Math.floor(d % 6e4 / 1e3);
  el.textContent = dd + "d " + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}
setInterval(tickHead, 1000);

/* ---------- coverage map ---------- */
const COVER = [
  ["M1 Number System · LCM/HCF", "T1", "M124-drill"], ["M2 Ratio · Proportion", "T1", "M124-drill"],
  ["M3 % · Profit · Discount", "T1", "M3-drill"], ["M4 Averages", "T1", "M124-drill"],
  ["M5 Speed · Work", "T1", "M5-drill"], ["M6 Algebra · AP", "T2", "M678-drill"],
  ["M7 Geometry · Volumes", "T2", "M678-drill"], ["M8 Prob · Stats", "T2", "M678-drill"],
  ["CALC-GYM arithmetic", "T1", null], ["D1 DI sets", "T1", "D1-drill"],
  ["D2 Multi-source · DS", "T1", "D2D3-drill"], ["D3 Arrangement", "T2", "D2D3-drill"],
  ["L1 Syllogism", "T1", "L-drill"], ["L2 Binary Logic", "T1", "L-drill"],
  ["L3 Blood · Family", "T1", "L345-drill"], ["L4 Clocks · Calendars", "T2", "L345-drill"],
  ["L5 Assumptions", "T2", "L345-drill"], ["L6 Puzzles", "T1", "L-drill"],
  ["R1·R2·R3 Reading Comp.", "T1", "RC"], ["N1 Analogy", "T1", "N-drill"],
  ["N2 Series", "T1", "N-drill"], ["N3 Coding", "T1", "N-drill"],
  ["N4 Ranking", "T1", "N-drill"], ["X1 Insurance", "T3", "X1-drill"],
];
const DAYBOARD = [
  "City intimation slip downloaded — date/shift/city noted",
  "A-2 eye test done (6/9 unaided; Annexure VI process started)",
  "CALC-GYM 20 min",
  "1 drill timed + errors logged",
  "1 RC passage",
  "MOCK-1 at 09:00–11:00, score in tracker",
  "MOCK-2 at 09:00–11:00",
  "CBAT 20 min (weakest battery first)",
];

/* ---------- stats ---------- */
function clusterOf(q, drillId) {
  const t = (q.tags || "").split(/[,|]/)[0].trim();
  const m = t.match(/[A-Za-z]+\d*/);
  if (m) return m[0].toUpperCase();
  const d = (drillId || "").match(/^[A-Za-z]+\d*/);
  return d ? d[0].toUpperCase() : "?";
}
function stats() {
  const a = S.attempts;
  const att = a.filter(x => !x.skip).length, ok = a.filter(x => x.ok).length;
  const byC = {};
  a.forEach(x => { if (x.skip) return; byC[x.cluster] = byC[x.cluster] || { a: 0, ok: 0 }; byC[x.cluster].a++; if (x.ok) byC[x.cluster].ok++; });
  return { att, ok, acc: att ? Math.round(100 * ok / att) : null, byC, mocks: S.mocks.length, errs: S.errors.length };
}

/* ---------- router ---------- */
const V = $("#view");
$$("#nav button").forEach(b => b.addEventListener("click", () => {
  $$("#nav button").forEach(x => x.classList.remove("on")); b.classList.add("on");
  window.scrollTo(0, 0); RENDER[b.dataset.v]();
}));

/* ================= DASHBOARD ================= */
function vDash() {
  const st = stats();
  const acc = st.acc === null ? "--" : st.acc + "%";
  const accCls = st.acc === null ? "info" : st.acc >= 95 ? "good" : st.acc >= 85 ? "warn" : "bad";
  const done = DAYBOARD.filter((_, i) => S.checks["d" + i]).length;
  const drillIds = [...new Set(S.attempts.map(x => x.ref))].length;
  V.innerHTML =
    "<h1>Control room</h1><p class='sub'>Everything green you need for 12–13 Oct. Train weakest-first; log every miss.</p>" +
    "<div class='grid g4'>" +
    "<div class='card stat " + accCls + "'><span>ACCURACY</span><b>" + acc + "</b></div>" +
    "<div class='card stat info'><span>QUESTIONS FACED</span><b>" + st.att + "</b></div>" +
    "<div class='card stat info'><span>MOCKS SCORED</span><b>" + st.mocks + "</b></div>" +
    "<div class='card stat warn'><span>OPEN ERRORS</span><b>" + st.errs + "</b></div></div>" +
    "<div class='grid g2' style='margin-top:12px'>" +
    "<div class='card'><h3>Today's board <span class='pill " + (done === DAYBOARD.length ? "g" : "a") + "'>" + done + "/" + DAYBOARD.length + "</span></h3>" +
    DAYBOARD.map((t, i) => "<label class='check" + (S.checks["d" + i] ? " done" : "") + "'><input type='checkbox' data-ch='d" + i + "'" + (S.checks["d" + i] ? " checked" : "") + "><span>" + esc(t) + "</span></label>").join("") + "</div>" +
    "<div class='card'><h3>Fire order</h3><p>CALC-GYM → weakest drill → RC passage → CBAT 20 min. Mocks only at 09:00–11:00.</p><div class='btnrow'>" +
    "<button class='btn' data-go='drill'>Start drill</button>" +
    "<button class='btn ghost' data-go='mock'>Sit a mock</button>" +
    "<button class='btn ghost' data-go='rc'>RC passage</button>" +
    "<button class='btn ghost' data-go='cbat'>CBAT 20 min</button></div>" +
    "<h3 style='margin-top:16px'>Coverage</h3><div class='prog'><i style='width:" + Math.round(100 * drillIds / 12) + "%'></i></div>" +
    "<small style='color:var(--dim)'>" + drillIds + "/12 drill decks touched · target: every T1 deck by 8 Oct</small></div></div>" +
    "<h2>Coverage board</h2><div class='card'><table class='data'><tr><th>Leaf</th><th>Tier</th><th>Deck</th><th>Your acc</th></tr>" +
    COVER.map(c => {
      const b = st.byC[c[0].split(" ")[0]];
      const cell = b ? Math.round(100 * b.ok / b.a) + "% <small>(" + b.a + ")</small>" : "<span style='color:var(--faint)'>—</span>";
      const deck = c[2] === "RC" ? "<button class='btn sm ghost' data-go='rc'>RC</button>"
        : c[2] ? "<button class='btn sm ghost' data-drill=\"" + c[2] + "\">" + c[2].replace("-drill", "") + "</button>" : "—";
      return "<tr><td>" + c[0] + "</td><td><span class='pill " + (c[1] === "T1" ? "g" : c[1] === "T2" ? "a" : "b") + "'>" + c[1] + "</span></td><td>" + deck + "</td><td class='mono'>" + cell + "</td></tr>";
    }).join("") + "</table></div>";
  $$("#view [data-ch]").forEach(c => c.addEventListener("change", () => { S.checks[c.dataset.ch] = c.checked; save(); vDash(); }));
  $$("#view [data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  $$("#view [data-drill]").forEach(b => b.addEventListener("click", () => runDrill(b.dataset.drill)));
}

/* ================= LESSONS (guided track) ================= */
const LESSON_ORDER = [
  ["M3-lesson", "1 · Percentages, Profit, Discount — learn from zero"],
  ["M5-lesson", "2 · Speed, Distance, Work — learn from zero"],
  ["D1-lesson", "3 · Data Interpretation — learn from zero"],
  ["L-lesson", "4 · Logic: syllogism, binary, puzzles — learn from zero"],
];
function vLessons() {
  const items = window.RRB.lessons || [];
  const byId = {}; items.forEach(s => byId[s.id] = s);
  const read = S.lessonsRead || {};
  const done = LESSON_ORDER.filter(([id]) => read[id]).length;
  V.innerHTML = "<h1>Lessons</h1><p class='sub'>Guided chapters: intuition first, worked examples, hidden checkpoints. Read in order — " + done + "/" + LESSON_ORDER.length + " done.</p>" +
    LESSON_ORDER.map(([id, label]) => {
      const s = byId[id];
      if (!s) return "<div class='libitem'><span>" + esc(label) + "</span><small>building…</small></div>";
      return "<div class='libitem' data-id='" + id + "'><span>" + (read[id] ? "✓ " : "") + esc(label) + "</span><small>" + Math.round(s.md.split(/\s+/).length / 100) / 10 + "k words →</small></div>";
    }).join("") + "<div id='doc'></div>";
  $$("#view .libitem[data-id]").forEach(d => d.addEventListener("click", () => {
    const s = byId[d.dataset.id];
    if (!s) return;
    $("#doc").innerHTML = "<div class='doc'>" + md(s.md) + "</div><div class='btnrow'><button class='btn sm' id='mk'>Mark lesson read ✓</button></div>";
    window.scrollTo(0, $("#doc").offsetTop - 130);
    $("#mk").addEventListener("click", () => { S.lessonsRead = S.lessonsRead || {}; S.lessonsRead[s.id] = true; save(); vLessons(); });
  }));
}

/* ================= LEARN ================= */
let learnQ = "";
function vLearn() {
  const items = window.RRB.sheets;
  const f = learnQ.toLowerCase();
  const list = items.filter(s => !f || (s.title + " " + s.id).toLowerCase().includes(f));
  V.innerHTML = "<h1>Learn</h1><p class='sub'>" + items.length + " concept sheets · self-contained · Hindi terms inline</p>" +
    "<input class='search' id='lq' placeholder='filter: ratio, venn, clock…' value='" + esc(learnQ) + "'>" +
    "<div id='lib'>" + list.map(s => "<div class='libitem' data-id='" + s.id + "'><span>" + esc(s.title) + "</span><small>" + s.id + "</small></div>").join("") + "</div><div id='doc'></div>";
  $("#lq").addEventListener("input", e => { learnQ = e.target.value; vLearn(); const n = $("#lq"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
  $$("#lib .libitem").forEach(d => d.addEventListener("click", () => {
    const s = items.find(x => x.id === d.dataset.id);
    $("#doc").innerHTML = "<div class='backrow'><button class='btn sm ghost' id='bk'>← library</button></div><div class='doc'>" + md(s.md) + "</div>";
    window.scrollTo(0, $("#doc").offsetTop - 130);
    $("#bk").addEventListener("click", () => $("#doc").innerHTML = "");
  }));
}

/* ================= PATTERNS ================= */
function vPatterns() {
  const items = window.RRB.catalogs;
  V.innerHTML = "<h1>Pattern catalog</h1><p class='sub'>" + items.length + " catalogs · signature → recipe → trap → target seconds</p>" +
    items.map(s => "<div class='libitem' data-id='" + s.id + "'><span>" + esc(s.title) + "</span><small>" + s.id + "</small></div>").join("") + "<div id='doc'></div>";
  $$("#view .libitem").forEach(d => d.addEventListener("click", () => {
    const s = items.find(x => x.id === d.dataset.id);
    $("#doc").innerHTML = "<div class='doc'>" + md(s.md) + "</div>";
    window.scrollTo(0, $("#doc").offsetTop - 130);
  }));
}

/* ================= DRILL ENGINE ================= */
function optLetter(i) { return "ABCD"[i]; }
function deepHTML(q) {
  if (!q.deep) return "";
  const d = q.deep;
  return "<div class='deep'><div><b>Foundation.</b> " + esc(d.basis || "") + "</div>" +
    "<div><b>Lightning route.</b> " + esc(d.trick || "") + "</div>" +
    "<div><b>Trap.</b> " + esc(d.trap || "") + "</div>" +
    "<div><b>Clock.</b> " + esc(d.clock || "") + "</div></div>";
}
function runDrill(id, rcMode) {
  const D = rcMode ? window.RRB.rcbanks.find(x => x.id === id) : window.RRB.drills.find(x => x.id === id);
  if (!D) return;
  const st = { i: 0, ok: 0, att: 0, t0: Date.now(), id, rc: !!rcMode };
  const show = () => {
    const q = D.questions[st.i];
    const p = st.i / D.questions.length * 100;
    let ph = "";
    if (q.passage_body) ph = "<div class='passage'>" + esc(q.passage_body).split("\n").map(x => "<p>" + x + "</p>").join("") + "</div>";
    else if (rcMode && D.passages) {
      const key = Object.keys(D.passages).find(k => (q.passage || "").toLowerCase().includes(k.toLowerCase().slice(0, 12)) || k.toLowerCase().includes((q.passage || "").toLowerCase().slice(0, 12)));
      const body = D.passages[key || Object.keys(D.passages)[Math.floor(st.i / (D.questions.length / Object.keys(D.passages).length))]] || "";
      if (body) ph = "<div class='passage'>" + esc(body).split("\n").map(x => "<p>" + x + "</p>").join("") + "</div>";
    }
    V.innerHTML = "<div class='backrow'><button class='btn sm ghost' id='bk'>← decks</button></div>" +
      "<div class='slimline'><span class='mono'>" + esc(id) + "</span><span>·</span><span class='mono'>" + (st.i + 1) + "/" + D.questions.length + "</span><span>·</span><span class='mono' style='color:var(--grn)'>✓ " + st.ok + "</span><span class='mono' style='color:var(--red)'>✗ " + (st.att - st.ok) + "</span></div>" +
      "<div class='prog'><i style='width:" + p + "%'></i></div>" +
      "<div class='qcard'><div class='qmeta'><span class='tagchip'>" + esc(clusterOf(q, id)) + "</span>" +
      (q.tags ? "<span class='tagchip'>" + esc(q.tags) + "</span>" : "") + "</div>" + ph +
      "<div class='qstem'><b class='mono'>Q" + q.n + ".</b> " + esc(q.stem) + "</div><div id='opts'>" +
      q.options.map((o, k) => "<button class='opt' data-k='" + k + "'><span class='k'>" + optLetter(k) + "</span><span>" + esc(o) + "</span></button>").join("") +
      "</div><div class='btnrow'><button class='btn warn sm' id='skip'>Skip (blank)</button></div><div id='fb'></div></div>";
    $("#bk").addEventListener("click", () => rcMode ? vRC() : vDrill());
    $("#skip").addEventListener("click", () => {
      S.attempts.push({ t: Date.now(), kind: rcMode ? "rc" : "drill", ref: id, cluster: clusterOf(q, id), ok: false, skip: true });
      save(); st.i++; st.i < D.questions.length ? show() : finish();
    });
    $$("#opts .opt").forEach(b => b.addEventListener("click", () => answer(parseInt(b.dataset.k, 10))));
    function answer(k) {
      $$("#opts .opt").forEach(x => x.disabled = true);
      const good = optLetter(k) === q.key;
      st.att++; if (good) st.ok++;
      $$("#opts .opt")[k].classList.add(good ? "right" : "wrong");
      if (!good) $$("#opts .opt")["ABCD".indexOf(q.key)].classList.add("right");
      S.attempts.push({ t: Date.now(), kind: rcMode ? "rc" : "drill", ref: id, cluster: clusterOf(q, id), ok: good, skip: false });
      save();
      $("#fb").innerHTML = "<div class='sol'>" + (good ? "<b>Correct.</b> " : "<b>Miss.</b> Key " + q.key + ". ") + esc(q.solution || "") + deepHTML(q) +
        "<div class='btnrow'><select id='cls'><option value=''>log error class…</option><option>CONCEPT</option><option>CALC</option><option>MISREAD</option><option>TRAP</option><option>GUESS</option><option>TIME</option></select>" +
        "<button class='btn sm ghost' id='logerr'>Log it</button>" +
        "<button class='btn sm' id='nx'>" + (st.i + 1 < D.questions.length ? "Next →" : "Finish") + "</button></div></div>";
      $("#nx").addEventListener("click", () => { st.i++; st.i < D.questions.length ? show() : finish(); });
      const le = $("#logerr");
      if (le) le.addEventListener("click", () => {
        const c = $("#cls").value || "CONCEPT";
        S.errors.push({ t: Date.now(), source: id + " Q" + q.n, cluster: clusterOf(q, id), cls: c, note: q.stem.slice(0, 120) });
        save(); le.textContent = "Logged ✓"; le.disabled = true;
      });
    }
  };
  const finish = () => {
    const mins = ((Date.now() - st.t0) / 6e4).toFixed(1);
    V.innerHTML = "<h1>Deck complete</h1><div class='grid g3'>" +
      "<div class='card stat " + (st.ok / Math.max(1, st.att) >= .9 ? "good" : "warn") + "'><span>ACCURACY</span><b>" + st.ok + "/" + st.att + "</b></div>" +
      "<div class='card stat info'><span>TIME</span><b>" + mins + "m</b></div>" +
      "<div class='card stat info'><span>PACE</span><b>" + (st.att ? Math.round(st.att / mins * 10) / 10 : 0) + "/m</b></div></div>" +
      "<div class='btnrow'><button class='btn' id='re'>Re-run deck</button><button class='btn ghost' id='bk2'>← decks</button><button class='btn ghost' data-go='log'>Open logbook</button></div>";
    $("#re").addEventListener("click", () => runDrill(id, rcMode));
    $("#bk2").addEventListener("click", () => rcMode ? vRC() : vDrill());
    $("[data-go='log']").addEventListener("click", () => go("log"));
  };
  show();
}
function vDrill() {
  const ds = window.RRB.drills;
  V.innerHTML = "<h1>Drill decks</h1><p class='sub'>25Q per deck (X1: 15) · tags carry attempt/skip cues · solutions after lock-in</p>" +
    ds.map(d => {
      const mine = S.attempts.filter(x => x.ref === d.id && !x.skip);
      const acc = mine.length ? Math.round(100 * mine.filter(x => x.ok).length / mine.length) + "%" : "—";
      return "<div class='libitem' data-id='" + d.id + "'><span>" + esc(d.title) + " <small>· " + d.questions.length + "Q</small></span><small>you: " + mine.length + " · " + acc + "</small></div>";
    }).join("");
  $$("#view .libitem").forEach(b => b.addEventListener("click", () => runDrill(b.dataset.id)));
}

/* ================= MOCK ENGINE ================= */
let MX = null;
function secOf(n) { return n <= 60 ? "A" : n <= 80 ? "B" : "C"; }
function startMock(id) {
  const M = window.RRB.mocks.find(x => x.id === id);
  MX = { id, M, ans: {}, flag: {}, cur: 1, sec: "ALL", left: 7200, timer: null, done: false };
  const draw = () => {
    const mm = String(Math.floor(MX.left / 60)).padStart(2, "0"), ss = String(MX.left % 60).padStart(2, "0");
    const list = M.questions.filter(q => MX.sec === "ALL" || secOf(q.n) === MX.sec);
    const q = M.questions.find(x => x.n === MX.cur);
    V.innerHTML = "<div class='examhead'><div><b>" + esc(id) + "</b> <span class='pill'>Sec " + MX.sec + "</span> " +
      ["ALL", "A", "B", "C"].map(s => "<button class='btn sm ghost' data-s='" + s + "'>" + s + "</button>").join(" ") + "</div>" +
      "<div class='timer mono" + (MX.left < 600 ? " low" : "") + "'>" + mm + ":" + ss + "</div></div>" +
      "<div class='palette'>" + list.map(p => {
        const c = MX.ans[p.n] ? "ans" : p.n === MX.cur ? "cur" : "";
        const f = MX.flag[p.n] ? " flag" : "";
        return "<button data-q='" + p.n + "' class='" + c + f + "'>" + p.n + "</button>";
      }).join("") + "</div>" +
      "<div class='qcard'><div class='qmeta'><span class='tagchip'>Sec " + secOf(q.n) + "</span>" +
      (q.tags ? "<span class='tagchip'>" + esc(q.tags) + "</span>" : "") +
      (q.passage ? "<span class='tagchip'>" + esc(q.passage) + "</span>" : "") + "</div>" +
      (q.passage_body ? "<div class='passage'>" + esc(q.passage_body).split("\n").map(x => "<p>" + x + "</p>").join("") + "</div>" : "") +
      "<div class='qstem'><b class='mono'>Q" + q.n + ".</b> " + esc(q.stem) + "</div><div id='opts'>" +
      q.options.map((o, k) => "<button class='opt" + (MX.ans[q.n] === optLetter(k) ? " right" : "") + "' data-k='" + k + "'><span class='k'>" + optLetter(k) + "</span><span>" + esc(o) + "</span></button>").join("") +
      "</div><div class='btnrow'><button class='btn ghost sm' id='clr'>Clear</button>" +
      "<button class='btn warn sm' id='flg'>" + (MX.flag[q.n] ? "★ Unflag" : "☆ Flag") + "</button>" +
      "<button class='btn ghost sm' id='pv'>← Prev</button><button class='btn ghost sm' id='nx'>Next →</button>" +
      "<button class='btn danger sm' id='sub'>Submit mock</button></div></div>";
    $$("#view [data-s]").forEach(b => b.addEventListener("click", () => { MX.sec = b.dataset.s; draw(); }));
    $$("#view [data-q]").forEach(b => b.addEventListener("click", () => { MX.cur = +b.dataset.q; draw(); }));
    $$("#opts .opt").forEach(b => b.addEventListener("click", () => {
      const L = optLetter(+b.dataset.k);
      MX.ans[q.n] = MX.ans[q.n] === L ? undefined : L;
      if (!MX.ans[q.n]) delete MX.ans[q.n];
      draw();
    }));
    $("#clr").addEventListener("click", () => { delete MX.ans[q.n]; draw(); });
    $("#flg").addEventListener("click", () => { MX.flag[q.n] = !MX.flag[q.n]; draw(); });
    $("#pv").addEventListener("click", () => { if (MX.cur > 1) MX.cur--; draw(); });
    $("#nx").addEventListener("click", () => { if (MX.cur < 100) MX.cur++; draw(); });
    $("#sub").addEventListener("click", () => {
      const n = Object.keys(MX.ans).length;
      if (confirm("Submit " + id + "? Answered " + n + "/100. " + (100 - n) + " blank.")) finishMock();
    });
  };
  clearInterval(MX.timer);
  MX.timer = setInterval(() => { MX.left--; const t = $(".timer"); if (t) { const mm = String(Math.floor(MX.left / 60)).padStart(2, "0"), ss = String(MX.left % 60).padStart(2, "0"); t.textContent = mm + ":" + ss; if (MX.left < 600) t.classList.add("low"); } if (MX.left <= 0) finishMock(); }, 1000);
  draw();
}
function finishMock() {
  if (!MX || MX.done) return; MX.done = true; clearInterval(MX.timer);
  let C = 0, W = 0, sec = { A: [0, 0], B: [0, 0], C: [0, 0] };
  MX.M.questions.forEach(q => {
    const a = MX.ans[q.n], s = secOf(q.n);
    if (!a) return;
    if (a === q.key) { C++; sec[s][0]++; } else { W++; sec[s][1]++; }
    S.attempts.push({ t: Date.now(), kind: "mock", ref: MX.id, cluster: clusterOf(q, MX.id), ok: a === q.key, skip: false });
  });
  const raw = Math.round((C - W / 3) * 100) / 100;
  S.mocks.push({ t: Date.now(), mock: MX.id, raw, C, W, blank: 100 - C - W, sec });
  save();
  const verdict = raw >= 88 && W <= 3 ? ["g", "G7 CLEAR — topper zone"] : raw >= 80 ? ["a", "Near — kill 2–3 more errors"] : ["r", "Below bar — review every miss"];
  V.innerHTML = "<h1>" + esc(MX.id) + " scored</h1><div class='grid g4'>" +
    "<div class='card stat info'><span>RAW (norm target 91+)</span><b>" + raw + "</b></div>" +
    "<div class='card stat good'><span>CORRECT</span><b>" + C + "</b></div>" +
    "<div class='card stat bad'><span>WRONG</span><b>" + W + "</b></div>" +
    "<div class='card stat warn'><span>BLANK</span><b>" + (100 - C - W) + "</b></div></div>" +
    "<div class='card' style='margin-top:12px'><span class='pill " + verdict[0] + "'>" + verdict[1] + "</span> " +
    "<small style='color:var(--dim)'>AMC " + sec.A[0] + "✓/" + sec.A[1] + "✗ · LC " + sec.B[0] + "✓/" + sec.B[1] + "✗ · MR " + sec.C[0] + "✓/" + sec.C[1] + "✗</small>" +
    "<div class='btnrow'><button class='btn' id='rev'>Review all 100</button><button class='btn ghost' id='bk'>← mocks</button></div></div><div id='revw'></div>";
  $("#bk").addEventListener("click", vMock);
  $("#rev").addEventListener("click", () => {
    $("#revw").innerHTML = MX.M.questions.map(q => {
      const a = MX.ans[q.n];
      const cls = !a ? "" : a === q.key ? "trap" : "";
      return "<div class='qcard trap' style='margin:10px 0;max-width:100%'><div class='qmeta'><b class='mono'>Q" + q.n + "</b>" +
        "<span class='pill " + (!a ? "" : a === q.key ? "g" : "r") + "'>you: " + (a || "blank") + " · key: " + q.key + "</span></div>" +
        "<div class='qstem'>" + esc(q.stem) + "</div>" +
        q.options.map((o, k) => "<div class='opt" + (optLetter(k) === q.key ? " right" : a === optLetter(k) ? " wrong" : "") + "'><span class='k'>" + optLetter(k) + "</span><span>" + esc(o) + "</span></div>").join("") +
        "<div class='sol'>" + esc(q.solution || "") + deepHTML(q) +
        "<div class='btnrow'><button class='btn sm ghost' data-e='" + q.n + "'>Log error</button></div></div></div>";
    }).join("");
    $$("#revw [data-e]").forEach(b => b.addEventListener("click", () => {
      const q = MX.M.questions.find(x => x.n === +b.dataset.e);
      S.errors.push({ t: Date.now(), source: MX.id + " Q" + q.n, cluster: clusterOf(q, MX.id), cls: "CONCEPT", note: q.stem.slice(0, 120) });
      save(); b.textContent = "Logged ✓"; b.disabled = true;
    }));
  });
}
function vMock() {
  const rows = window.RRB.mocks.map(m => {
    const h = S.mocks.filter(x => x.mock === m.id);
    const best = h.length ? Math.max(...h.map(x => x.raw)) : null;
    return "<div class='libitem' data-id='" + m.id + "'><span>" + esc(m.title) + " <small>· 100Q · 120 min · −⅓</small></span><small>" + (best === null ? "not sat" : "best " + best) + " · " + h.length + " sit</small></div>";
  }).join("");
  V.innerHTML = "<h1>Full mocks</h1><p class='sub'>Blueprint-exact 60/20/20 · keys separate until submit · sit only at 09:00–11:00</p>" + rows +
    "<div class='card' style='margin-top:12px'><h3>History</h3>" + (S.mocks.length ? "<table class='data'><tr><th>Mock</th><th>Raw</th><th>C/W/B</th><th>When</th></tr>" +
      S.mocks.slice().reverse().map(x => "<tr><td>" + x.mock + "</td><td class='mono'>" + x.raw + "</td><td class='mono'>" + x.C + "/" + x.W + "/" + x.blank + "</td><td>" + new Date(x.t).toLocaleString("en-IN") + "</td></tr>").join("") + "</table>" : "<p class='sub'>No sittings yet. G7 needs 2 mocks ≥88 raw, ≤3 wrong.</p>") + "</div>";
  $$("#view .libitem").forEach(b => b.addEventListener("click", () => {
    if (confirm("Start " + b.dataset.id + "? 120:00 on the clock. No pauses.")) startMock(b.dataset.id);
  }));
}

/* ================= RC ================= */
function vRC() {
  V.innerHTML = "<h1>RC bank</h1><p class='sub'>Self-contained passages · every key quotes its line · stem-first scanning in the hall</p>" +
    window.RRB.rcbanks.map(b => "<div class='libitem' data-id='" + b.id + "'><span>" + esc(b.title) + " <small>· " + b.questions.length + "Q</small></span><small>quiz →</small></div>").join("");
  $$("#view .libitem").forEach(x => x.addEventListener("click", () => runDrill(x.dataset.id, true)));
}

/* ================= CBAT ================= */
function vCBAT() {
  const items = window.RRB.cbat;
  V.innerHTML = "<h1>CBAT trainer</h1><p class='sub'>30% of merit · T≥42 in EACH battery · no negative marking · Spatial Scanning is the loss point</p>" +
    items.map(s => "<div class='libitem' data-id='" + s.id + "'><span>" + esc(s.title) + "</span><small>" + s.id + "</small></div>").join("") + "<div id='doc'></div>";
  $$("#view .libitem").forEach(d => d.addEventListener("click", () => {
    const s = items.find(x => x.id === d.dataset.id);
    $("#doc").innerHTML = "<div class='doc'>" + md(s.md) + "</div>";
    window.scrollTo(0, $("#doc").offsetTop - 130);
  }));
}

/* ================= LOGBOOK ================= */
function vLog() {
  const st = stats();
  const errs = S.errors.slice().reverse();
  const groups = {};
  S.errors.forEach(e => { groups[e.cluster] = groups[e.cluster] || []; groups[e.cluster].push(e); });
  V.innerHTML = "<h1>Logbook</h1><p class='sub'>" + st.errs + " errors · " + st.mocks + " mocks · accuracy " + (st.acc === null ? "—" : st.acc + "%") + "</p>" +
    "<div class='grid g2'><div class='card'><h3>Trap deck <span class='pill a'>auto-built from your misses</span></h3>" +
    (Object.keys(groups).length ? Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length).map(c =>
      "<div class='kv'><span><b>" + c + "</b> · " + groups[c].length + " misses <small style='color:var(--dim)'>" + groups[c].slice(0, 3).map(e => esc(e.cls)).join(", ") + "</small></span><span class='pill r'>drill it</span></div>").join("")
      : "<p class='sub'>No misses logged yet. Go bleed on a drill — this deck is your rapid pack seed.</p>") + "</div>" +
    "<div class='card'><h3>Data</h3><div class='btnrow'><button class='btn ghost sm' id='exp'>Export JSON</button><button class='btn danger sm' id='wipe'>Reset all progress</button></div>" +
    "<h3 style='margin-top:14px'>Mock history</h3>" + (S.mocks.length ? "<table class='data'><tr><th>Mock</th><th>Raw</th><th>C/W/B</th></tr>" +
      S.mocks.map(x => "<tr><td>" + x.mock + "</td><td class='mono'>" + x.raw + "</td><td class='mono'>" + x.C + "/" + x.W + "/" + x.blank + "</td></tr>").join("") + "</table>" : "<p class='sub'>—</p>") + "</div></div>" +
    "<h2>Error log</h2><div class='card'><table class='data'><tr><th>When</th><th>Source</th><th>Cluster</th><th>Class</th><th>Note</th><th></th></tr>" +
    (errs.length ? errs.map((e, i) => "<tr><td>" + new Date(e.t).toLocaleDateString("en-IN") + "</td><td class='mono'>" + esc(e.source) + "</td><td><b>" + esc(e.cluster) + "</b></td><td><span class='pill a'>" + esc(e.cls) + "</span></td><td>" + esc(e.note || "") + "</td><td><button class='btn sm ghost' data-del='" + (S.errors.length - 1 - i) + "'>fix✓</button></td></tr>").join("")
      : "<tr><td colspan='6' style='color:var(--dim)'>Clean sheet. Suspicious — go attempt something.</td></tr>") + "</table></div>";
  $("#exp").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: "application/json" }));
    a.download = "rrb-progress.json"; a.click();
  });
  $("#wipe").addEventListener("click", () => { if (confirm("Erase ALL progress?")) { S = { attempts: [], errors: [], mocks: [], checks: {} }; save(); vLog(); } });
  $$("#view [data-del]").forEach(b => b.addEventListener("click", () => { S.errors.splice(+b.dataset.del, 1); save(); vLog(); }));
}

function go(v) { $$("#nav button").forEach(x => x.classList.toggle("on", x.dataset.v === v)); window.scrollTo(0, 0); RENDER[v](); }
const RENDER = { dash: vDash, lessons: vLessons, learn: vLearn, patterns: vPatterns, drill: vDrill, mock: vMock, rc: vRC, cbat: vCBAT, log: vLog };

/* ---------- boot ---------- */
if (!window.RRB) {
  V.innerHTML = "<h1>Content missing</h1><p>content.js not found. Keep index.html, content.js, app.js and styles.css in the same folder.</p>";
} else {
  tickHead(); vDash();
}
