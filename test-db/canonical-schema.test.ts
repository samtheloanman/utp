import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { sql, asUser, asAnon, makeUsers } from './psql';

const KEY = randomBytes(32).toString('hex');
const addr = () => '0x' + randomBytes(20).toString('hex');
const nonce = () => randomBytes(12).toString('hex');
const att = (uid: string, chain: number, address: string, n: string) =>
  createHmac('sha256', KEY).update(`${uid}|${chain}|${address}|${n}`).digest('hex');

beforeAll(async () => {
  await sql(`INSERT INTO private.wallet_link_settings(id, hmac_key) VALUES (1, '${KEY}')
    ON CONFLICT (id) DO UPDATE SET hmac_key = EXCLUDED.hmac_key;`);
});

describe('canonical modular schema & RLS baseline', () => {
  it('enables RLS on every public table and auto-enables RLS on newly created DDL tables', async () => {
    const unprotected = await sql(`
      SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind IN ('r', 'p')
         AND NOT c.relrowsecurity
       ORDER BY c.relname;
    `);
    expect(unprotected).toEqual([]);

    const ddlProbe = `ddl_rls_probe_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await sql(`CREATE TABLE public.${ddlProbe} (id uuid PRIMARY KEY DEFAULT gen_random_uuid());`);
    try {
      const [relrowsecurity] = await sql(`
        SELECT c.relrowsecurity::text
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = '${ddlProbe}';
      `);
      expect(relrowsecurity).toBe('true');
    } finally {
      await sql(`DROP TABLE IF EXISTS public.${ddlProbe};`);
    }
  });

  it('denies anon reads on poll_votes, civic_proposal_votes, shadow_votes, and wallet_links while keeping owner-only SELECT', async () => {
    const [alice, bob] = await makeUsers(2);
    const pollId = randomUUID();
    const pollOptionId = randomUUID();
    const proposalId = randomUUID();
    const proposalOptionId = randomUUID();
    const billId = randomUUID();
    const wallet = addr();
    const n = nonce();

    await sql(`
      INSERT INTO public.polls (id, topic, question) VALUES ('${pollId}', 'Fiscal', 'Balance federal budget?');
      INSERT INTO public.poll_options (id, poll_id, option_text) VALUES ('${pollOptionId}', '${pollId}', 'Yes');
      INSERT INTO public.civic_proposals (id, kind, proposer_id, title, category)
        VALUES ('${proposalId}', 'community_proposal', '${alice}', 'Require open municipal contract ledger', 'Transparency');
      INSERT INTO public.civic_proposal_options (id, proposal_id, option_key, option_text)
        VALUES ('${proposalOptionId}', '${proposalId}', 'for', 'Support');
      INSERT INTO public.bills (id, external_id, bill_number, title, source_url)
        VALUES ('${billId}', '${billId}', 'HR-9001', 'Taxpayer Receipt Act', 'https://congress.gov/bill/hr9001');
    `);

    await sql(
      asUser(alice) +
        `INSERT INTO public.poll_votes (poll_id, option_id, user_id) VALUES ('${pollId}', '${pollOptionId}', auth.uid());
         INSERT INTO public.civic_proposal_votes (proposal_id, option_id, user_id) VALUES ('${proposalId}', '${proposalOptionId}', auth.uid());
         INSERT INTO public.shadow_votes (bill_id, user_id, vote) VALUES ('${billId}', auth.uid(), 'for');
         SELECT public.create_wallet_challenge('${n}', 31, '${wallet}', 'utp.test') \\g /dev/null
         SELECT public.link_wallet('${n}', '${att(alice, 31, wallet, n)}', 'aal1') \\g /dev/null`,
    );

    for (const privateTable of ['poll_votes', 'civic_proposal_votes', 'shadow_votes', 'wallet_links']) {
      await expect(sql(asAnon + `SELECT count(*) FROM public.${privateTable};`)).rejects.toThrow(
        /permission denied/,
      );
    }

    // Bob cannot see Alice's private ballots or wallet links
    expect(await sql(asUser(bob) + `SELECT count(*) FROM public.poll_votes WHERE poll_id = '${pollId}';`)).toEqual(['0']);
    expect(
      await sql(asUser(bob) + `SELECT count(*) FROM public.civic_proposal_votes WHERE proposal_id = '${proposalId}';`),
    ).toEqual(['0']);
    expect(await sql(asUser(bob) + `SELECT count(*) FROM public.shadow_votes WHERE bill_id = '${billId}';`)).toEqual([
      '0',
    ]);
    expect(await sql(asUser(bob) + `SELECT count(*) FROM public.wallet_links WHERE address = '${wallet}';`)).toEqual([
      '0',
    ]);

    // Alice sees her own ballots & link; public aggregate option count updates atomically
    expect(await sql(asUser(alice) + `SELECT count(*) FROM public.poll_votes WHERE poll_id = '${pollId}';`)).toEqual([
      '1',
    ]);
    expect(
      await sql(asUser(alice) + `SELECT count(*) FROM public.civic_proposal_votes WHERE proposal_id = '${proposalId}';`),
    ).toEqual(['1']);
    expect(
      await sql(asAnon + `SELECT vote_count FROM public.civic_proposal_options WHERE id = '${proposalOptionId}';`),
    ).toEqual(['1']);
  });

  it('allows wallet_links on newly registered active chain 99931 while rejecting unseeded 99999 and inactive chains', async () => {
    const [alice] = await makeUsers(1);
    const alphaWallet = addr();
    const alphaNonce = nonce();

    await sql(`
      INSERT INTO public.chain_networks (chain_id, slug, network_kind, is_active)
      VALUES
        (99931, 'utp-alpha', 'utp_alpha_l2', true),
        (99932, 'utp-alpha-paused', 'utp_alpha_l2', false)
      ON CONFLICT (chain_id) DO UPDATE SET is_active = EXCLUDED.is_active;
    `);

    const [linkResult] = await sql(
      asUser(alice) +
        `SELECT public.create_wallet_challenge('${alphaNonce}', 99931, '${alphaWallet}', 'utp.test') \\g /dev/null
         SELECT public.link_wallet('${alphaNonce}', '${att(alice, 99931, alphaWallet, alphaNonce)}', 'aal1');`,
    );
    expect(linkResult).toBe('ok');

    expect(
      await sql(
        asUser(alice) +
          `SELECT chain_id FROM public.wallet_links WHERE address = '${alphaWallet}' AND status = 'active';`,
      ),
    ).toEqual(['99931']);

    // Unseeded chain 99999 rejects both challenge creation and direct insert
    await expect(
      sql(asUser(alice) + `SELECT public.create_wallet_challenge('${nonce()}', 99999, '${addr()}', 'utp.test');`),
    ).rejects.toThrow(/unsupported or inactive chain|not registered/);

    await expect(
      sql(
        `INSERT INTO public.wallet_links (user_id, chain_id, address, assurance) VALUES ('${alice}', 99999, '${addr()}', 'aal1');`,
      ),
    ).rejects.toThrow(/not registered or not active|foreign key/);

    // Registered but inactive chain 99932 also rejects challenge creation
    await expect(
      sql(asUser(alice) + `SELECT public.create_wallet_challenge('${nonce()}', 99932, '${addr()}', 'utp.test');`),
    ).rejects.toThrow(/unsupported or inactive chain|not active/);
  });

  it('indexes legislative text via bills.search_tsv GIN column for full-text search', async () => {
    const matchingBill = randomUUID();
    const otherBill = randomUUID();
    const uniqueToken = `procurementledger${randomBytes(4).toString('hex')}`;

    await sql(`
      INSERT INTO public.bills (id, external_id, session, bill_number, chamber, title, summary_official, source_url)
      VALUES
        ('${matchingBill}', '${matchingBill}', '119', 'S. 4020', 'upper',
         'Federal Procurement Sunshine Act',
         'Mandates machine-readable taxpayer disclosures for ${uniqueToken} contracts.',
         'https://congress.gov/bill/119/s4020'),
        ('${otherBill}', '${otherBill}', '119', 'H.R. 109', 'lower',
         'Post Office Designation Act',
         'Renames a regional postal facility in Springfield.',
         'https://congress.gov/bill/119/hr109');
    `);

    const matches = await sql(
      asAnon +
        `SELECT id FROM public.bills WHERE search_tsv @@ plainto_tsquery('english', 'procurement taxpayer ${uniqueToken}');`,
    );
    expect(matches).toEqual([matchingBill]);
  });

  it('has a covering index on every public foreign key constraint (Supabase perf advisor)', async () => {
    const unindexed = await sql(`
      SELECT con.conrelid::regclass::text || '.' || con.conname AS unindexed_fk
        FROM pg_constraint con
        JOIN pg_namespace n ON n.oid = con.connamespace
       WHERE n.nspname = 'public'
         AND con.contype = 'f'
         AND NOT EXISTS (
           SELECT 1
             FROM pg_index i
            WHERE i.indrelid = con.conrelid
              AND i.indisvalid
              AND i.indisready
              AND i.indpred IS NULL
              AND i.indnkeyatts >= array_length(con.conkey, 1)
              AND (i.indkey::int2[])[0 : array_length(con.conkey, 1) - 1] = con.conkey
         )
       ORDER BY 1;
    `);
    expect(unindexed).toEqual([]);
  });
});
