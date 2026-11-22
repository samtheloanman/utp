-- Unified, tamper-evident vote ledger.
--
-- One append-only table (vote_events) records every cast and every change of
-- vote on any ballot. A ballot is a row of civic_proposals; its options and
-- running tallies are civic_proposal_options. Each event hashes the previous
-- one for its ballot, so any later edit breaks the chain. Votes enter only
-- through cast_vote(); no role may update or delete an event.
--
-- The ledger never stores a user id. It stores a keyed hash of (user, ballot)
-- made with a secret that never leaves the database. The link from a user to
-- their current vote lives in vote_voter_links, which is deleted with the
-- account while the ledger stays intact.
--
-- Replaces three overlapping vote families. The legacy tables are dropped
-- only if they are empty; the migration aborts otherwise.

-- 0. Refuse to destroy data. ------------------------------------------------
DO $$
DECLARE
    t text;
    n bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY['poll_votes', 'poll_options', 'polls', 'api_sources',
                             'civic_proposal_votes', 'shadow_votes', 'vote_aggregates', 'voting_proposals'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
            IF n > 0 THEN
                RAISE EXCEPTION 'refusing to drop public.%: it holds % row(s)', t, n;
            END IF;
        END IF;
    END LOOP;
END $$;

DROP TABLE IF EXISTS public.poll_votes;
DROP TABLE IF EXISTS public.poll_options;
DROP TABLE IF EXISTS public.polls;
DROP TABLE IF EXISTS public.api_sources;
DROP TABLE IF EXISTS public.civic_proposal_votes;
DROP FUNCTION IF EXISTS private.apply_civic_proposal_vote_counts();
DROP FUNCTION IF EXISTS public.verify_vote_aggregates();
DROP TABLE IF EXISTS public.shadow_votes;
DROP TABLE IF EXISTS public.vote_aggregates;
DROP FUNCTION IF EXISTS public.apply_vote_aggregate();
DROP FUNCTION IF EXISTS public.recompute_vote_aggregate(uuid);
DROP TABLE IF EXISTS public.voting_proposals;

-- 1. Secret for voter commitments. -------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS private.ledger_settings (
    id integer PRIMARY KEY CHECK (id = 1),
    vote_hmac_key text NOT NULL CHECK (length(vote_hmac_key) >= 64)
);
REVOKE ALL ON private.ledger_settings FROM PUBLIC, anon, authenticated;
-- Generated inside the database; never read by the application.
INSERT INTO private.ledger_settings (id, vote_hmac_key)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

-- 2. Ballots: civic_proposals. ------------------------------------------------
DO $$
DECLARE
    c text;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
              WHERE conrelid = 'public.civic_proposals'::regclass AND contype = 'c'
                AND pg_get_constraintdef(oid) LIKE '%kind = ANY%' LOOP
        EXECUTE format('ALTER TABLE public.civic_proposals DROP CONSTRAINT %I', c);
    END LOOP;
END $$;
ALTER TABLE public.civic_proposals
    ADD CONSTRAINT civic_proposals_kind_check
    CHECK (kind IN ('bill_sentiment', 'data_poll', 'community_proposal', 'forecast'));

ALTER TABLE public.civic_proposals
    ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bill_content_sha256 text,
    ADD COLUMN IF NOT EXISTS head_hash bytea NOT NULL DEFAULT decode(repeat('00', 32), 'hex'),
    ADD COLUMN IF NOT EXISTS vote_change_allowed boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS opens_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS closes_at timestamptz,
    ADD COLUMN IF NOT EXISTS manual_lock boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_civic_proposals_bill ON public.civic_proposals (bill_id);
-- One sentiment ballot per bill; one community proposal per source link.
CREATE UNIQUE INDEX IF NOT EXISTS civic_proposals_bill_sentiment_key
    ON public.civic_proposals (bill_id) WHERE kind = 'bill_sentiment';
CREATE UNIQUE INDEX IF NOT EXISTS civic_proposals_source_url_key
    ON public.civic_proposals (source_url) WHERE kind = 'community_proposal' AND source_url IS NOT NULL;

-- A signed-in user may propose, but only sets the descriptive columns.
REVOKE INSERT, UPDATE, DELETE ON public.civic_proposals FROM anon, authenticated;
GRANT INSERT (title, description, source_url, bias_score, category, bill_id, proposer_id, kind)
    ON public.civic_proposals TO authenticated;

-- Bill-sentiment ballots and community proposals vote For / Against / Unsure.
CREATE OR REPLACE FUNCTION private.add_default_ballot_options() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
    INSERT INTO public.civic_proposal_options (proposal_id, option_key, option_text, sort_order)
    VALUES (NEW.id, 'for', 'For', 0), (NEW.id, 'against', 'Against', 1), (NEW.id, 'unsure', 'Unsure', 2)
    ON CONFLICT (proposal_id, option_key) DO NOTHING;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS civic_proposals_default_options ON public.civic_proposals;
CREATE TRIGGER civic_proposals_default_options
    AFTER INSERT ON public.civic_proposals
    FOR EACH ROW WHEN (NEW.kind IN ('bill_sentiment', 'community_proposal'))
    EXECUTE FUNCTION private.add_default_ballot_options();

-- 3. Profiles: every account gets one. ---------------------------------------
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS identity_level smallint NOT NULL DEFAULT 1 CHECK (identity_level BETWEEN 1 AND 3);

CREATE OR REPLACE FUNCTION private.create_profile_for_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
    INSERT INTO public.user_profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS create_profile_for_user ON auth.users;
CREATE TRIGGER create_profile_for_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION private.create_profile_for_user();
INSERT INTO public.user_profiles (id) SELECT id FROM auth.users ON CONFLICT (id) DO NOTHING;

-- 4. The ledger. ---------------------------------------------------------------
CREATE TABLE public.vote_events (
    seq bigserial PRIMARY KEY,
    id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    ballot_id uuid NOT NULL REFERENCES public.civic_proposals(id),
    option_id uuid NOT NULL,
    voter_commitment bytea NOT NULL,
    event_kind text NOT NULL CHECK (event_kind IN ('cast', 'supersede')),
    identity_level smallint NOT NULL DEFAULT 1,
    prev_hash bytea NOT NULL,
    row_hash bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Reserved for on-chain anchoring and signed receipts.
    merkle_batch_id uuid,
    receipt_sig bytea,
    sig_alg text,
    FOREIGN KEY (option_id, ballot_id) REFERENCES public.civic_proposal_options (id, proposal_id),
    UNIQUE (ballot_id, prev_hash)
);
CREATE INDEX idx_vote_events_option ON public.vote_events (option_id, ballot_id);
ALTER TABLE public.vote_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vote_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.vote_events_seq_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.reject_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    RAISE EXCEPTION 'vote_events is append-only: % is not allowed', TG_OP USING ERRCODE = '0A000';
END $$;
CREATE TRIGGER vote_events_append_only
    BEFORE UPDATE OR DELETE ON public.vote_events
    FOR EACH ROW EXECUTE FUNCTION private.reject_ledger_mutation();
CREATE TRIGGER vote_events_no_truncate
    BEFORE TRUNCATE ON public.vote_events
    FOR EACH STATEMENT EXECUTE FUNCTION private.reject_ledger_mutation();

-- Who currently holds which vote. Deleted with the account; the ledger is not.
CREATE TABLE public.vote_voter_links (
    ballot_id uuid NOT NULL REFERENCES public.civic_proposals(id),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    voter_commitment bytea NOT NULL,
    current_option_id uuid NOT NULL,
    last_event_seq bigint NOT NULL REFERENCES public.vote_events(seq),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (ballot_id, user_id)
);
CREATE INDEX idx_vote_voter_links_user ON public.vote_voter_links (user_id);
CREATE INDEX idx_vote_voter_links_event ON public.vote_voter_links (last_event_seq);
ALTER TABLE public.vote_voter_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vote_voter_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vote_voter_links TO authenticated;
CREATE POLICY "Users can view their own vote links" ON public.vote_voter_links
    FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- 5. Hashing. -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.vote_row_hash(
    p_prev bytea, p_id uuid, p_ballot uuid, p_option uuid, p_commitment bytea,
    p_kind text, p_level smallint, p_at timestamptz
) RETURNS bytea
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
    SELECT extensions.digest(
        p_prev || convert_to(concat_ws('|',
            p_id::text, p_ballot::text, p_option::text, encode(p_commitment, 'hex'), p_kind, p_level::text,
            to_char(p_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')), 'UTF8'),
        'sha256')
$$;

-- 6. Casting a vote. ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_vote(p_ballot_id uuid, p_option_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_ballot public.civic_proposals%ROWTYPE;
    v_link public.vote_voter_links%ROWTYPE;
    v_event public.vote_events%ROWTYPE;
    v_key text;
    v_commitment bytea;
    v_level smallint;
    v_kind text := 'cast';
    v_id uuid := gen_random_uuid();
    v_at timestamptz := clock_timestamp();
    v_hash bytea;
    v_seq bigint;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'sign in to vote' USING ERRCODE = '28000';
    END IF;

    -- One writer per ballot at a time, so the hash chain cannot fork.
    SELECT * INTO v_ballot FROM public.civic_proposals WHERE id = p_ballot_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'unknown ballot' USING ERRCODE = 'P0002';
    END IF;
    IF v_ballot.status <> 'active' OR v_at < v_ballot.opens_at
       OR (v_ballot.closes_at IS NOT NULL AND v_at >= v_ballot.closes_at) THEN
        RAISE EXCEPTION 'ballot is not open' USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.civic_proposal_options WHERE id = p_option_id AND proposal_id = p_ballot_id) THEN
        RAISE EXCEPTION 'unknown option for this ballot' USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_link FROM public.vote_voter_links WHERE ballot_id = p_ballot_id AND user_id = v_uid;
    IF FOUND THEN
        IF v_link.current_option_id = p_option_id THEN
            SELECT * INTO v_event FROM public.vote_events WHERE seq = v_link.last_event_seq;
            RETURN jsonb_build_object(
                'event_seq', v_event.seq, 'event_kind', v_event.event_kind, 'changed', false,
                'row_hash', encode(v_event.row_hash, 'hex'), 'prev_hash', encode(v_event.prev_hash, 'hex'),
                'created_at', v_event.created_at);
        END IF;
        IF NOT v_ballot.vote_change_allowed THEN
            RAISE EXCEPTION 'this ballot does not allow changing a vote' USING ERRCODE = 'P0001';
        END IF;
        v_kind := 'supersede';
    END IF;

    SELECT vote_hmac_key INTO v_key FROM private.ledger_settings WHERE id = 1;
    IF v_key IS NULL THEN
        RAISE EXCEPTION 'vote ledger is not configured' USING ERRCODE = 'P0001';
    END IF;
    v_commitment := extensions.hmac(
        convert_to(v_uid::text || ':' || p_ballot_id::text, 'UTF8'), convert_to(v_key, 'UTF8'), 'sha256');
    SELECT coalesce((SELECT identity_level FROM public.user_profiles WHERE id = v_uid), 1) INTO v_level;

    v_hash := private.vote_row_hash(v_ballot.head_hash, v_id, p_ballot_id, p_option_id, v_commitment, v_kind, v_level, v_at);
    INSERT INTO public.vote_events
        (id, ballot_id, option_id, voter_commitment, event_kind, identity_level, prev_hash, row_hash, created_at)
    VALUES (v_id, p_ballot_id, p_option_id, v_commitment, v_kind, v_level, v_ballot.head_hash, v_hash, v_at)
    RETURNING seq INTO v_seq;

    IF v_kind = 'supersede' THEN
        UPDATE public.civic_proposal_options SET vote_count = vote_count - 1 WHERE id = v_link.current_option_id;
    END IF;
    UPDATE public.civic_proposal_options SET vote_count = vote_count + 1 WHERE id = p_option_id;
    UPDATE public.civic_proposals SET head_hash = v_hash WHERE id = p_ballot_id;

    INSERT INTO public.vote_voter_links (ballot_id, user_id, voter_commitment, current_option_id, last_event_seq, updated_at)
    VALUES (p_ballot_id, v_uid, v_commitment, p_option_id, v_seq, v_at)
    ON CONFLICT (ballot_id, user_id) DO UPDATE
        SET current_option_id = EXCLUDED.current_option_id,
            last_event_seq = EXCLUDED.last_event_seq,
            updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
        'event_seq', v_seq, 'event_kind', v_kind, 'changed', true,
        'row_hash', encode(v_hash, 'hex'), 'prev_hash', encode(v_ballot.head_hash, 'hex'), 'created_at', v_at);
END $$;

-- For / against / unsure on a stored bill; opens the bill's ballot on first use.
CREATE OR REPLACE FUNCTION public.cast_bill_vote(p_bill_id uuid, p_vote text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_title text;
    v_ballot uuid;
    v_option uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'sign in to vote' USING ERRCODE = '28000';
    END IF;
    SELECT title INTO v_title FROM public.bills WHERE id = p_bill_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'unknown bill' USING ERRCODE = 'P0002';
    END IF;

    SELECT id INTO v_ballot FROM public.civic_proposals WHERE kind = 'bill_sentiment' AND bill_id = p_bill_id;
    IF NOT FOUND THEN
        INSERT INTO public.civic_proposals (kind, title, bill_id)
        VALUES ('bill_sentiment', left('Bill vote: ' || v_title, 300), p_bill_id)
        ON CONFLICT (bill_id) WHERE kind = 'bill_sentiment' DO NOTHING;
        SELECT id INTO v_ballot FROM public.civic_proposals WHERE kind = 'bill_sentiment' AND bill_id = p_bill_id;
    END IF;

    SELECT id INTO v_option FROM public.civic_proposal_options WHERE proposal_id = v_ballot AND option_key = p_vote;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'vote must be for, against or unsure' USING ERRCODE = '22023';
    END IF;
    RETURN public.cast_vote(v_ballot, v_option);
END $$;

-- The caller's current vote on a bill, or NULL.
CREATE OR REPLACE FUNCTION public.my_bill_vote(p_bill_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
    SELECT o.option_key
      FROM public.vote_voter_links l
      JOIN public.civic_proposals c ON c.id = l.ballot_id
      JOIN public.civic_proposal_options o ON o.id = l.current_option_id
     WHERE c.kind = 'bill_sentiment' AND c.bill_id = p_bill_id AND l.user_id = auth.uid()
$$;

-- 7. Audit. ---------------------------------------------------------------------
-- True when every event links to the one before it, every stored hash matches
-- its recomputed value, and the last hash is the ballot's head.
CREATE OR REPLACE FUNCTION public.verify_ballot_chain(p_ballot_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_head bytea := decode(repeat('00', 32), 'hex');
    v_stored bytea;
    e public.vote_events%ROWTYPE;
BEGIN
    SELECT head_hash INTO v_stored FROM public.civic_proposals WHERE id = p_ballot_id;
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    FOR e IN SELECT * FROM public.vote_events WHERE ballot_id = p_ballot_id ORDER BY seq LOOP
        IF e.prev_hash <> v_head OR e.row_hash <> private.vote_row_hash(
               e.prev_hash, e.id, e.ballot_id, e.option_id, e.voter_commitment, e.event_kind, e.identity_level, e.created_at) THEN
            RETURN false;
        END IF;
        v_head := e.row_hash;
    END LOOP;
    RETURN v_head = v_stored;
END $$;

-- True when each option's stored count equals the number of voters whose latest event chose it.
CREATE OR REPLACE FUNCTION public.verify_tallies(p_ballot_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
    WITH latest AS (
        SELECT DISTINCT ON (voter_commitment) option_id
          FROM public.vote_events WHERE ballot_id = p_ballot_id
         ORDER BY voter_commitment, seq DESC
    ), counted AS (
        SELECT option_id, count(*) AS n FROM latest GROUP BY option_id
    )
    SELECT NOT EXISTS (
        SELECT 1 FROM public.civic_proposal_options o
          LEFT JOIN counted c ON c.option_id = o.id
         WHERE o.proposal_id = p_ballot_id AND o.vote_count <> coalesce(c.n, 0))
$$;

REVOKE ALL ON FUNCTION public.cast_vote(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cast_bill_vote(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_bill_vote(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_ballot_chain(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_tallies(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_bill_vote(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_bill_vote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ballot_chain(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_tallies(uuid) TO anon, authenticated;
