# Cricket Data Persistence - Implementation Plan 📊💾

## Overview

Implement complete data persistence for cricket matches so batting/bowling statistics survive page refresh and are stored permanently in the database.

## Database Schema ✅ COMPLETED

### Tables Created

**1. cricket_batting_stats**
- Stores individual batsman statistics
- Fields: runs, balls, fours, sixes, strike_rate, dismissal, is_not_out
- Links to match_id and team_id

**2. cricket_bowling_stats**
- Stores individual bowler statistics  
- Fields: overs, maidens, runs_conceded, wickets, economy, wides, no_balls
- Links to match_id and team_id

**3. cricket_ball_details**
- Stores every single ball bowled
- Fields: innings, over_number, ball_number, bowler, batsman, runs, extras, wicket
- Complete ball-by-ball history

## Implementation Steps

### Phase 1: Backend Service Layer

**File**: `apps/backend/src/services/cricketStats.service.ts`

```typescript
export class CricketStatsService {
  // Save batting stats
  async saveBattingStats(matchId, teamId, batsmanData) {
    // Insert or update batting statistics
  }

  // Save bowling stats
  async saveBowlingStats(matchId, teamId, bowlerData) {
    // Insert or update bowling statistics
  }

  // Save ball details
  async saveBallDetails(matchId, innings, ballData) {
    // Insert ball-by-ball details
  }

  // Get match statistics
  async getMatchStats(matchId) {
    // Retrieve all stats for a match
  }

  // Calculate bowling figures
  calculateBowlingFigures(balls) {
    // Calculate overs, maidens, economy, etc.
  }
}
```

### Phase 2: API Endpoints

**File**: `apps/backend/src/routes/cricketStats.ts`

```typescript
// Save cricket statistics
POST /api/cricket-stats/:matchId/save
Body: {
  batting: [...],
  bowling: [...],
  balls: [...]
}

// Get cricket statistics
GET /api/cricket-stats/:matchId
Response: {
  batting: [...],
  bowling: [...],
  balls: [...]
}

// Update on each ball
PUT /api/cricket-stats/:matchId/ball
Body: {
  innings: 1,
  over: 5,
  ball: 3,
  bowler: "Bumrah",
  batsman: "Virat",
  runs: 4,
  extras: null,
  isWicket: false
}
```

### Phase 3: Frontend Integration

**Update**: `apps/frontend/src/pages/Match.tsx`

```typescript
// On component mount - Load existing data
useEffect(() => {
  if (matchId) {
    loadCricketStats();
  }
}, [matchId]);

const loadCricketStats = async () => {
  const response = await apiClient.get(`/cricket-stats/${matchId}`);
  setBatsmanScores(response.data.batting);
  setBowlingFigures(response.data.bowling);
  setBallByBallHistory(response.data.balls);
};

// After each ball - Save to database
const handleBallUpdate = async (...) => {
  // ... existing code ...
  
  // Save to database
  await apiClient.put(`/cricket-stats/${matchId}/ball`, {
    innings: currentInnings === 'home' ? 1 : 2,
    over: newOvers,
    ball: newBalls,
    bowler: currentBowler,
    batsman: striker,
    runs,
    extras,
    isWicket
  });
};

// On match end - Save final statistics
const handleEndMatch = async () => {
  await saveFinalStatistics();
  await apiClient.post(`/matches/${matchId}/end`);
};
```

### Phase 4: Bowling Figures Display

**Add to Detailed Scorecard**:

```tsx
{/* Bowling Figures */}
<div className="mb-6">
  <h4 className="text-lg font-semibold text-gray-900 mb-3">
    {awayTeam?.name} Bowling
  </h4>
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th>Bowler</th>
        <th>O</th>
        <th>M</th>
        <th>R</th>
        <th>W</th>
        <th>Econ</th>
      </tr>
    </thead>
    <tbody>
      {bowlingFigures.map(bowler => (
        <tr key={bowler.name}>
          <td>{bowler.name}</td>
          <td>{bowler.overs}</td>
          <td>{bowler.maidens}</td>
          <td>{bowler.runs}</td>
          <td>{bowler.wickets}</td>
          <td>{bowler.economy}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## Data Flow

### Scoring Flow
```
User clicks "4" button
  ↓
handleBallUpdate()
  ↓
Update local state (instant UI)
  ↓
Save to database (background)
  ↓
Broadcast via WebSocket
  ↓
Other viewers receive update
```

### Page Refresh Flow
```
User refreshes page
  ↓
Component mounts
  ↓
loadCricketStats()
  ↓
Fetch from database
  ↓
Restore all state
  ↓
UI shows complete data
```

## Bowling Figures Calculation

### From Ball-by-Ball Data

```typescript
const calculateBowlingFigures = (balls) => {
  const bowlers = {};
  
  balls.forEach(ball => {
    if (!bowlers[ball.bowler]) {
      bowlers[ball.bowler] = {
        name: ball.bowler,
        balls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
        maidens: 0
      };
    }
    
    const b = bowlers[ball.bowler];
    
    // Count legal deliveries
    if (!ball.extras || !['wide', 'noball'].includes(ball.extras.type)) {
      b.balls++;
    }
    
    // Count runs
    b.runs += ball.runs;
    if (ball.extras) {
      b.runs += ball.extras.runs;
      if (ball.extras.type === 'wide') b.wides++;
      if (ball.extras.type === 'noball') b.noBalls++;
    }
    
    // Count wickets
    if (ball.isWicket) b.wickets++;
  });
  
  // Calculate overs and economy
  Object.values(bowlers).forEach(b => {
    b.overs = Math.floor(b.balls / 6) + (b.balls % 6) / 10;
    b.economy = b.overs > 0 ? (b.runs / b.overs).toFixed(2) : '0.00';
  });
  
  return Object.values(bowlers);
};
```

## Benefits

### For Users
- ✅ Data persists across page refreshes
- ✅ Can review match anytime
- ✅ Complete statistics available
- ✅ Professional record keeping

### For Analysis
- ✅ Historical data for players
- ✅ Bowling performance tracking
- ✅ Match comparisons
- ✅ Statistical analysis

### For System
- ✅ Reliable data storage
- ✅ Audit trail
- ✅ Data integrity
- ✅ Scalable architecture

## Example Bowling Figures Display

```
┌─────────────────────────────────────────────────────────┐
│ Oman Bowling                                            │
│ ┌──────────┬───┬───┬────┬───┬──────┐                  │
│ │ Bowler   │ O │ M │ R  │ W │ Econ │                  │
│ ├──────────┼───┼───┼────┼───┼──────┤                  │
│ │ Bumrah   │ 4 │ 1 │ 24 │ 2 │ 6.00 │                  │
│ │ Shami    │ 3 │ 0 │ 28 │ 1 │ 9.33 │                  │
│ │ Jadeja   │ 2 │ 0 │ 12 │ 0 │ 6.00 │                  │
│ └──────────┴───┴───┴────┴───┴──────┘                  │
└─────────────────────────────────────────────────────────┘

Legend:
O = Overs
M = Maidens
R = Runs
W = Wickets
Econ = Economy Rate
```

## Testing Checklist

### Database
- [ ] Tables created successfully
- [ ] Indexes working
- [ ] Foreign keys valid
- [ ] Data types correct

### Backend
- [ ] Service methods implemented
- [ ] API endpoints created
- [ ] Validation working
- [ ] Error handling complete

### Frontend
- [ ] Load data on mount
- [ ] Save data on each ball
- [ ] Display bowling figures
- [ ] Handle refresh correctly

### Integration
- [ ] WebSocket still works
- [ ] Real-time updates persist
- [ ] Undo updates database
- [ ] Match end saves all data

## Migration Steps

### Step 1: Database ✅
- [x] Create tables
- [x] Add indexes
- [x] Test schema

### Step 2: Backend Service
- [ ] Create cricketStats.service.ts
- [ ] Implement save methods
- [ ] Implement load methods
- [ ] Add calculations

### Step 3: API Routes
- [ ] Create cricketStats.ts routes
- [ ] Add POST /save endpoint
- [ ] Add GET /:matchId endpoint
- [ ] Add PUT /ball endpoint

### Step 4: Frontend Integration
- [ ] Add loadCricketStats()
- [ ] Update handleBallUpdate()
- [ ] Add bowling figures display
- [ ] Test persistence

### Step 5: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Performance testing

## Estimated Time

- Backend Service: 2-3 hours
- API Endpoints: 1-2 hours
- Frontend Integration: 2-3 hours
- Bowling Figures UI: 1-2 hours
- Testing & Debugging: 2-3 hours

**Total**: 8-13 hours of development

## Priority

**HIGH PRIORITY** - This is essential for production use

Without persistence:
- ❌ Data lost on refresh
- ❌ No historical records
- ❌ Can't review matches
- ❌ Incomplete system

With persistence:
- ✅ Professional system
- ✅ Complete records
- ✅ Historical analysis
- ✅ Production ready

## Next Steps

1. **Immediate**: Review this plan
2. **Short-term**: Implement backend service
3. **Medium-term**: Add API endpoints
4. **Long-term**: Complete frontend integration

## Summary

✅ **Database Schema**: Created and ready
⏳ **Backend Service**: Needs implementation
⏳ **API Endpoints**: Needs implementation
⏳ **Frontend Integration**: Needs implementation
⏳ **Bowling Figures**: Needs implementation

**Current Status**: Foundation laid, implementation needed

**Recommendation**: Implement in phases, test thoroughly, deploy incrementally

---

**Created**: 2026-02-26
**Status**: Planning Complete, Implementation Pending
**Priority**: HIGH
