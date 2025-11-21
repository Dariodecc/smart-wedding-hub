-- Add password column to weddings table
ALTER TABLE weddings 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Create table for custom dietary preferences
CREATE TABLE IF NOT EXISTS preferenze_alimentari_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wedding_id, nome)
);

-- Enable RLS on preferenze_alimentari_custom
ALTER TABLE preferenze_alimentari_custom ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_preferenze_custom_wedding ON preferenze_alimentari_custom(wedding_id);

-- RLS Policies for preferenze_alimentari_custom
CREATE POLICY "Admins can manage all custom preferences"
ON preferenze_alimentari_custom
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sposi can manage their wedding custom preferences"
ON preferenze_alimentari_custom
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'sposi'::app_role) 
  AND wedding_id IN (
    SELECT wedding_id 
    FROM wedding_spouses 
    WHERE user_id = auth.uid()
  )
);