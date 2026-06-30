// First-touch signup-source attribution. Captures ?src= / ?ref= / utm_source from the
// landing URL once and persists it, so Pulse can attribute activation & retention BY CHANNEL
// (the gap Sage flagged for the GTM push). First touch wins; falls back to the referrer host.
const KEY = "rico_src";

export function captureSource() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(KEY)) return; // first-touch attribution — don't overwrite
    const q = new URLSearchParams(window.location.search);
    let src = q.get("src") || q.get("ref") || q.get("utm_source");
    if (!src && document.referrer) {
      try {
        const h = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (h && !h.includes("hitony") && !h.includes("localhost")) src = h;
      } catch (e) {}
    }
    if (src) localStorage.setItem(KEY, String(src).slice(0, 40));
  } catch (e) {}
}

export function getSource() {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
}
