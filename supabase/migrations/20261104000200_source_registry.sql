-- Source registry: adapter status tracking, ingest failures, bill record versions.
-- Not applied to any remote database by this task.

ALTER TABLE jurisdictions DROP CONSTRAINT IF EXISTS jurisdictions_type_check;
ALTER TABLE jurisdictions ADD CONSTRAINT jurisdictions_type_check
    CHECK (type IN ('federal', 'state', 'international', 'local'));

ALTER TABLE data_sources
    ADD COLUMN IF NOT EXISTS jurisdiction_id UUID REFERENCES jurisdictions(id),
    ADD COLUMN IF NOT EXISTS adapter_status TEXT NOT NULL DEFAULT 'not_integrated'
        CHECK (adapter_status IN ('live', 'stale', 'blocked', 'not_integrated')),
    ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE TABLE IF NOT EXISTS ingest_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    external_id TEXT,
    error TEXT NOT NULL,
    payload_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ingest_failures_source ON ingest_failures(source_id, created_at DESC);

-- record_hash identifies a fetched record state, not a bill-text version.
CREATE TABLE IF NOT EXISTS bill_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    record_hash TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL,
    UNIQUE (bill_id, record_hash)
);

-- Service-role/ingest only: RLS on with no public policies.
ALTER TABLE ingest_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bill versions are publicly readable" ON bill_versions;
CREATE POLICY "Bill versions are publicly readable" ON bill_versions FOR SELECT USING (true);
