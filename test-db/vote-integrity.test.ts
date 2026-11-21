import { describe, it, expect } from 'vitest';
import { sql, asUser, asAnon, makeUsers, makeBill, upsertVote } from './psql';

const CHOICES = ['for', 'against', 'unsure'] as const;
const pick = () => CHOICES[Math.floor(Math.random() * CHOICES.length)];

async function aggregate(billId: string) {
  const [row] = await sql(
    `SELECT count_for, count_against, count_unsure, total_votes FROM vote_aggregates WHERE bill_id = '${billId}';`,
  );
  if (!row) return null;
  const [f, a, u, t] = row.split('|').map(Number);
  return { for: f, against: a, unsure: u, total: t };
}

async function drift(): Promise<string[]> {
  return sql('SELECT * FROM verify_vote_aggregates();');
}

describe('shadow_votes row level security', () => {
  it("user B cannot select, update or delete user A's vote", async () => {
    const [a, b] = await makeUsers(2);
    const bill = await makeBill();
    await sql(asUser(a) + upsertVote(bill, 'for'));

    const seen = await sql(asUser(b) + `SELECT count(*) FROM shadow_votes WHERE bill_id = '${bill}';`);
    expect(seen).toEqual(['0']);

    const upd = await sql(
      asUser(b) + `WITH u AS (UPDATE shadow_votes SET vote = 'against' WHERE bill_id = '${bill}' RETURNING 1) SELECT count(*) FROM u;`,
    );
    expect(upd).toEqual(['0']);
    const del = await sql(
      asUser(b) + `WITH d AS (DELETE FROM shadow_votes WHERE bill_id = '${bill}' RETURNING 1) SELECT count(*) FROM d;`,
    );
    expect(del).toEqual(['0']);

    // B cannot insert a vote attributed to A either.
    await expect(
      sql(asUser(b) + `INSERT INTO shadow_votes(bill_id, user_id, vote) VALUES ('${bill}', '${a}', 'against');`),
    ).rejects.toThrow(/row-level security/);

    expect(await sql(`SELECT vote FROM shadow_votes WHERE bill_id = '${bill}';`)).toEqual(['for']);
  });

  it('a user can update and delete their own vote', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await sql(asUser(a) + upsertVote(bill, 'for'));
    expect(await sql(asUser(a) + `UPDATE shadow_votes SET vote='unsure' WHERE bill_id='${bill}' RETURNING vote;`)).toEqual([
      'unsure',
    ]);
    expect(await sql(asUser(a) + `DELETE FROM shadow_votes WHERE bill_id='${bill}' RETURNING vote;`)).toEqual(['unsure']);
  });

  it('anon cannot insert a vote', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await expect(
      sql(asAnon + `INSERT INTO shadow_votes(bill_id, user_id, vote) VALUES ('${bill}', '${a}', 'for');`),
    ).rejects.toThrow(/row-level security|permission denied/);
  });

  it('API roles cannot write vote_aggregates directly', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await sql(asUser(a) + upsertVote(bill, 'for'));
    await expect(
      sql(asUser(a) + `UPDATE vote_aggregates SET count_for = 999 WHERE bill_id = '${bill}';`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      sql(asAnon + `INSERT INTO vote_aggregates(bill_id, count_for) VALUES ('${bill}', 5);`),
    ).rejects.toThrow(/permission denied/);
    // Still publicly readable.
    expect(await sql(asAnon + `SELECT count_for FROM vote_aggregates WHERE bill_id = '${bill}';`)).toEqual(['1']);
  });
});

describe('vote aggregate integrity under concurrency', () => {
  it('50 concurrent upserts by one user on one bill leave exactly one row', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await Promise.all(Array.from({ length: 50 }, () => sql(asUser(a) + upsertVote(bill, pick()))));
    expect(await sql(`SELECT count(*) FROM shadow_votes WHERE bill_id = '${bill}';`)).toEqual(['1']);
    expect((await aggregate(bill))?.total).toBe(1);
    expect(await drift()).toEqual([]);
  });

  it('20 concurrent voters then 10 concurrent changes keep aggregates exact', async () => {
    const users = await makeUsers(20);
    const bill = await makeBill();
    await Promise.all(users.map((u) => sql(asUser(u) + upsertVote(bill, pick()))));
    await Promise.all(
      users.slice(0, 10).map((u) =>
        sql(asUser(u) + `UPDATE shadow_votes SET vote = '${pick()}' WHERE bill_id = '${bill}';`),
      ),
    );
    expect(await drift()).toEqual([]);
    const [rows] = await sql(`SELECT count(*) FROM shadow_votes WHERE bill_id = '${bill}';`);
    const agg = await aggregate(bill);
    expect(agg?.total).toBe(Number(rows));
    expect(agg?.total).toBe(20);
    expect(agg!.for + agg!.against + agg!.unsure).toBe(20);
  });

  it('changing a vote moves one count between buckets; deleting decrements', async () => {
    const [a, b] = await makeUsers(2);
    const bill = await makeBill();
    await sql(asUser(a) + upsertVote(bill, 'for'));
    await sql(asUser(b) + upsertVote(bill, 'for'));
    expect(await aggregate(bill)).toEqual({ for: 2, against: 0, unsure: 0, total: 2 });

    await sql(asUser(a) + upsertVote(bill, 'against'));
    expect(await aggregate(bill)).toEqual({ for: 1, against: 1, unsure: 0, total: 2 });

    await sql(asUser(b) + `DELETE FROM shadow_votes WHERE bill_id = '${bill}';`);
    expect(await aggregate(bill)).toEqual({ for: 0, against: 1, unsure: 0, total: 1 });
    expect(await drift()).toEqual([]);
  });

  it('verify_vote_aggregates reports a tampered aggregate', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await sql(asUser(a) + upsertVote(bill, 'for'));
    await sql(`UPDATE vote_aggregates SET count_for = 7 WHERE bill_id = '${bill}';`);
    const rows = await drift();
    expect(rows.some((r) => r.startsWith(bill))).toBe(true);
    // repair for subsequent tests
    await sql(`UPDATE vote_aggregates SET count_for = 1 WHERE bill_id = '${bill}';`);
  });
});
