# Multi-Sport Teams Implementation

## Summary
Implemented functionality allowing teams to participate in multiple sports, with separate statistics for each sport. Teams can add/remove sports and switch their primary sport.

## Problem Statement
Previously, teams were locked to a single sport. Users wanted the ability for the same team (e.g., "Firdous") to participate in multiple sports like Cricket and Football, with separate statistics for each.

## Solution Architecture

### Database Changes

#### New Table: `team_sport_profiles`
```sql
CREATE TABLE team_sport_profiles (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  sport VARCHAR(50) NOT NULL,
  statistics JSONB DEFAULT '{"matchesPlayed": 0, "wins": 0, "losses": 0, "draws": 0}',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(team_id, sport)
);
```

**Key Points:**
- Similar to `sport_profiles` for players
- One row per team-sport combination
- Separate statistics for each sport
- Unique constraint prevents duplicate sport entries

#### Existing `teams` Table
- Kept `sport` column for backward compatibility
- Represents the "primary" or "default" sport
- Used for display and default tournament registration

### Backend Changes

#### Team Service (`apps/backend/src/services/team.service.ts`)

**New Methods:**

1. **`getTeamSportProfiles(teamId)`**
   - Returns all sports the team participates in
   - Includes statistics for each sport

2. **`addSportToTeam(teamId, sport)`**
   - Adds a new sport to team's profile
   - Validates sport is valid
   - Prevents duplicate sports
   - Initializes statistics to zero

3. **`removeSportFromTeam(teamId, sport)`**
   - Removes a sport from team's profile
   - Prevents removing primary sport
   - Returns error if sport doesn't exist

4. **`changePrimarySport(teamId, sport)`**
   - Changes team's primary sport
   - Validates team has profile for that sport
   - Updates `teams.sport` column

#### Team Routes (`apps/backend/src/routes/team.ts`)

**New Endpoints:**

```
GET    /api/teams/:id/sports              - Get all sports for team
POST   /api/teams/:id/sports              - Add sport to team
DELETE /api/teams/:id/sports/:sport       - Remove sport from team
PUT    /api/teams/:id/primary-sport       - Change primary sport
```

**Authentication:**
- All endpoints require authentication
- POST/DELETE/PUT require team management permission

#### Auth Service (`apps/backend/src/services/auth.service.ts`)

**Updated Registration:**
- When creating team during registration, also creates initial sport profile
- Ensures consistency between `teams.sport` and `team_sport_profiles`

### Frontend Changes

#### Team Dashboard (`apps/frontend/src/pages/dashboards/TeamDashboard.tsx`)

**New State:**
```typescript
const [showSportModal, setShowSportModal] = useState(false);
const [teamSports, setTeamSports] = useState<any[]>([]);
```

**New Functions:**
- `fetchTeamSports(teamId)` - Loads team's sport profiles
- `handleAddSport(sport)` - Adds new sport
- `handleRemoveSport(sport)` - Removes sport
- `handleChangePrimarySport(sport)` - Changes primary sport

**UI Changes:**

1. **Team Info Section**
   - Shows primary sport as badge
   - "Manage Sports" button next to sport badge

2. **Sport Management Modal**
   - Lists current sports with "Primary" badge
   - "Set as Primary" button for non-primary sports
   - "Remove" button for non-primary sports
   - Grid of available sports to add
   - Visual indication of already-added sports

## User Experience

### Adding a Sport

1. User opens Team Dashboard
2. Clicks "Manage Sports" button
3. Modal shows current sports (e.g., Cricket as Primary)
4. User clicks "FOOTBALL" in the "Add New Sport" section
5. Football is added with zero statistics
6. Football appears in current sports list

### Changing Primary Sport

1. User opens Sport Management modal
2. Sees Cricket (Primary) and Football
3. Clicks "Set as Primary" next to Football
4. Confirmation dialog appears
5. Football becomes primary sport
6. Team dashboard now shows "FOOTBALL" as main sport

### Removing a Sport

1. User opens Sport Management modal
2. Clicks "Remove" next to a non-primary sport
3. Confirmation dialog appears
4. Sport is removed from team's profiles
5. Statistics for that sport are deleted

## Business Rules

1. **Primary Sport Protection**
   - Cannot remove primary sport
   - Must change primary sport first, then remove

2. **Unique Sports**
   - Team cannot have duplicate sport profiles
   - Adding existing sport shows error

3. **Statistics Separation**
   - Each sport has independent statistics
   - Wins in Cricket don't affect Football stats

4. **Tournament Registration**
   - Teams can register for tournaments in any sport they have a profile for
   - Primary sport is used as default

## Migration

### For Existing Teams

Run the migration script:
```bash
psql -d score_ocean -f apps/backend/src/db/migrations/add_team_sport_profiles.sql
```

This will:
1. Create `team_sport_profiles` table
2. Migrate existing team sports to sport profiles
3. Preserve existing statistics

### For New Teams

- Automatically creates sport profile during registration
- Both `teams.sport` and `team_sport_profiles` entry created

## API Examples

### Get Team Sports
```bash
GET /api/teams/123/sports
Authorization: Bearer <token>

Response:
[
  {
    "id": "uuid",
    "sport": "CRICKET",
    "statistics": {"matchesPlayed": 10, "wins": 7, "losses": 2, "draws": 1},
    "createdAt": "2026-02-23T..."
  },
  {
    "id": "uuid",
    "sport": "FOOTBALL",
    "statistics": {"matchesPlayed": 5, "wins": 3, "losses": 2, "draws": 0},
    "createdAt": "2026-02-23T..."
  }
]
```

### Add Sport
```bash
POST /api/teams/123/sports
Authorization: Bearer <token>
Content-Type: application/json

{
  "sport": "BASKETBALL"
}

Response: 201 Created
{
  "message": "Sport added successfully"
}
```

### Change Primary Sport
```bash
PUT /api/teams/123/primary-sport
Authorization: Bearer <token>
Content-Type: application/json

{
  "sport": "FOOTBALL"
}

Response: 200 OK
{
  "message": "Primary sport changed successfully"
}
```

### Remove Sport
```bash
DELETE /api/teams/123/sports/BASKETBALL
Authorization: Bearer <token>

Response: 204 No Content
```

## Testing

### Manual Test Steps

1. **Create Team with Cricket**
   - Register as TEAM role
   - Select Cricket as sport
   - Verify team created

2. **Add Football**
   - Go to Team Dashboard
   - Click "Manage Sports"
   - Click "FOOTBALL"
   - Verify Football added

3. **View Both Sports**
   - Check modal shows Cricket (Primary) and Football
   - Verify both have separate statistics

4. **Change Primary to Football**
   - Click "Set as Primary" next to Football
   - Confirm dialog
   - Verify Football is now primary

5. **Try to Remove Primary**
   - Try to remove Football (now primary)
   - Verify error: "Cannot remove primary sport"

6. **Remove Cricket**
   - Click "Remove" next to Cricket
   - Confirm dialog
   - Verify Cricket removed

### Database Verification

```sql
-- Check team's primary sport
SELECT id, name, sport FROM teams WHERE name = 'Firdous';

-- Check team's sport profiles
SELECT tsp.sport, tsp.statistics 
FROM team_sport_profiles tsp
JOIN teams t ON tsp.team_id = t.id
WHERE t.name = 'Firdous';
```

## Benefits

1. **Flexibility** - Teams can participate in multiple sports
2. **Accurate Statistics** - Separate stats per sport
3. **Tournament Variety** - Register for different sport tournaments
4. **Real-World Modeling** - Matches how teams actually operate
5. **Backward Compatible** - Existing teams continue to work

## Future Enhancements

1. **Sport-Specific Rosters** - Different players for different sports
2. **Sport Switching in UI** - Dropdown to view stats per sport
3. **Multi-Sport Tournaments** - Tournaments with multiple sports
4. **Sport Performance Comparison** - Charts comparing performance across sports
5. **Sport Preferences** - Mark favorite sports or set sport priorities

## Related Files

- `apps/backend/src/db/migrations/add_team_sport_profiles.sql` - Database migration
- `apps/backend/src/services/team.service.ts` - Team sport management logic
- `apps/backend/src/routes/team.ts` - API endpoints for sports
- `apps/backend/src/services/auth.service.ts` - Creates initial sport profile
- `apps/frontend/src/pages/dashboards/TeamDashboard.tsx` - Sport management UI

## Notes

- Primary sport is used for display and default behavior
- Teams must have at least one sport (the primary)
- Statistics are never merged between sports
- Removing a sport deletes its statistics permanently
- Sport profiles are created on-demand (not all sports pre-created)
