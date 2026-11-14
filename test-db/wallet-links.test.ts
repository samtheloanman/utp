import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import { sql, asUser, asAnon, makeUsers } from './psql';

// Random per-run key; never a fixture.
const KEY = randomBytes(32).toString('hex');
const addr = () => '0x' + randomBytes(20).toString('hex');
const nonce = () => randomBytes(12).toString('hex');
const att = (uid: string, a: string, n: string, chain = 31) =>
  createHmac('sha256', KEY).update(`${uid}|${chain}|${a}|${n}`).digest('hex');

function createChallenge(n: string, a: string, chain = 31) {
  return `SELECT public.create_wallet_challenge('${n}', ${chain}, '${a}', 'utp.test') \\g /dev/null\n`;
}
async function challenge(user: string, a: string) {
  const n = nonce();
  await sql(asUser(user) + createChallenge(n, a));
  return n;
}
const link = (user: string, n: string, at: string | null, assurance = 'aal1') =>
  sql(asUser(user) + `SELECT public.link_wallet('${n}', ${at === null ? 'NULL' : `'${at}'`}, '${assurance}');`).then((r) => r[0]);
const revoke = (user: string, a: string, n: string, at: string) =>
  sql(asUser(user) + `SELECT public.revoke_wallet_link(31, '${a}', '${n}', '${at}');`).then((r) => r[0]);
const activeCount = (a: string) => sql(`SELECT count(*) FROM wallet_links WHERE address = '${a}' AND status = 'active';`).then((r) => r[0]);

beforeAll(async () => {
  await sql(`INSERT INTO private.wallet_link_settings(id, hmac_key) VALUES (1, '${KEY}')
    ON CONFLICT (id) DO UPDATE SET hmac_key = EXCLUDED.hmac_key;`);
});

describe('wallet link challenges', () => {
  it('20 parallel link attempts on one nonce by two users: exactly one consumes it', async () => {
    const [a, b] = await makeUsers(2);
    const w = addr();
    const n = await challenge(a, w);
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? link(a, n, att(a, w, n)) : link(b, n, att(b, w, n)))),
    );
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
    expect(results.filter((r) => r === 'wrong_user')).toHaveLength(10);
    expect(results.filter((r) => r === 'replayed')).toHaveLength(9);
    expect(await activeCount(w)).toBe('1');
  });

  it('expired challenges cannot be used', async () => {
    const [a] = await makeUsers(1);
    const w = addr();
    const n = await challenge(a, w);
    await sql(`UPDATE wallet_link_challenges SET expires_at = now() - interval '1 minute' WHERE nonce = '${n}';`);
    expect(await link(a, n, att(a, w, n))).toBe('expired');
    expect(await activeCount(w)).toBe('0');
  });

  it('unknown nonce', async () => {
    const [a] = await makeUsers(1);
    expect(await link(a, nonce(), 'ab'.repeat(32))).toBe('unknown_nonce');
  });

  it('rejects disallowed chains and non-normalized addresses', async () => {
    const [a] = await makeUsers(1);
    await expect(sql(asUser(a) + createChallenge(nonce(), addr(), 1))).rejects.toThrow();
    await expect(sql(asUser(a) + createChallenge(nonce(), '0xABC'))).rejects.toThrow();
  });
});

describe('wallet links (attested)', () => {
  it('missing or forged attestation -> bad_attestation, no active row', async () => {
    const [a, b] = await makeUsers(2);
    const w = addr();
    expect(await link(a, await challenge(a, w), null)).toBe('bad_attestation');
    expect(await link(a, await challenge(a, w), 'not-hex')).toBe('bad_attestation');
    // HMAC with a wrong key
    const n1 = await challenge(a, w);
    const forged = createHmac('sha256', 'x'.repeat(64)).update(`${a}|31|${w}|${n1}`).digest('hex');
    expect(await link(a, n1, forged)).toBe('bad_attestation');
    // valid HMAC but for another user / another address
    const n2 = await challenge(a, w);
    expect(await link(a, n2, att(b, w, n2))).toBe('bad_attestation');
    const n3 = await challenge(a, w);
    expect(await link(a, n3, att(a, addr(), n3))).toBe('bad_attestation');
    expect(await activeCount(w)).toBe('0');
  });

  it('direct consume / activate / attestation helpers are not callable by authenticated', async () => {
    const [a] = await makeUsers(1);
    const w = addr();
    const n = await challenge(a, w);
    await expect(sql(asUser(a) + `SELECT * FROM public.consume_wallet_challenge('${n}');`)).rejects.toThrow(/permission denied/);
    await expect(
      sql(asUser(a) + `SELECT public.wallet_attestation_ok('${a}', 31, '${w}', '${n}', 'x');`),
    ).rejects.toThrow(/permission denied/);
    await expect(sql(asUser(a) + `SELECT public.activate_wallet_link(31, '${w}', 'aal1');`)).rejects.toThrow(
      /does not exist|permission denied/,
    );
    await expect(sql(asUser(a) + `SELECT hmac_key FROM private.wallet_link_settings;`)).rejects.toThrow(/permission denied/);
    expect(await activeCount(w)).toBe('0');
  });

  it('two users racing for one (chain, address): one ok, one address_taken', async () => {
    const [a, b] = await makeUsers(2);
    const w = addr();
    const na = await challenge(a, w);
    const nb = await challenge(b, w);
    const results = await Promise.all([link(a, na, att(a, w, na)), link(b, nb, att(b, w, nb))]);
    expect(results.sort()).toEqual(['address_taken', 'ok']);
    expect(await activeCount(w)).toBe('1');
  });

  it('assurance is capped by the session aal claim', async () => {
    const [a] = await makeUsers(1);
    const w = addr();
    const n = await challenge(a, w);
    expect(await link(a, n, att(a, w, n), 'aal2')).toBe('ok');
    expect(await sql(`SELECT assurance FROM wallet_links WHERE address = '${w}';`)).toEqual(['aal1']);
  });

  it('revoke works only for the owner with a valid attestation; address can then be relinked', async () => {
    const [a, b] = await makeUsers(2);
    const w = addr();
    const n = await challenge(a, w);
    expect(await link(a, n, att(a, w, n))).toBe('ok');

    const nb = await challenge(b, w);
    expect(await revoke(b, w, nb, att(b, w, nb))).toBe('not_linked');
    const na1 = await challenge(a, w);
    expect(await revoke(a, w, na1, 'ab'.repeat(32))).toBe('bad_attestation');
    const na2 = await challenge(a, w);
    expect(await revoke(a, w, na2, att(a, w, na2))).toBe('ok');
    expect(await activeCount(w)).toBe('0');

    const nb2 = await challenge(b, w);
    expect(await link(b, nb2, att(b, w, nb2))).toBe('ok');
  });

  it('RLS: users and anon cannot read others links; no direct writes', async () => {
    const [a, b] = await makeUsers(2);
    const w = addr();
    const n = await challenge(a, w);
    await link(a, n, att(a, w, n));
    expect(await sql(asUser(a) + `SELECT count(*) FROM wallet_links WHERE address = '${w}';`)).toEqual(['1']);
    expect(await sql(asUser(b) + `SELECT count(*) FROM wallet_links WHERE address = '${w}';`)).toEqual(['0']);
    await expect(sql(asAnon + `SELECT count(*) FROM wallet_links;`)).rejects.toThrow(/permission denied/);
    await expect(
      sql(asUser(b) + `INSERT INTO wallet_links(user_id, chain_id, address, assurance) VALUES ('${b}', 31, '${addr()}', 'aal1');`),
    ).rejects.toThrow(/permission denied/);
    await expect(sql(asUser(a) + `UPDATE wallet_links SET status = 'revoked';`)).rejects.toThrow(/permission denied/);
    expect(await sql(asUser(b) + `SELECT count(*) FROM wallet_link_challenges;`)).toEqual(['0']);
    await expect(sql(asAnon + `SELECT public.link_wallet('x', 'y', 'aal1');`)).rejects.toThrow(/permission denied/);
  });
});
