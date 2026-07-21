/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // better-sqlite3 es un módulo nativo: debe cargarse en el runtime de Node,
  // no ser empaquetado por el bundler del servidor.
  serverExternalPackages: ["better-sqlite3"],
}

export default nextConfig
