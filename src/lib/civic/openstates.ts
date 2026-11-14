import { recordHash } from './hash';
import { withTimeout } from './http';
import type { CivicBill, SourceAdapter, SourceResult } from './types';

const SOURCE = { name: 'Open States (California)', url: 'https://openstates.org/ca/bills/' };

interface Deps {
  apiKey?: string;
  fetch?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** California state adapter. Live run is BLOCKED until an OpenStates key exists in an approved store. */
export function openStatesAdapter(d: Deps): SourceAdapter {
  const doFetch = d.fetch ?? fetch;
  const now = d.now ?? (() => new Date());
  const fail = (error: string): SourceResult<CivicBill> => ({
    status: 'unavailable', items: [], fetchedAt: null, source: SOURCE, error,
  });

  return {
    id: 'openstates-ca',
    jurisdictionCode: 'US-CA',
    async fetchBills({ limit, signal }) {
      if (!d.apiKey) return fail('OPENSTATES_API_KEY not configured');
      try {
        const res = await doFetch(
          `https://v3.openstates.org/bills?jurisdiction=California&sort=updated_desc&per_page=${Math.min(limit, 20)}`,
          { signal: withTimeout(signal, d.timeoutMs), headers: { 'X-API-KEY': d.apiKey } },
        );
        if (!res.ok) return fail(`Open States HTTP ${res.status}`);
        const data = (await res.json()) as { results?: unknown };
        if (!Array.isArray(data.results)) return fail('Open States response missing results');
        const items: CivicBill[] = data.results.map((raw) => {
          const b = raw as Record<string, unknown>;
          const externalId = `ca-${str(b.id)}`;
          return {
            externalId,
            jurisdictionCode: 'US-CA',
            number: str(b.identifier),
            title: str(b.title) || 'Untitled',
            status: str(b.latest_action_description) || 'Unknown',
            introducedDate: str(b.first_action_date) || null,
            sourceUrl: str(b.openstates_url) || SOURCE.url,
            recordHash: recordHash({
              externalId,
              updateDate: str(b.updated_at),
              latestActionText: str(b.latest_action_description),
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
