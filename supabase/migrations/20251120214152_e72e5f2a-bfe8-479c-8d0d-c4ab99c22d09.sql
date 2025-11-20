-- Add RSVP status column to invitati table
ALTER TABLE invitati 
ADD COLUMN rsvp_status TEXT DEFAULT 'In attesa' 
CHECK (rsvp_status IN ('In attesa', 'Ci sarò', 'Non ci sarò'));

-- Create index for better query performance on RSVP status
CREATE INDEX idx_invitati_rsvp ON invitati(rsvp_status);

-- Add comment for documentation
COMMENT ON COLUMN invitati.rsvp_status IS 'Guest RSVP status: In attesa (pending), Ci sarò (confirmed), Non ci sarò (declined)';