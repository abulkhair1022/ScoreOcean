# Player Selection from Team Rosters - Implementation Plan

## Overview

Implement a complete player selection system where batsmen and bowlers are selected from team rosters (playing 11), with full data persistence, WebSocket updates, and player profile statistics.

## Requirements

1. ✅ Fetch team rosters (playing 11 players)
2. ✅ Dropdown selectors for batsmen (from batting team)
3. ✅ Dropdown selector for bowler (from bowling team)
4. ✅ Save player selections to database
5. ✅ Update player profiles with match statistics
6. ✅ Persist data on page refresh
7. ✅ Real-time updates via WebSocket
8. ✅ Link stats to user profiles

## Database Schema Changes

### 1. Update cricket_batting_stats
Add player_id to link to user profiles:
```sql
ALTER TABLE cricket_batting_stats 
ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES users(id);
```

### 2. Update cricket_bowling_stats
Add player_id to link to user profiles:
```sql
ALTER TABLE cricket_bowling_stats 
ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES users(id);
```

### 3. Update cricket_ball_details
Add player IDs for batsman and bowler:
```sql
ALTER TABLE cricket_ball_details 
ADD COLUMN IF NOT EXISTS batsman_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS bowler_id UUID REFERENCES users(id);
```

## Backend Implementation

### 1. New API Endpoint: Get Team Roster
**File**: `apps/backend/src/routes/match.ts`
```typescript
GET /api/matches/:matchId/rosters
Response: {
  homeTeam: {
    id: string,
    name: string,
    players: [{ id, name, jerseyNumber }]
  },
  awayTeam: {
    id: string,
    name: string,
    players: [{ id, name, jerseyNumber }]
  }
}
```

### 2. Update Cricket Stats Service
**File**: `apps/backend/src/services/cricketStats.service.ts`
- Add player_id to all save methods
- Update getMatchStats to include player info
- Add method to update player sport profiles

### 3. Update Match Service
**File**: `apps/backend/src/services/match.service.ts`
- Add method to get team rosters
- Update player statistics after each ball
- Link cricket stats to user profiles

## Frontend Implementation

### 1. Fetch Team Rosters
**File**: `apps/frontend/src/pages/Match.tsx`
```typescript
const [homeTeamPlayers, setHomeTeamPlayers] = useState([]);
const [awayTeamPlayers, setAwayTeamPlayers] = useState([]);

const fetchTeamRosters = async () => {
  const response = await apiClient.get(`/matches/${matchId}/rosters`);
  setHomeTeamPlayers(response.data.homeTeam.players);
  setAwayTeamPlayers(response.data.awayTeam.players);
};
```

### 2. Replace Text Inputs with Dropdowns
```typescript
// Striker Dropdown
<select value={striker} onChange={(e) => setStriker(e.target.value)}>
  <option value="">Select Striker</option>
  {battingTeamPlayers.map(player => (
    <option key={player.id} value={player.id}>
      {player.name}
    </option>
  ))}
</select>

// Non-Striker Dropdown
<select value={nonStriker} onChange={(e) => setNonStriker(e.target.value)}>
  <option value="">Select Non-Striker</option>
  {battingTeamPlayers.map(player => (
    <option key={player.id} value={player.id}>
      {player.name}
    </option>
  ))}
</select>

// Bowler Dropdown
<select value={currentBowler} onChange={(e) => set