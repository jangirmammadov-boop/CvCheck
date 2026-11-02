// Applications page.
loadJobs(); loadStore();
function onStoreSaved(){ renderTrack(); }
function renderFunnel(){
  const box = $("funnel"); box.replaceChildren();
  const apps = store.apps, done = apps.filter(a => a.history.some(h => h.status !== "Saved")), n = set => done.filter(a => a.history.some(h => set.has(h.status))).length;
  if (!apps.length) { box.append(el("p", "sub", "No applications yet. Add one below, or click Track on a job in My jobs. Once you have a few, you will see how many replies, interviews and offers you get.")); return; }
  const rows = [["Applied", done.length], ["Heard back", n(RESPONDED)], ["Interviewed", n(INTERVIEWED)], ["Offers", n(new Set(["Offer"]))]], base = done.length;
  const f = el("div", "funnel");
  rows.forEach(([label, v]) => {
    const r = el("div", "fr"), bar = el("div", "fbar"), fill = el("span"); fill.style.width = base ? Math.round(v / base * 100) + "%" : "0%"; bar.append(fill);
    r.append(el("span", "", label), bar, el("span", "num", v + (label !== "Applied" && base ? " (" + Math.round(v / base * 100) + "%)" : ""))); f.append(r);
  });
  box.append(f);
  const waits = done.map(a => { const first = a.history.find(h => RESPONDED.has(h.status)), ad = appliedDate(a); return first && ad ? daysBetween(ad, first.date) : null; }).filter(d => d != null && d >= 0);
  const facts = el("div", "facts"), med = median(waits);
  facts.append(el("span", "", "Saved, not applied yet: " + apps.filter(a => a.status === "Saved").length));
  if (med != null) facts.append(el("span", "", "Typical wait for a first reply: " + (Number.isInteger(med) ? med : med.toFixed(1)) + " days"));
  if (base < 10) facts.append(el("span", "", "Fewer than 10 applications so far, so treat these rates as rough."));
  box.append(facts);
}
function appRow(a){
  const r = el("div", "app" + (a.id === flashId ? " flash" : "")), top = el("div", "apptop"), left = el("div");
  left.append(el("span", "apptitle", a.role || "Untitled role"));
  left.append(el("span", "appco", a.company ? " at " + a.company : " (company not set)"));
  const sel = el("select", "st st-" + a.status.replace(/\s/g, "_")); sel.setAttribute("aria-label", "Status of " + (a.role || "application"));
  STATUSES.forEach(s => { const o = el("option", "", s); o.value = s; o.selected = s === a.status; sel.append(o); });
  sel.onchange = () => { moveStatus(a, sel.value); saveStore(); };
  top.append(left, sel); r.append(top);
  const meta = el("div", "appmeta"), ad = appliedDate(a);
  if (ad && a.status !== "Saved") meta.append(el("span", "", "Applied " + fmtDate(ad) + " (" + daysBetween(ad, todayStr()) + " days ago)"));
  if (a.score) meta.append(el("span", "", a.score.kind === "ai" ? "AI score " + a.score.v.toFixed(1) + "/10" : "Keyword match " + Math.round(a.score.v) + "%"));
  if (a.salary) meta.append(el("span", "", a.salary));
  if (a.cv) meta.append(el("span", "", "CV: " + a.cv));
  const dd = dueDays(a);
  if (a.next && ACTIVE.has(a.status)) meta.append(el("span", dd < 0 ? "due" : dd <= 2 ? "soon" : "", (a.step || "Next step") + ": " + (dd < 0 ? "overdue by " + (-dd) + (dd === -1 ? " day" : " days") : dd === 0 ? "due today" : "in " + dd + (dd === 1 ? " day" : " days") + " (" + fmtDate(a.next) + ")")));
  else if (a.step && ACTIVE.has(a.status)) meta.append(el("span", "", "Next: " + a.step));
  r.append(meta);
  if (a.notes) r.append(el("p", "appnotes", a.notes.length > 220 ? a.notes.slice(0, 220) + "..." : a.notes));
  const act = el("div", "appact"), ed = el("button", "", "Edit"), del = el("button", "", "Delete");
  ed.type = del.type = "button";
  ed.onclick = () => editApp(a); del.onclick = () => { if (confirm("Delete this application?")) { store.apps = store.apps.filter(x => x.id !== a.id); saveStore(); } };
  if (a.url) { const l = el("a", "", "Open posting"); l.href = a.url; l.target = "_blank"; l.rel = "noopener noreferrer"; act.append(l); }
  act.append(ed, del); r.append(act); return r;
}
function renderTrack(){
  const apps = store.apps;
  const bn = $("backupnote"); bn.replaceChildren(); bn.classList.add("hidden");
  if (!storeOk) { bn.append(el("strong", "", "This browser is blocking saving. "), document.createTextNode("Your applications will be lost when you close the page. Download a backup before you leave.")); bn.classList.remove("hidden"); }
  else if (apps.length && Date.now() - store.lastBackup > 14 * 864e5) { bn.append(el("strong", "", "Your applications live only in this browser. "), document.createTextNode(store.lastBackup ? "Your last backup is more than two weeks old. " : "You have not made a backup yet. ")); const b = el("button", "", "Download backup"); b.type = "button"; b.onclick = downloadBackup; bn.append(b); bn.classList.remove("hidden"); }
  renderFunnel();
  const due = apps.filter(a => { const d = dueDays(a); return d != null && d <= 0; }).sort((x, y) => dueDays(x) - dueDays(y)), dueBox = $("due"); dueBox.replaceChildren();
  if (due.length) { const bx = el("div", "alertbox"); bx.append(el("strong", "", due.length + (due.length === 1 ? " follow-up is due: " : " follow-ups are due: ")), document.createTextNode(due.map(a => (a.role || "Untitled") + (a.company ? " at " + a.company : "")).join(", "))); dueBox.append(bx); }
  const fb = $("tfilters"); fb.replaceChildren();
  FILTERS.forEach(([k, label, fn]) => { const b = el("button", "fchip", label + " (" + apps.filter(fn).length + ")"); b.type = "button"; b.setAttribute("aria-pressed", String(tfilter === k)); b.onclick = () => { tfilter = k; renderTrack(); }; fb.append(b); });
  const fn = FILTERS.find(f => f[0] === tfilter)[2], q = tquery.toLowerCase();
  const list = apps.filter(fn).filter(a => !q || (a.role + " " + a.company + " " + a.notes).toLowerCase().includes(q))
    .sort((x, y) => { const dx = dueDays(x), dy = dueDays(y), ux = dx != null && dx <= 0, uy = dy != null && dy <= 0; return ux !== uy ? (ux ? -1 : 1) : y.updated - x.updated; });
  const box = $("tlist"); box.replaceChildren();
  if (!list.length) box.append(el("p", "sub", apps.length ? "Nothing matches this filter." : "Your applications will appear here."));
  list.forEach(a => box.append(appRow(a)));
}

// ----- form -----
STATUSES.forEach(s => { const o = el("option", "", s); o.value = s; $("t_status").append(o); });
function resetForm(){ editingId = null; $("tform").reset(); $("t_applied").value = todayStr(); $("formtitle").textContent = "Add an application"; $("t_save").textContent = "Save application"; $("t_msg").textContent = ""; }
function editApp(a){
  editingId = a.id; const set = (k, v) => $("t_" + k).value = v || "";
  set("role", a.role); set("company", a.company); set("url", a.url); set("status", a.status); set("applied", a.applied); set("step", a.step); set("next", a.next); set("cv", a.cv); set("salary", a.salary); set("notes", a.notes);
  $("formtitle").textContent = "Edit application"; $("t_save").textContent = "Save changes"; $("addbox").open = true; $("addbox").scrollIntoView({ block: "start" }); $("t_role").focus();
}
$("t_cancel").onclick = () => { $("amsg").textContent = ""; resetForm(); $("addbox").open = false; };
$("tform").onsubmit = e => {
  e.preventDefault();
  const v = k => $("t_" + k).value.trim(), role = v("role"), company = v("company");
  if (!role && !company) { $("t_msg").textContent = "Enter at least a role or a company."; return; }
  const url = v("url"); if (url && !safeUrl(url)) { $("t_msg").textContent = "The link must start with http:// or https://."; return; }
  const fields = { role, company, url: safeUrl(url), applied: v("applied"), step: v("step"), next: v("next"), cv: v("cv"), salary: v("salary"), notes: $("t_notes").value.trim() }, status = v("status");
  if (editingId) {
    const a = store.apps.find(x => x.id === editingId);
    if (a) { Object.assign(a, cleanApp({ ...a, ...fields, status: a.status, history: a.history })); moveStatus(a, status); a.updated = Date.now(); }
  } else {
    const hist = [], applied = fields.applied || todayStr();
    if (status === "Saved") hist.push({ status: "Saved", date: todayStr() }); else { hist.push({ status: "Applied", date: applied }); if (status !== "Applied") hist.push({ status, date: todayStr() }); }
    store.apps.unshift(cleanApp({ ...fields, applied: status === "Saved" ? fields.applied : applied, status, history: hist }));
  }
  const was = editingId; resetForm(); $("addbox").open = false; saveStore();
  $("amsg").textContent = was ? "Changes saved." : "Application added.";
};
$("tsearch").oninput = e => { tquery = e.target.value; renderTrack(); };

// ----- backup, export, restore -----
function download(name, text, type){ const a = document.createElement("a"), url = URL.createObjectURL(new Blob([text], { type })); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
function downloadBackup(){
  download("cvcheck-backup-" + todayStr() + ".json", JSON.stringify({ app: "cvcheck", version: 1, exported: new Date().toISOString(), apps: store.apps, jobs }, null, 1), "application/json");
  store.lastBackup = Date.now(); saveStore(); $("tmsg").textContent = "Backup downloaded. Keep the file somewhere safe.";
}
$("b_json").onclick = downloadBackup;
const csvCell = v => { let t = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
$("b_csv").onclick = () => {
  const head = ["Company", "Role", "Status", "Date applied", "Next step", "Next step date", "Link", "Score", "Salary", "CV version", "Notes", "Last status change"];
  const rows = store.apps.map(a => [a.company, a.role, a.status, a.applied, a.step, a.next, a.url, a.score ? (a.score.kind === "ai" ? "AI " + a.score.v.toFixed(1) + "/10" : "Keyword " + Math.round(a.score.v) + "%") : "", a.salary, a.cv, a.notes, a.history[a.history.length - 1].date]);
  download("cvcheck-applications-" + todayStr() + ".csv", "﻿" + [head, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  $("tmsg").textContent = "Spreadsheet file downloaded.";
};
function cleanJob(x){
  x = x && typeof x === "object" ? x : {}; const jd = String(x.jd || "").slice(0, 12000); if (jd.length < 20) return null;
  const j = { id: Number.isFinite(+x.id) ? +x.id : Date.now() + Math.floor(Math.random() * 1000), label: String(x.label || "").slice(0, 80), auto: x.auto !== false, jd, stated: parseSalary(jd) };
  const e = x.est; if (e && Number.isFinite(+e.min) && Number.isFinite(+e.max) && +e.max >= +e.min) j.est = { min: +e.min, max: +e.max, currency: String(e.currency || "").slice(0, 6), period: ["month", "year", "hour"].includes(e.period) ? e.period : "month", basis: String(e.basis || "").slice(0, 10), confidence: String(e.confidence || "low").slice(0, 10), note: String(e.note || "").slice(0, 300), searched: e.searched === true, sources: (Array.isArray(e.sources) ? e.sources : []).slice(0, 3).filter(s => s && /^https:\/\//.test(s.url || "")).map(s => ({ title: String(s.title || "").slice(0, 100), url: String(s.url).slice(0, 400) })) };
  const a = x.ai; if (a && Number.isFinite(+a.score)) j.ai = { score: Math.max(0, Math.min(10, +a.score)), base: Math.max(0, Math.min(10, +a.base || +a.score)), capped: a.capped === true, cvKey: String(a.cvKey || "").slice(0, 60) };
  return j;
}
$("b_restore").onclick = () => $("b_file").click();
$("b_file").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    if (f.size > 8e6) throw new Error("big");
    const d = JSON.parse(await f.text());
    if (!d || d.app !== "cvcheck" || !Array.isArray(d.apps)) throw new Error("shape");
    const incoming = d.apps.slice(0, 500).map(cleanApp), byId = new Map(store.apps.map(a => [a.id, a]));
    incoming.forEach(a => byId.set(a.id, a)); store.apps = [...byId.values()].slice(0, 500);
    let addedJobs = 0; (Array.isArray(d.jobs) ? d.jobs.slice(0, 30) : []).map(cleanJob).filter(Boolean).forEach(j => { if (!jobs.some(x => x.jd === j.jd)) { jobs.push(j); addedJobs++; } });
    jobs = jobs.slice(0, 30); saveJobs(); saveStore();
    $("tmsg").textContent = "Restored " + incoming.length + " applications and " + addedJobs + " saved jobs.";
  } catch { $("tmsg").textContent = "This file is not a CVcheck backup, so nothing was changed."; }
};
$("b_wipe").onclick = () => { if (confirm("Erase all applications and saved jobs from this browser? This cannot be undone. Download a backup first if you might need them.")) { store = { apps: [], lastBackup: store.lastBackup }; jobs = []; saveJobs(); saveStore(); $("tmsg").textContent = "Everything was erased from this browser."; } };

// ----- start-up -----
try { flashId = sessionStorage.getItem("cvcheck.flash"); sessionStorage.removeItem("cvcheck.flash"); } catch {}
if (flashId) tfilter = "all";
resetForm(); renderTrack();
if (flashId) setTimeout(() => { const n = document.querySelector(".app.flash"); if (n) { n.scrollIntoView({ block: "center" }); setTimeout(() => n.classList.remove("flash"), 2500); } }, 80);
