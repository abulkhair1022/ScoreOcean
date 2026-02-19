import { query } from '../db/postgres';
import {
  Match,
  MatchStatus,
  ScoreUpdate,
  PlayerPerformance,
  Sport,
  CricketScore,
  FootballScore,
  KabaddiScore,
  VolleyballScore,
  SportScore,
} from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';
import { websocketService } from './websocket.service';
import { pointsService } from './points.service';

export class MatchService {
  /**
   * Create a match from a fixture
   * Requirements: 7.1, 13.5
   */
  async createMatch(fixtureId: string): Promise<Match> {
    // Get fixture details
    const fixtureResult = await query('SELECT * FROM fixtures WHERE id = $1', [fixtureId]);

    if (fixtureResult.rows.length === 0) {
      throw new AppError('Fixture not found', 404);
    }

    const fixture = fixtureResult.rows[0];

    // Check if match already exists for this fixture
    const existingMatch = await query('SELECT id FROM matches WHERE fixture_id = $1', [fixtureId]);

    if (existingMatch.rows.length > 0) {
      throw new AppError('Match already exists for this fixture', 400);
    }

    // Get tournament to determine sport
    const tournamentResult = await query('SELECT sport FROM tournaments WHERE id = $1', [
      fixture.tournament_id,
    ]);

    if (tournamentResult.rows.length === 0) {
      throw new AppError('Tournament not found', 404);
    }

    const sport = tournamentResult.rows[0].sport;

    // Initialize sport-specific score data
    const sportSpecificData = this.initializeSportScore(sport);

    // Create match
    const result = await query(
      `INSERT INTO matches (
        fixture_id, tournament_id, home_team_id, away_team_id,
        sport, status, home_score, away_score, sport_specific_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        fixtureId,
        fixture.tournament_id,
        fixture.home_team_id,
        fixture.away_team_id,
        sport,
        MatchStatus.SCHEDULED,
        0,
        0,
        JSON.stringify(sportSpecificData),
      ]
    );

    const matchRow = result.rows[0];

    // Update fixture with match_id
    await query('UPDATE fixtures SET match_id = $1 WHERE id = $2', [matchRow.id, fixtureId]);

    return this.mapRowToMatch(matchRow);
  }

  /**
   * Get match by ID
   * Requirements: 7.1
   */
  async getMatch(matchId: string): Promise<Match> {
    const result = await query('SELECT * FROM matches WHERE id = $1', [matchId]);

    if (result.rows.length === 0) {
      throw new AppError('Match not found', 404);
    }

    return this.mapRowToMatch(result.rows[0]);
  }

  /**
   * Get matches for a tournament
   */
  async getTournamentMatches(tournamentId: string): Promise<Match[]> {
    const result = await query(
      'SELECT * FROM matches WHERE tournament_id = $1 ORDER BY created_at ASC',
      [tournamentId]
    );

    return Promise.all(result.rows.map((row) => this.mapRowToMatch(row)));
  }

  /**
   * Get matches for a team
   */
  async getTeamMatches(teamId: string): Promise<Match[]> {
    const result = await query(
      `SELECT * FROM matches 
       WHERE home_team_id = $1 OR away_team_id = $1 
       ORDER BY created_at DESC`,
      [teamId]
    );

    return Promise.all(result.rows.map((row) => this.mapRowToMatch(row)));
  }

  /**
   * Initialize sport-specific score structure
   */
  private initializeSportScore(sport: Sport): SportScore {
    switch (sport) {
      case Sport.CRICKET:
        return {
          runs: 0,
          wickets: 0,
          overs: 0,
          runRate: 0,
        } as CricketScore;

      case Sport.FOOTBALL:
        return {
          goals: 0,
          yellowCards: 0,
          redCards: 0,
        } as FootballScore;

      case Sport.KABADDI:
        return {
          points: 0,
          allOuts: 0,
        } as KabaddiScore;

      case Sport.VOLLEYBALL:
        return {
          sets: 0,
          points: 0,
        } as VolleyballScore;

      default:
        throw new AppError(`Unsupported sport: ${sport}`, 400);
    }
  }

  /**
   * Update match score
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async updateScore(
    matchId: string,
    scoreUpdate: Omit<ScoreUpdate, 'timestamp'>,
    userId: string
  ): Promise<Match> {
    // Get match
    const match = await this.getMatch(matchId);

    // Check if match is in progress or scheduled (can update score)
    if (match.status === MatchStatus.COMPLETED) {
      throw new AppError('Cannot update score for completed match', 400);
    }

    if (match.status === MatchStatus.CANCELLED) {
      throw new AppError('Cannot update score for cancelled match', 400);
    }

    // Validate sport-specific score data
    this.validateSportScore(match.sport, scoreUpdate.sportSpecificData);

    // If match is scheduled, change status to in progress
    if (match.status === MatchStatus.SCHEDULED) {
      await query(
        'UPDATE matches SET status = $1, start_time = CURRENT_TIMESTAMP WHERE id = $2',
        [MatchStatus.IN_PROGRESS, matchId]
      );
    }

    // Update match score
    await query(
      `UPDATE matches 
       SET home_score = $1, away_score = $2, sport_specific_data = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        scoreUpdate.homeScore,
        scoreUpdate.awayScore,
        JSON.stringify(scoreUpdate.sportSpecificData),
        matchId,
      ]
    );

    // Store score update in history
    await query(
      `INSERT INTO score_history (match_id, home_score, away_score, sport_specific_data, updated_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        matchId,
        scoreUpdate.homeScore,
        scoreUpdate.awayScore,
        JSON.stringify(scoreUpdate.sportSpecificData),
        userId,
      ]
    );

    // Get updated match
    const updatedMatch = await this.getMatch(matchId);

    // Broadcast score update to all connected clients
    // Requirements: 7.4
    await websocketService.publishScoreUpdate(matchId, 'score:update', {
      matchId,
      score: updatedMatch.score,
      status: updatedMatch.status,
      timestamp: new Date().toISOString(),
    });

    // Return updated match
    return updatedMatch;
  }

  /**
   * Validate sport-specific score data
   * Requirements: 7.2
   */
  private validateSportScore(sport: Sport, sportScore: SportScore): void {
    switch (sport) {
      case Sport.CRICKET:
        this.validateCricketScore(sportScore as CricketScore);
        break;

      case Sport.FOOTBALL:
        this.validateFootballScore(sportScore as FootballScore);
        break;

      case Sport.KABADDI:
        this.validateKabaddiScore(sportScore as KabaddiScore);
        break;

      case Sport.VOLLEYBALL:
        this.validateVolleyballScore(sportScore as VolleyballScore);
        break;

      default:
        throw new AppError(`Unsupported sport: ${sport}`, 400);
    }
  }

  /**
   * Validate cricket score
   */
  private validateCricketScore(score: CricketScore): void {
    if (score.runs < 0) {
      throw new AppError('Runs cannot be negative', 400);
    }

    if (score.wickets < 0 || score.wickets > 10) {
      throw new AppError('Wickets must be between 0 and 10', 400);
    }

    if (score.overs < 0) {
      throw new AppError('Overs cannot be negative', 400);
    }

    if (score.runRate < 0) {
      throw new AppError('Run rate cannot be negative', 400);
    }

    // Validate run rate calculation
    if (score.overs > 0) {
      const expectedRunRate = score.runs / score.overs;
      if (Math.abs(score.runRate - expectedRunRate) > 0.1) {
        throw new AppError('Run rate does not match runs and overs', 400);
      }
    }
  }

  /**
   * Validate football score
   */
  private validateFootballScore(score: FootballScore): void {
    if (score.goals < 0) {
      throw new AppError('Goals cannot be negative', 400);
    }

    if (score.yellowCards < 0) {
      throw new AppError('Yellow cards cannot be negative', 400);
    }

    if (score.redCards < 0) {
      throw new AppError('Red cards cannot be negative', 400);
    }

    // A team can have maximum 11 red cards (all players sent off)
    if (score.redCards > 11) {
      throw new AppError('Red cards cannot exceed 11', 400);
    }
  }

  /**
   * Validate kabaddi score
   */
  private validateKabaddiScore(score: KabaddiScore): void {
    if (score.points < 0) {
      throw new AppError('Points cannot be negative', 400);
    }

    if (score.allOuts < 0) {
      throw new AppError('All outs cannot be negative', 400);
    }
  }

  /**
   * Validate volleyball score
   */
  private validateVolleyballScore(score: VolleyballScore): void {
    if (score.sets < 0) {
      throw new AppError('Sets cannot be negative', 400);
    }

    if (score.points < 0) {
      throw new AppError('Points cannot be negative', 400);
    }

    // Volleyball typically has maximum 5 sets
    if (score.sets > 5) {
      throw new AppError('Sets cannot exceed 5', 400);
    }
  }

  /**
   * Finalize match
   * Requirements: 7.6, 17.1, 17.2, 17.3, 17.4, 17.5
   */
  async finalizeMatch(matchId: string): Promise<Match> {
    // Get match
    const match = await this.getMatch(matchId);

    // Check if match is already completed
    if (match.status === MatchStatus.COMPLETED) {
      throw new AppError('Match is already completed', 400);
    }

    // Check if match is in progress
    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new AppError('Can only finalize matches that are in progress', 400);
    }

    // Start transaction
    await query('BEGIN', []);

    try {
      // Update match status to completed
      await query(
        `UPDATE matches 
         SET status = $1, end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [MatchStatus.COMPLETED, matchId]
      );

      // Update fixture status
      await query(
        'UPDATE fixtures SET status = $1 WHERE match_id = $2',
        [MatchStatus.COMPLETED, matchId]
      );

      // Update player statistics
      await this.updatePlayerStatistics(matchId);

      // Update points table using the points service
      await pointsService.updatePointsTableForMatch(match.tournamentId);

      // Send result notifications
      await this.sendResultNotificationsForMatch(match);

      // Commit transaction
      await query('COMMIT', []);

      // Get final match state
      const finalMatch = await this.getMatch(matchId);

      // Broadcast match completion to all connected clients
      await websocketService.publishScoreUpdate(matchId, 'match:completed', {
        matchId,
        score: finalMatch.score,
        status: finalMatch.status,
        endTime: finalMatch.endTime,
        timestamp: new Date().toISOString(),
      });

      return finalMatch;
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  }

  /**
   * Update player statistics after match completion
   * Requirements: 17.3
   */
  private async updatePlayerStatistics(matchId: string): Promise<void> {
    // Get match
    const match = await this.getMatch(matchId);

    // Get all player performances for this match
    const performances = match.playerPerformances;

    // Update each player's sport profile statistics
    for (const performance of performances) {
      // Get player's sport profile
      const sportProfileResult = await query(
        'SELECT id, statistics FROM sport_profiles WHERE user_id = $1 AND sport = $2',
        [performance.playerId, match.sport]
      );

      if (sportProfileResult.rows.length === 0) {
        // Create sport profile if it doesn't exist
        await query(
          'INSERT INTO sport_profiles (user_id, sport, statistics) VALUES ($1, $2, $3)',
          [performance.playerId, match.sport, JSON.stringify(performance.statistics)]
        );
      } else {
        // Update existing sport profile
        const sportProfile = sportProfileResult.rows[0];
        const currentStats = sportProfile.statistics;

        // Aggregate statistics (this is simplified - in production would be more sophisticated)
        const updatedStats = this.aggregateStatistics(
          currentStats,
          performance.statistics,
          match.sport
        );

        await query('UPDATE sport_profiles SET statistics = $1 WHERE id = $2', [
          JSON.stringify(updatedStats),
          sportProfile.id,
        ]);
      }
    }
  }

  /**
   * Aggregate player statistics
   */
  private aggregateStatistics(currentStats: any, newStats: any, sport: Sport): any {
    // Initialize if empty
    if (!currentStats || Object.keys(currentStats).length === 0) {
      currentStats = this.getDefaultStatistics(sport);
    }

    // Add match count
    currentStats.matchesPlayed = (currentStats.matchesPlayed || 0) + 1;

    // Aggregate sport-specific statistics
    switch (sport) {
      case Sport.CRICKET:
        currentStats.runs = (currentStats.runs || 0) + (newStats.runs || 0);
        currentStats.wickets = (currentStats.wickets || 0) + (newStats.wickets || 0);
        currentStats.catches = (currentStats.catches || 0) + (newStats.catches || 0);
        break;

      case Sport.FOOTBALL:
        currentStats.goals = (currentStats.goals || 0) + (newStats.goals || 0);
        currentStats.assists = (currentStats.assists || 0) + (newStats.assists || 0);
        currentStats.yellowCards = (currentStats.yellowCards || 0) + (newStats.yellowCards || 0);
        currentStats.redCards = (currentStats.redCards || 0) + (newStats.redCards || 0);
        break;

      case Sport.KABADDI:
        currentStats.raidPoints = (currentStats.raidPoints || 0) + (newStats.raidPoints || 0);
        currentStats.tacklePoints = (currentStats.tacklePoints || 0) + (newStats.tacklePoints || 0);
        break;

      case Sport.VOLLEYBALL:
        currentStats.spikes = (currentStats.spikes || 0) + (newStats.spikes || 0);
        currentStats.blocks = (currentStats.blocks || 0) + (newStats.blocks || 0);
        currentStats.serves = (currentStats.serves || 0) + (newStats.serves || 0);
        break;
    }

    return currentStats;
  }

  /**
   * Get default statistics structure for a sport
   */
  private getDefaultStatistics(sport: Sport): any {
    switch (sport) {
      case Sport.CRICKET:
        return { matchesPlayed: 0, runs: 0, wickets: 0, catches: 0 };
      case Sport.FOOTBALL:
        return { matchesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
      case Sport.KABADDI:
        return { matchesPlayed: 0, raidPoints: 0, tacklePoints: 0 };
      case Sport.VOLLEYBALL:
        return { matchesPlayed: 0, spikes: 0, blocks: 0, serves: 0 };
      default:
        return { matchesPlayed: 0 };
    }
  }

  /**
   * Send result notifications to both teams
   * Requirements: 17.5
   */
  private async sendResultNotificationsForMatch(match: Match): Promise<void> {
    // Get team details
    const homeTeamResult = await query('SELECT name, host_id FROM teams WHERE id = $1', [
      match.homeTeamId,
    ]);
    const awayTeamResult = await query('SELECT name, host_id FROM teams WHERE id = $1', [
      match.awayTeamId,
    ]);

    if (homeTeamResult.rows.length === 0 || awayTeamResult.rows.length === 0) {
      return;
    }

    const homeTeam = homeTeamResult.rows[0];
    const awayTeam = awayTeamResult.rows[0];

    // Determine result message
    let resultMessage: string;
    if (match.score.homeScore > match.score.awayScore) {
      resultMessage = `${homeTeam.name} won against ${awayTeam.name} (${match.score.homeScore}-${match.score.awayScore})`;
    } else if (match.score.homeScore < match.score.awayScore) {
      resultMessage = `${awayTeam.name} won against ${homeTeam.name} (${match.score.awayScore}-${match.score.homeScore})`;
    } else {
      resultMessage = `Match ended in a draw between ${homeTeam.name} and ${awayTeam.name} (${match.score.homeScore}-${match.score.awayScore})`;
    }

    // Send notification to home team host
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        homeTeam.host_id,
        'SCORE_UPDATE',
        'Match Result',
        resultMessage,
        ['IN_APP', 'EMAIL'],
        JSON.stringify({ matchId: match.id, tournamentId: match.tournamentId }),
      ]
    );

    // Send notification to away team host
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        awayTeam.host_id,
        'SCORE_UPDATE',
        'Match Result',
        resultMessage,
        ['IN_APP', 'EMAIL'],
        JSON.stringify({ matchId: match.id, tournamentId: match.tournamentId }),
      ]
    );

    // Send notifications to all players in both teams
    const homePlayersResult = await query(
      'SELECT player_id FROM team_rosters WHERE team_id = $1',
      [match.homeTeamId]
    );

    const awayPlayersResult = await query(
      'SELECT player_id FROM team_rosters WHERE team_id = $1',
      [match.awayTeamId]
    );

    // Notify home team players
    for (const player of homePlayersResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          player.player_id,
          'SCORE_UPDATE',
          'Match Result',
          resultMessage,
          ['IN_APP'],
          JSON.stringify({ matchId: match.id, tournamentId: match.tournamentId }),
        ]
      );
    }

    // Notify away team players
    for (const player of awayPlayersResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          player.player_id,
          'SCORE_UPDATE',
          'Match Result',
          resultMessage,
          ['IN_APP'],
          JSON.stringify({ matchId: match.id, tournamentId: match.tournamentId }),
        ]
      );
    }
  }

  /**
   * Map database row to Match object
   */
  private async mapRowToMatch(row: any): Promise<Match> {
    // Get score history
    const historyResult = await query(
      'SELECT * FROM score_history WHERE match_id = $1 ORDER BY timestamp ASC',
      [row.id]
    );

    const scoreHistory: ScoreUpdate[] = historyResult.rows.map((h) => ({
      timestamp: h.timestamp,
      homeScore: h.home_score,
      awayScore: h.away_score,
      sportSpecificData: h.sport_specific_data,
      updatedBy: h.updated_by,
    }));

    // Get player performances
    const performancesResult = await query(
      'SELECT * FROM player_performances WHERE match_id = $1',
      [row.id]
    );

    const playerPerformances: PlayerPerformance[] = performancesResult.rows.map((p) => ({
      playerId: p.player_id,
      teamId: p.team_id,
      statistics: p.statistics,
    }));

    return {
      id: row.id,
      fixtureId: row.fixture_id,
      tournamentId: row.tournament_id,
      homeTeamId: row.home_team_id,
      awayTeamId: row.away_team_id,
      sport: row.sport as Sport,
      status: row.status as MatchStatus,
      score: {
        homeScore: row.home_score,
        awayScore: row.away_score,
        sportSpecificData: row.sport_specific_data,
      },
      playerPerformances,
      startTime: row.start_time,
      endTime: row.end_time,
      scoreHistory,
    };
  }
}

export const matchService = new MatchService();
