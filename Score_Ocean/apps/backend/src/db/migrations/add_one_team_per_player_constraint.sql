-- Migration: Add One Team Per Player Constraint
-- This migration ensures a player can only be in one team at a time

-- Add unique constraint on player_id in team_rosters
-- This prevents a player from being in multiple teams simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_rosters_player_unique 
ON team_rosters(player_id);

COMMENT ON INDEX idx_team_rosters_player_unique IS 'Ensures a player can only be in one team at a time';
