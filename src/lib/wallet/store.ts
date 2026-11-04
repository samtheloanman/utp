import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserScopedClient } from '@/lib/supabaseAuth/userClient';
import type { Challenge, ChallengeStatus, WalletLinkStore } from './walletLink';

/**
 * Supabase-backed WalletLinkStore acting as the calling user (anon key +
 * access token; never the service-role key). Every write goes through a
 * SECURITY DEFINER function that derives the user from auth.uid(); the
 * userId arguments of the interface are cross-checked here and otherwise
 * ignored, so a caller cannot act for someone else. `now` is ignored too:
 * expiry is judged by the database clock.
 */
export function createSupabaseWalletLinkStore(accessToken: string, expectedUserId: string): WalletLinkStore {
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
    async consumeChallenge(nonce, userId) {
      check(userId);
      const { data, error } = await db.rpc('consume_wallet_challenge', { p_nonce: nonce });
      if (error) throw new Error('could not consume challenge');
      const row = Array.isArray(data) ? data[0] : null;
      if (!row || row.user_id !== expectedUserId) return null;
      return {
        nonce: row.nonce,
        userId: row.user_id,
        chainId: row.chain_id,
        address: row.address,
        domain: row.domain,
        expiresAt: new Date(row.expires_at),
      };
    },
    async challengeStatus(nonce, userId) {
      check(userId);
      const { data, error } = await db.rpc('wallet_challenge_status', { p_nonce: nonce });
      if (error) throw new Error('could not read challenge status');
      return data as ChallengeStatus;
    },
    async activateLink(l) {
      check(l.userId);
      const { data, error } = await db.rpc('activate_wallet_link', {
        p_chain_id: l.chainId,
        p_address: l.address,
        p_assurance: l.assurance,
      });
      if (error) throw new Error('could not activate link');
      return data === 'ok' ? 'ok' : 'address_taken';
    },
  };
}
