# Payment Pending Issue - Fixed

## Problem

After successful payment, league registrations were showing "Payment Pending" status instead of "Registered/Confirmed".

## Root Cause

The payment completion flow had two issues:

### Issue 1: Payment Service Not Handling League Registrations
The `handlePaymentCaptured` method in `payment.service.ts` was only updating team registrations:
```typescript
// Old code - only handled team registrations
UPDATE tournament_registrations 
SET status = 'CONFIRMED', payment_id = $2 
WHERE tournament_id = $3 
  AND team_id IN (SELECT id FROM teams WHERE host_id = $4)
```

This query would fail for league registrations because:
- League registrations have `player_id` set (not `team_id`)
- The WHERE clause was looking for team_id

### Issue 2: Registration Created Without Payment Link
When a player registers for a league with a fee:
1. Registration is created with status = 'PENDING' and payment_id = NULL
2. Payment is processed
3. Payment service tries to update registration but can't find it (no payment_id link)

## Solution

### Fix 1: Updated Payment Service (✅ Completed)

Modified `handlePaymentCaptured` in `apps/backend/src/services/payment.service.ts` to:

1. Check tournament format (LEAGUE vs TOURNAMENT)
2. For LEAGUES: Update player registrations
3. For TOURNAMENTS: Update team registrations

```typescript
// Get tournament format
const tournament = await query('SELECT name, format FROM tournaments WHERE id = $1', [tournamentId]);
const isLeague = tournament.format === 'LEAGUE';

if (isLeague) {
  // Update player registration
  await query(
    'UPDATE tournament_registrations SET status = $1, payment_id = $2 
     WHERE tournament_id = $3 AND player_id = $4',
    ['CONFIRMED', paymentId, tournamentId, userId]
  );
} else {
  // Update team registration
  await query(
    'UPDATE tournament_registrations SET status = $1, payment_id = $2 
     WHERE tournament_id = $3 AND team_id IN (SELECT id FROM teams WHERE host_id = $4)',
    ['CONFIRMED', paymentId, tournamentId, userId]
  );
}
```

### Fix 2: Manual Database Update (✅ Completed)

Fixed the existing pending registration:
```sql
UPDATE tournament_registrations
SET 
  payment_id = '08ba255e-9f42-43d4-a780-6cb5ea9a34d1',
  status = 'CONFIRMED'
WHERE id = '8903ea90-4291-4feb-89f3-8b63d95b0d67';
```

## Testing

### Test Case 1: League Registration with Payment
1. ✅ Player registers for league with fee
2. ✅ Registration created with status = PENDING
3. ✅ Payment modal opens
4. ✅ Payment completed successfully
5. ✅ Registration status updated to CONFIRMED
6. ✅ UI shows "Registered" instead of "Payment Pending"

### Test Case 2: Tournament Registration with Payment
1. ✅ Team registers for tournament with fee
2. ✅ Registration created with status = PENDING
3. ✅ Payment modal opens
4. ✅ Payment completed successfully
5. ✅ Registration status updated to CONFIRMED
6. ✅ UI shows "Registered" instead of "Payment Pending"

### Test Case 3: Free Registration (No Payment)
1. ✅ Player/Team registers for free tournament/league
2. ✅ Registration created with status = CONFIRMED immediately
3. ✅ No payment required
4. ✅ UI shows "Registered"

## Files Modified

1. `apps/backend/src/services/payment.service.ts`
   - Updated `handlePaymentCaptured` method
   - Added tournament format check
   - Separate logic for league vs tournament registrations

## SQL Scripts Created

1. `fix_pending_league_registration.sql` - Generic fix for all pending registrations
2. `check_registration_status.sql` - Diagnostic queries
3. `fix_specific_pending_registration.sql` - Fix for specific registration

## Verification

Run this query to verify no pending registrations with completed payments:

```sql
SELECT 
  tr.id,
  tr.status as registration_status,
  p.status as payment_status,
  t.name as tournament_name
FROM tournament_registrations tr
JOIN payments p ON tr.payment_id = p.id
JOIN tournaments t ON tr.tournament_id = t.id
WHERE tr.status = 'PENDING' 
  AND p.status = 'COMPLETED';
```

Expected result: 0 rows (no pending registrations with completed payments)

## Future Improvements

### Option 1: Link Payment ID During Registration Creation
Modify the registration flow to:
1. Create payment record first
2. Create registration with payment_id already linked
3. Process payment
4. Update both payment and registration status

### Option 2: Add Payment Webhook Handler
Implement proper Razorpay webhook handling:
1. Razorpay sends webhook on payment success
2. Webhook handler updates registration status
3. More reliable than client-side completion

### Option 3: Add Retry Logic
If payment completion fails to update registration:
1. Log the error
2. Queue for retry
3. Send notification to admin

## Status

✅ **FIXED** - Payment pending issue resolved for both leagues and tournaments

---

**Fixed on**: 2026-02-26
**Fixed by**: Kiro AI Assistant

