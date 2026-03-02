# Testing Tournament Publish Notifications

## Changes Made

### 1. Fixed Registration Logic ✅
- **Players** can ONLY register for **Leagues** (individual registration)
- **Team Hosts** can ONLY register for **Tournaments** (team registration)
- Updated frontend to show appropriate buttons based on format and user role

### 2. Fixed Notification Sending ✅
- Added notification trigger to `publishTournament()` method
- Notifications now sent when tournament is published (DRAFT → REGISTRATION_OPEN)

## How to Test

### Step 1: Create a Draft Tournament

1. Go to Tournaments page
2. Click "Create Tournament"
3. Fill in details:
   - **For League Test:**
     - Name: "Test League Notifications"
     - Sport: CRICKET
     - Format: LEAGUE
     - Competition Type: TOURNAMENT
   - **For Tournament Test:**
     - Name: "Test Tournament Notifications"  
     - Sport: CRICKET
     - Format: KNOCKOUT
     - Competition Type: TOURNAMENT
4. Save (it will be in DRAFT status)

### Step 2: Publish the Tournament

1. Open the tournament details
2. Click "Publish Tournament" button
3. Tournament status changes to REGISTRATION_OPEN

### Step 3: Check Notifications

1. Click the notification bell icon (top right)
2. You should see a notification:
   - **For League:** "New CRICKET League Open!"
   - **For Tournament:** "New CRICKET Tournament Open!"

### Step 4: Verify Who Received Notifications

**For League:**
```sql
-- Check how many players received notification
SELECT COUNT(DISTINCT n.user_id) as player_count
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'NEW_TOURNAMENT'
  AND n.data->>'tournamentId' = 'YOUR_TOURNAMENT_ID'
  AND u.role = 'PLAYER';
```

**For Tournament:**
```sql
-- Check how many team hosts received notification
SELECT COUNT(DISTINCT n.user_id) as host_count
FROM notifications n
WHERE n.type = 'NEW_TOURNAMENT'
  AND n.data->>'tournamentId' = 'YOUR_TOURNAMENT_ID';

-- See which teams' hosts were notified
SELECT 
  u.email,
  t.name as team_name,
  t.sport
FROM notifications n
JOIN users u ON n.user_id = u.id
JOIN teams t ON t.host_id = u.id
WHERE n.type = 'NEW_TOURNAMENT'
  AND n.data->>'tournamentId' = 'YOUR_TOURNAMENT_ID';
```

## Expected Behavior

### League Registration
- ✅ Players see "Register as Player" button
- ✅ Team hosts see "View Details" button (cannot register)
- ✅ All players receive notification when published

### Tournament Registration  
- ✅ Team hosts see "Register Team" button
- ✅ Players without teams see "View Details" button
- ✅ Only team hosts with matching sport receive notification

## Registration Flow

### For Leagues (Player Registration)
1. Player clicks "Register as Player"
2. Modal shows player details form (role, position, experience)
3. Player fills details and clicks "Confirm Registration"
4. If fee > 0: Razorpay modal opens
5. Player completes payment
6. Registration confirmed

### For Tournaments (Team Registration)
1. Team host clicks "Register Team"
2. Modal shows team selection dropdown
3. Host selects team and clicks "Confirm Registration"
4. If fee > 0: Razorpay modal opens
5. Host completes payment
6. Team registration confirmed

## Troubleshooting

### No notifications received?
1. Check tournament was published (not created directly as REGISTRATION_OPEN)
2. Check backend logs for errors
3. Verify users exist in database:
   ```sql
   -- Count players
   SELECT COUNT(*) FROM users WHERE role = 'PLAYER';
   
   -- Count teams
   SELECT COUNT(*) FROM teams;
   ```

### Wrong users receiving notifications?
1. For leagues: Check user role is 'PLAYER'
2. For tournaments: Check teams exist with matching sport
3. Check notification data:
   ```sql
   SELECT * FROM notifications 
   WHERE type = 'NEW_TOURNAMENT' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### Registration button not showing?
1. Check tournament status is REGISTRATION_OPEN
2. Check user role matches tournament format:
   - League → Player role required
   - Tournament → Player role required (to be team host)
3. Check user is not already registered

## Summary

✅ Players can only register for leagues
✅ Team hosts can only register for tournaments  
✅ Notifications sent when tournament is published
✅ Correct users receive notifications based on format
✅ Payment flow works for both leagues and tournaments

---

**Test the feature now by creating and publishing a tournament!**
