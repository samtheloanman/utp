import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql, asUser, asAnon, makeUsers, makeBill, upsertVote } from './psql';

const vote = async (uid: string, bill: string, choice: string, cohort?: string) =>
  JSON.parse((await sql(asUser(uid) + `SELECT public.cast_bill_vote('${bill}', '${choice}'${cohort ? `, '${cohort}'` : ''});`))[0]);
const ballotOf = async (bill: string) =>
  (await sql(`SELECT id FROM public.civic_proposals WHERE kind = 'bill_sentiment' AND bill_id = '${bill}';`))[0];
const tally = (bill: string) =>
  sql(`SELECT o.option_key || '=' || o.vote_count FROM public.civic_proposal_options o
        JOIN public.civic_proposals p ON p.id = o.proposal_id WHERE p.bill_id = '${bill}' ORDER BY o.sort_order;`);
const cohortTally = (ballot: string) =>
  sql(`SELECT o.option_key || '/' || c.cohort || '=' || c.vote_count FROM public.civic_proposal_option_cohorts c
        JOIN public.civic_proposal_options o ON o.id = c.option_id WHERE c.proposal_id = '${ballot}' ORDER BY o.sort_order, c.cohort;`);
const events = (ballot: string) =>
  sql(`SELECT event_kind FROM public.vote_events WHERE ballot_id = '${ballot}' ORDER BY seq;`);
const verified = async (ballot: string) =>
  (await sql(`SELECT public.verify_ballot_chain('${ballot}')::text || '/' || public.verify_tallies('${ballot}')::text;`))[0];

describe('vote ledger', () => {
  it('opens a bill ballot on the first vote and returns a receipt that chains from zero', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    const receipt = await vote(a, bill, 'for');
    expect(receipt).toMatchObject({ event_kind: 'cast', changed: true, prev_hash: '00'.repeat(32) });
    expect(receipt.row_hash).toMatch(/^[0-9a-f]{64}$/);
    const ballot = await ballotOf(bill);
    expect(await tally(bill)).toEqual(['for=1', 'against=0', 'unsure=0']);
    expect(await sql(`SELECT encode(head_hash, 'hex') FROM public.civic_proposals WHERE id = '${ballot}';`)).toEqual([receipt.row_hash]);
    expect(await verified(ballot)).toBe('true/true');
    expect(await sql(asUser(a) + `SELECT public.my_bill_vote('${bill}');`)).toEqual(['for']);
  });

  it('appends a superseding event when a vote changes, and nothing when it is repeated', async () => {
    const [a, b] = await makeUsers(2);
    const bill = await makeBill();
    const first = await vote(a, bill, 'for');
    await vote(b, bill, 'for');
    const changed = await vote(a, bill, 'against');
    expect(changed).toMatchObject({ event_kind: 'supersede', changed: true });
    const repeat = await vote(a, bill, 'against');
    expect(repeat).toMatchObject({ changed: false, row_hash: changed.row_hash });
    const ballot = await ballotOf(bill);
    expect(await events(ballot)).toEqual(['cast', 'cast', 'supersede']);
    expect(await tally(bill)).toEqual(['for=1', 'against=1', 'unsure=0']);
    expect(await verified(ballot)).toBe('true/true');
    expect(first.row_hash).not.toBe(changed.row_hash);
  });

  it('refuses a changed vote when the ballot locks votes, and any vote when it is not open', async () => {
    const [a, b] = await makeUsers(2);
    const bill = await makeBill();
    await vote(a, bill, 'for');
    const ballot = await ballotOf(bill);
    await sql(`UPDATE public.civic_proposals SET vote_change_allowed = false WHERE id = '${ballot}';`);
    await expect(vote(a, bill, 'against')).rejects.toThrow(/does not allow changing/);
    for (const close of [`opens_at = now() - interval '2 seconds', closes_at = now() - interval '1 second'`, `closes_at = NULL, status = 'closed'`, `status = 'active', opens_at = now() + interval '1 day'`]) {
      await sql(`UPDATE public.civic_proposals SET ${close} WHERE id = '${ballot}';`);
      await expect(vote(b, bill, 'for')).rejects.toThrow(/not open/);
    }
    expect(await tally(bill)).toEqual(['for=1', 'against=0', 'unsure=0']);
  });

  it('rejects a signed-out caller, an unknown bill and an unknown choice', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await expect(sql(asAnon + `SELECT public.cast_bill_vote('${bill}', 'for');`)).rejects.toThrow(/permission denied/);
    await expect(vote(a, randomUUID(), 'for')).rejects.toThrow(/unknown bill/);
    await expect(vote(a, bill, 'maybe')).rejects.toThrow(/for, against or unsure/);
  });

  it('lets no role rewrite, remove or truncate an event', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await vote(a, bill, 'for');
    const ballot = await ballotOf(bill);
    for (const stmt of [
      `INSERT INTO public.vote_events (ballot_id, option_id, voter_commitment, event_kind, prev_hash, row_hash) SELECT ballot_id, option_id, voter_commitment, 'cast', row_hash, row_hash FROM public.vote_events LIMIT 1;`,
      `UPDATE public.vote_events SET event_kind = 'cast';`,
      `DELETE FROM public.vote_events;`,
    ]) {
      await expect(sql(asUser(a) + stmt)).rejects.toThrow(/permission denied/);
    }
    for (const role of ['service_role', 'postgres']) {
      const as = role === 'postgres' ? '' : `SET ROLE ${role};\n`;
      await expect(sql(as + `UPDATE public.vote_events SET event_kind = 'cast' WHERE ballot_id = '${ballot}';`)).rejects.toThrow(/append-only/);
      await expect(sql(as + `DELETE FROM public.vote_events WHERE ballot_id = '${ballot}';`)).rejects.toThrow(/append-only/);
      await expect(sql(as + `TRUNCATE public.vote_events CASCADE;`)).rejects.toThrow(/append-only/);
    }
    expect(await events(ballot)).toEqual(['cast']);
  });

  it('detects a forged event and a forged tally', async () => {
    const [a, b] = await makeUsers(2);
    const bill = await makeBill();
    await vote(a, bill, 'for');
    await vote(b, bill, 'against');
    const ballot = await ballotOf(bill);
    expect(await verified(ballot)).toBe('true/true');
    // Only an owner who first disables the guard can do this; verification still catches it.
    await sql(`ALTER TABLE public.vote_events DISABLE TRIGGER vote_events_append_only;
      UPDATE public.vote_events e SET option_id = o.id FROM public.civic_proposal_options o
       WHERE e.ballot_id = '${ballot}' AND o.proposal_id = e.ballot_id AND o.option_key = 'for' AND e.event_kind = 'cast';
      ALTER TABLE public.vote_events ENABLE TRIGGER vote_events_append_only;`);
    expect(await verified(ballot)).toBe('false/false');
  });

  it('keeps one unforked chain and an exact tally under concurrent voting', async () => {
    const users = await makeUsers(24);
    const bill = await makeBill();
    await vote(users[0], bill, 'for');
    const picks = ['for', 'against', 'unsure'];
    await Promise.all(users.slice(1).map((u, i) => sql(asUser(u) + upsertVote(bill, picks[i % 3]))));
    await Promise.all(users.slice(0, 12).map((u) => sql(asUser(u) + upsertVote(bill, 'unsure'))));
    const ballot = await ballotOf(bill);
    expect(await verified(ballot)).toBe('true/true');
    const counts = Object.fromEntries((await tally(bill)).map((r) => r.split('=')));
    expect(Number(counts.for) + Number(counts.against) + Number(counts.unsure)).toBe(24);
    expect(await sql(`SELECT count(DISTINCT prev_hash) = count(*) FROM public.vote_events WHERE ballot_id = '${ballot}';`)).toEqual(['t']);
  });

  it('stores no user id in the ledger and gives one voter a different commitment per ballot', async () => {
    const [a] = await makeUsers(1);
    const [b1, b2] = [await makeBill(), await makeBill()];
    await vote(a, b1, 'for');
    await vote(a, b2, 'for');
    expect(await sql(`SELECT count(*) FROM information_schema.columns WHERE table_name = 'vote_events' AND column_name = 'user_id';`)).toEqual(['0']);
    expect(await sql(`SELECT count(DISTINCT voter_commitment) FROM public.vote_events WHERE ballot_id IN ('${await ballotOf(b1)}', '${await ballotOf(b2)}');`)).toEqual(['2']);
    await expect(sql(asUser(a) + `SELECT vote_hmac_key FROM private.ledger_settings;`)).rejects.toThrow(/permission denied/);
  });

  it('deleting an account removes its vote links and leaves the ledger and tally valid', async () => {
    const [a, b] = await makeUsers(2);
    const bill = await makeBill();
    await vote(a, bill, 'for');
    await vote(b, bill, 'against');
    const ballot = await ballotOf(bill);
    await sql(`DELETE FROM auth.users WHERE id = '${a}';`);
    expect(await sql(`SELECT count(*) FROM public.vote_voter_links WHERE ballot_id = '${ballot}';`)).toEqual(['1']);
    expect(await events(ballot)).toEqual(['cast', 'cast']);
    expect(await tally(bill)).toEqual(['for=1', 'against=1', 'unsure=0']);
    expect(await verified(ballot)).toBe('true/true');
  });

  it('creates a lowest-level profile for every new account, and lets no API role insert one', async () => {
    const [a] = await makeUsers(1);
    expect(await sql(`SELECT identity_level FROM public.user_profiles WHERE id = '${a}';`)).toEqual(['1']);
    await sql(`DELETE FROM public.user_profiles WHERE id = '${a}';`);
    await expect(sql(asUser(a) + `INSERT INTO public.user_profiles (id, identity_level) VALUES ('${a}', 3);`)).rejects.toThrow(/permission denied/);
    await expect(sql(asUser(a) + `INSERT INTO public.user_profiles (id) VALUES ('${a}');`)).rejects.toThrow(/permission denied/);
    await sql(`INSERT INTO public.user_profiles (id) VALUES ('${a}');`);
    await expect(sql(asUser(a) + `UPDATE public.user_profiles SET identity_level = 3;`)).rejects.toThrow(/permission denied/);
  });
});

describe('perspective cohorts', () => {
  it('records the declared cohort, defaults to global, and keeps a tally per cohort', async () => {
    const [a, b, c] = await makeUsers(3);
    const bill = await makeBill();
    expect(await vote(a, bill, 'for')).toMatchObject({ event_kind: 'cast', cohort: 'global' });
    expect(await vote(b, bill, 'for', 'in_country')).toMatchObject({ event_kind: 'cast', cohort: 'in_country' });
    expect(await vote(c, bill, 'against', 'displaced_diaspora')).toMatchObject({ cohort: 'displaced_diaspora' });
    const ballot = await ballotOf(bill);
    expect(await tally(bill)).toEqual(['for=2', 'against=1', 'unsure=0']);
    expect(await cohortTally(ballot)).toEqual(['for/global=1', 'for/in_country=1', 'against/displaced_diaspora=1']);
    expect(await sql(`SELECT cohort FROM public.vote_events WHERE ballot_id = '${ballot}' ORDER BY seq;`)).toEqual(['global', 'in_country', 'displaced_diaspora']);
    expect(await sql(asAnon + `SELECT sum(vote_count) FROM public.civic_proposal_option_cohorts WHERE proposal_id = '${ballot}';`)).toEqual(['3']);
    expect(await verified(ballot)).toBe('true/true');
  });

  it('treats a change of cohort alone as a changed vote, and a repeat of both as no change', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await vote(a, bill, 'for');
    const moved = await vote(a, bill, 'for', 'in_country');
    expect(moved).toMatchObject({ event_kind: 'supersede', changed: true, cohort: 'in_country' });
    expect(await vote(a, bill, 'for', 'in_country')).toMatchObject({ changed: false, cohort: 'in_country', row_hash: moved.row_hash });
    const ballot = await ballotOf(bill);
    expect(await tally(bill)).toEqual(['for=1', 'against=0', 'unsure=0']);
    expect(await cohortTally(ballot)).toEqual(['for/global=0', 'for/in_country=1']);
    await vote(a, bill, 'against', 'displaced_diaspora');
    expect(await events(ballot)).toEqual(['cast', 'supersede', 'supersede']);
    expect(await tally(bill)).toEqual(['for=0', 'against=1', 'unsure=0']);
    expect(await cohortTally(ballot)).toEqual(['for/global=0', 'for/in_country=0', 'against/displaced_diaspora=1']);
    expect(await sql(asUser(a) + `SELECT current_cohort FROM public.vote_voter_links WHERE ballot_id = '${ballot}';`)).toEqual(['displaced_diaspora']);
    expect(await verified(ballot)).toBe('true/true');
    await sql(`UPDATE public.civic_proposals SET vote_change_allowed = false WHERE id = '${ballot}';`);
    await expect(vote(a, bill, 'against', 'global')).rejects.toThrow(/does not allow changing/);
  });

  it('rejects an unknown or null cohort and records nothing', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await expect(vote(a, bill, 'for', 'refugee')).rejects.toThrow(/cohort must be/);
    await expect(sql(asUser(a) + `SELECT public.cast_bill_vote('${bill}', 'for', NULL);`)).rejects.toThrow(/cohort must be/);
    expect(await sql(`SELECT count(*) FROM public.vote_events e JOIN public.civic_proposals p ON p.id = e.ballot_id WHERE p.bill_id = '${bill}';`)).toEqual(['0']);
  });

  it('detects a forged cohort tally and a forged cohort on an event', async () => {
    const [a, b] = await makeUsers(2);
    const bill = await makeBill();
    await vote(a, bill, 'for', 'in_country');
    await vote(b, bill, 'for');
    const ballot = await ballotOf(bill);
    expect(await verified(ballot)).toBe('true/true');
    // Totals per option stay right; only the split between cohorts is forged.
    await sql(`UPDATE public.civic_proposal_option_cohorts SET cohort = 'displaced_diaspora' WHERE proposal_id = '${ballot}' AND cohort = 'global';`);
    expect(await verified(ballot)).toBe('true/false');
    await sql(`UPDATE public.civic_proposal_option_cohorts SET cohort = 'global' WHERE proposal_id = '${ballot}' AND cohort = 'displaced_diaspora';`);
    expect(await verified(ballot)).toBe('true/true');
    await sql(`INSERT INTO public.civic_proposal_option_cohorts (proposal_id, option_id, cohort, vote_count)
      SELECT proposal_id, id, 'global', 5 FROM public.civic_proposal_options WHERE proposal_id = '${ballot}' AND option_key = 'unsure';`);
    expect(await verified(ballot)).toBe('true/false');
    await sql(`DELETE FROM public.civic_proposal_option_cohorts c USING public.civic_proposal_options o
      WHERE o.id = c.option_id AND c.proposal_id = '${ballot}' AND o.option_key = 'unsure';`);
    await sql(`ALTER TABLE public.vote_events DISABLE TRIGGER vote_events_append_only;
      UPDATE public.vote_events SET cohort = 'global' WHERE ballot_id = '${ballot}' AND cohort = 'in_country';
      ALTER TABLE public.vote_events ENABLE TRIGGER vote_events_append_only;`);
    expect(await verified(ballot)).toBe('false/false');
  });

  it('lets no API role write a cohort tally', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    await vote(a, bill, 'for');
    for (const stmt of [
      `UPDATE public.civic_proposal_option_cohorts SET vote_count = 99;`,
      `DELETE FROM public.civic_proposal_option_cohorts;`,
      `INSERT INTO public.civic_proposal_option_cohorts (proposal_id, option_id, cohort) SELECT proposal_id, option_id, 'in_country' FROM public.civic_proposal_option_cohorts LIMIT 1;`,
    ]) {
      await expect(sql(asUser(a) + stmt)).rejects.toThrow(/permission denied/);
    }
  });
});

describe('ledger audit and configuration', () => {
  it('reports a ballot that does not exist as unverified', async () => {
    expect(await verified(randomUUID())).toBe('false/false');
  });

  it('raises its own error code when the signing secret is missing', async () => {
    const [a] = await makeUsers(1);
    const bill = await makeBill();
    // One transaction, rolled back when the vote fails: other tests never see the secret gone.
    const attempt = sql(`BEGIN; DELETE FROM private.ledger_settings; \\set VERBOSITY verbose\n` + asUser(a) + `SELECT public.cast_bill_vote('${bill}', 'for');`);
    await expect(attempt).rejects.toThrow(/55000[\s\S]*not configured/);
    expect(await sql(`SELECT count(*) FROM private.ledger_settings;`)).toEqual(['1']);
  });
});

describe('ballot columns', () => {
  it('has one deadline column, and refuses a ballot that closes before it opens', async () => {
    expect(await sql(`SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'civic_proposals' AND column_name = 'expires_at';`)).toEqual(['0']);
    await expect(sql(`INSERT INTO public.civic_proposals (title, opens_at, closes_at) VALUES ('Closes before it opens', now(), now() - interval '1 hour');`)).rejects.toThrow(/civic_proposals_closes_after_opens/);
  });

  it('keeps translations as an object that only the server writes', async () => {
    const [a] = await makeUsers(1);
    const id = randomUUID();
    await sql(`INSERT INTO public.civic_proposals (id, title, proposer_id) VALUES ('${id}', 'Open the budget books', '${a}');`);
    expect(await sql(asAnon + `SELECT translations::text FROM public.civic_proposals WHERE id = '${id}';`)).toEqual(['{}']);
    expect(await sql(asAnon + `SELECT DISTINCT translations::text FROM public.civic_proposal_options WHERE proposal_id = '${id}';`)).toEqual(['{}']);
    await sql(`UPDATE public.civic_proposals SET translations = '{"fa": {"title": "t"}}' WHERE id = '${id}';
      UPDATE public.civic_proposal_options SET translations = '{"fa": {"option_text": "o"}}' WHERE proposal_id = '${id}';`);
    await expect(sql(`UPDATE public.civic_proposals SET translations = '[]' WHERE id = '${id}';`)).rejects.toThrow(/check constraint/);
    await expect(sql(`UPDATE public.civic_proposal_options SET translations = '"fa"' WHERE proposal_id = '${id}';`)).rejects.toThrow(/check constraint/);
    await expect(sql(asUser(a) + `INSERT INTO public.civic_proposals (title, proposer_id, translations) VALUES ('Publish the contract ledger', '${a}', '{"fa": {"title": "x"}}');`)).rejects.toThrow(/permission denied/);
  });

  it('shows the options of a draft proposal to its proposer only', async () => {
    const [author, other] = await makeUsers(2);
    const [draft, live] = [randomUUID(), randomUUID()];
    await sql(`INSERT INTO public.civic_proposals (id, proposer_id, title, status) VALUES
      ('${draft}', '${author}', 'Draft: unreviewed AI poll', 'draft'), ('${live}', '${author}', 'Open the budget books', 'active');`);
    const seen = (who: string, id: string) => sql(who + `SELECT count(*) FROM public.civic_proposal_options WHERE proposal_id = '${id}';`);
    expect(await seen(asAnon, live)).toEqual(['3']);
    expect(await seen(asAnon, draft)).toEqual(['0']);
    expect(await seen(asUser(other), draft)).toEqual(['0']);
    expect(await seen(asUser(author), draft)).toEqual(['3']);
    await sql(`INSERT INTO public.civic_proposal_option_cohorts (proposal_id, option_id, cohort)
      SELECT proposal_id, id, 'global' FROM public.civic_proposal_options WHERE proposal_id = '${draft}';`);
    const tallies = (who: string) => sql(who + `SELECT count(*) FROM public.civic_proposal_option_cohorts WHERE proposal_id = '${draft}';`);
    expect(await tallies(asAnon)).toEqual(['0']);
    expect(await tallies(asUser(author))).toEqual(['3']);
  });

  it('keeps a source link unique among community proposals only', async () => {
    const url = `https://example.test/${randomUUID()}`;
    await sql(`INSERT INTO public.civic_proposals (title, source_url, kind) VALUES ('Data poll one', '${url}', 'data_poll'), ('Data poll two', '${url}', 'data_poll'), ('Community proposal', '${url}', 'community_proposal');`);
    await expect(sql(`INSERT INTO public.civic_proposals (title, source_url) VALUES ('Second community proposal', '${url}');`)).rejects.toThrow(/civic_proposals_source_url_key/);
  });
});

describe('community proposals on the ballot table', () => {
  const propose = (uid: string, url: string | null, extra = '') =>
    `INSERT INTO public.civic_proposals (title, source_url, proposer_id${extra ? ', ' + extra.split('=')[0] : ''})
     VALUES ('Publish the contract ledger', ${url ? `'${url}'` : 'NULL'}, '${uid}'${extra ? ', ' + extra.split('=')[1] : ''});`;
  const link = () => `https://example.test/${randomUUID()}`;

  it('lets a signed-in user propose as themselves and gives the proposal three options', async () => {
    const [a] = await makeUsers(1);
    const url = link();
    await sql(asUser(a) + propose(a, url));
    expect(await sql(asAnon + `SELECT o.option_key FROM public.civic_proposal_options o JOIN public.civic_proposals p ON p.id = o.proposal_id
      WHERE p.source_url = '${url}' ORDER BY o.sort_order;`)).toEqual(['for', 'against', 'unsure']);
  });

  it('refuses anon, impersonation, a duplicate source link, and control columns', async () => {
    const [a, b] = await makeUsers(2);
    const url = link();
    await expect(sql(asAnon + propose(a, link()))).rejects.toThrow(/row-level security|permission denied/);
    await expect(sql(asUser(b) + propose(a, link()))).rejects.toThrow(/row-level security/);
    await sql(asUser(a) + propose(a, url));
    await expect(sql(asUser(b) + propose(b, url))).rejects.toThrow(/duplicate key|unique/);
    for (const extra of [`status='promoted_to_dao'`, `closes_at=now()`, `vote_change_allowed=false`]) {
      await expect(sql(asUser(a) + propose(a, link(), extra))).rejects.toThrow(/permission denied/);
    }
    await expect(sql(asUser(a) + `UPDATE public.civic_proposals SET title = 'Changed title' WHERE source_url = '${url}';`)).rejects.toThrow(/permission denied/);
    await expect(sql(asUser(a) + `DELETE FROM public.civic_proposals WHERE source_url = '${url}';`)).rejects.toThrow(/permission denied/);
  });
});
