-- Vote integrity: owner-only UPDATE/DELETE on shadow_votes, trigger-maintained
-- vote_aggregates (recompute under a per-bill advisory lock), a drift checker,
-- and no direct writes to vote_aggregates from API roles.

-- 1. Owner-only update/delete (INSERT/SELECT policies already exist).
DROP POLICY IF EXISTS "Users can update their own votes" ON public.shadow_votes;
CREATE POLICY "Users can update their own votes" ON public.shadow_votes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON public.shadow_votes;
CREATE POLICY "Users can delete their own votes" ON public.shadow_votes FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Recompute one bill's aggregate. Caller must hold the bill's advisory lock.
CREATE OR REPLACE FUNCTION public.recompute_vote_aggregate(p_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO public.vote_aggregates AS va
        (bill_id, count_for, count_against, count_unsure, total_votes, last_updated)
    SELECT p_bill_id,
           count(*) FILTER (WHERE vote = 'for'),
           count(*) FILTER (WHERE vote = 'against'),
           count(*) FILTER (WHERE vote = 'unsure'),
           count(*),
           now()
      FROM public.shadow_votes
     WHERE bill_id = p_bill_id
    ON CONFLICT (bill_id) DO UPDATE
       SET count_for     = EXCLUDED.count_for,
           count_against = EXCLUDED.count_against,
           count_unsure  = EXCLUDED.count_unsure,
           total_votes   = EXCLUDED.total_votes,
           last_updated  = EXCLUDED.last_updated;
END;
$$;

-- 3. Trigger: lock affected bill(s) (sorted, to avoid deadlocks), then recount.
-- Locking before counting means each recount runs after any concurrent writer
-- on the same bill has committed, so a stale count can never overwrite a newer one.
CREATE OR REPLACE FUNCTION public.apply_vote_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    b uuid;
BEGIN
    FOR b IN
        SELECT DISTINCT x FROM unnest(ARRAY[
            CASE WHEN TG_OP <> 'INSERT' THEN OLD.bill_id END,
            CASE WHEN TG_OP <> 'DELETE' THEN NEW.bill_id END
        ]) AS x
        WHERE x IS NOT NULL
        ORDER BY x
    LOOP
        PERFORM pg_advisory_xact_lock(hashtext(b::text));
    END LOOP;

    FOR b IN
        SELECT DISTINCT x FROM unnest(ARRAY[
            CASE WHEN TG_OP <> 'INSERT' THEN OLD.bill_id END,
            CASE WHEN TG_OP <> 'DELETE' THEN NEW.bill_id END
        ]) AS x
        WHERE x IS NOT NULL
    LOOP
        -- A bill being deleted cascades its aggregate away; skip it.
        IF EXISTS (SELECT 1 FROM public.bills WHERE id = b) THEN
            PERFORM public.recompute_vote_aggregate(b);
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS shadow_votes_apply_aggregate ON public.shadow_votes;
CREATE TRIGGER shadow_votes_apply_aggregate
    AFTER INSERT OR UPDATE OR DELETE ON public.shadow_votes
    FOR EACH ROW EXECUTE FUNCTION public.apply_vote_aggregate();

-- 4. Drift checker: one row per bill whose stored aggregate differs from a recount.
CREATE OR REPLACE FUNCTION public.verify_vote_aggregates()
RETURNS TABLE (
    bill_id uuid,
    stored_for integer, stored_against integer, stored_unsure integer, stored_total integer,
    actual_for bigint, actual_against bigint, actual_unsure bigint, actual_total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    WITH actual AS (
        SELECT sv.bill_id,
               count(*) FILTER (WHERE sv.vote = 'for')     AS f,
               count(*) FILTER (WHERE sv.vote = 'against') AS a,
               count(*) FILTER (WHERE sv.vote = 'unsure')  AS u,
               count(*)                                    AS t
          FROM public.shadow_votes sv
         WHERE sv.bill_id IS NOT NULL
         GROUP BY sv.bill_id
    )
    SELECT coalesce(va.bill_id, ac.bill_id),
           va.count_for, va.count_against, va.count_unsure, va.total_votes,
           coalesce(ac.f, 0), coalesce(ac.a, 0), coalesce(ac.u, 0), coalesce(ac.t, 0)
      FROM public.vote_aggregates va
      FULL OUTER JOIN actual ac ON ac.bill_id = va.bill_id
     WHERE coalesce(va.count_for, 0)     IS DISTINCT FROM coalesce(ac.f, 0)
        OR coalesce(va.count_against, 0) IS DISTINCT FROM coalesce(ac.a, 0)
        OR coalesce(va.count_unsure, 0)  IS DISTINCT FROM coalesce(ac.u, 0)
        OR coalesce(va.total_votes, 0)   IS DISTINCT FROM coalesce(ac.t, 0);
$$;

-- 5. Privileges: functions are internal/operator-only; aggregates are read-only to API roles.
REVOKE ALL ON FUNCTION public.recompute_vote_aggregate(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_vote_aggregate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_vote_aggregates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_vote_aggregates() TO service_role;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.vote_aggregates FROM anon, authenticated;
GRANT SELECT ON public.vote_aggregates TO anon, authenticated;

-- 6. One-time backfill so pre-existing aggregates match the votes table.
DO $$
DECLARE b uuid;
BEGIN
    FOR b IN SELECT DISTINCT sv.bill_id FROM public.shadow_votes sv
              JOIN public.bills bl ON bl.id = sv.bill_id ORDER BY 1 LOOP
        PERFORM pg_advisory_xact_lock(hashtext(b::text));
        PERFORM public.recompute_vote_aggregate(b);
    END LOOP;
END $$;
