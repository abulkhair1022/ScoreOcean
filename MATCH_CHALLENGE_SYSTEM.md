# Match Challenge System Implementation

## Overview
Teams can challenge other teams to standalone matches (not part of tournaments). The challenged team must accept before the match can take place.

## Flow

```
Team A (Challenger)
    ↓
Creates Match Challenge
    ↓
Selects Opponent Team B
    ↓
System sends notification to Team B
    ↓
Team B receives invitation
    ↓
Team B can: Accept or Decline
    ↓
If Accept: Match is scheduled
If Decline: Match is cancelled
```

## Database Schema

### New Table: match_challenges

```sql
CREATE TABLE IF NOT EXISTS match_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  opponent_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  sport VARCHAR(50) NOT NULL,
  proposed_date TIMESTAMP,
  venue TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, DECLINED, CANCELLED
  match_id UUID REFERENCES matches(id), -- Set when accepted
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  responded_by UUID REFERENCES users(id),
  UNIQUE(challenger_team_id, opponent_team_id, created_at)
);

CREATE INDEX idx_match_challenges_challenger ON match_challenges(challenger_team_id);
CREATE INDEX idx_match_challenges_opponent ON match_challenges(opponent_team_id);
CREATE INDEX idx_match_challenges_status ON match_challenges(status);
```

## API Endpoints

### 1. Create Match Challenge
```
POST /api/matches/challenge
Authorization: Bearer <token>

Body:
{
  "challengerTeamId": "uuid",
  "opponentTeamId": "uuid",
  "sport": "CRICKET",
  "proposedDate": "2026-03-15T14:00:00Z",
  "venue": "Stadium Name"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "challengerTeam": {...},
    "opponentTeam": {...}
  }
}
```

### 2. Get Match Challenges (Received)
```
GET /api/matches/challenges/received
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "challengerTeam": {...},
      "sport": "CRICKET",
      "proposedDate": "2026-03-15T14:00:00Z",
      "venue": "Stadium",
      "status": "PENDING",
      "createdAt": "..."
    }
  ]
}
```

### 3. Get Match Challenges (Sent)
```
GET /api/matches/challenges/sent
Authorization: Bearer <token>

Response: Same as received
```

### 4. Accept Match Challenge
```
POST /api/matches/challenges/:id/accept
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "challenge": {...},
    "match": {...}
  }
}
```

### 5. Decline Match Challenge
```
POST /api/matches/challenges/:id/decline
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Challenge declined"
}
```

## Notification System

### When Challenge is Created
```javascript
// Send to opponent team host
{
  type: 'MATCH_CHALLENGE',
  title: 'New Match Challenge!',
  message: '{ChallengerTeam} has challenged your team to a {Sport} match',
  data: {
    challengeId: 'uuid',
    challengerTeamId: 'uuid',
    challengerTeamName: 'Team Name',
    sport: 'CRICKET',
    proposedDate: '...',
    venue: '...'
  }
}
```

### When Challenge is Accepted
```javascript
// Send to challenger team host
{
  type: 'MATCH_CHALLENGE_ACCEPTED',
  title: 'Challenge Accepted!',
  message: '{OpponentTeam} accepted your match challenge',
  data: {
    challengeId: 'uuid',
    matchId: 'uuid',
    opponentTeamName: 'Team Name'
  }
}
```

### When Challenge is Declined
```javascript
// Send to challenger team host
{
  type: 'MATCH_CHALLENGE_DECLINED',
  title: 'Challenge Declined',
  message: '{OpponentTeam} declined your match challenge',
  data: {
    challengeId: 'uuid',
    opponentTeamName: 'Team Name'
  }
}
```

## Frontend Components

### 1. Create Match Modal (Updated)
```typescript
interface CreateMatchForm {
  opponentTeamId: string;
  sport: string;
  proposedDate: string;
  venue: string;
}
```

### 2. Match Challenges List
- Show received challenges (pending)
- Show sent challenges (with status)
- Accept/Decline buttons for received
- Cancel button for sent (if still pending)

### 3. Notification Bell Integration
- Show match challenge notifications
- Click to view challenge details
- Quick accept/decline actions

## Business Rules

### Validation
1. ✅ Challenger team must exist and user must be team host
2. ✅ Opponent team must exist and be different from challenger
3. ✅ Both teams must play the same sport
4. ✅ Proposed date must be in the future
5. ✅ Cannot challenge same team multiple times simultaneously

### Permissions
1. ✅ Only team hosts can create challenges
2. ✅ Only opponent team host can accept/decline
3. ✅ Only challenger can cancel pending challenge

### Match Creation (on Accept)
1. ✅ Create match record with status 'SCHEDULED'
2. ✅ Link match to challenge
3. ✅ Set both teams as participants
4. ✅ Use proposed date and venue
5. ✅ Send notifications to both teams

## UI/UX Flow

### For Challenger (Team A)
1. Click "Create Match" button
2. Select opponent team from dropdown
3. Choose sport (filtered by team's sports)
4. Set proposed date and venue
5. Click "Send Challenge"
6. See challenge in "Sent Challenges" list with status
7. Receive notification when opponent responds

### For Opponent (Team B)
1. Receive notification: "Team A challenged you to a match"
2. Click notification or go to "Match Challenges" page
3. See challenge details (team, sport, date, venue)
4. Click "Accept" or "Decline"
5. If accept: Match is created and scheduled
6. If decline: Challenge is closed

## Implementation Steps

### Phase 1: Database
- [ ] Create migration for match_challenges table
- [ ] Add indexes
- [ ] Test schema

### Phase 2: Backend
- [ ] Create match challenge service
- [ ] Add API routes
- [ ] Add notification triggers
- [ ] Add validation logic
- [ ] Test endpoints

### Phase 3: Frontend
- [ ] Update Create Match modal
- [ ] Create Match Challenges page
- [ ] Add notification handling
- [ ] Add accept/decline UI
- [ ] Test user flows

### Phase 4: Testing
- [ ] Test challenge creation
- [ ] Test accept flow
- [ ] Test decline flow
- [ ] Test notifications
- [ ] Test edge cases

## Example Scenarios

### Scenario 1: Successful Challenge
1. Team A creates challenge for Team B
2. Team B host receives notification
3. Team B accepts
4. Match is created and scheduled
5. Both teams can see match in their schedule

### Scenario 2: Declined Challenge
1. Team A creates challenge for Team B
2. Team B host receives notification
3. Team B declines
4. Team A receives decline notification
5. Challenge is closed

### Scenario 3: Cancelled Challenge
1. Team A creates challenge for Team B
2. Team A changes mind
3. Team A cancels challenge
4. Team B receives cancellation notification
5. Challenge is closed

## Future Enhancements

1. **Counter Proposals**: Opponent can suggest different date/venue
2. **Recurring Matches**: Schedule series of matches
3. **Match Fees**: Optional entry fee for matches
4. **Spectator Invites**: Invite other users to watch
5. **Live Scoring**: Real-time score updates during match
6. **Match History**: Track head-to-head records
7. **Rankings**: Team rankings based on match results

---

**Status:** 📋 Design Complete - Ready for Implementation

Would you like me to start implementing this feature?
