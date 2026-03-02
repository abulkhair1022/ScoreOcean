import { query } from '../db/postgres';

interface BatsmanStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal: string;
  isNotOut: boolean;
}

interface BowlerStats {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

interface BallDetail {
  innings: number;
  overNumber: number;
  ballNumber: number;
  bowlerId: string;
  bowlerName: string;
  batsmanId: string;
  batsmanName: string;
  runs: number;
  extras: any;
  isWicket: boolean;
}

export class CricketStatsService {
  /**
   * Save batting statistics for a match
   */
  async saveBattingStats(
    matchId: string,
    teamId: string,
    innings: number,
    batsmanData: BatsmanStats[]
  ): Promise<void> {
    // Delete existing stats for this innings
    await query(
      'DELETE FROM cricket_batting_stats WHERE match_id = $1 AND team_id = $2 AND innings = $3',
      [matchId, teamId, innings]
    );

    // Insert new stats
    for (const batsman of batsmanData) {
      await query(
        `INSERT INTO cricket_batting_stats (
          match_id, team_id, innings, player_id, batsman_name, runs, balls, fours, sixes,
          strike_rate, dismissal, is_not_out
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          matchId,
          teamId,
          innings,
          batsman.playerId,
          batsman.name,
          batsman.runs,
          batsman.balls,
          batsman.fours,
          batsman.sixes,
          batsman.strikeRate,
          batsman.dismissal,
          batsman.isNotOut,
        ]
      );
    }

    // Aggregate totals per player and update sport_profiles.statistics
    const playerIds = [...new Set(batsmanData.map(b => b.playerId).filter(Boolean))];
    for (const playerId of playerIds) {
      const agg = await query(
        `SELECT
          COALESCE(SUM(runs), 0)::int AS total_runs,
          COALESCE(SUM(balls), 0)::int AS total_balls,
          COALESCE(COUNT(*), 0)::int AS innings_played,
          CASE WHEN SUM(balls) > 0
            THEN ROUND((SUM(runs)::numeric / SUM(balls)) * 100, 2)
            ELSE 0
          END AS strike_rate,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(SUM(runs)::numeric / COUNT(*), 2)
            ELSE 0
          END AS batting_avg
        FROM cricket_batting_stats
        WHERE player_id = $1`,
        [playerId]
      );
      if (agg.rows.length > 0) {
        const r = agg.rows[0];
        await query(
          `UPDATE sport_profiles
           SET statistics = (
             COALESCE(statistics, '{}'::jsonb)
             - 'runs' - 'battingAverage' - 'strikeRate' - 'inningsPlayed'
           ) || jsonb_build_object(
             'Runs', $2::int,
             'BattingAverage', $3::numeric,
             'StrikeRate', $4::numeric,
             'InningsPlayed', $5::int
           )
           WHERE user_id = $1 AND sport = 'CRICKET'`,
          [playerId, r.total_runs, r.batting_avg, r.strike_rate, r.innings_played]
        );
      }
    }
  }

  /**
   * Save bowling statistics for a match
   */
  async saveBowlingStats(
    matchId: string,
    teamId: string,
    innings: number,
    bowlerData: BowlerStats[]
  ): Promise<void> {
    // Delete existing stats for this innings
    await query(
      'DELETE FROM cricket_bowling_stats WHERE match_id = $1 AND team_id = $2 AND innings = $3',
      [matchId, teamId, innings]
    );

    // Insert new stats
    for (const bowler of bowlerData) {
      await query(
        `INSERT INTO cricket_bowling_stats (
          match_id, team_id, innings, player_id, bowler_name, overs, maidens, runs_conceded,
          wickets, economy, wides, no_balls
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          matchId,
          teamId,
          innings,
          bowler.playerId,
          bowler.name,
          bowler.overs,
          bowler.maidens,
          bowler.runsConceded,
          bowler.wickets,
          bowler.economy,
          bowler.wides,
          bowler.noBalls,
        ]
      );
    }

    // Aggregate totals per bowler and update sport_profiles.statistics
    const bowlerIds = [...new Set(bowlerData.map(b => b.playerId).filter(Boolean))];
    for (const playerId of bowlerIds) {
      const agg = await query(
        `SELECT
          COALESCE(SUM(wickets), 0)::int AS total_wickets,
          COALESCE(SUM(overs), 0)::numeric AS total_overs,
          COALESCE(SUM(runs_conceded), 0)::int AS total_runs_conceded,
          CASE WHEN SUM(overs) > 0
            THEN ROUND(SUM(runs_conceded)::numeric / SUM(overs), 2)
            ELSE 0
          END AS bowling_avg
        FROM cricket_bowling_stats
        WHERE player_id = $1`,
        [playerId]
      );
      if (agg.rows.length > 0) {
        const r = agg.rows[0];
        await query(
          `UPDATE sport_profiles
           SET statistics = (
             COALESCE(statistics, '{}'::jsonb)
             - 'wickets' - 'bowlingAverage'
           ) || jsonb_build_object(
             'Wickets', $2::int,
             'BowlingAverage', $3::numeric
           )
           WHERE user_id = $1 AND sport = 'CRICKET'`,
          [playerId, r.total_wickets, r.bowling_avg]
        );
      }
    }
  }

  /**
   * Save ball details
   */
  async saveBallDetails(matchId: string, ballData: BallDetail): Promise<void> {
    await query(
      `INSERT INTO cricket_ball_details (
        match_id, innings, over_number, ball_number, bowler_id, bowler_name, 
        batsman_id, batsman_name, runs, extras_type, extras_runs, is_wicket
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        matchId,
        ballData.innings,
        ballData.overNumber,
        ballData.ballNumber,
        ballData.bowlerId,
        ballData.bowlerName,
        ballData.batsmanId,
        ballData.batsmanName,
        ballData.runs,
        ballData.extras?.type || null,
        ballData.extras?.runs || 0,
        ballData.isWicket,
      ]
    );
  }

  /**
   * Get all cricket statistics for a match
   */
  async getMatchStats(matchId: string): Promise<{
    batting: any[];
    bowling: any[];
    balls: any[];
  }> {
    // Get batting stats
    const battingResult = await query(
      `SELECT * FROM cricket_batting_stats 
       WHERE match_id = $1 
       ORDER BY innings, id`,
      [matchId]
    );

    // Get bowling stats
    const bowlingResult = await query(
      `SELECT * FROM cricket_bowling_stats 
       WHERE match_id = $1 
       ORDER BY innings, id`,
      [matchId]
    );

    // Get ball details
    const ballsResult = await query(
      `SELECT * FROM cricket_ball_details 
       WHERE match_id = $1 
       ORDER BY innings, over_number, ball_number`,
      [matchId]
    );

    return {
      batting: battingResult.rows,
      bowling: bowlingResult.rows,
      balls: ballsResult.rows.map((row) => ({
        ...row,
        extras: row.extras_type ? { type: row.extras_type, runs: row.extras_runs } : null,
        isWicket: row.is_wicket,
      })),
    };
  }

  /**
   * Calculate bowling figures from ball-by-ball data
   */
  calculateBowlingFigures(balls: any[]): BowlerStats[] {
    const bowlers: { [key: string]: any } = {};

    balls.forEach((ball) => {
      const bowlerKey = ball.bowler_name || ball.bowler || 'Unknown';
      if (!bowlers[bowlerKey]) {
        bowlers[bowlerKey] = {
          name: bowlerKey,
          balls: 0,
          runs: 0,
          wickets: 0,
          wides: 0,
          noBalls: 0,
          maidens: 0,
          overs: 0,
          economy: 0,
        };
      }

      const b = bowlers[bowlerKey];

      // Count legal deliveries (wide and no-ball don't count)
      if (!ball.extras || !['wide', 'noball'].includes(ball.extras.type)) {
        b.balls++;
      }

      // Count runs
      b.runs += ball.runs;
      if (ball.extras) {
        b.runs += ball.extras.runs;
        if (ball.extras.type === 'wide') b.wides++;
        if (ball.extras.type === 'noball') b.noBalls++;
      }

      // Count wickets
      if (ball.isWicket) b.wickets++;
    });

    // Calculate overs and economy for each bowler
    const bowlerStats: BowlerStats[] = Object.values(bowlers).map((b: any) => {
      const overs = Math.floor(b.balls / 6) + (b.balls % 6) / 10;
      const economy = overs > 0 ? b.runs / overs : 0;

      return {
        playerId: '',
        name: b.name,
        overs: parseFloat(overs.toFixed(1)),
        maidens: b.maidens,
        runsConceded: b.runs,
        wickets: b.wickets,
        economy: parseFloat(economy.toFixed(2)),
        wides: b.wides,
        noBalls: b.noBalls,
      };
    });

    return bowlerStats;
  }

  /**
   * Delete all cricket stats for a match (for cleanup)
   */
  async deleteMatchStats(matchId: string): Promise<void> {
    await query('DELETE FROM cricket_ball_details WHERE match_id = $1', [matchId]);
    await query('DELETE FROM cricket_batting_stats WHERE match_id = $1', [matchId]);
    await query('DELETE FROM cricket_bowling_stats WHERE match_id = $1', [matchId]);
  }
}

export const cricketStatsService = new CricketStatsService();
