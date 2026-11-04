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

describe('POST /api/wallet/link', () => {
  beforeEach(() => {
    requireUser.mockReset().mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    rpc.mockReset();
    vi.stubEnv('WALLET_LINK_SECRET', SECRET);
  });

  it('503 fail-closed when WALLET_LINK_SECRET is unset', async () => {
    vi.stubEnv('WALLET_LINK_SECRET', '');
    const s = await signed();
    const { POST } = await import('./route');
    expect((await POST(req({ message: s.message, signature: s.signature }))).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('passes through 401', async () => {
    requireUser.mockResolvedValue({ error: Response.json({ message: 'Unauthorized' }, { status: 401 }) });
    const { POST } = await import('./route');
    expect((await POST(req({}))).status).toBe(401);
  });

  it('links on a valid signature, sending the HMAC attestation to link_wallet', async () => {
    const s = await signed();
    rpc.mockResolvedValue({ data: 'ok', error: null });
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const a = s.acct.address.toLowerCase();
    const att = createHmac('sha256', SECRET).update(`${USER}|31|${a}|${NONCE}`).digest('hex');
    expect(rpc).toHaveBeenCalledWith('link_wallet', { p_nonce: NONCE, p_att: att, p_assurance: 'aal1' });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('409 for address_taken without internals', async () => {
    const s = await signed();
    rpc.mockResolvedValue({ data: 'address_taken', error: null });
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false });
  });

  it('400 for replayed, 500 for bad_attestation (key mismatch)', async () => {
    const s = await signed();
    const { POST } = await import('./route');
    rpc.mockResolvedValue({ data: 'replayed', error: null });
    expect((await POST(req({ message: s.message, signature: s.signature }))).status).toBe(400);
    rpc.mockResolvedValue({ data: 'bad_attestation', error: null });
    expect((await POST(req({ message: s.message, signature: s.signature }))).status).toBe(500);
  });

  it('400 for a bad signature without calling the database', async () => {
    const s = await signed();
    const other = await privateKeyToAccount(generatePrivateKey()).signMessage({ message: s.message });
    const { POST } = await import('./route');
    expect((await POST(req({ message: s.message, signature: other }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('400 when the request host differs from the signed domain', async () => {
    const s = await signed();
    const { POST } = await import('./route');
    const res = await POST(req({ message: s.message, signature: s.signature }, 'https://other.test/api/wallet/link'));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('400 on malformed body', async () => {
    const { POST } = await import('./route');
    expect((await POST(req({ message: 1, signature: 'zz' }))).status).toBe(400);
  });
});
