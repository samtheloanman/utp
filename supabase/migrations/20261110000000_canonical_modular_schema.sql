-- Wave 1 Canonical Modular Schema & RLS Optimization (D1 + Q1 Mapping Manifesto)
-- Consolidates public civic, wallet-linking, and multi-chain DAO tables cleanly
-- over the 7 prior migrations before any production UTP Supabase project is created.

-- =============================================================================
-- a) Chain Registry: public.chain_networks (unblocks Rootstock 31 -> Alpha-Net)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.chain_networks (
  chain_id           integer PRIMARY KEY CHECK (chain_id > 0),
  slug               text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  network_kind       text NOT NULL CHECK (network_kind IN ('sidechain_evm', 'utp_alpha_l2', 'local')),
  governor_address   text CHECK (governor_address IS NULL OR governor_address ~ '^0x[0-9a-f]{40}$'),
  timelock_address   text CHECK (timelock_address IS NULL OR timelock_address ~ '^0x[0-9a-f]{40}$'),
  token_address      text CHECK (token_address IS NULL OR token_address ~ '^0x[0-9a-f]{40}$'),
  app_config_address text CHECK (app_config_address IS NULL OR app_config_address ~ '^0x[0-9a-f]{40}$'),
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chain_networks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chain networks are publicly readable" ON public.chain_networks;
CREATE POLICY "Chain networks are publicly readable" ON public.chain_networks
  FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.chain_networks FROM anon, authenticated;
GRANT SELECT ON public.chain_networks TO anon, authenticated;

INSERT INTO public.chain_networks (chain_id, slug, network_kind, is_active)
VALUES
  (31, 'rsk-testnet', 'sidechain_evm', true),
  (31337, 'hardhat', 'local', true)
ON CONFLICT (chain_id) DO NOTHING;

-- =============================================================================
-- b) Multi-chain Wallet Linking: drop hardcoded Chain 31 CHECK, enforce FK + active
-- =============================================================================
ALTER TABLE public.wallet_link_challenges
  DROP CONSTRAINT IF EXISTS wallet_link_challenges_chain_id_check;

ALTER TABLE public.wallet_links
  DROP CONSTRAINT IF EXISTS wallet_links_chain_id_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'wallet_link_challenges_chain_id_fkey'
       AND conrelid = 'public.wallet_link_challenges'::regclass
  ) THEN
    ALTER TABLE public.wallet_link_challenges
      ADD CONSTRAINT wallet_link_challenges_chain_id_fkey
      FOREIGN KEY (chain_id) REFERENCES public.chain_networks(chain_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'wallet_links_chain_id_fkey'
       AND conrelid = 'public.wallet_links'::regclass
  ) THEN
    ALTER TABLE public.wallet_links
      ADD CONSTRAINT wallet_links_chain_id_fkey
      FOREIGN KEY (chain_id) REFERENCES public.chain_networks(chain_id);
  END IF;
END $$;

ALTER TABLE public.wallet_links
  ADD COLUMN IF NOT EXISTS pq_pubkey_hash text;

-- Enforce active chain_networks status on challenge creation & new wallet links
-- (allowing status updates such as revocation even if a chain is later paused).
CREATE OR REPLACE FUNCTION private.enforce_active_wallet_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.chain_id IS DISTINCT FROM OLD.chain_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chain_networks cn
       WHERE cn.chain_id = NEW.chain_id AND cn.is_active = true
    ) THEN
      RAISE EXCEPTION 'chain % is not registered or not active', NEW.chain_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_active_wallet_chain() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wallet_link_challenges_active_chain ON public.wallet_link_challenges;
CREATE TRIGGER wallet_link_challenges_active_chain
  BEFORE INSERT OR UPDATE OF chain_id ON public.wallet_link_challenges
  FOR EACH ROW EXECUTE FUNCTION private.enforce_active_wallet_chain();

DROP TRIGGER IF EXISTS wallet_links_active_chain ON public.wallet_links;
CREATE TRIGGER wallet_links_active_chain
  BEFORE INSERT OR UPDATE OF chain_id ON public.wallet_links
  FOR EACH ROW EXECUTE FUNCTION private.enforce_active_wallet_chain();

-- Update create_wallet_challenge and link_wallet to validate active chain_networks
CREATE OR REPLACE FUNCTION public.create_wallet_challenge(
  p_nonce text, p_chain_id integer, p_address text, p_domain text
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_expires timestamptz := now() + interval '10 minutes';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chain_networks cn
     WHERE cn.chain_id = p_chain_id AND cn.is_active = true
  ) THEN
    RAISE EXCEPTION 'unsupported or inactive chain: %', p_chain_id USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.wallet_link_challenges(nonce, user_id, chain_id, address, domain, expires_at)
  VALUES (p_nonce, v_uid, p_chain_id, p_address, p_domain, v_expires);
  RETURN v_expires;
END $$;

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
  IF NOT EXISTS (
    SELECT 1 FROM public.chain_networks cn
     WHERE cn.chain_id = c.chain_id AND cn.is_active = true
  ) THEN
    RAISE EXCEPTION 'inactive chain: %', c.chain_id USING ERRCODE = '23514';
  END IF;
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

REVOKE ALL ON FUNCTION public.create_wallet_challenge(text, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_wallet(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_wallet_challenge(text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_wallet(text, text, text) TO authenticated;

-- =============================================================================
-- c) Upgrade public.jurisdictions (OCD-ID, hierarchy, RLS + public SELECT)
-- =============================================================================
ALTER TABLE public.jurisdictions
  ADD COLUMN IF NOT EXISTS ocd_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.jurisdictions(id) ON DELETE SET NULL;

ALTER TABLE public.jurisdictions
  DROP CONSTRAINT IF EXISTS jurisdictions_level_check;
ALTER TABLE public.jurisdictions
  ADD CONSTRAINT jurisdictions_level_check
  CHECK (level IS NULL OR level IN ('international', 'federal', 'state', 'county', 'municipal', 'local'));

UPDATE public.jurisdictions
   SET metadata = '{}'::jsonb
 WHERE metadata IS NULL;
ALTER TABLE public.jurisdictions
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- Backfill canonical fields on any pre-existing jurisdiction rows
UPDATE public.jurisdictions
   SET country_code = upper(btrim(coalesce(
         country_code,
         CASE WHEN upper(btrim(country)) IN ('USA', 'US', 'UNITED STATES') THEN 'US'
              ELSE left(regexp_replace(upper(btrim(country)), '[^A-Z]', '', 'g'), 3)
         END
       ))),
       level = coalesce(level, type, 'federal'),
       ocd_id = coalesce(
         ocd_id,
         'ocd-division/country:' || lower(
           CASE WHEN upper(btrim(country)) IN ('USA', 'US', 'UNITED STATES') THEN 'us'
                ELSE left(regexp_replace(lower(btrim(country)), '[^a-z]', '', 'g'), 3)
           END
         ) || CASE
           WHEN coalesce(level, type) IN ('federal', 'international') THEN ''
           ELSE '/region:' || regexp_replace(lower(btrim(code)), '[^a-z0-9_-]+', '-', 'g')
         END
       );

CREATE OR REPLACE FUNCTION private.normalize_jurisdiction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.code := btrim(NEW.code);
  IF NEW.country IS NULL AND NEW.country_code IS NOT NULL THEN
    NEW.country := upper(btrim(NEW.country_code));
  END IF;
  IF NEW.country_code IS NULL AND NEW.country IS NOT NULL THEN
    NEW.country_code := CASE
      WHEN upper(btrim(NEW.country)) IN ('USA', 'US', 'UNITED STATES') THEN 'US'
      ELSE left(regexp_replace(upper(btrim(NEW.country)), '[^A-Z]', '', 'g'), 3)
    END;
  ELSE
    NEW.country_code := upper(btrim(NEW.country_code));
  END IF;
  IF NEW.level IS NULL AND NEW.type IS NOT NULL THEN
    NEW.level := lower(btrim(NEW.type));
  END IF;
  IF NEW.ocd_id IS NOT NULL THEN
    NEW.ocd_id := lower(btrim(NEW.ocd_id));
  END IF;
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.normalize_jurisdiction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS jurisdictions_normalize ON public.jurisdictions;
CREATE TRIGGER jurisdictions_normalize
  BEFORE INSERT OR UPDATE ON public.jurisdictions
  FOR EACH ROW EXECUTE FUNCTION private.normalize_jurisdiction();

CREATE INDEX IF NOT EXISTS idx_jurisdictions_parent ON public.jurisdictions(parent_id);

ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Jurisdictions are publicly readable" ON public.jurisdictions;
CREATE POLICY "Jurisdictions are publicly readable" ON public.jurisdictions
  FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.jurisdictions FROM anon, authenticated;
GRANT SELECT ON public.jurisdictions TO anon, authenticated;

-- =============================================================================
-- d) Unify public.data_sources (merge api_sources, NUMERIC(4,3) health_score, RLS)
-- =============================================================================
ALTER TABLE public.data_sources
  DROP CONSTRAINT IF EXISTS data_sources_type_check;
ALTER TABLE public.data_sources
  ADD CONSTRAINT data_sources_type_check
  CHECK (type IS NULL OR type IN ('api', 'scraper', 'manual', 'onchain_rpc'));

ALTER TABLE public.data_sources
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'legislation',
  ADD COLUMN IF NOT EXISTS auth_required boolean NOT NULL DEFAULT false;

UPDATE public.data_sources SET health_score = 1.0 WHERE health_score IS NULL;
ALTER TABLE public.data_sources
  ALTER COLUMN health_score DROP DEFAULT,
  ALTER COLUMN health_score TYPE numeric(4,3)
    USING round(least(greatest(coalesce(health_score, 1.0)::numeric, 0), 1), 3),
  ALTER COLUMN health_score SET DEFAULT 1.000,
  ALTER COLUMN health_score SET NOT NULL;

ALTER TABLE public.data_sources
  DROP CONSTRAINT IF EXISTS data_sources_health_score_check;
ALTER TABLE public.data_sources
  ADD CONSTRAINT data_sources_health_score_check
  CHECK (health_score >= 0 AND health_score <= 1);

CREATE OR REPLACE FUNCTION private.normalize_data_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := trim(both '-' from regexp_replace(lower(NEW.name), '[^a-z0-9]+', '-', 'g'));
  ELSE
    NEW.slug := lower(btrim(NEW.slug));
  END IF;
  NEW.category := coalesce(nullif(btrim(NEW.category), ''), 'legislation');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.normalize_data_source() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS data_sources_normalize ON public.data_sources;
CREATE TRIGGER data_sources_normalize
  BEFORE INSERT OR UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION private.normalize_data_source();

UPDATE public.data_sources
   SET slug = trim(both '-' from regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
 WHERE slug IS NULL;

-- Migrate any rows from legacy api_sources into unified data_sources
INSERT INTO public.data_sources (
  id, slug, name, type, category, base_url, auth_required,
  adapter_status, is_active, last_successful_fetch, health_score, created_at
)
SELECT
  apis.id,
  trim(both '-' from regexp_replace(lower(btrim(apis.name)), '[^a-z0-9]+', '-', 'g')) || '-' || left(apis.id::text, 8),
  btrim(apis.name),
  'api',
  coalesce(nullif(btrim(apis.category), ''), 'legislation'),
  nullif(btrim(apis.url), ''),
  coalesce(apis.auth_required, false),
  CASE apis.status
    WHEN 'active' THEN 'live'
    WHEN 'failing' THEN 'blocked'
    ELSE 'not_integrated'
  END,
  coalesce(apis.status = 'active', true),
  apis.last_polled_at,
  1.000,
  coalesce(apis.created_at, now())
FROM public.api_sources apis
WHERE NOT EXISTS (
  SELECT 1 FROM public.data_sources ds
   WHERE ds.id = apis.id
      OR (ds.base_url IS NOT NULL AND lower(btrim(ds.base_url)) = lower(btrim(apis.url)))
)
ON CONFLICT DO NOTHING;

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Data sources are publicly readable" ON public.data_sources;
CREATE POLICY "Data sources are publicly readable" ON public.data_sources
  FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.data_sources FROM anon, authenticated;
GRANT SELECT ON public.data_sources TO anon, authenticated;

ALTER TABLE public.api_sources ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.api_sources FROM anon, authenticated;
GRANT SELECT ON public.api_sources TO anon, authenticated;

-- =============================================================================
-- e) Upgrade public.bills (TSVECTOR + GIN), bill_actions RLS, ingest_failures RLS
-- =============================================================================
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS session text NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS chamber text,
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS last_action_text text,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(bill_number, '') || ' ' || coalesce(title, '') || ' ' || coalesce(summary_official, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_bills_search_tsv ON public.bills USING GIN (search_tsv);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bills are publicly readable" ON public.bills;
CREATE POLICY "Bills are publicly readable" ON public.bills
  FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bills FROM anon, authenticated;
GRANT SELECT ON public.bills TO anon, authenticated;

ALTER TABLE public.bill_versions ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bill_versions FROM anon, authenticated;
GRANT SELECT ON public.bill_versions TO anon, authenticated;

ALTER TABLE public.bill_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bill actions are publicly readable" ON public.bill_actions;
CREATE POLICY "Bill actions are publicly readable" ON public.bill_actions
  FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_bill_actions_bill_date
  ON public.bill_actions (bill_id, action_date DESC);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bill_actions FROM anon, authenticated;
GRANT SELECT ON public.bill_actions TO anon, authenticated;

-- ingest_failures: RLS enabled, zero anon/authenticated access (service_role only)
ALTER TABLE public.ingest_failures ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'ingest_failures' LOOP
    EXECUTE format('DROP POLICY %I ON public.ingest_failures', p.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.ingest_failures FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ingest_failures TO service_role;

-- =============================================================================
-- f) Close poll_votes privacy leak & create unified civic_proposals tables
-- =============================================================================
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.polls FROM anon, authenticated;
GRANT SELECT ON public.polls TO anon, authenticated;

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.poll_options FROM anon, authenticated;
GRANT SELECT ON public.poll_options TO anon, authenticated;

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read poll_votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can view own poll votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Auth vote poll" ON public.poll_votes;

CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes(user_id);

REVOKE ALL ON public.poll_votes FROM PUBLIC, anon;
REVOKE UPDATE, DELETE, TRUNCATE ON public.poll_votes FROM authenticated;
GRANT SELECT, INSERT ON public.poll_votes TO authenticated;

CREATE POLICY "Users can view own poll votes" ON public.poll_votes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Auth vote poll" ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Unified civic_proposals, civic_proposal_options, civic_proposal_votes
CREATE TABLE IF NOT EXISTS public.civic_proposals (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                     text NOT NULL DEFAULT 'community_proposal'
                             CHECK (kind IN ('community_proposal', 'data_poll')),
  proposer_id              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_id                uuid REFERENCES public.data_sources(id) ON DELETE SET NULL,
  jurisdiction_id          uuid REFERENCES public.jurisdictions(id) ON DELETE SET NULL,
  title                    text NOT NULL CHECK (length(btrim(title)) BETWEEN 5 AND 300),
  description              text,
  category                 text NOT NULL DEFAULT 'General',
  source_url               text,
  bias_score               text,
  context_data             jsonb NOT NULL DEFAULT '{}'::jsonb,
  status                   text NOT NULL DEFAULT 'active'
                             CHECK (status IN ('draft', 'active', 'closed', 'promoted_to_dao', 'archived')),
  promoted_dao_proposal_id text,
  expires_at               timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS civic_proposals_source_url_key
  ON public.civic_proposals (source_url)
  WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_civic_proposals_proposer ON public.civic_proposals(proposer_id);
CREATE INDEX IF NOT EXISTS idx_civic_proposals_jurisdiction ON public.civic_proposals(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_civic_proposals_status_created ON public.civic_proposals(status, created_at DESC);

ALTER TABLE public.civic_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Civic proposals are publicly readable" ON public.civic_proposals;
CREATE POLICY "Civic proposals are publicly readable" ON public.civic_proposals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own civic proposals" ON public.civic_proposals;
CREATE POLICY "Users can insert own civic proposals" ON public.civic_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    proposer_id = (SELECT auth.uid())
    AND kind = 'community_proposal'
    AND promoted_dao_proposal_id IS NULL
  );

REVOKE UPDATE, DELETE, TRUNCATE ON public.civic_proposals FROM anon, authenticated;
REVOKE INSERT ON public.civic_proposals FROM anon;
GRANT SELECT ON public.civic_proposals TO anon, authenticated;
GRANT INSERT ON public.civic_proposals TO authenticated;

CREATE TABLE IF NOT EXISTS public.civic_proposal_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.civic_proposals(id) ON DELETE CASCADE,
  option_key  text NOT NULL CHECK (length(btrim(option_key)) BETWEEN 1 AND 64),
  option_text text NOT NULL CHECK (length(btrim(option_text)) BETWEEN 1 AND 240),
  vote_count  integer NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  sort_order  smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, option_key),
  UNIQUE (id, proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_civic_proposal_options_proposal ON public.civic_proposal_options(proposal_id);

ALTER TABLE public.civic_proposal_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Civic proposal options are publicly readable" ON public.civic_proposal_options;
CREATE POLICY "Civic proposal options are publicly readable" ON public.civic_proposal_options
  FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.civic_proposal_options FROM anon, authenticated;
GRANT SELECT ON public.civic_proposal_options TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.civic_proposal_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.civic_proposals(id) ON DELETE CASCADE,
  option_id   uuid NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, user_id),
  FOREIGN KEY (option_id, proposal_id)
    REFERENCES public.civic_proposal_options(id, proposal_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_civic_proposal_votes_proposal ON public.civic_proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_civic_proposal_votes_user ON public.civic_proposal_votes(user_id);

ALTER TABLE public.civic_proposal_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.civic_proposal_votes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.civic_proposal_votes TO authenticated;

DROP POLICY IF EXISTS "Users can view own civic proposal votes" ON public.civic_proposal_votes;
CREATE POLICY "Users can view own civic proposal votes" ON public.civic_proposal_votes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own civic proposal votes" ON public.civic_proposal_votes;
CREATE POLICY "Users can insert own civic proposal votes" ON public.civic_proposal_votes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own civic proposal votes" ON public.civic_proposal_votes;
CREATE POLICY "Users can update own civic proposal votes" ON public.civic_proposal_votes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own civic proposal votes" ON public.civic_proposal_votes;
CREATE POLICY "Users can delete own civic proposal votes" ON public.civic_proposal_votes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Advisory-locked recount trigger keeping civic_proposal_options.vote_count exact
CREATE OR REPLACE FUNCTION private.apply_civic_proposal_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  p_id uuid;
BEGIN
  FOR p_id IN
    SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.proposal_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.proposal_id END
    ]) AS x
    WHERE x IS NOT NULL
    ORDER BY x
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(p_id::text));
    UPDATE public.civic_proposal_options o
       SET vote_count = (
             SELECT count(*)::integer
               FROM public.civic_proposal_votes v
              WHERE v.proposal_id = p_id AND v.option_id = o.id
           )
     WHERE o.proposal_id = p_id;
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.apply_civic_proposal_vote_counts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS civic_proposal_votes_recount ON public.civic_proposal_votes;
CREATE TRIGGER civic_proposal_votes_recount
  AFTER INSERT OR UPDATE OR DELETE ON public.civic_proposal_votes
  FOR EACH ROW EXECUTE FUNCTION private.apply_civic_proposal_vote_counts();

-- =============================================================================
-- g) On-chain DAO Read Cache: public.dao_proposals & public.dao_votes
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.dao_proposals (
  chain_id         integer NOT NULL REFERENCES public.chain_networks(chain_id),
  proposal_id      text NOT NULL CHECK (btrim(proposal_id) <> ''),
  proposer_address text NOT NULL CHECK (proposer_address ~* '^0x[0-9a-f]{40}$'),
  targets          jsonb NOT NULL DEFAULT '[]'::jsonb,
  values           jsonb NOT NULL DEFAULT '[]'::jsonb,
  calldatas        jsonb NOT NULL DEFAULT '[]'::jsonb,
  description      text,
  description_hash text NOT NULL CHECK (btrim(description_hash) <> ''),
  state            smallint NOT NULL DEFAULT 0 CHECK (state BETWEEN 0 AND 7),
  for_votes        numeric(78,0) NOT NULL DEFAULT 0 CHECK (for_votes >= 0),
  against_votes    numeric(78,0) NOT NULL DEFAULT 0 CHECK (against_votes >= 0),
  abstain_votes    numeric(78,0) NOT NULL DEFAULT 0 CHECK (abstain_votes >= 0),
  eta_timestamp    timestamptz,
  synced_block     bigint NOT NULL DEFAULT 0 CHECK (synced_block >= 0),
  synced_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_dao_proposals_proposer ON public.dao_proposals(chain_id, lower(proposer_address));
CREATE INDEX IF NOT EXISTS idx_dao_proposals_state ON public.dao_proposals(chain_id, state);

ALTER TABLE public.dao_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DAO proposals are publicly readable" ON public.dao_proposals;
CREATE POLICY "DAO proposals are publicly readable" ON public.dao_proposals
  FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dao_proposals FROM anon, authenticated;
GRANT SELECT ON public.dao_proposals TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.dao_votes (
  chain_id      integer NOT NULL,
  proposal_id   text NOT NULL,
  voter_address text NOT NULL CHECK (voter_address ~* '^0x[0-9a-f]{40}$'),
  tx_hash       text,
  log_index     integer NOT NULL DEFAULT 0,
  support       smallint NOT NULL CHECK (support IN (0, 1, 2)),
  weight        numeric(78,0) NOT NULL DEFAULT 0 CHECK (weight >= 0),
  reason        text,
  block_number  bigint NOT NULL DEFAULT 0 CHECK (block_number >= 0),
  voted_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, proposal_id, voter_address),
  FOREIGN KEY (chain_id, proposal_id)
    REFERENCES public.dao_proposals(chain_id, proposal_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dao_votes_voter ON public.dao_votes(chain_id, lower(voter_address));

ALTER TABLE public.dao_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DAO votes are publicly readable" ON public.dao_votes;
CREATE POLICY "DAO votes are publicly readable" ON public.dao_votes
  FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dao_votes FROM anon, authenticated;
GRANT SELECT ON public.dao_votes TO anon, authenticated;

-- =============================================================================
-- h) Upgrade all user-scoped RLS policies to (SELECT auth.uid()) initPlan,
--    add missing user_id B-tree indexes, and install rls_auto_enable() trigger
-- =============================================================================

-- shadow_votes: owner-only authenticated access + user_id index
CREATE INDEX IF NOT EXISTS idx_shadow_votes_user ON public.shadow_votes(user_id);
REVOKE ALL ON public.shadow_votes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shadow_votes TO authenticated;

DROP POLICY IF EXISTS "Users can view their own votes" ON public.shadow_votes;
CREATE POLICY "Users can view their own votes" ON public.shadow_votes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own votes" ON public.shadow_votes;
CREATE POLICY "Users can insert their own votes" ON public.shadow_votes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON public.shadow_votes;
CREATE POLICY "Users can update their own votes" ON public.shadow_votes
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON public.shadow_votes;
CREATE POLICY "Users can delete their own votes" ON public.shadow_votes
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- user_profiles: owner-only authenticated access + initPlan
REVOKE ALL ON public.user_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- tracked_bills: owner-only authenticated access + initPlan
REVOKE ALL ON public.tracked_bills FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_bills TO authenticated;

DROP POLICY IF EXISTS "Users can manage own tracked bills" ON public.tracked_bills;
CREATE POLICY "Users can manage own tracked bills" ON public.tracked_bills
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- wallet_links & wallet_link_challenges: strictly owner-only SELECT + initPlan
DROP POLICY IF EXISTS "wallet challenges select own" ON public.wallet_link_challenges;
CREATE POLICY "wallet challenges select own" ON public.wallet_link_challenges
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "wallet links select own" ON public.wallet_links;
CREATE POLICY "wallet links select own" ON public.wallet_links
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- voting_proposals: preserve /api/propose compatibility + initPlan + proposer index
CREATE INDEX IF NOT EXISTS idx_voting_proposals_proposer ON public.voting_proposals(proposer_id);
DROP POLICY IF EXISTS "Users can propose as themselves" ON public.voting_proposals;
CREATE POLICY "Users can propose as themselves" ON public.voting_proposals
  FOR INSERT TO authenticated
  WITH CHECK (proposer_id = (SELECT auth.uid()));

-- DDL Event Trigger: automatically enable RLS on every future table in public
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
      FROM pg_event_trigger_ddl_commands()
     WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
       AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
