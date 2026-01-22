-- Jurisdictions (US Federal, States, Iran, etc.)
CREATE TABLE jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('federal', 'state', 'international')),
    country TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- e.g., 'us-federal', 'us-ca', 'iran'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Source Registry (API compliance tracking)
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('api', 'scraper', 'manual')),
    base_url TEXT,
    docs_url TEXT,
    license TEXT, -- e.g., 'Public Domain', 'CC BY 4.0'
    attribution_required BOOLEAN DEFAULT false,
    rate_limit_per_hour INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_successful_fetch TIMESTAMPTZ,
    health_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills (normalized legislative items)
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE CASCADE,
    source_id UUID REFERENCES data_sources(id),
    external_id TEXT NOT NULL, -- e.g., 'hr-1234-118'
    bill_number TEXT NOT NULL, -- e.g., 'H.R. 1234'
    title TEXT NOT NULL,
    summary_official TEXT,
    summary_ai TEXT,
    summary_confidence FLOAT, -- 0.0 to 1.0
    status TEXT, -- e.g., 'introduced', 'passed_house', 'enacted'
    introduced_date DATE,
    last_action_date DATE,
    source_url TEXT NOT NULL,
    full_text_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, external_id)
);

CREATE INDEX idx_bills_jurisdiction ON bills(jurisdiction_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_last_action ON bills(last_action_date DESC);

-- Bill Actions (timeline/history)
CREATE TABLE bill_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    action_date DATE NOT NULL,
    action_text TEXT NOT NULL,
    action_type TEXT, -- e.g., 'introduced', 'referred', 'voted'
    chamber TEXT, -- 'house', 'senate', 'both'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_actions_bill ON bill_actions(bill_id);

-- Shadow Votes (participation layer)
CREATE TABLE shadow_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Supabase auth
    vote TEXT CHECK (vote IN ('for', 'against', 'unsure')),
    ip_hash TEXT, -- SHA-256 of IP for abuse prevention (not raw IP)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bill_id, user_id)
);

CREATE INDEX idx_votes_bill ON shadow_votes(bill_id);

-- Vote Aggregates (cached for performance)
CREATE TABLE vote_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE UNIQUE,
    count_for INTEGER DEFAULT 0,
    count_against INTEGER DEFAULT 0,
    count_unsure INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (minimal data)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracked Bills (user follows a bill)
CREATE TABLE tracked_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bill_id)
);

-- Row Level Security (RLS) Policies

-- Bills are public read
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bills are publicly readable" ON bills FOR SELECT USING (true);

-- Votes are user-writable, aggregates are public read
ALTER TABLE shadow_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own votes" ON shadow_votes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own votes" ON shadow_votes FOR SELECT 
    USING (auth.uid() = user_id);

-- Vote aggregates are public read
ALTER TABLE vote_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aggregates are publicly readable" ON vote_aggregates FOR SELECT USING (true);
