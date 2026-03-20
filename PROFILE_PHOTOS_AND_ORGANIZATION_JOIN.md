# Profile Photos and Organization Join - Complete

## Overview
Fixed two issues:
1. Added player profile photos (avatars) to team roster display
2. Implemented the "Join Organization" functionality for teams

## Changes Made

### 1. Player Profile Photos in Roster

#### Backend - Team Service
**File**: `apps/backend/src/services/team.service.ts`

Updated `getRoster()` method:
- Added `up.avatar_url` to SELECT query
- Mapped `avatarUrl` field in returned roster data

#### Types Package
**File**: `packages/types/src/team.ts`

Updated `Player` interface:
- Added optional `avatarUrl?: string` field

#### Frontend - Team Dashboard
**File**: `apps/frontend/src/pages/dashboards/TeamDashboard.tsx`

Updated `TeamMember` interface:
- Added optional `avatarUrl?: string` field

Updated roster display:
- Shows avatar image if available
- Falls back to colored circle with initial if no avatar
- Avatar is 40x40px, rounded, with object-cover

### 2. Join Organization Functionality

#### Database Migration
**File**: `apps/backend/src/db/migrations/add_organization_to_teams.sql`

Added `organization_id` column to teams table:
- Column type: UUID (references users.id)
- Nullable: Yes
- On delete: SET NULL
- Index added for performance

Migration applied successfully.

#### Backend - Team Service
**File**: `apps/backend/src/services/team.service.ts`

Added `joinOrganization()` method:
- Validates team exists
- Validates organization exists and has ORGANIZATION role
- Updates team's organization_id field

Updated `mapRowToTeam()` method:
- Now includes `organizationId` field in returned Team object

#### Backend - Team Routes
**File**: `apps/backend/src/routes/team.ts`

Added new endpoint:
- `POST /api/teams/:id/join-organization`
- Requires authentication
- Requires team management permission
- Body: `{ organizationId: string }`
- Returns success message

#### Types Package
**File**: `packages/types/src/team.ts`

Updated `Team` interface:
- Added optional `organizationId?: string` field

## User Experience

### Profile Photos:
1. Team roster displays member avatars
2. If avatar exists: Shows circular profile photo
3. If no avatar: Shows colored circle with first letter of name
4. Consistent 40x40px size
5. Smooth rounded corners

### Join Organization:
1. Team manager clicks "Join Organization" button
2. Modal shows list of all organizations
3. Search functionality to filter organizations
4. Click "Join" button next to desired organization
5. Backend validates organization exists
6. Database updates team's organization_id
7. Success toast notification appears
8. Modal closes and team data refreshes

## API Endpoints

### Join Organization
```
POST /api/teams/:teamId/join-organization
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "organizationId": "uuid-of-organization"
}

Response (200):
{
  "message": "Successfully joined organization"
}

Error (404):
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Organization not found"
  }
}
```

## Database Schema Changes

### Teams Table - organization_id
```sql
ALTER TABLE teams 
ADD COLUMN organization_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_teams_organization ON teams(organization_id);
```

## Roster Data Structure

### Before:
```json
{
  "id": "player-uuid",
  "name": "Player Name",
  "joinedAt": "2024-01-01T00:00:00Z"
}
```

### After:
```json
{
  "id": "player-uuid",
  "name": "Player Name",
  "avatarUrl": "https://example.com/avatar.jpg",
  "joinedAt": "2024-01-01T00:00:00Z"
}
```

## Visual Design

### Avatar Display:
```tsx
{member.avatarUrl ? (
  <img
    src={member.avatarUrl}
    alt={member.name}
    className="w-10 h-10 rounded-full object-cover"
  />
) : (
  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
    <span className="text-green-700 font-semibold">
      {member.name.charAt(0).toUpperCase()}
    </span>
  </div>
)}
```

## Testing Checklist

- [x] Database migrations applied
- [x] Backend service methods created
- [x] Backend routes added
- [x] Type definitions updated
- [x] Frontend interfaces updated
- [x] Avatar display logic added
- [x] No TypeScript errors
- [ ] Test avatar displays when user has profile photo
- [ ] Test fallback initial displays when no avatar
- [ ] Test join organization modal opens
- [ ] Test organization search/filter
- [ ] Test joining organization
- [ ] Test error handling for invalid organization
- [ ] Test toast notifications
- [ ] Test team data refresh after joining

## Files Modified

1. `apps/backend/src/db/migrations/add_organization_to_teams.sql` - Created
2. `apps/backend/src/services/team.service.ts` - Updated
3. `apps/backend/src/routes/team.ts` - Updated
4. `packages/types/src/team.ts` - Updated
5. `apps/frontend/src/pages/dashboards/TeamDashboard.tsx` - Updated

## Notes

- Avatar URLs are stored in user_profiles table
- Avatars support base64 encoded images (from Profile page)
- Organization relationship is optional (teams can exist without organization)
- If organization is deleted, team's organization_id is set to NULL
- Avatar fallback uses first letter of player name
- Fallback circle uses green color scheme to match team theme
- Organization join is one-way (no leave organization implemented yet)
