-- Fix Error 1: Remove overly permissive public read access to invitati
-- This exposed ALL guest PII (names, phones, emails, dietary preferences) to anyone

DROP POLICY IF EXISTS "Allow public read access to invitati" ON public.invitati;

-- Create secure RPC function for ConfigurazioneTavoli to fetch guests with password verification
CREATE OR REPLACE FUNCTION public.get_wedding_guests_secure(
  _wedding_id uuid,
  _password_attempt text
)
RETURNS TABLE(
  id uuid,
  nome text,
  cognome text,
  tipo_ospite text,
  rsvp_status text,
  is_capo_famiglia boolean,
  famiglia_id uuid,
  tavolo_id uuid,
  posto_numero integer,
  preferenze_alimentari text[],
  gruppo_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify password first
  IF NOT EXISTS (
    SELECT 1 FROM weddings 
    WHERE weddings.id = _wedding_id 
    AND weddings.password IS NOT NULL 
    AND weddings.password = _password_attempt
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.nome,
    i.cognome,
    i.tipo_ospite,
    i.rsvp_status,
    i.is_capo_famiglia,
    i.famiglia_id,
    i.tavolo_id,
    i.posto_numero,
    i.preferenze_alimentari,
    i.gruppo_id
  FROM invitati i
  WHERE i.wedding_id = _wedding_id;
END;
$$;

-- Create secure function to get famiglia data with password verification
CREATE OR REPLACE FUNCTION public.get_wedding_famiglie_secure(
  _wedding_id uuid,
  _password_attempt text
)
RETURNS TABLE(
  id uuid,
  nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify password first
  IF NOT EXISTS (
    SELECT 1 FROM weddings 
    WHERE weddings.id = _wedding_id 
    AND weddings.password IS NOT NULL 
    AND weddings.password = _password_attempt
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT f.id, f.nome
  FROM famiglie f
  WHERE f.wedding_id = _wedding_id;
END;
$$;

-- Create secure function to get gruppi data with password verification
CREATE OR REPLACE FUNCTION public.get_wedding_gruppi_secure(
  _wedding_id uuid,
  _password_attempt text
)
RETURNS TABLE(
  id uuid,
  nome text,
  colore varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify password first
  IF NOT EXISTS (
    SELECT 1 FROM weddings 
    WHERE weddings.id = _wedding_id 
    AND weddings.password IS NOT NULL 
    AND weddings.password = _password_attempt
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT g.id, g.nome, g.colore
  FROM gruppi g
  WHERE g.wedding_id = _wedding_id;
END;
$$;

-- Fix Error 2: Remove policy that exposes wedding passwords and webhook URLs
-- Create a secure function to get wedding info for RSVP without sensitive data

DROP POLICY IF EXISTS "Public can read weddings via RSVP" ON public.weddings;

-- Create secure function for RSVP to get non-sensitive wedding data
CREATE OR REPLACE FUNCTION public.get_wedding_for_rsvp(
  _rsvp_uuid uuid
)
RETURNS TABLE(
  id uuid,
  couple_name text,
  wedding_date date,
  ceremony_location text,
  reception_location text,
  enable_multi_rsvp boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.couple_name,
    w.wedding_date,
    w.ceremony_location,
    w.reception_location,
    w.enable_multi_rsvp
  FROM weddings w
  INNER JOIN invitati i ON i.wedding_id = w.id
  WHERE i.rsvp_uuid = _rsvp_uuid
  LIMIT 1;
END;
$$;

-- Remove overly permissive public read policies on famiglie and gruppi
DROP POLICY IF EXISTS "Allow public read access to famiglie" ON public.famiglie;
DROP POLICY IF EXISTS "Allow public read access to gruppi" ON public.gruppi;