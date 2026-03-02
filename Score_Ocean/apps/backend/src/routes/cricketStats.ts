import { Router, Response, NextFunction } from 'express';
import { cricketStatsService } from '../services/cricketStats.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db/postgres';

const router = Router();

/**
 * Backfill sport_profiles.statistics from existing cricket_batting_stats / cricket_bowling_stats
 * POST /api/cricket-stats/recalculate
 */
router.post(
  '/recalculate',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Recalculate batting stats for all players
      const batters = await query(
        `SELECT DISTINCT player_id FROM cricket_batting_stats WHERE player_id IS NOT NULL`
      );
      for (const row of batters.rows) {
        const agg = await query(
          `SELECT
            COALESCE(SUM(runs), 0)::int AS total_runs,
            COALESCE(SUM(balls), 0)::int AS total_balls,
            COALESCE(COUNT(*), 0)::int AS innings_played,
            CASE WHEN SUM(balls) > 0 THEN ROUND((SUM(runs)::numeric / SUM(balls)) * 100, 2) ELSE 0 END AS strike_rate,
            CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(runs)::numeric / COUNT(*), 2) ELSE 0 END AS batting_avg
          FROM cricket_batting_stats WHERE player_id = $1`,
          [row.player_id]
        );
        if (agg.rows.length > 0) {
          const r = agg.rows[0];
          await query(
            `UPDATE sport_profiles
             SET statistics = (
               COALESCE(statistics, '{}'::jsonb)
               - 'runs' - 'battingAverage' - 'strikeRate' - 'inningsPlayed'
             ) || jsonb_build_object(
               'Runs', $2::int, 'BattingAverage', $3::numeric,
               'StrikeRate', $4::numeric, 'InningsPlayed', $5::int
             )
             WHERE user_id = $1 AND sport = 'CRICKET'`,
            [row.player_id, r.total_runs, r.batting_avg, r.strike_rate, r.innings_played]
          );
        }
      }

      // Recalculate bowling stats for all players
      const bowlers = await query(
        `SELECT DISTINCT player_id FROM cricket_bowling_stats WHERE player_id IS NOT NULL`
      );
      for (const row of bowlers.rows) {
        const agg = await query(
          `SELECT
            COALESCE(SUM(wickets), 0)::int AS total_wickets,
            CASE WHEN SUM(overs) > 0 THEN ROUND(SUM(runs_conceded)::numeric / SUM(overs), 2) ELSE 0 END AS bowling_avg
          FROM cricket_bowling_stats WHERE player_id = $1`,
          [row.player_id]
        );
        if (agg.rows.length > 0) {
          const r = agg.rows[0];
          await query(
            `UPDATE sport_profiles
             SET statistics = (
               COALESCE(statistics, '{}'::jsonb)
               - 'wickets' - 'bowlingAverage'
             ) || jsonb_build_object(
               'Wickets', $2::int, 'BowlingAverage', $3::numeric
             )
             WHERE user_id = $1 AND sport = 'CRICKET'`,
            [row.player_id, r.total_wickets, r.bowling_avg]
          );
        }
      }

      res.json({ success: true, message: 'Stats recalculated for all players', battersUpdated: batters.rows.length, bowlersUpdated: bowlers.rows.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get cricket statistics for a match
 * GET /api/cricket-stats/:matchId
 */
router.get(
  '/:matchId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const stats = await cricketStatsService.getMatchStats(matchId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Save ball details
 * POST /api/cricket-stats/:matchId/ball
 */
router.post(
  '/:matchId/ball',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const ballData = req.body;

      await cricketStatsService.saveBallDetails(matchId, ballData);
      res.json({ success: true, message: 'Ball details saved' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Save batting statistics
 * POST /api/cricket-stats/:matchId/batting
 */
router.post(
  '/:matchId/batting',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const { teamId, innings, batsmanData } = req.body;

      await cricketStatsService.saveBattingStats(matchId, teamId, innings, batsmanData);
      res.json({ success: true, message: 'Batting stats saved' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Save bowling statistics
 * POST /api/cricket-stats/:matchId/bowling
 */
router.post(
  '/:matchId/bowling',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const { teamId, innings, bowlerData } = req.body;

      await cricketStatsService.saveBowlingStats(matchId, teamId, innings, bowlerData);
      res.json({ success: true, message: 'Bowling stats saved' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Calculate bowling figures from ball-by-ball data
 * GET /api/cricket-stats/:matchId/bowling-figures
 */
router.get(
  '/:matchId/bowling-figures',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      const { innings } = req.query;

      const stats = await cricketStatsService.getMatchStats(matchId);
      
      // Filter balls by innings if specified
      const balls = innings 
        ? stats.balls.filter((b: any) => b.innings === parseInt(innings as string))
        : stats.balls;

      const bowlingFigures = cricketStatsService.calculateBowlingFigures(balls);
      res.json(bowlingFigures);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete all cricket stats for a match
 * DELETE /api/cricket-stats/:matchId
 */
router.delete(
  '/:matchId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { matchId } = req.params;
      await cricketStatsService.deleteMatchStats(matchId);
      res.json({ success: true, message: 'Cricket stats deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
