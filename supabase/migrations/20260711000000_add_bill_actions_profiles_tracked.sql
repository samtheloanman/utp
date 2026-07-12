-- Bill Actions (timeline/history)
CREATE TABLE IF NOT EXISTS bill_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    action_date DATE NOT NULL,
    action_text TEXT NOT NULL,
    action_type TEXT,
    chamber TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_bill ON bill_actions(bill_id);

-- User Profiles (minimal data)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT
    USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Tracked Bills (user follows a bill)
CREATE TABLE IF NOT EXISTS tracked_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bill_id)
);

ALTER TABLE tracked_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own tracked bills" ON tracked_bills;
CREATE POLICY "Users can manage own tracked bills" ON tracked_bills
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
