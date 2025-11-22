-- Allow public UPDATE access for table position and rotation in ConfigurazioneTavoli page
-- This enables anonymous users to drag tables and rotate them after password authentication

CREATE POLICY "Allow public update tavoli position and rotation"
ON public.tavoli
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);