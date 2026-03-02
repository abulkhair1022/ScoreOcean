-- Migration: Add Team Sport Profiles
-- This allows teams to participate in multiple sports

-- Create team_sport_profiles table
CREATE TABLE IF NOT EXISTS team_sport_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  sport VARCHAR(50) NOT NULL,
  statistics JSONB NOT NULL DEFAULT '{"matchesPlayed": 0, "wins": 0, "losses": 0, "draws": 0}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, sport)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_sport_profiles_team ON team_sport_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_team_sport_profiles_sport ON team_sport_profiles(sport);

-- Migrate existing team data to team_sport_profiles
-- For each existing team, create a sport profile with their current sport
INSERT INTO team_sport_profiles (team_id, sport, statistics)
SELECT 
  id as team_id,
  sport,
  COALESCE(statistics, '{"matchesPlayed": 0, "wins": 0, "losses": 0, "draws": 0}'::jsonb) as statistics
FROM teams
WHERE sport IS NOT NULL
ON CONFLICT (team_id, sport) DO NOTHING;

-- Note: We keep the 'sport' column in teams table for backward compatibility
-- It will represent the "primary" or "default" sport for the team
-- But teams can have multiple sports via team_sport_profiles

-- Add comment to explain the relationship
COMMENT ON TABLE team_sport_profiles IS 'Allows teams to participate in multiple sports with separate statistics for each sport';
COMMENT ON COLUMN teams.sport IS 'Primary/default sport for the team (for backward compatibility)';
