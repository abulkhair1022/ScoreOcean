-- Fix pending league registration after successful payment
-- This script updates the registration status to CONFIRMED for completed payments

-- First, let's see the pending registrations with completed payments
SELECT 
  tr.id as registration_id,
  tr.tournament_id,
  tr.player_id,
  tr.status as registration_status,
  tr.payment_id,
  p.status as payment_status,
  p.completed_at,
  t.name as tournament_name,
  u.email as player_email
FROM tournament_registrations tr
JOIN payments p ON tr.payment_id = p.id
JOIN tournaments t ON tr.tournament_id = t.id
JOIN users u ON tr.player_id = u.id
WHERE tr.status = 'PENDING' 
  AND p.status = 'COMPLETED'
  AND tr.player_id IS NOT NULL;

-- Update the registration status to CONFIRMED where payment is completed
UPDATE tournament_registrations tr
SET status = 'CONFIRMED'
FROM payments p
WHERE tr.payment_id = p.id
  AND tr.status = 'PENDING'
  AND p.status = 'COMPLETED'
  AND tr.player_id IS NOT NULL;

-- Verify the update
SELECT 
  tr.id as registration_id,
  tr.tournament_id,
  tr.player_id,
  tr.status as registration_status,
  tr.payment_id,
  p.status as payment_status,
  t.name as tournament_name,
  u.email as player_email
FROM tournament_registrations tr
JOIN payments p ON tr.payment_id = p.id
JOIN tournaments t ON tr.tournament_id = t.id
JOIN users u ON tr.player_id = u.id
WHERE tr.player_id IS NOT NULL
ORDER BY tr.registered_at DESC
LIMIT 10;
