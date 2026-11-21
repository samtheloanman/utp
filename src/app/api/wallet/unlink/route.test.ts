import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';

const requireUser = vi.fn();
vi.mock('@/lib/supabaseAuth/requireUser', () => ({ requireUser }));
const rpc = vi.fn();
vi.mock('@/lib/supabaseAuth/userClient', () => ({ createUserScopedClient: vi.fn(() => ({ rpc })) }));

const USER = '11111111-2222-4333-8444-555555555555';
const NONCE = 'abcdef0123456789';
const SECRET = 'k'.repeat(64);

function req(body: unknown) {
  return new Request('https://utp.test/api/wallet/unlink', {
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

describe('POST /api/wallet/unlink', () => {
  beforeEach(() => {
    requireUser.mockReset().mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    rpc.mockReset();
    vi.stubEnv('WALLET_LINK_SECRET', SECRET);
  });

  it('503 when WALLET_LINK_SECRET is unset', async () => {
    vi.stubEnv('WALLET_LINK_SECRET', '');
    const { POST } = await import('./route');
    expect((await POST(req({}))).status).toBe(503);
  });

  it('revokes with an attested fresh proof', async () => {
    const s = await signed();
    rpc.mockResolvedValue({ data: 'ok', error: null });
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }));
    expect(res.status).toBe(200);
    const a = s.acct.address.toLowerCase();
    const att = createHmac('sha256', SECRET).update(`${USER}|31|${a}|${NONCE}`).digest('hex');
    expect(rpc).toHaveBeenCalledWith('revoke_wallet_link', { p_chain_id: 31, p_address: a, p_nonce: NONCE, p_att: att });
  });

  it('400 when not linked', async () => {
    const s = await signed();
    rpc.mockResolvedValue({ data: 'not_linked', error: null });
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false });
  });
});
