import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireUser = vi.fn();
vi.mock('@/lib/supabaseAuth/requireUser', () => ({ requireUser }));
const rpc = vi.fn();
vi.mock('@/lib/supabaseAuth/userClient', () => ({ createUserScopedClient: vi.fn(() => ({ rpc })) }));

const USER = '11111111-2222-4333-8444-555555555555';
const ADDR = '0x52908400098527886E0F7030069857D2E4169EE7';

function req(body: unknown) {
  return new Request('https://utp.test/api/wallet/challenge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/wallet/challenge', () => {
  beforeEach(() => {
    requireUser.mockReset().mockResolvedValue({ user: { id: USER }, accessToken: 'tok' });
    rpc.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('passes through 401', async () => {
    requireUser.mockResolvedValue({ error: Response.json({ message: 'Unauthorized' }, { status: 401 }) });
    const { POST } = await import('./route');
    expect((await POST(req({ address: ADDR, chainId: 31 }))).status).toBe(401);
  });

  it('returns an ERC-4361 message bound to the request host, ignoring client domain', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ address: ADDR, chainId: 31, domain: 'evil.test' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/^utp\.test wants you to sign in/);
    expect(json.message).toContain('URI: https://utp.test');
    expect(json.message).toContain('Chain ID: 31');
    expect(rpc).toHaveBeenCalledWith('create_wallet_challenge', expect.objectContaining({
      p_address: ADDR.toLowerCase(), p_chain_id: 31, p_domain: 'utp.test', p_nonce: json.nonce,
    }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(USER);
  });

  it('rejects wrong chain and invalid address with 400', async () => {
    const { POST } = await import('./route');
    expect((await POST(req({ address: ADDR, chainId: 1 }))).status).toBe(400);
    expect((await POST(req({ address: '0x123', chainId: 31 }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
