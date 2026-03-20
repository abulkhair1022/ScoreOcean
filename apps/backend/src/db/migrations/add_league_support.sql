-- Migration: Add League Support
-- This migration adds support for leagues as a distinct competition type from tournaments

-- Add competition_type column to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS competition_type VARCHAR(50) DEFAULT 'TOURNAMENT';

-- Add check constraint to ensure valid competition types
ALTER TABLE tournaments 
ADD CONSTRAINT check_competition_type 
CHECK (competition_type IN ('TOURNAMENT', 'LEAGUE'));

-- Create player_registrations table for individual player registrations in leagues
CREATE TABLE IF NOT EXISTS player_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payment_id UUID,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, player_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_registrations_tournament ON player_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_registrations_player ON player_registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_player_registrations_status ON player_registrations(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_competition_type ON tournaments(competition_type);

-- Update existing tournaments to have competition_type = 'TOURNAMENT'
UPDATE tournaments SET competition_type = 'TOURNAMENT' WHERE competition_type IS NULL;

COMMENT ON COLUMN tournaments.competition_type IS 'Type of competition: TOURNAMENT (team-based) or LEAGUE (individual player-based)';
COMMENT ON TABLE player_registrations IS 'Individual player registrations for leagues';
