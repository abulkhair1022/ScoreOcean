-- Manual test: Create a DRAFT tournament and then "publish" it via API

-- Step 1: Create a test DRAFT tournament
INSERT INTO tournaments (
  name, sport, format, competition_type, host_id, host_type,
  start_date, end_date, venue, registration_fee, registration_deadline,
  team_capacity, status, rules
) VALUES (
  'Notification Test League',
  'CRICKET',
  'LEAGUE',
  'TOURNAMENT',
  (SELECT id FROM users WHERE role = 'PLAYER' LIMIT 1),
  'INDIVIDUAL',
  '2026-03-15',
  '2026-03-22',
  'Test Venue',
  100,
  '2026-03-10 23:59:59',
  16,
  'DRAFT',
  '{}'::jsonb
) RETURNING id, name, status;

-- Step 2: Check how many players exist (potential recipients)
SELECT COUNT(*) as player_count FROM users WHERE role = 'PLAYER';

-- Step 3: Now use the API to publish this tournament
-- Go to your browser/Postman and call:
-- POST /api/tournaments/{tournament_id}/publish
-- with authentication header

-- Step 4: After publishing via API, check notifications
-- SELECT COUNT(*) FROM notifications WHERE type = 'NEW_TOURNAMENT';
