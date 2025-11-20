-- Create famiglie table
CREATE TABLE public.famiglie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invitati table
CREATE TABLE public.invitati (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  famiglia_id UUID REFERENCES public.famiglie(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  cellulare TEXT NOT NULL,
  email TEXT,
  tipo_ospite TEXT NOT NULL,
  preferenze_alimentari TEXT[] DEFAULT '{}',
  is_capo_famiglia BOOLEAN DEFAULT false,
  rsvp_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.famiglie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitati ENABLE ROW LEVEL SECURITY;

-- RLS Policies for famiglie
CREATE POLICY "Admins can view all famiglie"
ON public.famiglie FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all famiglie"
ON public.famiglie FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sposi can view their wedding famiglie"
ON public.famiglie FOR SELECT
USING (
  has_role(auth.uid(), 'sposi'::app_role) AND
  wedding_id IN (
    SELECT wedding_id FROM public.wedding_spouses WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Sposi can manage their wedding famiglie"
ON public.famiglie FOR ALL
USING (
  has_role(auth.uid(), 'sposi'::app_role) AND
  wedding_id IN (
    SELECT wedding_id FROM public.wedding_spouses WHERE user_id = auth.uid()
  )
);

-- RLS Policies for invitati
CREATE POLICY "Admins can view all invitati"
ON public.invitati FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all invitati"
ON public.invitati FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sposi can view their wedding invitati"
ON public.invitati FOR SELECT
USING (
  has_role(auth.uid(), 'sposi'::app_role) AND
  wedding_id IN (
    SELECT wedding_id FROM public.wedding_spouses WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Sposi can manage their wedding invitati"
ON public.invitati FOR ALL
USING (
  has_role(auth.uid(), 'sposi'::app_role) AND
  wedding_id IN (
    SELECT wedding_id FROM public.wedding_spouses WHERE user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_famiglie_wedding_id ON public.famiglie(wedding_id);
CREATE INDEX idx_invitati_wedding_id ON public.invitati(wedding_id);
CREATE INDEX idx_invitati_famiglia_id ON public.invitati(famiglia_id);
CREATE INDEX idx_invitati_rsvp_uuid ON public.invitati(rsvp_uuid);