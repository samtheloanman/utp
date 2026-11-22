import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql, asUser, asAnon, makeUsers, makeBill, upsertVote } from './psql';

const vote = async (uid: string, bill: string, choice: string) =>
  JSON.parse((await sql(asUser(uid) + `SELECT public.cast_bill_vote('${bill}', '${choice}');`))[0]);
const ballotOf = async (bill: string) =>
  (await sql(`SELECT id FROM public.civic_proposals WHERE kind = 'bill_sentiment' AND bill_id = '${bill}';`))[0];
const tally = (bill: string) =>
  sql(`SELECT o.option_key || '=' || o.vote_count FROM public.civic_proposal_options o
        JOIN public.civic_proposals p ON p.id = o.proposal_id WHERE p.bill_id = '${bill}' ORDER BY o.sort_order;`);
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
    for (const close of [`closes_at = now() - interval '1 second'`, `closes_at = NULL, status = 'closed'`, `status = 'active', opens_at = now() + interval '1 day'`]) {
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

  it('creates a lowest-level profile for every new account', async () => {
    const [a] = await makeUsers(1);
    expect(await sql(`SELECT identity_level FROM public.user_profiles WHERE id = '${a}';`)).toEqual(['1']);
    await expect(sql(asUser(a) + `UPDATE public.user_profiles SET identity_level = 3;`)).rejects.toThrow(/permission denied/);
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
