import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const listStoredBills = vi.hoisted(() => vi.fn());
const listPlaces = vi.hoisted(() => vi.fn(async () => [{ id: 'p1', name: 'Austin' }]));
vi.mock('@/lib/civic/storedBills', () => ({ listStoredBills, listPlaces }));

import BillsPage from './page';

describe('bills page', () => {
  it('links each stored bill to its vote page', async () => {
    listStoredBills.mockResolvedValue([
      { id: 'b1', number: '251', title: 'Budget', status: 'Passed', sourceUrl: 'u', updatedAt: null, place: 'San Francisco' },
    ]);
    const { getByText } = render(await BillsPage({}));
    expect((getByText('Budget') as HTMLAnchorElement).getAttribute('href')).toBe('/bill/b1');
    expect(getByText('San Francisco · 251 · Passed')).toBeTruthy();
  });

  it('offers every covered place as a filter and applies the chosen one', async () => {
    listStoredBills.mockResolvedValue([]);
    const { getByText } = render(await BillsPage({ searchParams: Promise.resolve({ place: 'p1' }) }));
    expect(listStoredBills).toHaveBeenLastCalledWith(50, undefined, 'p1');
    const link = getByText('Austin') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/bills?place=p1');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect((getByText('All places') as HTMLAnchorElement).getAttribute('href')).toBe('/bills');
  });

  it('says so when nothing is stored', async () => {
    listStoredBills.mockResolvedValue([]);
    const { getByText } = render(await BillsPage({}));
    expect(getByText('No bills have been stored yet.')).toBeTruthy();
  });
});
