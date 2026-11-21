import { expect, test } from '@playwright/test';

test('home page loads with the main navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Uniting the People').first()).toBeVisible();
  for (const name of ['Bills', 'Propose', 'Governance']) {
    await expect(page.getByRole('link', { name, exact: true }).first()).toBeAttached();
  }
});

test('coverage lists places and opens a place with sourced legislation', async ({ page }) => {
  await page.goto('/coverage');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Local government coverage');
  expect(await page.locator('a[href^="/legislature?local="]').count()).toBeGreaterThanOrEqual(30);
  await page.getByRole('link', { name: 'San Francisco', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('San Francisco');
  await expect(page.locator('[data-status]')).toBeVisible();
});

test('a stored bill shows its source and lets a visitor start a vote', async ({ page }) => {
  await page.goto('/bills');
  const first = page.locator('a[href^="/bill/"]').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page).toHaveURL(/\/bill\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('link', { name: 'Read it at the source' })).toHaveAttribute('href', /^https:\/\//);
  const votes = page.locator('.vopt');
  await expect(votes).toHaveCount(3);
  for (const b of await votes.all()) await expect(b).toBeEnabled();
  // Signed out: choosing an option sends the visitor to sign in and back to this bill.
  await votes.first().click();
  await expect(page).toHaveURL(/\/login\?redirect=\/bill\/[0-9a-f-]{36}$/);
});

test('bills can be filtered to one place', async ({ page }) => {
  await page.goto('/bills');
  const places = page.getByRole('navigation', { name: 'Filter by place' }).getByRole('link');
  expect(await places.count()).toBeGreaterThanOrEqual(30);
  const place = places.nth(1);
  const name = (await place.innerText()).trim();
  await place.click();
  await expect(page).toHaveURL(/\/bills\?place=[0-9a-f-]{36}$/);
  const rows = page.locator('li', { has: page.locator('a[href^="/bill/"]') });
  await expect(rows.first()).toContainText(name);
  for (const row of await rows.all()) await expect(row).toContainText(name);
});

test('an unknown bill is a 404', async ({ page }) => {
  expect((await page.goto('/bill/00000000-0000-4000-8000-000000000000'))?.status()).toBe(404);
  expect((await page.goto('/bill/not-a-bill'))?.status()).toBe(404);
});

test('a bill page carries its title and source into the proposal form', async ({ page }) => {
  await page.goto('/bills');
  await page.locator('a[href^="/bill/"]').first().click();
  await expect(page).toHaveURL(/\/bill\/[0-9a-f-]{36}$/);
  const title = await page.getByRole('heading', { level: 1 }).innerText();
  await page.getByRole('link', { name: 'Propose action on this bill' }).click();
  await expect(page.getByLabel('Title')).toHaveValue(title);
  await expect(page.getByLabel('Source link')).toHaveValue(/^https:\/\//);
});

test('submitting a proposal while signed out goes to sign in', async ({ page }) => {
  await page.goto('/propose');
  await expect(page.getByRole('heading', { name: 'Open proposals' })).toBeVisible();
  await page.getByLabel('Title').fill('E2E signed-out proposal');
  await page.getByRole('button', { name: 'Submit proposal' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=\/propose$/);
});

test('account page asks a signed-out visitor to sign in', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?redirect=/account');
});

test('sign-in page offers Google', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
});

test('governance and federal legislature pages render', async ({ page }) => {
  for (const path of ['/governance', '/legislature', '/how-it-works']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  }
});
