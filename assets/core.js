// CVcheck core: scoring, parsing, storage. Loaded by every page, so there is one copy of the logic.
// Pages add their own screens in page-*.js. Settings live in config.js.

const STOP = new Set(("a an and are as at be but by can for from has have in into is it its of on or our that the their this to was we will with you your they them those these than then there here who what when where which while also etc per via within across including include required requirements preferred plus must should would could able ability abilities experience experienced work working works team teams strong skills skill years year role roles join company looking candidate candidates job position responsibilities responsibility opportunity benefits good great excellent knowledge understanding using use used new more other such well like need needs help make part business people ensure support day time both each any all not no yes one two three someone small own run result results get gets will able ownership practical connected through various relevant related key high level responsible poland polska germany france spain italy netherlands belgium sweden norway denmark finland ireland kingdom england scotland switzerland austria czech czechia slovakia hungary romania bulgaria lithuania latvia estonia ukraine portugal greece turkey india china japan singapore australia canada usa states america europe emea apac mazowieckie wielkopolskie malopolskie dolnoslaskie slaskie pomorskie lodzkie lubelskie podkarpackie podlaskie zachodniopomorskie lubuskie opolskie swietokrzyskie warsaw warszawa krakow poznan wroclaw gdansk gdynia lodz katowice szczecin lublin bydgoszcz berlin london paris madrid dublin amsterdam hybrid remote onsite applicants applicant").split(" "));
const VERBS = "achieved built created delivered designed developed drove improved increased launched led managed optimized reduced implemented analyzed automated coordinated deployed established generated negotiated organized planned resolved streamlined trained supervised owned shipped migrated".split(" ");
const $ = id => document.getElementById(id);
const norm = w => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "").replace(/e$/, "") : w;
const fold = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L");
const tokens = t => (fold(t).toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]*/g) || []).map(w => w.replace(/[.\-]+$/, "")).filter(w => w.length >= 2 && !/^\d[\d+.,]*$/.test(w));

const SYN = {js:"javascript",ts:"typescript",k8s:"kubernetes",ml:"machine learning",nodejs:"node.js",reactjs:"react",golang:"go",postgres:"postgresql",gcp:"google cloud",aws:"amazon web services",ux:"user experience",ui:"user interface",seo:"search engine optimization",ppc:"pay per click",kpis:"kpi",ci:"continuous integration"};
const canon = w => SYN[w] || norm(w);
const SECW = { req: 3, duty: 2, intro: 1, nice: 1, noise: 0 };
const CHROME = /^(easy apply|apply( now)?|saved?|show (more|less)|see (more|less)|premium|promoted by hirer|responses managed off linkedin|people you can reach out to|meet the hiring team|set alert|share|report( this job)?|reposted.*|be an early applicant|over \d+ applicants|\d+ (applicants?|connections?|alumni|school alumni|company alumni).*|(company|school) alumni (from|work).*|.*alumni work here|.* alumni from .*|see how you compare.*|matches your job preferences.*|.*clicked apply.*|full[- ]time|part[- ]time|contract|internship|temporary|mid-senior level|entry level|seniority level|employment type|job function|industries?)$/i;
function companyNames(jd, extra){
  const out = new Set((extra || []).map(canon)), bad = /^(the|you|us|this|our|your|role|job|team|company|we|a|an)$/i;
  const re = [/\bAbout ([A-Z][A-Za-z&]{2,})/g, /\bAt ([A-Z][A-Za-z&]{2,}),? we\b/g, /\bJoin ([A-Z][A-Za-z&]{2,})/g, /\b([A-Z][A-Za-z&]{2,}) is (?:a|an|the) [a-z -]{0,40}(?:company|organi[sz]ation|group|leader|firm)/g, /\bWe at ([A-Z][A-Za-z&]{2,})/g];
  for (const r of re) for (const m of jd.matchAll(r)) if (!bad.test(m[1])) out.add(canon(fold(m[1]).toLowerCase()));
  return out;
}
const isMeta = line => /\s[·•|]\s/.test(line) && line.length < 200;
function findTitle(jd){
  const L = jd.split("\n").map(x => x.trim()).filter(Boolean), mi = L.findIndex(isMeta);
  const ok = l => !CHROME.test(l) && !isMeta(l) && !headingType(l) && !/^(about|job (description|title|summary))\b/i.test(l) && !/[.!?:,;]/.test(l) && l.split(/\s+/).length <= 9 && l.length >= 4 && l.length <= 80 && !/^(at|we|our|you|join|if|as|the|a|an)\s/i.test(l) && !/^[-*•]/.test(l);
  if (mi > 0) { for (let i = mi - 1; i >= 0; i--) if (ok(L[i])) return L[i]; }
  for (const l of L.slice(0, 4)) if (ok(l)) return l;
  const m = jd.match(/\bAs an? ([A-Z][A-Za-z&\/ -]{3,60}?)(?: in| on| at| within| for| with|,|\.)/) || jd.match(/\b(?:looking for|seeking|hiring) an? ([A-Z][A-Za-z&\/ -]{3,60}?)(?: to| who| with| in| for|,|\.)/);
  return m ? m[1].trim() : "";
}
const HEAD = [
  ["noise", /^(about (us|the company|our company)|who we are|benefits|what we offer|we offer|perks|why join( us)?|our offer|o nas|oferujemy)$/i],
  ["nice", /(nice to have|preferred|bonus|desirable|mile widziane|a plus|would be a plus)/i],
  ["req", /(who you are|what you bring|what you need|what you'll need|your qualifications|minimum qualifications|basic qualifications|requirements?|qualifications?|what we expect|what we('| a)re looking for|must[- ]have|you have|you bring|about you|your profile|we expect|expectations?|wymagania|oczekiwania|skills? and experience|experience and skills)/i],
  ["duty", /(about the job|job description|responsibilit|duties|what you('| wi)ll do|about the role|the role|your tasks|day[- ]to[- ]day|scope|your mission|obowiązki|zakres)/i]
];
function headingType(line){
  const t = line.replace(/[:\-–*#•\s]+$/, "").replace(/^[*#•\s-]+/, "").trim();
  if (t.length < 3 || t.length > 60 || t.split(/\s+/).length > 7 || /[.!?]$/.test(t)) return null;
  if (/^About\s+(?!the\b|you\b|us\b|this\b|our\b|your\b)[A-Z]/.test(t)) return "noise";
  for (const [k, re] of HEAD) if (re.test(t)) return k;
  return null;
}
function parseJD(jd){
  const lines = jd.split("\n"); let sec = lines.some(l => headingType(l.trim())) ? "intro" : "duty"; const out = [];
  for (const raw of lines) {
    let line = raw.trim(); if (!line || CHROME.test(line)) continue;
    if (isMeta(line)) { out.push({ text: line, sec: "noise" }); continue; }
    const h = headingType(line); if (h) { sec = h; continue; }
    if (/^\s*(salary|compensation|wynagrodzenie|stawka|rate)\b/i.test(line) || parseSalary(line)) { out.push({ text: line, sec: "noise" }); continue; }
    const m = line.match(/^([A-Za-z][A-Za-z '&\/,-]{2,50}):\s*(.+)$/);
    if (m && headingType(m[1])) { sec = headingType(m[1]); line = m[2]; }
    out.push({ text: line, sec });
  }
  return out;
}
const coreText = jd => parseJD(jd).filter(x => x.sec !== "noise").map(x => x.text).join("\n");

const SKILLS = ["sql","python","excel","power bi","tableau","javascript","typescript","java","c++","c#","react","node.js","aws","azure","google cloud","docker","kubernetes","git","jira","sap","salesforce","hubspot","figma","photoshop","google analytics","seo","crm","erp","vba","looker","snowflake","spark","airflow","dbt","power query","powerpoint","confluence","linux","terraform","tensorflow","pytorch","machine learning","jenkins","agile","scrum","kanban","six sigma","workday","quickbooks","xero","canva","wordpress","shopify","google ads","meta ads","power automate","sharepoint","postgresql","mysql","mongodb","redis","kafka","graphql","html","css","php","ruby","rust","swift","kotlin","matlab","stata","spss","autocad","solidworks","alteryx","uipath","power platform","microsoft office","iam","sox","gdpr","kyc","aml"];
const inText = (txt, k) => new RegExp("(^|[^a-z0-9+#])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9+#]|$)").test(txt);
function hiddenReqs(cv, jd){
  const segs = parseJD(jd).filter(x => x.sec !== "noise");
  if (!segs.some(x => x.sec === "req")) return [];
  const get = (...secs) => segs.filter(x => secs.includes(x.sec)).map(x => x.text.toLowerCase()).join("\n");
  const duty = get("duty"), req = get("req", "nice"), mine = cv.toLowerCase();
  return SKILLS.filter(k => inText(duty, k) && !inText(req, k)).map(k => ({ k, has: inText(mine, k) }));
}

function numVal(str, k){
  const t = str.replace(/[\s\u00a0]/g, "");
  const v = /^\d{1,3}([,.]\d{3})+$/.test(t) ? +t.replace(/[,.]/g, "") : parseFloat(t.replace(",", "."));
  return k ? v * 1000 : v;
}
const CURMAP = { pln: "PLN", "zł": "PLN", zl: "PLN", eur: "EUR", "€": "EUR", usd: "USD", "$": "USD", gbp: "GBP", "£": "GBP", chf: "CHF" };
function parseSalary(jd){
  const N = "(\\d{1,3}(?:[ \\u00a0,.]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s?(k|tys\\.?)?", C = "(pln|zł|zl|eur|€|usd|\\$|gbp|£|chf)", R = "\\s*(?:-|–|—|to|do)\\s*", Cn = C.replace("(", "(?:");
  const A = new RegExp(N + R + N + "\\s?" + C, "i"), B = new RegExp(C + "\\s?" + N + "(?:" + R + "(?:" + Cn + ")?\\s?" + N + ")?", "i");
  let min, max, cur, at;
  let m = A.exec(jd);
  if (m) { min = numVal(m[1], m[2] || m[4]); max = numVal(m[3], m[4]); cur = m[5]; at = m.index; }
  else if ((m = B.exec(jd))) { cur = m[1]; min = numVal(m[2], m[3] || m[5]); max = m[4] ? numVal(m[4], m[5]) : min; at = m.index; }
  else if ((m = new RegExp(N + "\\s?" + C, "i").exec(jd))) { min = max = numVal(m[1], m[2]); cur = m[3]; at = m.index; }
  else return null;
  const ctx = jd.slice(Math.max(0, at - 80), at + m[0].length + 80).toLowerCase();
  if (!/(salary|compensation|pay\b|remuneration|wage|wynagrodzenie|stawka|widełki|rate|offer|up to|gross|net\b|brutto|netto|b2b|per (month|year|hour|annum)|monthly|annual|hourly|\/\s?(month|mo|year|yr|h|hr)|mc\b|rocznie|miesięcznie)/.test(ctx)) return null;
  if (!(min > 0) || !(max >= min)) return null;
  let period = /(per hour|hourly|\/\s?h\b|\/\s?hr|\/\s?hour|godz)/.test(ctx) ? "hour" : /(per month|monthly|\/\s?mo\b|\/\s?month|miesi|\bmc\b|\/mc)/.test(ctx) ? "month" : /(per year|annual|annually|per annum|yearly|\/\s?yr|\/\s?year|rocznie|p\.a\.)/.test(ctx) ? "year" : "";
  const guessed = !period; if (!period) period = max < 300 ? "hour" : max < 30000 ? "month" : "year";
  return { min, max, cur: CURMAP[cur.toLowerCase()] || cur, period, basis: /(brutto|gross)/.test(ctx) ? "gross" : /(netto|\bnet\b)/.test(ctx) ? "net" : "", b2b: /b2b/.test(ctx), guessed };
}

const SKILLCANON = new Set(SKILLS.map(x => x.split(" ").map(canon).join(" ")));
const GENERIC = new Set(("data access management operational activities activity reporting report workflow technology technologies request requests stakeholder stakeholders process processes system systems tool tools team teams business risk quality support review reviews analysis documentation testing improvement improvements evidence requirement requirements application applications service services solution solutions project projects delivery performance development environment procedure procedures plan plans structured control controls timely accurate accurately clear independently priority priorities issue issues closure knowledge understanding skill skills working ability audience audiences concept concepts consideration considerations outcome outcomes opportunity opportunities impact measurable meaningful daily volume workload deadline deadlines manager managers level levels role roles task tasks work enjoy problem solving solve excellence recurring help helps ensure drive deliver partner maintain perform execute identify improve compile analyze validate prioritize apply follow produce resolve simplify simplifying maintaining").split(" ").map(canon));
const unhyph = t => t.replace(/([A-Za-z])-(?=[A-Za-z])/g, "$1 ");
function keywordMatch(cv, jd, extra){
  const cnt = new Map(), disp = new Map(), named = new Set(), acr = new Set(), lowerSeen = new Set();
  const meta1 = jd.split("\n").map(x => x.trim()).find(isMeta), coName = new Set([...(meta1 ? tokens(meta1.split(/\s[·•|]\s/)[0]).map(canon) : []), ...companyNames(jd, extra)]);
  const bump = (k, w, d) => { if (!disp.has(k)) disp.set(k, d); const o = cnt.get(k) || [0, 0]; o[0]++; o[1] += w; cnt.set(k, o); };
  const shown = r => /^[A-Z0-9]{2,6}$/.test(r) || /^[a-z]+[A-Z]/.test(r) ? r : r.toLowerCase();
  for (const { text, sec } of parseJD(jd)) for (const s of text.split(/[!?;•]+|\.\s/)) {
    const base = SECW[sec]; if (!base) continue;
    const w = /\b(preferred|nice to have|bonus|desirable|ideally)\b/i.test(s) ? 1 : /\b(required|must|essential|mandatory)\b/i.test(s) ? 3 : base;
    const toks = []; let brk = true;
    for (const part of (fold(unhyph(s)).match(/[A-Za-z0-9][A-Za-z0-9+#.\-]*|[,()\/:\u2013\u2014]/g) || [])) {
      if (/^[,()\/:\u2013\u2014]$/.test(part)) { brk = true; continue; }
      const r = part.replace(/[.\-]+$/, "");
      if (r.length < 2 || /^\d[\d+.,]*$/.test(r)) { brk = true; continue; }
      toks.push({ r, brk }); brk = false;
    }
    toks.forEach((t, i) => {
      const r = t.r, x = r.toLowerCase(); if (STOP.has(x) || coName.has(canon(x))) return;
      const k = canon(x); if (r === x) lowerSeen.add(k);
      if (/^[A-Z0-9]{2,6}$/.test(r) || /^[a-z]+[A-Z]/.test(r)) acr.add(k);
      else if (i > 0 && /^[A-Z][a-z]/.test(r)) named.add(k);
      bump(k, w, shown(r));
      const n = toks[i + 1];
      if (n && !n.brk) { const nx = n.r.toLowerCase(); if (!STOP.has(nx) && !coName.has(canon(nx))) bump(k + " " + canon(nx), w, shown(r) + " " + shown(n.r)); }
    });
  }
  const isNamed = k => named.has(k) && !lowerSeen.has(k);
  const tool = k => SKILLCANON.has(k) || acr.has(k), generic = k => k.split(" ").every(x => GENERIC.has(x));
  const cand = [];
  for (const [k, o] of cnt) {
    const ws = k.split(" ");
    if (ws.length === 1) {
      if (GENERIC.has(k)) continue;
      if (tool(k) || (isNamed(k) && o[0] >= 2) || o[0] >= 4) cand.push([k, o[1] * (tool(k) || isNamed(k) ? 1.5 : 1)]);
    } else if (SKILLCANON.has(k) || ws.every(x => tool(x) || isNamed(x)) || o[0] >= 3 || (o[0] >= 2 && !generic(k))) cand.push([k, o[1] * 1.5]);
  }
  cand.sort((a, b) => b[1] - a[1]);
  const usedTool = new Set(), usedAny = new Set(), picked = [];
  for (const phase of [2, 1]) for (const [k, sc] of cand) {
    const ws = k.split(" "); if ((ws.length > 1 ? 2 : 1) !== phase) continue;
    if (phase === 2 ? ws.some(x => usedTool.has(x)) : usedAny.has(k)) continue;
    picked.push([k, sc]); ws.forEach(x => { usedAny.add(x); if (tool(x) || isNamed(x)) usedTool.add(x); });
  }
  const list = picked.sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k]) => [k, cnt.get(k)[1]]);
  const flat = " " + tokens(unhyph(cv)).map(canon).join(" ") + " ";
  let total = 0, found = 0; const hit = [], miss = [];
  for (const [k, wt] of list) { total += wt; if (flat.includes(" " + k + " ")) { found += wt; hit.push(disp.get(k) || k); } else miss.push(disp.get(k) || k); }
  return { pct: total ? Math.round(found / total * 100) : 0, hit, miss };
}

function yearsInCv(cv){
  const ys = new Set(), now = new Date().getFullYear();
  for (const m of cv.matchAll(/\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|now)\b/gi)) {
    const a = +m[1], b = /\d/.test(m[2]) ? +m[2] : now;
    for (let y = a; y < b; y++) ys.add(y);
  }
  return ys.size;
}
function reqs(cv, jd){
  const out = [], lcv = cv.toLowerCase(), ljd = coreText(jd).toLowerCase();
  const ys = [...ljd.matchAll(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?/g)].map(x => +x[1]).filter(n => n > 0 && n <= 20);
  if (ys.length) {
    const need = Math.max(...ys), have = yearsInCv(cv);
    out.push({ name: "Experience", s: have >= need ? "good" : have > 0 && have >= need - 1 ? "warn" : "bad", msg: "The posting mentions " + need + "+ years. Your dated roles add up to about " + have + (have === 0 ? ". Add dates like 2021-2024 so parsers can count them." : ".") });
  }
  const lvl = t => /\b(ph\.?d|doctorate)\b/.test(t) ? 3 : /\b(master|msc|m\.sc|mba)\b/.test(t) ? 2 : /\b(bachelor|bsc|b\.sc|ba|degree)\b/.test(t) ? 1 : 0;
  const names = ["", "a bachelor's degree", "a master's degree", "a doctorate"], need = lvl(ljd), have = lvl(lcv);
  if (need) out.push({ name: "Education", s: have >= need ? "good" : "bad", msg: have >= need ? "The posting asks for " + names[need] + ". Your CV shows a matching level." : "The posting asks for " + names[need] + ". Your CV does not clearly show it." });
  const first = findTitle(jd);
  if (first) {
    const t = tokens(first).filter(w => !STOP.has(w)).map(canon), flat = " " + tokens(cv).map(canon).join(" ") + " ";
    if (t.length) { const h = t.filter(w => flat.includes(" " + w + " ")).length / t.length;
      out.push({ name: "Job title", s: h >= .99 ? "good" : h >= .5 ? "warn" : "bad", msg: h >= .99 ? "Your CV contains the words of the job title." : "The posting's title is '" + first + "'. Use that wording in your headline or role titles if it honestly fits." }); }
  }
  return out;
}

function atsChecks(cv, meta){
  const lower = cv.toLowerCase(), tk = tokens(cv), words = tk.length;
  const nums = (cv.match(/\d+(?:[.,]\d+)?/g) || []).length;
  const verbs = new Set(tk.filter(w => VERBS.includes(w)));
  const body = cv.split("\n").map(l => l.replace(/^\s*[\uE000-\uF8FF\u2022\u25CF\u25AA\u25CB\u2013*-]\s*/, "")).join("\n");
  const odd = (body.match(/[\uE000-\uF8FF\u2500-\u257F\u2600-\u27BF]|[\u{1F300}-\u{1FAFF}]/gu) || []).length;
  const has = re => re.test(lower), L = [];
  const add = (name, max, got, good, bad) => L.push({ name, max, got, msg: got === max ? good : bad });
  add("Email", 10, /[\w.+-]+@[\w-]+\.[\w.-]+/.test(cv) ? 10 : 0, "Email found.", "No email found. Put it at the top as plain text.");
  add("Phone", 10, /\+?\d[\d\s().-]{7,}\d/.test(cv) ? 10 : 0, "Phone number found.", "No phone number found. Add one at the top.");
  add("Experience heading", 10, has(/\b(experience|employment|work history)\b/) ? 10 : 0, "Experience heading found.", "No heading named Experience or Work Experience. Parsers look for standard names.");
  add("Education heading", 10, has(/\b(education|degree|university|bachelor|master)\b/) ? 10 : 0, "Education heading found.", "No Education heading found. Add one, even if short.");
  add("Skills heading", 10, has(/\bskills?\b/) ? 10 : 0, "Skills heading found.", "No Skills heading found. Add a plain list of tools and skills.");
  add("Length", 10, words >= 300 && words <= 900 ? 10 : words >= 150 && words <= 1200 ? 5 : 0, "Length is right (" + words + " words).", "Length is " + words + " words. Aim for 300-900, about one or two pages.");
  add("Numbers and results", 15, nums >= 8 ? 15 : nums >= 4 ? 8 : 0, "Good use of numbers.", "Only " + nums + " numbers found. Show results, like 'cut costs by 18%' or 'managed 5 people'.");
  add("Action verbs", 10, verbs.size >= 6 ? 10 : verbs.size >= 3 ? 5 : 0, "Strong action verbs.", "Only " + verbs.size + " action verbs. Start bullets with built, led, improved, launched.");
  add("Simple formatting", 10, odd <= 2 ? 10 : odd <= 8 ? 5 : 0, "No icons or decorative symbols found. Normal bullets are fine.", "Found " + odd + " icons or decorative symbols (phone, mail or star icons, boxes). They often turn into garbled characters. Use plain text labels and normal bullets.");
  add("Profile link", 5, has(/linkedin\.com|github\.com|portfolio|https?:\/\//) ? 5 : 0, "Profile link found.", "No LinkedIn or portfolio link. Add one if you have it.");
  if (meta) {
    add("File readable", 15, meta.chars >= 300 ? 15 : 0, "Text was extracted cleanly from " + meta.name + ".", "Little or no text could be extracted. This looks like a scanned or image-based file, which most ATS cannot read. Export a text-based PDF from Word or Google Docs.");
    const bad = meta.columns || meta.tables > 0;
    add("Single-column layout", 15, bad ? 0 : 15, "No columns or tables detected in the file.", meta.tables > 0 ? "The file contains " + meta.tables + " table(s). Many ATS read tables out of order or skip them. Use plain paragraphs and bullets." : "The layout looks like multiple columns. Parsers often read across columns and mix up the text. Use one column.");
  }
  return L;
}

function el(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
const tone = v => v >= 75 ? "good" : v >= 50 ? "warn" : "bad";

// ---------- Structured scoring: the AI judges each requirement, this code does the arithmetic ----------
const SCORE_CFG = {
  weights: { must: 0.50, duty: 0.25, pref: 0.15, level: 0.10 },   // must-haves, responsibilities, preferred and soft skills, level fit
  status: { full: 1, partial: 0.5, none: 0 },
  softFactor: 0.5,                                                // soft skills count half as much as other preferred items
  caps: { hardNone: 3, hardPartial: 6, twoMustMissing: 5, oneMustMissing: 7, gap3: 4, gap2: 6, leadNoMgmt: 4, belowLevel: 7 }
};
const LADDER = { junior: 0, mid: 1, senior: 2, lead: 3, head: 4 };
const TIERS = ["must", "duty", "preferred", "soft"], STATS = ["full", "partial", "none"];
const r1 = x => Math.round(x * 10) / 10;

function evidenceFound(ev, cv){
  const e = tokens(ev || "").map(canon); if (e.length < 2) return false;
  const have = new Set(tokens(unhyph(cv)).map(canon));
  return e.filter(w => have.has(w)).length / e.length >= 0.7;
}
// The AI answer is untrusted: validate every field and check quotes against the real CV text.
function cleanAnalysis(raw, cv){
  const str = (x, n) => String(x == null ? "" : x).slice(0, n);
  const yrs = x => Number.isFinite(+x) && +x >= 0 && +x <= 60 ? +x : null;
  const lv = (x, d) => Object.prototype.hasOwnProperty.call(LADDER, x) ? x : d;
  const job = raw && raw.job || {}, cand = raw && raw.candidate || {};
  const reqs = (Array.isArray(raw && raw.requirements) ? raw.requirements : []).filter(r => r && typeof r === "object").slice(0, 30).map(r => {
    const tier = TIERS.includes(r.tier) ? r.tier : "duty";
    let status = STATS.includes(r.status) ? r.status : "none", verified = true;
    const evidence = str(r.evidence, 240);
    if (status !== "none" && !evidenceFound(evidence, cv)) { verified = false; if (status === "full") status = "partial"; }
    return { text: str(r.text || r.requirement || r.name || r.description, 200), tier, hard: r.hard === true && tier === "must", kind: str(r.kind, 20), status, evidence, verified, reason: str(r.reason, 260) };
  }).filter(r => r.text);
  const list = x => (Array.isArray(x) ? x : []).slice(0, 6).map(v => str(v, 260)).filter(Boolean);
  return {
    job: { title: str(job.title, 100), level: lv(job.level, "mid"), years: yrs(job.years_required), mgmt: job.people_management_required === true, domain: str(job.domain, 80) },
    cand: { level: lv(cand.level === "head" ? "lead" : cand.level, "mid"), years: yrs(cand.relevant_years), basis: str(cand.relevant_years_basis, 200), total: yrs(cand.total_years), mgmt: cand.has_people_management === true },
    requirements: reqs, summary: str(raw && raw.summary, 500), strengths: list(raw && raw.strengths), tips: list(raw && raw.ats_tips),
    rewrites: (Array.isArray(raw && raw.rewrites) ? raw.rewrites : []).slice(0, 4).map(x => ({ before: str(x.before, 300), after: str(x.after, 300), why: str(x.why, 200) })).filter(x => x.before && x.after && evidenceFound(x.before, cv))
  };
}
function scoreMatch(a){
  const C = SCORE_CFG, B = { must: [], duty: [], pref: [] };
  a.requirements.forEach(r => (r.tier === "must" ? B.must : r.tier === "duty" ? B.duty : B.pref).push(r));
  const avg = list => { let w = 0, t = 0; list.forEach(r => { const k = r.tier === "soft" ? C.softFactor : 1; w += k; t += k * C.status[r.status]; }); return w ? t / w : null; };
  const d = LADDER[a.job.level] - LADDER[a.cand.level];
  const levelFit = d === 0 ? 1 : d === 1 || d === -1 ? 0.6 : d >= 2 ? 0.2 : 0.3;
  const parts = [["must", avg(B.must), C.weights.must], ["duty", avg(B.duty), C.weights.duty], ["pref", avg(B.pref), C.weights.pref], ["level", levelFit, C.weights.level]].filter(x => x[1] !== null);
  const wsum = parts.reduce((t, x) => t + x[2], 0);
  const base = 10 * parts.reduce((t, x) => t + x[1] * x[2], 0) / wsum;
  const caps = [], names = l => l.slice(0, 3).map(r => r.text).join("; ");
  const hardNone = B.must.filter(r => r.hard && r.status === "none"), hardPart = B.must.filter(r => r.hard && r.status === "partial"), mustNone = B.must.filter(r => !r.hard && r.status === "none");
  if (hardNone.length) caps.push([C.caps.hardNone, "Missing a hard requirement: " + names(hardNone)]);
  if (hardPart.length) caps.push([C.caps.hardPartial, "Only partly meets a hard requirement: " + names(hardPart)]);
  if (mustNone.length >= 2) caps.push([C.caps.twoMustMissing, mustNone.length + " must-haves are missing: " + names(mustNone)]);
  else if (mustNone.length === 1) caps.push([C.caps.oneMustMissing, "A must-have is missing: " + names(mustNone)]);
  if (a.job.years != null && a.cand.years != null) {
    const gap = a.job.years - a.cand.years;
    if (gap >= 3) caps.push([C.caps.gap3, "Seniority gap: the posting asks " + a.job.years + "+ years, you show about " + a.cand.years + " in this kind of work"]);
    else if (gap >= 2) caps.push([C.caps.gap2, "Experience is " + gap + " years short of the " + a.job.years + "+ asked"]);
  }
  if ((a.job.level === "lead" || a.job.level === "head") && !a.cand.mgmt) caps.push([C.caps.leadNoMgmt, "The role is " + a.job.level + " level, and your CV shows no people management"]);
  if (d <= -1) caps.push([C.caps.belowLevel, "The role looks below your level (" + a.job.level + " role, you are " + a.cand.level + "), so it may not move you toward your goal"]);
  caps.sort((x, y) => x[0] - y[0]);
  const cap = caps.length ? caps[0][0] : 10, score = r1(Math.min(base, cap));
  return { score, base: r1(base), capped: cap < base, caps, levelFit, parts: parts.map(x => ({ name: x[0], value: r1(x[1] * 100), weight: x[2] })) };
}


async function analyzeAi(cv, jd){
  if (!SITE.aiEndpoint) throw new Error("The AI service is not connected yet.");
  const r = await fetch(SITE.aiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "match", cv: cv.slice(0, 12000), jd: jd.slice(0, 8000) }) });
  if (!r.ok) { let d = ""; try { d = ((await r.json()).detail || []).join(" | "); } catch {} throw new Error((r.status === 503 ? "The free AI service is busy. Try again in a minute." : "Request failed (" + r.status + ").") + (d ? " Details: " + d : " No reason came back from the worker, so the version running on Cloudflare is probably old. Paste the newest worker.js into Cloudflare and click Deploy.")); }
  const raw = await r.json();
  const a = cleanAnalysis(raw, cv);
  if (!a.requirements.length) {
    const n = Array.isArray(raw && raw.requirements) ? raw.requirements.length : 0;
    throw new Error("The AI returned no usable requirements. Try again. (Details: answer had " + n + " requirements, fields: " + Object.keys(raw || {}).join(", ").slice(0, 120) + ". If 'requirements' is missing, the old worker is still running: open your worker address and check it shows version 2026-11-01-c.)");
  }
  return { a, s: scoreMatch(a) };
}

const KEY = "cvcheck.jobs"; let jobs = [];
function loadJobs(){ try { jobs = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { jobs = []; } }
function saveJobs(){ try { localStorage.setItem(KEY, JSON.stringify(jobs)); } catch {} }
const companyOf = l => { const p = (l || "").split(/\s[-\u2013|@]\s/); return p.length > 1 ? tokens(p[0]) : []; };
function titleOf(jd){ return findTitle(jd) || "Untitled job"; }
function fit(m, rq){ let p = 0; rq.forEach(r => { if (r.name === "Experience" || r.name === "Education") p += r.s === "bad" ? 10 : r.s === "warn" ? 4 : 0; }); return Math.max(0, m.pct - p); }
function money(x){ const f = n => Math.round(n).toLocaleString("en-US"); return (x.min === x.max ? f(x.min) : f(x.min) + "-" + f(x.max)) + " " + (x.cur || x.currency || "") + " per " + x.period + (x.basis && x.basis !== "unknown" ? ", " + x.basis : "") + (x.b2b ? ", B2B" : ""); }
function ensureJob(jd, typedLabel, lastAi){
  const text = jd.slice(0, 12000), typed = String(typedLabel || "").trim(), label = typed || titleOf(text);
  let j = jobs.find(x => x.jd === text);
  if (j) { j.label = label; j.auto = !typed; } else { j = { id: Date.now(), label, auto: !typed, jd: text, stated: parseSalary(text), ai: lastAi && lastAi.jd === text ? lastAi.ai : undefined }; jobs.unshift(j); }
  jobs = jobs.slice(0, 30); saveJobs(); return j;
}

// ---------- Your CV, kept only for this browser tab (or on this device if the person asks) ----------
const cvStore = {
  remember(){ try { return localStorage.getItem("cvcheck.remember") === "1"; } catch { return false; } },
  get(){ try { return sessionStorage.getItem("cvcheck.cv") || (this.remember() ? localStorage.getItem("cvcheck.cvtext") || "" : ""); } catch { return ""; } },
  set(t){ try { sessionStorage.setItem("cvcheck.cv", t); if (this.remember()) localStorage.setItem("cvcheck.cvtext", t); } catch {} },
  getMeta(){ try { return JSON.parse(sessionStorage.getItem("cvcheck.cvmeta") || "null"); } catch { return null; } },
  setMeta(m){ try { if (m) sessionStorage.setItem("cvcheck.cvmeta", JSON.stringify(m)); else sessionStorage.removeItem("cvcheck.cvmeta"); } catch {} },
  setRemember(on, text){ try { if (on) { localStorage.setItem("cvcheck.remember", "1"); localStorage.setItem("cvcheck.cvtext", text || ""); } else { localStorage.removeItem("cvcheck.remember"); localStorage.removeItem("cvcheck.cvtext"); } } catch {} }
};

// ---------- Application tracker data ----------
const AKEY = "cvcheck.apps";
const STATUSES = ["Saved", "Applied", "Screening", "Interview", "Assessment", "Offer", "Rejected", "Withdrawn", "No response"];
const ACTIVE = new Set(["Saved", "Applied", "Screening", "Interview", "Assessment"]);
const RESPONDED = new Set(["Screening", "Interview", "Assessment", "Offer", "Rejected"]);
const INTERVIEWED = new Set(["Interview", "Assessment", "Offer"]);
const FILTERS = [["active", "Active", a => ACTIVE.has(a.status)], ["all", "All", () => true], ["interviewing", "In process", a => ["Screening", "Interview", "Assessment"].includes(a.status)], ["offers", "Offers", a => a.status === "Offer"], ["closed", "Closed", a => ["Rejected", "Withdrawn", "No response"].includes(a.status)]];
let store = { apps: [], lastBackup: 0 }, storeOk = true, editingId = null, tfilter = "active", tquery = "", flashId = null;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const safeUrl = u => { try { const x = new URL(String(u || "").trim()); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } };
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const appliedDate = a => a.applied || (a.history.find(h => h.status !== "Saved") || {}).date || "";

function cleanApp(x){
  x = x && typeof x === "object" ? x : {};
  const str = (v, n) => String(v == null ? "" : v).trim().slice(0, n), date = v => DATE_RE.test(String(v)) && !isNaN(Date.parse(v)) ? String(v) : "";
  const status = STATUSES.includes(x.status) ? x.status : "Saved";
  const history = (Array.isArray(x.history) ? x.history : []).slice(0, 40).map(h => ({ status: STATUSES.includes(h && h.status) ? h.status : null, date: date(h && h.date) })).filter(h => h.status && h.date);
  if (!history.length) history.push({ status, date: date(x.applied) || todayStr() });
  const sc = x.score && (x.score.kind === "ai" || x.score.kind === "kw") && Number.isFinite(+x.score.v) ? { kind: x.score.kind, v: Math.max(0, Math.min(x.score.kind === "ai" ? 10 : 100, +x.score.v)) } : null;
  return { id: str(x.id, 40) || newId(), company: str(x.company, 80), role: str(x.role, 120), url: safeUrl(x.url), status, applied: date(x.applied), step: str(x.step, 100), next: date(x.next), notes: str(x.notes, 2000), cv: str(x.cv, 60), salary: str(x.salary, 80), score: sc, jobId: str(x.jobId, 40), history, updated: Number.isFinite(+x.updated) ? +x.updated : Date.now() };
}
function loadStore(){
  try {
    localStorage.setItem(AKEY + ".t", "1"); localStorage.removeItem(AKEY + ".t");
    const raw = JSON.parse(localStorage.getItem(AKEY) || "null");
    if (raw && Array.isArray(raw.apps)) store = { apps: raw.apps.slice(0, 500).map(cleanApp), lastBackup: +raw.lastBackup || 0 };
  } catch { storeOk = false; }
}
function saveStore(){ try { localStorage.setItem(AKEY, JSON.stringify(store)); storeOk = true; } catch { storeOk = false; } if (typeof onStoreSaved === "function") onStoreSaved(); }

function moveStatus(a, to){
  if (to === a.status) return;
  const t = todayStr();
  if (a.status === "Saved" && to !== "Applied" && to !== "Saved") a.history.push({ status: "Applied", date: a.applied || t });
  if (to !== "Saved" && !a.applied) a.applied = t;
  a.history.push({ status: to, date: t }); a.status = to; a.updated = Date.now();
}
function splitLabel(l){ const p = (l || "").split(/\s[-–|@]\s/); return p.length > 1 ? { company: p[0].trim(), role: p.slice(1).join(" - ").trim() } : { company: "", role: (l || "").trim() }; }
function guessCompany(jd){
  const meta = jd.split("\n").map(x => x.trim()).find(isMeta);
  if (meta) { const c = meta.split(/\s[·•|]\s/)[0].trim(); if (c && c.length <= 60) return c; }
  const bad = /^(Us|You|Me|The|This|Our|Your|Team|Role)$/;
  for (const re of [/\bAt ([A-Z][A-Za-z&.]{2,}),? we\b/, /\bAbout ([A-Z][A-Za-z&.]{2,}(?: [A-Z][A-Za-z&.]+){0,2})/, /\b([A-Z][\w.&]*(?: [A-Z][\w.&]*){0,2}) is (?:a|an|the) (?:global |leading )?[a-z ]{0,30}(?:company|organi[sz]ation|group|leader|firm)\b/, /\bJoin ([A-Z][A-Za-z&.]{2,})/]) {
    const m = jd.match(re); if (m && !bad.test(m[1])) return m[1].trim();
  }
  return "";
}
function ensureApp(j, sc){
  let a = store.apps.find(x => x.jobId === String(j.id));
  if (!a) {
    const lab = splitLabel(j.label);
    a = cleanApp({ id: newId(), company: lab.company || guessCompany(j.jd), role: lab.role || titleOf(j.jd), status: "Saved", salary: j.stated ? money(j.stated) : j.est ? "about " + money(j.est) : "", score: j.ai ? { kind: "ai", v: j.ai.score } : sc, jobId: String(j.id), history: [] });
    store.apps.unshift(a);
  }
  saveStore(); return a;
}
// Creates the application (once per job), then opens the Applications page and highlights it.
function trackJob(j, sc){
  const a = ensureApp(j, sc);
  try { sessionStorage.setItem("cvcheck.flash", a.id); } catch {}
  location.href = SITE.url("applications/");
}
function median(a){ if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function dueDays(a){ return a.next && ACTIVE.has(a.status) ? daysBetween(todayStr(), a.next) : null; }
