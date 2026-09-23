import type { NextConfig } from 'next'

/**
 * The web app proxies `/api/*` to the API service, so a deployment needs only one
 * public domain and the browser never talks to the API cross-origin.
 * `API_INTERNAL_URL` is a server-side value (e.g. http://api:3001 in compose).
 */
const API_INTERNAL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ['@auctra/domain', '@auctra/config'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_INTERNAL}/api/:path*` },
      { source: '/healthz', destination: `${API_INTERNAL}/api/health` },
    ]
  },
}

export default nextConfig
