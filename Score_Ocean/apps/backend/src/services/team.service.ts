import { query } from '../db/postgres';
import { Team, TeamCreate, Sport, RosterValidation, Invitation, InvitationStatus } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';

// Sport-specific roster size constraints
const ROSTER_CONSTRAINTS: Record<Sport, { min: number; max: number }> = {
  [Sport.CRICKET]: { min: 11, max: 15 },
  [Sport.FOOTBALL]: { min: 11, max: 18 },
  [Sport.KABADDI]: { min: 7, max: 12 },
  [Sport.VOLLEYBALL]: { min: 6, max: 12 },
};

export class TeamService {
  /**
   * Get all teams for a user (either as host or as member)
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    // Get teams where user is the host
    const hostedTeamsResult = await query(
      'SELECT * FROM teams WHERE host_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Get teams where user is a member
    const memberTeamsResult = await query(
      `SELECT t.* FROM teams t
       INNER JOIN team_rosters tr ON t.id = tr.team_id
       WHERE tr.player_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    // Combine and deduplicate teams
    const teamIds = new Set<string>();
    const allTeamRows: any[] = [];

    for (const row of hostedTeamsResult.rows) {
      if (!teamIds.has(row.id)) {
        teamIds.add(row.id);
        allTeamRows.push(row);
      }
    }

    for (const row of memberTeamsResult.rows) {
      if (!teamIds.has(row.id)) {
        teamIds.add(row.id);
        allTeamRows.push(row);
      }
    }

    // Map rows to Team objects
    const teams = await Promise.all(
      allTeamRows.map(async (row) => {
        return this.mapRowToTeam(row);
      })
    );

    return teams;
  }

  /**
   * Create a new team
   */
  async createTeam(hostId: string, teamData: TeamCreate): Promise<Team> {
    const { name, sport, location } = teamData;

    // Validate required fields
    if (!name || !sport || !location) {
      throw new AppError('Missing required fields: name, sport, location', 400);
    }

    // Validate sport
    const validSports = Object.values(Sport);
    if (!validSports.includes(sport)) {
      throw new AppError(`Invalid sport. Must be one of: ${validSports.join(', ')}`, 400);
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 100) {
      throw new AppError('Team name must be between 2 and 100 characters', 400);
    }

    // Create team
    const result = await query(
      `INSERT INTO teams (name, sport, host_id, city, state, country, statistics)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name.trim(),
        sport,
        hostId,
        location.city,
        location.state,
        location.country,
        JSON.stringify({ matchesPlayed: 0, wins: 0, losses: 0, draws: 0 }),
      ]
    );

    const row = result.rows[0];
    return this.mapRowToTeam(row);
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team> {
    const result = await query(
      `SELECT * FROM teams WHERE id = $1`,
      [teamId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Team not found', 404);
    }

    return this.mapRowToTeam(result.rows[0]);
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, updates: Partial<TeamCreate>): Promise<Team> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      if (updates.name.trim().length < 2 || updates.name.trim().length > 100) {
        throw new AppError('Team name must be between 2 and 100 characters', 400);
      }
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name.trim());
    }

    if (updates.sport !== undefined) {
      const validSports = Object.values(Sport);
      if (!validSports.includes(updates.sport)) {
        throw new AppError(`Invalid sport. Must be one of: ${validSports.join(', ')}`, 400);
      }
      fields.push(`sport = $${paramIndex++}`);
      values.push(updates.sport);
    }

    if (updates.location) {
      if (updates.location.city !== undefined) {
        fields.push(`city = $${paramIndex++}`);
        values.push(updates.location.city);
      }
      if (updates.location.state !== undefined) {
        fields.push(`state = $${paramIndex++}`);
        values.push(updates.location.state);
      }
      if (updates.location.country !== undefined) {
        fields.push(`country = $${paramIndex++}`);
        values.push(updates.location.country);
      }
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(teamId);

    await query(
      `UPDATE teams SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.getTeam(teamId);
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<void> {
    const result = await query('DELETE FROM teams WHERE id = $1', [teamId]);
    
    if (result.rowCount === 0) {
      throw new AppError('Team not found', 404);
    }
  }

  /**
   * Get team roster
   */
  async getRoster(teamId: string): Promise<any[]> {
    const result = await query(
      `SELECT tr.id, tr.player_id, tr.joined_at, up.name
       FROM team_rosters tr
       JOIN user_profiles up ON tr.player_id = up.user_id
       WHERE tr.team_id = $1
       ORDER BY tr.joined_at ASC`,
      [teamId]
    );

    return result.rows.map(row => ({
      id: row.player_id,
      name: row.name,
      joinedAt: row.joined_at,
    }));
  }

  /**
   * Validate roster size for a sport
   */
  async validateRoster(teamId: string, sport: Sport): Promise<RosterValidation> {
    const roster = await this.getRoster(teamId);
    const constraints = ROSTER_CONSTRAINTS[sport];

    if (!constraints) {
      throw new AppError(`Unknown sport: ${sport}`, 400);
    }

    const currentPlayers = roster.length;
    const errors: string[] = [];

    if (currentPlayers < constraints.min) {
      errors.push(`Roster must have at least ${constraints.min} players for ${sport}`);
    }

    if (currentPlayers > constraints.max) {
      errors.push(`Roster cannot exceed ${constraints.max} players for ${sport}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      minPlayers: constraints.min,
      maxPlayers: constraints.max,
      currentPlayers,
    };
  }

  /**
   * Map database row to Team object
   */
  private async mapRowToTeam(row: any): Promise<Team> {
    const roster = await this.getRoster(row.id);

    return {
      id: row.id,
      name: row.name,
      sport: row.sport as Sport,
      location: {
        city: row.city || '',
        state: row.state || '',
        country: row.country || '',
      },
      hostId: row.host_id,
      roster,
      statistics: row.statistics || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Invite a player to join the team
   */
  async invitePlayer(teamId: string, playerId: string, _invitedBy: string): Promise<Invitation> {
    // Verify team exists
    await this.getTeam(teamId);

    // Check if player exists
    const playerResult = await query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [playerId, 'PLAYER']
    );

    if (playerResult.rows.length === 0) {
      throw new AppError('Player not found or user is not a player', 404);
    }

    // Check if player is already in roster
    const rosterCheck = await query(
      'SELECT id FROM team_rosters WHERE team_id = $1 AND player_id = $2',
      [teamId, playerId]
    );

    if (rosterCheck.rows.length > 0) {
      throw new AppError('Player is already in the team roster', 400);
    }

    // Check if there's already a pending invitation
    const invitationCheck = await query(
      'SELECT id FROM team_invitations WHERE team_id = $1 AND player_id = $2 AND status = $3',
      [teamId, playerId, InvitationStatus.PENDING]
    );

    if (invitationCheck.rows.length > 0) {
      throw new AppError('Player already has a pending invitation', 400);
    }

    // Create invitation
    const result = await query(
      `INSERT INTO team_invitations (team_id, player_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [teamId, playerId, InvitationStatus.PENDING]
    );

    const invitation = result.rows[0];

    // Send notification to player (simplified - will be enhanced with notification service)
    await this.sendInvitationNotification(teamId, playerId);

    return {
      id: invitation.id,
      teamId: invitation.team_id,
      playerId: invitation.player_id,
      status: invitation.status as InvitationStatus,
      createdAt: invitation.created_at,
    };
  }

  /**
   * Accept a team invitation
   */
  async acceptInvitation(invitationId: string, playerId: string): Promise<void> {
    // Get invitation
    const invitationResult = await query(
      'SELECT * FROM team_invitations WHERE id = $1 AND player_id = $2 AND status = $3',
      [invitationId, playerId, InvitationStatus.PENDING]
    );

    if (invitationResult.rows.length === 0) {
      throw new AppError('Invitation not found or already processed', 404);
    }

    const invitation = invitationResult.rows[0];
    const teamId = invitation.team_id;

    // Get team to check roster constraints
    const team = await this.getTeam(teamId);
    const validation = await this.validateRoster(teamId, team.sport);

    // Check if adding this player would exceed max roster size
    if (validation.currentPlayers >= validation.maxPlayers) {
      throw new AppError(
        `Cannot accept invitation: team roster is full (max ${validation.maxPlayers} players)`,
        400
      );
    }

    // Start transaction
    await query('BEGIN', []);

    try {
      // Update invitation status
      await query(
        'UPDATE team_invitations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [InvitationStatus.ACCEPTED, invitationId]
      );

      // Add player to roster
      await query(
        'INSERT INTO team_rosters (team_id, player_id) VALUES ($1, $2)',
        [teamId, playerId]
      );

      // Commit transaction
      await query('COMMIT', []);

      // Send notification to team manager
      await this.sendAcceptanceNotification(teamId, playerId);
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  }

  /**
   * Decline a team invitation
   */
  async declineInvitation(invitationId: string, playerId: string): Promise<void> {
    // Get invitation
    const invitationResult = await query(
      'SELECT * FROM team_invitations WHERE id = $1 AND player_id = $2 AND status = $3',
      [invitationId, playerId, InvitationStatus.PENDING]
    );

    if (invitationResult.rows.length === 0) {
      throw new AppError('Invitation not found or already processed', 404);
    }

    const invitation = invitationResult.rows[0];

    // Update invitation status
    await query(
      'UPDATE team_invitations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [InvitationStatus.DECLINED, invitationId]
    );

    // Send notification to team manager
    await this.sendDeclineNotification(invitation.team_id, playerId);
  }

  /**
   * Get invitations for a player
   */
  async getPlayerInvitations(playerId: string): Promise<Invitation[]> {
    const result = await query(
      `SELECT ti.*, t.name as team_name
       FROM team_invitations ti
       JOIN teams t ON ti.team_id = t.id
       WHERE ti.player_id = $1
       ORDER BY ti.created_at DESC`,
      [playerId]
    );

    return result.rows.map(row => ({
      id: row.id,
      teamId: row.team_id,
      playerId: row.player_id,
      status: row.status as InvitationStatus,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get invitations for a team
   */
  async getTeamInvitations(teamId: string): Promise<Invitation[]> {
    const result = await query(
      `SELECT ti.*, up.name as player_name
       FROM team_invitations ti
       JOIN user_profiles up ON ti.player_id = up.user_id
       WHERE ti.team_id = $1
       ORDER BY ti.created_at DESC`,
      [teamId]
    );

    return result.rows.map(row => ({
      id: row.id,
      teamId: row.team_id,
      playerId: row.player_id,
      status: row.status as InvitationStatus,
      createdAt: row.created_at,
    }));
  }

  /**
   * Send invitation notification (simplified)
   */
  private async sendInvitationNotification(teamId: string, playerId: string): Promise<void> {
    const team = await this.getTeam(teamId);
    
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        playerId,
        'TEAM_INVITATION',
        'Team Invitation',
        `You have been invited to join ${team.name}`,
        ['IN_APP', 'EMAIL'],
      ]
    );
  }

  /**
   * Send acceptance notification (simplified)
   */
  private async sendAcceptanceNotification(teamId: string, playerId: string): Promise<void> {
    const team = await this.getTeam(teamId);
    const playerResult = await query(
      'SELECT name FROM user_profiles WHERE user_id = $1',
      [playerId]
    );
    const playerName = playerResult.rows[0]?.name || 'A player';

    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        team.hostId,
        'TEAM_INVITATION',
        'Invitation Accepted',
        `${playerName} has accepted your invitation to join ${team.name}`,
        ['IN_APP', 'EMAIL'],
      ]
    );
  }

  /**
   * Send decline notification (simplified)
   */
  private async sendDeclineNotification(teamId: string, playerId: string): Promise<void> {
    const team = await this.getTeam(teamId);
    const playerResult = await query(
      'SELECT name FROM user_profiles WHERE user_id = $1',
      [playerId]
    );
    const playerName = playerResult.rows[0]?.name || 'A player';

    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        team.hostId,
        'TEAM_INVITATION',
        'Invitation Declined',
        `${playerName} has declined your invitation to join ${team.name}`,
        ['IN_APP', 'EMAIL'],
      ]
    );
  }

  /**
   * Add player to roster (direct add without invitation)
   */
  async addPlayerToRoster(teamId: string, playerId: string): Promise<void> {
    // Verify team exists
    const team = await this.getTeam(teamId);

    // Check if player exists
    const playerResult = await query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [playerId, 'PLAYER']
    );

    if (playerResult.rows.length === 0) {
      throw new AppError('Player not found or user is not a player', 404);
    }

    // Check if player is already in roster
    const rosterCheck = await query(
      'SELECT id FROM team_rosters WHERE team_id = $1 AND player_id = $2',
      [teamId, playerId]
    );

    if (rosterCheck.rows.length > 0) {
      throw new AppError('Player is already in the team roster', 400);
    }

    // Check roster size constraints
    const validation = await this.validateRoster(teamId, team.sport);
    if (validation.currentPlayers >= validation.maxPlayers) {
      throw new AppError(
        `Cannot add player: team roster is full (max ${validation.maxPlayers} players)`,
        400
      );
    }

    // Add player to roster
    await query(
      'INSERT INTO team_rosters (team_id, player_id) VALUES ($1, $2)',
      [teamId, playerId]
    );
  }

  /**
   * Remove player from roster
   */
  async removePlayerFromRoster(teamId: string, playerId: string): Promise<void> {
    // Verify team exists
    await this.getTeam(teamId);

    // Check if player is in roster
    const rosterCheck = await query(
      'SELECT id FROM team_rosters WHERE team_id = $1 AND player_id = $2',
      [teamId, playerId]
    );

    if (rosterCheck.rows.length === 0) {
      throw new AppError('Player is not in the team roster', 404);
    }

    // Remove player from roster
    await query(
      'DELETE FROM team_rosters WHERE team_id = $1 AND player_id = $2',
      [teamId, playerId]
    );
  }

  /**
   * Validate roster for tournament registration
   * This checks if the roster meets minimum requirements for tournament participation
   */
  async validateRosterForTournament(teamId: string, tournamentSport: Sport): Promise<RosterValidation> {
    // Get team
    const team = await this.getTeam(teamId);

    // Verify team sport matches tournament sport
    if (team.sport !== tournamentSport) {
      throw new AppError(
        `Team sport (${team.sport}) does not match tournament sport (${tournamentSport})`,
        400
      );
    }

    // Validate roster size
    const validation = await this.validateRoster(teamId, tournamentSport);

    // For tournament registration, we only check minimum requirements
    if (validation.currentPlayers < validation.minPlayers) {
      validation.isValid = false;
      validation.errors.push(
        `Team must have at least ${validation.minPlayers} players to register for tournament`
      );
    }

    return validation;
  }
}

export const teamService = new TeamService();
