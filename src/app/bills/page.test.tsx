import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const listStoredBills = vi.hoisted(() => vi.fn());
vi.mock('@/lib/civic/storedBills', () => ({ listStoredBills }));

import BillsPage from './page';

describe('bills page', () => {
  it('links each stored bill to its vote page', async () => {
    listStoredBills.mockResolvedValue([
      { id: 'b1', number: '251', title: 'Budget', status: 'Passed', sourceUrl: 'u', updatedAt: null, place: 'San Francisco' },
    ]);
    const { getByText } = render(await BillsPage());
    expect((getByText('Budget') as HTMLAnchorElement).getAttribute('href')).toBe('/bill/b1');
    expect(getByText('San Francisco · 251 · Passed')).toBeTruthy();
  });

  it('says so when nothing is stored', async () => {
    listStoredBills.mockResolvedValue([]);
    const { getByText } = render(await BillsPage());
    expect(getByText('No bills have been stored yet.')).toBeTruthy();
  });
});
