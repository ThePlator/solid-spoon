import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://supermind.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep the authenticated app and per-item pages out of search indexes.
      disallow: ['/library', '/item/', '/login', '/forgot'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
