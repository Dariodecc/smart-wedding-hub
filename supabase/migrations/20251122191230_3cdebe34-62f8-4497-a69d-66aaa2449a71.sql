-- Add RSVP tracking timestamp to invitati table
ALTER TABLE public.invitati 
ADD COLUMN IF NOT EXISTS rsvp_updated_at TIMESTAMP WITH TIME ZONE;