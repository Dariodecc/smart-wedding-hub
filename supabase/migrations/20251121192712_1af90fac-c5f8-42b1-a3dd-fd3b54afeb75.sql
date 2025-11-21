-- Create tavoli table
CREATE TABLE IF NOT EXISTS public.tavoli (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('rotondo', 'rettangolare_singolo', 'rettangolare_doppio')),
  capienza INT NOT NULL CHECK (capienza > 0),
  posizione_x FLOAT DEFAULT 0,
  posizione_y FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_tavoli_wedding FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tavoli_wedding ON public.tavoli(wedding_id);

-- Enable RLS
ALTER TABLE public.tavoli ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tavoli
CREATE POLICY "Admins can view all tavoli"
  ON public.tavoli FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all tavoli"
  ON public.tavoli FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sposi can view their wedding tavoli"
  ON public.tavoli FOR SELECT
  USING (
    has_role(auth.uid(), 'sposi'::app_role) AND
    wedding_id IN (
      SELECT wedding_id FROM public.wedding_spouses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sposi can manage their wedding tavoli"
  ON public.tavoli FOR ALL
  USING (
    has_role(auth.uid(), 'sposi'::app_role) AND
    wedding_id IN (
      SELECT wedding_id FROM public.wedding_spouses WHERE user_id = auth.uid()
    )
  );

-- Add table assignment columns to invitati
ALTER TABLE public.invitati 
  ADD COLUMN IF NOT EXISTS tavolo_id UUID REFERENCES public.tavoli(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posto_numero INT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitati_tavolo ON public.invitati(tavolo_id);