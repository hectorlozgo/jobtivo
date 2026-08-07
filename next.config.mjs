/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    unoptimized: true
  },
  serverExternalPackages: ['@prisma/client', 'pg', 'bcryptjs']
}

export default nextConfig
