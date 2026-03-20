import { query } from '../db/postgres';
import { PointsTable, Standing } from '@score-ocean/types';
import { Sport } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';
import redisClient from '../db/redis';

export class PointsService {
  /**
   * Calculate and update points table for a tournament
   * Requirements: 8.1, 8.2, 8.3
   */
  async calculatePointsTable(tournamentId: string): Promise<PointsTable> {
    // Get tournament details
    const tournamentResult = await query('SELECT sport, rules FROM tournaments WHERE id = $1', [
      tournamentId,
    ]);

    if (tournamentResult.rows.length === 0) {
      throw new AppError('Tournament not found', 404);
    }

    const tournament = tournamentResult.rows[0];
    const sport = tournament.sport as Sport;
    const rules = tournament.rules || {};

    // Get all completed matches for this tournament
    const matchesResult = await query(
      `SELECT m.id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.sport_specific_data
       FROM matches m
       WHERE m.tournament_id = $1 AND m.status = 'COMPLETED'`,
      [tournamentId]
    );

    // Get all registered teams
    const teamsResult = await query(
      `SELECT tr.team_id, t.name
       FROM tournament_registrations tr
       JOIN teams t ON tr.team_id = t.id
       WHERE tr.tournament_id = $1 AND tr.status = 'CONFIRMED'`,
      [tournamentId]
    );

    // Initialize standings for all teams
    const standingsMap = new Map<string, Standing>();
    teamsResult.rows.forEach((team) => {
      standingsMap.set(team.team_id, {
        rank: 0,
        teamId: team.team_id,
        teamName: team.name,
        played: 0,
        won: 0,
        lost: 0,
        drawn: 0,
        points: 0,
        tiebreaker: 0,
      });
    });

    // Process each completed match
    for (const match of matchesResult.rows) {
      const homeTeamId = match.home_team_id;
      const awayTeamId = match.away_team_id;
      const homeScore = match.home_score;
      const awayScore = match.away_score;

      const homeStanding = standingsMap.get(homeTeamId);
      const awayStanding = standingsMap.get(awayTeamId);

      if (!homeStanding || !awayStanding) {
        continue; // Skip if team not found
      }

      // Update matches played
      homeStanding.played++;
      awayStanding.played++;

      // Determine result and award points
      const pointsConfig = this.getSportPointsConfig(sport, rules);

      if (homeScore > awayScore) {
        // Home team wins
        homeStanding.won++;
        awayStanding.lost++;
        homeStanding.points += pointsConfig.win;
        awayStanding.points += pointsConfig.loss;
      } else if (homeScore < awayScore) {
        // Away team wins
        awayStanding.won++;
        homeStanding.lost++;
        awayStanding.points += pointsConfig.win;
        homeStanding.points += pointsConfig.loss;
      } else {
        // Draw
        homeStanding.drawn++;
        awayStanding.drawn++;
        homeStanding.points += pointsConfig.draw;
        awayStanding.points += pointsConfig.draw;
      }

      // Calculate tiebreaker (goal/point difference)
      const scoreDifference = homeScore - awayScore;
      homeStanding.tiebreaker += scoreDifference;
      awayStanding.tiebreaker -= scoreDifference;
    }

    // Convert map to array and sort
    const standings = Array.from(standingsMap.values());

    // Calculate additional tiebreakers if needed
    standings.forEach((standing) => {
      // For sports where win percentage is important
      if (standing.played > 0) {
        const winPercentage = standing.won / standing.played;
        // Store win percentage in decimal format for secondary tiebreaker
        // We'll use this in ranking
        (standing as any).winPercentage = winPercentage;
      }
    });

    const pointsTable: PointsTable = {
      tournamentId,
      standings,
      lastUpdated: new Date(),
    };

    return pointsTable;
  }

  /**
   * Get sport-specific points configuration
   * Requirements: 8.2
   */
  private getSportPointsConfig(
    sport: Sport,
    rules: any
  ): { win: number; draw: number; loss: number } {
    // Use custom rules if provided, otherwise use defaults
    const defaultPoints = {
      win: rules.pointsForWin ?? 2,
      draw: rules.pointsForDraw ?? 1,
      loss: rules.pointsForLoss ?? 0,
    };

    // Sport-specific defaults
    switch (sport) {
      case Sport.CRICKET:
        return {
          win: rules.pointsForWin ?? 2,
          draw: rules.pointsForDraw ?? 1,
          loss: rules.pointsForLoss ?? 0,
        };

      case Sport.FOOTBALL:
        return {
          win: rules.pointsForWin ?? 3, // Football typically uses 3 points for win
          draw: rules.pointsForDraw ?? 1,
          loss: rules.pointsForLoss ?? 0,
        };

      case Sport.KABADDI:
        return {
          win: rules.pointsForWin ?? 5, // Kabaddi leagues often use 5 points
          draw: rules.pointsForDraw ?? 3,
          loss: rules.pointsForLoss ?? 0,
        };

      case Sport.VOLLEYBALL:
        return {
          win: rules.pointsForWin ?? 2,
          draw: rules.pointsForDraw ?? 1,
          loss: rules.pointsForLoss ?? 0,
        };

      default:
        return defaultPoints;
    }
  }

  /**
   * Rank teams in the points table
   * Requirements: 8.4, 8.5, 8.6
   * 
   * Ranking algorithm:
   * 1. Sort by points (descending)
   * 2. If points are equal, sort by goal/point difference (descending)
   * 3. If still equal, sort by win percentage (descending)
   * 4. If still equal, sort by wins (descending)
   */
  private rankStandings(standings: Standing[]): Standing[] {
    // Sort standings
    const sorted = standings.sort((a, b) => {
      // Primary: Points (higher is better)
      if (a.points !== b.points) {
        return b.points - a.points;
      }

      // Secondary: Goal/Point difference (higher is better)
      if (a.tiebreaker !== b.tiebreaker) {
        return b.tiebreaker - a.tiebreaker;
      }

      // Tertiary: Win percentage (higher is better)
      const aWinPct = a.played > 0 ? a.won / a.played : 0;
      const bWinPct = b.played > 0 ? b.won / b.played : 0;
      if (aWinPct !== bWinPct) {
        return bWinPct - aWinPct;
      }

      // Quaternary: Total wins (higher is better)
      if (a.won !== b.won) {
        return b.won - a.won;
      }

      // If still equal, maintain current order (stable sort)
      return 0;
    });

    // Assign ranks
    sorted.forEach((standing, index) => {
      standing.rank = index + 1;
    });

    return sorted;
  }

  /**
   * Get points table for a tournament with ranking
   * Requirements: 8.4, 8.5, 8.6
   */
  async getPointsTable(tournamentId: string): Promise<PointsTable> {
    // Try to get from cache first
    const cacheKey = `tournament:${tournamentId}:points`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const pointsTable = JSON.parse(cached) as PointsTable;
        // Convert date string back to Date object
        pointsTable.lastUpdated = new Date(pointsTable.lastUpdated);
        return pointsTable;
      }
    } catch (error) {
      console.error('Redis cache read error:', error);
      // Continue to calculate if cache fails
    }

    // Calculate points table
    const pointsTable = await this.calculatePointsTable(tournamentId);

    // Rank the standings
    pointsTable.standings = this.rankStandings(pointsTable.standings);

    // Cache the result (1 hour TTL)
    try {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(pointsTable));
    } catch (error) {
      console.error('Redis cache write error:', error);
      // Continue even if caching fails
    }

    return pointsTable;
  }

  /**
   * Invalidate points table cache for a tournament
   * Called when a match is completed
   */
  async invalidateCache(tournamentId: string): Promise<void> {
    const cacheKey = `tournament:${tournamentId}:points`;
    
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      console.error('Redis cache invalidation error:', error);
    }
  }

  /**
   * Update points table after match completion
   * Requirements: 8.1, 17.4
   */
  async updatePointsTableForMatch(tournamentId: string): Promise<void> {
    // Invalidate cache
    await this.invalidateCache(tournamentId);

    // Recalculate and cache
    await this.getPointsTable(tournamentId);
  }
}

export const pointsService = new PointsService();
