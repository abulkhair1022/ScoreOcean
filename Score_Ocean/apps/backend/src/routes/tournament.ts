import { Router } from 'express';
import { tournamentService } from '../services/tournament.service';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all tournaments
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const tournaments = await tournamentService.getAllTournaments();
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

// Update tournament
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const tournament = await tournamentService.updateTournament(id, updates);
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

// Delete tournament
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    await tournamentService.deleteTournament(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

// Publish tournament
router.post('/:id/publish', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await tournamentService.publishTournament(id);
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

// Update tournament status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
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
});

// Register team for tournament
router.post('/:id/register', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'teamId is required',
        },
      });
      return;
    }

    const registration = await tournamentService.registerTeam(id, teamId);
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

export default router;
