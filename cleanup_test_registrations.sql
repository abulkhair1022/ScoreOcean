-- Clean up test registrations without payment
-- This will allow you to re-test the payment flow

-- Delete registrations that don't have a payment_id
DELETE FROM tournament_registrations 
WHERE payment_id IS NULL 
AND tournament_id IN (
  SELECT id FROM tournaments WHERE name LIKE '%test%' OR name LIKE '%abc%'
);

-- Show remaining registrations
SELECT 
  tr.id,
  t.name as tournament_name,
  tr.status,
  tr.payment_id,
  tr.registered_at
FROM tournament_registrations tr
JOIN tournaments t ON tr.tournament_id = t.id
ORDER BY tr.registered_at DESC;
