-- Add player_id column to tournament_registrations to support individual player registrations for leagues
ALTER TABLE tournament_registrations 
ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Drop the existing unique constraint
ALTER TABLE tournament_registrations 
DROP CONSTRAINT IF EXISTS tournament_registrations_tournament_id_team_id_key;

-- Add new unique constraints to prevent duplicate registrations
-- For team registrations (tournament_id + team_id must be unique when team_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_team_registration 
ON tournament_registrations(tournament_id, team_id) 
WHERE team_id IS NOT NULL;

-- For player registrations (tournament_id + player_id must be unique when player_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_player_registration 
ON tournament_registrations(tournament_id, player_id) 
WHERE player_id IS NOT NULL;

-- Add check constraint to ensure either team_id or player_id is provided (but not both)
ALTER TABLE tournament_registrations 
ADD CONSTRAINT check_team_or_player 
CHECK (
  (team_id IS NOT NULL AND player_id IS NULL) OR 
  (team_id IS NULL AND player_id IS NOT NULL)
);
