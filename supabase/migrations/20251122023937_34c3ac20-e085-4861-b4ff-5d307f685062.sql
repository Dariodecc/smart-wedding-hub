-- Create a security definer function to safely get wedding password for public access
-- This function allows the public ConfigurazioneTavoli page to verify passwords
-- without exposing other sensitive wedding data

CREATE OR REPLACE FUNCTION public.get_wedding_password_public(_wedding_id uuid)
RETURNS TABLE(
  password text,
  couple_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    password,
    couple_name
  FROM public.weddings
  WHERE id = _wedding_id
  LIMIT 1;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_wedding_password_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_wedding_password_public(uuid) TO authenticated;