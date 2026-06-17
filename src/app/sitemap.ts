import { MetadataRoute } from 'next';
import { ISSUES } from '@/lib/data';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://utp.network';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/how-it-works',
    '/news',
    '/events',
    '/legislature',
    '/stablecoin',
    '/token',
    '/governance',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const issueRoutes = ISSUES.map((issue) => ({
    url: `${baseUrl}/issue/${issue.id}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'always' as const,
    priority: 0.9,
  }));

  return [...routes, ...issueRoutes];
}
