-- Create match_challenges table for team-to-team match invitations
CREATE TABLE IF NOT EXISTS match_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sport VARCHAR(50) NOT NULL,
  proposed_date TIMESTAMP,
  venue TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  responded_by UUID REFERENCES users(id),
  notes TEXT,
  CONSTRAINT check_different_teams CHECK (challenger_team_id != opponent_team_id),
  CONSTRAINT check_status CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_challenges_challenger ON match_challenges(challenger_team_id);
CREATE INDEX IF NOT EXISTS idx_match_challenges_opponent ON match_challenges(opponent_team_id);
CREATE INDEX IF NOT EXISTS idx_match_challenges_status ON match_challenges(status);
CREATE INDEX IF NOT EXISTS idx_match_challenges_created_by ON match_challenges(created_by);

-- Add comments
COMMENT ON TABLE match_challenges IS 'Team-to-team match challenge invitations';
COMMENT ON COLUMN match_challenges.status IS 'Challenge status: PENDING, ACCEPTED, DECLINED, CANCELLED';
COMMENT ON COLUMN match_challenges.match_id IS 'Set when challenge is accepted and match is created';
