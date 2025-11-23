-- Allow public (anonymous) read access to invitati via RSVP UUID
CREATE POLICY "Public can read invitati via RSVP UUID"
ON public.invitati FOR SELECT
TO anon
USING (rsvp_uuid IS NOT NULL);

-- Allow public (anonymous) read access to famiglie via RSVP
CREATE POLICY "Public can read famiglie via RSVP"
ON public.famiglie FOR SELECT
TO anon
USING (
  id IN (
    SELECT famiglia_id 
    FROM public.invitati 
    WHERE rsvp_uuid IS NOT NULL 
    AND famiglia_id IS NOT NULL
  )
);

-- Allow public (anonymous) read access to weddings via RSVP
CREATE POLICY "Public can read weddings via RSVP"
ON public.weddings FOR SELECT
TO anon
USING (
  id IN (
    SELECT wedding_id 
    FROM public.invitati 
    WHERE rsvp_uuid IS NOT NULL
  )
);

-- Allow public (anonymous) read access to gruppi via RSVP
CREATE POLICY "Public can read gruppi via RSVP"
ON public.gruppi FOR SELECT
TO anon
USING (
  id IN (
    SELECT gruppo_id 
    FROM public.invitati 
    WHERE rsvp_uuid IS NOT NULL 
    AND gruppo_id IS NOT NULL
  )
);

-- CRITICAL: Allow public (anonymous) UPDATE of RSVP data
-- Only allow updating specific fields (rsvp_status, nome, cognome, email, preferenze_alimentari, rsvp_updated_at)
CREATE POLICY "Public can update invitati via RSVP UUID"
ON public.invitati FOR UPDATE
TO anon
USING (rsvp_uuid IS NOT NULL)
WITH CHECK (rsvp_uuid IS NOT NULL);