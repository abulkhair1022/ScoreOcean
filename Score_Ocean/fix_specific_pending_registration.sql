-- Fix the specific pending registration by linking it to the completed payment
-- Registration ID: 8903ea90-4291-4feb-89f3-8b63d95b0d67
-- Payment ID: 08ba255e-9f42-43d4-a780-6cb5ea9a34d1

-- First verify the data
SELECT 
  'BEFORE UPDATE' as stage,
  tr.id as registration_id,
  tr.status as registration_status,
  tr.payment_id,
  p.id as payment_id_from_payments,
  p.status as payment_status,
  t.name as tournament_name
FROM tournament_registrations tr
LEFT JOIN payments p ON p.user_id = tr.player_id AND p.tournament_id = tr.tournament_id
JOIN tournaments t ON tr.tournament_id = t.id
WHERE tr.id = '8903ea90-4291-4feb-89f3-8b63d95b0d67';

-- Update the registration to link the payment and set status to CONFIRMED
UPDATE tournament_registrations
SET 
  payment_id = '08ba255e-9f42-43d4-a780-6cb5ea9a34d1',
  status = 'CONFIRMED'
WHERE id = '8903ea90-4291-4feb-89f3-8b63d95b0d67';

-- Verify the update
SELECT 
  'AFTER UPDATE' as stage,
  tr.id as registration_id,
  tr.status as registration_status,
  tr.payment_id,
  p.status as payment_status,
  t.name as tournament_name
FROM tournament_registrations tr
LEFT JOIN payments p ON tr.payment_id = p.id
JOIN tournaments t ON tr.tournament_id = t.id
WHERE tr.id = '8903ea90-4291-4feb-89f3-8b63d95b0d67';
