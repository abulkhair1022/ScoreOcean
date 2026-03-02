-- Add sport column to team_rosters for sport-specific rosters
-- This allows teams to have different players for different sports

-- Add sport column
ALTER TABLE team_rosters 
ADD COLUMN IF NOT EXISTS sport VARCHAR(50);

-- For existing rosters, set sport to the team's primary sport
UPDATE team_rosters tr
SET sport = t.sport
FROM teams t
WHERE tr.team_id = t.id AND tr.sport IS NULL;

-- Make sport NOT NULL after setting values
ALTER TABLE team_rosters 
ALTER COLUMN sport SET NOT NULL;

-- Drop old unique constraint (team_id, player_id)
ALTER TABLE team_rosters 
DROP CONSTRAINT IF EXISTS team_rosters_team_id_player_id_key;

-- Add new unique constraint (team_id, player_id, sport)
-- This allows same player to be in multiple sports for the same team
ALTER TABLE team_rosters 
ADD CONSTRAINT team_rosters_team_id_player_id_sport_key 
UNIQUE (team_id, player_id, sport);

-- Add index for sport-based queries
CREATE INDEX IF NOT EXISTS idx_team_rosters_sport ON team_rosters(sport);

-- Add comment
COMMENT ON COLUMN team_rosters.sport IS 'The sport this roster entry is for - allows sport-specific rosters';
