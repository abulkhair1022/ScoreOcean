import { query } from '../db/postgres';
import {
  PlayerPerformance,
  Sport,
  SportStats,
  CricketStats,
  FootballStats,
  KabaddiStats,
  VolleyballStats,
} from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';

/**
 * Performance Service
 * Handles recording and managing player performance data
 * Requirements: 2.5, 17.3
 */
export class PerformanceService {
  /**
   * Record player performance for a match
   * This is called during match finalization
   * Requirements: 2.5, 17.3
   */
  async recordPerformance(
    matchId: string,
    playerId: string,
    teamId: string,
    statistics: SportStats
  ): Promise<PlayerPerformance> {
    // Validate that the match exists
    const matchResult = await query('SELECT id, sport FROM matches WHERE id = $1', [matchId]);

    if (matchResult.rows.length === 0) {
      throw new AppError('Match not found', 404);
    }

    const sport = matchResult.rows[0].sport;

    // Validate statistics match the sport
    this.validateStatistics(sport, statistics);

    // Check if performance already exists
    const existingResult = await query(
      'SELECT id FROM player_performances WHERE match_id = $1 AND player_id = $2',
      [matchId, playerId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing performance
      await query(
        `UPDATE player_performances 
         SET statistics = $1, team_id = $2
         WHERE match_id = $3 AND player_id = $4`,
        [JSON.stringify(statistics), teamId, matchId, playerId]
      );
    } else {
      // Insert new performance
      await query(
        `INSERT INTO player_performances (match_id, player_id, team_id, statistics)
         VALUES ($1, $2, $3, $4)`,
        [matchId, playerId, teamId, JSON.stringify(statistics)]
      );
    }

    // Update sport profile statistics
    await this.updateSportProfileStatistics(playerId, sport, statistics);

    return {
      playerId,
      teamId,
      statistics,
    };
  }

  /**
   * Record multiple player performances for a match
   */
  async recordBatchPerformances(
    matchId: string,
    performances: Array<{ playerId: string; teamId: string; statistics: SportStats }>
  ): Promise<PlayerPerformance[]> {
    const results: PlayerPerformance[] = [];

    for (const perf of performances) {
      const result = await this.recordPerformance(
        matchId,
        perf.playerId,
        perf.teamId,
        perf.statistics
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Get player performances for a match
   */
  async getMatchPerformances(matchId: string): Promise<PlayerPerformance[]> {
    const result = await query(
      'SELECT player_id, team_id, statistics FROM player_performances WHERE match_id = $1',
      [matchId]
    );

    return result.rows.map((row) => ({
      playerId: row.player_id,
      teamId: row.team_id,
      statistics: row.statistics,
    }));
  }

  /**
   * Get player performances for a player
   */
  async getPlayerPerformances(playerId: string): Promise<PlayerPerformance[]> {
    const result = await query(
      'SELECT player_id, team_id, statistics FROM player_performances WHERE player_id = $1',
      [playerId]
    );

    return result.rows.map((row) => ({
      playerId: row.player_id,
      teamId: row.team_id,
      statistics: row.statistics,
    }));
  }

  /**
   * Update sport profile statistics after recording performance
   * Requirements: 2.5
   */
  private async updateSportProfileStatistics(
    playerId: string,
    sport: Sport,
    newStats: SportStats
  ): Promise<void> {
    // Get existing sport profile
    const sportProfileResult = await query(
      'SELECT id, statistics FROM sport_profiles WHERE user_id = $1 AND sport = $2',
      [playerId, sport]
    );

    if (sportProfileResult.rows.length === 0) {
      // Create new sport profile with initial statistics
      await query(
        'INSERT INTO sport_profiles (user_id, sport, statistics) VALUES ($1, $2, $3)',
        [playerId, sport, JSON.stringify(newStats)]
      );
    } else {
      // Update existing sport profile by aggregating statistics
      const sportProfile = sportProfileResult.rows[0];
      const currentStats = sportProfile.statistics;

      const aggregatedStats = this.aggregateStatistics(currentStats, newStats, sport);

      await query('UPDATE sport_profiles SET statistics = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
        JSON.stringify(aggregatedStats),
        sportProfile.id,
      ]);
    }
  }

  /**
   * Aggregate statistics by adding new performance to existing totals
   */
  private aggregateStatistics(
    currentStats: SportStats,
    newStats: SportStats,
    sport: Sport
  ): SportStats {
    // Initialize if empty
    if (!currentStats || Object.keys(currentStats).length === 0) {
      currentStats = this.getDefaultStatistics(sport);
    }

    switch (sport) {
      case Sport.CRICKET: {
        const current = currentStats as CricketStats;
        const newStat = newStats as CricketStats;
        return {
          runs: (current.runs || 0) + (newStat.runs || 0),
          wickets: (current.wickets || 0) + (newStat.wickets || 0),
          battingAverage: this.calculateBattingAverage(
            (current.runs || 0) + (newStat.runs || 0),
            (current.wickets || 0) + (newStat.wickets || 0)
          ),
          bowlingAverage: this.calculateBowlingAverage(
            (current.runs || 0) + (newStat.runs || 0),
            (current.wickets || 0) + (newStat.wickets || 0)
          ),
          strikeRate: this.calculateStrikeRate(
            (current.runs || 0) + (newStat.runs || 0),
            (current.wickets || 0) + (newStat.wickets || 0)
          ),
        } as CricketStats;
      }

      case Sport.FOOTBALL: {
        const current = currentStats as FootballStats;
        const newStat = newStats as FootballStats;
        return {
          goals: (current.goals || 0) + (newStat.goals || 0),
          assists: (current.assists || 0) + (newStat.assists || 0),
          cleanSheets: (current.cleanSheets || 0) + (newStat.cleanSheets || 0),
          saves: (current.saves || 0) + (newStat.saves || 0),
          yellowCards: (current.yellowCards || 0) + (newStat.yellowCards || 0),
          redCards: (current.redCards || 0) + (newStat.redCards || 0),
        } as FootballStats;
      }

      case Sport.KABADDI: {
        const current = currentStats as KabaddiStats;
        const newStat = newStats as KabaddiStats;
        return {
          raidPoints: (current.raidPoints || 0) + (newStat.raidPoints || 0),
          tacklePoints: (current.tacklePoints || 0) + (newStat.tacklePoints || 0),
          superRaids: (current.superRaids || 0) + (newStat.superRaids || 0),
          superTackles: (current.superTackles || 0) + (newStat.superTackles || 0),
        } as KabaddiStats;
      }

      case Sport.VOLLEYBALL: {
        const current = currentStats as VolleyballStats;
        const newStat = newStats as VolleyballStats;
        return {
          spikes: (current.spikes || 0) + (newStat.spikes || 0),
          blocks: (current.blocks || 0) + (newStat.blocks || 0),
          serves: (current.serves || 0) + (newStat.serves || 0),
          digs: (current.digs || 0) + (newStat.digs || 0),
          aces: (current.aces || 0) + (newStat.aces || 0),
        } as VolleyballStats;
      }

      default:
        throw new AppError(`Unsupported sport: ${sport}`, 400);
    }
  }

  /**
   * Get default statistics structure for a sport
   */
  private getDefaultStatistics(sport: Sport): SportStats {
    switch (sport) {
      case Sport.CRICKET:
        return {
          runs: 0,
          wickets: 0,
          battingAverage: 0,
          bowlingAverage: 0,
          strikeRate: 0,
        } as CricketStats;

      case Sport.FOOTBALL:
        return {
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          saves: 0,
          yellowCards: 0,
          redCards: 0,
        } as FootballStats;

      case Sport.KABADDI:
        return {
          raidPoints: 0,
          tacklePoints: 0,
          superRaids: 0,
          superTackles: 0,
        } as KabaddiStats;

      case Sport.VOLLEYBALL:
        return {
          spikes: 0,
          blocks: 0,
          serves: 0,
          digs: 0,
          aces: 0,
        } as VolleyballStats;

      default:
        throw new AppError(`Unsupported sport: ${sport}`, 400);
    }
  }

  /**
   * Validate statistics match the sport type
   */
  private validateStatistics(sport: Sport, statistics: SportStats): void {
    switch (sport) {
      case Sport.CRICKET:
        this.validateCricketStats(statistics as CricketStats);
        break;
      case Sport.FOOTBALL:
        this.validateFootballStats(statistics as FootballStats);
        break;
      case Sport.KABADDI:
        this.validateKabaddiStats(statistics as KabaddiStats);
        break;
      case Sport.VOLLEYBALL:
        this.validateVolleyballStats(statistics as VolleyballStats);
        break;
      default:
        throw new AppError(`Unsupported sport: ${sport}`, 400);
    }
  }

  private validateCricketStats(stats: CricketStats): void {
    if (stats.runs < 0) throw new AppError('Runs cannot be negative', 400);
    if (stats.wickets < 0) throw new AppError('Wickets cannot be negative', 400);
    if (stats.battingAverage < 0) throw new AppError('Batting average cannot be negative', 400);
    if (stats.bowlingAverage < 0) throw new AppError('Bowling average cannot be negative', 400);
    if (stats.strikeRate < 0) throw new AppError('Strike rate cannot be negative', 400);
  }

  private validateFootballStats(stats: FootballStats): void {
    if (stats.goals < 0) throw new AppError('Goals cannot be negative', 400);
    if (stats.assists < 0) throw new AppError('Assists cannot be negative', 400);
    if (stats.cleanSheets < 0) throw new AppError('Clean sheets cannot be negative', 400);
    if (stats.saves < 0) throw new AppError('Saves cannot be negative', 400);
    if (stats.yellowCards < 0) throw new AppError('Yellow cards cannot be negative', 400);
    if (stats.redCards < 0) throw new AppError('Red cards cannot be negative', 400);
  }

  private validateKabaddiStats(stats: KabaddiStats): void {
    if (stats.raidPoints < 0) throw new AppError('Raid points cannot be negative', 400);
    if (stats.tacklePoints < 0) throw new AppError('Tackle points cannot be negative', 400);
    if (stats.superRaids < 0) throw new AppError('Super raids cannot be negative', 400);
    if (stats.superTackles < 0) throw new AppError('Super tackles cannot be negative', 400);
  }

  private validateVolleyballStats(stats: VolleyballStats): void {
    if (stats.spikes < 0) throw new AppError('Spikes cannot be negative', 400);
    if (stats.blocks < 0) throw new AppError('Blocks cannot be negative', 400);
    if (stats.serves < 0) throw new AppError('Serves cannot be negative', 400);
    if (stats.digs < 0) throw new AppError('Digs cannot be negative', 400);
    if (stats.aces < 0) throw new AppError('Aces cannot be negative', 400);
  }

  // Cricket-specific calculations
  private calculateBattingAverage(runs: number, wickets: number): number {
    if (wickets === 0) return runs;
    return parseFloat((runs / wickets).toFixed(2));
  }

  private calculateBowlingAverage(runs: number, wickets: number): number {
    if (wickets === 0) return 0;
    return parseFloat((runs / wickets).toFixed(2));
  }

  private calculateStrikeRate(runs: number, balls: number): number {
    if (balls === 0) return 0;
    return parseFloat(((runs / balls) * 100).toFixed(2));
  }
}

export const performanceService = new PerformanceService();
