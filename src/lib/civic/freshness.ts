export function classifyFreshness(
  fetchedAt: string | null,
  now: Date,
  maxAgeMs: number,
): 'live' | 'stale' | 'unavailable' {
  if (!fetchedAt) return 'unavailable';
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return 'unavailable';
  return now.getTime() - t > maxAgeMs ? 'stale' : 'live';
}
