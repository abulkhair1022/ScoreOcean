import { query } from '../db/postgres';
import {
  Tournament,
  TournamentCreate,
  TournamentFormat,
  TournamentStatus,
  Registration,
  RegistrationStatus,
  Fixture,
  FixtureUpdate,
} from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';

export class TournamentService {
  /**
   * Get all tournaments (published ones)
   */
  async getAllTournaments(): Promise<Tournament[]> {
    const result = await query(
      `SELECT * FROM tournaments 
       WHERE status != 'DRAFT' 
       ORDER BY start_date DESC, created_at DESC`
    );

    const tournaments = await Promise.all(
      result.rows.map((row) => this.mapRowToTournament(row))
    );

    return tournaments;
  }

  /**
   * Create a new tournament
   */
  async createTournament(hostId: string, tournamentData: TournamentCreate): Promise<Tournament> {
    const {
      name,
      sport,
      format,
      dates,
      venue,
      registrationFee,
      registrationDeadline,
      teamCapacity,
      rules,
    } = tournamentData;

    // Validate required fields
    if (!name || !sport || !format || !dates || !venue || !registrationDeadline || !teamCapacity) {
      throw new AppError('Missing required fields', 400);
    }

    // Validate tournament format
    const validFormats = Object.values(TournamentFormat);
    if (!validFormats.includes(format)) {
      throw new AppError(
        `Invalid tournament format. Must be one of: ${validFormats.join(', ')}`,
        400
      );
    }

    // Validate name length
    if (name.trim().length < 3 || name.trim().length > 100) {
      throw new AppError('Tournament name must be between 3 and 100 characters', 400);
    }

    // Validate dates
    const startDate = new Date(dates.startDate);
    const endDate = new Date(dates.endDate);
    const deadline = new Date(registrationDeadline);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError('Invalid date format', 400);
    }

    if (endDate <= startDate) {
      throw new AppError('End date must be after start date', 400);
    }

    if (deadline >= startDate) {
      throw new AppError('Registration deadline must be before tournament start date', 400);
    }

    // Validate team capacity
    if (teamCapacity < 2 || teamCapacity > 100) {
      throw new AppError('Team capacity must be between 2 and 100', 400);
    }

    // Validate registration fee
    if (registrationFee < 0) {
      throw new AppError('Registration fee cannot be negative', 400);
    }

    // Get user role to determine host type
    const userResult = await query('SELECT role FROM users WHERE id = $1', [hostId]);
    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const userRole = userResult.rows[0].role;
    let hostType: 'TEAM' | 'ORGANIZATION';

    // Validate role-based tournament creation
    if (userRole === 'TEAM' || userRole === 'ORGANIZATION') {
      hostType = userRole;
    } else if (userRole === 'PLAYER') {
      // Players can also create tournaments, default to ORGANIZATION type
      hostType = 'ORGANIZATION';
    } else if (userRole === 'ADMIN') {
      hostType = 'ORGANIZATION';
    } else {
      throw new AppError('Invalid user role for tournament creation', 403);
    }

    // Create tournament
    const result = await query(
      `INSERT INTO tournaments (
        name, sport, format, host_id, host_type,
        start_date, end_date, venue,
        registration_fee, registration_deadline, team_capacity,
        status, rules
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name.trim(),
        sport,
        format,
        hostId,
        hostType,
        startDate,
        endDate,
        venue,
        registrationFee || 0,
        deadline,
        teamCapacity,
        TournamentStatus.DRAFT,
        JSON.stringify(rules || {}),
      ]
    );

    const row = result.rows[0];
    return this.mapRowToTournament(row);
  }

  /**
   * Get tournament by ID
   */
  async getTournament(tournamentId: string): Promise<Tournament> {
    const result = await query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);

    if (result.rows.length === 0) {
      throw new AppError('Tournament not found', 404);
    }

    return this.mapRowToTournament(result.rows[0]);
  }

  /**
   * Update tournament
   */
  async updateTournament(
    tournamentId: string,
    updates: Partial<TournamentCreate>
  ): Promise<Tournament> {
    // Get existing tournament
    const existing = await this.getTournament(tournamentId);

    // Only allow updates if tournament is in DRAFT status
    if (existing.status !== TournamentStatus.DRAFT) {
      throw new AppError('Can only update tournaments in DRAFT status', 400);
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      if (updates.name.trim().length < 3 || updates.name.trim().length > 100) {
        throw new AppError('Tournament name must be between 3 and 100 characters', 400);
      }
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name.trim());
    }

    if (updates.sport !== undefined) {
      fields.push(`sport = $${paramIndex++}`);
      values.push(updates.sport);
    }

    if (updates.format !== undefined) {
      const validFormats = Object.values(TournamentFormat);
      if (!validFormats.includes(updates.format)) {
        throw new AppError(
          `Invalid tournament format. Must be one of: ${validFormats.join(', ')}`,
          400
        );
      }
      fields.push(`format = $${paramIndex++}`);
      values.push(updates.format);
    }

    if (updates.dates) {
      if (updates.dates.startDate) {
        const startDate = new Date(updates.dates.startDate);
        if (isNaN(startDate.getTime())) {
          throw new AppError('Invalid start date format', 400);
        }
        fields.push(`start_date = $${paramIndex++}`);
        values.push(startDate);
      }
      if (updates.dates.endDate) {
        const endDate = new Date(updates.dates.endDate);
        if (isNaN(endDate.getTime())) {
          throw new AppError('Invalid end date format', 400);
        }
        fields.push(`end_date = $${paramIndex++}`);
        values.push(endDate);
      }
    }

    if (updates.venue !== undefined) {
      fields.push(`venue = $${paramIndex++}`);
      values.push(updates.venue);
    }

    if (updates.registrationFee !== undefined) {
      if (updates.registrationFee < 0) {
        throw new AppError('Registration fee cannot be negative', 400);
      }
      fields.push(`registration_fee = $${paramIndex++}`);
      values.push(updates.registrationFee);
    }

    if (updates.registrationDeadline !== undefined) {
      const deadline = new Date(updates.registrationDeadline);
      if (isNaN(deadline.getTime())) {
        throw new AppError('Invalid registration deadline format', 400);
      }
      fields.push(`registration_deadline = $${paramIndex++}`);
      values.push(deadline);
    }

    if (updates.teamCapacity !== undefined) {
      if (updates.teamCapacity < 2 || updates.teamCapacity > 100) {
        throw new AppError('Team capacity must be between 2 and 100', 400);
      }
      fields.push(`team_capacity = $${paramIndex++}`);
      values.push(updates.teamCapacity);
    }

    if (updates.rules !== undefined) {
      fields.push(`rules = $${paramIndex++}`);
      values.push(JSON.stringify(updates.rules));
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(tournamentId);

    await query(
      `UPDATE tournaments SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.getTournament(tournamentId);
  }

  /**
   * Delete tournament
   */
  async deleteTournament(tournamentId: string): Promise<void> {
    const result = await query('DELETE FROM tournaments WHERE id = $1', [tournamentId]);

    if (result.rowCount === 0) {
      throw new AppError('Tournament not found', 404);
    }
  }

  /**
   * Map database row to Tournament object
   */
  private async mapRowToTournament(row: any): Promise<Tournament> {
    // Get registrations
    const registrationsResult = await query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = $1 ORDER BY registered_at ASC',
      [row.id]
    );

    const registrations: Registration[] = registrationsResult.rows.map((r) => ({
      id: r.id,
      tournamentId: r.tournament_id,
      teamId: r.team_id,
      status: r.status as RegistrationStatus,
      paymentId: r.payment_id,
      registeredAt: r.registered_at,
    }));

    // Get fixtures
    const fixturesResult = await query(
      'SELECT * FROM fixtures WHERE tournament_id = $1 ORDER BY match_number ASC',
      [row.id]
    );

    const fixtures: Fixture[] = fixturesResult.rows.map((f) => ({
      id: f.id,
      tournamentId: f.tournament_id,
      matchNumber: f.match_number,
      homeTeamId: f.home_team_id,
      awayTeamId: f.away_team_id,
      scheduledDate: f.scheduled_date,
      venue: f.venue,
      status: f.status,
      matchId: f.match_id,
    }));

    return {
      id: row.id,
      name: row.name,
      sport: row.sport,
      format: row.format as TournamentFormat,
      hostId: row.host_id,
      hostType: row.host_type,
      dates: {
        startDate: row.start_date,
        endDate: row.end_date,
      },
      venue: row.venue,
      registrationFee: parseFloat(row.registration_fee),
      registrationDeadline: row.registration_deadline,
      teamCapacity: row.team_capacity,
      status: row.status as TournamentStatus,
      rules: row.rules || {},
      registrations,
      fixtures,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Publish tournament (change status from DRAFT to REGISTRATION_OPEN)
   */
  async publishTournament(tournamentId: string): Promise<Tournament> {
    const tournament = await this.getTournament(tournamentId);

    // Validate current status
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new AppError('Can only publish tournaments in DRAFT status', 400);
    }

    // Validate tournament has all required information
    if (!tournament.name || !tournament.sport || !tournament.format) {
      throw new AppError('Tournament missing required information', 400);
    }

    // Update status to REGISTRATION_OPEN
    await query(
      'UPDATE tournaments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [TournamentStatus.REGISTRATION_OPEN, tournamentId]
    );

    // Send notifications to all users (simplified - will be enhanced with notification service)
    // In a real implementation, this would notify users based on their preferences and location

    return this.getTournament(tournamentId);
  }

  /**
   * Update tournament status
   */
  async updateTournamentStatus(
    tournamentId: string,
    newStatus: TournamentStatus
  ): Promise<Tournament> {
    const tournament = await this.getTournament(tournamentId);

    // Validate status transition
    const validTransitions: Record<TournamentStatus, TournamentStatus[]> = {
      [TournamentStatus.DRAFT]: [TournamentStatus.REGISTRATION_OPEN],
      [TournamentStatus.REGISTRATION_OPEN]: [
        TournamentStatus.REGISTRATION_CLOSED,
        TournamentStatus.DRAFT,
      ],
      [TournamentStatus.REGISTRATION_CLOSED]: [TournamentStatus.FIXTURES_PUBLISHED],
      [TournamentStatus.FIXTURES_PUBLISHED]: [TournamentStatus.IN_PROGRESS],
      [TournamentStatus.IN_PROGRESS]: [TournamentStatus.COMPLETED],
      [TournamentStatus.COMPLETED]: [],
    };

    const allowedTransitions = validTransitions[tournament.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${tournament.status} to ${newStatus}`,
        400
      );
    }

    // Update status
    await query(
      'UPDATE tournaments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, tournamentId]
    );

    // Send notifications to registered teams
    await this.sendStatusChangeNotifications(tournamentId, newStatus);

    return this.getTournament(tournamentId);
  }

  /**
   * Check if registration deadline has passed
   */
  async enforceRegistrationDeadline(tournamentId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);

    if (tournament.status === TournamentStatus.REGISTRATION_OPEN) {
      const now = new Date();
      const deadline = new Date(tournament.registrationDeadline);

      if (now >= deadline) {
        // Automatically close registration
        await this.updateTournamentStatus(tournamentId, TournamentStatus.REGISTRATION_CLOSED);
      }
    }
  }

  /**
   * Register team for tournament
   * Creates a registration record and returns payment info if fee is required
   */
  async registerTeam(tournamentId: string, teamId: string): Promise<Registration> {
    const tournament = await this.getTournament(tournamentId);

    // Enforce registration deadline (Requirement 5.6)
    const now = new Date();
    const deadline = new Date(tournament.registrationDeadline);

    if (now >= deadline) {
      throw new AppError('Registration deadline has passed', 400);
    }

    // Check if registration is open (Requirement 5.1)
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new AppError('Tournament registration is not open', 400);
    }

    // Enforce team capacity (Requirement 5.1)
    const confirmedRegistrations = tournament.registrations.filter(
      (r) => r.status === RegistrationStatus.CONFIRMED
    );

    if (confirmedRegistrations.length >= tournament.teamCapacity) {
      throw new AppError('Tournament is at full capacity', 400);
    }

    // Check if team is already registered
    const existingRegistration = tournament.registrations.find((r) => r.teamId === teamId);
    if (existingRegistration) {
      throw new AppError('Team is already registered for this tournament', 400);
    }

    // Validate team exists and sport matches (Requirement 5.1)
    const teamResult = await query('SELECT sport FROM teams WHERE id = $1', [teamId]);
    if (teamResult.rows.length === 0) {
      throw new AppError('Team not found', 404);
    }

    const teamSport = teamResult.rows[0].sport;
    if (teamSport !== tournament.sport) {
      throw new AppError(
        `Team sport (${teamSport}) does not match tournament sport (${tournament.sport})`,
        400
      );
    }

    // Validate roster meets minimum requirements (Requirement 5.1)
    const rosterResult = await query(
      'SELECT COUNT(*) as player_count FROM team_rosters WHERE team_id = $1',
      [teamId]
    );
    
    const playerCount = parseInt(rosterResult.rows[0].player_count);
    const minPlayers = this.getMinimumPlayersForSport(teamSport);
    
    if (playerCount < minPlayers) {
      throw new AppError(
        `Team roster must have at least ${minPlayers} players for ${teamSport}`,
        400
      );
    }

    // Create registration
    // If registration fee is 0, automatically confirm registration
    // Otherwise, registration stays pending until payment is completed
    const status = tournament.registrationFee === 0 
      ? RegistrationStatus.CONFIRMED 
      : RegistrationStatus.PENDING;

    const result = await query(
      `INSERT INTO tournament_registrations (tournament_id, team_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tournamentId, teamId, status]
    );

    const registration = result.rows[0];

    // If registration is confirmed (free tournament), send notification
    if (status === RegistrationStatus.CONFIRMED) {
      await this.sendRegistrationConfirmationNotification(teamId, tournamentId);
    }

    return {
      id: registration.id,
      tournamentId: registration.tournament_id,
      teamId: registration.team_id,
      status: registration.status as RegistrationStatus,
      paymentId: registration.payment_id,
      registeredAt: registration.registered_at,
    };
  }

  /**
   * Get minimum players required for a sport
   */
  private getMinimumPlayersForSport(sport: string): number {
    const minimums: Record<string, number> = {
      CRICKET: 11,
      FOOTBALL: 11,
      KABADDI: 7,
      VOLLEYBALL: 6,
    };
    return minimums[sport] || 1;
  }

  /**
   * Send registration confirmation notification
   */
  private async sendRegistrationConfirmationNotification(
    teamId: string,
    tournamentId: string
  ): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    const teamResult = await query('SELECT host_id, name FROM teams WHERE id = $1', [teamId]);
    
    if (teamResult.rows.length === 0) return;

    const team = teamResult.rows[0];

    // Send notification to team host
    await query(
      `INSERT INTO notifications (user_id, type, title, message, channels, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        team.host_id,
        'REGISTRATION_CONFIRMED',
        'Registration Confirmed',
        `Your team "${team.name}" has been successfully registered for "${tournament.name}"`,
        ['IN_APP', 'EMAIL'],
        JSON.stringify({ tournamentId, teamId }),
      ]
    );

    // Get all team members and send notifications
    const membersResult = await query(
      'SELECT player_id FROM team_rosters WHERE team_id = $1',
      [teamId]
    );

    for (const member of membersResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          member.player_id,
          'REGISTRATION_CONFIRMED',
          'Team Registration Confirmed',
          `Your team "${team.name}" has been registered for "${tournament.name}"`,
          ['IN_APP', 'EMAIL'],
          JSON.stringify({ tournamentId, teamId }),
        ]
      );
    }
  }

  /**
   * Get registrations for a tournament
   */
  async getRegistrations(tournamentId: string): Promise<Registration[]> {
    const result = await query(
      'SELECT * FROM tournament_registrations WHERE tournament_id = $1 ORDER BY registered_at ASC',
      [tournamentId]
    );

    return result.rows.map((r) => ({
      id: r.id,
      tournamentId: r.tournament_id,
      teamId: r.team_id,
      status: r.status as RegistrationStatus,
      paymentId: r.payment_id,
      registeredAt: r.registered_at,
    }));
  }

  /**
   * Send status change notifications (simplified)
   */
  private async sendStatusChangeNotifications(
    tournamentId: string,
    newStatus: TournamentStatus
  ): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    const registrations = await this.getRegistrations(tournamentId);

    // Get all team hosts
    const teamIds = registrations.map((r) => r.teamId);
    if (teamIds.length === 0) return;

    const teamsResult = await query(
      `SELECT host_id FROM teams WHERE id = ANY($1)`,
      [teamIds]
    );

    const hostIds = teamsResult.rows.map((t) => t.host_id);

    // Send notification to each host
    for (const hostId of hostIds) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          hostId,
          'TOURNAMENT_UPDATE',
          'Tournament Status Update',
          `Tournament "${tournament.name}" status changed to ${newStatus}`,
          ['IN_APP', 'EMAIL'],
        ]
      );
    }
  }

  /**
   * Generate fixtures for a tournament based on its format
   * Requirements: 6.1
   */
  async generateFixtures(tournamentId: string): Promise<Fixture[]> {
    const tournament = await this.getTournament(tournamentId);

    // Validate tournament status
    if (tournament.status !== TournamentStatus.REGISTRATION_CLOSED) {
      throw new AppError('Can only generate fixtures after registration is closed', 400);
    }

    // Get confirmed registrations
    const confirmedRegistrations = tournament.registrations.filter(
      (r) => r.status === RegistrationStatus.CONFIRMED
    );

    if (confirmedRegistrations.length < 2) {
      throw new AppError('Need at least 2 teams to generate fixtures', 400);
    }

    const teamIds = confirmedRegistrations.map((r) => r.teamId);

    // Generate fixtures based on format
    let fixtures: Fixture[];
    switch (tournament.format) {
      case TournamentFormat.LEAGUE:
        fixtures = await this.generateRoundRobinFixtures(tournamentId, teamIds, tournament);
        break;
      case TournamentFormat.KNOCKOUT:
        fixtures = await this.generateKnockoutFixtures(tournamentId, teamIds, tournament);
        break;
      case TournamentFormat.GROUP_KNOCKOUT:
        fixtures = await this.generateGroupKnockoutFixtures(tournamentId, teamIds, tournament);
        break;
      default:
        throw new AppError(`Unsupported tournament format: ${tournament.format}`, 400);
    }

    return fixtures;
  }

  /**
   * Generate round-robin fixtures (League format)
   * Each team plays every other team exactly once
   * Requirements: 6.2, 6.5
   */
  private async generateRoundRobinFixtures(
    tournamentId: string,
    teamIds: string[],
    tournament: Tournament
  ): Promise<Fixture[]> {
    const fixtures: Fixture[] = [];
    let matchNumber = 1;

    // Generate all pairings - each team plays every other team once
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const homeTeamId = teamIds[i];
        const awayTeamId = teamIds[j];

        // Calculate scheduled date (distribute matches across tournament duration)
        const scheduledDate = this.calculateScheduledDate(
          tournament.dates.startDate,
          tournament.dates.endDate,
          matchNumber - 1,
          fixtures.length
        );

        // Insert fixture into database
        const result = await query(
          `INSERT INTO fixtures (
            tournament_id, match_number, home_team_id, away_team_id,
            scheduled_date, venue, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            tournamentId,
            matchNumber,
            homeTeamId,
            awayTeamId,
            scheduledDate,
            tournament.venue,
            'SCHEDULED',
          ]
        );

        const row = result.rows[0];
        fixtures.push({
          id: row.id,
          tournamentId: row.tournament_id,
          matchNumber: row.match_number,
          homeTeamId: row.home_team_id,
          awayTeamId: row.away_team_id,
          scheduledDate: row.scheduled_date,
          venue: row.venue,
          status: row.status,
          matchId: row.match_id,
        });

        matchNumber++;
      }
    }

    return fixtures;
  }

  /**
   * Generate knockout fixtures (single-elimination bracket)
   * Requirements: 6.3
   */
  private async generateKnockoutFixtures(
    tournamentId: string,
    teamIds: string[],
    tournament: Tournament
  ): Promise<Fixture[]> {
    const fixtures: Fixture[] = [];
    const numTeams = teamIds.length;

    // Calculate number of rounds needed
    const numRounds = Math.ceil(Math.log2(numTeams));
    const firstRoundMatches = Math.ceil(numTeams / 2);

    // Shuffle teams for random bracket seeding
    const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

    let matchNumber = 1;

    // Generate first round fixtures
    for (let i = 0; i < firstRoundMatches; i++) {
      const homeTeamId = shuffledTeams[i * 2];
      const awayTeamId = shuffledTeams[i * 2 + 1] || null; // null means bye

      // Skip if no away team (bye)
      if (!awayTeamId) {
        continue;
      }

      const scheduledDate = this.calculateScheduledDate(
        tournament.dates.startDate,
        tournament.dates.endDate,
        0, // First round
        numRounds
      );

      const result = await query(
        `INSERT INTO fixtures (
          tournament_id, match_number, home_team_id, away_team_id,
          scheduled_date, venue, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tournamentId,
          matchNumber,
          homeTeamId,
          awayTeamId,
          scheduledDate,
          tournament.venue,
          'SCHEDULED',
        ]
      );

      const row = result.rows[0];
      fixtures.push({
        id: row.id,
        tournamentId: row.tournament_id,
        matchNumber: row.match_number,
        homeTeamId: row.home_team_id,
        awayTeamId: row.away_team_id,
        scheduledDate: row.scheduled_date,
        venue: row.venue,
        status: row.status,
        matchId: row.match_id,
      });

      matchNumber++;
    }

    // Generate placeholder fixtures for subsequent rounds
    // These will be updated with actual teams as matches are completed
    let teamsInRound = firstRoundMatches;
    for (let round = 1; round < numRounds; round++) {
      teamsInRound = Math.ceil(teamsInRound / 2);

      for (let i = 0; i < teamsInRound; i++) {
        const scheduledDate = this.calculateScheduledDate(
          tournament.dates.startDate,
          tournament.dates.endDate,
          round,
          numRounds
        );

        const result = await query(
          `INSERT INTO fixtures (
            tournament_id, match_number, home_team_id, away_team_id,
            scheduled_date, venue, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            tournamentId,
            matchNumber,
            'TBD', // To be determined after previous round
            'TBD',
            scheduledDate,
            tournament.venue,
            'SCHEDULED',
          ]
        );

        const row = result.rows[0];
        fixtures.push({
          id: row.id,
          tournamentId: row.tournament_id,
          matchNumber: row.match_number,
          homeTeamId: row.home_team_id,
          awayTeamId: row.away_team_id,
          scheduledDate: row.scheduled_date,
          venue: row.venue,
          status: row.status,
          matchId: row.match_id,
        });

        matchNumber++;
      }
    }

    return fixtures;
  }

  /**
   * Generate group + knockout fixtures
   * Requirements: 6.4
   */
  private async generateGroupKnockoutFixtures(
    tournamentId: string,
    teamIds: string[],
    tournament: Tournament
  ): Promise<Fixture[]> {
    const fixtures: Fixture[] = [];
    const numTeams = teamIds.length;

    // Determine number of groups (typically 4 groups for 8+ teams, 2 groups for 4-7 teams)
    let numGroups: number;
    if (numTeams >= 8) {
      numGroups = 4;
    } else if (numTeams >= 4) {
      numGroups = 2;
    } else {
      throw new AppError('Need at least 4 teams for Group+Knockout format', 400);
    }

    const teamsPerGroup = Math.ceil(numTeams / numGroups);

    // Shuffle teams for random group assignment
    const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

    // Divide teams into groups
    const groups: string[][] = [];
    for (let i = 0; i < numGroups; i++) {
      const groupTeams = shuffledTeams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
      if (groupTeams.length > 0) {
        groups.push(groupTeams);
      }
    }

    let matchNumber = 1;

    // Generate round-robin fixtures for each group
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const groupTeams = groups[groupIndex];

      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const homeTeamId = groupTeams[i];
          const awayTeamId = groupTeams[j];

          // Group stage matches scheduled in first half of tournament
          const groupStageEnd = new Date(tournament.dates.startDate);
          const tournamentDuration =
            new Date(tournament.dates.endDate).getTime() -
            new Date(tournament.dates.startDate).getTime();
          groupStageEnd.setTime(
            groupStageEnd.getTime() + tournamentDuration * 0.6 // 60% for group stage
          );

          const scheduledDate = this.calculateScheduledDate(
            tournament.dates.startDate,
            groupStageEnd,
            matchNumber - 1,
            (numTeams * (numTeams - 1)) / (2 * numGroups) // Approximate group stage matches
          );

          const result = await query(
            `INSERT INTO fixtures (
              tournament_id, match_number, home_team_id, away_team_id,
              scheduled_date, venue, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
              tournamentId,
              matchNumber,
              homeTeamId,
              awayTeamId,
              scheduledDate,
              tournament.venue,
              'SCHEDULED',
            ]
          );

          const row = result.rows[0];
          fixtures.push({
            id: row.id,
            tournamentId: row.tournament_id,
            matchNumber: row.match_number,
            homeTeamId: row.home_team_id,
            awayTeamId: row.away_team_id,
            scheduledDate: row.scheduled_date,
            venue: row.venue,
            status: row.status,
            matchId: row.match_id,
          });

          matchNumber++;
        }
      }
    }

    // Generate knockout stage fixtures (top 2 from each group typically)
    const qualifiersPerGroup = 2;
    const numQualifiers = Math.min(groups.length * qualifiersPerGroup, numTeams);
    const knockoutRounds = Math.ceil(Math.log2(numQualifiers));

    // Generate placeholder knockout fixtures
    let teamsInRound = Math.ceil(numQualifiers / 2);
    for (let round = 0; round < knockoutRounds; round++) {
      for (let i = 0; i < teamsInRound; i++) {
        // Knockout stage scheduled in second half of tournament
        const groupStageEnd = new Date(tournament.dates.startDate);
        const tournamentDuration =
          new Date(tournament.dates.endDate).getTime() -
          new Date(tournament.dates.startDate).getTime();
        groupStageEnd.setTime(groupStageEnd.getTime() + tournamentDuration * 0.6);

        const scheduledDate = this.calculateScheduledDate(
          groupStageEnd,
          tournament.dates.endDate,
          round,
          knockoutRounds
        );

        const result = await query(
          `INSERT INTO fixtures (
            tournament_id, match_number, home_team_id, away_team_id,
            scheduled_date, venue, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            tournamentId,
            matchNumber,
            'TBD', // To be determined after group stage
            'TBD',
            scheduledDate,
            tournament.venue,
            'SCHEDULED',
          ]
        );

        const row = result.rows[0];
        fixtures.push({
          id: row.id,
          tournamentId: row.tournament_id,
          matchNumber: row.match_number,
          homeTeamId: row.home_team_id,
          awayTeamId: row.away_team_id,
          scheduledDate: row.scheduled_date,
          venue: row.venue,
          status: row.status,
          matchId: row.match_id,
        });

        matchNumber++;
      }

      teamsInRound = Math.ceil(teamsInRound / 2);
    }

    return fixtures;
  }

  /**
   * Calculate scheduled date for a match
   * Distributes matches evenly across the tournament duration
   */
  private calculateScheduledDate(
    startDate: Date,
    endDate: Date,
    matchIndex: number,
    totalMatches: number
  ): Date {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const duration = end - start;

    // Distribute matches evenly across the duration
    const interval = totalMatches > 1 ? duration / (totalMatches - 1) : 0;
    const scheduledTime = start + interval * matchIndex;

    return new Date(scheduledTime);
  }

  /**
   * Update fixture details (date, time, venue)
   * Requirements: 6.6
   */
  async updateFixture(fixtureId: string, updates: FixtureUpdate): Promise<Fixture> {
    // Get existing fixture
    const fixtureResult = await query('SELECT * FROM fixtures WHERE id = $1', [fixtureId]);

    if (fixtureResult.rows.length === 0) {
      throw new AppError('Fixture not found', 404);
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.scheduledDate !== undefined) {
      const scheduledDate = new Date(updates.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        throw new AppError('Invalid scheduled date format', 400);
      }
      fields.push(`scheduled_date = $${paramIndex++}`);
      values.push(scheduledDate);
    }

    if (updates.venue !== undefined) {
      fields.push(`venue = $${paramIndex++}`);
      values.push(updates.venue);
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(fixtureId);

    const result = await query(
      `UPDATE fixtures SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    const row = result.rows[0];
    return {
      id: row.id,
      tournamentId: row.tournament_id,
      matchNumber: row.match_number,
      homeTeamId: row.home_team_id,
      awayTeamId: row.away_team_id,
      scheduledDate: row.scheduled_date,
      venue: row.venue,
      status: row.status,
      matchId: row.match_id,
    };
  }

  /**
   * Publish fixtures and notify teams
   * Requirements: 6.7
   */
  async publishFixtures(tournamentId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);

    // Validate tournament has fixtures
    if (tournament.fixtures.length === 0) {
      throw new AppError('No fixtures to publish', 400);
    }

    // Update tournament status to FIXTURES_PUBLISHED
    await this.updateTournamentStatus(tournamentId, TournamentStatus.FIXTURES_PUBLISHED);

    // Send notifications to all registered teams
    const registrations = tournament.registrations.filter(
      (r) => r.status === RegistrationStatus.CONFIRMED
    );

    for (const registration of registrations) {
      const teamResult = await query('SELECT host_id, name FROM teams WHERE id = $1', [
        registration.teamId,
      ]);

      if (teamResult.rows.length === 0) continue;

      const team = teamResult.rows[0];

      // Notify team host
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          team.host_id,
          'FIXTURES_PUBLISHED',
          'Fixtures Published',
          `Fixtures for "${tournament.name}" have been published. Check your match schedule!`,
          ['IN_APP', 'EMAIL'],
          JSON.stringify({ tournamentId }),
        ]
      );

      // Notify all team members
      const membersResult = await query(
        'SELECT player_id FROM team_rosters WHERE team_id = $1',
        [registration.teamId]
      );

      for (const member of membersResult.rows) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, channels, data)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            member.player_id,
            'FIXTURES_PUBLISHED',
            'Fixtures Published',
            `Fixtures for "${tournament.name}" have been published. Your team "${team.name}" can now see the match schedule!`,
            ['IN_APP', 'EMAIL'],
            JSON.stringify({ tournamentId, teamId: registration.teamId }),
          ]
        );
      }
    }
  }
}

export const tournamentService = new TournamentService();
