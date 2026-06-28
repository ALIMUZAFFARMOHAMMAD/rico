// Single source of truth for the consent version. Bump this whenever the Terms,
// Privacy Policy, or AI consent materially change — it forces every user to review
// and re-accept (server check + version-aware localStorage flag both compare to this).
export const CONSENT_VERSION = "2026-06-16";
