import { describe, it, expect } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';
import {
  createWalletChallenge,
  verifyWalletLink,
  normalizeAddress,
  createMemoryWalletLinkStore,
  verifyWalletUnlink,
} from './walletLink';

const ORIGIN = 'https://utp.test';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const T0 = new Date('2026-11-04T12:00:00Z');

function wallet() {
  return privateKeyToAccount(generatePrivateKey());
}

async function challengeAndSign(store = createMemoryWalletLinkStore(), userId = A, acct = wallet(), address?: string) {
  const c = await createWalletChallenge({ userId, address: address ?? acct.address, chainId: 31, origin: ORIGIN, now: T0 }, store);
  const signature = await acct.signMessage({ message: c.message });
  return { store, acct, c, signature };
}

describe('normalizeAddress', () => {
  it('lowercases valid addresses and rejects invalid', () => {
    const a = wallet().address;
    expect(normalizeAddress(a)).toBe(a.toLowerCase());
    expect(normalizeAddress(a.toLowerCase())).toBe(a.toLowerCase());
    expect(() => normalizeAddress('0x123')).toThrow();
    expect(() => normalizeAddress('not-an-address')).toThrow();
  });
});

describe('wallet link challenge/verify', () => {
  it('happy path links', async () => {
    const { store, c, signature } = await challengeAndSign();
    expect(c.expiresAt).toBe(new Date(T0.getTime() + 10 * 60_000).toISOString());
    const r = await verifyWalletLink({ userId: A, message: c.message, signature, origin: ORIGIN, now: T0 }, store);
    expect(r).toEqual({ ok: true });
  });

  it('replayed nonce -> replayed', async () => {
    const { store, c, signature } = await challengeAndSign();
    await verifyWalletLink({ userId: A, message: c.message, signature, origin: ORIGIN, now: T0 }, store);
    const r = await verifyWalletLink({ userId: A, message: c.message, signature, origin: ORIGIN, now: T0 }, store);
    expect(r).toEqual({ ok: false, reason: 'replayed' });
  });

  it('nonce issued to A used by B -> wrong_user', async () => {
    const { store, c, signature } = await challengeAndSign();
    const r = await verifyWalletLink({ userId: B, message: c.message, signature, origin: ORIGIN, now: T0 }, store);
    expect(r).toEqual({ ok: false, reason: 'wrong_user' });
    // A can still use it: B's attempt did not burn the nonce.
    const ok = await verifyWalletLink({ userId: A, message: c.message, signature, origin: ORIGIN, now: T0 }, store);
    expect(ok).toEqual({ ok: true });
  });

  it('signature by a different key -> bad_signature', async () => {
    const { store, c } = await challengeAndSign();
    const signature = await wallet().signMessage({ message: c.message });
    const r = await verifyWalletLink({ userId: A, message: c.message, signature, origin: ORIGIN, now: T0 }, store);
    expect(r).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('unknown nonce -> unknown_nonce', async () => {
    const store = createMemoryWalletLinkStore();
    const acct = wallet();
    const message = createSiweMessage({
      domain: 'utp.test', uri: ORIGIN, address: acct.address, chainId: 31, nonce: generateSiweNonce(), version: '1', issuedAt: T0,
    });
    const signature = await acct.signMessage({ message });
    const r = await verifyWalletLink({ userId: A, message, signature, origin: ORIGIN, now: T0 }, store);
    expect(r).toEqual({ ok: false, reason: 'unknown_nonce' });
  });

  it('domain evil.test vs origin utp.test -> wrong_origin', async () => {
    const store = createMemoryWalletLinkStore();
    const acct = wallet();
    const c = await createWalletChallenge({ userId: A, address: acct.address, chainId: 31, origin: 'https://evil.test', now: T0 }, store);
    const signature = await acct.signMessage({ message: c.message });
    const r = await verifyWalletLink({ userId: A, message: c.message, signature, origin: ORIGIN, now: T0 }, store);
    expect(r).toEqual({ ok: false, reason: 'wrong_origin' });
  });

  it('chain 1 -> wrong_chain at challenge time and at verify time', async () => {
    const store = createMemoryWalletLinkStore();
    const acct = wallet();
    await expect(
      createWalletChallenge({ userId: A, address: acct.address, chainId: 1, origin: ORIGIN, now: T0 }, store),
    ).rejects.toThrow(/chain/);
    const c = await createWalletChallenge({ userId: A, address: acct.address, chainId: 31, origin: ORIGIN, now: T0 }, store);
    const nonce = /Nonce: (\S+)/.exec(c.message)![1];
    const message = createSiweMessage({
      domain: 'utp.test', uri: ORIGIN, address: acct.address, chainId: 1, nonce, version: '1', issuedAt: T0,
    });
    const signature = await acct.signMessage({ message });
    const r = await verifyWalletLink({ userId: A, message, signature, origin: ORIGIN, now: T0 }, store);
    expect(r).toEqual({ ok: false, reason: 'wrong_chain' });
  });

  it('expired by 11 minutes -> expired', async () => {
    const { store, c, signature } = await challengeAndSign();
    const later = new Date(T0.getTime() + 11 * 60_000);
    const r = await verifyWalletLink({ userId: A, message: c.message, signature, origin: ORIGIN, now: later }, store);
    expect(r).toEqual({ ok: false, reason: 'expired' });
  });

  it('mixed-case and lowercase forms map to one link -> address_taken', async () => {
    const store = createMemoryWalletLinkStore();
    const acct = wallet();
    const first = await challengeAndSign(store, A, acct, acct.address);
    expect(await verifyWalletLink({ userId: A, message: first.c.message, signature: first.signature, origin: ORIGIN, now: T0 }, store)).toEqual({ ok: true });
    const second = await challengeAndSign(store, B, acct, acct.address.toLowerCase());
    expect(await verifyWalletLink({ userId: B, message: second.c.message, signature: second.signature, origin: ORIGIN, now: T0 }, store)).toEqual({ ok: false, reason: 'address_taken' });
  });

  it('unlink needs a fresh proof by the owner; address can then be relinked', async () => {
    const store = createMemoryWalletLinkStore();
    const acct = wallet();
    const l = await challengeAndSign(store, A, acct);
    expect(await verifyWalletLink({ userId: A, message: l.c.message, signature: l.signature, origin: ORIGIN, now: T0 }, store)).toEqual({ ok: true });
    // reusing the link proof fails
    expect(await verifyWalletUnlink({ userId: A, message: l.c.message, signature: l.signature, origin: ORIGIN, now: T0 }, store)).toEqual({ ok: false, reason: 'replayed' });
    const bProof = await challengeAndSign(store, B, acct);
    expect(await verifyWalletUnlink({ userId: B, message: bProof.c.message, signature: bProof.signature, origin: ORIGIN, now: T0 }, store)).toEqual({ ok: false, reason: 'not_linked' });
    const u = await challengeAndSign(store, A, acct);
    expect(await verifyWalletUnlink({ userId: A, message: u.c.message, signature: u.signature, origin: ORIGIN, now: T0 }, store)).toEqual({ ok: true });
    const b2 = await challengeAndSign(store, B, acct);
    expect(await verifyWalletLink({ userId: B, message: b2.c.message, signature: b2.signature, origin: ORIGIN, now: T0 }, store)).toEqual({ ok: true });
  });
});
