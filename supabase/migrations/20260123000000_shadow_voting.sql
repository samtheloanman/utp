-- Core Tables for Shadow Voting

-- Jurisdictions
CREATE TABLE IF NOT EXISTS jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('federal', 'state', 'international')),
    country TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Sources
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('api', 'scraper', 'manual')),
    base_url TEXT,
    docs_url TEXT,
    license TEXT,
    attribution_required BOOLEAN DEFAULT false,
    rate_limit_per_hour INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_successful_fetch TIMESTAMPTZ,
    health_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE CASCADE,
    source_id UUID REFERENCES data_sources(id),
    external_id TEXT NOT NULL,
    bill_number TEXT NOT NULL,
    title TEXT NOT NULL,
    summary_official TEXT,
    summary_ai TEXT,
    summary_confidence FLOAT,
    status TEXT,
    introduced_date DATE,
    last_action_date DATE,
    source_url TEXT NOT NULL,
    full_text_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_bills_jurisdiction ON bills(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_last_action ON bills(last_action_date DESC);

-- Shadow Votes
CREATE TABLE IF NOT EXISTS shadow_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote TEXT CHECK (vote IN ('for', 'against', 'unsure')),
    ip_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bill_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_bill ON shadow_votes(bill_id);

-- Vote Aggregates
CREATE TABLE IF NOT EXISTS vote_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE UNIQUE,
    count_for INTEGER DEFAULT 0,
    count_against INTEGER DEFAULT 0,
    count_unsure INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)

-- Bills are public read
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bills are publicly readable" ON bills;
CREATE POLICY "Bills are publicly readable" ON bills FOR SELECT USING (true);

-- Votes are user-writable, aggregates are public read
ALTER TABLE shadow_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own votes" ON shadow_votes;
CREATE POLICY "Users can insert their own votes" ON shadow_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own votes" ON shadow_votes;
CREATE POLICY "Users can view their own votes" ON shadow_votes FOR SELECT
    USING (auth.uid() = user_id);

-- Vote aggregates are public read
ALTER TABLE vote_aggregates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aggregates are publicly readable" ON vote_aggregates;
CREATE POLICY "Aggregates are publicly readable" ON vote_aggregates FOR SELECT USING (true);
