/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', '@prisma/client'],
  },
  images: {
    remotePatterns: [],
  },
  webpack: (config) => {
    // pdf-parse needs canvas as optional
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false }
    return config
  },
}

export default nextConfig
