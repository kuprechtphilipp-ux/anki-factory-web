import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/account', '/kosten', '/statistik', '/tutor', '/kurse'],
    },
    sitemap: 'https://www.cramo.ch/sitemap.xml',
  }
}
