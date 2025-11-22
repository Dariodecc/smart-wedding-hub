-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create junction table for api_keys and weddings
CREATE TABLE IF NOT EXISTS api_key_weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(api_key_id, wedding_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_key_weddings_key ON api_key_weddings(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_weddings_wedding ON api_key_weddings(wedding_id);

-- Remove old columns from weddings table
ALTER TABLE weddings 
DROP COLUMN IF EXISTS api_username,
DROP COLUMN IF EXISTS api_password;

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_weddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys (Admin only)
CREATE POLICY "Admins can manage API keys"
ON api_keys FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for api_key_weddings (Admin only)
CREATE POLICY "Admins can manage API key weddings"
ON api_key_weddings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow public read for API verification (used by Edge Function)
CREATE POLICY "Public can read active API keys for verification"
ON api_keys FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Public can read API key weddings"
ON api_key_weddings FOR SELECT
TO anon
USING (true);