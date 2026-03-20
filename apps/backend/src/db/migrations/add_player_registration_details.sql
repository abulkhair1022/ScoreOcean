-- Add columns to store player registration details
ALTER TABLE tournament_registrations 
ADD COLUMN IF NOT EXISTS player_details JSONB DEFAULT '{}';

-- Add comment explaining the structure
COMMENT ON COLUMN tournament_registrations.player_details IS 
'Stores sport-specific player details like role (batsman/bowler/all-rounder for cricket), position (forward/defender for football), etc.';
