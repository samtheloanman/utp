import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';

const requireUser = vi.fn();
vi.mock('@/lib/supabaseAuth/requireUser', () => ({ requireUser }));
const rpc = vi.fn();
vi.mock('@/lib/supabaseAuth/userClient', () => ({ createUserScopedClient: vi.fn(() => ({ rpc })) }));

const USER = '11111111-2222-4333-8444-555555555555';
const NONCE = 'abcdef0123456789';

function req(body: unknown, url = 'https://utp.test/api/wallet/link') {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  });
}

async function signed() {
  const acct = privateKeyToAccount(generatePrivateKey());
  const message = createSiweMessage({
    domain: 'utp.test', uri: 'https://utp.test', address: acct.address, chainId: 31, nonce: NONCE, version: '1',
  });
  return { acct, message, signature: await acct.signMessage({ message }) };
}

function stubRpc(address: string, activate: string) {
  rpc.mockImplementation(async (fn: string) => {
    if (fn === 'consume_wallet_challenge')
      return { data: [{ nonce: NONCE, user_id: USER, chain_id: 31, address: address.toLowerCase(), domain: 'utp.test', expires_at: new Date(Date.now() + 60_000).toISOString() }], error: null };
    if (fn === 'activate_wallet_link') return { data: activate, error: null };
    if (fn === 'wallet_challenge_status') return { data: 'consumed', error: null };
    return { data: null, error: null };
  });
}

describe('POST /api/wallet/link', () => {
  beforeEach(() => {
    requireUser.mockReset().mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    rpc.mockReset();
  });

  it('passes through 401', async () => {
    requireUser.mockResolvedValue({ error: Response.json({ message: 'Unauthorized' }, { status: 401 }) });
    const { POST } = await import('./route');
    expect((await POST(req({}))).status).toBe(401);
  });

  it('links on a valid signature', async () => {
    const s = await signed();
    stubRpc(s.acct.address, 'ok');
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('activate_wallet_link', { p_chain_id: 31, p_address: s.acct.address.toLowerCase(), p_assurance: 'aal1' });
  });

  it('409 for address_taken without internals', async () => {
    const s = await signed();
    stubRpc(s.acct.address, 'address_taken');
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false });
  });

  it('400 when the request host differs from the signed domain', async () => {
    const s = await signed();
    stubRpc(s.acct.address, 'ok');
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }, 'https://other.test/api/wallet/link'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('400 on malformed body', async () => {
    const { POST } = await import('./route');
    expect((await POST(req({ message: 1, signature: 'zz' }))).status).toBe(400);
  });
});
