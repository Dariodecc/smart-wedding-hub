-- Drop the permissive RLS policy that allows unrestricted anonymous updates
DROP POLICY IF EXISTS "Allow public update tavoli position and rotation" ON tavoli;

-- Create a secure RPC function that validates password before allowing updates
CREATE OR REPLACE FUNCTION update_tavolo_position(
  _tavolo_id uuid,
  _wedding_id uuid,
  _password_attempt text,
  _posizione_x double precision,
  _posizione_y double precision,
  _rotazione double precision DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified boolean;
BEGIN
  -- Verify the password first
  SELECT (w.password IS NOT NULL AND w.password = _password_attempt)
  INTO v_verified
  FROM weddings w
  WHERE w.id = _wedding_id;
  
  -- If password doesn't match or wedding not found, return false
  IF v_verified IS NULL OR NOT v_verified THEN
    RETURN false;
  END IF;
  
  -- Verify the tavolo belongs to the wedding
  IF NOT EXISTS (
    SELECT 1 FROM tavoli 
    WHERE id = _tavolo_id AND wedding_id = _wedding_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Update the tavolo position
  UPDATE tavoli
  SET 
    posizione_x = _posizione_x,
    posizione_y = _posizione_y,
    rotazione = COALESCE(_rotazione, rotazione)
  WHERE id = _tavolo_id AND wedding_id = _wedding_id;
  
  RETURN true;
END;
$$;