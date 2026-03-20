-- ============================================================
-- Score Ocean - Dummy Seed Data
-- 5 Organizations, 10 Teams, 100 Players
-- ============================================================

-- Use a fixed password hash for all users: "Password@123"
-- bcrypt hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

DO $$
DECLARE
  -- Organization user IDs
  org1_id UUID := gen_random_uuid();
  org2_id UUID := gen_random_uuid();
  org3_id UUID := gen_random_uuid();
  org4_id UUID := gen_random_uuid();
  org5_id UUID := gen_random_uuid();

  -- Team host user IDs (one per team)
  team_host_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  -- Team IDs
  team_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  -- Player user IDs (100 players)
  player_ids UUID[];

  sports TEXT[] := ARRAY['CRICKET','FOOTBALL','BASKETBALL','BADMINTON','KABADDI','VOLLEYBALL'];
  cities  TEXT[] := ARRAY['Mumbai','Delhi','Bangalore','Chennai','Kolkata','Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow'];
  states  TEXT[] := ARRAY['Maharashtra','Delhi','Karnataka','Tamil Nadu','West Bengal','Telangana','Maharashtra','Gujarat','Rajasthan','Uttar Pradesh'];

  i INTEGER;
  p_id UUID;
  sport_pick TEXT;
  city_pick TEXT;
  state_pick TEXT;
  team_sport TEXT;
  team_idx INTEGER;
BEGIN

  -- --------------------------------------------------------
  -- 1. INSERT ORGANIZATIONS (5)
  -- --------------------------------------------------------
  INSERT INTO users (id, email, password_hash, role) VALUES
    (org1_id, 'org1@scoreocean.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ORGANIZATION'),
    (org2_id, 'org2@scoreocean.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ORGANIZATION'),
    (org3_id, 'org3@scoreocean.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ORGANIZATION'),
    (org4_id, 'org4@scoreocean.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ORGANIZATION'),
    (org5_id, 'org5@scoreocean.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ORGANIZATION');

  INSERT INTO user_profiles (user_id, name, age, city, state, country, phone) VALUES
    (org1_id, 'Sports India Foundation',  NULL, 'Mumbai',    'Maharashtra', 'India', '9000000001'),
    (org2_id, 'Delhi Sports Council',     NULL, 'Delhi',     'Delhi',       'India', '9000000002'),
    (org3_id, 'Bangalore Athletic Club',  NULL, 'Bangalore', 'Karnataka',   'India', '9000000003'),
    (org4_id, 'Chennai Premier League',   NULL, 'Chennai',   'Tamil Nadu',  'India', '9000000004'),
    (org5_id, 'Kolkata Sports Authority', NULL, 'Kolkata',   'West Bengal', 'India', '9000000005');

  -- --------------------------------------------------------
  -- 2. INSERT TEAM HOST USERS + TEAMS (10)
  -- --------------------------------------------------------
  FOR i IN 1..10 LOOP
    sport_pick := sports[((i - 1) % 6) + 1];
    city_pick  := cities[i];
    state_pick := states[i];

    -- Team host user
    INSERT INTO users (id, email, password_hash, role)
    VALUES (team_host_ids[i], 'teamhost' || i || '@scoreocean.com',
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TEAM');

    INSERT INTO user_profiles (user_id, name, age, city, state, country, phone)
    VALUES (team_host_ids[i], 'Team ' || i || ' Manager', 30 + i,
            city_pick, state_pick, 'India', '910000' || LPAD(i::TEXT, 4, '0'));

    -- Team
    INSERT INTO teams (id, name, sport, host_id, city, state, country, statistics)
    VALUES (
      team_ids[i],
      'Team ' || i,
      sport_pick,
      team_host_ids[i],
      city_pick,
      state_pick,
      'India',
      jsonb_build_object('wins', (i * 3) % 15, 'losses', (i * 2) % 10, 'draws', i % 5)
    );

    -- Team sport profile
    INSERT INTO team_sport_profiles (team_id, sport, statistics)
    VALUES (team_ids[i], sport_pick, jsonb_build_object('matches_played', (i * 5) % 30, 'wins', (i * 3) % 15));
  END LOOP;

  -- --------------------------------------------------------
  -- 3. INSERT 100 PLAYERS
  -- --------------------------------------------------------
  player_ids := ARRAY[]::UUID[];

  FOR i IN 1..100 LOOP
    p_id       := gen_random_uuid();
    sport_pick := sports[((i - 1) % 6) + 1];
    city_pick  := cities[((i - 1) % 10) + 1];
    state_pick := states[((i - 1) % 10) + 1];

    player_ids := player_ids || p_id;

    -- User record
    INSERT INTO users (id, email, password_hash, role)
    VALUES (p_id, 'player' || i || '@scoreocean.com',
            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'PLAYER');

    -- Profile
    INSERT INTO user_profiles (user_id, name, age, city, state, country, phone)
    VALUES (p_id, 'Player ' || i, 18 + (i % 20), city_pick, state_pick, 'India',
            '98' || LPAD(i::TEXT, 8, '0'));

    -- Sport profile with sport-specific stats
    INSERT INTO sport_profiles (user_id, sport, statistics, base_price)
    VALUES (
      p_id,
      sport_pick,
      CASE sport_pick
        WHEN 'CRICKET' THEN jsonb_build_object(
          'runs', (i * 47) % 3000,
          'wickets', (i * 13) % 150,
          'battingAverage', ROUND(((i * 7.3) % 60)::NUMERIC, 2),
          'bowlingAverage', ROUND(((i * 4.1) % 40)::NUMERIC, 2),
          'strikeRate', ROUND(((i * 11.7) % 180)::NUMERIC, 2)
        )
        WHEN 'FOOTBALL' THEN jsonb_build_object(
          'goals', (i * 3) % 50,
          'assists', (i * 2) % 30,
          'cleanSheets', i % 15,
          'saves', (i * 5) % 80,
          'yellowCards', i % 8,
          'redCards', i % 3
        )
        WHEN 'BASKETBALL' THEN jsonb_build_object(
          'points', (i * 11) % 500,
          'rebounds', (i * 4) % 200,
          'assists', (i * 3) % 150,
          'steals', (i * 2) % 80,
          'blocks', i % 50
        )
        WHEN 'BADMINTON' THEN jsonb_build_object(
          'matchesWon', (i * 3) % 60,
          'matchesLost', (i * 2) % 40,
          'setsWon', (i * 5) % 120,
          'ranking', (i * 7) % 200
        )
        WHEN 'KABADDI' THEN jsonb_build_object(
          'raidPoints', (i * 9) % 300,
          'tacklePoints', (i * 6) % 200,
          'superRaids', i % 20,
          'superTackles', i % 15
        )
        WHEN 'VOLLEYBALL' THEN jsonb_build_object(
          'spikes', (i * 8) % 250,
          'blocks', (i * 4) % 100,
          'serves', (i * 6) % 200,
          'digs', (i * 5) % 180,
          'aces', (i * 2) % 60
        )
        ELSE '{}'::jsonb
      END,
      (500 + (i * 150) % 9500)::NUMERIC
    );

    -- Assign each player to a team (10 players per team)
    team_idx := ((i - 1) / 10) + 1;
    INSERT INTO team_rosters (team_id, player_id, sport)
    VALUES (team_ids[team_idx], p_id, sport_pick)
    ON CONFLICT (team_id, player_id, sport) DO NOTHING;

  END LOOP;

  -- --------------------------------------------------------
  -- 4. SET CAPTAINS (first player of each team)
  -- --------------------------------------------------------
  FOR i IN 1..10 LOOP
    UPDATE teams
    SET captain_id = player_ids[((i - 1) * 10) + 1]
    WHERE id = team_ids[i];
  END LOOP;

  RAISE NOTICE 'Seed data inserted successfully: 5 orgs, 10 teams, 100 players';
END $$;
