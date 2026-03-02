# League vs Tournament Implementation Plan

## Overview
Implement distinction between Leagues and Tournaments with different registration rules.

## Key Differences

### Tournaments
- Created by: TEAM or ORGANIZATION roles
- Registration: Only TEAM or ORGANIZATION can register
- Players: Can only VIEW tournament details (read-only)
- Format: KNOCKOUT, GROUP_KNOCKOUT, or LEAGUE format

### Leagues  
- Created by: ORGANIZATION role ONLY
- Registration: Individual PLAYERS can register
- Players: Can register and participate individually
- Format: Typically LEAGUE (round-robin) format

## Database Changes

### Add competition_type column to tournaments table
```sql
ALTER TABLE tournaments ADD COLUMN competition_type VARCHAR(50) DEFAULT 'TOURNAMENT';
-- Values: 'TOURNAMENT' or 'LEAGUE'
```

### Create player_registrations table for league registrations
```sql
CREATE TABLE IF NOT EXISTS player_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payment_id UUID,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, player_id)
);
```

## Backend Changes

### 1. Update Types (packages/types/src/tournament.ts)
- Add `CompetitionType` enum
- Add `competitionType` field to Tournament interface
- Add `PlayerRegistration` interface

### 2. Update Tournament Service
- Add `competitionType` parameter to createTournament
- Validate ORGANIZATION-only for league creation
- Add `registerPlayer()` method for league registration
- Update `registerTeam()` to check competition type
- Add `getPlayerRegistrations()` method

### 3. Update Tournament Routes
- Add POST `/tournaments/:id/register-player` endpoint
- Update POST `/tournaments/:id/register` to validate competition type
- Add validation middleware for role-based registration

### 4. Update Validation Schemas
- Add competitionType validation
- Add player registration validation

## Frontend Changes

### 1. Update Tournament Creation Form
- Add "Competition Type" selector (Tournament/League)
- Show/hide fields based on type
- Restrict league creation to ORGANIZATION role

### 2. Update Tournament List/Details
- Show competition type badge
- Different registration buttons based on:
  - User role (PLAYER vs TEAM/ORG)
  - Competition type (LEAGUE vs TOURNAMENT)
- For players viewing tournaments: Show "View Only" state

### 3. Registration Logic
- LEAGUE + PLAYER role → Show "Register as Player" button
- TOURNAMENT + TEAM/ORG role → Show "Register Team" button  
- TOURNAMENT + PLAYER role → Show "View Details" only (no registration)

## Implementation Steps

1. Database migration
2. Update types package
3. Update backend service and routes
4. Update frontend components
5. Test all scenarios

## Access Control Matrix

| User Role    | Create Tournament | Create League | Register for Tournament | Register for League | View Details |
|--------------|-------------------|---------------|-------------------------|---------------------|--------------|
| PLAYER       | ❌                | ❌            | ❌                      | ✅                  | ✅           |
| TEAM         | ✅                | ❌            | ✅                      | ❌                  | ✅           |
| ORGANIZATION | ✅                | ✅            | ✅                      | ❌                  | ✅           |
| ADMIN        | ✅                | ✅            | ✅                      | ✅                  | ✅           |
