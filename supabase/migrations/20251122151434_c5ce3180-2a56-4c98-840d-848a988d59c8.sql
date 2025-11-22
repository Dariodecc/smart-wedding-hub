-- Add WhatsApp message tracking columns to invitati table
ALTER TABLE public.invitati 
ADD COLUMN IF NOT EXISTS whatsapp_message_price NUMERIC(10, 4),
ADD COLUMN IF NOT EXISTS whatsapp_message_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS whatsapp_message_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS whatsapp_message_sid VARCHAR(100),
ADD COLUMN IF NOT EXISTS whatsapp_message_from VARCHAR(50),
ADD COLUMN IF NOT EXISTS whatsapp_message_body TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_date_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_date_created TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_date_updated TIMESTAMP WITH TIME ZONE;

-- Add index for message_sid lookups
CREATE INDEX IF NOT EXISTS idx_invitati_message_sid 
ON public.invitati(whatsapp_message_sid);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_invitati_whatsapp_status 
ON public.invitati(whatsapp_message_status);

-- Add API credentials columns to weddings table
ALTER TABLE public.weddings 
ADD COLUMN IF NOT EXISTS api_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS api_password VARCHAR(255);

-- Create index for faster API auth
CREATE INDEX IF NOT EXISTS idx_weddings_api_credentials 
ON public.weddings(api_username, api_password);