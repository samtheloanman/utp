import { NextRequest, NextResponse } from 'next/server';
import { getSourceProfile, getBiasScore, isUnbiasedSource, type BiasRating } from '@/lib/bias-map';
import { dedup, type DeduplicableArticle } from '@/lib/dedup';

// ── Types ──────────────────────────────────────────────────

export interface AggregatedArticle extends DeduplicableArticle {
  title: string;
  description: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
  url: string;
  region: string;
  category: string;
  bias: BiasRating | 'unknown';
  factuality: string;
  biasScore: number;
  isVoteable: boolean;
  provider: string;
}

// ── Source Fetchers ────────────────────────────────────────

const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const NEWSDATA_API = 'https://newsdata.io/api/1/latest';
const MEDIASTACK_API = 'http://api.mediastack.com/v1/news';
const WORLDNEWS_API = 'https://api.worldnewsapi.com/search-news';

/** Keywords that signal a "voteable" topic (legislation, regulation, policy) */
const VOTEABLE_KEYWORDS = [
  'legislation', 'regulation', 'law', 'bill', 'act', 'policy',
  'executive order', 'ruling', 'amendment', 'congress', 'parliament',
  'senate', 'house', 'supreme court', 'sanctions', 'ban', 'tax',
  'crypto regulation', 'stablecoin', 'cbdc', 'sec ', 'cftc',
  'defi regulation', 'blockchain bill', 'digital asset',
  'trade agreement', 'tariff', 'subsidy', 'budget', 'stimulus',
  'election', 'referendum', 'treaty', 'accord',
];

function isVoteable(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return VOTEABLE_KEYWORDS.some((kw) => text.includes(kw));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function enrichArticle(article: Partial<AggregatedArticle>, provider: string): AggregatedArticle {
  const domain = extractDomain(article.url || '');
  const profile = getSourceProfile(domain);
  return {
    id: article.id || `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: article.title || 'Untitled',
    description: article.description || '',
    source: profile?.name || article.source || domain || provider,
    sourceDomain: domain,
    publishedAt: article.publishedAt || new Date().toISOString(),
    url: article.url || '',
    region: article.region || 'GLOBAL',
    category: article.category || 'General',
    bias: profile?.bias || 'unknown',
    factuality: profile?.factuality || 'unknown',
    biasScore: getBiasScore(domain),
    isVoteable: isVoteable(article.title || '', article.description || ''),
    provider,
  };
}

// ── GDELT (unlimited, no key) ──

async function fetchGDELT(query: string): Promise<AggregatedArticle[]> {
  try {
    const params = new URLSearchParams({
      query: query || 'cryptocurrency OR blockchain OR legislation OR regulation',
      mode: 'ArtList',
      maxrecords: '25',
      format: 'json',
      sort: 'DateDesc',
    });
    const res = await fetch(`${GDELT_API}?${params}`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.articles) return [];

    return data.articles.map((a: Record<string, string>, i: number) =>
      enrichArticle({
        id: `gdelt-${i}-${Date.now()}`,
        title: a.title,
        description: a.seendate ? `Published ${a.seendate}` : '',
        url: a.url,
        publishedAt: a.seendate,
        region: a.sourcecountry || 'GLOBAL',
      }, 'gdelt')
    );
  } catch {
    return [];
  }
}

// ── NewsData.io (200/day, optional key) ──

async function fetchNewsData(query: string): Promise<AggregatedArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      q: query || 'blockchain cryptocurrency regulation legislation',
      language: 'en',
    });
    const res = await fetch(`${NEWSDATA_API}?${params}`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((a: Record<string, unknown>, i: number) =>
      enrichArticle({
        id: `newsdata-${i}-${Date.now()}`,
        title: a.title as string,
        description: a.description as string,
        url: a.link as string,
        publishedAt: a.pubDate as string,
        region: (a.country as string[])?.length ? (a.country as string[])[0].toUpperCase() : 'GLOBAL',
        category: (a.category as string[])?.length ? (a.category as string[])[0] : 'General',
      }, 'newsdata')
    );
  } catch {
    return [];
  }
}

// ── MediaStack (100/month, optional key) ──

async function fetchMediaStack(query: string): Promise<AggregatedArticle[]> {
  const apiKey = process.env.MEDIASTACK_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      keywords: query || 'cryptocurrency,blockchain,regulation',
      languages: 'en',
      limit: '25',
      sort: 'published_desc',
    });
    const res = await fetch(`${MEDIASTACK_API}?${params}`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data) return [];

    return data.data.map((a: Record<string, string>, i: number) =>
      enrichArticle({
        id: `mediastack-${i}-${Date.now()}`,
        title: a.title,
        description: a.description,
        url: a.url,
        publishedAt: a.published_at,
        region: a.country?.toUpperCase() || 'GLOBAL',
        category: a.category || 'General',
      }, 'mediastack')
    );
  } catch {
    return [];
  }
}

// ── World News API (free tier, optional key) ──

async function fetchWorldNews(query: string): Promise<AggregatedArticle[]> {
  const apiKey = process.env.WORLD_NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      'api-key': apiKey,
      text: query || 'cryptocurrency blockchain regulation',
      language: 'en',
      number: '15',
      'sort-direction': 'DESC',
      sort: 'publish-time',
    });
    const res = await fetch(`${WORLDNEWS_API}?${params}`, { next: { revalidate: 900 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.news) return [];

    return data.news.map((a: Record<string, unknown>, i: number) =>
      enrichArticle({
        id: `worldnews-${i}-${Date.now()}`,
        title: a.title as string,
        description: a.text as string,
        url: a.url as string,
        publishedAt: a.publish_date as string,
        region: 'GLOBAL',
      }, 'worldnews')
    );
  } catch {
    return [];
  }
}

// ── AP News RSS (free, no key) ──

async function fetchAPRSS(): Promise<AggregatedArticle[]> {
  try {
    // AP provides RSS at this endpoint
    const res = await fetch('https://rsshub.app/apnews/topics/politics', {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const text = await res.text();

    // Simple XML parse for RSS <item> elements
    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 15).map((item, i) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>(.*?)<\/title>/)?.[1] || 'Untitled';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        || item.match(/<description>(.*?)<\/description>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

      return enrichArticle({
        id: `ap-rss-${i}-${Date.now()}`,
        title: title.replace(/<[^>]*>/g, ''),
        description: desc.replace(/<[^>]*>/g, '').substring(0, 200),
        url: link,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        region: 'US',
        category: 'Politics',
      }, 'ap-rss');
    });
  } catch {
    return [];
  }
}

// ── Reuters RSS (free, no key) ──

async function fetchReutersRSS(): Promise<AggregatedArticle[]> {
  try {
    const res = await fetch('https://rsshub.app/reuters/world', {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const text = await res.text();

    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 15).map((item, i) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>(.*?)<\/title>/)?.[1] || 'Untitled';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        || item.match(/<description>(.*?)<\/description>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

      return enrichArticle({
        id: `reuters-rss-${i}-${Date.now()}`,
        title: title.replace(/<[^>]*>/g, ''),
        description: desc.replace(/<[^>]*>/g, '').substring(0, 200),
        url: link,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        region: 'GLOBAL',
        category: 'World',
      }, 'reuters-rss');
    });
  } catch {
    return [];
  }
}

// ── Main Handler ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || 'cryptocurrency blockchain regulation legislation';
  const biasFilter = searchParams.get('bias') || 'unbiased'; // 'all' | 'unbiased' | 'center-only'
  const voteableOnly = searchParams.get('voteable') === 'true';

  // Fetch all sources in parallel
  const [gdelt, newsdata, mediastack, worldnews, apRss, reutersRss] = await Promise.all([
    fetchGDELT(query),
    fetchNewsData(query),
    fetchMediaStack(query),
    fetchWorldNews(query),
    fetchAPRSS(),
    fetchReutersRSS(),
  ]);

  let allArticles = [...gdelt, ...newsdata, ...mediastack, ...worldnews, ...apRss, ...reutersRss];

  // Filter by bias
  if (biasFilter === 'center-only') {
    allArticles = allArticles.filter((a) => a.bias === 'center');
  } else if (biasFilter === 'unbiased') {
    allArticles = allArticles.filter((a) =>
      a.bias === 'center' || a.bias === 'center-left' || a.bias === 'center-right' || a.bias === 'unknown'
    );
  }

  // Deduplicate
  const dedupedArticles = dedup(
    allArticles,
    0.55,
    (a) => Math.abs(a.biasScore), // prefer center sources
  );

  // Sort by date
  dedupedArticles.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Separate voteable items
  const voteable = dedupedArticles.filter((a) => a.isVoteable);
  const articles = voteableOnly ? voteable : dedupedArticles;

  // Compute bias distribution
  const biasDistribution: Record<string, number> = {};
  for (const a of dedupedArticles) {
    biasDistribution[a.bias] = (biasDistribution[a.bias] || 0) + 1;
  }

  // Track which sources contributed
  const sourcesUsed = [...new Set(dedupedArticles.map((a) => a.provider))];

  return NextResponse.json({
    articles,
    voteable,
    total: articles.length,
    voteableCount: voteable.length,
    sources_used: sourcesUsed,
    bias_distribution: biasDistribution,
    timestamp: new Date().toISOString(),
  });
}
