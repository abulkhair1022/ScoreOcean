-- Migration: Add cricket match details tables
-- Created: 2026-02-26
-- Description: Store batting and bowling statistics for cricket matches

-- Batting statistics table
CREATE TABLE IF NOT EXISTS cricket_batting_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  batsman_name VARCHAR(255) NOT NULL,
  runs INTEGER DEFAULT 0,
  balls INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  strike_rate DECIMAL(6,2) DEFAULT 0.00,
  dismissal VARCHAR(100),
  is_not_out BOOLEAN DEFAULT true,
  batting_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bowling statistics table
CREATE TABLE IF NOT EXISTS cricket_bowling_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  bowler_name VARCHAR(255) NOT NULL,
  overs DECIMAL(3,1) DEFAULT 0.0,
  maidens INTEGER DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  economy DECIMAL(4,2) DEFAULT 0.00,
  wides INTEGER DEFAULT 0,
  no_balls INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ball-by-ball details table
CREATE TABLE IF NOT EXISTS cricket_ball_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL, -- 1 or 2
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  bowler_name VARCHAR(255) NOT NULL,
  batsman_name VARCHAR(255) NOT NULL,
  runs INTEGER DEFAULT 0,
  extras_type VARCHAR(20), -- 'wide', 'noball', 'bye', 'legbye'
  extras_runs INTEGER DEFAULT 0,
  is_wicket BOOLEAN DEFAULT false,
  wicket_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batting_stats_match ON cricket_batting_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_bowling_stats_match ON cricket_bowling_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_ball_details_match ON cricket_ball_details(match_id);
CREATE INDEX IF NOT EXISTS idx_ball_details_innings ON cricket_ball_details(match_id, innings);

-- Comments
COMMENT ON TABLE cricket_batting_stats IS 'Stores batting statistics for cricket matches';
COMMENT ON TABLE cricket_bowling_stats IS 'Stores bowling statistics for cricket matches';
COMMENT ON TABLE cricket_ball_details IS 'Stores ball-by-ball details for cricket matches';
