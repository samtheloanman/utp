import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql, asUser, asAnon, makeUsers } from './psql';

const DENIED = /permission denied/;

describe('security hotfix: API-role grants and draft visibility', () => {
  it('grants TRUNCATE on no public table to anon or authenticated (TRUNCATE ignores RLS)', async () => {
    const granted = await sql(`
      SELECT grantee || ':' || table_name FROM information_schema.role_table_grants
       WHERE table_schema = 'public' AND privilege_type = 'TRUNCATE' AND grantee IN ('anon', 'authenticated')
       ORDER BY 1;`);
    expect(granted).toEqual([]);
    const [u] = await makeUsers(1);
    for (const t of ['vote_events', 'vote_voter_links', 'user_profiles', 'bills']) {
      await expect(sql(asUser(u) + `TRUNCATE public.${t} CASCADE;`)).rejects.toThrow(DENIED);
    }
  });

  it('lets a user rename their own profile and nothing else', async () => {
    const [u] = await makeUsers(1);
    expect(await sql(asUser(u) + `UPDATE public.user_profiles SET username = 'second' RETURNING username;`)).toEqual(['second']);
    await expect(sql(asUser(u) + `UPDATE public.user_profiles SET created_at = now() - interval '9 years';`)).rejects.toThrow(DENIED);
    await expect(sql(asUser(u) + `UPDATE public.user_profiles SET id = gen_random_uuid();`)).rejects.toThrow(DENIED);
    await expect(sql(asUser(u) + `DELETE FROM public.user_profiles;`)).rejects.toThrow(DENIED);
  });

  it('gives API roles no write privilege on a table created afterwards', async () => {
    const t = `grant_probe_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await sql(`CREATE TABLE public.${t} (id uuid PRIMARY KEY DEFAULT gen_random_uuid());`);
    // MAINTAIN (LOCK, VACUUM, REINDEX) exists from PostgreSQL 17.
    const maintain = Number((await sql(`SHOW server_version_num;`))[0]) >= 170000 ? `, 'MAINTAIN'` : '';
    try {
      const held = await sql(`
        SELECT r || ':' || p FROM unnest(ARRAY['anon', 'authenticated']) r,
               unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'${maintain}]) p
         WHERE has_table_privilege(r, 'public.${t}', p) ORDER BY 1;`);
      expect(held).toEqual([]);
    } finally {
      await sql(`DROP TABLE IF EXISTS public.${t};`);
    }
  });

  it('hides a draft proposal from everyone but its proposer', async () => {
    const [author, other] = await makeUsers(2);
    const draft = randomUUID();
    const live = randomUUID();
    await sql(`
      INSERT INTO public.civic_proposals (id, proposer_id, title, status) VALUES
        ('${draft}', '${author}', 'Draft: unreviewed AI poll', 'draft'),
        ('${live}', '${author}', 'Open the budget books', 'active');`);
    const seen = (who: string) => sql(who + `SELECT status FROM public.civic_proposals WHERE id IN ('${draft}', '${live}') ORDER BY status;`);
    expect(await seen(asAnon)).toEqual(['active']);
    expect(await seen(asUser(other))).toEqual(['active']);
    expect(await seen(asUser(author))).toEqual(['active', 'draft']);
  });
});
