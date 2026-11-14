import { getAddress, isAddress, verifyMessage } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage } from 'viem/siwe';

export const DEFAULT_LINK_CHAIN_ID = 31;
export const ALLOWED_LINK_CHAINS = [DEFAULT_LINK_CHAIN_ID] as const;
export const CHALLENGE_TTL_MS = 10 * 60_000;

function parsePositiveChainId(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function getAllowedLinkChains(
  env: Record<string, string | undefined> = process.env,
): number[] {
  const chains = new Set<number>([DEFAULT_LINK_CHAIN_ID]);
  for (const candidate of [env.NEXT_PUBLIC_CHAIN_ID, env.UTP_ALPHA_CHAIN_ID]) {
    const id = parsePositiveChainId(candidate);
    if (id !== null) chains.add(id);
  }
  if (env.ALLOWED_LINK_CHAIN_IDS) {
    for (const part of env.ALLOWED_LINK_CHAIN_IDS.split(',')) {
      const id = parsePositiveChainId(part);
      if (id !== null) chains.add(id);
    }
  }
  return Array.from(chains);
}

export function isAllowedLinkChain(
  chainId: number,
  allowedChains?: readonly number[],
): boolean {
  if (!Number.isInteger(chainId) || chainId <= 0) return false;
  return (allowedChains ?? getAllowedLinkChains()).includes(chainId);
}

export type Challenge = {
  nonce: string;
  userId: string;
  chainId: number;
  address: `0x${string}`; // lowercase
  domain: string;
  expiresAt: Date;
};

export type NonceFailure = 'unknown_nonce' | 'expired' | 'replayed' | 'wrong_user';
export type LinkStatus = 'ok' | 'address_taken' | 'bad_attestation' | NonceFailure;
export type RevokeStatus = 'ok' | 'not_linked' | 'bad_attestation' | NonceFailure;

/**
 * Link state changes only through linkWallet / revokeLink, each of which
 * atomically consumes the caller's nonce (single use) and, in the Supabase
 * store, carries a server HMAC attestation the database re-checks.
 */
export interface WalletLinkStore {
  putChallenge(c: Challenge): Promise<void>;
  linkWallet(l: { userId: string; nonce: string; chainId: number; address: `0x${string}`; assurance: 'aal1' | 'aal2'; now: Date }): Promise<LinkStatus>;
  revokeLink(l: { userId: string; nonce: string; chainId: number; address: `0x${string}`; now: Date }): Promise<RevokeStatus>;
}

export type VerifyFailure =
  | 'unknown_nonce' | 'expired' | 'replayed' | 'wrong_origin' | 'wrong_chain' | 'wrong_user' | 'bad_signature' | 'address_taken';

export function normalizeAddress(a: string): `0x${string}` {
  if (typeof a !== 'string' || !isAddress(a, { strict: false })) throw new Error('Invalid address');
  return a.toLowerCase() as `0x${string}`;
}

export async function createWalletChallenge(
  i: {
    userId: string;
    address: string;
    chainId?: number;
    origin: string;
    now?: Date;
    allowedChains?: readonly number[];
  },
  store: WalletLinkStore,
): Promise<{ message: string; nonce: string; expiresAt: string }> {
  const chainId = i.chainId ?? DEFAULT_LINK_CHAIN_ID;
  if (!isAllowedLinkChain(chainId, i.allowedChains)) throw new Error('Unsupported chain');
  const address = normalizeAddress(i.address);
  const origin = new URL(i.origin);
  const now = i.now ?? new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const nonce = generateSiweNonce();
  const message = createSiweMessage({
    domain: origin.host,
    uri: origin.origin,
    address: getAddress(address),
    chainId,
    nonce,
    version: '1',
    issuedAt: now,
    expirationTime: expiresAt,
    statement: 'Link this wallet to your UTP account.',
  });
  await store.putChallenge({ nonce, userId: i.userId, chainId, address, domain: origin.host, expiresAt });
  return { message, nonce, expiresAt: expiresAt.toISOString() };
}

type Proof = { nonce: string; chainId: number; address: `0x${string}` };

/** Checks an ERC-4361 message + signature against the request origin. */
async function verifyProof(
  i: { message: string; signature: `0x${string}`; origin: string; allowedChains?: readonly number[] },
): Promise<{ ok: true; proof: Proof } | { ok: false; reason: VerifyFailure }> {
  const fail = (reason: VerifyFailure) => ({ ok: false as const, reason });
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
  if (parsed.domain !== expected.host || parsed.uri === undefined) return fail('wrong_origin');
  try {
    if (new URL(parsed.uri).origin !== expected.origin) return fail('wrong_origin');
  } catch {
    return fail('wrong_origin');
  }
  if (parsed.chainId === undefined || !isAllowedLinkChain(parsed.chainId, i.allowedChains)) return fail('wrong_chain');
  let address: `0x${string}`;
  try {
    address = normalizeAddress(parsed.address);
  } catch {
    return fail('bad_signature');
  }
  // Signature is checked before any nonce is consumed, so a forged attempt
  // cannot burn the legitimate user's nonce. EOA only (no ERC-1271 yet).
  let valid = false;
  try {
    valid = await verifyMessage({ address: getAddress(address), message: i.message, signature: i.signature });
  } catch {
    valid = false;
  }
  if (!valid) return fail('bad_signature');
  return { ok: true, proof: { nonce: parsed.nonce, chainId: parsed.chainId, address } };
}

function nonceOrThrow(status: LinkStatus | RevokeStatus): NonceFailure {
  // bad_attestation means the server and database keys disagree: a
  // configuration fault, not a user error.
  if (status === 'bad_attestation') throw new Error('wallet attestation rejected');
  return status as NonceFailure;
}

export async function verifyWalletLink(
  i: {
    userId: string;
    message: string;
    signature: `0x${string}`;
    origin: string;
    now?: Date;
    allowedChains?: readonly number[];
  },
  store: WalletLinkStore,
): Promise<{ ok: true } | { ok: false; reason: VerifyFailure }> {
  const v = await verifyProof(i);
  if (!v.ok) return v;
  const status = await store.linkWallet({ userId: i.userId, ...v.proof, assurance: 'aal1', now: i.now ?? new Date() });
  if (status === 'ok') return { ok: true };
  if (status === 'address_taken') return { ok: false, reason: 'address_taken' };
  return { ok: false, reason: nonceOrThrow(status) };
}

/** Unlink requires a fresh wallet proof. Fresh-MFA is deferred to I2. */
export async function verifyWalletUnlink(
  i: {
    userId: string;
    message: string;
    signature: `0x${string}`;
    origin: string;
    now?: Date;
    allowedChains?: readonly number[];
  },
  store: WalletLinkStore,
): Promise<{ ok: true } | { ok: false; reason: Exclude<VerifyFailure, 'address_taken'> | 'not_linked' }> {
  const v = await verifyProof(i);
  if (!v.ok) {
    if (v.reason === 'address_taken') throw new Error('unreachable');
    return { ok: false, reason: v.reason };
  }
  const status = await store.revokeLink({ userId: i.userId, ...v.proof, now: i.now ?? new Date() });
  if (status === 'ok') return { ok: true };
  if (status === 'not_linked') return { ok: false, reason: 'not_linked' };
  return { ok: false, reason: nonceOrThrow(status) };
}

/** In-memory store for tests and local development. Not for production. */
export function createMemoryWalletLinkStore(): WalletLinkStore {
  const challenges = new Map<string, Challenge & { consumedAt: Date | null }>();
  const links: { userId: string; chainId: number; address: string; assurance: string; status: 'active' | 'revoked' }[] = [];
  function consume(nonce: string, userId: string, now: Date): Challenge | NonceFailure {
    const c = challenges.get(nonce);
    if (!c) return 'unknown_nonce';
    if (c.userId !== userId) return 'wrong_user';
    if (c.consumedAt) return 'replayed';
    if (c.expiresAt.getTime() <= now.getTime()) return 'expired';
    c.consumedAt = now;
    return c;
  }
  return {
    async putChallenge(c) {
      if (challenges.has(c.nonce)) throw new Error('duplicate nonce');
      challenges.set(c.nonce, { ...c, consumedAt: null });
    },
    async linkWallet(l) {
      const c = consume(l.nonce, l.userId, l.now);
      if (typeof c === 'string') return c;
      if (c.chainId !== l.chainId || c.address !== l.address) return 'bad_attestation';
      const existing = links.find((x) => x.status === 'active' && x.chainId === c.chainId && x.address === c.address);
      if (existing) return existing.userId === l.userId ? 'ok' : 'address_taken';
      links.push({ userId: l.userId, chainId: c.chainId, address: c.address, assurance: l.assurance, status: 'active' });
      return 'ok';
    },
    async revokeLink(l) {
      const c = consume(l.nonce, l.userId, l.now);
      if (typeof c === 'string') return c;
      if (c.chainId !== l.chainId || c.address !== l.address) return 'bad_attestation';
      const existing = links.find((x) => x.status === 'active' && x.userId === l.userId && x.chainId === c.chainId && x.address === c.address);
      if (!existing) return 'not_linked';
      existing.status = 'revoked';
      return 'ok';
    },
  };
}
