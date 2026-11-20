-- The Legistar adapter used to store a multi-line matter title in
-- bills.summary_official, which /api/debate presents as an official summary.
-- Keep that text in its own column and clear the false summaries.
-- Idempotent: the move only touches rows that still hold a summary.

ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS source_title text;

UPDATE public.bills b
   SET source_title = b.summary_official,
       summary_official = NULL
  FROM public.data_sources s
 WHERE s.id = b.source_id
   AND s.slug LIKE 'legistar-%'
   AND b.summary_official IS NOT NULL;
