-- Add covering indexes for foreign keys flagged by Supabase performance advisor.
-- Idempotent (IF NOT EXISTS). Not applied to any remote database by this migration file alone.

CREATE INDEX IF NOT EXISTS idx_civic_proposal_votes_option_proposal
  ON public.civic_proposal_votes (option_id, proposal_id);

CREATE INDEX IF NOT EXISTS idx_civic_proposals_source
  ON public.civic_proposals (source_id);

CREATE INDEX IF NOT EXISTS idx_data_sources_jurisdiction
  ON public.data_sources (jurisdiction_id);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll
  ON public.poll_options (poll_id);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option
  ON public.poll_votes (option_id);

CREATE INDEX IF NOT EXISTS idx_polls_source
  ON public.polls (source_id);

CREATE INDEX IF NOT EXISTS idx_tracked_bills_bill
  ON public.tracked_bills (bill_id);

CREATE INDEX IF NOT EXISTS idx_wallet_link_challenges_chain
  ON public.wallet_link_challenges (chain_id);

CREATE INDEX IF NOT EXISTS idx_wallet_links_chain
  ON public.wallet_links (chain_id);
