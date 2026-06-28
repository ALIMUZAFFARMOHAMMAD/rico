/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint runs on demand via `npm run lint` — not coupled to production builds,
    // so a style nit can never break a deploy. Run the linter manually / in CI.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
