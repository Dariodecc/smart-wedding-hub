-- Drop the function that exposes wedding passwords
DROP FUNCTION IF EXISTS public.get_wedding_password_public(uuid);

-- Create a verification-only function that doesn't return the password
CREATE OR REPLACE FUNCTION public.verify_wedding_password(
  _wedding_id uuid,
  _password_attempt text
)
RETURNS TABLE(verified boolean, couple_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (w.password IS NOT NULL AND w.password = _password_attempt) as verified,
    w.couple_name
  FROM public.weddings w
  WHERE w.id = _wedding_id;
END;
$$;

-- Grant execute to anonymous users
GRANT EXECUTE ON FUNCTION public.verify_wedding_password(uuid, text) TO anon;