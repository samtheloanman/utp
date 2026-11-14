import { describe, it, expect } from 'vitest';
import { POST } from './route';
import { sanitizePlainText } from './sanitize';

function makeRequest(body: unknown, raw?: string) {
  return new Request('https://utp.test/api/debate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ?? JSON.stringify(body),
  });
}

describe('POST /api/debate security & citation honesty', () => {
  it('rejects malformed JSON and empty payloads with 400', async () => {
    expect((await POST(makeRequest(null, '{not-json'))).status).toBe(400);
    expect((await POST(makeRequest({}))).status).toBe(400);
    expect((await POST(makeRequest({ question: 'x'.repeat(501) }))).status).toBe(400);
  });

  it('never reflects HTML/XSS payloads or fabricates citations for arbitrary questions', async () => {
    const xssPayload = `<img src=x onerror="alert('xss')"><script>fetch('https://evil.test')</script>`;
    const res = await POST(makeRequest({ question: xssPayload }));
    expect(res.status).toBe(200);
    const json = await res.json();
    const serialized = JSON.stringify(json);

    expect(json.status).toBe('offline');
    expect(json.isSample).toBe(true);
    expect(json.argsFor).toEqual([]);
    expect(json.argsAgainst).toEqual([]);
    expect(serialized).not.toContain('<script');
    expect(serialized).not.toContain('<img');
    expect(serialized).not.toContain('onerror');
    expect(serialized).not.toContain('<b>');
    expect(serialized).not.toContain('<i>');
    expect(serialized).not.toContain('Congressional Budget Office');
  });

  it('returns plain-text sample data marked status="sample" for known sample issues', async () => {
    const res = await POST(makeRequest({ issueId: 'natl-insulin', question: 'Cap insulin?' }));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.status).toBe('sample');
    expect(json.isSample).toBe(true);
    expect(json.tldr).not.toMatch(/[<>]/);
    expect(JSON.stringify(json)).not.toContain('Congressional Budget Office');
  });

  it('sanitizePlainText strips HTML tags and angle brackets', () => {
    expect(sanitizePlainText('<b>Generated</b> <i>"quote"</i> <script>x</script>')).toBe(
      'Generated "quote" x',
    );
  });
});
