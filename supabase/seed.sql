-- Seed Jurisdictions
INSERT INTO jurisdictions (name, type, country, code)
VALUES 
  ('US Federal', 'federal', 'USA', 'us-federal'),
  ('California', 'state', 'USA', 'us-ca'),
  ('Iran', 'international', 'Iran', 'iran')
ON CONFLICT (code) DO NOTHING;

-- Seed Data Sources
INSERT INTO data_sources (name, type, base_url, attribution_required, license)
VALUES 
  ('Congress.gov', 'api', 'https://api.congress.gov/v3', true, 'Public Domain')
ON CONFLICT (name) DO NOTHING;
