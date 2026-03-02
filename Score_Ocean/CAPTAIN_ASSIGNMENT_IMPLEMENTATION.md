# Captain Assignment Implementation - Complete

## Overview
Implemented the ability for team managers to assign a captain from their roster members. The captain is displayed with a badge in the team roster view.

## Changes Made

### 1. Database Migration
**File**: `apps/backend/src/db/migrations/add_captain_to_teams.sql`

Added `captain_id` column to teams table:
- Column type: UUID (references users.id)
- Nullable: Yes (teams don't need a captain initially)
- On delete: SET NULL (if captain user is deleted, just clear the captain)
- Index added for performance

Migration applied successfully to database.

### 2. Backend Service
**File**: `apps/backend/src/services/team.service.ts`

Added `assignCaptain()` method:
- Validates team exists
- Validates player is on the team roster
- Updates team's captain_id field
- Throws error if player is not on roster

Updated `mapRowToTeam()` method:
- Now includes `captainId` field in returned Team object

### 3. Backend Route
**File**: `apps/backend/src/routes/team.ts`

Added new endpoint:
- `PUT /api/teams/:id/captain`
- Requires authentication
- Requires team management permission
- Body: `{ captainId: string }`
- Returns success message

### 4. Type Definitions
**File**: `packages/types/src/team.ts`

Updated Team interface:
- Added optional `captainId?: string` field

### 5. Frontend - Team Dashboard
**File**: `apps/frontend/src/pages/dashboards/TeamDashboard.tsx`

Updated interfaces:
- Removed `isCaptain` from TeamMember interface
- Added `captainId` to Team interface
- Removed unused `captain` field

Updated captain badge display:
- Changed from `member.isCaptain` to `selectedTeam.captainId === member.id`
- Badge shows "Captain" in yellow for the designated captain

Existing functionality:
- "Assign Captain" button opens modal
- Modal lists all team members
- Clicking a member assigns them as captain
- Success/error toast notifications
- Team data refreshes after assignment

## User Flow

1. Team manager opens Team Dashboard
2. Clicks "Assign Captain" button
3. Modal shows list of all team members
4. Manager clicks on a member to assign as captain
5. Backend validates member is on roster
6. Database updates captain_id field
7. Success toast notification appears
8. Team data refreshes
9. Captain badge appears next to the designated member

## API Endpoint

```
PUT /api/teams/:teamId/captain
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "captainId": "uuid-of-player"
}

Response (200):
{
  "message": "Captain assigned successfully"
}

Error (400):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Player must be on the team roster to be assigned as captain"
  }
}
```

## Database Schema

```sql
ALTER TABLE teams 
ADD COLUMN captain_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_teams_captain ON teams(captain_id);
```

## Testing Checklist

- [x] Database migration applied
- [x] Backend service method created
- [x] Backend route added
- [x] Type definitions updated
- [x] Frontend interface updated
- [x] Captain badge display logic updated
- [x] No TypeScript errors
- [ ] Test assigning captain from modal
- [ ] Test captain badge appears correctly
- [ ] Test error when assigning non-roster member
- [ ] Test toast notifications
- [ ] Test team data refresh after assignment

## Files Modified

1. `apps/backend/src/db/migrations/add_captain_to_teams.sql` - Created
2. `apps/backend/src/services/team.service.ts` - Updated
3. `apps/backend/src/routes/team.ts` - Updated
4. `packages/types/src/team.ts` - Updated
5. `apps/frontend/src/pages/dashboards/TeamDashboard.tsx` - Updated

## Notes

- Only one captain per team (single captain_id field)
- Captain must be a member of the team roster
- Captain can be changed at any time by team manager
- If captain leaves team or is removed, captain_id should be cleared (future enhancement)
- Captain role is currently cosmetic (badge display only)
- Future: Could add captain-specific permissions or features
