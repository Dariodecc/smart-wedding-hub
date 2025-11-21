-- Create gruppi table
CREATE TABLE IF NOT EXISTS public.gruppi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  colore VARCHAR(7) NOT NULL, -- Hex color code #RRGGBB
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add gruppo_id column to invitati table
ALTER TABLE public.invitati 
ADD COLUMN IF NOT EXISTS gruppo_id UUID REFERENCES public.gruppi(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gruppi_wedding ON public.gruppi(wedding_id);
CREATE INDEX IF NOT EXISTS idx_invitati_gruppo ON public.invitati(gruppo_id);

-- Enable Row Level Security
ALTER TABLE public.gruppi ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gruppi table
-- Admins can view all gruppi
CREATE POLICY "Admins can view all gruppi" 
ON public.gruppi 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all gruppi
CREATE POLICY "Admins can manage all gruppi" 
ON public.gruppi 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Sposi can view their wedding gruppi
CREATE POLICY "Sposi can view their wedding gruppi" 
ON public.gruppi 
FOR SELECT 
USING (
  has_role(auth.uid(), 'sposi'::app_role) 
  AND wedding_id IN (
    SELECT wedding_id 
    FROM public.wedding_spouses 
    WHERE user_id = auth.uid()
  )
);

-- Sposi can manage their wedding gruppi
CREATE POLICY "Sposi can manage their wedding gruppi" 
ON public.gruppi 
FOR ALL 
USING (
  has_role(auth.uid(), 'sposi'::app_role) 
  AND wedding_id IN (
    SELECT wedding_id 
    FROM public.wedding_spouses 
    WHERE user_id = auth.uid()
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gruppi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gruppi_updated_at
BEFORE UPDATE ON public.gruppi
FOR EACH ROW
EXECUTE FUNCTION public.update_gruppi_updated_at();