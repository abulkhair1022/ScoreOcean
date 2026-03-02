-- Add captain_id column to teams table
-- This allows teams to designate a captain from their roster

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS captain_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for captain lookups
CREATE INDEX IF NOT EXISTS idx_teams_captain ON teams(captain_id);

-- Add comment
COMMENT ON COLUMN teams.captain_id IS 'The player designated as team captain';
