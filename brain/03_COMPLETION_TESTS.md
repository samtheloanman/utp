# V1 Completion Tests

## Purpose
This document defines **measurable tests** that must pass before V1 can launch. Think of this as the "Definition of Done" checklist.

---

## Test Categories

### 1. Core User Flows (E2E Tests - Playwright)

#### Test 1.1: Browse Bills
```typescript
test('User can view recent bills', async ({ page }) => {
  await page.goto('/');
  
  // Should see activity stream
  const billList = page.locator('[data-testid="bill-list"]');
  await expect(billList).toBeVisible();
  
  // Should have at least 10 bills
  const billCards = billList.locator('[data-testid="bill-card"]');
  await expect(billCards).toHaveCount(10, { timeout: 5000 });
  
  // Each bill should have title, number, and date
  const firstBill = billCards.first();
  await expect(firstBill.locator('h3')).toContainText(/H\.R\.|S\./);
  await expect(firstBill.locator('[data-testid="bill-date"]')).toBeVisible();
});
```

#### Test 1.2: View Bill Detail
```typescript
test('User can view bill detail with summary', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="bill-card"]').first().click();
  
  // Should navigate to bill detail page
  await expect(page).toHaveURL(/\/bills\/.+/);
  
  // Should see AI summary section
  const summary = page.locator('[data-testid="ai-summary"]');
  await expect(summary).toBeVisible();
  
  // Summary MUST have citations
  const citations = summary.locator('[data-testid="citation"]');
  await expect(citations).toHaveCount(2, { minimum: true });
  
  // Should see source link
  const sourceLink = page.locator('[data-testid="source-link"]');
  await expect(sourceLink).toHaveAttribute('href', /congress\.gov/);
});
```

#### Test 1.3: Cast Shadow Vote (Anonymous)
```typescript
test('Anonymous user can cast vote', async ({ page }) => {
  await page.goto('/bills/hr-1234-118');
  
  // Click "For" button
  await page.locator('[data-testid="vote-for"]').click();
  
  // Should see confirmation
  await expect(page.locator('[data-testid="vote-success"]')).toBeVisible();
  
  // Aggregate should update
  const forCount = page.locator('[data-testid="count-for"]');
  const initialCount = parseInt(await forCount.textContent());
  await expect(forCount).toContainText(`${initialCount + 1}`);
});
```

#### Test 1.4: Cast Shadow Vote (Authenticated)
```typescript
test('Authenticated user can vote and see their vote', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'test123');
  await page.click('button[type="submit"]');
  
  // Navigate to bill
  await page.goto('/bills/hr-1234-118');
  
  // Cast vote
  await page.locator('[data-testid="vote-against"]').click();
  
  // Should persist after refresh
  await page.reload();
  await expect(page.locator('[data-testid="vote-against"]')).toHaveClass(/selected/);
});
```

---

### 2. API Integration Tests

#### Test 2.1: Congress.gov Connector Works
```typescript
test('Fetch bills from Congress.gov API', async () => {
  const connector = new CongressGovConnector(API_KEY);
  const bills = await connector.fetchRecentBills({ limit: 10 });
  
  expect(bills).toHaveLength(10);
  expect(bills[0]).toMatchObject({
    external_id: expect.stringMatching(/^[hs]r-\d+-\d+$/),
    title: expect.any(String),
    status: expect.any(String),
    source_url: expect.stringMatching(/congress\.gov/),
  });
  
  // Verify idempotency
  const bills2 = await connector.fetchRecentBills({ limit: 10 });
  expect(bills2[0].external_id).toBe(bills[0].external_id);
});
```

#### Test 2.2: Public Read API Works
```typescript
test('GET /api/v1/bills returns paginated results', async () => {
  const response = await fetch('https://utp.vercel.app/api/v1/bills?limit=5');
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data.bills).toHaveLength(5);
  expect(data).toHaveProperty('pagination.next');
  
  // Verify schema
  expect(data.bills[0]).toMatchObject({
    id: expect.any(String),
    bill_number: expect.any(String),
    title: expect.any(String),
    summary_ai: expect.any(String),
    vote_counts: {
      for: expect.any(Number),
      against: expect.any(Number),
      unsure: expect.any(Number),
    },
  });
});
```

---

### 3. AI Quality Tests

#### Test 3.1: Summary Contains Citations
```typescript
test('AI summary includes at least 2 citations', async () => {
  const billText = `
    H.R. 1234: Climate Action Now Act
    
    Section 3(a): This bill requires all federal agencies to reduce 
    carbon emissions by 50% by 2030.
    
    Section 5(b): Establishes a $100 billion Green Infrastructure Fund.
  `;
  
  const summary = await generateSummary(billText);
  
  expect(summary.citations).toHaveLength(2, { minimum: true });
  expect(summary.tldr).toBeTruthy();
  expect(summary.confidence).toBeGreaterThan(0.7);
  
  // Each citation should reference a section
  expect(summary.citations[0]).toMatch(/Section \d+\([a-z]\)/);
});
```

#### Test 3.2: Grounding Test Fails Safely
```typescript
test('Summary fails gracefully with insufficient data', async () => {
  const insufficientText = ""; // Empty text
  
  const result = await generateSummary(insufficientText);
  
  expect(result).toMatchObject({
    error: 'INSUFFICIENT_SOURCE_TEXT',
    confidence: 0,
  });
});
```

#### Test 3.3: No Political Bias
```typescript
test('Summary maintains neutral tone', async () => {
  const controversialBillText = `...`; // Insert sample text
  
  const summary = await generateSummary(controversialBillText);
  
  // Check for opinion words
  const opinionWords = ['should', 'must', 'terrible', 'great', 'wonderful', 'awful'];
  const summaryText = `${summary.tldr} ${summary.key_changes.join(' ')}`;
  
  opinionWords.forEach(word => {
    expect(summaryText.toLowerCase()).not.toContain(word);
  });
});
```

---

### 4. Performance Benchmarks

#### Test 4.1: Page Load Time
```typescript
test('Homepage loads in under 2 seconds', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.locator('[data-testid="bill-list"]').waitFor();
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(2000); // 2 seconds
});
```

#### Test 4.2: API Response Time
```typescript
test('API responds in under 500ms', async () => {
  const startTime = Date.now();
  const response = await fetch('/api/v1/bills?limit=10');
  const responseTime = Date.now() - startTime;
  
  expect(response.status).toBe(200);
  expect(responseTime).toBeLessThan(500); // 500ms
});
```

---

### 5. Security Tests

#### Test 5.1: IP Hashing Works
```typescript
test('IPs are hashed, not stored raw', async () => {
  const testIP = '192.168.1.1';
  const hashed = hashIP(testIP);
  
  expect(hashed).not.toBe(testIP);
  expect(hashed).toHaveLength(16); // Truncated SHA-256
  
  // Verify in database
const vote = await db.shadow_votes.findOne({ where: { ip_hash: hashed } });
  expect(vote.ip_hash).toBe(hashed);
  expect(vote).not.toHaveProperty('ip'); // Raw IP should NOT exist
});
```

#### Test 5.2: Rate Limiting Works
```typescript
test('Voting is rate limited', async ({ page }) => {
  await page.goto('/bills/hr-1234-118');
  
  // Cast vote
  await page.locator('[data-testid="vote-for"]').click();
  await expect(page.locator('[data-testid="vote-success"]')).toBeVisible();
  
  // Try to vote again immediately
  await page.reload();
  await page.locator('[data-testid="vote-against"]').click();
  
  // Should see rate limit error
  await expect(page.locator('[data-testid="rate-limit"]')).toBeVisible();
});
```

---

## Acceptance Criteria (Launch Checklist)

V1 is **READY TO SHIP** when all of these pass:

### Functionality
- [ ] All E2E tests pass (1.1 - 1.4)
- [ ] API integration tests pass (2.1 - 2.2)
- [ ] AI quality tests pass (3.1 - 3.3)

### Performance
- [ ] Homepage loads < 2 seconds
- [ ] API responds < 500ms

### Security
- [ ] IPs are hashed, not stored raw
- [ ] Rate limiting prevents abuse

### Content
- [ ] At least 100 bills ingested
- [ ] At least 80% of bills have AI summaries
- [ ] All summaries have ≥2 citations OR marked as "INSUFFICIENT_DATA"

### Legal
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] AI disclaimer on every summary
- [ ] Source attribution on every page

### User Experience
- [ ] Mobile responsive (test on iOS Safari + Android Chrome)
- [ ] Accessible (WCAG 2.1 AA level)
- [ ] No console errors in production

---

## How to Run Tests

```bash
# E2E tests
npm run test:e2e

# API integration tests
npm run test:integration

# AI quality tests
npm run test:ai

# Performance benchmarks
npm run test:perf

# Run all tests
npm run test:all
```

---

## Success Metric

**V1 Launch Goal**: 10,000 shadow votes in first 30 days

Track this metric in `/brain/metrics.md` weekly.
