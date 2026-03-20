-- ── Auction V2 Migration ──────────────────────────────────────────────────
-- League-specific teams, role-based ordering, 2nd round, fixtures

-- Add role + round fields to auction_players
ALTER TABLE auction_players
  ADD COLUMN IF NOT EXISTS player_role   VARCHAR(50)  DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS sort_order    INTEGER      DEFAULT 999,
  ADD COLUMN IF NOT EXISTS auction_round INTEGER      DEFAULT 1;

-- League teams (created specifically for an auction, separate from primary teams)
CREATE TABLE IF NOT EXISTS league_teams (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id     UUID REFERENCES auctions(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  icon_player_id UUID REFERENCES users(id),        -- the team's "icon player" / captain concept
  host_team_id   UUID REFERENCES teams(id),        -- original team that was invited (for tracking)
  host_user_id   UUID REFERENCES users(id),        -- the manager/captain who accepted the invite
  budget         DECIMAL(10,2) NOT NULL DEFAULT 0,
  remaining_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  players_acquired INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- League team invitations (host invites existing teams to join the league auction)
CREATE TABLE IF NOT EXISTS league_team_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id    UUID REFERENCES auctions(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE CASCADE,
  invited_by_id UUID REFERENCES users(id),
  status        VARCHAR(50) NOT NULL DEFAULT 'PENDING',  -- PENDING | ACCEPTED | DECLINED
  league_team_id UUID REFERENCES league_teams(id),       -- set when accepted
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(auction_id, team_id)
);

-- League team rosters (players acquired via auction)
CREATE TABLE IF NOT EXISTS league_team_rosters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_team_id UUID REFERENCES league_teams(id) ON DELETE CASCADE,
  player_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  price_paid     DECIMAL(10,2) NOT NULL DEFAULT 0,
  acquired_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_team_id, player_id)
);

-- League fixtures (generated after auction completes)
CREATE TABLE IF NOT EXISTS league_fixtures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id     UUID REFERENCES auctions(id) ON DELETE CASCADE,
  tournament_id  UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round          INTEGER NOT NULL,
  match_number   INTEGER NOT NULL,
  home_team_id   UUID REFERENCES league_teams(id),
  away_team_id   UUID REFERENCES league_teams(id),
  stage          VARCHAR(50) NOT NULL DEFAULT 'GROUP',  -- GROUP | QF | SF | FINAL
  scheduled_date TIMESTAMP,
  status         VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  match_id       UUID REFERENCES matches(id),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add auction_id to auction_bids & auction_results for league_team tracking
ALTER TABLE auction_results
  ADD COLUMN IF NOT EXISTS league_team_id UUID REFERENCES league_teams(id);

ALTER TABLE auction_bids
  ADD COLUMN IF NOT EXISTS league_team_id UUID REFERENCES league_teams(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_teams_auction       ON league_teams(auction_id);
CREATE INDEX IF NOT EXISTS idx_league_team_inv_auction    ON league_team_invitations(auction_id);
CREATE INDEX IF NOT EXISTS idx_league_team_inv_team       ON league_team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_league_team_rosters_team   ON league_team_rosters(league_team_id);
CREATE INDEX IF NOT EXISTS idx_league_fixtures_auction    ON league_fixtures(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_players_round      ON auction_players(auction_id, auction_round, sort_order);
