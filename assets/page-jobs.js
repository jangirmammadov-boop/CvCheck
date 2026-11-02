// My jobs page.
loadJobs(); loadStore();
async function estimate(j, btn, d){
  if (!SITE.aiEndpoint) { d.append(el("small", "", " The AI service is not connected yet.")); return; }
  btn.disabled = true; btn.textContent = "Researching...";
  try {
    const r = await fetch(SITE.aiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "salary", title: j.label, location: $("loc").value.trim(), jd: j.jd.slice(0, 3500) }) });
    if (!r.ok) { let d = ""; try { d = ((await r.json()).detail || []).join(" | "); } catch {} throw new Error((r.status === 503 ? "The free AI service is busy. Try again later." : "Request failed (" + r.status + ").") + (d ? " Details: " + d : "")); }
    const e = await r.json();
    if (typeof e.min !== "number" || typeof e.max !== "number") throw new Error("No usable estimate returned.");
    j.est = e; saveJobs(); renderRank();
  } catch (err) { btn.disabled = false; btn.textContent = "Estimate salary"; d.append(el("small", "", " " + err.message)); }
}
function salaryLine(j){
  const d = el("div", "sal");
  if (j.stated) { d.append(el("span", "tagl", "In posting:"), document.createTextNode(" " + money(j.stated) + (j.stated.guessed ? " (period guessed)" : ""))); return d; }
  if (j.est) {
    const e = j.est;
    d.append(el("span", "tagl", "Estimate:"), document.createTextNode(" about " + money(e) + ". Confidence: " + e.confidence + ". " + (e.searched ? "Based on web search." : "Based on general model knowledge, not live data.") + " " + (e.note || "")));
    (e.sources || []).slice(0, 3).filter(x => /^https:\/\//.test(x.url || "")).forEach(x => { const a = el("a", "src", x.title || "source"); a.href = x.url; a.target = "_blank"; a.rel = "noopener noreferrer"; d.append(a); });
    return d;
  }
  const b = el("button", "link", "Estimate salary"); b.style.padding = "2px 0"; b.onclick = () => estimate(j, b, d); d.append(b); return d;
}
function renderRank(){
  const box = $("rank"), rows = $("rows"), cv = cvStore.get().trim();
  rows.replaceChildren();
  if (!jobs.length) { rows.append(el("p", "sub", "No saved jobs yet. On the Check a job page, check a posting and click Add this job to my ranking.")); return; }
  jobs.forEach(j => { if (j.auto !== false) j.label = titleOf(j.jd); });
  if (cv.length < 100) { const p = el("p", "sub", "Your CV is needed to rank jobs. "), a = el("a", "", "Add your CV on the Check a job page"); a.href = SITE.url("check/"); p.append(a, document.createTextNode(", then come back.")); rows.append(p); return; }
  const ck = cv.length + ":" + cv.slice(0, 40);
  jobs.map(j => { const m = keywordMatch(cv, j.jd, companyOf(j.label)), rq = reqs(cv, j.jd), f = fit(m, rq), ai = j.ai && j.ai.cvKey === ck ? j.ai : null; return { j, m, rq, f, ai, key: ai ? 1000 + ai.score * 10 : f }; })
    .sort((a, b) => b.key - a.key).forEach(({ j, m, rq, f, ai }, i) => {
    const r = el("div", "rk"), mid = el("div"), act = el("div", "ra"), val = ai ? ai.score.toFixed(1) : f + "";
    const sc = el("b", "", val); sc.style.color = "var(--" + tone(ai ? ai.score * 10 : f) + ")";
    mid.append(el("strong", "", j.label), el("div", "sub", (ai ? "AI score " + ai.score.toFixed(1) + " of 10" + (ai.capped ? " (capped from " + ai.base.toFixed(1) + ")" : "") + ". " : "") + "Keyword match " + m.pct + "%." + (rq.length ? " Requirements met " + rq.filter(x => x.s === "good").length + " of " + rq.length + "." : "")), salaryLine(j));
    const trkd = store.apps.some(x => x.jobId === String(j.id)), trk = el("button", "link", trkd ? "Tracked" : "Track"), open = el("button", "link", "Open"), del = el("button", "link", "Remove"), go = el("button", "link", ai ? "Re-score with AI" : "Score with AI"), note = el("small");
    trk.onclick = () => trackJob(j, { kind: ai ? "ai" : "kw", v: ai ? ai.score : m.pct });
    open.onclick = () => { try { sessionStorage.setItem("cvcheck.handoff", JSON.stringify({ jd: j.jd, label: j.label })); } catch {} location.href = SITE.url("check/"); };
    del.onclick = () => { jobs = jobs.filter(x => x.id !== j.id); saveJobs(); renderRank(); };
    go.onclick = async () => { go.disabled = true; go.textContent = "Scoring..."; try { const out = await analyzeAi(cv, j.jd); j.ai = { score: out.s.score, base: out.s.base, capped: out.s.capped, cvKey: ck }; saveJobs(); renderRank(); } catch (e) { go.disabled = false; go.textContent = "Score with AI"; mid.append(el("div", "sub", e.message)); } };
    act.append(sc, el("small", "", ai ? "AI score /10" : "keyword fit"), trk, go, open, del);
    r.append(el("div", "rn", "#" + (i + 1)), mid, act); rows.append(r);
  });
}
$("upd").onclick = renderRank;
$("wipe").onclick = () => { if (confirm("Remove all saved jobs from this browser?")) { jobs = []; saveJobs(); renderRank(); } };

try { $("loc").value = localStorage.getItem("cvcheck.loc") || ""; } catch {}
$("loc").addEventListener("change", () => { try { localStorage.setItem("cvcheck.loc", $("loc").value.trim()); } catch {} });
renderRank();
