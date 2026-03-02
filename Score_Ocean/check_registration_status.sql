-- Check all recent registrations and their payment status
SELECT 
  tr.id as registration_id,
  tr.tournament_id,
  tr.player_id,
  tr.team_id,
  tr.status as registration_status,
  tr.payment_id,
  tr.registered_at,
  p.id as payment_id_from_payments,
  p.status as payment_status,
  p.completed_at as payment_completed_at,
  p.gateway_transaction_id,
  t.name as tournament_name,
  t.format as tournament_format,
  COALESCE(u.email, u2.email) as user_email
FROM tournament_registrations tr
LEFT JOIN payments p ON tr.payment_id = p.id
JOIN tournaments t ON tr.tournament_id = t.id
LEFT JOIN users u ON tr.player_id = u.id
LEFT JOIN teams tm ON tr.team_id = tm.id
LEFT JOIN users u2 ON tm.host_id = u2.id
ORDER BY tr.registered_at DESC
LIMIT 10;

-- Check payments without matching registrations
SELECT 
  p.id as payment_id,
  p.user_id,
  p.tournament_id,
  p.amount,
  p.status as payment_status,
  p.completed_at,
  p.gateway_transaction_id,
  t.name as tournament_name,
  t.format as tournament_format,
  u.email as user_email
FROM payments p
JOIN tournaments t ON p.tournament_id = t.id
JOIN users u ON p.user_id = u.id
WHERE p.status = 'COMPLETED'
ORDER BY p.completed_at DESC
LIMIT 10;
