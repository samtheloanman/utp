import { describe, expect, it, vi } from 'vitest';
import { legistarAdapter, LEGISTAR_JURISDICTIONS } from './legistar';

const NOW = new Date('2026-11-17T12:00:00.000Z');
const SF = LEGISTAR_JURISDICTIONS.find((j) => j.client === 'sfgov')!;
const row = (id: number, status = 'Pending Committee Action') => ({
  MatterId: id, MatterGuid: `G-${id}`, MatterFile: `25${id}`, MatterName: `Name ${id}`,
  MatterTitle: `Title ${id}`, MatterStatusName: status, MatterIntroDate: '2025-10-01T00:00:00',
  MatterLastModifiedUtc: '2025-11-03T20:38:19.147',
});
const ok = (rows: unknown) => vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })) as unknown as typeof fetch;
const mk = (f: typeof fetch) => legistarAdapter(SF, { fetch: f, now: () => NOW });

describe('legistarAdapter', () => {
  it('maps matters to bills with OCD jurisdiction and detail URL', async () => {
    const r = await mk(ok([row(1), row(2)])).fetchBills({ limit: 5 });
    expect(r.status).toBe('live');
    expect(r.fetchedAt).toBe(NOW.toISOString());
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({
      externalId: 'legistar-sfgov-1', jurisdictionCode: SF.ocdId, number: '251',
      title: 'Title 1', status: 'Pending Committee Action', introducedDate: '2025-10-01',
      sourceUrl: 'https://sfgov.legistar.com/LegislationDetail.aspx?ID=1&GUID=G-1',
    });
  });
  it('requests newest first and caps the page size', async () => {
    const f = ok([]);
    await mk(f).fetchBills({ limit: 500 });
    const url = (f as unknown as { mock: { calls: [string][] } }).mock.calls[0][0];
    expect(url).toContain('https://webapi.legistar.com/v1/sfgov/matters');
    expect(url).toContain('$top=50');
    expect(url).toContain('MatterLastModifiedUtc%20desc');
  });
  it('unavailable on HTTP error, network error, non-array body', async () => {
    for (const f of [
      vi.fn(async () => new Response('x', { status: 500 })),
      vi.fn(async () => { throw new Error('boom'); }),
      vi.fn(async () => new Response('{"a":1}', { status: 200 })),
    ]) {
      const r = await mk(f as unknown as typeof fetch).fetchBills({ limit: 5 });
      expect(r.status).toBe('unavailable');
      expect(r.items).toEqual([]);
    }
  });
  it('hash stable and changes when status changes', async () => {
    const h = async (s?: string) => (await mk(ok([row(1, s)])).fetchBills({ limit: 1 })).items[0].recordHash;
    expect(await h()).toBe(await h());
    expect(await h()).not.toBe(await h('Passed'));
  });
  it('registry has unique clients and valid OCD ids', () => {
    const clients = LEGISTAR_JURISDICTIONS.map((j) => j.client);
    expect(new Set(clients).size).toBe(clients.length);
    for (const j of LEGISTAR_JURISDICTIONS) expect(j.ocdId).toMatch(/^ocd-division\/country:us\/state:[a-z]{2}\/(place|county):[a-z_]+$/);
  });
});
