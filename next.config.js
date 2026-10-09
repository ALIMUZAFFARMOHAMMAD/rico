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
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "hitony.vercel.app" }], destination: "https://ricomates.si/:path*", permanent: true }];
  },
}

module.exports = nextConfig
