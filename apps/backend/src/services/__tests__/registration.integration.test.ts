import { tournamentService } from '../tournament.service';
import { paymentService } from '../payment.service';
import { query } from '../../db/postgres';
import { TournamentFormat, TournamentStatus, Sport, RegistrationStatus } from '@score-ocean/types';

// Mock the database
jest.mock('../../db/postgres');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Tournament Registration Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('Complete Registration Workflow', () => {
    it('should complete registration workflow for paid tournament', async () => {
      const tournamentId = 'tournament-123';
      const teamId = 'team-123';

      // Step 1: Register team (creates pending registration)
      // Mock get tournament
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test Tournament',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'host-123',
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

      // Mock roster count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ player_count: '11' }],
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

      expect(registration.status).toBe(RegistrationStatus.PENDING);
      expect(registration.tournamentId).toBe(tournamentId);
      expect(registration.teamId).toBe(teamId);

      // Step 2: Verify payment is required
      expect(registration.status).toBe(RegistrationStatus.PENDING);

      // Step 3: Payment webhook would update registration to CONFIRMED
      // This is handled by paymentService.handleWebhook in production
      // The webhook handler updates the registration status to CONFIRMED
      // and sends notifications to team members
    });

    it('should auto-confirm registration for free tournament', async () => {
      const tournamentId = 'tournament-123';
      const teamId = 'team-123';

      // Mock get tournament (free tournament)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Free Tournament',
            sport: Sport.FOOTBALL,
            format: TournamentFormat.KNOCKOUT,
            host_id: 'host-123',
            host_type: 'ORGANIZATION',
            start_date: new Date('2026-06-01'),
            end_date: new Date('2026-06-30'),
            venue: 'Stadium',
            registration_fee: 0, // Free tournament
            registration_deadline: new Date('2026-05-25'),
            team_capacity: 16,
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
        rows: [{ sport: Sport.FOOTBALL }],
        rowCount: 1,
      } as any);

      // Mock roster count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ player_count: '11' }],
        rowCount: 1,
      } as any);

      // Mock registration insert (auto-confirmed)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'registration-123',
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock notification queries
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            name: 'Free Tournament',
            sport: Sport.FOOTBALL,
            format: TournamentFormat.KNOCKOUT,
            status: TournamentStatus.REGISTRATION_OPEN,
            host_id: 'host-123',
            host_type: 'ORGANIZATION',
            start_date: new Date('2026-06-01'),
            end_date: new Date('2026-06-30'),
            venue: 'Stadium',
            registration_fee: 0,
            registration_deadline: new Date('2026-05-25'),
            team_capacity: 16,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ host_id: 'user-123', name: 'Test Team' }],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{ player_id: 'player-1' }],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const registration = await tournamentService.registerTeam(tournamentId, teamId);

      // Should be auto-confirmed for free tournaments
      expect(registration.status).toBe(RegistrationStatus.CONFIRMED);
    });

    it('should enforce all validation rules during registration', async () => {
      const tournamentId = 'tournament-123';
      const teamId = 'team-123';

      // Test 1: Registration deadline passed
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'host-123',
            host_type: 'TEAM',
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2024-05-25'), // Past deadline
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

      jest.clearAllMocks();

      // Test 2: Tournament not open for registration
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.DRAFT, // Not open
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'host-123',
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

      await expect(tournamentService.registerTeam(tournamentId, teamId)).rejects.toThrow(
        'Tournament registration is not open'
      );

      jest.clearAllMocks();

      // Test 3: Tournament at capacity
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            status: TournamentStatus.REGISTRATION_OPEN,
            name: 'Test',
            sport: Sport.CRICKET,
            format: TournamentFormat.LEAGUE,
            host_id: 'host-123',
            host_type: 'TEAM',
            start_date: new Date('2026-06-01'),
            end_date: new Date('2026-06-30'),
            venue: 'Stadium',
            registration_fee: 1000,
            registration_deadline: new Date('2026-05-25'),
            team_capacity: 2, // Capacity of 2
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock 2 confirmed registrations (at capacity)
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
  });

  describe('Payment Integration', () => {
    it('should calculate commission correctly', () => {
      const amount = 1000;
      const commission = paymentService.calculateCommission(amount);

      // Assuming 10% commission rate from config
      expect(commission).toBeGreaterThan(0);
      expect(commission).toBeLessThan(amount);
    });
  });
});
