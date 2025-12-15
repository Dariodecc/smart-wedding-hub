-- Allow api_key column to be nullable for new hash-based tokens
ALTER TABLE public.api_keys ALTER COLUMN api_key DROP NOT NULL;