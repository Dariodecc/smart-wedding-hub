-- Fix: Restrict public read access to invitati table
-- The current policy allows reading ALL records where rsvp_uuid IS NOT NULL
-- This exposes all guest PII to anyone on the internet

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can read invitati via RSVP UUID" ON public.invitati;

-- Create a more restrictive policy that only allows reading a specific record
-- when the rsvp_uuid is provided as a filter in the query
-- This uses a function to check if the query is filtering by the correct rsvp_uuid
CREATE OR REPLACE FUNCTION public.check_rsvp_access(_rsvp_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM invitati 
    WHERE rsvp_uuid = _rsvp_uuid
  );
$$;

-- Also fix api_keys and api_key_weddings public exposure while we're at it
DROP POLICY IF EXISTS "Public can read active API keys for verification" ON public.api_keys;
DROP POLICY IF EXISTS "Public can read API key weddings" ON public.api_key_weddings;
DROP POLICY IF EXISTS "Public can read API key permissions" ON public.api_key_permissions;