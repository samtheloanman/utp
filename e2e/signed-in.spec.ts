import { expect, test } from '@playwright/test';

// Needs a real test account: E2E_EMAIL / E2E_PASSWORD (Supabase email sign-in)
// plus the public Supabase URL and key. Skipped when they are not set.
const { E2E_EMAIL, E2E_PASSWORD, NEXT_PUBLIC_SUPABASE_URL: SB_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: SB_KEY } = process.env;

test.describe('signed-in flows', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD || !SB_URL || !SB_KEY, 'no test account configured');
  let token = '';
  let session: Record<string, unknown> = {};

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${SB_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: SB_KEY! },
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    });
    expect(res.status(), 'test account sign-in').toBe(200);
    session = await res.json();
    token = session.access_token as string;
  });

  test('a signed-in user can vote, change the vote, and see it counted', async ({ page, request }) => {
    await page.goto('/bills');
    const href = await page.locator('a[href^="/bill/"]').first().getAttribute('href');
    const billId = href!.split('/').pop()!;
    for (const vote of ['for', 'against']) {
      const res = await request.post('/api/vote', { headers: { authorization: `Bearer ${token}` }, data: { billId, vote } });
      expect(res.status(), `vote ${vote}`).toBe(200);
    }
    await page.goto(href!);
    await expect(page.getByText(/[1-9]\d* votes? so far/)).toBeVisible();
  });

  test('a signed-in user can submit a proposal and it is listed', async ({ page, request }) => {
    const title = `E2E proposal ${Date.now()}`;
    const res = await request.post('/api/propose', { headers: { authorization: `Bearer ${token}` }, data: { title, description: 'Automated check' } });
    expect(res.status()).toBe(201);
    await page.goto('/propose');
    await expect(page.getByText(title)).toBeVisible();
  });

  test('the account page recognises the session', async ({ page, baseURL }) => {
    const ref = new URL(SB_URL!).hostname.split('.')[0];
    const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
    await page.context().addCookies([{ name: `sb-${ref}-auth-token`, value, url: baseURL! }]);
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Linked wallets' })).toBeVisible();
  });
});
