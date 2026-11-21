-- voting_proposals: community-submitted proposals (POST /api/propose).
-- Written defensively: the remote table may already exist with a different
-- shape (NOT_RUN: remote shape unverified). Create if missing, then add the
-- columns/constraints this API relies on without dropping anything.

CREATE TABLE IF NOT EXISTS public.voting_proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    source_url text,
    bias_score text,
    category text,
    status text DEFAULT 'active',
    proposer_id uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- If the table pre-existed, make sure the proposer column is present.
ALTER TABLE public.voting_proposals
    ADD COLUMN IF NOT EXISTS proposer_id uuid REFERENCES auth.users(id);

-- Legacy-shape compatibility: the old route inserted votes_for/votes_against/
-- created_at/status explicitly and source_url as ''. The new route sends none
-- of the vote columns, so give them defaults (only where the column exists).
DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('votes_for', '0'), ('votes_against', '0'),
        ('created_at', 'now()'), ('status', '''active''')
    ) AS d(col, def) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'voting_proposals'
                      AND column_name = r.col) THEN
            EXECUTE format('ALTER TABLE public.voting_proposals ALTER COLUMN %I SET DEFAULT %s', r.col, r.def);
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'voting_proposals'
                  AND column_name = 'source_url') THEN
        ALTER TABLE public.voting_proposals ALTER COLUMN source_url DROP NOT NULL;
    END IF;
END $$;

-- Empty strings from the old route are normalised to NULL so they cannot
-- collide under the unique index.
UPDATE public.voting_proposals SET source_url = NULL WHERE source_url = '';
CREATE UNIQUE INDEX IF NOT EXISTS voting_proposals_source_url_key
    ON public.voting_proposals (source_url);

ALTER TABLE public.voting_proposals ENABLE ROW LEVEL SECURITY;

-- Drop EVERY existing policy first: a legacy permissive INSERT policy would
-- otherwise be OR-ed with ours and bypass proposer_id = auth.uid().
DO $$
DECLARE p record;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'voting_proposals' LOOP
        EXECUTE format('DROP POLICY %I ON public.voting_proposals', p.policyname);
    END LOOP;
END $$;

CREATE POLICY "Voting proposals are publicly readable" ON public.voting_proposals
    FOR SELECT USING (true);

CREATE POLICY "Users can propose as themselves" ON public.voting_proposals
    FOR INSERT TO authenticated
    WITH CHECK (proposer_id = auth.uid());

-- Writes are insert-only for API roles; no client update/delete.
REVOKE UPDATE, DELETE, TRUNCATE ON public.voting_proposals FROM anon, authenticated;
REVOKE INSERT ON public.voting_proposals FROM anon;
GRANT SELECT ON public.voting_proposals TO anon, authenticated;
GRANT INSERT ON public.voting_proposals TO authenticated;
