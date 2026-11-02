// Check a job page.
let lastAi = null;
const SAMPLE_CV = "Jane Doe (example)\njane.doe@example.com | +00 000 000 000 | linkedin.com/in/jane-doe-example\n\nExperience\nMarketing Specialist, BrightWave (2021-2024)\n- Managed social media campaigns that increased engagement by 45%\n- Led a team of 3 and launched 12 email campaigns, reaching 80,000 subscribers\n- Reduced cost per lead by 18% through A/B testing and SEO improvements\n\nEducation\nBA in Communication, Example University\n\nSkills\nSEO, Google Analytics, content marketing, Canva, email marketing";
const SAMPLE_JD = "Digital Marketing Manager\nWe are looking for someone to lead our digital marketing strategy. You will manage paid social campaigns, run SEO and content marketing, analyze performance in Google Analytics and report on campaign results. Experience with marketing automation, A/B testing and email marketing is required. Requirements: 3+ years in digital marketing and a degree. You will lead a small team and own the content calendar.";

function hiddenCard(cv, jd){
  const list = hiddenReqs(cv, jd); if (!list.length) return null;
  const c = el("div", "panel card");
  c.append(el("h2", "", "Tools in the tasks, but not in the requirements"), el("p", "sub", "Postings often list different things in the tasks and in the requirements. These tools appear only in the tasks. They still count in your match, and interviewers may ask about them."));
  const have = list.filter(x => x.has).map(x => x.k), lack = list.filter(x => !x.has).map(x => x.k);
  if (lack.length) { c.append(el("p", "sub", "Not in your CV")); c.append(chipRow(lack, "miss")); }
  if (have.length) { c.append(el("p", "sub", "Already in your CV")); c.append(chipRow(have, "ok")); }
  return c;
}

function reqCard(cv, jd){
  const c = el("div", "panel card"), list = reqs(cv, jd);
  c.append(el("h2", "", "Requirements in the posting"), el("p", "sub", "Checked against what your CV shows. This is an estimate, so verify it yourself."));
  if (!list.length) c.append(el("p", "", "No clear requirements (years, degree, title) were detected."));
  list.forEach(r => { const row = el("div", "fix"); row.append(el("span", "pts " + r.s, r.s === "good" ? "Met" : r.s === "warn" ? "Close" : "Gap")); const b = el("div"); b.append(el("strong", "", r.name + ". "), document.createTextNode(r.msg)); row.append(b); c.append(row); });
  return c;
}


function gauge(title, value, hint){
  const c = el("div", "panel gauge"), R = 40, C = 2 * Math.PI * R;
  c.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="40"/><circle class="arc" cx="50" cy="50" r="40"/></svg>';
  const arc = c.querySelector(".arc");
  arc.style.stroke = "var(--" + tone(value) + ")";
  arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C;
  requestAnimationFrame(() => requestAnimationFrame(() => arc.style.strokeDashoffset = C * (1 - value / 100)));
  const t = el("div"); t.append(el("small", "", title), el("b", "", value + "%"), el("small", "", hint));
  c.append(t); return c;
}

function chipRow(words, cls){ const w = el("div", "chips"); words.forEach(k => w.append(el("span", "chip " + cls, k), document.createTextNode(" "))); return w; }

function fixRow(x){
  const r = el("div", "fix"), lost = x.max - x.got;
  r.append(el("span", "pts " + (lost === 0 ? "good" : x.got === 0 ? "bad" : "warn"), lost === 0 ? "OK" : "+" + lost));
  const b = el("div"); b.append(el("strong", "", x.name + ". "), document.createTextNode(x.msg)); r.append(b); return r;
}

let lastReport = "";
function run(){
  const cv = $("cv").value.trim(), jd = $("jd").value.trim(), out = $("results");
  out.replaceChildren(); out.classList.remove("hidden");
  if (cv.length < 100) { out.append(el("div", "panel", "Paste your full CV first. It needs at least a few lines.")); return; }
  const checks = atsChecks(cv, meta), ats = Math.round(checks.reduce((s, c) => s + c.got, 0) / checks.reduce((s, c) => s + c.max, 0) * 100);
  const m = jd.length >= 80 ? keywordMatch(cv, jd, companyOf($("jlabel").value)) : null;
  const worst = checks.filter(c => c.got < c.max).sort((a, b) => (b.max - b.got) - (a.max - a.got));

  let v = ats >= 80 ? "Your CV is easy for a parser to read." : ats >= 55 ? "Your CV is readable but has gaps worth fixing." : "Your CV has problems that can stop a parser early.";
  if (m) v += m.pct >= 70 ? " It covers most of the job's keywords." : m.pct >= 45 ? " It covers about half of the job's keywords." : " It misses most of the job's keywords.";
  if (worst[0]) v += " Start with: " + worst[0].name.toLowerCase() + ".";
  out.append(el("p", "verdict", v));

  const g = el("div", "gauges");
  g.append(gauge("ATS readiness", ats, "Can a parser read it?"));
  if (m) g.append(gauge("Job match", m.pct, "Keywords from the posting"));
  out.append(g);
  if (!m) out.append(el("p", "sub", "Add a job posting above to see your match percentage."));

  if (m) {
    const k = el("div", "panel card");
    k.append(el("h2", "", "Keywords from the job posting"), el("p", "sub", "Most important first. Add missing ones only if they are true for you, using the posting's exact wording."));
    if (m.miss.length) k.append(chipRow(m.miss, "miss"));
    if (m.hit.length) k.append(chipRow(m.hit, "ok"));
    out.append(k);
    out.append(reqCard(cv, jd));
    const hc = hiddenCard(cv, jd); if (hc) out.append(hc);
  }

  const f = el("div", "panel card");
  f.append(el("h2", "", "What to fix"), el("p", "sub", "Sorted by impact."));
  worst.forEach(x => f.append(fixRow(x)));
  if (!worst.length) f.append(el("p", "", "Nothing to fix. Strong result."));
  const good = checks.filter(c => c.got === c.max);
  if (good.length) { const d = el("details"); d.append(el("summary", "", good.length + " checks passed")); good.forEach(x => d.append(fixRow(x))); f.append(d); }
  out.append(f);

  lastReport = ["CVcheck report", "ATS readiness: " + ats + "%", m ? "Job match: " + m.pct + "%" : "", m && m.miss.length ? "Missing keywords: " + m.miss.join(", ") : "", "", "Fixes:", ...worst.map(x => "- " + x.name + ": " + x.msg)].filter((l, i) => l || i > 3).join("\n");
  const a = el("div", "actions"), cp = el("button", "", "Copy report"), pr = el("button", "", "Print or save as PDF");
  cp.onclick = () => navigator.clipboard.writeText(lastReport).then(() => cp.textContent = "Copied", () => cp.textContent = "Copy failed");
  pr.onclick = () => window.print();
  const add = el("button", "primary", "Add this job to my ranking"); add.onclick = () => addJob(jd); const trk = el("button", "", "Track this application"); trk.onclick = () => trackJob(ensureJob(jd, $("jlabel").value, lastAi), m ? { kind: "kw", v: m.pct } : null); if (m) a.append(add, trk); a.append(cp, pr); out.append(a); out.append(aiBlock(cv, jd));
  out.scrollIntoView({ behavior: "smooth" });
}


let meta = null;
async function readPdf(buf){
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "", wide = 0, lines = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p), vw = page.getViewport({ scale: 1 }).width;
    const items = (await page.getTextContent()).items.filter(i => i.str.trim()), rows = new Map();
    items.forEach(i => { const k = Math.round(i.transform[5] / 3); if (!rows.has(k)) rows.set(k, []); rows.get(k).push(i); });
    [...rows].sort((a, b) => b[0] - a[0]).forEach(([, r]) => {
      r.sort((a, b) => a.transform[4] - b.transform[4]); lines++;
      for (let k = 1; k < r.length; k++) if (r[k].transform[4] - (r[k - 1].transform[4] + r[k - 1].width) > vw * 0.12) { wide++; break; }
      text += r.map(i => i.str).join(" ") + "\n";
    });
  }
  return { text, columns: lines > 8 && wide / lines > 0.4 };
}
async function readDocx(buf){
  const [raw, html] = await Promise.all([mammoth.extractRawText({ arrayBuffer: buf }), mammoth.convertToHtml({ arrayBuffer: buf })]);
  return { text: raw.value, tables: (html.value.match(/<table/g) || []).length };
}
$("pick").onclick = () => $("file").click();
$("cv").addEventListener("input", () => { meta = null; cvStore.setMeta(null); cvStore.set($("cv").value); });
$("file").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  const msg = $("fmsg"); msg.textContent = "Reading " + f.name + "...";
  try {
    const buf = await f.arrayBuffer(), isPdf = /\.pdf$/i.test(f.name);
    if (!isPdf && !/\.docx$/i.test(f.name)) throw new Error("Use a PDF or DOCX file.");
    const r = isPdf ? await readPdf(buf) : await readDocx(buf), t = r.text.trim();
    $("cv").value = t; count("cv", "cvc", "0 words");
    meta = { name: f.name, chars: t.length, columns: !!r.columns, tables: r.tables || 0 }; cvStore.set(t); cvStore.setMeta(meta);
    msg.textContent = "Loaded " + f.name + ". This is the text a parser would see. Check it, then click Check my CV.";
  } catch (err) { meta = null; msg.textContent = "Could not read this file: " + err.message; }
  e.target.value = "";
});


function rememberAi(cv, jd, res){
  const key = jd.slice(0, 12000), ai = { score: res.s.score, base: res.s.base, capped: res.s.capped, cvKey: cv.length + ":" + cv.slice(0, 40) };
  lastAi = { jd: key, ai };
  const j = jobs.find(x => x.jd === key); if (j) { j.ai = ai; saveJobs(); }
}
function aiBlock(cv, jd){
  const box = el("div", "panel card"), res = el("div"), btn = el("button", "primary", "Run deep analysis");
  box.append(el("h2", "", "Deep analysis with AI (beta)"), el("p", "sub", "An AI reads the posting like a recruiter, tags each requirement as must-have, responsibility or preferred, and checks it against your CV. The score is then calculated with fixed caps and weights. This sends your CV and job text to an AI provider."));
  if (jd.length < 80) { box.append(el("p", "note", "Add a job posting above to get an AI score.")); return box; }
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = "Analyzing, this can take up to 30 seconds..."; res.replaceChildren();
    try { const out = await analyzeAi(cv, jd); renderAi(res, out); rememberAi(cv, jd, out); }
    catch (e) { res.replaceChildren(el("p", "sub", "Could not run the analysis. " + e.message)); }
    btn.disabled = false; btn.textContent = "Run deep analysis";
  };
  box.append(btn, res); return box;
}
const SLAB = { full: "Full", partial: "Partial", none: "None" }, STONE = { full: "good", partial: "warn", none: "bad" };
const TLAB = { must: "Must-have", duty: "Responsibilities", preferred: "Preferred", soft: "Soft skills" };
function renderAi(box, { a, s }){
  const head = el("div", "aihead"), big = el("b", "", s.score.toFixed(1)); big.style.color = "var(--" + tone(s.score * 10) + ")";
  head.append(big, el("span", "", " / 10"));
  box.append(head);
  if (a.summary) box.append(el("p", "", a.summary));
  if (s.capped) box.append(el("p", "sub", "Raw match " + s.base.toFixed(1) + ", capped at " + s.caps[0][0] + " by the rules below."));
  if (s.caps.length) {
    box.append(el("h2", "", "What limits the score"));
    const ul = el("ul"); s.caps.forEach(c => ul.append(el("li", "", "Max " + c[0] + ": " + c[1]))); box.append(ul);
  }
  box.append(el("p", "sub", "Role level: " + a.job.level + ". Your level: " + a.cand.level + "." + (a.job.years != null ? " Years asked: " + a.job.years + "+." : "") + (a.cand.years != null ? " Your relevant years: about " + a.cand.years + (a.cand.basis ? " (" + a.cand.basis + ")" : "") + "." : "")));
  TIERS.forEach(t => {
    const list = a.requirements.filter(r => r.tier === t); if (!list.length) return;
    box.append(el("h2", "", TLAB[t]));
    list.forEach(r => {
      const row = el("div", "fix"), b = el("div");
      row.append(el("span", "pts " + STONE[r.status], SLAB[r.status]));
      b.append(el("strong", "", r.text + (r.hard ? " (hard requirement)" : "")));
      if (r.reason) b.append(el("div", "sub", r.reason));
      if (r.evidence && r.status !== "none") b.append(el("div", "sub", (r.verified ? "From your CV: " : "Not found word for word in your CV, so Full was lowered to Partial: ") + r.evidence));
      row.append(b); box.append(row);
    });
  });
  [["Strengths", a.strengths], ["ATS tips for this posting", a.tips]].forEach(([t, l]) => { if (l.length) { box.append(el("h2", "", t)); const ul = el("ul"); l.forEach(x => ul.append(el("li", "", x))); box.append(ul); } });
  if (a.rewrites.length) {
    box.append(el("h2", "", "Suggested rewrites"));
    a.rewrites.forEach(x => { const r = el("div", "fix"), b = el("div"); b.append(el("div", "sub", "Before: " + x.before), el("strong", "", "After: " + x.after), el("div", "sub", x.why)); r.append(b); box.append(r); });
  }
  box.append(el("p", "note", "Use scores to rank roles, not to predict offers. Any score, human or AI, is optimistic about how employers will react."));
}

function addJob(jd){ ensureJob(jd, $("jlabel").value, lastAi); location.href = SITE.url("jobs/"); }
const count = (id, el2, empty) => { const n = tokens($(id).value).length; $(el2).textContent = n ? n + " words" : empty; };
$("cv").addEventListener("input", () => count("cv", "cvc", "0 words"));
$("jd").addEventListener("input", () => count("jd", "jdc", "optional"));
$("go").onclick = run;
$("sample").onclick = () => { meta = null; $("fmsg").textContent = ""; $("cv").value = SAMPLE_CV; cvStore.set(SAMPLE_CV); cvStore.setMeta(null); $("jd").value = SAMPLE_JD; count("cv", "cvc", "0 words"); count("jd", "jdc", "optional"); run(); };
$("clear").onclick = () => { meta = null; $("fmsg").textContent = ""; $("cv").value = ""; cvStore.set(""); cvStore.setMeta(null); $("jd").value = ""; count("cv", "cvc", "0 words"); count("jd", "jdc", "optional"); $("results").classList.add("hidden"); };
document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run(); });

// ----- start-up -----
loadJobs();
$("cv").value = cvStore.get(); meta = cvStore.getMeta(); count("cv", "cvc", "0 words");
$("remember").checked = cvStore.remember();
$("remember").onchange = e => cvStore.setRemember(e.target.checked, $("cv").value);
try {
  const h = JSON.parse(sessionStorage.getItem("cvcheck.handoff") || "null");
  if (h && h.jd) { sessionStorage.removeItem("cvcheck.handoff"); $("jd").value = h.jd; $("jlabel").value = h.label || ""; count("jd", "jdc", "optional"); run(); }
} catch {}
