import { query } from '../db/postgres';
import { Team, TeamCreate, Sport, RosterValidation, Invitation, InvitationStatus } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';

// Sport-specific roster size constraints
const ROSTER_CONSTRAINTS: Record<Sport, { min: number; max: number }> = {
  [Sport.CRICKET]: { min: 11, max: 15 },
  [Sport.FOOTBALL]: { min: 11, max: 18 },
  [Sport.BASKETBALL]: { min: 5, max: 12 },
  [Sport.BADMINTON]: { min: 1, max: 4 },
  [Sport.KABADDI]: { min: 7, max: 12 },
  [Sport.VOLLEYBALL]: { min: 6, max: 12 },
};

export class TeamService {
  /**
   * Get all teams (for browsing/searching)
   */
  async getAllTeams(filters?: { sport?: string }): Promise<Team[]> {
    let queryText = 'SELECT * FROM teams ORDER BY created_at DESC';
    const params: any[] = [];

    if (filters?.sport) {
      queryText = 'SELECT * FROM teams WHERE sport = $1 ORDER BY created_at DESC';
      params.push(filters.sport);
    }

    const result = await query(queryText, params);

    const teams = await Promise.all(
      result.rows.map(async (row) => {
        return this.mapRowToTeam(row);
      })
    );

    return teams;
  }

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
      `SELECT tr.id, tr.player_id, tr.joined_at, up.name, up.avatar_url
       FROM team_rosters tr
       JOIN user_profiles up ON tr.player_id = up.user_id
       WHERE tr.team_id = $1
       ORDER BY tr.joined_at ASC`,
      [teamId]
    );

    return result.rows.map(row => ({
      id: row.player_id,
      name: row.name,
      avatarUrl: row.avatar_url,
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

    // Fetch organization name if team belongs to one
    let organizationName = undefined;
    if (row.organization_id) {
      const orgResult = await query(
        'SELECT name FROM user_profiles WHERE user_id = $1',
        [row.organization_id]
      );
      if (orgResult.rows.length > 0) {
        organizationName = orgResult.rows[0].name;
      }
    }

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
      captainId: row.captain_id || undefined,
      organizationId: row.organization_id || undefined,
      organizationName,
      roster,
      statistics: row.statistics || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get team's sport profiles (all sports the team participates in)
   */
  async getTeamSportProfiles(teamId: string): Promise<any[]> {
    const result = await query(
      `SELECT id, sport, statistics, created_at, updated_at
       FROM team_sport_profiles
       WHERE team_id = $1
       ORDER BY created_at ASC`,
      [teamId]
    );

    return result.rows.map(row => ({
      id: row.id,
      sport: row.sport,
      statistics: row.statistics,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Add a sport to team's profile
   */
  async addSportToTeam(teamId: string, sport: Sport): Promise<void> {
    // Verify team exists
    await this.getTeam(teamId);

    // Validate sport
    const validSports = Object.values(Sport);
    if (!validSports.includes(sport)) {
      throw new AppError(`Invalid sport. Must be one of: ${validSports.join(', ')}`, 400);
    }

    // Check if sport profile already exists
    const existingResult = await query(
      'SELECT id FROM team_sport_profiles WHERE team_id = $1 AND sport = $2',
      [teamId, sport]
    );

    if (existingResult.rows.length > 0) {
      throw new AppError(`Team already has a profile for ${sport}`, 400);
    }

    // Create sport profile
    await query(
      `INSERT INTO team_sport_profiles (team_id, sport, statistics)
       VALUES ($1, $2, $3)`,
      [teamId, sport, JSON.stringify({ matchesPlayed: 0, wins: 0, losses: 0, draws: 0 })]
    );
  }

  /**
   * Remove a sport from team's profile
   */
  async removeSportFromTeam(teamId: string, sport: Sport): Promise<void> {
    // Verify team exists
    const team = await this.getTeam(teamId);

    // Check if this is the team's primary sport
    if (team.sport === sport) {
      throw new AppError(
        'Cannot remove primary sport. Please change the primary sport first.',
        400
      );
    }

    // Remove sport profile
    const result = await query(
      'DELETE FROM team_sport_profiles WHERE team_id = $1 AND sport = $2',
      [teamId, sport]
    );

    if (result.rowCount === 0) {
      throw new AppError(`Team does not have a profile for ${sport}`, 404);
    }
  }

  /**
   * Change team's primary sport
   */
  async changePrimarySport(teamId: string, sport: Sport): Promise<void> {
    // Verify team exists
    await this.getTeam(teamId);

    // Validate sport
    const validSports = Object.values(Sport);
    if (!validSports.includes(sport)) {
      throw new AppError(`Invalid sport. Must be one of: ${validSports.join(', ')}`, 400);
    }

    // Check if team has a profile for this sport
    const sportProfileResult = await query(
      'SELECT id FROM team_sport_profiles WHERE team_id = $1 AND sport = $2',
      [teamId, sport]
    );

    if (sportProfileResult.rows.length === 0) {
      throw new AppError(
        `Team does not have a profile for ${sport}. Please add the sport first.`,
        400
      );
    }

    // Update team's primary sport
    await query(
      'UPDATE teams SET sport = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [sport, teamId]
    );
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
      throw new AppError('Player already has a pending invitation from this team. Ask them to check their dashboard.', 400);
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

    // Get the team's sport to enforce one-team-per-sport rule
    const teamSportResult = await query('SELECT sport, name FROM teams WHERE id = $1', [teamId]);
    const teamSport = teamSportResult.rows[0]?.sport;

    // Check if player is already in another team for this sport
    const existingTeamResult = await query(
      `SELECT t.name, t.id FROM team_rosters tr
       JOIN teams t ON tr.team_id = t.id
       WHERE tr.player_id = $1 AND t.sport = $2`,
      [playerId, teamSport]
    );

    if (existingTeamResult.rows.length > 0) {
      const existingTeam = existingTeamResult.rows[0];
      throw new AppError(
        `Player is already in a ${teamSport} team ("${existingTeam.name}"). A player can only be in one team per sport. Please leave that team first.`,
        400
      );
    }

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

      // Add player to roster (use team's primary sport for now)
      await query(
        'INSERT INTO team_rosters (team_id, player_id, sport) VALUES ($1, $2, $3)',
        [teamId, playerId, team.sport]
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
       WHERE ti.player_id = $1 AND ti.status = $2
       ORDER BY ti.created_at DESC`,
      [playerId, InvitationStatus.PENDING]
    );

    return result.rows.map(row => ({
      id: row.id,
      teamId: row.team_id,
      playerId: row.player_id,
      status: row.status as InvitationStatus,
      createdAt: row.created_at,
      teamName: row.team_name, // Add team name to response
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

    // Check if player is already in another team for the same sport (one team per sport)
    const existingTeamResult = await query(
      `SELECT t.name, t.id FROM team_rosters tr
       JOIN teams t ON tr.team_id = t.id
       WHERE tr.player_id = $1 AND t.sport = $2`,
      [playerId, team.sport]
    );

    if (existingTeamResult.rows.length > 0) {
      const existingTeam = existingTeamResult.rows[0];
      throw new AppError(
        `Player is already in a ${team.sport} team ("${existingTeam.name}"). A player can only be in one team per sport.`,
        400
      );
    }

    // Check if player is already in this roster
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

    // Add player to roster (use team's primary sport for now)
    await query(
      'INSERT INTO team_rosters (team_id, player_id, sport) VALUES ($1, $2, $3)',
      [teamId, playerId, team.sport]
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
   * Player requests to leave a team (sends notification to host for approval)
   */
  async requestLeave(playerId: string, teamId: string, reason?: string): Promise<void> {
    // Verify player is in the team
    const rosterCheck = await query(
      'SELECT id FROM team_rosters WHERE team_id = $1 AND player_id = $2',
      [teamId, playerId]
    );

    if (rosterCheck.rows.length === 0) {
      throw new AppError('You are not a member of this team', 400);
    }

    // Check if there's already a pending leave request
    const existingRequest = await query(
      `SELECT id FROM team_leave_requests WHERE team_id = $1 AND player_id = $2 AND status = 'PENDING'`,
      [teamId, playerId]
    );

    if (existingRequest.rows.length > 0) {
      throw new AppError('You already have a pending leave request for this team', 400);
    }

    // Create leave request
    await query(
      `INSERT INTO team_leave_requests (team_id, player_id, reason, status) VALUES ($1, $2, $3, 'PENDING')`,
      [teamId, playerId, reason || null]
    );

    // Notify host
    const team = await this.getTeam(teamId);
    const playerResult = await query(
      'SELECT name FROM user_profiles WHERE user_id = $1',
      [playerId]
    );
    const playerName = playerResult.rows[0]?.name || 'A player';

    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, channels)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        team.hostId,
        'TEAM_INVITATION',
        'Leave Request Received',
        `${playerName} has requested to leave "${team.name}"${reason ? `: "${reason}"` : ''}. Please approve or reject this request.`,
        JSON.stringify({ teamId, playerId, type: 'LEAVE_REQUEST' }),
        ['IN_APP'],
      ]
    );
  }

  /**
   * Get pending leave requests for a team (for host)
   */
  async getLeaveRequests(teamId: string): Promise<any[]> {
    const result = await query(
      `SELECT tlr.id, tlr.player_id, tlr.reason, tlr.status, tlr.created_at,
              up.name as player_name, up.avatar_url
       FROM team_leave_requests tlr
       JOIN user_profiles up ON tlr.player_id = up.user_id
       WHERE tlr.team_id = $1 AND tlr.status = 'PENDING'
       ORDER BY tlr.created_at ASC`,
      [teamId]
    );

    return result.rows.map(row => ({
      id: row.id,
      playerId: row.player_id,
      playerName: row.player_name,
      avatarUrl: row.avatar_url,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  /**
   * Host approves a leave request — removes player from roster
   */
  async approveLeaveRequest(requestId: string, teamId: string): Promise<void> {
    const requestResult = await query(
      `SELECT * FROM team_leave_requests WHERE id = $1 AND team_id = $2 AND status = 'PENDING'`,
      [requestId, teamId]
    );

    if (requestResult.rows.length === 0) {
      throw new AppError('Leave request not found or already processed', 404);
    }

    const { player_id: playerId } = requestResult.rows[0];

    await query('BEGIN', []);
    try {
      // Mark request approved
      await query(
        `UPDATE team_leave_requests SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [requestId]
      );

      // Remove from roster
      await query(
        'DELETE FROM team_rosters WHERE team_id = $1 AND player_id = $2',
        [teamId, playerId]
      );

      await query('COMMIT', []);
    } catch (e) {
      await query('ROLLBACK', []);
      throw e;
    }

    // Notify player
    const team = await this.getTeam(teamId);
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        playerId,
        'TEAM_INVITATION',
        'Leave Request Approved',
        `Your request to leave "${team.name}" has been approved. You are no longer a member.`,
        ['IN_APP'],
      ]
    );
  }

  /**
   * Host rejects a leave request
   */
  async rejectLeaveRequest(requestId: string, teamId: string): Promise<void> {
    const requestResult = await query(
      `SELECT * FROM team_leave_requests WHERE id = $1 AND team_id = $2 AND status = 'PENDING'`,
      [requestId, teamId]
    );

    if (requestResult.rows.length === 0) {
      throw new AppError('Leave request not found or already processed', 404);
    }

    const { player_id: playerId } = requestResult.rows[0];

    await query(
      `UPDATE team_leave_requests SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requestId]
    );

    // Notify player
    const team = await this.getTeam(teamId);
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        playerId,
        'TEAM_INVITATION',
        'Leave Request Rejected',
        `Your request to leave "${team.name}" has been rejected by the team host.`,
        ['IN_APP'],
      ]
    );
  }

  /**
   * Player leaves their current team (self-removal)
   */
  async leaveTeam(playerId: string): Promise<void> {
    // Find player's current team
    const teamResult = await query(
      'SELECT team_id, t.name FROM team_rosters tr JOIN teams t ON tr.team_id = t.id WHERE tr.player_id = $1',
      [playerId]
    );

    if (teamResult.rows.length === 0) {
      throw new AppError('Player is not a member of any team', 404);
    }

    const teamId = teamResult.rows[0].team_id;
    const teamName = teamResult.rows[0].name;

    // Remove player from roster
    await query(
      'DELETE FROM team_rosters WHERE team_id = $1 AND player_id = $2',
      [teamId, playerId]
    );

    // Send notification to team host
    const teamDetails = await this.getTeam(teamId);
    const playerResult = await query(
      'SELECT name FROM user_profiles WHERE user_id = $1',
      [playerId]
    );
    const playerName = playerResult.rows[0]?.name || 'A player';

    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        teamDetails.hostId,
        'TEAM_UPDATE',
        'Player Left Team',
        `${playerName} has left your team "${teamName}"`,
        ['IN_APP', 'EMAIL'],
      ]
    );
  }

  /**
   * Get player's current team (if any)
   */
  async getPlayerTeam(playerId: string): Promise<Team | null> {
    const result = await query(
      'SELECT t.* FROM teams t JOIN team_rosters tr ON t.id = tr.team_id WHERE tr.player_id = $1',
      [playerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTeam(result.rows[0]);
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

  /**
   * Assign a captain to the team
   */
  async assignCaptain(teamId: string, captainId: string): Promise<void> {
    // Verify team exists
    await this.getTeam(teamId);

    // Verify the player is on the team roster
    const rosterCheck = await query(
      'SELECT * FROM team_rosters WHERE team_id = $1 AND player_id = $2',
      [teamId, captainId]
    );

    if (rosterCheck.rows.length === 0) {
      throw new AppError('Player must be on the team roster to be assigned as captain', 400);
    }

    // Update the team's captain
    await query(
      'UPDATE teams SET captain_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [captainId, teamId]
    );
  }

  /**
   * Join an organization
   */
  async joinOrganization(teamId: string, organizationId: string): Promise<void> {
    // Verify team exists
    await this.getTeam(teamId);

    // Verify organization exists
    const orgResult = await query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [organizationId, 'ORGANIZATION']
    );

    if (orgResult.rows.length === 0) {
      throw new AppError('Organization not found', 404);
    }

    // Update team's organization
    await query(
      'UPDATE teams SET organization_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [organizationId, teamId]
    );
  }

  /**
   * Get all teams belonging to an organization
   */
  async getTeamsByOrganization(organizationId: string): Promise<any[]> {
    const result = await query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM team_rosters WHERE team_id = t.id) as roster_count,
        (SELECT COUNT(*) FROM matches WHERE (home_team_id = t.id OR away_team_id = t.id) AND status = 'COMPLETED') as matches_played,
        (SELECT COUNT(*) FROM matches WHERE (home_team_id = t.id AND home_score > away_score) OR (away_team_id = t.id AND away_score > home_score)) as wins
       FROM teams t
       WHERE t.organization_id = $1
       ORDER BY t.created_at DESC`,
      [organizationId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      sport: row.sport,
      location: {
        city: row.city,
        state: row.state,
        country: row.country
      },
      hostId: row.host_id,
      captainId: row.captain_id,
      organizationId: row.organization_id,
      rosterCount: parseInt(row.roster_count) || 0,
      statistics: {
        matchesPlayed: parseInt(row.matches_played) || 0,
        wins: parseInt(row.wins) || 0
      },
      createdAt: row.created_at
    }));
  }
}

export const teamService = new TeamService();
