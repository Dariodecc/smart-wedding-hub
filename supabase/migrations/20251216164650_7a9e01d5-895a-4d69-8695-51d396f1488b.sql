-- Create secure RPC function to fetch tavoli with password verification
CREATE OR REPLACE FUNCTION public.get_wedding_tavoli_secure(
  _wedding_id uuid,
  _password_attempt text
)
RETURNS TABLE(
  id uuid,
  nome varchar,
  tipo varchar,
  capienza integer,
  posizione_x double precision,
  posizione_y double precision,
  rotazione double precision,
  created_at timestamptz
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
    t.id,
    t.nome,
    t.tipo,
    t.capienza,
    t.posizione_x,
    t.posizione_y,
    t.rotazione,
    t.created_at
  FROM tavoli t
  WHERE t.wedding_id = _wedding_id
  ORDER BY t.created_at;
END;
$$;