import { Router, Response, NextFunction } from 'express';
import { matchService } from '../services/match.service';
import { authenticate, AuthRequest, requireMatchScorePermission } from '../middleware/auth';
import { ScoreUpdate } from '@score-ocean/types';
import { query } from '../db/postgres';

const router = Router();

/**
 * Create a direct/friendly match between two teams (no tournament or fixture)
 * POST /api/matches/direct
 */
router.post('/direct', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { homeTeamId, awayTeamId, sport } = req.body;
    const userId = req.user!.userId;

    if (!homeTeamId || !awayTeamId || !sport) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'homeTeamId, awayTeamId and sport are required' } });
      return;
    }
    if (homeTeamId === awayTeamId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Home and away teams must be different' } });
      return;
    }

    // Ensure requester is the host of the home team
    const teamCheck = await query('SELECT host_id FROM teams WHERE id = $1', [homeTeamId]);
    if (!teamCheck.rows.length || teamCheck.rows[0].host_id !== userId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the home team host can create a challenge match' } });
      return;
    }

    // Initialize basic sport-specific data
    const sportDefaults: Record<string, object> = {
      CRICKET:    { runs: 0, wickets: 0, overs: 0, runRate: 0 },
      FOOTBALL:   { goals: 0, yellowCards: 0, redCards: 0 },
      KABADDI:    { points: 0, allOuts: 0 },
      VOLLEYBALL: { sets: 0, points: 0 },
      BASKETBALL: { points: 0, fouls: 0 },
      BADMINTON:  { sets: 0, points: 0 },
    };
    const sportData = sportDefaults[sport.toUpperCase()] || {};

    const result = await query(
      `INSERT INTO matches (home_team_id, away_team_id, sport, status, home_score, away_score, sport_specific_data)
       VALUES ($1, $2, $3, 'PENDING_ACCEPTANCE', 0, 0, $4) RETURNING *`,
      [homeTeamId, awayTeamId, sport, JSON.stringify(sportData)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

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

    // Attach team info (name, hostId, captainId) so the client doesn't need extra
    // authenticated requests just to display team names.
    const teamsResult = await query(
      `SELECT id, name, host_id AS "hostId", captain_id AS "captainId", sport
       FROM teams WHERE id = ANY($1::uuid[])`,
      [[match.homeTeamId, match.awayTeamId]]
    );
    const teamsById: Record<string, any> = {};
    teamsResult.rows.forEach((t) => { teamsById[t.id] = t; });

    res.json({
      ...match,
      homeTeam: teamsById[match.homeTeamId] ?? null,
      awayTeam: teamsById[match.awayTeamId] ?? null,
    });
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
 * Get matches for a team (with team names and venue)
 * GET /api/matches/team/:teamId
 */
router.get('/team/:teamId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    const result = await query(
      `SELECT m.*,
              ht.name AS home_team_name,
              at.name AS away_team_name,
              t.venue  AS tournament_venue
       FROM matches m
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       LEFT JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.home_team_id = $1 OR m.away_team_id = $1
       ORDER BY m.created_at DESC`,
      [teamId]
    );
    res.json(result.rows);
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

/**
 * Update match score (live scoring)
 * PUT /api/matches/:id/score
 */
router.put(
  '/:id/score',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { homeScore, awayScore, sportSpecificData } = req.body;
      const userId = req.user!.userId;

      const match = await matchService.updateMatchScore(id, homeScore, awayScore, userId, sportSpecificData);
      res.json(match);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Start match
 * POST /api/matches/:id/start
 */
router.post(
  '/:id/start',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const match = await matchService.startMatch(id, userId);
      res.json(match);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * End match
 * POST /api/matches/:id/end
 */
router.post(
  '/:id/end',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const match = await matchService.endMatch(id, userId);
      res.json(match);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Accept a challenge match - only the away team host can accept
 * POST /api/matches/:id/accept-challenge
 */
router.post('/:id/accept-challenge', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const matchResult = await query('SELECT * FROM matches WHERE id = $1', [id]);
    if (!matchResult.rows.length) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Match not found' } });
      return;
    }
    const m = matchResult.rows[0];

    if (m.status !== 'PENDING_ACCEPTANCE') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'This match is not awaiting acceptance' } });
      return;
    }

    // Only the away team host can accept
    const awayTeam = await query('SELECT host_id FROM teams WHERE id = $1', [m.away_team_id]);
    if (!awayTeam.rows.length || awayTeam.rows[0].host_id !== userId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the away team host can accept this challenge' } });
      return;
    }

    await query("UPDATE matches SET status = 'SCHEDULED', updated_at = NOW() WHERE id = $1", [id]);
    res.json({ message: 'Challenge accepted. Match is now scheduled.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Decline / cancel a challenge match - either team host can decline
 * POST /api/matches/:id/decline-challenge
 */
router.post('/:id/decline-challenge', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const matchResult = await query('SELECT * FROM matches WHERE id = $1', [id]);
    if (!matchResult.rows.length) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Match not found' } });
      return;
    }
    const m = matchResult.rows[0];

    if (m.status !== 'PENDING_ACCEPTANCE') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'This match is not awaiting acceptance' } });
      return;
    }

    // Either team host can decline/cancel
    const teamCheck = await query(
      'SELECT id FROM teams WHERE id IN ($1, $2) AND host_id = $3',
      [m.home_team_id, m.away_team_id, userId]
    );
    if (!teamCheck.rows.length) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only team hosts can decline this challenge' } });
      return;
    }

    await query("UPDATE matches SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [id]);
    res.json({ message: 'Challenge declined.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Get score history
 * GET /api/matches/:id/history
 */
router.get(
  '/:id/history',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const history = await matchService.getScoreHistory(id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get team rosters for a match
 * GET /api/matches/:id/rosters
 */
router.get(
  '/:id/rosters',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rosters = await matchService.getMatchRosters(id);
      res.json(rosters);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
