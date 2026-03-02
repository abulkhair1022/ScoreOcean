-- Migration: Add player IDs to cricket stats tables
-- Created: 2026-02-26
-- Description: Link cricket statistics to user profiles for proper player tracking

-- Add player_id to batting stats
ALTER TABLE cricket_batting_stats 
ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES users(id);

-- Add player_id to bowling stats
ALTER TABLE cricket_bowling_stats 
ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES users(id);

-- Add player IDs to ball details
ALTER TABLE cricket_ball_details 
ADD COLUMN IF NOT EXISTS batsman_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS bowler_id UUID REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_batting_stats_player ON cricket_batting_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_bowling_stats_player ON cricket_bowling_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_ball_details_batsman ON cricket_ball_details(batsman_id);
CREATE INDEX IF NOT EXISTS idx_ball_details_bowler ON cricket_ball_details(bowler_id);

-- Comments
COMMENT ON COLUMN cricket_batting_stats.player_id IS 'Links batting stats to user profile';
COMMENT ON COLUMN cricket_bowling_stats.player_id IS 'Links bowling stats to user profile';
COMMENT ON COLUMN cricket_ball_details.batsman_id IS 'Links ball to batsman user profile';
COMMENT ON COLUMN cricket_ball_details.bowler_id IS 'Links ball to bowler user profile';
