import crypto from "crypto";

// Constant-time founder-key compare — avoids a timing side-channel on /board + /stats.
// timingSafeEqual throws on length mismatch, so gate on length first (leaking only
// length, which is fine). ponytail: node:crypto, zero deps.
export function safeKeyEq(input, secret) {
  if (!input || !secret) return false;
  const a = Buffer.from(String(input)), b = Buffer.from(String(secret));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
