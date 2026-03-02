# Sport-Specific Rosters Implementation Plan

## Overview
Implement sport-specific rosters where each sport a team participates in can have different players. For example:
- CRICKET roster: Player A, B, C
- FOOTBALL roster: Player A, D, E
- Player A can be in both, but B and C are only in CRICKET

## Database Changes

### ✅ Completed: Migration
**File**: `apps/backend/src/db/migrations/add_sport_to_team_rosters.sql`

Changes made:
- Added `sport` column to `team_rosters` table
- Set existing rosters to team's primary sport
- Changed unique constraint from `(team_id, player_id)` to `(team_id, player_id, sport)`
- Added index on sport column

This allows:
- Same player in multiple sports for same team
- Different rosters for each sport

## Backend Changes Needed

### 1. Update getRoster() Method
**File**: `apps/backend/src/services/team.service.ts`

Current:
```typescript
async getRoster(teamId: string): Promise<any[]>
```

Needs to become:
```typescript
async getRoster(teamId: string, sport?: Sport): Promise<any[]>
```

Changes:
- Add optional `sport` parameter
- If sport provided, filter by sport
- If no sport, return all players across all sports (or primary sport only?)

### 2. Update addPlayerToRoster() Method
**File**: `apps/backend/src/services/team.service.ts`

Current:
```typescript
async addPlayerToRoster(teamId: string, playerId: string)
```

Needs to become:
```typescript
async addPlayerToRoster(teamId: string, playerId: string, sport: Sport)
```

Changes:
- Add required `sport` parameter
- Insert with sport column
- Check unique constraint per sport

### 3. Update removePlayerFromRoster() Method
**File**: `apps/backend/src/services/team.service.ts`

Current:
```typescript
async removePlayerFromRoster(teamId: string, playerId: string)
```

Needs to become:
```typescript
async removePlayerFromRoster(teamId: string, playerId: string, sport: Sport)
```

Changes:
- Add required `sport` parameter
- Delete specific sport roster entry

### 4. Update invitePlayer() Method
**File**: `apps/backend/src/services/team.service.ts`

Current:
```typescript
async invitePlayer(teamId: string, playerId: string, invitedBy: string)
```

Needs to become:
```typescript
async invitePlayer(teamId: string, playerId: string, sport: Sport, invitedBy: string)
```

Changes:
- Add required `sport` parameter
- Store sport in invitation
- Check roster for specific sport

### 5. Update acceptInvitation() Method
**File**: `apps/backend/src/services/team.service.ts`

Changes:
- Get sport from invitation
- Add player to roster for that specific sport

### 6. Update Team Invitations Table
**New Migration Needed**: Add sport column to `team_invitations` table

### 7. Update validateRoster() Method
**File**: `apps/backend/src/services/team.service.ts`

Current:
```typescript
async validateRoster(teamId: string, sport: Sport)
```

Changes:
- Already takes sport parameter
- Update query to filter by sport

### 8. Update mapRowToTeam() Method
**File**: `apps/backend/src/services/team.service.ts`

Changes:
- Decide which roster to return (primary sport? all sports?)
- May need to return roster per sport

### 9. Update Routes
**File**: `apps/backend/src/routes/team.ts`

Changes needed:
- POST `/teams/:id/roster` - Add sport to request body
- DELETE `/teams/:id/roster/:playerId` - Add sport to request body or query
- POST `/teams/:id/invitations` - Add sport to request body
- GET `/teams/:id/roster` - Add optional sport query parameter

## Frontend Changes Needed

### 1. Update Team Dashboard
**File**: `apps/frontend/src/pages/dashboards/TeamDashboard.tsx`

Major changes:
- Add sport selector/tabs to switch between sport rosters
- Show roster for currently selected sport
- Update invite modal to specify which sport
- Update remove member to specify sport
- Show player's sports (badges/tags)

UI Changes:
```
Current Sports: [CRICKET (Primary)] [FOOTBALL]

[Switch to CRICKET] [Switch to FOOTBALL]

CRICKET Roster:
- Player A
- Player B
- Player C

[Invite Player to CRICKET]
```

### 2. Update Invite Modal
Add sport selection:
- Dropdown or radio buttons to select sport
- Default to current/primary sport
- Show which sports player is already in

### 3. Update Team Member Display
Show which sports each player participates in:
```
Player A [CRICKET] [FOOTBALL]
Player B [CRICKET]
Player C [CRICKET]
Player D [FOOTBALL]
```

### 4. Update Types
**File**: `packages/types/src/team.ts`

```typescript
export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  joinedAt: Date;
  sports?: Sport[]; // NEW: Which sports this player is in
}

export interface Invitation {
  id: string;
  teamId: string;
  playerId: string;
  sport: Sport; // NEW: Which sport invitation is for
  status: InvitationStatus;
  createdAt: Date;
}
```

## Implementation Strategy

### Phase 1: Backend Core (High Priority)
1. ✅ Run migration (DONE)
2. Update `getRoster()` to accept sport parameter
3. Update `addPlayerToRoster()` to require sport
4. Update `removePlayerFromRoster()` to require sport
5. Update routes to handle sport parameter

### Phase 2: Invitations (High Priority)
1. Create migration for team_invitations sport column
2. Update `invitePlayer()` to include sport
3. Update `acceptInvitation()` to use sport
4. Update invitation types

### Phase 3: Frontend Basic (High Priority)
1. Add sport selector to Team Dashboard
2. Filter roster by selected sport
3. Update invite modal with sport selection
4. Update remove member with sport context

### Phase 4: Frontend Enhanced (Medium Priority)
1. Show player's sports as badges
2. Add "Add to Another Sport" feature
3. Improve UX with sport tabs/pills
4. Add bulk operations (add player to multiple sports)

### Phase 5: Validation & Polish (Low Priority)
1. Update roster validation per sport
2. Add warnings when removing player from all sports
3. Add statistics per sport per player
4. Update team statistics to be sport-specific

## Breaking Changes

⚠️ **Warning**: This is a breaking change that affects:
- All roster queries
- All invitation flows
- Team Dashboard UI
- Player Dashboard (shows which team/sport)
- Statistics (need to be sport-specific)

## Rollback Plan

If issues arise:
1. Revert migration: Remove sport column, restore old unique constraint
2. Revert code changes
3. Existing data will be preserved (sport column can be dropped)

## Testing Checklist

- [ ] Add player to CRICKET roster
- [ ] Add same player to FOOTBALL roster
- [ ] Add different player to FOOTBALL roster
- [ ] Remove player from one sport (should stay in other)
- [ ] Remove player from all sports
- [ ] Invite player to specific sport
- [ ] Accept invitation adds to correct sport
- [ ] Roster validation per sport
- [ ] Statistics per sport
- [ ] UI shows correct roster per sport
- [ ] UI shows player's sports
- [ ] Cannot exceed max roster size per sport

## Current Status

✅ Database migration completed
⏳ Backend methods need updating
⏳ Frontend UI needs major updates
⏳ Types need updating

## Recommendation

This is a **major feature change** that requires significant development time. I recommend:

1. **Complete backend changes first** - Ensure all methods work with sport-specific rosters
2. **Update types** - Ensure TypeScript types reflect new structure
3. **Update frontend incrementally** - Start with basic sport selector, then enhance
4. **Test thoroughly** - This affects core team functionality

Would you like me to proceed with implementing these changes step by step?
