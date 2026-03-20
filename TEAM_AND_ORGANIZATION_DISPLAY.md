# Team and Organization Display - Complete

## Overview
Added display of team affiliation for players and organization affiliation for teams in their respective dashboards.

## Changes Made

### 1. Player Dashboard - Current Team Display

#### Frontend - Player Dashboard
**File**: `apps/frontend/src/pages/dashboards/PlayerDashboard.tsx`

Updated `Stats` interface:
- Added optional `currentTeam` field with id, name, and sport

Updated `fetchDashboardData()`:
- Fetches player's current team using `/teams/player/:id/team` endpoint
- Handles 404 gracefully (player not in any team)
- Stores team info in stats state

Added "Current Team" section:
- Shows team name, sport badge, and "View Team" button if player has a team
- Shows "No Team Yet" with "Browse Teams" button if player has no team
- Displays between stats grid and sport profiles section
- Purple theme to match team-related UI elements

### 2. Team Dashboard - Organization Display

#### Backend - Team Service
**File**: `apps/backend/src/services/team.service.ts`

Updated `mapRowToTeam()` method:
- Fetches organization name from user_profiles if team has organization_id
- Includes organizationName in returned Team object
- Handles case where organization doesn't exist

#### Types Package
**File**: `packages/types/src/team.ts`

Updated `Team` interface:
- Added optional `organizationName?: string` field

#### Frontend - Team Dashboard
**File**: `apps/frontend/src/pages/dashboards/TeamDashboard.tsx`

Updated `Team` interface:
- Added optional `organizationName?: string` field

Added organization display:
- Shows organization name with building icon below location
- Purple color scheme to match organization theme
- Only displays if team belongs to an organization
- Format: "Organization: [Organization Name]"

## User Experience

### Player Dashboard:

#### With Team:
```
┌─────────────────────────────────────────┐
│ Current Team                            │
│ ┌──┐                                    │
│ │🏆│ Team Name                          │
│ └──┘ [CRICKET]                          │
│                          [View Team] →  │
└─────────────────────────────────────────┘
```

#### Without Team:
```
┌─────────────────────────────────────────┐
│ ┌──┐                                    │
│ │👥│ No Team Yet                        │
│ └──┘ Browse teams and request to join  │
│                    [Browse Teams] →     │
└─────────────────────────────────────────┘
```

### Team Dashboard:

#### With Organization:
```
Team Name
[CRICKET] Manage Sports
Bhatkal, Karnataka
🏢 Organization: FWA
```

#### Without Organization:
```
Team Name
[CRICKET] Manage Sports
Bhatkal, Karnataka
```

## Visual Design

### Player Dashboard - Current Team Section:
- White background card with shadow
- Purple icon and accent color
- Team name in large font
- Sport badge in blue
- "View Team" button in purple
- Fallback state with gray icon and blue "Browse Teams" button

### Team Dashboard - Organization Display:
- Building icon in purple
- Organization name in purple and bold
- Appears below location info
- Compact single-line display

## API Integration

### Player's Current Team:
- Endpoint: `GET /api/teams/player/:playerId/team`
- Returns team object or 404 if not in any team
- Already implemented in backend

### Team's Organization:
- Fetched as part of team data
- Backend automatically includes organization name
- No additional API calls needed

## Data Flow

### Player Dashboard:
1. Fetch user profile
2. Fetch player's current team (may return 404)
3. Display team info or "No Team" message

### Team Dashboard:
1. Fetch teams list
2. Backend includes organization name for each team
3. Display organization if present

## Benefits

1. **Clear Hierarchy**: Users can see their position in the organizational structure
2. **Quick Navigation**: Direct links to view team or browse teams
3. **Visual Clarity**: Icons and colors help distinguish different entities
4. **Contextual Information**: Players know which team they're in, teams know which organization they belong to
5. **Empty States**: Helpful messages and actions when no affiliation exists

## Testing Checklist

- [x] Backend fetches organization name
- [x] Types updated with organizationName
- [x] Player Dashboard fetches current team
- [x] Player Dashboard displays team when present
- [x] Player Dashboard shows "No Team" when not in team
- [x] Team Dashboard displays organization when present
- [x] Team Dashboard hides organization section when not joined
- [x] No TypeScript errors
- [ ] Test player with team sees correct team name
- [ ] Test player without team sees "No Team" message
- [ ] Test "View Team" button navigates correctly
- [ ] Test "Browse Teams" button navigates correctly
- [ ] Test team with organization sees organization name
- [ ] Test team without organization doesn't show organization section
- [ ] Test organization name updates after joining

## Files Modified

1. `apps/frontend/src/pages/dashboards/PlayerDashboard.tsx` - Updated
2. `apps/frontend/src/pages/dashboards/TeamDashboard.tsx` - Updated
3. `apps/backend/src/services/team.service.ts` - Updated
4. `packages/types/src/team.ts` - Updated

## Notes

- Player can only be in one team at a time (enforced by database constraint)
- Team can only belong to one organization at a time
- Organization name is fetched from user_profiles table
- If organization is deleted, team's organization_id becomes NULL
- Empty states encourage users to take action (join team, join organization)
- Purple color scheme used consistently for team/organization relationships
- Icons help users quickly identify the type of information displayed
