import { describe, expect, it, vi } from 'vitest';
import { getLegislature, getLocalLegislature } from './legislature';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const resp = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('getLegislature', () => {
  it('EU is not_integrated', async () => {
    const r = await getLegislature('eu', { now: () => NOW });
    expect(r.status).toBe('not_integrated');
    expect(r.items).toEqual([]);
    expect(r.country).toBe('EU');
  });
  it('US without key is unavailable', async () => {
    const r = await getLegislature('US', { apiKey: undefined, now: () => NOW });
    expect(r.status).toBe('unavailable');
    expect(r.bills).toEqual([]);
  });
  it('US live via injected fetch', async () => {
    const f = resp({ bills: [{ congress: 119, type: 'S', number: '5', title: 'T', updateDate: '2026-11-01', latestAction: { text: 'x' } }] });
    const r = await getLegislature('US', { apiKey: 'k', fetch: f, now: () => NOW });
    expect(r.status).toBe('live');
    expect(r.items[0].sourceUrl).toBe('https://www.congress.gov/bill/119th-congress/senate-bill/5');
  });
  it('UK upstream error is unavailable, not live', async () => {
    const r = await getLegislature('UK', { fetch: resp({}, 500), now: () => NOW });
    expect(r.status).toBe('unavailable');
  });
  it('UK success hashes items', async () => {
    const f = resp({ items: [{ billId: 1, shortTitle: 'A', currentHouse: 'Commons', lastUpdate: '2026-11-01' }] });
    const r = await getLegislature('UK', { fetch: f, now: () => NOW });
    expect(r.status).toBe('live');
    expect(r.items[0].recordHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('getLocalLegislature', () => {
  const matter = { MatterId: 7, MatterGuid: 'G', MatterFile: '25-007', MatterTitle: 'Budget', MatterStatusName: 'Passed', MatterLastModifiedUtc: '2026-11-01T00:00:00' };
  it('known Legistar place is live and carries its OCD jurisdiction', async () => {
    const r = await getLocalLegislature('SFGOV', { fetch: resp([matter]), now: () => NOW });
    expect(r.status).toBe('live');
    expect(r.jurisdiction).toEqual({ client: 'sfgov', name: 'San Francisco', ocdId: 'ocd-division/country:us/state:ca/place:san_francisco' });
    expect(r.items[0].jurisdictionCode).toBe(r.jurisdiction?.ocdId);
    expect(r.total).toBe(1);
  });
  it('unknown place is not_integrated and never fetches', async () => {
    const f = resp([matter]);
    const r = await getLocalLegislature('atlantis', { fetch: f, now: () => NOW });
    expect(r.status).toBe('not_integrated');
    expect(r.items).toEqual([]);
    expect(r.jurisdiction).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it('upstream failure is unavailable, not live', async () => {
    const r = await getLocalLegislature('sfgov', { fetch: resp('x', 500), now: () => NOW });
    expect(r.status).toBe('unavailable');
    expect(r.items).toEqual([]);
  });
});
