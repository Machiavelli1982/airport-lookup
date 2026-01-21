import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // Falls du API-Routen hast
    },
    sitemap: 'https://www.airportlookup.com/sitemap.xml',
  };
}