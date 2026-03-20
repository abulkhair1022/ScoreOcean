# Using Real Data for Statistics Charts

## Current Implementation

The Stats page now uses **real data** from the API:

### ✅ What's Using Real Data:

1. **Summary Cards**
   - Sports count: From `sportProfiles.length`
   - Total Matches: Calculated from sport statistics
   - Win Rate: Calculated from wins/total matches
   - Tournaments: Would come from tournament registrations

2. **Skill Radar Chart**
   - Uses actual statistics from sport profiles
   - Normalizes values to 0-100 scale
   - Sport-specific metrics (Cricket, Football, Kabaddi, Volleyball)

3. **Match Outcomes Pie Chart**
   - Uses wins/draws/losses from sport statistics
   - Shows "No matches yet" if no data available

4. **Performance Trend Chart**
   - Attempts to fetch from `/users/:id/performance-stats` API
   - Falls back to empty state if no data available

## Data Sources

### Current Sport Profile Statistics

The sport profiles currently have these statistics:

**Cricket:**
```json
{
  "runs": 0,
  "wickets": 0,
  "battingAverage": 0,
  "bowlingAverage": 0,
  "strikeRate": 0
}
```

**Football:**
```json
{
  "goals": 0,
  "saves": 0,
  "assists": 0,
  "redCards": 0,
  "cleanSheets": 0,
  "yellowCards": 0
}
```

### Missing Data for Full Chart Functionality

To make all charts work with real data, we need to add:

1. **Match History Data**
   - `matchesPlayed`
   - `wins`
   - `draws`
   - `losses`

2. **Performance Trends**
   - Historical performance data over time
   - Currently available via `/users/:id/performance-stats` endpoint

## How to Add Match Outcome Data

### Option 1: Add to Sport Profile Statistics

Update the sport profile statistics to include match outcomes:

**Backend: `apps/backend/src/services/user.service.ts`**

When creating default stats, add match data:

```typescript
const getDefaultStats = (sport: Sport): SportStats => {
  switch (sport) {
    case Sport.CRICKET:
      return { 
        runs: 0, 
        wickets: 0, 
        battingAverage: 0, 
        bowlingAverage: 0, 
        strikeRate: 0,
        // Add match data
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0
      } as CricketStats;
    // ... similar for other sports
  }
};
```

**Update Type Definitions: `packages/types/src/user.ts`**

```typescript
export interface CricketStats {
  runs: number;
  wickets: number;
  battingAverage: number;
  bowlingAverage: number;
  strikeRate: number;
  // Add these
  matchesPlayed?: number;
  wins?: number;
  draws?: number;
  losses?: number;
}

// Similar updates for FootballStats, KabaddiStats, VolleyballStats
```

### Option 2: Calculate from Match History

When a match is completed, update player statistics:

**Backend: `apps/backend/src/services/match.service.ts`**

```typescript
async completeMatch(matchId: string, result: MatchResult): Promise<void> {
  // ... existing match completion logic
  
  // Update player statistics
  const players = await this.getMatchPlayers(matchId);
  
  for (const player of players) {
    await this.updatePlayerMatchStats(player.id, player.teamId, result);
  }
}

private async updatePlayerMatchStats(
  playerId: string, 
  teamId: string, 
  result: MatchResult
): Promise<void> {
  // Get player's sport profile
  const sportProfile = await this.getPlayerSportProfile(playerId, result.sport);
  
  // Update match statistics
  const stats = sportProfile.statistics;
  stats.matchesPlayed = (stats.matchesPlayed || 0) + 1;
  
  // Determine if player's team won
  if (result.winnerTeamId === teamId) {
    stats.wins = (stats.wins || 0) + 1;
  } else if (result.isDraw) {
    stats.draws = (stats.draws || 0) + 1;
  } else {
    stats.losses = (stats.losses || 0) + 1;
  }
  
  // Save updated statistics
  await this.updateSportProfile(playerId, sportProfile.id, stats);
}
```

## Current Chart Behavior

### With Real Data:

1. **Skill Radar**: ✅ Works with current sport statistics
   - Shows actual runs, wickets, goals, etc.
   - Normalizes to 0-100 scale for visualization

2. **Match Outcomes Pie**: ⚠️ Shows "No matches yet"
   - Will work once match outcome data is added
   - Currently shows placeholder

3. **Performance Trend**: ⚠️ Shows empty state
   - Will work when performance stats API returns data
   - Needs match history to generate trends

4. **Summary Cards**: ✅ Partially working
   - Sports count: Working
   - Total Matches: Will work with match data
   - Win Rate: Will work with match data
   - Tournaments: Needs tournament registration data

## Testing with Real Data

### Step 1: Add Match Data Manually (for testing)

You can manually update a player's sport profile statistics via API:

```bash
curl -X PUT http://localhost:3000/api/users/{userId}/sport-profiles/{sportId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "runs": 150,
    "wickets": 5,
    "battingAverage": 35.5,
    "strikeRate": 125.0,
    "bowlingAverage": 28.5,
    "matchesPlayed": 10,
    "wins": 6,
    "draws": 2,
    "losses": 2
  }'
```

### Step 2: Verify Charts Update

After adding data:
1. Refresh the Stats page
2. Skill Radar should show updated values
3. Match Outcomes pie should show win/draw/loss distribution
4. Summary cards should show correct totals

## Next Steps

### Immediate (for testing):
1. Manually add match outcome data to sport profiles
2. Verify charts display correctly
3. Test with different sports

### Long-term (for production):
1. Implement match completion logic
2. Auto-update player statistics after each match
3. Store historical performance data
4. Implement performance trends API
5. Add tournament participation tracking

## Example: Complete Flow

```typescript
// 1. Match is played
const match = await matchService.createMatch({...});

// 2. Match is completed with results
await matchService.completeMatch(match.id, {
  homeScore: 150,
  awayScore: 145,
  winnerTeamId: homeTeamId,
  sport: 'CRICKET'
});

// 3. Player statistics are automatically updated
// - matchesPlayed incremented
// - wins/losses updated
// - sport-specific stats updated (runs, wickets, etc.)

// 4. Charts automatically show updated data
// - Skill radar reflects new performance
// - Match outcomes show updated win/loss ratio
// - Performance trend shows progression
```

## Summary

The charts are now configured to use real data from the API. The main missing piece is match outcome data (wins/draws/losses) which needs to be:

1. Added to sport profile statistics structure
2. Updated when matches are completed
3. Tracked over time for performance trends

Once match data is available, all charts will automatically display real, up-to-date statistics!
