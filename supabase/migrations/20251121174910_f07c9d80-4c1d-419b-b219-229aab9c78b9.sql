-- Add check constraint to ensure only capo famiglia or singles have rsvp_uuid
ALTER TABLE invitati 
ADD CONSTRAINT check_rsvp_uuid_logic 
CHECK (
  -- If has famiglia and is NOT capo, must NOT have rsvp_uuid
  (famiglia_id IS NOT NULL AND is_capo_famiglia = false AND rsvp_uuid IS NULL)
  OR
  -- If has famiglia and IS capo, must have rsvp_uuid
  (famiglia_id IS NOT NULL AND is_capo_famiglia = true AND rsvp_uuid IS NOT NULL)
  OR
  -- If single (no famiglia), must have rsvp_uuid
  (famiglia_id IS NULL AND rsvp_uuid IS NOT NULL)
);