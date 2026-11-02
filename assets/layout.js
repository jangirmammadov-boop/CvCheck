// Shared header and footer, built once here so every page has the same navigation.
function updateNavCounts(){
  const set = (k, n) => { const e = document.querySelector('[data-count="' + k + '"]'); if (e) e.textContent = n || ""; };
  set("jobs", jobs.length); set("applications", store.apps.filter(a => ACTIVE.has(a.status)).length);
}
(function buildLayout(){
  loadJobs(); loadStore();
  const page = document.body.dataset.page || "";
  const head = el("header", "site"), logo = el("a", "logo"); logo.href = SITE.url(""); logo.innerHTML = "CV<i>check</i>"; logo.setAttribute("aria-label", "CVcheck home");
  const nav = el("nav"); nav.setAttribute("aria-label", "Main");
  [["check", "Check a job", "check/"], ["jobs", "My jobs", "jobs/"], ["applications", "Applications", "applications/"], ["faq", "FAQ", "faq/"]].forEach(([k, label, path]) => {
    const a = el("a", "", label); a.href = SITE.url(path); if (page === k) a.setAttribute("aria-current", "page");
    if (k === "jobs" || k === "applications") { const n = el("span", "n"); n.dataset.count = k; a.append(n); }
    nav.append(a);
  });
  head.append(logo, nav);
  const h = document.getElementById("site-header"); if (h) h.replaceWith(head);
  const foot = el("footer", "site"), fn = el("nav"); fn.setAttribute("aria-label", "Footer");
  [["FAQ", "faq/"], ["Privacy", "privacy/"]].forEach(([label, path]) => { const a = el("a", "", label); a.href = SITE.url(path); fn.append(a); });
  foot.append(fn, el("p", "", "Scores show how readable and relevant your CV is. No tool can know what a specific company's ATS decides, and no score predicts whether you get an offer. English only for now."));
  const f = document.getElementById("site-footer"); if (f) f.replaceWith(foot);
  updateNavCounts();
})();
