import { query } from '../db/postgres';
import { AppError } from '../middleware/errorHandler';

export interface MatchChallenge {
  id: string;
  challengerTeamId: string;
  opponentTeamId: string;
  sport: string;
  proposedDate?: Date;
  venue?: string;
  status: ChallengeStatus;
  matchId?: string;
  createdBy: string;
  createdAt: Date;
  respondedAt?: Date;
  respondedBy?: string;
  notes?: string;
}

export enum ChallengeStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export interface CreateChallengeInput {
  challengerTeamId: string;
  opponentTeamId: string;
  sport: string;
  proposedDate?: string;
  venue?: string;
  notes?: string;
}

export class MatchChallengeService {
  /**
   * Create a match challenge
   */
  async createChallenge(
    userId: string,
    input: CreateChallengeInput
  ): Promise<MatchChallenge> {
    const { challengerTeamId, opponentTeamId, sport, proposedDate, venue, notes } = input;

    // Validate teams exist
    const teamsResult = await query(
      'SELECT id, name, host_id, sport FROM teams WHERE id = ANY($1)',
      [[challengerTeamId, opponentTeamId]]
    );

    if (teamsResult.rows.length !== 2) {
      throw new AppError('One or both teams not found', 404);
    }

    const challengerTeam = teamsResult.rows.find((t) => t.id === challengerTeamId);
    const opponentTeam = teamsResult.rows.find((t) => t.id === opponentTeamId);

    // Verify user is the host of challenger team
    if (challengerTeam.host_id !== userId) {
      throw new AppError('You must be the host of the challenging team', 403);
    }

    // Verify both teams play the same sport
    if (challengerTeam.sport !== sport || opponentTeam.sport !== sport) {
      throw new AppError(`Both teams must play ${sport}`, 400);
    }

    // Validate proposed date is in the future
    if (proposedDate) {
      const proposedDateTime = new Date(proposedDate);
      if (proposedDateTime <= new Date()) {
        throw new AppError('Proposed date must be in the future', 400);
      }
    }

    // Check for existing pending challenge between these teams
    const existingResult = await query(
      `SELECT id FROM match_challenges 
       WHERE ((challenger_team_id = $1 AND opponent_team_id = $2) 
           OR (challenger_team_id = $2 AND opponent_team_id = $1))
       AND status = 'PENDING'`,
      [challengerTeamId, opponentTeamId]
    );

    if (existingResult.rows.length > 0) {
      throw new AppError('A pending challenge already exists between these teams', 400);
    }

    // Create challenge
    const result = await query(
      `INSERT INTO match_challenges 
       (challenger_team_id, opponent_team_id, sport, proposed_date, venue, created_by, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [challengerTeamId, opponentTeamId, sport, proposedDate || null, venue || null, userId, notes || null, ChallengeStatus.PENDING]
    );

    const challenge = result.rows[0];

    // Send notification to opponent team host
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        opponentTeam.host_id,
        'MATCH_CHALLENGE',
        'New Match Challenge!',
        `${challengerTeam.name} has challenged your team "${opponentTeam.name}" to a ${sport} match`,
        ['IN_APP', 'EMAIL'],
        JSON.stringify({
          challengeId: challenge.id,
          challengerTeamId,
          challengerTeamName: challengerTeam.name,
          opponentTeamId,
          opponentTeamName: opponentTeam.name,
          sport,
          proposedDate,
          venue,
        }),
      ]
    );

    return this.mapChallenge(challenge);
  }

  /**
   * Get challenges received by user's teams
   */
  async getReceivedChallenges(userId: string): Promise<MatchChallenge[]> {
    const result = await query(
      `SELECT mc.*, 
              ct.name as challenger_team_name,
              ot.name as opponent_team_name,
              u.name as created_by_name
       FROM match_challenges mc
       JOIN teams ct ON mc.challenger_team_id = ct.id
       JOIN teams ot ON mc.opponent_team_id = ot.id
       LEFT JOIN user_profiles u ON mc.created_by = u.user_id
       WHERE ot.host_id = $1
       ORDER BY mc.created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      ...this.mapChallenge(row),
      challengerTeamName: row.challenger_team_name,
      opponentTeamName: row.opponent_team_name,
      createdByName: row.created_by_name,
    }));
  }

  /**
   * Get challenges sent by user's teams
   */
  async getSentChallenges(userId: string): Promise<MatchChallenge[]> {
    const result = await query(
      `SELECT mc.*, 
              ct.name as challenger_team_name,
              ot.name as opponent_team_name,
              u.name as responded_by_name
       FROM match_challenges mc
       JOIN teams ct ON mc.challenger_team_id = ct.id
       JOIN teams ot ON mc.opponent_team_id = ot.id
       LEFT JOIN user_profiles u ON mc.responded_by = u.user_id
       WHERE ct.host_id = $1
       ORDER BY mc.created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      ...this.mapChallenge(row),
      challengerTeamName: row.challenger_team_name,
      opponentTeamName: row.opponent_team_name,
      respondedByName: row.responded_by_name,
    }));
  }

  /**
   * Accept a match challenge
   */
  async acceptChallenge(userId: string, challengeId: string): Promise<any> {
    // Get challenge details
    const challengeResult = await query(
      `SELECT mc.*, 
              ct.name as challenger_team_name, ct.sport as challenger_sport,
              ot.name as opponent_team_name, ot.host_id as opponent_host_id
       FROM match_challenges mc
       JOIN teams ct ON mc.challenger_team_id = ct.id
       JOIN teams ot ON mc.opponent_team_id = ot.id
       WHERE mc.id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new AppError('Challenge not found', 404);
    }

    const challenge = challengeResult.rows[0];

    // Verify user is the host of opponent team
    if (challenge.opponent_host_id !== userId) {
      throw new AppError('Only the opponent team host can accept this challenge', 403);
    }

    // Verify challenge is still pending
    if (challenge.status !== ChallengeStatus.PENDING) {
      throw new AppError(`Challenge is already ${challenge.status.toLowerCase()}`, 400);
    }

    await query('BEGIN', []);

    try {
      // Create match
      const matchResult = await query(
        `INSERT INTO matches 
         (sport, home_team_id, away_team_id, start_time, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          challenge.sport,
          challenge.challenger_team_id,
          challenge.opponent_team_id,
          challenge.proposed_date || new Date(),
          'SCHEDULED',
        ]
      );

      const match = matchResult.rows[0];

      // Update challenge status
      await query(
        `UPDATE match_challenges 
         SET status = $1, match_id = $2, responded_at = CURRENT_TIMESTAMP, responded_by = $3
         WHERE id = $4`,
        [ChallengeStatus.ACCEPTED, match.id, userId, challengeId]
      );

      // Send notification to challenger
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          challenge.created_by,
          'MATCH_CHALLENGE_ACCEPTED',
          'Challenge Accepted!',
          `${challenge.opponent_team_name} accepted your match challenge`,
          ['IN_APP', 'EMAIL'],
          JSON.stringify({
            challengeId,
            matchId: match.id,
            opponentTeamName: challenge.opponent_team_name,
            sport: challenge.sport,
            scheduledDate: match.start_time,
            venue: challenge.venue,
          }),
        ]
      );

      await query('COMMIT', []);

      return {
        challenge: this.mapChallenge(challenge),
        match,
      };
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  }

  /**
   * Decline a match challenge
   */
  async declineChallenge(userId: string, challengeId: string): Promise<void> {
    // Get challenge details
    const challengeResult = await query(
      `SELECT mc.*, 
              ct.name as challenger_team_name,
              ot.name as opponent_team_name, ot.host_id as opponent_host_id
       FROM match_challenges mc
       JOIN teams ct ON mc.challenger_team_id = ct.id
       JOIN teams ot ON mc.opponent_team_id = ot.id
       WHERE mc.id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new AppError('Challenge not found', 404);
    }

    const challenge = challengeResult.rows[0];

    // Verify user is the host of opponent team
    if (challenge.opponent_host_id !== userId) {
      throw new AppError('Only the opponent team host can decline this challenge', 403);
    }

    // Verify challenge is still pending
    if (challenge.status !== ChallengeStatus.PENDING) {
      throw new AppError(`Challenge is already ${challenge.status.toLowerCase()}`, 400);
    }

    // Update challenge status
    await query(
      `UPDATE match_challenges 
       SET status = $1, responded_at = CURRENT_TIMESTAMP, responded_by = $2
       WHERE id = $3`,
      [ChallengeStatus.DECLINED, userId, challengeId]
    );

    // Send notification to challenger
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        challenge.created_by,
        'MATCH_CHALLENGE_DECLINED',
        'Challenge Declined',
        `${challenge.opponent_team_name} declined your match challenge`,
        ['IN_APP', 'EMAIL'],
        JSON.stringify({
          challengeId,
          opponentTeamName: challenge.opponent_team_name,
          sport: challenge.sport,
        }),
      ]
    );
  }

  /**
   * Cancel a match challenge (by challenger)
   */
  async cancelChallenge(userId: string, challengeId: string): Promise<void> {
    // Get challenge details
    const challengeResult = await query(
      `SELECT mc.*, 
              ct.host_id as challenger_host_id,
              ot.name as opponent_team_name, ot.host_id as opponent_host_id
       FROM match_challenges mc
       JOIN teams ct ON mc.challenger_team_id = ct.id
       JOIN teams ot ON mc.opponent_team_id = ot.id
       WHERE mc.id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) {
      throw new AppError('Challenge not found', 404);
    }

    const challenge = challengeResult.rows[0];

    // Verify user is the challenger
    if (challenge.challenger_host_id !== userId) {
      throw new AppError('Only the challenger can cancel this challenge', 403);
    }

    // Verify challenge is still pending
    if (challenge.status !== ChallengeStatus.PENDING) {
      throw new AppError(`Challenge is already ${challenge.status.toLowerCase()}`, 400);
    }

    // Update challenge status
    await query(
      `UPDATE match_challenges 
       SET status = $1, responded_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [ChallengeStatus.CANCELLED, challengeId]
    );

    // Send notification to opponent
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        challenge.opponent_host_id,
        'MATCH_CHALLENGE_CANCELLED',
        'Challenge Cancelled',
        `A match challenge has been cancelled`,
        ['IN_APP'],
        JSON.stringify({
          challengeId,
          sport: challenge.sport,
        }),
      ]
    );
  }

  /**
   * Map database row to MatchChallenge object
   */
  private mapChallenge(row: any): MatchChallenge {
    return {
      id: row.id,
      challengerTeamId: row.challenger_team_id,
      opponentTeamId: row.opponent_team_id,
      sport: row.sport,
      proposedDate: row.proposed_date,
      venue: row.venue,
      status: row.status as ChallengeStatus,
      matchId: row.match_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      respondedBy: row.responded_by,
      notes: row.notes,
    };
  }
}

export const matchChallengeService = new MatchChallengeService();
