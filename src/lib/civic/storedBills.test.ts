import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { getStoredBill, getTally, isBillId, listPlaces, listStoredBills, tallyPercent } from './storedBills';

const ID = '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f';
const ROW = {
  id: ID, bill_number: '251', title: 'Budget', status: 'Passed', source_url: 'https://sfgov.legistar.com/x',
  updated_at: '2026-11-18T00:00:00Z', jurisdictions: { name: 'San Francisco' },
};

function db(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq']) chain[m] = () => chain;
  chain.limit = async () => result;
  chain.maybeSingle = async () => result;
  return { from: () => chain } as never;
}

/** Records every query-builder call so a test can assert the filter and ordering. */
function recordingDb(result: unknown) {
  const calls: Array<[string, ...unknown[]]> = [];
  const chain: Record<string, unknown> = { then: (r: (v: unknown) => unknown) => Promise.resolve(result).then(r) };
  for (const m of ['select', 'order', 'eq', 'limit']) chain[m] = (...a: unknown[]) => { calls.push([m, ...a]); return chain; };
  return { db: { from: (t: string) => { calls.push(['from', t]); return chain; } } as never, calls };
}

describe('stored bills', () => {
  it('filters by place and lists the newest introduced bills first', async () => {
    const { db: d, calls } = recordingDb({ data: [ROW], error: null });
    await listStoredBills(10, d, ID);
    expect(calls).toContainEqual(['eq', 'jurisdiction_id', ID]);
    expect(calls.find((c) => c[0] === 'order')).toEqual(['order', 'introduced_date', { ascending: false, nullsFirst: false }]);
  });

  it('ignores a place filter that is not a UUID', async () => {
    const { db: d, calls } = recordingDb({ data: [], error: null });
    await listStoredBills(10, d, "x' or 1=1");
    expect(calls.some((c) => c[0] === 'eq')).toBe(false);
  });

  it('lists the covered places by name', async () => {
    const { db: d, calls } = recordingDb({ data: [{ id: ID, name: 'Austin' }], error: null });
    expect(await listPlaces(d)).toEqual([{ id: ID, name: 'Austin' }]);
    expect(calls).toContainEqual(['from', 'jurisdictions']);
  });

  it('logs a failed read instead of hiding it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await listStoredBills(10, db({ data: null, error: { code: 'PGRST301' } }))).toEqual([]);
    expect(spy).toHaveBeenCalledWith('bills read failed', { code: 'PGRST301' });
    spy.mockRestore();
  });

  it('maps rows and reads the place name', async () => {
    expect(await listStoredBills(10, db({ data: [ROW], error: null }))).toEqual([
      { id: ID, number: '251', title: 'Budget', status: 'Passed', sourceUrl: 'https://sfgov.legistar.com/x', updatedAt: '2026-11-18T00:00:00Z', place: 'San Francisco' },
    ]);
  });

  it('returns an empty list when the read fails', async () => {
    expect(await listStoredBills(10, db({ data: null, error: { code: 'X' } }))).toEqual([]);
  });

  it('does not query for an id that is not a UUID', async () => {
    expect(isBillId('ab-1265')).toBe(false);
    expect(await getStoredBill('ab-1265', { from: () => { throw new Error('queried'); } } as never)).toBeNull();
  });

  it('reads one bill and its tally', async () => {
    expect((await getStoredBill(ID, db({ data: { ...ROW, jurisdictions: [{ name: 'SF' }] }, error: null })))?.place).toBe('SF');
    expect(await getTally(ID, db({ data: { count_for: 3, count_against: 1, count_unsure: 0, total_votes: 4 } }))).toEqual({ for: 3, against: 1, unsure: 0, total: 4 });
    expect(await getTally(ID, db({ data: null }))).toEqual({ for: 0, against: 0, unsure: 0, total: 0 });
  });

  it('turns a tally into whole percentages', () => {
    expect(tallyPercent({ for: 3, against: 1, unsure: 0, total: 4 })).toEqual({ for: 75, against: 25, unsure: 0 });
    expect(tallyPercent({ for: 0, against: 0, unsure: 0, total: 0 })).toEqual({ for: 0, against: 0, unsure: 0 });
  });
});
