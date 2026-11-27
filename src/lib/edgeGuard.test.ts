import { describe, it, expect, vi, beforeEach } from 'vitest';

const checkBotId = vi.fn();
const checkRateLimit = vi.fn();
vi.mock('botid/server', () => ({ checkBotId }));
vi.mock('@vercel/firewall', () => ({ checkRateLimit }));

const request = () => new Request('https://utp.example/api/vote', { method: 'POST' });

async function guard() {
  vi.resetModules();
  return (await import('./edgeGuard')).guardRequest;
}

describe('guardRequest', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    checkBotId.mockReset().mockResolvedValue({ isBot: false });
    checkRateLimit.mockReset().mockResolvedValue({ rateLimited: false });
  });

  it('does nothing outside Vercel', async () => {
    vi.stubEnv('VERCEL', '');
    expect(await (await guard())(request(), 'vote')).toBeNull();
    expect(checkBotId).not.toHaveBeenCalled();
  });

  it('lets a human under the limit through', async () => {
    vi.stubEnv('VERCEL', '1');
    expect(await (await guard())(request(), 'vote')).toBeNull();
    expect(checkRateLimit).toHaveBeenCalledWith('vote', expect.objectContaining({ timeout: 800 }));
  });

  it('answers 403 to a bot without spending the rate limit', async () => {
    vi.stubEnv('VERCEL', '1');
    checkBotId.mockResolvedValue({ isBot: true });
    const res = await (await guard())(request(), 'vote');
    expect(res?.status).toBe(403);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('answers 429 with Retry-After when over the limit', async () => {
    vi.stubEnv('VERCEL', '1');
    checkRateLimit.mockResolvedValue({ rateLimited: true });
    const res = await (await guard())(request(), 'propose');
    expect(res?.status).toBe(429);
    expect(res?.headers.get('retry-after')).toBe('60');
  });

  it('fails open and logs when the limiter errors', async () => {
    vi.stubEnv('VERCEL', '1');
    checkRateLimit.mockRejectedValue(new Error('TimeoutError'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await (await guard())(request(), 'vote')).toBeNull();
    expect(log).toHaveBeenCalledWith('rate limit check failed; allowing request', expect.objectContaining({ rule: 'vote' }));
    log.mockRestore();
  });
});
