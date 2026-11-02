// Site settings. Change things here once and every page follows.
const SITE = {
  name: "CVcheck",
  // Address of your AI worker on Cloudflare (no slash at the end). Leave empty to switch the AI features off.
  aiEndpoint: "https://cvcheck-ai.jangirmammadov.workers.dev",
  // Shown on the privacy page. Add the address people can write to.
  contactEmail: "",
  // The site's root address, worked out automatically, so the site works under /CvCheck/ or on its own domain.
  root: new URL("../", document.currentScript.src).href,
  url(path) { return this.root + path; }
};
