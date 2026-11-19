import { describe, expect, it, vi } from 'vitest';
import { linkWallet } from './linkFlow';

const ADDR = '0x1111111111111111111111111111111111111111';
const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

describe('linkWallet', () => {
  it('signs the server message and posts the proof', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(res(200, { message: 'sign me', nonce: 'n' }))
      .mockResolvedValueOnce(res(200, { ok: true }));
    const signMessage = vi.fn().mockResolvedValue('0xsig');
    expect(await linkWallet({ address: ADDR, chainId: 31, signMessage, fetch: fetch as never })).toEqual({ ok: true });
    expect(signMessage).toHaveBeenCalledWith('sign me');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ address: ADDR, chainId: 31 });
    expect(fetch.mock.calls[1][0]).toBe('/api/wallet/link');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ message: 'sign me', signature: '0xsig' });
  });

  it.each([
    [401, 'Sign in first, then link your wallet.'],
    [503, 'Wallet linking is not switched on yet.'],
    [500, 'Could not start wallet linking.'],
  ])('stops at a %s challenge without asking for a signature', async (status, message) => {
    const signMessage = vi.fn();
    const out = await linkWallet({ address: ADDR, chainId: 31, signMessage, fetch: vi.fn().mockResolvedValue(res(status)) as never });
    expect(out).toEqual({ ok: false, message });
    expect(signMessage).not.toHaveBeenCalled();
  });

  it('reports a cancelled signature and sends no proof', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(res(200, { message: 'm' }));
    const out = await linkWallet({ address: ADDR, chainId: 31, signMessage: () => Promise.reject(new Error('no')), fetch: fetch as never });
    expect(out).toEqual({ ok: false, message: 'The signature request was cancelled.' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('explains a wallet that belongs to another account', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(res(200, { message: 'm' })).mockResolvedValueOnce(res(409, { ok: false }));
    const out = await linkWallet({ address: ADDR, chainId: 31, signMessage: async () => '0xsig', fetch: fetch as never });
    expect(out).toEqual({ ok: false, message: 'This wallet is already linked to another account.' });
  });
});
