import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { getStoredBill, getTally, isBillId, listStoredBills, tallyPercent } from './storedBills';

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

describe('stored bills', () => {
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
