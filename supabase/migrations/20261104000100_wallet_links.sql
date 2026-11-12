-- Task 6: server-challenge wallet linking (ERC-4361).
-- Depends only on auth.users / auth.uid(); independent of 0200/0300.
-- Trust boundary: the database cannot verify secp256k1 signatures, so the
-- app server verifies the SIWE signature and passes an HMAC attestation
-- (key WALLET_LINK_SECRET == private.wallet_link_settings.hmac_key). Only
-- link_wallet / revoke_wallet_link change link state, and both require it.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.wallet_link_settings (
  id       integer PRIMARY KEY CHECK (id = 1),
  hmac_key text NOT NULL CHECK (length(hmac_key) >= 32)
);
REVOKE ALL ON private.wallet_link_settings FROM PUBLIC, anon, authenticated;
-- Set the key out of band (never in a migration):
--   INSERT INTO private.wallet_link_settings(id, hmac_key) VALUES (1, '<secret>')
--   ON CONFLICT (id) DO UPDATE SET hmac_key = EXCLUDED.hmac_key;
-- All writes go through SECURITY DEFINER functions that take the user from
-- auth.uid(), never from a parameter. API roles get SELECT-own only.

CREATE TABLE IF NOT EXISTS public.wallet_link_challenges (
  nonce        text PRIMARY KEY CHECK (nonce ~ '^[A-Za-z0-9]{8,96}$'),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id     integer NOT NULL CHECK (chain_id IN (31)),
  address      text NOT NULL CHECK (address ~ '^0x[0-9a-f]{40}$'),
  domain       text NOT NULL CHECK (length(domain) BETWEEN 1 AND 255),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS wallet_link_challenges_user_idx ON public.wallet_link_challenges(user_id);

CREATE TABLE IF NOT EXISTS public.wallet_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id    integer NOT NULL CHECK (chain_id IN (31)),
  address     text NOT NULL CHECK (address ~ '^0x[0-9a-f]{40}$'),
  assurance   text NOT NULL CHECK (assurance IN ('aal1', 'aal2')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_links_one_active_per_address
  ON public.wallet_links(chain_id, address) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS wallet_links_user_idx ON public.wallet_links(user_id);

ALTER TABLE public.wallet_link_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet challenges select own" ON public.wallet_link_challenges;
CREATE POLICY "wallet challenges select own" ON public.wallet_link_challenges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet links select own" ON public.wallet_links;
CREATE POLICY "wallet links select own" ON public.wallet_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.wallet_link_challenges FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wallet_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wallet_link_challenges TO authenticated;
GRANT SELECT ON public.wallet_links TO authenticated;

-- Issue a challenge for the calling user. Expiry is set here (10 minutes),
-- not by the caller.
CREATE OR REPLACE FUNCTION public.create_wallet_challenge(
  p_nonce text, p_chain_id integer, p_address text, p_domain text
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_expires timestamptz := now() + interval '10 minutes';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.wallet_link_challenges(nonce, user_id, chain_id, address, domain, expires_at)
  VALUES (p_nonce, v_uid, p_chain_id, p_address, p_domain, v_expires);
  RETURN v_expires;
END $$;

-- Internal: atomic single use. The guarded UPDATE means only one caller wins.
CREATE OR REPLACE FUNCTION public.consume_wallet_challenge(p_nonce text)
RETURNS TABLE(nonce text, user_id uuid, chain_id integer, address text, domain text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  UPDATE public.wallet_link_challenges c
     SET consumed_at = now()
   WHERE c.nonce = p_nonce
     AND c.user_id = auth.uid()
     AND c.consumed_at IS NULL
     AND c.expires_at > now()
  RETURNING c.nonce, c.user_id, c.chain_id, c.address, c.domain, c.expires_at;
END $$;

-- Status of a nonce from the caller's point of view. Reveals only that a
-- nonce belongs to someone else, never whose or which wallet.
CREATE OR REPLACE FUNCTION public.wallet_challenge_status(p_nonce text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.wallet_link_challenges%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.wallet_link_challenges WHERE nonce = p_nonce;
  IF NOT FOUND THEN RETURN 'unknown'; END IF;
  IF r.user_id <> auth.uid() THEN RETURN 'other_user'; END IF;
  IF r.consumed_at IS NOT NULL THEN RETURN 'consumed'; END IF;
  IF r.expires_at <= now() THEN RETURN 'expired'; END IF;
  RETURN 'available';
END $$;

-- Internal: true when p_att is the server HMAC of uid|chain|address|nonce.
-- Compares SHA-256 of both sides so timing does not track a prefix match.
CREATE OR REPLACE FUNCTION public.wallet_attestation_ok(
  p_uid uuid, p_chain_id integer, p_address text, p_nonce text, p_att text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_key text; v_expected bytea; v_given bytea;
BEGIN
  SELECT hmac_key INTO v_key FROM private.wallet_link_settings WHERE id = 1;
  IF v_key IS NULL OR p_att IS NULL OR p_att !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
  v_expected := extensions.hmac(convert_to(p_uid::text || '|' || p_chain_id || '|' || p_address || '|' || p_nonce, 'UTF8'),
                                convert_to(v_key, 'UTF8'), 'sha256');
  v_given := decode(p_att, 'hex');
  RETURN extensions.digest(v_expected, 'sha256') = extensions.digest(v_given, 'sha256');
END $$;

CREATE OR REPLACE FUNCTION public.wallet_nonce_failure(p_nonce text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE public.wallet_challenge_status(p_nonce)
    WHEN 'other_user' THEN 'wrong_user' WHEN 'consumed' THEN 'replayed'
    WHEN 'expired' THEN 'expired' ELSE 'unknown_nonce' END
$$;

-- Link: consume the caller's nonce, check the server attestation, activate.
-- Returns ok | address_taken | bad_attestation | unknown_nonce | expired |
-- replayed | wrong_user. Assurance is capped by the session's aal claim.
-- Fresh-MFA for linking is deferred to I2.
CREATE OR REPLACE FUNCTION public.link_wallet(p_nonce text, p_att text, p_assurance text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  c record;
  v_claim_aal text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'aal', 'aal1');
  v_assurance text;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_assurance IS NULL OR p_assurance NOT IN ('aal1', 'aal2') THEN RAISE EXCEPTION 'invalid assurance' USING ERRCODE = '22023'; END IF;
  v_assurance := CASE WHEN p_assurance = 'aal2' AND v_claim_aal = 'aal2' THEN 'aal2' ELSE 'aal1' END;

  SELECT * INTO c FROM public.consume_wallet_challenge(p_nonce);
  IF NOT FOUND THEN RETURN public.wallet_nonce_failure(p_nonce); END IF;
  IF NOT public.wallet_attestation_ok(v_uid, c.chain_id, c.address, c.nonce, p_att) THEN
    RETURN 'bad_attestation';
  END IF;

  SELECT user_id INTO v_owner FROM public.wallet_links
   WHERE chain_id = c.chain_id AND address = c.address AND status = 'active';
  IF FOUND THEN
    IF v_owner = v_uid THEN
      UPDATE public.wallet_links SET verified_at = now(), assurance = v_assurance
       WHERE chain_id = c.chain_id AND address = c.address AND status = 'active';
      RETURN 'ok';
    END IF;
    RETURN 'address_taken';
  END IF;
  BEGIN
    INSERT INTO public.wallet_links(user_id, chain_id, address, assurance)
    VALUES (v_uid, c.chain_id, c.address, v_assurance);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'address_taken';
  END;
  RETURN 'ok';
END $$;

-- Revoke: needs a fresh challenge for that exact chain/address, consumed now,
-- plus a valid attestation, and an active link owned by the caller.
-- Returns ok | not_linked | bad_attestation | unknown_nonce | expired |
-- replayed | wrong_user. Fresh-MFA for unlink is deferred to I2.
CREATE OR REPLACE FUNCTION public.revoke_wallet_link(p_chain_id integer, p_address text, p_nonce text, p_att text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid := auth.uid(); c record; v_n integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.consume_wallet_challenge(p_nonce);
  IF NOT FOUND THEN RETURN public.wallet_nonce_failure(p_nonce); END IF;
  IF c.chain_id <> p_chain_id OR c.address <> p_address
     OR NOT public.wallet_attestation_ok(v_uid, c.chain_id, c.address, c.nonce, p_att) THEN
    RETURN 'bad_attestation';
  END IF;
  UPDATE public.wallet_links SET status = 'revoked'
   WHERE user_id = v_uid AND chain_id = c.chain_id AND address = c.address AND status = 'active';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN CASE WHEN v_n > 0 THEN 'ok' ELSE 'not_linked' END;
END $$;

-- Remove the earlier, unattested activation path if present.
DROP FUNCTION IF EXISTS public.activate_wallet_link(integer, text, text);

REVOKE ALL ON FUNCTION public.create_wallet_challenge(text, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_challenge_status(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_wallet(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_wallet_link(integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_wallet_challenge(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_attestation_ok(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_nonce_failure(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_wallet_challenge(text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_challenge_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_wallet(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_wallet_link(integer, text, text, text) TO authenticated;
