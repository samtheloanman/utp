import { recordHash } from './hash';
import { withTimeout } from './http';
import type { CivicBill, SourceAdapter, SourceResult } from './types';

const BASE = 'https://api.congress.gov/v3';
const SOURCE = { name: 'Congress.gov', url: 'https://www.congress.gov' };

interface Deps {
  apiKey?: string;
  fetch?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
}

const TYPE_SLUG: Record<string, string> = {
  HR: 'house-bill', S: 'senate-bill', HJRES: 'house-joint-resolution', SJRES: 'senate-joint-resolution',
  HCONRES: 'house-concurrent-resolution', SCONRES: 'senate-concurrent-resolution',
  HRES: 'house-resolution', SRES: 'senate-resolution',
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function congressAdapter(d: Deps): SourceAdapter {
  const doFetch = d.fetch ?? fetch;
  const now = d.now ?? (() => new Date());
  const fail = (error: string): SourceResult<CivicBill> => ({
    status: 'unavailable', items: [], fetchedAt: null, source: SOURCE, error,
  });

  return {
    id: 'congress-gov',
    jurisdictionCode: 'US',
    async fetchBills({ limit, signal }) {
      if (!d.apiKey) return fail('CONGRESS_API_KEY not configured');
      try {
        const res = await doFetch(
          `${BASE}/bill?format=json&limit=${limit}&sort=updateDate+desc`,
          { signal: withTimeout(signal, d.timeoutMs), headers: { 'X-Api-Key': d.apiKey } },
        );
        if (!res.ok) return fail(`Congress.gov HTTP ${res.status}`);
        const data = (await res.json()) as { bills?: unknown };
        if (!Array.isArray(data.bills)) return fail('Congress.gov response missing bills');
        const items: CivicBill[] = [];
        let skipped = 0;
        for (const raw of data.bills) {
          const b = raw as Record<string, unknown>;
          const type = str(b.type).toUpperCase();
          const number = b.number == null ? '' : String(b.number);
          const congress = b.congress == null ? '' : String(b.congress);
          const slug = TYPE_SLUG[type];
          if (!type || !number || !/^\d+$/.test(congress) || !slug) { skipped++; continue; }
          const latest = (b.latestAction ?? {}) as Record<string, unknown>;
          const externalId = `us-${congress}-${type.toLowerCase()}-${number}`;
          items.push({
            externalId,
            jurisdictionCode: 'US',
            number: `${type}.${number}`,
            title: str(b.title) || 'Untitled',
            status: str(latest.text) || 'Unknown',
            introducedDate: str(b.introducedDate) || null,
            sourceUrl: `${SOURCE.url}/bill/${congress}th-congress/${slug}/${number}`,
            recordHash: recordHash({
              externalId,
              updateDate: str(b.updateDate),
              latestActionText: str(latest.text),
            }),
          });
        }
        return { status: 'live', items, fetchedAt: now().toISOString(), source: SOURCE,
          ...(skipped ? { error: `skipped ${skipped} malformed rows` } : {}) };
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'fetch failed');
      }
    },
  };
}
