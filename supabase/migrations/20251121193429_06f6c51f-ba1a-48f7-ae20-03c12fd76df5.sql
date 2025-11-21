-- Add rotation column to tavoli table
ALTER TABLE public.tavoli 
  ADD COLUMN IF NOT EXISTS rotazione FLOAT DEFAULT 0;