# Tournament Publish Notifications Feature

## Overview
When a tournament is published (status changed from DRAFT to REGISTRATION_OPEN), notifications are automatically sent to all potential participants.

## Notification Logic

### For Leagues (Auction-Based)
- **Recipients:** All players in the system (users with role = 'PLAYER')
- **Reason:** Leagues require individual player registration, so all players should be notified
- **Notification Type:** NEW_TOURNAMENT
- **Title:** "New {SPORT} League Open!"
- **Message:** "New league '{NAME}' is now open for registration! Sport: {SPORT}, Fee: ₹{FEE}"

### For Tournaments (Team-Based)
- **Recipients:** All team hosts/captains who have teams in the matching sport
- **Reason:** Tournaments require team registration, so only team owners of relevant sport should be notified
- **Notification Type:** NEW_TOURNAMENT
- **Title:** "New {SPORT} Tournament Open!"
- **Message:** "New tournament '{NAME}' is now open for registration! Sport: {SPORT}, Fee: ₹{FEE}"

## Implementation Details

### When Notifications Are Sent
Notifications are triggered when:
1. Tournament status changes from DRAFT → REGISTRATION_OPEN
2. Host clicks "Publish Tournament" button

### Notification Channels
- **IN_APP:** Shows in notification bell
- **EMAIL:** Sent to user's email (if email service is configured)

### Notification Data
Each notification includes:
```json
{
  "tournamentId": "uuid",
  "sport": "CRICKET",
  "format": "LEAGUE",
  "registrationFee": 500
}
```

## Status Change Notifications

For other status changes (after registration), notifications are sent only to registered participants:

### REGISTRATION_CLOSED
- **For Leagues:** Notify all registered players
- **For Tournaments:** Notify all registered team hosts

### FIXTURES_PUBLISHED
- **For Leagues:** Notify all registered players
- **For Tournaments:** Notify all registered team hosts

### IN_PROGRESS
- **For Leagues:** Notify all registered players
- **For Tournaments:** Notify all registered team hosts

### COMPLETED
- **For Leagues:** Notify all registered players
- **For Tournaments:** Notify all registered team hosts

## Testing

### Test Scenario 1: Publish a League
1. Create a league tournament (format: LEAGUE)
2. Set status to DRAFT
3. Click "Publish Tournament" (changes status to REGISTRATION_OPEN)
4. **Expected:** All players receive notification

### Test Scenario 2: Publish a Tournament
1. Create a tournament (format: KNOCKOUT/GROUP_KNOCKOUT)
2. Set status to DRAFT
3. Click "Publish Tournament"
4. **Expected:** All team hosts with teams in that sport receive notification

### Verify Notifications
1. Check notification bell icon (should show count)
2. Click bell to see notification list
3. Notification should show:
   - Title: "New {SPORT} League/Tournament Open!"
   - Message with tournament name and details
   - Timestamp

## Database Query Examples

### Check notifications sent for a tournament
```sql
SELECT 
  n.id,
  n.user_id,
  u.email,
  n.type,
  n.title,
  n.message,
  n.read,
  n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.data->>'tournamentId' = 'YOUR_TOURNAMENT_ID'
ORDER BY n.created_at DESC;
```

### Count notifications by type
```sql
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN read = true THEN 1 END) as read_count,
  COUNT(CASE WHEN read = false THEN 1 END) as unread_count
FROM notifications
WHERE type = 'NEW_TOURNAMENT'
GROUP BY type;
```

### Get all unread tournament notifications for a user
```sql
SELECT 
  n.id,
  n.title,
  n.message,
  n.created_at,
  n.data->>'tournamentId' as tournament_id,
  t.name as tournament_name
FROM notifications n
LEFT JOIN tournaments t ON (n.data->>'tournamentId')::uuid = t.id
WHERE n.user_id = 'YOUR_USER_ID'
  AND n.type = 'NEW_TOURNAMENT'
  AND n.read = false
ORDER BY n.created_at DESC;
```

## Code Changes

### Files Modified
1. **apps/backend/src/services/tournament.service.ts**
   - Updated `sendStatusChangeNotifications()` method
   - Added `notifyTournamentPublished()` method
   - Added logic to differentiate between leagues and tournaments
   - Added logic to notify all users vs registered users

### Key Methods

#### `sendStatusChangeNotifications()`
- Checks if status is REGISTRATION_OPEN
- If yes, calls `notifyTournamentPublished()`
- Otherwise, notifies only registered participants

#### `notifyTournamentPublished()`
- Checks tournament format (LEAGUE vs TOURNAMENT)
- For leagues: queries all players
- For tournaments: queries team hosts with matching sport
- Creates notification records for each recipient

## Performance Considerations

### For Large User Bases
If you have many users, consider:
1. **Batch notifications:** Use bulk insert instead of individual inserts
2. **Background jobs:** Queue notifications for async processing
3. **Sport filtering:** For tournaments, only notify teams of matching sport (already implemented)
4. **User preferences:** Check notification preferences before sending (future enhancement)

### Optimization Example
```typescript
// Instead of individual inserts:
for (const player of players) {
  await query('INSERT INTO notifications...');
}

// Use bulk insert:
const values = players.map(p => `('${p.id}', 'NEW_TOURNAMENT', ...)`).join(',');
await query(`INSERT INTO notifications (user_id, type, ...) VALUES ${values}`);
```

## Future Enhancements

1. **User Preferences:** Allow users to opt-out of tournament notifications
2. **Sport Preferences:** Only notify users about their preferred sports
3. **Location-Based:** Notify users based on tournament location
4. **Digest Notifications:** Group multiple tournament notifications into daily digest
5. **Push Notifications:** Add mobile push notifications
6. **SMS Notifications:** Add SMS for important tournaments

## Notification Types Reference

| Type | When Sent | Recipients |
|------|-----------|------------|
| NEW_TOURNAMENT | Tournament published | All players (league) or team hosts (tournament) |
| TOURNAMENT_UPDATE | Status change | Registered participants only |
| REGISTRATION_CONFIRMED | Payment success | Individual user |
| FIXTURES_PUBLISHED | Fixtures generated | Registered participants |
| MATCH_REMINDER | Before match | Participating teams/players |

---

**Feature Status:** ✅ Implemented and Ready to Test

Test by creating and publishing a tournament to see notifications in action!
