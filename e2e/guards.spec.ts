import { expect, test } from '@playwright/test';

const BILL = '00000000-0000-4000-8000-000000000000';
const ADDR = '0x1111111111111111111111111111111111111111';

// Without a session every write is refused. 503 means the feature is not
// configured in this environment, which is also a refusal.
const REFUSED = [401, 503];

test('writes are refused without a session', async ({ request }) => {
  const calls: Array<[string, unknown]> = [
    ['/api/vote', { billId: BILL, vote: 'for' }],
    ['/api/propose', { title: 'x' }],
    ['/api/wallet/challenge', { address: ADDR }],
    ['/api/wallet/link', { message: 'm', signature: '0x00' }],
    ['/api/wallet/unlink', { message: 'm', signature: '0x00' }],
  ];
  for (const [path, data] of calls) {
    const res = await request.post(path, { data });
    expect(REFUSED, `${path} -> ${res.status()}`).toContain(res.status());
  }
});

test('ingest is refused without the cron secret', async ({ request }) => {
  expect(REFUSED).toContain((await request.post('/api/ingest')).status());
  expect(REFUSED).toContain((await request.get('/api/ingest', { headers: { authorization: 'Bearer wrong' } })).status());
});

test('public reads work without a session', async ({ request }) => {
  const proposals = await request.get('/api/propose');
  expect(proposals.status()).toBe(200);
  expect(Array.isArray((await proposals.json()).proposals)).toBe(true);

  const local = await request.get('/api/legislature?local=atlantis');
  expect((await local.json()).status).toBe('not_integrated');
});
