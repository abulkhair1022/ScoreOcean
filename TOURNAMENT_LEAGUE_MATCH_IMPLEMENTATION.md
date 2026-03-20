# Tournament, League, and Match Implementation Summary

## Overview
Complete sports competition management system with Tournaments, Leagues (with auction system), and standalone Matches.

## Competition Types

### 1. Tournament (Team-Based)
- **Pre-formed teams compete**
- Teams register directly
- Formats: Knockout, Group+Knockout
- Example: Cricket Championship Cup, Football Knockout Tournament

### 2. League (Auction-Based)
- **Individual players register**
- **Auction process to form teams**
- **Teams compete in round-robin format**
- Format: League (Round-robin)
- Example: IPL-style Cricket League, Fantasy Football League

**League Workflow:**
1. Players register individually
2. Auction conducted to form teams
3. Players are distributed across teams
4. Teams compete in league matches
5. Points table and standings

### 3. Standalone Match
- Teams can create one-off matches against other teams
- Not part of any tournament or league
- Friendly matches or practice games
- **Status**: UI placeholder added, full implementation pending

## Key Rules

1. **Tournament** = Teams register and compete directly
   - KNOCKOUT format → Elimination rounds
   - GROUP_KNOCKOUT format → Group stage + Knockout
   
2. **League** = Players register → Auction → Teams formed → League matches
   - LEAGUE format → Round-robin competition
   - Auction system to distribute players
   - Teams created through auction process

## Implementation Details

### Database Schema
- `competition_type` column in `tournaments` table
- Values: 'TOURNAMENT' (team-based) or 'LEAGUE' (player-based)
- Constraint ensures only valid values

### Frontend Changes

#### Create Tournament/League Form
1. **Format Selector** with clear descriptions:
   - "League (Player Registration → Auction → Teams)" - Auction-based league
   - "Tournament - Knockout" - Direct team competition
   - "Tournament - Group + Knockout" - Direct team competition
   
2. **Automatic Competition Type**:
   - Selecting LEAGUE format automatically sets `competitionType` to 'LEAGUE' (auction-based)
   - Selecting KNOCKOUT or GROUP_KNOCKOUT automatically sets `competitionType` to 'TOURNAMENT' (team-based)

3. **Dynamic Labels**:
   - "Player Capacity" for League format (players who can register for auction)
   - "Team Capacity" for Tournament formats (teams that can register)
   - Helper text explains the workflow

4. **Visual Indicators**:
   - "Auction-Based" badge for League format
   - Blue color for auction-based leagues
   - Format badges show "League" vs "KNOCKOUT" vs "GROUP_KNOCKOUT"

#### Team Dashboard
- Added "Create Match" button
- Opens modal explaining standalone match feature
- Placeholder for future match creation functionality

### Backend Changes

1. **Tournament Creation**:
   - Added `competition_type` to INSERT statement
   - Defaults to 'TOURNAMENT' if not specified
   - Saved in database for all competitions

2. **Tournament Mapping**:
   - Added `competitionType` to Tournament object
   - Included in API responses

### Business Logic

#### Tournament (Knockout/Group+Knockout)
- Pre-formed teams register
- Teams compete directly in elimination or group stages
- `competitionType` = 'TOURNAMENT'
- No auction process

#### League (Round-Robin with Auction)
- Individual players register
- Auction process to form teams:
  1. **Player Registration Phase**: Players sign up
  2. **Auction Phase**: Teams bid for players
  3. **Team Formation**: Players distributed across teams
  4. **League Phase**: Teams compete in round-robin
- `competitionType` = 'LEAGUE'
- Similar to IPL, BBL, PSL format

#### Standalone Matches
- Teams can challenge other teams
- Independent of tournaments/leagues
- Track scores and statistics separately
- **Future Implementation**: Full match creation workflow

## User Workflows

### Creating a Tournament
1. Select format: Tournament - Knockout or Tournament - Group+Knockout
2. System automatically sets as team-based
3. Fill in details (name, sport, dates, venue, etc.)
4. Set team capacity
5. Create as DRAFT
6. Publish when ready → Teams can register and compete

### Creating a League
1. Select format: League (Player Registration → Auction → Teams)
2. System automatically sets as auction-based
3. Fill in details
4. Set player capacity (how many players can register)
5. Create as DRAFT
6. Publish when ready → **League Workflow Begins:**

**League Workflow:**
1. **Registration Phase**: Individual players register
2. **Auction Phase**: 
   - Organization conducts auction
   - Teams bid for players
   - Players are distributed across teams
3. **League Phase**:
   - Teams compete in round-robin format
   - Points table maintained
   - Standings updated after each match
4. **Playoffs/Finals**: Top teams compete for championship

### Creating a Match (Coming Soon)
1. Click "Create Match" in Team Dashboard
2. Select opponent team
3. Set date, time, venue
4. Send match invitation
5. Track scores and statistics

## League Auction System

### Auction Workflow
The league auction system follows a structured process similar to professional sports leagues like IPL:

#### Phase 1: Player Registration
- Individual players register for the league
- Players provide their sport profile and statistics
- Registration deadline enforced
- Player pool created

#### Phase 2: Team Setup
- Organization defines number of teams (e.g., 8 teams)
- Each team gets a budget (e.g., ₹100 crore)
- Team owners/captains assigned
- Auction rules configured

#### Phase 3: Auction Process
- **Live Auction**: Real-time bidding for players
- **Base Price**: Minimum bid for each player
- **Bidding**: Teams compete to acquire players
- **Sold/Unsold**: Players assigned to highest bidder
- **Budget Management**: Teams must stay within budget
- **Squad Limits**: Maximum players per team

#### Phase 4: Team Formation
- Players distributed across teams based on auction results
- Team rosters finalized
- Captains can be assigned
- Team strategies developed

#### Phase 5: League Matches
- Round-robin format: Each team plays every other team
- Points system: Win = 2 points, Draw = 1 point, Loss = 0 points
- Points table maintained
- Top teams qualify for playoffs

### Auction Features (Future Implementation)
- Live auction interface
- Real-time bidding
- Player cards with statistics
- Budget tracker
- Auction history
- Unsold player pool
- Re-auction rounds
- Team composition rules (e.g., max foreign players)

## Files Modified

### Frontend
- `apps/frontend/src/pages/Tournaments.tsx`
  - Updated create form with conditional registration type selector
  - Added dynamic labels and badges
  - Updated display logic

- `apps/frontend/src/pages/dashboards/TeamDashboard.tsx`
  - Added "Create Match" button
  - Added Create Match modal (placeholder)

### Backend
- `apps/backend/src/services/tournament.service.ts`
  - Added `competition_type` to INSERT statement
  - Added `competitionType` to mapRowToTournament

### Types
- `packages/types/src/tournament.ts`
  - Already had `CompetitionType` enum
  - Already had `competitionType` in Tournament interface

## Future Enhancements

### Match System
- Full match creation workflow
- Team challenge/invitation system
- Match scheduling and reminders
- Live score tracking
- Match statistics and history
- Match result validation

### Registration Enforcement
- Backend validation for registration type
- Prevent teams from registering for player-based leagues
- Prevent players from registering for team-based competitions
- Player registration endpoints for player-based leagues

### Analytics
- Separate statistics for tournaments vs leagues vs matches
- Performance tracking across competition types
- Head-to-head match records

## Testing Checklist
- [x] Create tournament (always team-based)
- [x] Create team-based league
- [x] Create player-based league
- [x] Display correct badges
- [x] Show/hide registration type selector
- [x] Dynamic capacity labels
- [x] Create Match button visible
- [ ] Match creation workflow (pending)
- [ ] Registration type enforcement (pending)
- [ ] Player registration for leagues (pending)
