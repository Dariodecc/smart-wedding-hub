-- Enable public read access for ConfigurazioneTavoli page
-- These policies allow anonymous users to view wedding data after password authentication

-- Public read access to tavoli table
CREATE POLICY "Allow public read access to tavoli"
ON public.tavoli
FOR SELECT
TO anon
USING (true);

-- Public read access to invitati table
CREATE POLICY "Allow public read access to invitati"
ON public.invitati
FOR SELECT
TO anon
USING (true);

-- Public read access to famiglie table (for joins in invitati queries)
CREATE POLICY "Allow public read access to famiglie"
ON public.famiglie
FOR SELECT
TO anon
USING (true);

-- Public read access to gruppi table (for joins in invitati queries)
CREATE POLICY "Allow public read access to gruppi"
ON public.gruppi
FOR SELECT
TO anon
USING (true);