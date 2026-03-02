# Player Selection from Team Rosters - Implementation Complete ✅

## Overview

Implemented a comprehensive player selection system where batsmen and bowlers are selected from team rosters using dropdowns, with full data persistence, WebSocket updates, and player profile linking.

## What Was Implemented

### 1. Database Schema Updates ✅

**File**: `apps/backend/src/db/migrations/add_player_ids_to_cricket_stats.sql`

Added player ID columns to link cricket statistics to user profiles:
- `cricket_batting_stats.player_id` - Links batting stats to user
- `cricket_bowling_stats.player_id` - Links bowling stats to user  
- `cricket_ball_details.batsman_id` - Links each ball to batsman
- `cricket_ball_details.bowler_id` - Links each ball to bowler

### 2. Backend API Endpoints ✅

**New Endpoint**: `GET /api/matches/:id/rosters`

Returns team rosters for a match:
```json
{
  "homeTeam": {
    "id": "uuid",
    "name": "Team Name",
    "players": [
      {
        "id": "player-uuid",
        "name": "Player Name",
        "jerseyNumber": 10
      }
    ]
  },
  "awayTeam": { ... }
}
```

### 3. Backend Service Updates ✅

**Match Service** (`apps/backend/src/services/match.service.ts`):
- Added `getMatchRosters()` method
- Fetches players from `team_rosters` table
- Joins with `users` and `user_profiles` for player details
- Returns organized roster data for both teams

**Cricket Stats Service** (`apps/backend/src/services/cricketStats.service.ts`):
- Updated interfaces to include `playerId`
- Modified `saveBattingStats()` to save player IDs
- Modified `saveBowlingStats()` to save player IDs
- Modified `saveBallDetails()` to save batsman and bowler IDs
- All stats now linked to user profiles

### 4. Frontend Implementation ✅

**File**: `apps/frontend/src/pages/Match.tsx`

**New State Variables**:
```typescript
const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([]);
const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([]);
const [playerNameMap, setPlayerNameMap] = useState<{[key: string]: string}>({});
```

**New Functions**:
- `fetchTeamRosters()` - Fetches team rosters on component mount
- Creates player name map for ID-to-name lookups
- Stores players for both teams

**Dropdown Selectors**:
- Replaced text inputs with `<select>` dropdowns
- Striker dropdown: Shows batting team players
- Non-Striker dropdown: Shows batting team players
- Bowler dropdown: Shows bowling team players (opposite team)
- Displays jersey numbers with player names (#10 Player Name)

**Data Flow**:
- Player IDs stored in state (striker, nonStriker, currentBowler)
- Player names displayed using playerNameMap
- Player IDs sent to backend for database storage
- Stats linked to user profiles automatically

## Features

### ✅ Team Roster Integration
- Fetches players from team rosters
- Shows only players from the correct team
- Batsmen from batting team
- Bowlers from bowling team

### ✅ Dropdown Selectors
- Professional dropdown UI
- Shows jersey numbers
- Easy player selection
- No typing errors

### ✅ Data Persistence
- Player IDs saved to database
- Stats linked to user profiles
- Survives page refresh
- Complete audit trail

### ✅ Real-time Updates
- WebSocket broadcasts include player IDs
- Other viewers see player names
- Instant synchronization
- No data loss

### ✅ Player Profile Integration
- All stats linked to user accounts
- Can aggregate player statistics
- Historical performance tracking
- Career statistics possible

## Database Schema

### cricket_batting_stats
```sql
- player_id UUID REFERENCES users(id)  -- NEW
- batsman_name VARCHAR(255)
- runs, balls, fours, sixes, strike_rate
- dismissal, is_not_out
```

### cricket_bowling_stats
```sql
- player_id UUID REFERENCES users(id)  -- NEW
- bowler_name VARCHAR(255)
- overs, maidens, runs_conceded, wickets
- economy, wides, no_balls
```

### cricket_ball_details
```sql
- batsman_id UUID REFERENCES users(id)  -- NEW
- bowler_id UUID REFERENCES users(id)   -- NEW
- batsman_name VARCHAR(255)
- bowler_name VARCHAR(255)
- runs, extras, is_wicket
```

## User Experience

### Before
❌ Manual text entry for player names
❌ Typing errors possible
❌ No validation
❌ Stats not linked to profiles
❌ No team roster integration

### After
✅ Dropdown selection from team roster
✅ No typing errors
✅ Automatic validation
✅ Stats linked to user profiles
✅ Professional UI

## How It Works

### 1. Component Mount
```
fetchTeamRosters()
  ↓
GET /api/matches/:id/rosters
  ↓
Fetch home team players
Fetch away team players
  ↓
Store in state
Create player name map
```

### 2. Player Selection
```
User clicks striker dropdown
  ↓
Shows batting team players
  ↓
User selects player
  ↓
Player ID stored in state
Player name shown in UI
```

### 3. Ball Scoring
```
User clicks run button
  ↓
handleBallUpdate()
  ↓
Uses player IDs (striker, bowler)
Looks up names from playerNameMap
  ↓
Saves to database with IDs
  ↓
WebSocket broadcast
```

### 4. Data Persistence
```
Ball saved to cricket_ball_details
  ↓
Includes batsman_id and bowler_id
  ↓
Stats aggregated by player_id
  ↓
Linked to user profiles
  ↓
Available for career statistics
```

## Migration Steps

### Step 1: Run Database Migration
```bash
psql -U your_user -d score_ocean -f apps/backend/src/db/migrations/add_player_ids_to_cricket_stats.sql
```

### Step 2: Restart Backend
```bash
cd apps/backend
npm run dev
```

### Step 3: Test
1. Create a cricket match
2. Ensure both teams have players in rosters
3. Start the match
4. Select players from dropdowns
5. Score some balls
6. Verify data persists on refresh

## Benefits

### For Users
✅ Easy player selection
✅ No typing required
✅ Professional interface
✅ Accurate data entry
✅ Jersey numbers displayed

### For Data Quality
✅ No spelling errors
✅ Consistent player names
✅ Linked to user profiles
✅ Proper foreign keys
✅ Data integrity

### For Statistics
✅ Player career stats possible
✅ Historical performance tracking
✅ Team analytics
✅ Player comparisons
✅ Advanced reporting

### For System
✅ Proper database relationships
✅ Data normalization
✅ Query optimization
✅ Scalable architecture
✅ Production ready

## API Examples

### Get Team Rosters
```bash
GET /api/matches/:matchId/rosters

Response:
{
  "homeTeam": {
    "id": "team-uuid",
    "name": "Al Firdous",
    "players": [
      {
        "id": "player-uuid-1",
        "name": "Virat Kohli",
        "jerseyNumber": 18
      },
      {
        "id": "player-uuid-2",
        "name": "Rohit Sharma",
        "jerseyNumber": 45
      }
    ]
  },
  "awayTeam": { ... }
}
```

### Save Ball with Player IDs
```bash
POST /api/cricket-stats/:matchId/ball

{
  "innings": 1,
  "overNumber": 5,
  "ballNumber": 3,
  "bowlerId": "player-uuid-3",
  "bowlerName": "Jasprit Bumrah",
  "batsmanId": "player-uuid-1",
  "batsmanName": "Virat Kohli",
  "runs": 4,
  "extras": null,
  "isWicket": false
}
```

## UI Components

### Striker Dropdown
```tsx
<select value={striker} onChange={(e) => setStriker(e.target.value)}>
  <option value="">Select Striker</option>
  {battingTeamPlayers.map(player => (
    <option key={player.id} value={player.id}>
      {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
    </option>
  ))}
</select>
```

### Bowler Dropdown
```tsx
<select value={currentBowler} onChange={(e) => setCurrentBowler(e.target.value)}>
  <option value="">Select Bowler</option>
  {bowlingTeamPlayers.map(player => (
    <option key={player.id} value={player.id}>
      {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
    </option>
  ))}
</select>
```

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] Player ID columns added
- [ ] Foreign keys working
- [ ] Indexes created

### Backend
- [ ] GET /rosters endpoint works
- [ ] Returns correct team players
- [ ] Player IDs saved correctly
- [ ] Stats linked to profiles

### Frontend
- [ ] Dropdowns show team players
- [ ] Striker shows batting team
- [ ] Bowler shows bowling team
- [ ] Jersey numbers display
- [ ] Player names display correctly

### Integration
- [ ] Player selection works
- [ ] Ball scoring saves player IDs
- [ ] Data persists on refresh
- [ ] WebSocket updates work
- [ ] Stats linked to profiles

## Known Limitations

### Current Implementation
- Assumes teams have players in rosters
- Requires manual team roster setup
- No automatic playing 11 selection
- All roster players shown (not just playing 11)

### Future Enhancements
- Add playing 11 selection UI
- Filter by playing status
- Add player positions
- Add player photos
- Add player statistics preview

## Troubleshooting

### No Players in Dropdown
**Issue**: Dropdowns are empty
**Solution**: Ensure teams have players in `team_rosters` table

### Player Names Not Showing
**Issue**: Seeing player IDs instead of names
**Solution**: Check `playerNameMap` is populated correctly

### Data Not Persisting
**Issue**: Player selections lost on refresh
**Solution**: Verify database migration ran successfully

### Wrong Team Players
**Issue**: Bowler dropdown shows batting team
**Solution**: Check `currentInnings` state is correct

## Files Modified

### Backend
- `apps/backend/src/routes/match.ts` - Added rosters endpoint
- `apps/backend/src/services/match.service.ts` - Added getMatchRosters()
- `apps/backend/src/services/cricketStats.service.ts` - Updated to use player IDs

### Frontend
- `apps/frontend/src/pages/Match.tsx` - Added dropdowns and roster fetching

### Database
- `apps/backend/src/db/migrations/add_player_ids_to_cricket_stats.sql` - New migration

## Summary

✅ **Database Schema**: Updated with player ID columns
✅ **Backend API**: New rosters endpoint added
✅ **Backend Services**: Updated to handle player IDs
✅ **Frontend UI**: Dropdowns replace text inputs
✅ **Data Persistence**: Player IDs saved to database
✅ **Profile Linking**: Stats linked to user accounts
✅ **Real-time Updates**: WebSocket integration maintained

**Status**: Implementation Complete - Ready for Testing
**Priority**: HIGH - Essential for production use
**Impact**: Major improvement in data quality and user experience

---

**Created**: 2026-02-26
**Status**: Implementation Complete ✅
**Next Action**: Run migration and test with real teams

