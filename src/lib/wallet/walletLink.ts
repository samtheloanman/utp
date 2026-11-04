import { getAddress, isAddress, verifyMessage } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage } from 'viem/siwe';

export const ALLOWED_LINK_CHAINS = [31] as const;
export const CHALLENGE_TTL_MS = 10 * 60_000;

export type Challenge = {
  nonce: string;
  userId: string;
  chainId: number;
  address: `0x${string}`; // lowercase
  domain: string;
  expiresAt: Date;
};

/** Why a nonce could not be consumed, from the caller's point of view. */
export type ChallengeStatus = 'unknown' | 'expired' | 'consumed' | 'other_user' | 'available';

export interface WalletLinkStore {
  putChallenge(c: Challenge): Promise<void>;
  consumeChallenge(nonce: string, userId: string, now: Date): Promise<Challenge | null>; // atomic, single use
  activateLink(l: { userId: string; chainId: number; address: string; assurance: 'aal1' | 'aal2' }): Promise<'ok' | 'address_taken'>;
  /** Diagnostic only, used after a failed consume to choose an error reason. */
  challengeStatus(nonce: string, userId: string, now: Date): Promise<ChallengeStatus>;
}

export type VerifyFailure =
  | 'unknown_nonce' | 'expired' | 'replayed' | 'wrong_origin' | 'wrong_chain' | 'wrong_user' | 'bad_signature' | 'address_taken';

export function normalizeAddress(a: string): `0x${string}` {
  if (typeof a !== 'string' || !isAddress(a, { strict: false })) throw new Error('Invalid address');
  return a.toLowerCase() as `0x${string}`;
}

function isAllowedChain(chainId: number): boolean {
  return (ALLOWED_LINK_CHAINS as readonly number[]).includes(chainId);
}

export async function createWalletChallenge(
  i: { userId: string; address: string; chainId: number; origin: string; now?: Date },
  store: WalletLinkStore,
): Promise<{ message: string; nonce: string; expiresAt: string }> {
  if (!isAllowedChain(i.chainId)) throw new Error('Unsupported chain');
  const address = normalizeAddress(i.address);
  const origin = new URL(i.origin);
  const now = i.now ?? new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const nonce = generateSiweNonce();
  const message = createSiweMessage({
    domain: origin.host,
    uri: origin.origin,
    address: getAddress(address),
    chainId: i.chainId,
    nonce,
    version: '1',
    issuedAt: now,
    expirationTime: expiresAt,
    statement: 'Link this wallet to your UTP account.',
  });
  await store.putChallenge({ nonce, userId: i.userId, chainId: i.chainId, address, domain: origin.host, expiresAt });
  return { message, nonce, expiresAt: expiresAt.toISOString() };
}

export async function verifyWalletLink(
  i: { userId: string; message: string; signature: `0x${string}`; origin: string; now?: Date },
  store: WalletLinkStore,
): Promise<{ ok: true } | { ok: false; reason: VerifyFailure }> {
  const fail = (reason: VerifyFailure) => ({ ok: false as const, reason });
  const now = i.now ?? new Date();
  let expected: URL;
  try {
    expected = new URL(i.origin);
  } catch {
    return fail('wrong_origin');
  }

  let parsed: ReturnType<typeof parseSiweMessage>;
  try {
    parsed = parseSiweMessage(i.message);
  } catch {
    return fail('unknown_nonce');
  }
  if (!parsed.nonce || !parsed.address) return fail('unknown_nonce');
  if (parsed.domain !== expected.host) return fail('wrong_origin');
  if (parsed.uri !== undefined) {
    try {
      if (new URL(parsed.uri).origin !== expected.origin) return fail('wrong_origin');
    } catch {
      return fail('wrong_origin');
    }
  } else return fail('wrong_origin');
  if (parsed.chainId === undefined || !isAllowedChain(parsed.chainId)) return fail('wrong_chain');

  let address: `0x${string}`;
  try {
    address = normalizeAddress(parsed.address);
  } catch {
    return fail('bad_signature');
  }

  // Check the signature before consuming, so a forged attempt cannot burn
  // the legitimate user's nonce.
  let validSig = false;
  try {
    validSig = await verifyMessage({ address: getAddress(address), message: i.message, signature: i.signature });
  } catch {
    validSig = false;
  }
  if (!validSig) return fail('bad_signature');

  const challenge = await store.consumeChallenge(parsed.nonce, i.userId, now);
  if (!challenge) {
    const status = await store.challengeStatus(parsed.nonce, i.userId, now);
    if (status === 'other_user') return fail('wrong_user');
    if (status === 'expired') return fail('expired');
    if (status === 'consumed') return fail('replayed');
    return fail('unknown_nonce');
  }
  // The signed message must match exactly what this server issued for the nonce.
  if (challenge.domain !== expected.host) return fail('wrong_origin');
  if (challenge.chainId !== parsed.chainId) return fail('wrong_chain');
  if (challenge.address !== address) return fail('bad_signature');

  const res = await store.activateLink({ userId: i.userId, chainId: challenge.chainId, address, assurance: 'aal1' });
  return res === 'ok' ? { ok: true } : fail('address_taken');
}

/** In-memory store for tests and local development. Not for production. */
export function createMemoryWalletLinkStore(): WalletLinkStore {
  const challenges = new Map<string, Challenge & { consumedAt: Date | null }>();
  const links: { userId: string; chainId: number; address: string; assurance: string; status: 'active' | 'revoked' }[] = [];
  return {
    async putChallenge(c) {
      if (challenges.has(c.nonce)) throw new Error('duplicate nonce');
      challenges.set(c.nonce, { ...c, consumedAt: null });
    },
    async consumeChallenge(nonce, userId, now) {
      const c = challenges.get(nonce);
      if (!c || c.userId !== userId || c.consumedAt || c.expiresAt.getTime() <= now.getTime()) return null;
      c.consumedAt = now;
      const { consumedAt: _ignored, ...rest } = c;
      void _ignored;
      return rest;
    },
    async challengeStatus(nonce, userId, now) {
      const c = challenges.get(nonce);
      if (!c) return 'unknown';
      if (c.userId !== userId) return 'other_user';
      if (c.consumedAt) return 'consumed';
      if (c.expiresAt.getTime() <= now.getTime()) return 'expired';
      return 'available';
    },
    async activateLink(l) {
      const address = normalizeAddress(l.address);
      const existing = links.find((x) => x.status === 'active' && x.chainId === l.chainId && x.address === address);
      if (existing) return existing.userId === l.userId ? 'ok' : 'address_taken';
      links.push({ userId: l.userId, chainId: l.chainId, address, assurance: l.assurance, status: 'active' });
      return 'ok';
    },
  };
}
