# One Team Per Player Constraint

## Overview
A player can only be a member of one team at a time. This constraint is enforced at both the application and database levels.

## Database Constraint

### Migration File
`apps/backend/src/db/migrations/add_one_team_per_player_constraint.sql`

**To apply:**
```bash
psql -U your_db_user -d score_ocean -f apps/backend/src/db/migrations/add_one_team_per_player_constraint.sql
```

This creates a unique index on `player_id` in the `team_rosters` table, preventing duplicate entries.

## Backend Implementation

### Updated Methods in `team.service.ts`

#### 1. `acceptInvitation()` - Enhanced
Now checks if player is already in another team before accepting invitation:
```typescript
// Check if player is already in another team
const existingTeamResult = await query(
  'SELECT t.name, t.id FROM team_rosters tr JOIN teams t ON tr.team_id = t.id WHERE tr.player_id = $1',
  [playerId]
);

if (existingTeamResult.rows.length > 0) {
  const existingTeam = existingTeamResult.rows[0];
  throw new AppError(
    `Player is already a member of team "${existingTeam.name}". A player can only be in one team at a time. Please leave your current team first.`,
    400
  );
}
```

#### 2. `addPlayerToRoster()` - Enhanced
Now checks if player is already in another team before adding:
```typescript
// Check if player is already in another team
const existingTeamResult = await query(
  'SELECT t.name, t.id FROM team_rosters tr JOIN teams t ON tr.team_id = t.id WHERE tr.player_id = $1',
  [playerId]
);

if (existingTeamResult.rows.length > 0) {
  const existingTeam = existingTeamResult.rows[0];
  throw new AppError(
    `Player is already a member of team "${existingTeam.name}". A player can only be in one team at a time. Please remove them from their current team first.`,
    400
  );
}
```

#### 3. `leaveTeam()` - NEW METHOD
Allows a player to leave their current team:
```typescript
async leaveTeam(playerId: string): Promise<void>
```

**Usage:**
```typescript
await teamService.leaveTeam(playerId);
```

**Features:**
- Finds player's current team
- Removes player from roster
- Sends notification to team host
- Throws error if player is not in any team

#### 4. `getPlayerTeam()` - NEW METHOD
Gets the player's current team (if any):
```typescript
async getPlayerTeam(playerId: string): Promise<Team | null>
```

**Usage:**
```typescript
const team = await teamService.getPlayerTeam(playerId);
if (team) {
  console.log(`Player is in team: ${team.name}`);
} else {
  console.log('Player is not in any team');
}
```

## New API Endpoints

### 1. Leave Team
**POST** `/api/teams/leave`

Allows a player to leave their current team.

**Authentication:** Required (PLAYER role only)

**Response:**
- `204 No Content` - Successfully left team
- `403 Forbidden` - User is not a player
- `404 Not Found` - Player is not in any team

**Example:**
```typescript
await apiClient.post('/teams/leave');
```

### 2. Get Player's Team
**GET** `/api/teams/player/:playerId/team`

Gets the team that a player is currently in.

**Authentication:** Required

**Response:**
- `200 OK` - Returns team object
- `404 Not Found` - Player is not in any team

**Example:**
```typescript
const response = await apiClient.get(`/teams/player/${playerId}/team`);
const team = response.data;
```

## Frontend Integration

### Check if Player is in a Team

```typescript
const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

useEffect(() => {
  const checkPlayerTeam = async () => {
    try {
      const response = await apiClient.get(`/teams/player/${user.id}/team`);
      setCurrentTeam(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setCurrentTeam(null); // Player not in any team
      }
    }
  };
  
  if (user?.role === 'PLAYER') {
    checkPlayerTeam();
  }
}, [user]);
```

### Leave Team Button

```typescript
const handleLeaveTeam = async () => {
  if (!confirm('Are you sure you want to leave your current team?')) {
    return;
  }
  
  try {
    await apiClient.post('/teams/leave');
    setCurrentTeam(null);
    alert('You have successfully left the team');
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to leave team');
  }
};

// In JSX:
{currentTeam && (
  <div className="alert alert-info">
    <p>You are currently in team: <strong>{currentTeam.name}</strong></p>
    <button onClick={handleLeaveTeam} className="btn btn-danger">
      Leave Team
    </button>
  </div>
)}
```

### Accept Invitation with Team Check

```typescript
const handleAcceptInvitation = async (invitationId: string) => {
  try {
    await apiClient.post(`/teams/invitations/${invitationId}/accept`);
    alert('Invitation accepted successfully!');
  } catch (error) {
    if (error.response?.status === 400) {
      // Player is already in another team
      const message = error.response.data.message;
      if (confirm(`${message}\n\nWould you like to leave your current team and accept this invitation?`)) {
        // Leave current team first
        await apiClient.post('/teams/leave');
        // Then accept invitation
        await apiClient.post(`/teams/invitations/${invitationId}/accept`);
        alert('Successfully joined new team!');
      }
    } else {
      alert('Failed to accept invitation');
    }
  }
};
```

## Error Messages

### When Accepting Invitation
```
Player is already a member of team "Team Name". A player can only be in one team at a time. Please leave your current team first.
```

### When Adding Player to Roster
```
Player is already a member of team "Team Name". A player can only be in one team at a time. Please remove them from their current team first.
```

### When Leaving Team (Not in Any Team)
```
Player is not a member of any team
```

## User Flow Examples

### Scenario 1: Player Accepts Invitation (Already in Team)
1. Player receives invitation to Team B
2. Player tries to accept invitation
3. System checks: Player is already in Team A
4. Error returned: "Already in Team A, please leave first"
5. Player leaves Team A
6. Player accepts invitation to Team B
7. Success: Player is now in Team B

### Scenario 2: Team Manager Adds Player (Already in Team)
1. Manager of Team B tries to add Player X
2. System checks: Player X is already in Team A
3. Error returned: "Player is in Team A, remove them first"
4. Manager contacts Player X
5. Player X leaves Team A
6. Manager adds Player X to Team B
7. Success: Player X is now in Team B

### Scenario 3: Player Leaves Team
1. Player is in Team A
2. Player clicks "Leave Team"
3. Confirmation dialog: "Are you sure?"
4. Player confirms
5. System removes player from Team A
6. Notification sent to Team A manager
7. Success: Player is now free to join another team

## Benefits

1. **Data Integrity**: Prevents conflicting team memberships
2. **Clear Ownership**: Each player has one clear team affiliation
3. **Tournament Registration**: Simplifies tournament registration (player registers with their team)
4. **Performance Tracking**: Clear attribution of player performance to one team
5. **User Experience**: Prevents confusion about which team a player represents

## Testing Checklist

- [ ] Run database migration
- [ ] Test accepting invitation when already in a team (should fail)
- [ ] Test leaving team successfully
- [ ] Test accepting invitation after leaving team (should succeed)
- [ ] Test adding player to roster when already in team (should fail)
- [ ] Test getting player's current team
- [ ] Test getting player's team when not in any team (should return 404)
- [ ] Verify database constraint prevents duplicate entries
- [ ] Test frontend flow for leaving and joining teams

## Notes

- The database constraint provides a safety net even if application logic fails
- Players must explicitly leave their current team before joining another
- Team managers are notified when players leave
- The constraint does not apply to team hosts/managers, only to roster members
