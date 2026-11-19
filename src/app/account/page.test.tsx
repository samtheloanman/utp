import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getSession: vi.fn(), linkWallet: vi.fn(), rows: vi.fn(),
  account: { address: undefined as string | undefined, isConnected: false },
}));
vi.mock('wagmi', () => ({
  useAccount: () => m.account,
  useConnect: () => ({ connect: vi.fn(), connectors: [{ id: 'injected' }], isPending: false }),
  useSignMessage: () => ({ signMessageAsync: vi.fn() }),
}));
vi.mock('@/lib/supabaseAuth/client', () => ({
  createClient: () => ({
    auth: { getSession: m.getSession },
    from: () => ({ select: () => ({ eq: m.rows }) }),
  }),
}));
vi.mock('@/lib/wallet/linkFlow', () => ({ linkWallet: m.linkWallet }));

import AccountPage from './page';

const ADDR = '0x1111111111111111111111111111111111111111';

describe('account page', () => {
  beforeEach(() => {
    m.getSession.mockReset();
    m.linkWallet.mockReset();
    m.rows.mockReset().mockResolvedValue({ data: [] });
    m.account = { address: undefined, isConnected: false };
  });

  it('asks a signed-out visitor to sign in', async () => {
    m.getSession.mockResolvedValue({ data: { session: null } });
    const { findByText } = render(<AccountPage />);
    expect(((await findByText('Sign in')) as HTMLAnchorElement).getAttribute('href')).toBe('/login?redirect=/account');
  });

  it('links the connected wallet and then lists it', async () => {
    m.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    m.account = { address: ADDR, isConnected: true };
    m.linkWallet.mockResolvedValue({ ok: true });
    const { findByText, getByText } = render(<AccountPage />);
    await findByText('No wallet linked yet.');
    m.rows.mockResolvedValue({ data: [{ address: ADDR, chain_id: 31 }] });
    fireEvent.click(getByText('Link this wallet'));
    await findByText('Wallet linked to your account.');
    expect(m.linkWallet).toHaveBeenCalledWith(expect.objectContaining({ address: ADDR, chainId: 31 }));
    await waitFor(() => expect(getByText(/chain 31/)).toBeTruthy());
  });

  it('shows why linking failed', async () => {
    m.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    m.account = { address: ADDR, isConnected: true };
    m.linkWallet.mockResolvedValue({ ok: false, message: 'This wallet is already linked to another account.' });
    const { findByText, findByRole } = render(<AccountPage />);
    fireEvent.click(await findByText('Link this wallet'));
    expect((await findByRole('alert')).textContent).toBe('This wallet is already linked to another account.');
  });
});
