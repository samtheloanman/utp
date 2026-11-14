import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserScopedClient } from '@/lib/supabaseAuth/userClient';
import type { Challenge, LinkStatus, RevokeStatus, WalletLinkStore } from './walletLink';

/**
 * Server attestation that this server verified the wallet signature for
 * (user, chain, address, nonce). The database recomputes it with the same
 * key (private.wallet_link_settings) before changing link state.
 */
export function walletAttestation(secret: string, userId: string, chainId: number, address: string, nonce: string): string {
  return createHmac('sha256', secret).update(`${userId}|${chainId}|${address}|${nonce}`).digest('hex');
}

const LINK: readonly string[] = ['ok', 'address_taken', 'bad_attestation', 'unknown_nonce', 'expired', 'replayed', 'wrong_user'];
const REVOKE: readonly string[] = ['ok', 'not_linked', 'bad_attestation', 'unknown_nonce', 'expired', 'replayed', 'wrong_user'];

/**
 * Supabase-backed WalletLinkStore acting as the calling user (anon key +
 * access token; never the service-role key). SQL derives the user from
 * auth.uid(); the interface's userId arguments are cross-checked against
 * the session user and otherwise ignored. `now` is ignored: the database
 * clock decides expiry.
 */
export function createSupabaseWalletLinkStore(accessToken: string, expectedUserId: string, secret: string): WalletLinkStore {
  if (!secret) throw new Error('WALLET_LINK_SECRET is not configured');
  const db: SupabaseClient = createUserScopedClient(accessToken);
  const check = (userId: string) => {
    if (userId !== expectedUserId) throw new Error('wallet store user mismatch');
  };
  return {
    async putChallenge(c: Challenge) {
      check(c.userId);
      const { error } = await db.rpc('create_wallet_challenge', {
        p_nonce: c.nonce,
        p_chain_id: c.chainId,
        p_address: c.address,
        p_domain: c.domain,
      });
      if (error) throw new Error('could not store challenge');
    },
    async linkWallet(l) {
      check(l.userId);
      const { data, error } = await db.rpc('link_wallet', {
        p_nonce: l.nonce,
        p_att: walletAttestation(secret, expectedUserId, l.chainId, l.address, l.nonce),
        p_assurance: l.assurance,
      });
      if (error || typeof data !== 'string' || !LINK.includes(data)) throw new Error('could not link wallet');
      return data as LinkStatus;
    },
    async revokeLink(l) {
      check(l.userId);
      const { data, error } = await db.rpc('revoke_wallet_link', {
        p_chain_id: l.chainId,
        p_address: l.address,
        p_nonce: l.nonce,
        p_att: walletAttestation(secret, expectedUserId, l.chainId, l.address, l.nonce),
      });
      if (error || typeof data !== 'string' || !REVOKE.includes(data)) throw new Error('could not revoke wallet link');
      return data as RevokeStatus;
    },
  };
}
