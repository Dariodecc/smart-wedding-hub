-- Create weddings table
CREATE TABLE IF NOT EXISTS public.weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_name TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  ceremony_location TEXT NOT NULL,
  reception_location TEXT,
  service_cost DECIMAL(10, 2) NOT NULL,
  enable_multi_rsvp BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for wedding-spouse associations
CREATE TABLE IF NOT EXISTS public.wedding_spouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on weddings table
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on wedding_spouses table
ALTER TABLE public.wedding_spouses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weddings
CREATE POLICY "Admins can view all weddings"
  ON public.weddings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert weddings"
  ON public.weddings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update weddings"
  ON public.weddings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete weddings"
  ON public.weddings
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Spouses can view their own weddings"
  ON public.weddings
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'sposi') AND
    EXISTS (
      SELECT 1 FROM public.wedding_spouses
      WHERE wedding_spouses.wedding_id = weddings.id
        AND wedding_spouses.user_id = auth.uid()
    )
  );

-- RLS Policies for wedding_spouses
CREATE POLICY "Admins can view all wedding spouses"
  ON public.wedding_spouses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert wedding spouses"
  ON public.wedding_spouses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wedding spouses"
  ON public.wedding_spouses
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Spouses can view their own wedding associations"
  ON public.wedding_spouses
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'sposi') AND
    user_id = auth.uid()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_wedding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weddings_updated_at
  BEFORE UPDATE ON public.weddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wedding_updated_at();