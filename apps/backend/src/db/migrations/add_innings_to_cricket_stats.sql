-- Migration: Add innings column to cricket stats tables
-- Created: 2026-02-26
-- Description: Add innings column to batting and bowling stats tables

-- Add innings column to batting stats
ALTER TABLE cricket_batting_stats 
ADD COLUMN IF NOT EXISTS innings INTEGER DEFAULT 1;

-- Add innings column to bowling stats
ALTER TABLE cricket_bowling_stats 
ADD COLUMN IF NOT EXISTS innings INTEGER DEFAULT 1;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_batting_stats_innings ON cricket_batting_stats(match_id, innings);
CREATE INDEX IF NOT EXISTS idx_bowling_stats_innings ON cricket_bowling_stats(match_id, innings);
