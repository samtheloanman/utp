import { describe, expect, it } from 'vitest';
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

type Op = { table: string; op: 'upsert' | 'update' | 'insert'; values: unknown; opts?: unknown; where?: unknown[] };

/** Records every write in order. `fail` names a table whose upsert errors. */
function fakeDb(fail?: string) {
  const ops: Op[] = [];
  const chain = (op: Op, res: { data: Array<Record<string, unknown>> | null; error: unknown }) => {
    const c = {
      eq: (...where: unknown[]) => { op.where = where; return c; },
      select: () => c,
      single: async () => ({ data: res.data?.[0] ?? null, error: res.error }),
      then: (r: (v: unknown) => unknown, j?: (e: unknown) => unknown) => Promise.resolve(res).then(r, j),
    };
    return c;
  };
  const db = {
    from: (table: string) => ({
      upsert: (values: unknown, opts: unknown) => {
        const op: Op = { table, op: 'upsert', values, opts };
        ops.push(op);
        if (fail === table) return chain(op, { data: null, error: { code: 'X' } });
        const data = Array.isArray(values)
          ? (values as Array<{ external_id?: string }>).map((v) => ({ id: `bill-${v.external_id}`, external_id: v.external_id }))
          : [{ id: `${table}-id` }];
        return chain(op, { data, error: null });
      },
      update: (values: unknown) => { const op: Op = { table, op: 'update', values }; ops.push(op); return chain(op, { data: [{ id: 'data_sources-id' }], error: null }); },
      insert: (values: unknown) => { const op: Op = { table, op: 'insert', values }; ops.push(op); return chain(op, { data: null, error: null }); },
    }),
  };
  const last = (table: string, op: Op['op']) => ops.filter((o) => o.table === table && o.op === op).at(-1);
  return { db: db as never, ops, last };
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
  it('never stores a title as the official summary', async () => {
    const { db, last } = fakeDb();
    await ingestBills(db, legistarTarget(SF), live([{ ...bill(9), title: 'Budget\nLong agenda text' }, bill(10)]));
    const rows = last('bills', 'upsert')!.values as Array<Record<string, unknown>>;
    expect(rows[0].title).toBe('Budget');
    for (const r of rows) expect('summary_official' in r).toBe(false);
  });

  it('stores jurisdiction, source and bills keyed for idempotent upsert', async () => {
    const { db, last } = fakeDb();
    const out = await ingestBills(db, legistarTarget(SF), live([bill(1), bill(2)]));
    expect(out).toEqual({ ok: true, stored: 2 });
    expect(last('jurisdictions', 'upsert')!.opts).toEqual({ onConflict: 'code' });
    expect(last('jurisdictions', 'upsert')!.values).toMatchObject({ code: SF.ocdId, ocd_id: SF.ocdId, type: 'local', country: 'US' });
    expect(last('data_sources', 'upsert')!.values).toMatchObject({ slug: 'legistar-sfgov', jurisdiction_id: 'jurisdictions-id' });
    expect(last('bills', 'upsert')!.opts).toEqual({ onConflict: 'source_id,external_id' });
    expect((last('bills', 'upsert')!.values as unknown[])[0]).toMatchObject({
      source_id: 'data_sources-id', jurisdiction_id: 'jurisdictions-id', external_id: 'legistar-sfgov-1',
      bill_number: '1', title: 'Bill 1', source_url: 'https://sfgov.legistar.com/1',
    });
  });

  it('marks the source live only after the bills are stored', async () => {
    const { db, ops, last } = fakeDb();
    await ingestBills(db, legistarTarget(SF), live([bill(1)]));
    expect(last('data_sources', 'upsert')!.values).not.toHaveProperty('adapter_status');
    expect(last('data_sources', 'upsert')!.values).not.toHaveProperty('last_successful_fetch');
    const done = last('data_sources', 'update')!;
    expect(done.values).toEqual({ adapter_status: 'live', last_successful_fetch: '2026-11-18T00:00:00.000Z', last_error: null });
    expect(done.where).toEqual(['id', 'data_sources-id']);
    expect(ops.indexOf(done)).toBeGreaterThan(ops.indexOf(last('bill_versions', 'upsert')!));
  });

  it('writes one version per bill, skipping hashes already stored', async () => {
    const { db, last } = fakeDb();
    await ingestBills(db, legistarTarget(SF), live([bill(1), { ...bill(2), recordHash: 'h2' }]));
    const v = last('bill_versions', 'upsert')!;
    expect(v.opts).toEqual({ onConflict: 'bill_id,record_hash', ignoreDuplicates: true });
    expect(v.values).toEqual([
      { bill_id: 'bill-legistar-sfgov-1', record_hash: 'h', fetched_at: '2026-11-18T00:00:00.000Z' },
      { bill_id: 'bill-legistar-sfgov-2', record_hash: 'h2', fetched_at: '2026-11-18T00:00:00.000Z' },
    ]);
  });

  it('stores no bills when the source is not live, and records the failure', async () => {
    const { db, ops } = fakeDb();
    const out = await ingestBills(db, legistarTarget(SF), { ...live([]), status: 'unavailable', fetchedAt: null, error: 'Legistar HTTP 500' });
    expect(out).toEqual({ ok: false, error: 'source unavailable' });
    expect(ops).toEqual([
      { table: 'data_sources', op: 'update', where: ['slug', 'legistar-sfgov'],
        values: { last_attempt_at: expect.any(String), last_error: 'Legistar HTTP 500', adapter_status: 'stale' } },
      { table: 'ingest_failures', op: 'insert', values: { source_id: 'data_sources-id', error: 'legistar-sfgov: Legistar HTTP 500' } },
    ]);
  });

  it.each(['bills', 'bill_versions'])('a failed %s write leaves the source not live and records the failure', async (table) => {
    const { db, ops, last } = fakeDb(table);
    const error = table === 'bills' ? 'bill upsert failed' : 'bill version upsert failed';
    expect(await ingestBills(db, legistarTarget(SF), live([bill(1)]))).toEqual({ ok: false, error });
    expect(ops.some((o) => (o.values as { adapter_status?: string }).adapter_status === 'live')).toBe(false);
    expect(ops.some((o) => 'last_successful_fetch' in (o.values as object))).toBe(false);
    expect(last('data_sources', 'update')!.values).toMatchObject({ last_error: error, adapter_status: 'stale' });
    expect(last('ingest_failures', 'insert')!.values).toEqual({ source_id: 'data_sources-id', error: `legistar-sfgov: ${error}` });
  });

  it('marks the source live when a live fetch returns no bills', async () => {
    const { db, last } = fakeDb();
    expect(await ingestBills(db, legistarTarget(SF), live([]))).toEqual({ ok: true, stored: 0 });
    expect(last('data_sources', 'update')!.values).toMatchObject({ adapter_status: 'live' });
    expect(last('bills', 'upsert')).toBeUndefined();
  });

  it('falls back to the external id when a bill has no number', async () => {
    const { db, last } = fakeDb();
    await ingestBills(db, legistarTarget(SF), live([{ ...bill(3), number: '' }]));
    expect((last('bills', 'upsert')!.values as Array<{ bill_number: string }>)[0].bill_number).toBe('legistar-sfgov-3');
  });
});
