import { Router, Response, NextFunction } from 'express';
import { matchService } from '../services/match.service';
import { authenticate, AuthRequest, requireMatchScorePermission } from '../middleware/auth';
import { ScoreUpdate } from '@score-ocean/types';

const router = Router();

/**
 * Create match from fixture
 * POST /api/matches/from-fixture/:fixtureId
 */
router.post(
  '/from-fixture/:fixtureId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { fixtureId } = req.params;
      const match = await matchService.createMatch(fixtureId);
      res.status(201).json(match);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get match by ID
 * GET /api/matches/:id
 */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const match = await matchService.getMatch(id);
    res.json(match);
  } catch (error) {
    next(error);
  }
});

/**
 * Get matches for a tournament
 * GET /api/matches/tournament/:tournamentId
 */
router.get(
  '/tournament/:tournamentId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tournamentId } = req.params;
      const matches = await matchService.getTournamentMatches(tournamentId);
      res.json(matches);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get matches for a team
 * GET /api/matches/team/:teamId
 */
router.get('/team/:teamId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const matches = await matchService.getTeamMatches(teamId);
    res.json(matches);
  } catch (error) {
    next(error);
  }
});

/**
 * Update match score - requires match score permission
 * POST /api/matches/:id/score
 */
router.post(
  '/:id/score',
  authenticate,
  requireMatchScorePermission,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const scoreUpdate: Omit<ScoreUpdate, 'timestamp'> = req.body;
      const userId = req.user!.userId;

      const match = await matchService.updateScore(id, scoreUpdate, userId);
      res.json(match);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Finalize match - requires match score permission
 * POST /api/matches/:id/finalize
 */
router.post(
  '/:id/finalize',
  authenticate,
  requireMatchScorePermission,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const match = await matchService.finalizeMatch(id);
      res.json(match);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
