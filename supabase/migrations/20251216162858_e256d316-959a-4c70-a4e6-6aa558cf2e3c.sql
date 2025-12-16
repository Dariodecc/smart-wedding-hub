-- Create secure RPC function for RSVP form to fetch guest data
-- This replaces the removed public policy with a secure alternative

CREATE OR REPLACE FUNCTION public.get_rsvp_guest_data(_rsvp_uuid uuid)
RETURNS TABLE(
  id uuid,
  wedding_id uuid,
  nome text,
  cognome text,
  cellulare text,
  email text,
  tipo_ospite text,
  preferenze_alimentari text[],
  rsvp_status text,
  rsvp_uuid uuid,
  is_capo_famiglia boolean,
  famiglia_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return data for the guest with matching rsvp_uuid
  RETURN QUERY
  SELECT 
    i.id,
    i.wedding_id,
    i.nome,
    i.cognome,
    i.cellulare,
    i.email,
    i.tipo_ospite,
    i.preferenze_alimentari,
    i.rsvp_status,
    i.rsvp_uuid,
    i.is_capo_famiglia,
    i.famiglia_id
  FROM invitati i
  WHERE i.rsvp_uuid = _rsvp_uuid;
END;
$$;

-- Create function to get family members for RSVP (when guest is capo famiglia)
CREATE OR REPLACE FUNCTION public.get_rsvp_family_members(_famiglia_id uuid, _rsvp_uuid uuid)
RETURNS TABLE(
  id uuid,
  wedding_id uuid,
  nome text,
  cognome text,
  cellulare text,
  email text,
  tipo_ospite text,
  preferenze_alimentari text[],
  rsvp_status text,
  is_capo_famiglia boolean,
  famiglia_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting guest is capo famiglia of this family
  IF NOT EXISTS (
    SELECT 1 FROM invitati 
    WHERE rsvp_uuid = _rsvp_uuid 
    AND famiglia_id = _famiglia_id 
    AND is_capo_famiglia = true
  ) THEN
    RETURN;
  END IF;

  -- Return all family members
  RETURN QUERY
  SELECT 
    i.id,
    i.wedding_id,
    i.nome,
    i.cognome,
    i.cellulare,
    i.email,
    i.tipo_ospite,
    i.preferenze_alimentari,
    i.rsvp_status,
    i.is_capo_famiglia,
    i.famiglia_id
  FROM invitati i
  WHERE i.famiglia_id = _famiglia_id
  ORDER BY i.is_capo_famiglia DESC;
END;
$$;

-- Create function to update RSVP data securely
CREATE OR REPLACE FUNCTION public.update_rsvp_guest(
  _guest_id uuid,
  _rsvp_uuid uuid,
  _rsvp_status text,
  _nome text,
  _cognome text,
  _email text,
  _preferenze_alimentari text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_famiglia_id uuid;
  v_is_capo boolean;
BEGIN
  -- Get the famiglia_id and is_capo_famiglia for the requesting guest
  SELECT famiglia_id, is_capo_famiglia INTO v_famiglia_id, v_is_capo
  FROM invitati
  WHERE rsvp_uuid = _rsvp_uuid;

  -- Check if the guest being updated belongs to the same family (if capo) or is the same guest
  IF NOT EXISTS (
    SELECT 1 FROM invitati 
    WHERE id = _guest_id
    AND (
      -- Either updating own record
      rsvp_uuid = _rsvp_uuid
      -- Or updating family member (if capo famiglia)
      OR (v_is_capo = true AND famiglia_id = v_famiglia_id)
    )
  ) THEN
    RETURN false;
  END IF;

  -- Perform the update
  UPDATE invitati
  SET 
    rsvp_status = _rsvp_status,
    nome = _nome,
    cognome = _cognome,
    email = _email,
    preferenze_alimentari = _preferenze_alimentari,
    rsvp_updated_at = now()
  WHERE id = _guest_id;

  RETURN true;
END;
$$;

-- Also remove the public update policy since we now use RPC
DROP POLICY IF EXISTS "Public can update invitati via RSVP UUID" ON public.invitati;