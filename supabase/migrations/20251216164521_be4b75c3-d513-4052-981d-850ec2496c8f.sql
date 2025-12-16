-- Remove public read access to tavoli - should only be accessible via password-protected RPC
DROP POLICY IF EXISTS "Allow public read access to tavoli" ON public.tavoli;