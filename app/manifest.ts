import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'JOBTIVO — Control de horas',
    short_name: 'JOBTIVO',
    description:
      'Registra horas por actividad y tipo, aplica retención y calcula tu cobro por día, semana o mes.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'es',
    dir: 'ltr',
    background_color: '#0A1628',
    theme_color: '#f4fbf9',
    categories: ['productivity', 'finance'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
}
