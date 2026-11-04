import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClient = vi.fn(() => ({ tag: 'client' }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

describe('createUserScopedClient', () => {
  beforeEach(() => {
    createClient.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  });
  it('uses the anon key and the caller bearer token', async () => {
    const { createUserScopedClient } = await import('./userClient');
    createUserScopedClient('tok123');
    expect(createClient).toHaveBeenCalledTimes(1);
    const [url, key, opts] = createClient.mock.calls[0] as unknown as [string, string, { global: { headers: Record<string, string> }; auth: { persistSession: boolean } }];
    expect(url).toBe('https://example.supabase.co');
    expect(key).toBe('anon-key');
    expect(opts.global.headers.Authorization).toBe('Bearer tok123');
    expect(opts.auth.persistSession).toBe(false);
  });
});
