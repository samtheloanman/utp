-- UTP Platform Supabase Schema
-- Apply via Supabase SQL Editor or migration tool

-- ==============================================================
-- News Hub Tables
-- ==============================================================

CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  url TEXT,
  region TEXT DEFAULT 'GLOBAL',
  category TEXT DEFAULT 'General',
  bias_score TEXT DEFAULT 'unscored',    -- center, center-left, center-right, left, right
  fact_check_status TEXT DEFAULT 'unverified',  -- verified, community, unverified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_region ON articles(region);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);

-- Article votes (1 user = 1 vote per article)
CREATE TABLE IF NOT EXISTS article_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_votes_article ON article_votes(article_id);

-- Fact check records
CREATE TABLE IF NOT EXISTS fact_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  checker_type TEXT NOT NULL CHECK (checker_type IN ('ai', 'community', 'manual')),
  result TEXT NOT NULL CHECK (result IN ('verified', 'disputed', 'unverified')),
  confidence DECIMAL(3,2),  -- 0.00 to 1.00
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- Legislature Tracker Tables
-- ==============================================================

CREATE TABLE IF NOT EXISTS jurisdictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('national', 'state', 'county', 'city')),
  subdivision_name TEXT,
  api_source TEXT,
  UNIQUE(country_code, level, subdivision_name)
);

-- Seed initial jurisdictions
INSERT INTO jurisdictions (country_code, country_name, level, api_source) VALUES
  ('US', 'United States', 'national', 'Congress.gov'),
  ('UK', 'United Kingdom', 'national', 'Parliament API'),
  ('EU', 'European Union', 'national', 'EUR-Lex'),
  ('BR', 'Brazil', 'national', 'camara.leg.br'),
  ('IN', 'India', 'national', 'data.gov.in')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  bill_number TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT,
  chamber TEXT,
  sponsor TEXT,
  introduced_date DATE,
  last_action TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_jurisdiction ON bills(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Bill importance votes (1 user = 1 vote per bill)
CREATE TABLE IF NOT EXISTS bill_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('important', 'not_important')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_votes_bill ON bill_votes(bill_id);

-- ==============================================================
-- Row Level Security (RLS)
-- ==============================================================

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_votes ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read" ON articles FOR SELECT USING (true);
CREATE POLICY "Public read" ON jurisdictions FOR SELECT USING (true);
CREATE POLICY "Public read" ON bills FOR SELECT USING (true);

-- Authenticated users can vote
CREATE POLICY "Auth vote" ON article_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth vote" ON bill_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own votes
CREATE POLICY "Own votes" ON article_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own votes" ON bill_votes FOR SELECT USING (auth.uid() = user_id);
