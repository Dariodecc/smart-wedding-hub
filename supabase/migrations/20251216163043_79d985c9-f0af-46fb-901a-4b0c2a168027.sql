-- Drop and recreate the function with famiglia_nome
DROP FUNCTION IF EXISTS public.get_rsvp_guest_data(uuid);

CREATE FUNCTION public.get_rsvp_guest_data(_rsvp_uuid uuid)
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
  famiglia_id uuid,
  famiglia_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    i.famiglia_id,
    f.nome as famiglia_nome
  FROM invitati i
  LEFT JOIN famiglie f ON f.id = i.famiglia_id
  WHERE i.rsvp_uuid = _rsvp_uuid;
END;
$$;