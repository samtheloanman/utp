-- Tie a community proposal to the stored bill it is about.
ALTER TABLE public.voting_proposals
    ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_voting_proposals_bill ON public.voting_proposals (bill_id);
