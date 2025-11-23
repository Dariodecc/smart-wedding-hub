-- Make cellulare column nullable to support family members without phone numbers
-- Only capo famiglia and single guests require phone numbers
ALTER TABLE public.invitati 
ALTER COLUMN cellulare DROP NOT NULL;