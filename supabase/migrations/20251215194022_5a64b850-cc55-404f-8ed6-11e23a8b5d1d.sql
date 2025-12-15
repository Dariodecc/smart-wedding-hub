-- Create api_key_permissions table for granular API key permissions
CREATE TABLE public.api_key_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  resource TEXT NOT NULL CHECK (resource IN ('famiglie', 'gruppi', 'invitati', 'preferenze_alimentari_custom', 'tavoli', 'weddings')),
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(api_key_id, resource, permission)
);

-- Create index for faster lookups
CREATE INDEX idx_api_key_permissions_key ON public.api_key_permissions(api_key_id);

-- Enable Row Level Security
ALTER TABLE public.api_key_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage all API key permissions
CREATE POLICY "Admins can manage API key permissions"
ON public.api_key_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy: Public can read permissions for API key verification
CREATE POLICY "Public can read API key permissions"
ON public.api_key_permissions
FOR SELECT
USING (true);