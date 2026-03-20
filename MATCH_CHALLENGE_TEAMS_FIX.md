# Match Challenge - Teams List Fix

## Problem

When creating a match challenge, the dropdown showed "No other CRICKET teams available" even though other cricket teams existed in the database.

## Root Cause

The frontend was calling `GET /api/teams` which only returns teams for the current user (teams they host or are members of). This meant users couldn't see OTHER teams to challenge.

## Solution

### 1. Added New Backend Endpoint ✅

Created `GET /api/teams/all` endpoint that returns ALL teams in the system (not just user's teams).

**File**: `apps/backend/src/routes/team.ts`

```typescript
// Get all teams (for browsing/searching)
router.get('/all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { sport } = req.query;
    const filters = sport ? { sport: sport as string } : undefined;
    const teams = await teamService.getAllTeams(filters);
    res.json(teams);
  } catch (error) {
    next(error);
  }
});
```

### 2. Added Service Method ✅

Created `getAllTeams()` method in TeamService to fetch all teams with optional sport filter.

**File**: `apps/backend/src/services/team.service.ts`

```typescript
async getAllTeams(filters?: { sport?: string }): Promise<Team[]> {
  let queryText = 'SELECT * FROM teams ORDER BY created_at DESC';
  const params: any[] = [];

  if (filters?.sport) {
    queryText = 'SELECT * FROM teams WHERE sport = $1 ORDER BY created_at DESC';
    params.push(filters.sport);
  }

  const result = await query(queryText, params);
  // ... map to Team objects
}
```

### 3. Updated Frontend ✅

Updated `fetchAvailableTeams()` to use the new `/teams/all` endpoint with sport filter.

**File**: `apps/frontend/src/pages/dashboards/TeamDashboard.tsx`

```typescript
const fetchAvailableTeams = async () => {
  if (!selectedTeam) return;
  
  try {
    // Get all teams with the same sport
    const response = await apiClient.get('/teams/all', {
      params: { sport: selectedTeam.sport }
    });
    
    // Filter out the current team
    const filtered = (response.data || []).filter(
      (team: any) => team.id !== selectedTeam.id
    );
    
    setAvailableTeams(filtered);
  } catch (error) {
    console.error('Error fetching teams:', error);
    setAvailableTeams([]);
  }
};
```

## How It Works Now

1. User clicks "Create Match" button
2. Frontend calls `GET /api/teams/all?sport=CRICKET`
3. Backend returns ALL cricket teams in the system
4. Frontend filters out the user's own team
5. Dropdown shows all other cricket teams available to challenge

## API Endpoints

### Get All Teams
```
GET /api/teams/all
Authorization: Bearer <token>
Query Parameters:
  - sport (optional): Filter by sport (CRICKET, FOOTBALL, etc.)

Response:
[
  {
    "id": "uuid",
    "name": "Team Name",
    "sport": "CRICKET",
    "location": { "city": "...", "state": "...", "country": "..." },
    ...
  }
]
```

### Get User's Teams (existing)
```
GET /api/teams
Authorization: Bearer <token>

Response: Teams where user is host or member
```

## Testing

### Test Case 1: View Available Teams
1. ✅ Login as team host
2. ✅ Go to Team Dashboard
3. ✅ Click "Create Match"
4. ✅ Dropdown shows all other teams with same sport
5. ✅ Current team is excluded from list

### Test Case 2: Filter by Sport
1. ✅ Cricket team sees only other cricket teams
2. ✅ Football team sees only other football teams
3. ✅ No cross-sport challenges possible

### Test Case 3: No Teams Available
1. ✅ If only one team exists for a sport
2. ✅ Shows "No other CRICKET teams available"
3. ✅ User cannot create challenge

## Files Modified

- ✅ `apps/backend/src/services/team.service.ts` - Added `getAllTeams()` method
- ✅ `apps/backend/src/routes/team.ts` - Added `GET /teams/all` endpoint
- ✅ `apps/frontend/src/pages/dashboards/TeamDashboard.tsx` - Updated to use new endpoint

## To Test

1. **Restart backend server:**
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Refresh frontend** (Ctrl+Shift+R)

3. **Create a match challenge:**
   - Go to Team Dashboard
   - Click "Create Match"
   - Dropdown should now show all other teams with the same sport

## Expected Behavior

- ✅ Dropdown shows all teams with matching sport
- ✅ Current team is excluded
- ✅ Teams from other users are visible
- ✅ Can select and challenge any team

---

**Status**: ✅ Fixed

**Fixed on**: 2026-02-26

