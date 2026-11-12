import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const URL = process.env.TEST_DATABASE_URL;

/** Run SQL in a fresh psql process (one connection). Resolves stdout rows. */
export function sql(text: string): Promise<string[]> {
  if (!URL) throw new Error('TEST_DATABASE_URL is not set; run via `npm run test:db`');
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [URL, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-f', '-']);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve(out.split('\n').filter((l) => l.length > 0));
      else reject(new Error(err.trim() || `psql exited ${code}`));
    });
    p.stdin.end(text);
  });
}

/** SQL prefix that makes the session act as an authenticated Supabase user. */
export function asUser(userId: string): string {
  return `SET ROLE authenticated; SELECT set_config('request.jwt.claims', '{"sub":"${userId}"}', false) \\g /dev/null\n`;
}

export const asAnon = `SET ROLE anon; SELECT set_config('request.jwt.claims', '{}', false) \\g /dev/null\n`;

export async function makeUsers(n: number): Promise<string[]> {
  const ids = Array.from({ length: n }, () => randomUUID());
  await sql(`INSERT INTO auth.users(id) VALUES ${ids.map((i) => `('${i}')`).join(',')};`);
  return ids;
}

export async function makeBill(): Promise<string> {
  const id = randomUUID();
  await sql(
    `INSERT INTO bills(id, external_id, bill_number, title, source_url) VALUES ('${id}', '${id}', 'HB-1', 'Test bill', 'https://example.test');`,
  );
  return id;
}

export function upsertVote(billId: string, vote: string): string {
  return `INSERT INTO shadow_votes(bill_id, user_id, vote) VALUES ('${billId}', auth.uid(), '${vote}')
ON CONFLICT (bill_id, user_id) DO UPDATE SET vote = EXCLUDED.vote;\n`;
}
