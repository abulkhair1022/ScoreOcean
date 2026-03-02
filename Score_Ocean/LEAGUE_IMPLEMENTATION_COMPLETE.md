# League Implementation - Complete Guide

## What Was Done

### 1. Database Changes
Created migration file: `apps/backend/src/db/migrations/add_league_support.sql`

**To apply the migration, run:**
```bash
psql -U your_db_user -d score_ocean -f apps/backend/src/db/migrations/add_league_support.sql
```

This adds:
- `competition_type` column to tournaments table ('TOURNAMENT' or 'LEAGUE')
- `player_registrations` table for individual player registrations
- Appropriate indexes and constraints

### 2. Type Definitions Updated
File: `packages/types/src/tournament.ts`

Added:
- `CompetitionType` enum (TOURNAMENT, LEAGUE)
- `competitionType` field to `Tournament` and `TournamentCreate` interfaces
- `PlayerRegistration` interface for league registrations

**Rebuild types package:**
```bash
cd packages/types
npm run build
```

## What Needs To Be Done

### 3. Backend Service Updates

#### A. Update Tournament Service (`apps/backend/src/services/tournament.service.ts`)

Add these methods:

```typescript
/**
 * Register player for league (individual registration)
 * Only allowed for competitions with competitionType = 'LEAGUE'
 */
async registerPlayer(tournamentId: string, playerId: string): Promise<PlayerRegistration> {
  const tournament = await this.getTournament(tournamentId);

  // Validate this is a league
  if (tournament.competitionType !== CompetitionType.LEAGUE) {
    throw new AppError('Individual player registration is only allowed for leagues', 400);
  }

  // Check registration deadline
  const now = new Date();
  const deadline = new Date(tournament.registrationDeadline);
  if (now >= deadline) {
    throw new AppError('Registration deadline has passed', 400);
  }

  // Check if registration is open
  if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
    throw new AppError('League registration is not open', 400);
  }

  // Check capacity
  const playerRegistrationsResult = await query(
    'SELECT COUNT(*) as count FROM player_registrations WHERE tournament_id = $1 AND status = $2',
    [tournamentId, RegistrationStatus.CONFIRMED]
  );
  
  const confirmedCount = parseInt(playerRegistrationsResult.rows[0].count);
  if (confirmedCount >= tournament.teamCapacity) {
    throw new AppError('League is at full capacity', 400);
  }

  // Check if player already registered
  const existingResult = await query(
    'SELECT id FROM player_registrations WHERE tournament_id = $1 AND player_id = $2',
    [tournamentId, playerId]
  );
  
  if (existingResult.rows.length > 0) {
    throw new AppError('Player is already registered for this league', 400);
  }

  // Validate player exists and has correct role
  const playerResult = await query(
    'SELECT role FROM users WHERE id = $1',
    [playerId]
  );
  
  if (playerResult.rows.length === 0) {
    throw new AppError('Player not found', 404);
  }
  
  if (playerResult.rows[0].role !== 'PLAYER') {
    throw new AppError('Only users with PLAYER role can register for leagues', 403);
  }

  // Create registration
  const status = tournament.registrationFee === 0 
    ? RegistrationStatus.CONFIRMED 
    : RegistrationStatus.PENDING;

  const result = await query(
    `INSERT INTO player_registrations (tournament_id, player_id, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [tournamentId, playerId, status]
  );

  const registration = result.rows[0];

  // Send confirmation notification if confirmed
  if (status === RegistrationStatus.CONFIRMED) {
    await this.sendPlayerRegistrationNotification(playerId, tournamentId);
  }

  return {
    id: registration.id,
    tournamentId: registration.tournament_id,
    playerId: registration.player_id,
    status: registration.status as RegistrationStatus,
    paymentId: registration.payment_id,
    registeredAt: registration.registered_at,
  };
}

/**
 * Get player registrations for a league
 */
async getPlayerRegistrations(tournamentId: string): Promise<PlayerRegistration[]> {
  const result = await query(
    'SELECT * FROM player_registrations WHERE tournament_id = $1 ORDER BY registered_at ASC',
    [tournamentId]
  );

  return result.rows.map((r) => ({
    id: r.id,
    tournamentId: r.tournament_id,
    playerId: r.player_id,
    status: r.status as RegistrationStatus,
    paymentId: r.payment_id,
    registeredAt: r.registered_at,
  }));
}

/**
 * Send player registration notification
 */
private async sendPlayerRegistrationNotification(
  playerId: string,
  tournamentId: string
): Promise<void> {
  const tournament = await this.getTournament(tournamentId);

  await query(
    `INSERT INTO notifications (user_id, type, title, message, channels, data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      playerId,
      'REGISTRATION_CONFIRMED',
      'League Registration Confirmed',
      `You have been successfully registered for "${tournament.name}"`,
      ['IN_APP', 'EMAIL'],
      JSON.stringify({ tournamentId }),
    ]
  );
}
```

Update `createTournament` method to:
1. Accept `competitionType` parameter
2. Validate that only ORGANIZATION can create leagues
3. Store `competition_type` in database

Update `registerTeam` method to:
1. Check that `competitionType === 'TOURNAMENT'`
2. Throw error if trying to register team for a league

Update `mapRowToTournament` to include `competitionType` field

#### B. Update Tournament Routes (`apps/backend/src/routes/tournament.ts`)

Add new route:
```typescript
// Register player for league
router.post(
  '/:id/register-player',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const playerId = req.user!.userId;

      // Verify user is a player
      if (req.user!.role !== 'PLAYER') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only players can register for leagues',
          },
        });
      }

      const registration = await tournamentService.registerPlayer(id, playerId);
      res.status(201).json(registration);
    } catch (error) {
      next(error);
    }
  }
);

// Get player registrations for a league
router.get(
  '/:id/player-registrations',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const registrations = await tournamentService.getPlayerRegistrations(id);
      res.json(registrations);
    } catch (error) {
      next(error);
    }
  }
);
```

#### C. Update Validation Schemas (`apps/backend/src/middleware/validationSchemas.ts`)

Update `createTournament` schema to include `competitionType`:
```typescript
competitionType: {
  type: 'string' as const,
  required: true,
  enum: Object.values(CompetitionType),
  message: `Competition type must be one of: ${Object.values(CompetitionType).join(', ')}`,
},
```

### 4. Frontend Updates

#### A. Update Tournament Creation Form (`apps/frontend/src/pages/Tournaments.tsx`)

Add competition type selector:
```typescript
const [competitionType, setCompetitionType] = useState<'TOURNAMENT' | 'LEAGUE'>('TOURNAMENT');

// In the form:
<div>
  <label>Competition Type</label>
  <select
    value={competitionType}
    onChange={(e) => setCompetitionType(e.target.value as 'TOURNAMENT' | 'LEAGUE')}
    disabled={user?.role !== 'ORGANIZATION' && competitionType === 'LEAGUE'}
  >
    <option value="TOURNAMENT">Tournament (Team-based)</option>
    <option value="LEAGUE" disabled={user?.role !== 'ORGANIZATION'}>
      League (Individual Players) {user?.role !== 'ORGANIZATION' && '- Organization Only'}
    </option>
  </select>
</div>
```

#### B. Update Tournament Display

Show competition type badge:
```typescript
<span className={`badge ${tournament.competitionType === 'LEAGUE' ? 'bg-green' : 'bg-blue'}`}>
  {tournament.competitionType === 'LEAGUE' ? '👤 League' : '👥 Tournament'}
</span>
```

#### C. Update Registration Logic

```typescript
const canRegister = () => {
  if (tournament.competitionType === 'LEAGUE') {
    return user?.role === 'PLAYER';
  } else {
    return user?.role === 'TEAM' || user?.role === 'ORGANIZATION';
  }
};

const handleRegister = async () => {
  if (tournament.competitionType === 'LEAGUE') {
    // Register as individual player
    await apiClient.post(`/tournaments/${tournament.id}/register-player`);
  } else {
    // Register team
    await apiClient.post(`/tournaments/${tournament.id}/register`, { teamId: selectedTeamId });
  }
};
```

## Testing Checklist

- [ ] Run database migration
- [ ] Rebuild types package
- [ ] Test league creation (ORGANIZATION only)
- [ ] Test tournament creation (TEAM/ORGANIZATION)
- [ ] Test player registration for league
- [ ] Test team registration for tournament
- [ ] Verify players cannot register for tournaments
- [ ] Verify teams cannot register for leagues
- [ ] Test view-only access for players on tournaments

## Summary

**Leagues:**
- Created by ORGANIZATION only
- Individual PLAYER registration
- Players compete individually

**Tournaments:**
- Created by TEAM or ORGANIZATION
- Team registration only
- Players can only view (no registration)

This implementation provides clear separation between team-based tournaments and individual player leagues while maintaining backward compatibility.
