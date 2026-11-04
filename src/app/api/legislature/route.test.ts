import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchBills = vi.fn();
vi.mock('@/lib/civic/congress', () => ({
  congressAdapter: () => ({ id: 'congress-gov', jurisdictionCode: 'US', fetchBills }),
}));

import { GET } from './route';

const call = (qs: string) => GET(new Request(`http://localhost/api/legislature${qs}`) as never);

describe('GET /api/legislature', () => {
  beforeEach(() => fetchBills.mockReset());

  it('EU is not_integrated with no items', async () => {
    const body = await (await call('?country=EU')).json();
    expect(body.status).toBe('not_integrated');
    expect(body.items).toEqual([]);
    expect(body.bills).toEqual([]);
  });

  it('US unavailable returns no hardcoded bill', async () => {
    fetchBills.mockResolvedValue({
      status: 'unavailable', items: [], fetchedAt: null,
      source: { name: 'Congress.gov', url: 'https://www.congress.gov' }, error: 'no key',
    });
    const text = JSON.stringify(await (await call('?country=US')).json());
    expect(JSON.parse(text).status).toBe('unavailable');
    expect(JSON.parse(text).bills).toEqual([]);
    for (const s of ['hr4763', 's2281', 'hr5121', 'McHenry']) expect(text).not.toContain(s);
  });
});
