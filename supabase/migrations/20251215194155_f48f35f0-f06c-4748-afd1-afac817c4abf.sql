-- Add new security columns to api_keys table
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS api_key_preview TEXT;

-- Create index for faster hash lookups during API validation
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(api_key_hash);