import { NextRequest, NextResponse } from 'next/server';
import { congressAdapter } from '@/lib/civic/congress';
import type { CivicBill, SourceResult } from '@/lib/civic/types';

export const runtime = 'nodejs';

const LIMIT = 10;

async function fetchUK(now: Date): Promise<SourceResult<CivicBill>> {
  const source = { name: 'UK Parliament Bills API', url: 'https://bills.parliament.uk' };
  const fail = (error: string): SourceResult<CivicBill> => ({
    status: 'unavailable', items: [], fetchedAt: null, source, error,
  });
  try {
    const res = await fetch(
      `https://bills-api.parliament.uk/api/v1/Bills?CurrentHouse=All&SortBy=DateUpdatedDesc&Take=${LIMIT}`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.items)) return fail('response missing items');
    const items: CivicBill[] = data.items.map((b: Record<string, unknown>) => ({
      externalId: `uk-${b.billId}`,
      jurisdictionCode: 'UK',
      number: `Bill ${b.billId}`,
      title: (b.shortTitle as string) || (b.longTitle as string) || 'Untitled',
      status: (b.currentHouse as string) || 'Unknown',
      introducedDate: null,
      sourceUrl: `https://bills.parliament.uk/bills/${b.billId}`,
      recordHash: '',
    }));
    return { status: 'live', items, fetchedAt: now.toISOString(), source };
  } catch {
    return fail('fetch failed');
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get('country') || 'US').toUpperCase();
  const now = new Date();

  let result: SourceResult<CivicBill>;
  if (country === 'US') {
    result = await congressAdapter({ apiKey: process.env.CONGRESS_API_KEY }).fetchBills({ limit: LIMIT });
  } else if (country === 'UK') {
    result = await fetchUK(now);
  } else {
    result = {
      status: 'not_integrated', items: [], fetchedAt: null,
      source: { name: 'Not integrated', url: '' },
    };
  }

  return NextResponse.json({
    status: result.status,
    source: result.source,
    fetchedAt: result.fetchedAt,
    error: result.error,
    items: result.items,
    // Legacy key kept for existing consumers; same array as `items`.
    bills: result.items,
    total: result.items.length,
    country,
    timestamp: now.toISOString(),
  });
}
