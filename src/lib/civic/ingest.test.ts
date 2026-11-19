import { describe, expect, it, vi } from 'vitest';
import { ingestBills, legistarTarget, shortTitle } from './ingest';
import type { CivicBill, SourceResult } from './types';

const SF = { client: 'sfgov', name: 'San Francisco', ocdId: 'ocd-division/country:us/state:ca/place:san_francisco' };
const LA = { client: 'lacounty', name: 'Los Angeles County', ocdId: 'ocd-division/country:us/state:ca/county:los_angeles' };

function bill(n: number): CivicBill {
  return {
    externalId: `legistar-sfgov-${n}`, jurisdictionCode: SF.ocdId, number: String(n), title: `Bill ${n}`,
    status: 'Passed', introducedDate: '2026-11-01', sourceUrl: `https://sfgov.legistar.com/${n}`, recordHash: 'h',
  };
}

function live(items: CivicBill[]): SourceResult<CivicBill> {
  return { status: 'live', items, fetchedAt: '2026-11-18T00:00:00.000Z', source: { name: 'Legistar (San Francisco)', url: 'https://webapi.legistar.com/v1/sfgov' } };
}

function fakeDb(fail?: string) {
  const calls: Record<string, { rows: unknown; opts: unknown }> = {};
  const updates: Array<{ table: string; values: unknown; where: unknown[] }> = [];
  const db = {
    from: (table: string) => ({
      update: (values: unknown) => ({ eq: async (...where: unknown[]) => { updates.push({ table, values, where }); return { error: null }; } }),
      upsert: (rows: unknown, opts: unknown) => {
        calls[table] = { rows, opts };
        const res = fail === table ? { data: null, error: { code: 'X' } } : { data: { id: `${table}-id` }, error: null };
        return { select: () => ({ single: async () => res }), then: (r: (v: unknown) => unknown) => Promise.resolve(res).then(r) };
      },
    }),
  };
  return { db: db as never, calls, updates };
}

describe('legistarTarget', () => {
  it('marks counties and cities with the right level', () => {
    expect(legistarTarget(LA).jurisdiction.level).toBe('county');
    expect(legistarTarget(SF).jurisdiction.level).toBe('municipal');
    expect(legistarTarget(SF).sourceSlug).toBe('legistar-sfgov');
  });
});

describe('shortTitle', () => {
  it('keeps the first non-empty line and caps the length', () => {
    expect(shortTitle('\nRemote Public Comment\nTo address the Board...')).toBe('Remote Public Comment');
    expect(shortTitle('x'.repeat(300))).toHaveLength(200);
    expect(shortTitle('  ')).toBe('Untitled');
  });
});

describe('ingestBills', () => {
  it('keeps the full text as the official summary when the title is shortened', async () => {
    const { db, calls } = fakeDb();
    await ingestBills(db, legistarTarget(SF), live([{ ...bill(9), title: 'Budget\nLong body' }, bill(10)]));
    const rows = calls.bills.rows as Array<{ title: string; summary_official: string | null }>;
    expect(rows[0]).toMatchObject({ title: 'Budget', summary_official: 'Budget\nLong body' });
    expect(rows[1].summary_official).toBeNull();
  });

  it('stores jurisdiction, source and bills keyed for idempotent upsert', async () => {
    const { db, calls } = fakeDb();
    const out = await ingestBills(db, legistarTarget(SF), live([bill(1), bill(2)]));
    expect(out).toEqual({ ok: true, stored: 2 });
    expect(calls.jurisdictions.opts).toEqual({ onConflict: 'code' });
    expect(calls.jurisdictions.rows).toMatchObject({ code: SF.ocdId, ocd_id: SF.ocdId, type: 'local', country: 'US' });
    expect(calls.data_sources.rows).toMatchObject({ slug: 'legistar-sfgov', jurisdiction_id: 'jurisdictions-id', adapter_status: 'live' });
    expect(calls.bills.opts).toEqual({ onConflict: 'source_id,external_id' });
    expect((calls.bills.rows as unknown[])[0]).toMatchObject({
      source_id: 'data_sources-id', jurisdiction_id: 'jurisdictions-id', external_id: 'legistar-sfgov-1',
      bill_number: '1', title: 'Bill 1', source_url: 'https://sfgov.legistar.com/1',
    });
  });

  it('stores no bills when the source is not live, and records the failure on the source', async () => {
    const { db, calls, updates } = fakeDb();
    const out = await ingestBills(db, legistarTarget(SF), { ...live([]), status: 'unavailable', fetchedAt: null, error: 'Legistar HTTP 500' });
    expect(out).toEqual({ ok: false, error: 'source unavailable' });
    expect(Object.keys(calls)).toEqual([]);
    expect(updates).toEqual([{
      table: 'data_sources',
      values: { last_attempt_at: expect.any(String), last_error: 'Legistar HTTP 500', adapter_status: 'stale' },
      where: ['slug', 'legistar-sfgov'],
    }]);
  });

  it('reports a failed bill write', async () => {
    const { db } = fakeDb('bills');
    expect(await ingestBills(db, legistarTarget(SF), live([bill(1)]))).toEqual({ ok: false, error: 'bill upsert failed' });
  });

  it('falls back to the external id when a bill has no number', async () => {
    const { db, calls } = fakeDb();
    await ingestBills(db, legistarTarget(SF), live([{ ...bill(3), number: '' }]));
    expect((calls.bills.rows as Array<{ bill_number: string }>)[0].bill_number).toBe('legistar-sfgov-3');
  });
});
