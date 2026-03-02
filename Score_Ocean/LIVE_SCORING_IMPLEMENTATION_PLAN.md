# Live Scoring System - Implementation Plan

## Overview

Implement a live scoring system where team hosts can update match scores in real-time during the match.

## Features to Implement

### Phase 1: Basic Match Viewing & Scoring ✅ (Priority)
1. **Match Details Page**
   - View match information (teams, sport, date, venue)
   - Current score display
   - Match status (SCHEDULED, LIVE, COMPLETED)
   - Team lineups

2. **Score Update Interface**
   - Simple score input for both teams
   - Update button
   - Only accessible to team hosts
   - Real-time updates via WebSocket

3. **Match Status Controls**
   - Start Match button
   - End Match button
   - Pause/Resume (optional)

### Phase 2: Sport-Specific Scoring (Future)
1. **Cricket Scoring**
   - Runs, wickets, overs
   - Ball-by-ball commentary
   - Innings tracking

2. **Football Scoring**
   - Goals, yellow/red cards
   - Half-time tracking
   - Substitutions

3. **Basketball Scoring**
   - Points, quarters
   - Fouls tracking

### Phase 3: Advanced Features (Future)
1. **Live Commentary**
2. **Player Statistics**
3. **Match Timeline**
4. **Spectator View** (public match page)
5. **Score Notifications**

## Database Schema

### Existing Tables
```sql
-- matches table (already exists)
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  sport VARCHAR(50) NOT NULL,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  status VARCHAR(50) DEFAULT 'SCHEDULED',
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  sport_specific_data JSONB DEFAULT '{}',
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- score_history table (already exists)
CREATE TABLE score_history (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  sport_specific_data JSONB DEFAULT '{}',
  updated_by UUID REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Match Management
```
GET    /api/matches/:id              - Get match details
PUT    /api/matches/:id/score        - Update match score
POST   /api/matches/:id/start        - Start match
POST   /api/matches/:id/end          - End match
GET    /api/matches/:id/history      - Get score history
```

### WebSocket Events
```
match:score-update    - Real-time score updates
match:status-change   - Match status changes
match:started         - Match started
match:ended           - Match ended
```

## Frontend Components

### 1. Match Details Page
**Route**: `/match/:id`

**Components**:
- MatchHeader (teams, sport, status)
- ScoreBoard (current scores)
- MatchInfo (date, venue, status)
- ScoreUpdateForm (for team hosts)
- MatchControls (start/end buttons)
- ScoreHistory (timeline of score changes)

### 2. Score Update Form
**Access**: Only team hosts can update scores

**Fields**:
- Home team score input
- Away team score input
- Update button
- Validation

### 3. Live Score Display
**Features**:
- Large score display
- Team names and logos
- Match timer
- Status indicator (LIVE badge)
- Auto-refresh via WebSocket

## User Permissions

### Team Host (Home or Away)
- ✅ View match details
- ✅ Update scores
- ✅ Start/end match
- ✅ View score history

### Team Members
- ✅ View match details
- ✅ View live scores
- ❌ Cannot update scores

### Other Users
- ✅ View match details (if public)
- ✅ View live scores
- ❌ Cannot update scores

## Implementation Steps

### Step 1: Backend - Match Service
- [ ] Add `getMatch(id)` method
- [ ] Add `updateScore(id, homeScore, awayScore, userId)` method
- [ ] Add `startMatch(id, userId)` method
- [ ] Add `endMatch(id, userId)` method
- [ ] Add `getScoreHistory(id)` method
- [ ] Add authorization checks (only team hosts)

### Step 2: Backend - API Routes
- [ ] Create `/api/matches/:id` GET endpoint
- [ ] Create `/api/matches/:id/score` PUT endpoint
- [ ] Create `/api/matches/:id/start` POST endpoint
- [ ] Create `/api/matches/:id/end` POST endpoint
- [ ] Create `/api/matches/:id/history` GET endpoint

### Step 3: Backend - WebSocket Integration
- [ ] Emit `match:score-update` on score change
- [ ] Emit `match:status-change` on status change
- [ ] Add match room subscriptions

### Step 4: Frontend - Match Page
- [ ] Create `Match.tsx` page component
- [ ] Add route `/match/:id`
- [ ] Fetch match data on load
- [ ] Display match information
- [ ] Show current scores

### Step 5: Frontend - Score Update
- [ ] Create score update form
- [ ] Add validation
- [ ] Handle score submission
- [ ] Show success/error messages
- [ ] Disable for non-hosts

### Step 6: Frontend - Real-time Updates
- [ ] Subscribe to WebSocket events
- [ ] Update scores in real-time
- [ ] Show "LIVE" indicator
- [ ] Handle connection status

### Step 7: Frontend - Match Controls
- [ ] Add "Start Match" button
- [ ] Add "End Match" button
- [ ] Update match status
- [ ] Show appropriate controls based on status

### Step 8: Integration
- [ ] Link from challenges to match page
- [ ] Link from team dashboard to matches
- [ ] Add match list view
- [ ] Test end-to-end flow

## UI/UX Design

### Match Page Layout
```
┌─────────────────────────────────────┐
│  CRICKET MATCH          [LIVE] 🔴   │
├─────────────────────────────────────┤
│                                     │
│   Team A        VS        Team B    │
│     125                    98       │
│                                     │
├─────────────────────────────────────┤
│  Match Info                         │
│  📅 27 Feb 2026, 11:00 AM          │
│  📍 Venue: City Stadium            │
│  ⏱️  Status: LIVE                   │
├─────────────────────────────────────┤
│  Update Score (Host Only)           │
│  Team A: [___]  Team B: [___]      │
│           [Update Score]            │
├─────────────────────────────────────┤
│  Score History                      │
│  • 11:30 - Score updated: 125-98   │
│  • 11:15 - Score updated: 98-75    │
│  • 11:00 - Match started           │
└─────────────────────────────────────┘
```

## Testing Checklist

### Match Creation
- [ ] Challenge accepted creates match
- [ ] Match has correct teams
- [ ] Match has correct sport
- [ ] Match status is SCHEDULED

### Score Updates
- [ ] Team host can update scores
- [ ] Non-hosts cannot update scores
- [ ] Scores are validated (non-negative)
- [ ] Score history is recorded
- [ ] WebSocket broadcasts updates

### Match Status
- [ ] Can start scheduled match
- [ ] Can end live match
- [ ] Cannot start already started match
- [ ] Status changes are broadcast

### Real-time Updates
- [ ] Scores update without refresh
- [ ] Multiple users see same scores
- [ ] LIVE indicator shows correctly
- [ ] Connection status handled

## Security Considerations

1. **Authorization**
   - Only team hosts can update scores
   - Verify user is host before allowing updates
   - Validate match exists and is accessible

2. **Validation**
   - Scores must be non-negative integers
   - Match must be in correct status for action
   - Prevent score manipulation

3. **Rate Limiting**
   - Limit score update frequency
   - Prevent spam updates

## Performance Considerations

1. **WebSocket Optimization**
   - Use match-specific rooms
   - Unsubscribe when leaving page
   - Handle reconnection

2. **Caching**
   - Cache match data
   - Invalidate on updates

3. **Database**
   - Index match_id in score_history
   - Optimize score history queries

## Future Enhancements

1. **Sport-Specific Features**
   - Cricket: Overs, wickets, run rate
   - Football: Half-time, injury time
   - Basketball: Quarters, timeouts

2. **Advanced Scoring**
   - Player-level statistics
   - Ball-by-ball commentary
   - Video highlights

3. **Social Features**
   - Match chat
   - Reactions
   - Share match link

4. **Analytics**
   - Match statistics
   - Team performance trends
   - Player rankings

---

**Priority**: High
**Complexity**: Medium-High
**Estimated Time**: 4-6 hours for Phase 1

**Ready to implement?** Let me know if you want me to start with Phase 1 (Basic Match Viewing & Scoring)!

