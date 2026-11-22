-- Security hotfix: API-role grants and draft visibility.
--
-- Supabase's default privileges give anon and authenticated every table
-- privilege on each new table in public. Row-level security then decides
-- rows, but TRUNCATE is not subject to RLS, and UPDATE/DELETE were left on
-- tables whose rows must not be rewritten.
--
-- Idempotent and additive: no table, row or column is dropped.
--
-- Deliberately unchanged: UPDATE and DELETE on public.shadow_votes. The live
-- /api/vote upserts (INSERT ... ON CONFLICT DO UPDATE needs UPDATE), and RLS
-- already limits both to the caller's own row. That table is replaced by the
-- append-only ledger in the next migration.

-- 1. TRUNCATE ignores RLS: no API role may hold it on any public table.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 2. Proposal votes are insert-only for API roles.
REVOKE UPDATE, DELETE ON public.civic_proposal_votes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vote_aggregates FROM anon, authenticated;

-- 3. A profile owner may change the username and nothing else.
REVOKE UPDATE, DELETE ON public.user_profiles FROM anon, authenticated;
GRANT UPDATE (username) ON public.user_profiles TO authenticated;

-- 4. New tables: API roles start with SELECT only (RLS still decides rows).
--    A migration that wants API writes on a new table must GRANT them.
--    Covers the role running this migration and, where they exist and this
--    role may alter them, the two roles that own tables on Supabase.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

DO $$
DECLARE
    r text;
BEGIN
    FOREACH r IN ARRAY ARRAY['postgres', 'supabase_admin'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            BEGIN
                EXECUTE format(
                    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
                    'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated',
                    r);
            EXCEPTION WHEN insufficient_privilege THEN
                RAISE NOTICE 'default privileges for role % not changed: insufficient privilege', r;
            END;
        END IF;
    END LOOP;
END $$;

-- 5. Draft proposals are visible only to their proposer.
DROP POLICY IF EXISTS "Civic proposals are publicly readable" ON public.civic_proposals;
DROP POLICY IF EXISTS "Published civic proposals are publicly readable" ON public.civic_proposals;
CREATE POLICY "Published civic proposals are publicly readable" ON public.civic_proposals
    FOR SELECT
    USING (status <> 'draft' OR proposer_id = (SELECT auth.uid()));
