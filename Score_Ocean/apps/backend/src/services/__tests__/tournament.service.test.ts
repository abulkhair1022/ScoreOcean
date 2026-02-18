import { tournamentService } from '../tournament.service';
import { query } from '../../db/postgres';
import { TournamentFormat, TournamentStatus, Sport, RegistrationStatus } from '@score-ocean/types';

// Mock the database
jest.mock('../../db/postgres');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('TournamentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('createTournament', () => {
    const validTournamentData = {
      name: 'Summer Cricket League',
      sport: Sport.CRICKET,
      format: TournamentFormat.LEAGUE,
      dates: {
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
      },
      venue: 'City Stadium',
      registrationFee: 1000,
      registrationDeadline: new Date('2024-05-25'),
      teamCapacity: 8,
      rules: {
        matchDuration: 90,
        pointsForWin: 2,
        pointsForDraw: 1,
        pointsForLoss: 0,
      },
    };

    it('should create a tournament with valid data', async () => {
      const hostId = 'user-123';
      const mockTournamentRow = {
        id: 'tournament-123',
        name: validTournamentData.name,
        sport: validTournamentData.sport,
        format: validTournamentData.format,
        host_id: hostId,
        host_type: 'TEAM',
        start_date: validTournamentData.dates.startDate,
        end_date: validTournamentData.dates.endDate,
        venue: validTournamentData.venue,
        registration_fee: validTournamentData.registrationFee,
        registration_deadline: validTournamentData.registrationDeadline,
        team_capacity: validTournamentData.teamCapacity,
        status: TournamentStatus.DRAFT,
        rules: validTournamentData.rules,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'TEAM' }],
        rowCount: 1,
      } as any);

      // Mock tournament insert
      mockQuery.mockResolvedValueOnce({
        rows: [mockTournamentRow],
        rowCount: 1,
      } as any);

      // Mock registrations query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock fixtures query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const tournament = await tournamentService.createTournament(hostId, validTournamentData);

      expect(tournament).toBeDefined();
      expect(tournament.id).toBe('tournament-123');
      expect(tournament.name).toBe(validTournamentData.name);
      expect(tournament.sport).toBe(validTournamentData.sport);
      expect(tournament.format).toBe(validTournamentData.format);
      expect(tournament.status).toBe(TournamentStatus.DRAFT);
      expect(tournament.hostId).toBe(hostId);
      expect(tournament.hostType).toBe('TEAM');
    });

    it('should reject invalid tournament format', async () => {
      const hostId = 'user-123';
      const invalidData = {
        ...validTournamentData,
        format: 'INVALID_FORMAT' as any,
      };

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'TEAM' }],
        rowCount: 1,
      } as any);

      await expect(tournamentService.createTournament(hostId, invalidData)).rejects.toThrow(
        'Invalid tournament format'
      );
    });

    it('should reject tournament with end date before start date', async () => {
      const hostId = 'user-123';
      const invalidData = {
        ...validTournamentData,
        dates: {
          startDate: new Date('2024-06-30'),
          endDate: new Date('2024-06-01'),
        },
      };

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'TEAM' }],
        rowCount: 1,
      } as any);

      await expect(tournamentService.createTournament(hostId, invalidData)).rejects.toThrow(
        'End date must be after start date'
      );
    });

    it('should reject tournament with registration deadline after start date', async () => {
      const hostId = 'user-123';
      const invalidData = {
        ...validTournamentData,
        registrationDeadline: new Date('2024-06-15'),
      };

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'TEAM' }],
        rowCount: 1,
      } as any);

      await expect(tournamentService.createTournament(hostId, invalidData)).rejects.toThrow(
        'Registration deadline must be before tournament start date'
      );
    });

    it('should allow TEAM role to create tournaments', async () => {
      const hostId = 'user-123';
      const mockTournamentRow = {
        id: 'tournament-123',
        name: validTournamentData.name,
        sport: validTournamentData.sport,
        format: validTournamentData.format,
        host_id: hostId,
        host_type: 'TEAM',
        start_date: validTournamentData.dates.startDate,
        end_date: validTournamentData.dates.endDate,
        venue: validTournamentData.venue,
        registration_fee: validTournamentData.registrationFee,
        registration_deadline: validTournamentData.registrationDeadline,
        team_capacity: validTournamentData.teamCapacity,
        status: TournamentStatus.DRAFT,
        rules: validTournamentData.rules,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'TEAM' }],
        rowCount: 1,
      } as any);

      // Mock tournament insert
      mockQuery.mockResolvedValueOnce({
        rows: [mockTournamentRow],
        rowCount: 1,
      } as any);

      // Mock registrations and fixtures queries
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const tournament = await tournamentService.createTournament(hostId, validTournamentData);

      expect(tournament.hostType).toBe('TEAM');
    });

    it('should allow ORGANIZATION role to create tournaments', async () => {
      const hostId = 'user-123';
      const mockTournamentRow = {
        id: 'tournament-123',
        name: validTournamentData.name,
        sport: validTournamentData.sport,
        format: validTournamentData.format,
        host_id: hostId,
        host_type: 'ORGANIZATION',
        start_date: validTournamentData.dates.startDate,
        end_date: validTournamentData.dates.endDate,
        venue: validTournamentData.venue,
        registration_fee: validTournamentData.registrationFee,
        registration_deadline: validTournamentData.registrationDeadline,
        team_capacity: validTournamentData.teamCapacity,
        status: TournamentStatus.DRAFT,
        rules: validTournamentData.rules,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'ORGANIZATION' }],
        rowCount: 1,
      } as any);

      // Mock tournament insert
      mockQuery.mockResolvedValueOnce({
        rows: [mockTournamentRow],
        rowCount: 1,
      } as any);

      // Mock registrations and fixtures queries
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const tournament = await tournamentService.createTournament(hostId, validTournamentData);

      expect(tournament.hostType).toBe('ORGANIZATION');
    });

    it('should allow PLAYER role to create tournaments', async () => {
      const hostId = 'user-123';
      const mockTournamentRow = {
        id: 'tournament-123',
        name: validTournamentData.name,
        sport: validTournamentData.sport,
        format: validTournamentData.format,
        host_id: hostId,
        host_type: 'ORGANIZATION',
        start_date: validTournamentData.dates.startDate,
        end_date: validTournamentData.dates.endDate,
        venue: validTournamentData.venue,
        registration_fee: validTournamentData.registrationFee,
        registration_deadline: validTournamentData.registrationDeadline,
        team_capacity: validTournamentData.teamCapacity,
        status: TournamentStatus.DRAFT,
        rules: validTournamentData.rules,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'PLAYER' }],
        rowCount: 1,
      } as any);

      // Mock tournament insert
      mockQuery.mockResolvedValueOnce({
        rows: [mockTournamentRow],
        rowCount: 1,
      } as any);

      // Mock registrations and fixtures queries
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const tournament = await tournamentService.createTournament(hostId, validTournamentData);

      expect(tournament.hostType).toBe('ORGANIZATION');
    });

    it('should validate team capacity range', async () => {
      const hostId = 'user-123';

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'TEAM' }],
        rowCount: 1,
      } as any);

      const invalidData = {
        ...validTournamentData,
        teamCapacity: 1,
      };

      await expect(tournamentService.createTournament(hostId, invalidData)).rejects.toThrow(
        'Team capacity must be between 2 and 100'
      );
    });

    it('should validate registration fee is not negative', async () => {
      const hostId = 'user-123';

      // Mock user role query
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'TEAM' }],
        rowCount: 1,
      } as any);

      const invalidData = {
        ...validTournamentData,
        registrationFee: -100,
      };

      await expect(tournamentService.createTournament(hostId, invalidData)).rejects.toThrow(
        'Registration fee cannot be negative'
      );
    });
  });

  describe('getTournament', () => {
    it('should retrieve tournament by ID', async () => {
      const tournamentId = 'tournament-123';
      const mockTournamentRow = {
        id: tournamentId,
        name: 'Summer Cricket League',
        sport: Sport.CRICKET,
        format: TournamentFormat.LEAGUE,
        host_id: 'user-123',
        host_type: 'TEAM',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-30'),
        venue: 'City Stadium',
        registration_fee: 1000,
        registration_deadline: new Date('2024-05-25'),
        team_capacity: 8,
        status: TournamentStatus.DRAFT,
        rules: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock tournament query
      mockQuery.mockResolvedValueOnce({
        rows: [mockTournamentRow],
        rowCount: 1,
      } as any);

      // Mock registrations query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock fixtures query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const tournament = await tournamentService.getTournament(tournamentId);

      expect(tournament).toBeDefined();
      expect(tournament.id).toBe(tournamentId);
      expect(tournament.name).toBe('Summer Cricket League');
    });

    it('should throw error if tournament not found', async () => {
      const tournamentId = 'non-existent';

      // Mock tournament query returning empty
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(tournamentService.getTournament(tournamentId)).rejects.toThrow(
        'Tournament not found'
      );
    });
  });

  describe('updateTournament', () => {
    it('should update tournament in DRAFT status', async () => {
      const tournamentId = 'tournament-123';
      const updates = {
        name: 'Updated Tournament Name',
        teamCapacity: 16,
      };

      // Mock get tournament (for status check)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.DRAFT,
            name: 'Old Name',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'City Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock registrations and fixtures for getTournament
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock update query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      // Mock get tournament after update
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.DRAFT,
            name: updates.name,
            team_capacity: updates.teamCapacity,
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'City Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const tournament = await tournamentService.updateTournament(tournamentId, updates);

      expect(tournament.name).toBe(updates.name);
      expect(tournament.teamCapacity).toBe(updates.teamCapacity);
    });

    it('should reject updates to non-DRAFT tournaments', async () => {
      const tournamentId = 'tournament-123';

      // Mock get tournament with non-DRAFT status
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Tournament',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'City Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        tournamentService.updateTournament(tournamentId, { name: 'New Name' })
      ).rejects.toThrow('Can only update tournaments in DRAFT status');
    });
  });

  describe('deleteTournament', () => {
    it('should delete tournament', async () => {
      const tournamentId = 'tournament-123';

      // Mock delete query with rowCount = 1 (successful deletion)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      await expect(tournamentService.deleteTournament(tournamentId)).resolves.not.toThrow();
    });

    it('should throw error if tournament not found', async () => {
      const tournamentId = 'non-existent';

      // Mock delete query with rowCount = 0 (no rows deleted)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(tournamentService.deleteTournament(tournamentId)).rejects.toThrow(
        'Tournament not found'
      );
    });
  });

  describe('publishTournament', () => {
    it('should publish tournament from DRAFT to REGISTRATION_OPEN', async () => {
      const tournamentId = 'tournament-123';

      // Mock get tournament (DRAFT status)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            name: 'Test Tournament',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            status: TournamentStatus.DRAFT,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock get tournament after update
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            name: 'Test Tournament',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            status: TournamentStatus.REGISTRATION_OPEN,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const tournament = await tournamentService.publishTournament(tournamentId);

      expect(tournament.status).toBe(TournamentStatus.REGISTRATION_OPEN);
    });

    it('should reject publishing non-DRAFT tournaments', async () => {
      const tournamentId = 'tournament-123';

      // Mock get tournament (already published)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(tournamentService.publishTournament(tournamentId)).rejects.toThrow(
        'Can only publish tournaments in DRAFT status'
      );
    });
  });

  describe('updateTournamentStatus', () => {
    it('should allow valid status transitions', async () => {
      const tournamentId = 'tournament-123';

      // Mock first getTournament call (for validation)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock registrations query for first getTournament
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      // Mock fixtures query for first getTournament
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock getTournament for sendStatusChangeNotifications
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_CLOSED,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock registrations query for sendStatusChangeNotifications getTournament
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      // Mock fixtures query for sendStatusChangeNotifications getTournament
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock getRegistrations query in sendStatusChangeNotifications
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock final getTournament call (return value)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_CLOSED,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock registrations query for final getTournament
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      
      // Mock fixtures query for final getTournament
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const tournament = await tournamentService.updateTournamentStatus(
        tournamentId,
        TournamentStatus.REGISTRATION_CLOSED
      );

      expect(tournament.status).toBe(TournamentStatus.REGISTRATION_CLOSED);
    });

    it('should reject invalid status transitions', async () => {
      const tournamentId = 'tournament-123';

      // Mock get tournament (DRAFT)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.DRAFT,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        tournamentService.updateTournamentStatus(tournamentId, TournamentStatus.COMPLETED)
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('registerTeam', () => {
    it('should register team for open tournament', async () => {
      const tournamentId = 'tournament-123';
      const teamId = 'team-123';

      // Mock get tournament (REGISTRATION_OPEN, before deadline, has capacity)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2026-06-01'),
            end_date: new Date('2026-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2026-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock team query
      mockQuery.mockResolvedValueOnce({
        rows: [{ sport: Sport.CRICKET }],
        rowCount: 1,
      } as any);

      // Mock registration insert
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'registration-123',
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.PENDING,
            registered_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      const registration = await tournamentService.registerTeam(tournamentId, teamId);

      expect(registration).toBeDefined();
      expect(registration.tournamentId).toBe(tournamentId);
      expect(registration.teamId).toBe(teamId);
      expect(registration.status).toBe(RegistrationStatus.PENDING);
    });

    it('should reject registration after deadline', async () => {
      const tournamentId = 'tournament-123';
      const teamId = 'team-123';

      // Mock get tournament (deadline passed - using 2024 dates)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(tournamentService.registerTeam(tournamentId, teamId)).rejects.toThrow(
        'Registration deadline has passed'
      );
    });

    it('should reject registration when tournament is at capacity', async () => {
      const tournamentId = 'tournament-123';
      const teamId = 'team-123';

      // Mock get tournament (at capacity, with future deadline)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2026-06-01'),
            end_date: new Date('2026-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2026-05-25'),
            team_capacity: 2,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock registrations (2 confirmed, at capacity)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'reg-1',
            tournament_id: tournamentId,
            team_id: 'team-1',
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          },
          {
            id: 'reg-2',
            tournament_id: tournamentId,
            team_id: 'team-2',
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          },
        ],
        rowCount: 2,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(tournamentService.registerTeam(tournamentId, teamId)).rejects.toThrow(
        'Tournament is at full capacity'
      );
    });

    it('should reject registration for wrong sport', async () => {
      const tournamentId = 'tournament-123';
      const teamId = 'team-123';

      // Mock get tournament (CRICKET, with future deadline)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'user-123',
            host_type: 'TEAM',
            start_date: new Date('2026-06-01'),
            end_date: new Date('2026-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2026-05-25'),
            team_capacity: 8,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock team query (FOOTBALL team)
      mockQuery.mockResolvedValueOnce({
        rows: [{ sport: Sport.FOOTBALL }],
        rowCount: 1,
      } as any);

      await expect(tournamentService.registerTeam(tournamentId, teamId)).rejects.toThrow(
        'Team sport (FOOTBALL) does not match tournament sport (CRICKET)'
      );
    });
  });
});
