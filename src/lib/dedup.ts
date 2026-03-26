/**
 * Title-similarity deduplication for news articles.
 * Groups articles covering the same story from multiple sources.
 * Uses normalized Levenshtein distance for fuzzy matching.
 */

export interface DeduplicableArticle {
  id: string;
  title: string;
  source: string;
  [key: string]: unknown;
}

/**
 * Normalize a title for comparison:
 * lowercase, remove punctuation, collapse whitespace.
 */
function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute similarity ratio between two strings (0 to 1).
 * Uses a simplified token-overlap approach (faster than full Levenshtein).
 * 1.0 = identical, 0.0 = completely different.
 */
function similarity(a: string, b: string): number {
  const tokensA = new Set(normalize(a).split(' '));
  const tokensB = new Set(normalize(b).split(' '));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap++;
  }

  // Jaccard similarity
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? overlap / union : 0;
}

export interface ArticleCluster<T extends DeduplicableArticle> {
  primary: T;
  duplicates: T[];
  sourceCount: number;
}

/**
 * Deduplicate articles by title similarity.
 * Groups articles with similarity > threshold into clusters.
 * Keeps the article with the best bias score (closest to center) as primary.
 *
 * @param articles - Array of articles to deduplicate
 * @param threshold - Similarity threshold (0-1). Default 0.55 (a bit over half matching tokens).
 * @param getBiasScore - Optional function to score articles for primary selection (lower = better).
 */
export function deduplicateArticles<T extends DeduplicableArticle>(
  articles: T[],
  threshold: number = 0.55,
  getBiasScore?: (article: T) => number,
): ArticleCluster<T>[] {
  const clusters: ArticleCluster<T>[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue;

    const cluster: T[] = [articles[i]];
    assigned.add(i);

    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue;

      const sim = similarity(articles[i].title, articles[j].title);
      if (sim >= threshold) {
        cluster.push(articles[j]);
        assigned.add(j);
      }
    }

    // Pick the best article as primary (most centrist)
    let primary = cluster[0];
    if (getBiasScore && cluster.length > 1) {
      primary = cluster.reduce((best, current) => {
        const bestScore = getBiasScore(best);
        const currentScore = getBiasScore(current);
        return currentScore < bestScore ? current : best;
      });
    }

    const duplicates = cluster.filter((a) => a !== primary);

    clusters.push({
      primary,
      duplicates,
      sourceCount: cluster.length,
    });
  }

  return clusters;
}

/**
 * Simple dedup that returns just the primary articles (flattened).
 */
export function dedup<T extends DeduplicableArticle>(
  articles: T[],
  threshold?: number,
  getBiasScore?: (article: T) => number,
): T[] {
  return deduplicateArticles(articles, threshold, getBiasScore).map((c) => c.primary);
}
