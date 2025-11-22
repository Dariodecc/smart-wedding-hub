-- Add WhatsApp RSVP tracking fields to invitati table
ALTER TABLE public.invitati 
ADD COLUMN IF NOT EXISTS whatsapp_rsvp_inviato BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_rsvp_inviato_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on WhatsApp RSVP status
CREATE INDEX IF NOT EXISTS idx_invitati_whatsapp_rsvp 
ON public.invitati(whatsapp_rsvp_inviato, wedding_id);