import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const m = vi.hoisted(() => ({ getStoredBill: vi.fn(), getTally: vi.fn() }));
vi.mock('@/lib/civic/storedBills', async (orig) => ({ ...(await orig<object>()), getStoredBill: m.getStoredBill, getTally: m.getTally }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => { throw new Error('NOT_FOUND'); },
}));
vi.mock('@/lib/supabaseAuth/client', () => ({ createClient: () => ({ auth: { getSession: vi.fn() } }) }));

import BillPage from './page';

const ID = '3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f';

describe('bill page', () => {
  it('shows the bill, its source and an enabled vote with real shares', async () => {
    m.getStoredBill.mockResolvedValue({ id: ID, number: '251', title: 'Budget', status: 'Passed', sourceUrl: 'https://sfgov.legistar.com/x', updatedAt: '2026-11-18T00:00:00Z', place: 'San Francisco' });
    m.getTally.mockResolvedValue({ for: 3, against: 1, unsure: 0, total: 4 });
    const { getByText, getAllByRole, container } = render(await BillPage({ params: Promise.resolve({ id: ID }) }));
    expect((getByText('Read it at the source') as HTMLAnchorElement).href).toBe('https://sfgov.legistar.com/x');
    expect(getByText('4 votes so far')).toBeTruthy();
    expect(container.textContent).toContain('75%');
    expect(getAllByRole('button').every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
    const href = (getByText('Propose action on this bill') as HTMLAnchorElement).getAttribute('href');
    expect(href).toContain('sourceUrl=https%3A%2F%2Fsfgov.legistar.com%2Fx');
    expect(href).toContain(`billId=${ID}`);
  });

  it('is a 404 when the bill is not stored', async () => {
    m.getStoredBill.mockResolvedValue(null);
    await expect(BillPage({ params: Promise.resolve({ id: 'nope' }) })).rejects.toThrow('NOT_FOUND');
  });
});
