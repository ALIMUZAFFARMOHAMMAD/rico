/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint runs on demand via `npm run lint` — not coupled to production builds,
    // so a style nit can never break a deploy. Run the linter manually / in CI.
    ignoreDuringBuilds: true,
  },
  // ricomates.si is the production domain (Clerk live keys only work there) — send the
  // old hitony.vercel.app address over, keeping the path (e.g. /notebook, /landing?src=x).
  // Baseline browser hardening on every response (HSTS is already added by Vercel).
  // ponytail: no full Content-Security-Policy yet — Clerk + inline styles need a tuned
  // allowlist; add one (report-only first) when there's time to test it properly.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },                       // no clickjacking via iframes
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" }, // mic: calls; camera: selfie/notebook
      ],
    }];
  },
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "hitony.vercel.app" }], destination: "https://ricomates.si/:path*", permanent: true }];
  },
}

module.exports = nextConfig
