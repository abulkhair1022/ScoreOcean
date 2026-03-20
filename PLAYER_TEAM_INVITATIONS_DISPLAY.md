# Player Team Invitations Display

## Summary
Added team invitation display and accept/decline functionality to the Player Dashboard so players can see and respond to team invitations.

## Problem
Players were receiving team invitations but had no way to see or respond to them in their dashboard.

## Solution

### Backend Changes

#### Updated `getPlayerInvitations()` Method
**File:** `apps/backend/src/services/team.service.ts`

**Change:** Added `teamName` to the response object

**Before:**
```typescript
return result.rows.map(row => ({
  id: row.id,
  teamId: row.team_id,
  playerId: row.player_id,
  status: row.status,
  createdAt: row.created_at,
}));
```

**After:**
```typescript
return result.rows.map(row => ({
  id: row.id,
  teamId: row.team_id,
  playerId: row.player_id,
  status: row.status,
  createdAt: row.created_at,
  teamName: row.team_name, // Added team name
}));
```

### Frontend Changes

#### Player Dashboard (`apps/frontend/src/pages/dashboards/PlayerDashboard.tsx`)

**1. Added Toast Notifications**
```typescript
import { showToast } from '../../utils/toast';
```

**2. Added Accept/Decline Handlers**
```typescript
const handleAcceptInvitation = async (invitationId: string) => {
  try {
    await apiClient.post(`/teams/invitations/${invitationId}/accept`);
    showToast.success('Invitation accepted! You are now part of the team.');
    fetchDashboardData(); // Refresh
  } catch (error: any) {
    showToast.error(error.response?.data?.message || 'Failed to accept invitation');
  }
};

const handleDeclineInvitation = async (invitationId: string) => {
  try {
    await apiClient.post(`/teams/invitations/${invitationId}/decline`);
    showToast.success('Invitation declined');
    fetchDashboardData(); // Refresh
  } catch (error: any) {
    showToast.error(error.response?.data?.message || 'Failed to decline invitation');
  }
};
```

**3. Enhanced Invitation Display**
- Shows team name prominently
- Displays invitation date
- Icon for visual appeal
- Badge showing number of pending invitations
- Accept button (green)
- Decline button (gray)
- Hover effects

## User Experience

### Invitation Card Features

1. **Visual Design**
   - Yellow background (attention-grabbing)
   - Team icon in circle
   - Clear team name in blue
   - Invitation date

2. **Information Displayed**
   - "Invitation from [Team Name]"
   - Date invited
   - Pending count badge

3. **Actions**
   - Accept button (green) - Joins the team
   - Decline button (gray) - Rejects invitation

4. **Feedback**
   - Toast notification on success
   - Toast notification on error
   - Invitation removed from list after action
   - Dashboard refreshes automatically

### Flow

1. **Team Manager Invites Player**
   - Goes to Team Dashboard
   - Clicks "Invite Player"
   - Selects player
   - Clicks "Invite"
   - Toast: "Invitation sent successfully!"

2. **Player Receives Invitation**
   - Goes to Player Dashboard
   - Sees "Team Invitations" section
   - Badge shows "1 pending"
   - Invitation card displays team name

3. **Player Accepts**
   - Clicks "Accept" button
   - Toast: "Invitation accepted! You are now part of the team."
   - Invitation disappears from list
   - Player is now in team roster

4. **Player Declines**
   - Clicks "Decline" button
   - Toast: "Invitation declined"
   - Invitation disappears from list

## API Endpoints Used

### Get Player Invitations
```bash
GET /api/teams/invitations/player/:playerId
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "invitation-uuid",
    "teamId": "team-uuid",
    "playerId": "player-uuid",
    "status": "PENDING",
    "createdAt": "2026-02-23T...",
    "teamName": "Al Firdous"
  }
]
```

### Accept Invitation
```bash
POST /api/teams/invitations/:invitationId/accept
Authorization: Bearer <token>

Response: 204 No Content
```

### Decline Invitation
```bash
POST /api/teams/invitations/:invitationId/decline
Authorization: Bearer <token>

Response: 204 No Content
```

## Testing

### Manual Test Steps

1. **Create Invitation**
   - Login as team manager
   - Go to Team Dashboard
   - Click "Invite Player"
   - Select a player
   - Click "Invite"
   - Verify toast: "Invitation sent successfully!"

2. **View Invitation**
   - Logout
   - Login as the invited player
   - Go to Dashboard
   - Verify "Team Invitations" section appears
   - Verify team name is displayed
   - Verify invitation date is shown
   - Verify badge shows "1 pending"

3. **Accept Invitation**
   - Click "Accept" button
   - Verify toast: "Invitation accepted! You are now part of the team."
   - Verify invitation disappears
   - Go to Teams page
   - Verify player is now in team roster

4. **Decline Invitation**
   - Create another invitation
   - Login as player
   - Click "Decline" button
   - Verify toast: "Invitation declined"
   - Verify invitation disappears
   - Verify player is NOT in team roster

### Database Verification

```sql
-- Check pending invitations for a player
SELECT ti.id, ti.status, t.name as team_name, ti.created_at
FROM team_invitations ti
JOIN teams t ON ti.team_id = t.id
WHERE ti.player_id = '<player-uuid>' AND ti.status = 'PENDING';

-- Check accepted invitations
SELECT ti.id, ti.status, t.name as team_name
FROM team_invitations ti
JOIN teams t ON ti.team_id = t.id
WHERE ti.player_id = '<player-uuid>' AND ti.status = 'ACCEPTED';

-- Check if player is in team roster
SELECT tr.id, t.name as team_name, tr.joined_at
FROM team_rosters tr
JOIN teams t ON tr.team_id = t.id
WHERE tr.player_id = '<player-uuid>';
```

## Edge Cases Handled

1. **No Invitations**
   - Section doesn't appear if no invitations
   - Dashboard shows normally

2. **Multiple Invitations**
   - All invitations displayed in list
   - Badge shows total count
   - Can accept/decline individually

3. **Already in Team**
   - Backend prevents accepting if already in another team
   - Error toast shows: "Player is already a member of team..."

4. **Expired/Invalid Invitation**
   - Backend validates invitation exists
   - Error toast shows appropriate message

5. **Network Error**
   - Error toast shows: "Failed to accept/decline invitation"
   - Invitation remains in list
   - Player can retry

## Benefits

1. **Visibility** - Players can see all pending invitations
2. **Easy Response** - One-click accept or decline
3. **Feedback** - Toast notifications confirm actions
4. **Auto-Refresh** - List updates after action
5. **Clear Info** - Team name and date displayed
6. **Visual Appeal** - Icons, colors, badges

## Future Enhancements

1. **Invitation Details** - Show team sport, location, roster size
2. **Bulk Actions** - Accept/decline multiple invitations
3. **Expiration** - Auto-expire old invitations
4. **Notifications** - Real-time notification when invited
5. **Team Preview** - View team details before accepting
6. **Invitation History** - See past accepted/declined invitations
7. **Undo** - Undo decline within time window

## Related Files

- `apps/backend/src/services/team.service.ts` - Added teamName to response
- `apps/frontend/src/pages/dashboards/PlayerDashboard.tsx` - Invitation display and handlers
- `apps/frontend/src/utils/toast.ts` - Toast notifications
- `apps/backend/src/routes/team.ts` - Accept/decline endpoints

## Notes

- Invitations are filtered to show only PENDING status
- Accepted invitations automatically add player to roster
- Declined invitations are marked but not deleted
- Player can only be in one team at a time (enforced by backend)
- Toast notifications auto-dismiss after 3-4 seconds
- Dashboard refreshes after accept/decline to update UI
