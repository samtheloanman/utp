import { recordHash } from './hash';
import type { CivicBill, SourceAdapter, SourceResult } from './types';

const BASE = 'https://api.congress.gov/v3';
const SOURCE = { name: 'Congress.gov', url: 'https://www.congress.gov' };

interface Deps {
  apiKey?: string;
  fetch?: typeof fetch;
  now?: () => Date;
}

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
          { signal, headers: { 'X-Api-Key': d.apiKey } },
        );
        if (!res.ok) return fail(`Congress.gov HTTP ${res.status}`);
        const data = (await res.json()) as { bills?: unknown };
        if (!Array.isArray(data.bills)) return fail('Congress.gov response missing bills');
        const items: CivicBill[] = data.bills.map((raw) => {
          const b = raw as Record<string, unknown>;
          const type = str(b.type);
          const number = str(b.number) || String(b.number ?? '');
          const congress = String(b.congress ?? '');
          const latest = (b.latestAction ?? {}) as Record<string, unknown>;
          const externalId = `us-${congress}-${type.toLowerCase()}-${number}`;
          return {
            externalId,
            jurisdictionCode: 'US',
            number: `${type}.${number}`,
            title: str(b.title) || 'Untitled',
            status: str(latest.text) || 'Unknown',
            introducedDate: str(b.introducedDate) || null,
            sourceUrl: str(b.url) || `${SOURCE.url}/bill/${congress}th-congress/${type.toLowerCase()}/${number}`,
            recordHash: recordHash({
              externalId,
              updateDate: str(b.updateDate),
              latestActionText: str(latest.text),
            }),
          };
        });
        return { status: 'live', items, fetchedAt: now().toISOString(), source: SOURCE };
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'fetch failed');
      }
    },
  };
}
