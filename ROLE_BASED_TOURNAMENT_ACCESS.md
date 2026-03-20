# Role-Based Tournament Access Control

## Summary of Changes

Updated tournament registration and creation logic based on user roles.

## User Role Permissions

### PLAYER Role
**Can:**
- ✅ Register for LEAGUES (individual registration)
- ✅ Register for TOURNAMENTS (team registration)
- ✅ View all tournaments

**Cannot:**
- ❌ Create tournaments

### TEAM Role
**Can:**
- ✅ Register for TOURNAMENTS only (team registration)
- ✅ View all tournaments

**Cannot:**
- ❌ Register for LEAGUES (leagues are for individual players only)
- ❌ Create tournaments

### ORGANIZATION Role
**Can:**
- ✅ Create tournaments
- ✅ View all tournaments

**Cannot:**
- ❌ Register for any tournaments or leagues

## Implementation Details

### Frontend (Tournaments.tsx)

#### Create Tournament Button
- Only shown to ORGANIZATION role users
- TEAM users no longer see this button

#### Registration Buttons
```typescript
// PLAYER role
- Leagues: "Register as Player" button
- Tournaments: "Register Team" button

// TEAM role  
- Leagues: "View Details" button only (cannot register)
- Tournaments: "Register Team" button

// ORGANIZATION role
- All: "View Details" button only (cannot register)
```

### Backend (tournament.ts)

#### Registration Validation
```typescript
// ORGANIZATION - Cannot register at all
if (userRole === 'ORGANIZATION') {
  return 403: "Organizations cannot register for tournaments"
}

// LEAGUE format - Only PLAYER can register
if (isLeague && userRole !== 'PLAYER') {
  return 403: "Only players can register for leagues"
}

// TOURNAMENT format - PLAYER or TEAM can register
if (!isLeague && userRole !== 'PLAYER' && userRole !== 'TEAM') {
  return 403: "Only players and teams can register for tournaments"
}
```

## Testing

### Test as PLAYER
1. Login as player
2. Go to Tournaments page
3. Should see:
   - "Register as Player" for leagues
   - "Register Team" for tournaments
   - No "Create Tournament" button

### Test as TEAM
1. Login as team
2. Go to Tournaments page
3. Should see:
   - "View Details" for leagues (cannot register)
   - "Register Team" for tournaments
   - No "Create Tournament" button

### Test as ORGANIZATION
1. Login as organization
2. Go to Tournaments page
3. Should see:
   - "Create Tournament" button
   - "View Details" for all tournaments (cannot register)

## Database Roles

```sql
-- Check user roles
SELECT id, email, role FROM users;

-- Roles available:
-- 'PLAYER' - Individual players
-- 'TEAM' - Team accounts
-- 'ORGANIZATION' - Organizations that host tournaments
```

## Registration Flow

### For PLAYER registering for LEAGUE
1. Click "Register as Player"
2. Fill in player details (role, position, experience)
3. If fee > 0: Complete payment
4. Registration confirmed

### For PLAYER/TEAM registering for TOURNAMENT
1. Click "Register Team"
2. Select team from dropdown
3. Validate team has minimum players
4. If fee > 0: Complete payment
5. Registration confirmed

## Error Messages

| Scenario | Error Message |
|----------|--------------|
| TEAM tries to register for league | "Only players can register for leagues" |
| ORGANIZATION tries to register | "Organizations cannot register for tournaments" |
| Team doesn't have enough players | "Team roster must have at least X players for SPORT" |
| Non-PLAYER/TEAM tries to register for tournament | "Only players and teams can register for tournaments" |

---

**Status:** ✅ Implemented and Ready to Test
