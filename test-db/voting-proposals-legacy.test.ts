import { describe, it, expect, beforeAll } from 'vitest';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const BASE = process.env.TEST_DATABASE_URL!;
const DB = `legacy_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
const URL2 = BASE.replace(/\/[^/]*$/, `/${DB}`);
const ROOT = path.resolve(__dirname, '..');

function psql(url: string, text: string, file = false): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const args = [url, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-f', file ? text : '-'];
    const p = spawn('psql', args);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? resolve(out.split('\n').filter(Boolean)) : reject(new Error(err.trim() || `psql ${c}`))));
    if (!file) p.stdin.end(text);
  });
}
const q = (t: string) => psql(URL2, t);
const asUser = (id: string) =>
  `SET ROLE authenticated; SELECT set_config('request.jwt.claims', '{"sub":"${id}"}', false) \\g /dev/null\n`;

describe('voting_proposals migration over a legacy-shaped table', () => {
  let a: string;
  let b: string;
  beforeAll(async () => {
    await psql(BASE, `CREATE DATABASE ${DB};`);
    await psql(URL2, path.join(ROOT, 'supabase/test/auth-shim.sql'), true);
    [a, b] = [randomUUID(), randomUUID()];
    await q(`INSERT INTO auth.users(id) VALUES ('${a}'),('${b}');
      CREATE TABLE public.voting_proposals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text,
        source_url text NOT NULL,
        bias_score text, category text,
        status text,
        votes_for integer NOT NULL,
        votes_against integer NOT NULL,
        created_at timestamptz NOT NULL
      );
      INSERT INTO public.voting_proposals(title, source_url, votes_for, votes_against, created_at)
        VALUES ('old', '', 0, 0, now()), ('old2', '', 0, 0, now());
      ALTER TABLE public.voting_proposals ENABLE ROW LEVEL SECURITY;
      CREATE POLICY legacy_any_insert ON public.voting_proposals FOR INSERT WITH CHECK (true);
      CREATE POLICY legacy_any_select ON public.voting_proposals FOR SELECT USING (true);`);
    await psql(URL2, path.join(ROOT, 'supabase/migrations/20261104000300_voting_proposals.sql'), true);
    expect(readFileSync(path.join(ROOT, 'supabase/migrations/20261104000300_voting_proposals.sql'), 'utf8')).toContain('pg_policies');
  });

  it('removes the legacy permissive policies', async () => {
    const rows = await q(`SELECT policyname FROM pg_policies WHERE tablename='voting_proposals' ORDER BY 1;`);
    expect(rows.some((r) => r.startsWith('legacy_'))).toBe(false);
  });

  it('denies insert as another user', async () => {
    await expect(
      q(asUser(b) + `INSERT INTO voting_proposals(title, source_url, proposer_id) VALUES ('x','https://e.test/1','${a}');`),
    ).rejects.toThrow(/row-level security/);
  });

  it('allows a normal insert (defaults fill votes/created_at, NULL source_url ok)', async () => {
    await q(asUser(a) + `INSERT INTO voting_proposals(title, proposer_id) VALUES ('ok','${a}');`);
    await q(asUser(a) + `INSERT INTO voting_proposals(title, source_url, proposer_id) VALUES ('ok2','https://e.test/2','${a}');`);
    expect(await q(`SELECT count(*) FROM voting_proposals WHERE source_url = '';`)).toEqual(['0']);
  });
});
