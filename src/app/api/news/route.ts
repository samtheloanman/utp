import { NextRequest, NextResponse } from 'next/server';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  region: string;
  category: string;
}

const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const NEWSDATA_API = 'https://newsdata.io/api/1/latest';

/**
 * Fetches news from GDELT (open-source, unlimited).
 * Returns top articles matching query.
 */
async function fetchGDELT(query: string, maxRecords = 10): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams({
      query: query || 'cryptocurrency OR blockchain OR legislation',
      mode: 'ArtList',
      maxrecords: String(maxRecords),
      format: 'json',
      sort: 'DateDesc',
    });

    const res = await fetch(`${GDELT_API}?${params}`, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.articles) return [];

    return data.articles.map((a: Record<string, string>, i: number) => ({
      id: `gdelt-${i}-${Date.now()}`,
      title: a.title || 'Untitled',
      description: a.seendate ? `Published ${a.seendate}` : '',
      source: a.domain || 'GDELT',
      publishedAt: a.seendate || new Date().toISOString(),
      url: a.url || '',
      region: detectRegion(a.sourcecountry || ''),
      category: 'World',
    }));
  } catch {
    console.error('GDELT fetch failed');
    return [];
  }
}

/**
 * Fetches news from NewsData.io (200 req/day free tier).
 * Only used if NEWSDATA_API_KEY is set.
 */
async function fetchNewsData(query: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      q: query || 'blockchain cryptocurrency',
      language: 'en',
    });

    const res = await fetch(`${NEWSDATA_API}?${params}`, { next: { revalidate: 600 } });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((a: Record<string, unknown>, i: number) => ({
      id: `newsdata-${i}-${Date.now()}`,
      title: (a.title as string) || 'Untitled',
      description: (a.description as string) || '',
      source: (a.source_name as string) || 'NewsData',
      publishedAt: (a.pubDate as string) || new Date().toISOString(),
      url: (a.link as string) || '',
      region: (a.country as string[])?.length ? (a.country as string[])[0].toUpperCase() : 'GLOBAL',
      category: (a.category as string[])?.length ? (a.category as string[])[0] : 'General',
    }));
  } catch {
    console.error('NewsData fetch failed');
    return [];
  }
}

function detectRegion(country: string): string {
  const map: Record<string, string> = {
    'united states': 'US', 'united kingdom': 'UK', 'india': 'IN',
    'brazil': 'BR', 'china': 'CN', 'germany': 'EU', 'france': 'EU',
  };
  return map[country.toLowerCase()] || 'GLOBAL';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || 'cryptocurrency blockchain legislation';
  const source = searchParams.get('source') || 'all';

  const results: NewsArticle[] = [];

  if (source === 'all' || source === 'gdelt') {
    const gdelt = await fetchGDELT(query);
    results.push(...gdelt);
  }

  if (source === 'all' || source === 'newsdata') {
    const newsdata = await fetchNewsData(query);
    results.push(...newsdata);
  }

  // Sort by date descending
  results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json({
    articles: results,
    total: results.length,
    sources: source === 'all' ? ['gdelt', 'newsdata'] : [source],
    timestamp: new Date().toISOString(),
  });
}
