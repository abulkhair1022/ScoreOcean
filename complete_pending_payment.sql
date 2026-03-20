-- Complete the pending payment and update registration status

-- First, let's see the pending payment
SELECT 
  p.id as payment_id,
  p.user_id,
  p.tournament_id,
  p.amount,
  p.status as payment_status,
  p.gateway_transaction_id,
  t.name as tournament_name
FROM payments p
JOIN tournaments t ON p.tournament_id = t.id
WHERE p.status = 'PROCESSING'
ORDER BY p.created_at DESC
LIMIT 5;

-- Update payment status to COMPLETED
UPDATE payments 
SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
WHERE status = 'PROCESSING';

-- Update registration status to CONFIRMED for registrations with payment
UPDATE tournament_registrations tr
SET status = 'CONFIRMED'
FROM payments p
WHERE p.tournament_id = tr.tournament_id
  AND p.user_id IN (
    SELECT player_id FROM tournament_registrations WHERE id = tr.id
    UNION
    SELECT host_id FROM teams WHERE id = tr.team_id
  )
  AND p.status = 'COMPLETED'
  AND tr.status = 'PENDING';

-- Show updated registrations
SELECT 
  tr.id,
  t.name as tournament_name,
  tr.status as registration_status,
  tr.player_id,
  tr.team_id,
  p.status as payment_status
FROM tournament_registrations tr
JOIN tournaments t ON tr.tournament_id = t.id
LEFT JOIN payments p ON p.tournament_id = tr.tournament_id
ORDER BY tr.registered_at DESC
LIMIT 5;
