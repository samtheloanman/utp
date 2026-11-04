-- voting_proposals: community-submitted proposals (POST /api/propose).
-- Written defensively: the remote table may already exist with a different
-- shape (NOT_RUN: remote shape unverified). Create if missing, then add the
-- columns/constraints this API relies on without dropping anything.

CREATE TABLE IF NOT EXISTS public.voting_proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    source_url text UNIQUE,
    bias_score text,
    category text,
    status text DEFAULT 'active',
    proposer_id uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- If the table pre-existed, make sure the proposer column is present.
ALTER TABLE public.voting_proposals
    ADD COLUMN IF NOT EXISTS proposer_id uuid REFERENCES auth.users(id);

-- If the table pre-existed without a unique source_url, add one (empty strings
-- from the old route are normalised to NULL first so they cannot collide).
UPDATE public.voting_proposals SET source_url = NULL WHERE source_url = '';
CREATE UNIQUE INDEX IF NOT EXISTS voting_proposals_source_url_key
    ON public.voting_proposals (source_url);

ALTER TABLE public.voting_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voting proposals are publicly readable" ON public.voting_proposals;
CREATE POLICY "Voting proposals are publicly readable" ON public.voting_proposals
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can propose as themselves" ON public.voting_proposals;
CREATE POLICY "Users can propose as themselves" ON public.voting_proposals
    FOR INSERT TO authenticated
    WITH CHECK (proposer_id = auth.uid());

-- Writes are insert-only for API roles; no client update/delete.
REVOKE UPDATE, DELETE, TRUNCATE ON public.voting_proposals FROM anon, authenticated;
REVOKE INSERT ON public.voting_proposals FROM anon;
GRANT SELECT ON public.voting_proposals TO anon, authenticated;
GRANT INSERT ON public.voting_proposals TO authenticated;
