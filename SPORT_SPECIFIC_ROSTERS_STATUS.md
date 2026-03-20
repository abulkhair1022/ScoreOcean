# Sport-Specific Rosters - Implementation Status

## Current Status: Database Ready, Code Implementation Needed

### ✅ Completed
1. **Database Migration Applied**
   - Added `sport` column to `team_rosters` table
   - Changed unique constraint to allow same player in multiple sports
   - Existing rosters migrated to team's primary sport

### 🔄 Required Implementation

This is a **major feature** that requires extensive code changes. The database is ready, but the application code needs significant updates to support sport-specific rosters.

## User Workflow (Desired)

1. **Team has CRICKET** (primary sport)
   - Roster: Player A, B, C

2. **Team adds FOOTBALL**
   - Switch to FOOTBALL → **Empty roster**
   - Two options:
     - **Add Existing Members**: Select from A, B, C to add to FOOTBALL
     - **Invite New Players**: Invite Player D, E who aren't in team yet

3. **Result**:
   - CRICKET roster: A, B, C
   - FOOTBALL roster: A, D (A from existing, D newly invited)

## Implementation Required

### Backend Changes (Estimated: 3-4 hours)

1. **Update `getRoster()` method**
   - Add `sport` parameter
   - Filter roster by sport
   - Return empty array if no players for that sport

2. **Update `addPlayerToRoster()` method**
   - Add `sport` parameter
   - Insert with sport column
   - Allow adding existing team member to new sport

3. **Update `invitePlayer()` method**
   - Add `sport` parameter
   - Store sport in invitation

4. **Add `team_invitations` migration**
   - Add sport column to invitations table

5. **Update all routes**
   - Add sport parameter to roster endpoints
   - Update invitation endpoints

### Frontend Changes (Estimated: 2-3 hours)

1. **Add Sport Selector to Team Dashboard**
   ```
   Current Sport: [CRICKET ▼]
   
   Switch to: CRICKET | FOOTBALL
   ```

2. **Update Roster Display**
   - Show roster for selected sport only
   - Show "No players yet" if empty

3. **Update Invite Modal**
   - Add "Invite New Player" button
   - Add "Add Existing Member" button
   - Show list of existing members not in current sport

4. **Update Member Display**
   - Show which sports each player is in
   - Allow removing from specific sport

## Why This Takes Time

This is not a simple change because:

1. **Database schema changed** - All roster queries need updating
2. **Business logic changed** - Roster validation per sport
3. **UI/UX changed** - Need sport selector and dual add options
4. **Type safety** - TypeScript types need updating
5. **Testing needed** - Many edge cases to handle

## Recommendation

Given the complexity and time required (5-7 hours total), I recommend:

### Option 1: Full Implementation (Recommended)
- Complete all backend changes
- Complete all frontend changes
- Thorough testing
- **Time**: 1 full working day

### Option 2: Revert Migration
- Keep simpler shared roster design
- Revert database changes
- No code changes needed
- **Time**: 5 minutes

### Option 3: Partial Implementation
- Complete backend only
- Basic frontend (no fancy UI)
- Minimal testing
- **Time**: 3-4 hours

## Current Blocker

The database is ready, but the application code still uses the old logic:
- `getRoster()` doesn't filter by sport
- `addPlayerToRoster()` doesn't accept sport parameter
- Frontend doesn't have sport selector
- Invitations don't include sport

**Result**: The app will likely have errors or unexpected behavior until all code is updated.

## Next Steps

Please decide:
1. **Proceed with full implementation?** (I'll implement everything step by step)
2. **Revert the migration?** (Keep simpler design)
3. **Pause and continue later?** (Database is ready when you're ready to implement)

The migration is reversible, so no data will be lost either way.

## Files Modified So Far

1. ✅ `apps/backend/src/db/migrations/add_sport_to_team_rosters.sql` - Created and applied
2. ✅ `packages/types/src/common.ts` - Added BASKETBALL and BADMINTON to Sport enum
3. ✅ `apps/backend/src/services/team.service.ts` - Added roster constraints for new sports

## Files That Need Modification

1. ⏳ `apps/backend/src/services/team.service.ts` - Update 8+ methods
2. ⏳ `apps/backend/src/routes/team.ts` - Update 5+ routes
3. ⏳ `packages/types/src/team.ts` - Update Player and Invitation types
4. ⏳ `apps/frontend/src/pages/dashboards/TeamDashboard.tsx` - Major UI changes
5. ⏳ New migration for team_invitations table

---

**Status**: Waiting for decision on how to proceed.
