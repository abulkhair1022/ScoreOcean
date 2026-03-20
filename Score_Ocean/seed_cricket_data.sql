-- ============================================================
-- Score Ocean - Cricket Seed Data
-- 100 Cricket Players + 10 Cricket Teams
-- Password for all: Password@123
-- ============================================================

DO $$
DECLARE
  team_host_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  team_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  player_ids UUID[];
  p_id UUID;

  cities  TEXT[] := ARRAY['Mumbai','Delhi','Bangalore','Chennai','Kolkata','Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow'];
  states  TEXT[] := ARRAY['Maharashtra','Delhi','Karnataka','Tamil Nadu','West Bengal','Telangana','Maharashtra','Gujarat','Rajasthan','Uttar Pradesh'];

  team_names TEXT[] := ARRAY[
    'Mumbai Strikers','Delhi Dynamos','Bangalore Blasters','Chennai Kings',
    'Kolkata Knights','Hyderabad Hawks','Pune Warriors','Ahmedabad Titans',
    'Jaipur Royals','Lucknow Lions'
  ];

  i INTEGER;
  team_idx INTEGER;
BEGIN

  -- --------------------------------------------------------
  -- 1. CRICKET TEAMS (10)
  -- --------------------------------------------------------
  FOR i IN 1..10 LOOP
    INSERT INTO users (id, email, password_hash, role)
    VALUES (
      team_host_ids[i],
      'cricket.team' || i || '@scoreocean.com',
      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      'TEAM'
    );

    INSERT INTO user_profiles (user_id, name, age, city, state, country, phone)
    VALUES (
      team_host_ids[i],
      team_names[i] || ' Manager',
      30 + i,
      cities[i], states[i], 'India',
      '800000' || LPAD(i::TEXT, 4, '0')
    );

    INSERT INTO teams (id, name, sport, host_id, city, state, country, statistics)
    VALUES (
      team_ids[i],
      team_names[i],
      'CRICKET',
      team_host_ids[i],
      cities[i], states[i], 'India',
      jsonb_build_object(
        'wins',   (i * 4) % 20,
        'losses', (i * 3) % 15,
        'draws',  i % 5
      )
    );

    INSERT INTO team_sport_profiles (team_id, sport, statistics)
    VALUES (
      team_ids[i],
      'CRICKET',
      jsonb_build_object(
        'matches_played', (i * 5) % 40,
        'wins',           (i * 4) % 20,
        'highest_score',  150 + (i * 17) % 200
      )
    );
  END LOOP;

  -- --------------------------------------------------------
  -- 2. CRICKET PLAYERS (100)
  -- --------------------------------------------------------
  player_ids := ARRAY[]::UUID[];

  FOR i IN 1..100 LOOP
    p_id := gen_random_uuid();
    player_ids := player_ids || p_id;

    INSERT INTO users (id, email, password_hash, role)
    VALUES (
      p_id,
      'cricket.player' || i || '@scoreocean.com',
      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      'PLAYER'
    );

    INSERT INTO user_profiles (user_id, name, age, city, state, country, phone)
    VALUES (
      p_id,
      'Cricket Player ' || i,
      18 + (i % 18),
      cities[((i - 1) % 10) + 1],
      states[((i - 1) % 10) + 1],
      'India',
      '90' || LPAD(i::TEXT, 8, '0')
    );

    -- Cricket sport profile with realistic stats
    INSERT INTO sport_profiles (user_id, sport, statistics, base_price)
    VALUES (
      p_id,
      'CRICKET',
      jsonb_build_object(
        'runs',            (i * 83) % 5000,
        'wickets',         (i * 17) % 200,
        'battingAverage',  ROUND(((i * 6.7) % 65)::NUMERIC, 2),
        'bowlingAverage',  ROUND(((i * 3.9) % 45)::NUMERIC, 2),
        'strikeRate',      ROUND(((i * 13.3) % 180)::NUMERIC, 2),
        'matches',         (i * 7) % 150,
        'fifties',         (i * 3) % 30,
        'hundreds',        (i * 1) % 10,
        'bestBowling',     ((i % 6) + 1)::TEXT || '/' || ((i % 30) + 10)::TEXT,
        'catches',         (i * 4) % 60
      ),
      (1000 + (i * 250) % 19000)::NUMERIC
    );

    -- Assign 10 players per team
    team_idx := ((i - 1) / 10) + 1;
    INSERT INTO team_rosters (team_id, player_id, sport)
    VALUES (team_ids[team_idx], p_id, 'CRICKET')
    ON CONFLICT (team_id, player_id, sport) DO NOTHING;

  END LOOP;

  -- --------------------------------------------------------
  -- 3. SET CAPTAINS (first player of each team)
  -- --------------------------------------------------------
  FOR i IN 1..10 LOOP
    UPDATE teams
    SET captain_id = player_ids[((i - 1) * 10) + 1]
    WHERE id = team_ids[i];
  END LOOP;

  RAISE NOTICE 'Cricket seed inserted: 10 teams, 100 players, 10 players per team';
END $$;
