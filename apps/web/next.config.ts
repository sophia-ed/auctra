import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ['@auctra/domain', '@auctra/config'],
}

export default nextConfig
