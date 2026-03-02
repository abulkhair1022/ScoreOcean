import { Router } from 'express';
import { tournamentService } from '../services/tournament.service';
import { pointsService } from '../services/points.service';
import { authenticate, AuthRequest, requireResourceOwnership } from '../middleware/auth';
import { query } from '../db/postgres';

const router = Router();

// Get all tournaments
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const includeDrafts = req.query.includeDrafts === 'true';
    
    const tournaments = await tournamentService.getAllTournaments(userId, includeDrafts);
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
});

// Create tournament
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const hostId = req.user!.userId;
    const tournamentData = req.body;

    const tournament = await tournamentService.createTournament(hostId, tournamentData);
    res.status(201).json(tournament);
  } catch (error) {
    next(error);
  }
});

// Get tournament by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await tournamentService.getTournament(id);
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

// Update tournament - requires ownership
router.put(
  '/:id',
  authenticate,
  requireResourceOwnership({ resourceType: 'tournament', resourceIdParam: 'id' }),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const tournament = await tournamentService.updateTournament(id, updates);
      res.json(tournament);
    } catch (error) {
      next(error);
    }
  }
);

// Delete tournament - requires ownership
router.delete(
  '/:id',
  authenticate,
  requireResourceOwnership({ resourceType: 'tournament', resourceIdParam: 'id' }),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      await tournamentService.deleteTournament(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Publish tournament - requires ownership
router.post(
  '/:id/publish',
  authenticate,
  requireResourceOwnership({ resourceType: 'tournament', resourceIdParam: 'id' }),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const tournament = await tournamentService.publishTournament(id);
      res.json(tournament);
    } catch (error) {
      next(error);
    }
  }
);

// Update tournament status - requires ownership
router.patch(
  '/:id/status',
  authenticate,
  requireResourceOwnership({ resourceType: 'tournament', resourceIdParam: 'id' }),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'status is required',
          },
        });
        return;
      }

      const tournament = await tournamentService.updateTournamentStatus(id, status);
      res.json(tournament);
    } catch (error) {
      next(error);
    }
  }
);

// Register team or player for tournament
router.post('/:id/register', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { teamId, playerDetails } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    // Get user role
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }
    
    const userRole = userResult.rows[0].role;

    // Get tournament to check format
    const tournamentResult = await query(
      'SELECT format FROM tournaments WHERE id = $1',
      [id]
    );

    if (tournamentResult.rows.length === 0) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tournament not found',
        },
      });
      return;
    }

    const tournament = tournamentResult.rows[0];
    const isLeague = tournament.format === 'LEAGUE';

    // Role-based validation:
    // - PLAYER can register for both leagues (individual) and tournaments (with team)
    // - TEAM can only register for tournaments (not leagues)
    // - ORGANIZATION cannot register
    if (userRole === 'ORGANIZATION') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Organizations cannot register for tournaments',
        },
      });
      return;
    }

    if (isLeague && userRole !== 'PLAYER') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only players can register for leagues',
        },
      });
      return;
    }

    if (!isLeague && userRole !== 'PLAYER' && userRole !== 'TEAM') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only players and teams can register for tournaments',
        },
      });
      return;
    }

    // For leagues, register player individually (no teamId required)
    // For tournaments, teamId is required
    if (!isLeague && !teamId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'teamId is required for tournament registration',
        },
      });
      return;
    }

    if (isLeague && teamId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Individual player registration only - teamId should not be provided for leagues',
        },
      });
      return;
    }

    // Validate player details for leagues
    if (isLeague && (!playerDetails || !playerDetails.role)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Player role is required for league registration',
        },
      });
      return;
    }

    // Register based on format
    const registration = isLeague 
      ? await tournamentService.registerPlayer(id, userId, playerDetails)
      : await tournamentService.registerTeam(id, teamId);
      
    res.status(201).json(registration);
  } catch (error) {
    next(error);
  }
});

// Get tournament registrations
router.get('/:id/registrations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const registrations = await tournamentService.getRegistrations(id);
    res.json(registrations);
  } catch (error) {
    next(error);
  }
});

// Get points table for tournament
router.get('/:id/points', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const pointsTable = await pointsService.getPointsTable(id);
    res.json(pointsTable);
  } catch (error) {
    next(error);
  }
});

export default router;
