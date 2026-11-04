import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { sql, asUser, asAnon, makeUsers } from './psql';

const addr = () => '0x' + randomBytes(20).toString('hex');
const nonce = () => randomBytes(12).toString('hex');

function createChallenge(n: string, a: string, chain = 31) {
  return `SELECT public.create_wallet_challenge('${n}', ${chain}, '${a}', 'utp.test') \\g /dev/null\n`;
}

describe('wallet link challenges', () => {
  it('20 parallel consumes of one nonce by two users: exactly one non-null', async () => {
    const [a, b] = await makeUsers(2);
    const n = nonce();
    await sql(asUser(a) + createChallenge(n, addr()));
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        sql(asUser(i % 2 === 0 ? a : b) + `SELECT count(*) FROM public.consume_wallet_challenge('${n}');`),
      ),
    );
    const winners = results.map((r) => Number(r[0])).reduce((x, y) => x + y, 0);
    expect(winners).toBe(1);
    expect(await sql(asUser(a) + `SELECT public.wallet_challenge_status('${n}');`)).toEqual(['consumed']);
    expect(await sql(asUser(b) + `SELECT public.wallet_challenge_status('${n}');`)).toEqual(['other_user']);
  });

  it('expired challenges cannot be consumed', async () => {
    const [a] = await makeUsers(1);
    const n = nonce();
    await sql(asUser(a) + createChallenge(n, addr()));
    await sql(`UPDATE wallet_link_challenges SET expires_at = now() - interval '1 minute' WHERE nonce = '${n}';`);
    expect(await sql(asUser(a) + `SELECT count(*) FROM public.consume_wallet_challenge('${n}');`)).toEqual(['0']);
    expect(await sql(asUser(a) + `SELECT public.wallet_challenge_status('${n}');`)).toEqual(['expired']);
  });

  it('rejects disallowed chains and non-normalized addresses', async () => {
    const [a] = await makeUsers(1);
    await expect(sql(asUser(a) + createChallenge(nonce(), addr(), 1))).rejects.toThrow();
    await expect(sql(asUser(a) + createChallenge(nonce(), '0xABC'))).rejects.toThrow();
  });
});

describe('wallet links', () => {
  async function prepared(user: string, a: string) {
    const n = nonce();
    await sql(asUser(user) + createChallenge(n, a));
    await sql(asUser(user) + `SELECT count(*) FROM public.consume_wallet_challenge('${n}');`);
  }

  it('two users racing activateLink for one (chain, address): one ok, one address_taken', async () => {
    const [a, b] = await makeUsers(2);
    const w = addr();
    await prepared(a, w);
    await prepared(b, w);
    const results = await Promise.all(
      [a, b].map((u) => sql(asUser(u) + `SELECT public.activate_wallet_link(31, '${w}', 'aal1');`)),
    );
    expect(results.map((r) => r[0]).sort()).toEqual(['address_taken', 'ok']);
    expect(await sql(`SELECT count(*) FROM wallet_links WHERE address = '${w}' AND status = 'active';`)).toEqual(['1']);
  });

  it('activation without a consumed challenge for that address is refused', async () => {
    const [a] = await makeUsers(1);
    await expect(sql(asUser(a) + `SELECT public.activate_wallet_link(31, '${addr()}', 'aal1');`)).rejects.toThrow(
      /no verified challenge/,
    );
  });

  it('assurance is capped by the session aal claim', async () => {
    const [a] = await makeUsers(1);
    const w = addr();
    await prepared(a, w);
    await sql(asUser(a) + `SELECT public.activate_wallet_link(31, '${w}', 'aal2');`);
    expect(await sql(`SELECT assurance FROM wallet_links WHERE address = '${w}';`)).toEqual(['aal1']);
  });

  it('RLS: users and anon cannot read others links; no direct writes', async () => {
    const [a, b] = await makeUsers(2);
    const w = addr();
    await prepared(a, w);
    await sql(asUser(a) + `SELECT public.activate_wallet_link(31, '${w}', 'aal1');`);
    expect(await sql(asUser(a) + `SELECT count(*) FROM wallet_links WHERE address = '${w}';`)).toEqual(['1']);
    expect(await sql(asUser(b) + `SELECT count(*) FROM wallet_links WHERE address = '${w}';`)).toEqual(['0']);
    await expect(sql(asAnon + `SELECT count(*) FROM wallet_links;`)).rejects.toThrow(/permission denied/);
    await expect(
      sql(asUser(b) + `INSERT INTO wallet_links(user_id, chain_id, address, assurance) VALUES ('${b}', 31, '${addr()}', 'aal1');`),
    ).rejects.toThrow(/permission denied/);
    await expect(sql(asUser(a) + `UPDATE wallet_links SET status = 'revoked';`)).rejects.toThrow(/permission denied/);
    await expect(sql(asUser(b) + `SELECT count(*) FROM wallet_link_challenges;`)).resolves.toEqual(['0']);
    await expect(sql(asAnon + `SELECT public.consume_wallet_challenge('x');`)).rejects.toThrow(/permission denied/);
  });
});
