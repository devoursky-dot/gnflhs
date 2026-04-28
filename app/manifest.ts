import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gyeong Nam Foreign Language High School',
    short_name: 'GNFLHS',
    description: 'GNFLHS Installable Web App',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4B2C20', // Dark brown from the logo
    icons: [
      {
        src: '/app-logo-v1.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/app-logo-v1.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
