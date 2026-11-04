import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql, asUser, asAnon, makeUsers } from './psql';

const insertAs = (uid: string, url: string | null) =>
  `INSERT INTO voting_proposals(title, source_url, proposer_id) VALUES ('T', ${url ? `'${url}'` : 'NULL'}, '${uid}');`;

describe('voting_proposals row level security', () => {
  it('anon can select', async () => {
    const [a] = await makeUsers(1);
    const url = `https://example.test/${randomUUID()}`;
    await sql(asUser(a) + insertAs(a, url));
    expect(await sql(asAnon + `SELECT count(*) FROM voting_proposals WHERE source_url = '${url}';`)).toEqual(['1']);
  });

  it('anon cannot insert', async () => {
    const [a] = await makeUsers(1);
    await expect(sql(asAnon + insertAs(a, `https://example.test/${randomUUID()}`))).rejects.toThrow(
      /row-level security|permission denied/,
    );
  });

  it('authenticated user can insert with proposer_id = own uid', async () => {
    const [a] = await makeUsers(1);
    const url = `https://example.test/${randomUUID()}`;
    await sql(asUser(a) + insertAs(a, url));
    expect(await sql(`SELECT proposer_id FROM voting_proposals WHERE source_url = '${url}';`)).toEqual([a]);
  });

  it('authenticated user cannot insert as another user', async () => {
    const [a, b] = await makeUsers(2);
    await expect(sql(asUser(b) + insertAs(a, `https://example.test/${randomUUID()}`))).rejects.toThrow(
      /row-level security/,
    );
  });

  it('duplicate source_url is rejected', async () => {
    const [a, b] = await makeUsers(2);
    const url = `https://example.test/${randomUUID()}`;
    await sql(asUser(a) + insertAs(a, url));
    await expect(sql(asUser(b) + insertAs(b, url))).rejects.toThrow(/duplicate key|unique/);
  });

  it('users cannot update or delete proposals', async () => {
    const [a] = await makeUsers(1);
    const url = `https://example.test/${randomUUID()}`;
    await sql(asUser(a) + insertAs(a, url));
    await expect(sql(asUser(a) + `UPDATE voting_proposals SET title='x' WHERE source_url='${url}';`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(sql(asUser(a) + `DELETE FROM voting_proposals WHERE source_url='${url}';`)).rejects.toThrow(
      /permission denied/,
    );
  });
});
