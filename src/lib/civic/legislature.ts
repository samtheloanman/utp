import { congressAdapter } from './congress';
import { recordHash } from './hash';
import { withTimeout } from './http';
import { legistarAdapter, LEGISTAR_JURISDICTIONS } from './legistar';
import type { CivicBill, SourceResult } from './types';

export interface LegislatureDeps {
  apiKey?: string;
  fetch?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
}

const LIMIT = 10;

const NOT_INTEGRATED: SourceResult<CivicBill> = {
  status: 'not_integrated', items: [], fetchedAt: null, source: { name: 'Not integrated', url: '' },
};

function envelope(result: SourceResult<CivicBill>, now: Date) {
  return {
    status: result.status,
    source: result.source,
    fetchedAt: result.fetchedAt,
    error: result.error,
    items: result.items,
    bills: result.items,
    total: result.items.length,
    timestamp: now.toISOString(),
  };
}

async function fetchUK(d: LegislatureDeps, now: Date): Promise<SourceResult<CivicBill>> {
  const source = { name: 'UK Parliament Bills API', url: 'https://bills.parliament.uk' };
  const fail = (error: string): SourceResult<CivicBill> => ({
    status: 'unavailable', items: [], fetchedAt: null, source, error,
  });
  try {
    const res = await (d.fetch ?? fetch)(
      `https://bills-api.parliament.uk/api/v1/Bills?CurrentHouse=All&SortBy=DateUpdatedDesc&Take=${LIMIT}`,
      { signal: withTimeout(undefined, d.timeoutMs), next: { revalidate: 600 } } as RequestInit,
    );
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.items)) return fail('response missing items');
    const items: CivicBill[] = data.items.map((b: Record<string, unknown>) => {
      const externalId = `uk-${b.billId}`;
      return {
        externalId,
        jurisdictionCode: 'UK',
        number: `Bill ${b.billId}`,
        title: (b.shortTitle as string) || (b.longTitle as string) || 'Untitled',
        status: (b.currentHouse as string) || 'Unknown',
        introducedDate: null,
        sourceUrl: `https://bills.parliament.uk/bills/${b.billId}`,
        recordHash: recordHash({
          externalId,
          updateDate: String(b.lastUpdate ?? ''),
          latestActionText: String(b.currentHouse ?? ''),
        }),
      };
    });
    return { status: 'live', items, fetchedAt: now.toISOString(), source };
  } catch {
    return fail('fetch failed');
  }
}

/** Shared by the API route and the page; no loopback HTTP. */
export async function getLegislature(countryParam: string, d: LegislatureDeps = {}) {
  const country = (countryParam || 'US').toUpperCase();
  const now = d.now ? d.now() : new Date();
  const hasKey = 'apiKey' in d;

  let result: SourceResult<CivicBill>;
  if (country === 'US') {
    result = await congressAdapter({
      apiKey: hasKey ? d.apiKey : process.env.CONGRESS_API_KEY,
      fetch: d.fetch, now: d.now, timeoutMs: d.timeoutMs,
    }).fetchBills({ limit: LIMIT });
  } else if (country === 'UK') {
    result = await fetchUK(d, now);
  } else {
    result = NOT_INTEGRATED;
  }

  return { ...envelope(result, now), country };
}

/** Local government (city or county) bills by Legistar client slug. */
export async function getLocalLegislature(clientParam: string, d: LegislatureDeps = {}) {
  const now = d.now ? d.now() : new Date();
  const jurisdiction = LEGISTAR_JURISDICTIONS.find((j) => j.client === clientParam.toLowerCase()) ?? null;
  const result = jurisdiction
    ? await legistarAdapter(jurisdiction, { fetch: d.fetch, now: d.now, timeoutMs: d.timeoutMs }).fetchBills({ limit: LIMIT })
    : NOT_INTEGRATED;
  return { ...envelope(result, now), jurisdiction };
}
