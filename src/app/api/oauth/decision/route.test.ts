import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const approveAuthorization = vi.fn();
const denyAuthorization = vi.fn();

vi.mock('@/lib/supabaseAuth/server', () => ({
  createClient: async () => ({
    auth: {
      getUser,
      oauth: {
        approveAuthorization,
        denyAuthorization,
      },
    },
  }),
}));

import { POST } from './route';

describe('POST /api/oauth/decision', () => {
  beforeEach(() => {
    getUser.mockReset();
    approveAuthorization.mockReset();
    denyAuthorization.mockReset();
  });

  it('returns 400 JSON on non-form JSON payloads instead of 500', async () => {
    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Expected form-encoded OAuth consent payload' });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('returns 400 JSON when content-type is not form-encoded', async () => {
    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'invalid',
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('redirects malformed form submissions to /login with an error', async () => {
    const form = new URLSearchParams({ authorization_id: '', decision: 'maybe' });
    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }),
    );

    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('error')).toContain('Malformed');
  });

  it('redirects unauthenticated users to /login with consent return path', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const form = new URLSearchParams({ authorization_id: 'auth-123', decision: 'approve' });
    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }),
    );

    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('redirect')).toBe('/oauth/consent?authorization_id=auth-123');
  });

  it('approves OAuth authorization for authenticated users', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    approveAuthorization.mockResolvedValue({
      data: { redirect_url: 'https://client.example/cb?code=ok' },
      error: null,
    });
    const form = new URLSearchParams({ authorization_id: 'auth-123', decision: 'approve' });
    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }),
    );

    expect(approveAuthorization).toHaveBeenCalledWith('auth-123');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://client.example/cb?code=ok');
  });

  it('rejects File uploads for authorization_id instead of coercing to [object File]', async () => {
    const form = new FormData();
    form.set('authorization_id', new File(['evil'], 'evil.txt', { type: 'text/plain' }));
    form.set('decision', 'approve');

    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        body: form,
      }),
    );

    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('error')).toContain('Malformed');
    expect(getUser).not.toHaveBeenCalled();
    expect(approveAuthorization).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only authorization_id submissions', async () => {
    const form = new URLSearchParams({ authorization_id: '   ', decision: 'deny' });
    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }),
    );

    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('error')).toContain('Malformed');
    expect(getUser).not.toHaveBeenCalled();
    expect(denyAuthorization).not.toHaveBeenCalled();
  });

  it('denies OAuth authorization for authenticated users', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    denyAuthorization.mockResolvedValue({
      data: { redirect_url: 'https://client.example/cb?error=access_denied' },
      error: null,
    });
    const form = new URLSearchParams({ authorization_id: ' auth-456 ', decision: 'deny' });
    const res = await POST(
      new Request('https://utp.test/api/oauth/decision', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }),
    );

    expect(denyAuthorization).toHaveBeenCalledWith('auth-456');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://client.example/cb?error=access_denied');
  });
});
