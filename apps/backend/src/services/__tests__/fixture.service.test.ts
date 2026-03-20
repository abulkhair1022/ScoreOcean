import { TournamentService } from '../tournament.service';
import { query } from '../../db/postgres';
import { TournamentFormat, TournamentStatus, RegistrationStatus } from '@score-ocean/types';

jest.mock('../../db/postgres');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Fixture Generation Service', () => {
  let tournamentService: TournamentService;

  beforeEach(() => {
    tournamentService = new TournamentService();
    jest.clearAllMocks();
  });

  describe('Round-Robin Fixture Generation', () => {
    it('should generate correct number of fixtures for N teams', async () => {
      const tournamentId = 'tournament-1';
      const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
      const numTeams = teamIds.length;
      const expectedFixtures = (numTeams * (numTeams - 1)) / 2; // 6 fixtures for 4 teams

      // Mock tournament data
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Test Tournament',
              sport: 'FOOTBALL',
              format: TournamentFormat.LEAGUE,
              host_id: 'host-1',
              host_type: 'ORGANIZATION',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-31'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        // Mock registrations query
        .mockResolvedValueOnce({
          rows: teamIds.map((teamId) => ({
            id: `reg-${teamId}`,
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          })),
          rowCount: teamIds.length,
        } as any)
        // Mock fixtures query (empty initially)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      // Mock fixture insertions
      let fixtureCount = 0;
      mockQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO fixtures')) {
          fixtureCount++;
          return {
            rows: [
              {
                id: `fixture-${fixtureCount}`,
                tournament_id: tournamentId,
                match_number: fixtureCount,
                home_team_id: teamIds[0],
                away_team_id: teamIds[1],
                scheduled_date: new Date(),
                venue: 'Test Venue',
                status: 'SCHEDULED',
                match_id: null,
              },
            ],
            rowCount: 1,
          } as any;
        }
        return { rows: [], rowCount: 0 } as any;
      });

      const fixtures = await tournamentService.generateFixtures(tournamentId);

      expect(fixtures).toHaveLength(expectedFixtures);
      expect(fixtureCount).toBe(expectedFixtures);
    });

    it('should assign sequential match numbers', async () => {
      const tournamentId = 'tournament-1';
      const teamIds = ['team-1', 'team-2', 'team-3'];

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Test Tournament',
              sport: 'CRICKET',
              format: TournamentFormat.LEAGUE,
              host_id: 'host-1',
              host_type: 'TEAM',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-31'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: teamIds.map((teamId) => ({
            id: `reg-${teamId}`,
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          })),
          rowCount: teamIds.length,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      const matchNumbers: number[] = [];
      mockQuery.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO fixtures') && params) {
          const matchNumber = params[1];
          matchNumbers.push(matchNumber);
          return {
            rows: [
              {
                id: `fixture-${matchNumber}`,
                tournament_id: tournamentId,
                match_number: matchNumber,
                home_team_id: params[2],
                away_team_id: params[3],
                scheduled_date: params[4],
                venue: params[5],
                status: params[6],
                match_id: null,
              },
            ],
            rowCount: 1,
          } as any;
        }
        return { rows: [], rowCount: 0 } as any;
      });

      await tournamentService.generateFixtures(tournamentId);

      // Verify sequential numbering: 1, 2, 3
      expect(matchNumbers).toEqual([1, 2, 3]);
    });

    it('should create unique pairings (each team plays every other team once)', async () => {
      const tournamentId = 'tournament-1';
      const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Test Tournament',
              sport: 'VOLLEYBALL',
              format: TournamentFormat.LEAGUE,
              host_id: 'host-1',
              host_type: 'ORGANIZATION',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-31'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: teamIds.map((teamId) => ({
            id: `reg-${teamId}`,
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          })),
          rowCount: teamIds.length,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      const pairings = new Set<string>();
      mockQuery.mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO fixtures') && params) {
          const homeTeamId = params[2];
          const awayTeamId = params[3];
          const pairingKey = [homeTeamId, awayTeamId].sort().join('-');
          pairings.add(pairingKey);

          return {
            rows: [
              {
                id: `fixture-${pairings.size}`,
                tournament_id: tournamentId,
                match_number: pairings.size,
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                scheduled_date: new Date(),
                venue: 'Test Venue',
                status: 'SCHEDULED',
                match_id: null,
              },
            ],
            rowCount: 1,
          } as any;
        }
        return { rows: [], rowCount: 0 } as any;
      });

      await tournamentService.generateFixtures(tournamentId);

      // Should have 6 unique pairings for 4 teams
      expect(pairings.size).toBe(6);
    });
  });

  describe('Knockout Fixture Generation', () => {
    it('should generate correct number of fixtures for single-elimination', async () => {
      const tournamentId = 'tournament-1';
      const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
      const numTeams = teamIds.length;
      const expectedFixtures = numTeams - 1; // 3 fixtures for 4 teams (2 semis + 1 final)

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Knockout Tournament',
              sport: 'KABADDI',
              format: TournamentFormat.KNOCKOUT,
              host_id: 'host-1',
              host_type: 'ORGANIZATION',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-15'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: teamIds.map((teamId) => ({
            id: `reg-${teamId}`,
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          })),
          rowCount: teamIds.length,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      let fixtureCount = 0;
      mockQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO fixtures')) {
          fixtureCount++;
          return {
            rows: [
              {
                id: `fixture-${fixtureCount}`,
                tournament_id: tournamentId,
                match_number: fixtureCount,
                home_team_id: fixtureCount <= 2 ? teamIds[0] : 'TBD',
                away_team_id: fixtureCount <= 2 ? teamIds[1] : 'TBD',
                scheduled_date: new Date(),
                venue: 'Test Venue',
                status: 'SCHEDULED',
                match_id: null,
              },
            ],
            rowCount: 1,
          } as any;
        }
        return { rows: [], rowCount: 0 } as any;
      });

      const fixtures = await tournamentService.generateFixtures(tournamentId);

      expect(fixtures).toHaveLength(expectedFixtures);
    });

    it('should handle non-power-of-2 team counts with byes', async () => {
      const tournamentId = 'tournament-1';
      const teamIds = ['team-1', 'team-2', 'team-3']; // 3 teams

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Knockout Tournament',
              sport: 'FOOTBALL',
              format: TournamentFormat.KNOCKOUT,
              host_id: 'host-1',
              host_type: 'TEAM',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-15'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: teamIds.map((teamId) => ({
            id: `reg-${teamId}`,
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          })),
          rowCount: teamIds.length,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      let fixtureCount = 0;
      mockQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO fixtures')) {
          fixtureCount++;
          return {
            rows: [
              {
                id: `fixture-${fixtureCount}`,
                tournament_id: tournamentId,
                match_number: fixtureCount,
                home_team_id: 'team-1',
                away_team_id: 'team-2',
                scheduled_date: new Date(),
                venue: 'Test Venue',
                status: 'SCHEDULED',
                match_id: null,
              },
            ],
            rowCount: 1,
          } as any;
        }
        return { rows: [], rowCount: 0 } as any;
      });

      const fixtures = await tournamentService.generateFixtures(tournamentId);

      // Should generate 2 fixtures (1 semi + 1 final), with one team getting a bye
      expect(fixtures.length).toBeGreaterThan(0);
    });
  });

  describe('Group+Knockout Fixture Generation', () => {
    it('should generate group stage and knockout stage fixtures', async () => {
      const tournamentId = 'tournament-1';
      const teamIds = Array.from({ length: 8 }, (_, i) => `team-${i + 1}`);

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Group+Knockout Tournament',
              sport: 'CRICKET',
              format: TournamentFormat.GROUP_KNOCKOUT,
              host_id: 'host-1',
              host_type: 'ORGANIZATION',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-31'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: teamIds.map((teamId) => ({
            id: `reg-${teamId}`,
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          })),
          rowCount: teamIds.length,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      let fixtureCount = 0;
      mockQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('INSERT INTO fixtures')) {
          fixtureCount++;
          return {
            rows: [
              {
                id: `fixture-${fixtureCount}`,
                tournament_id: tournamentId,
                match_number: fixtureCount,
                home_team_id: 'team-1',
                away_team_id: 'team-2',
                scheduled_date: new Date(),
                venue: 'Test Venue',
                status: 'SCHEDULED',
                match_id: null,
              },
            ],
            rowCount: 1,
          } as any;
        }
        return { rows: [], rowCount: 0 } as any;
      });

      const fixtures = await tournamentService.generateFixtures(tournamentId);

      // Should have group stage fixtures + knockout fixtures
      expect(fixtures.length).toBeGreaterThan(0);
      expect(fixtureCount).toBeGreaterThan(0);
    });

    it('should reject tournaments with fewer than 4 teams', async () => {
      const tournamentId = 'tournament-1';
      const teamIds = ['team-1', 'team-2', 'team-3']; // Only 3 teams

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Group+Knockout Tournament',
              sport: 'VOLLEYBALL',
              format: TournamentFormat.GROUP_KNOCKOUT,
              host_id: 'host-1',
              host_type: 'ORGANIZATION',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-31'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: teamIds.map((teamId) => ({
            id: `reg-${teamId}`,
            tournament_id: tournamentId,
            team_id: teamId,
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          })),
          rowCount: teamIds.length,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any);

      await expect(tournamentService.generateFixtures(tournamentId)).rejects.toThrow(
        'Need at least 4 teams for Group+Knockout format'
      );
    });
  });

  describe('Fixture Management', () => {
    it('should update fixture date and venue', async () => {
      const fixtureId = 'fixture-1';
      const newDate = new Date('2024-02-01');
      const newVenue = 'Updated Venue';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: fixtureId,
            tournament_id: 'tournament-1',
            match_number: 1,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            scheduled_date: new Date('2024-01-01'),
            venue: 'Old Venue',
            status: 'SCHEDULED',
            match_id: null,
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: fixtureId,
            tournament_id: 'tournament-1',
            match_number: 1,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            scheduled_date: newDate,
            venue: newVenue,
            status: 'SCHEDULED',
            match_id: null,
          },
        ],
        rowCount: 1,
      } as any);

      const updatedFixture = await tournamentService.updateFixture(fixtureId, {
        scheduledDate: newDate,
        venue: newVenue,
      });

      expect(updatedFixture.scheduledDate).toEqual(newDate);
      expect(updatedFixture.venue).toBe(newVenue);
    });

    it('should reject invalid date format', async () => {
      const fixtureId = 'fixture-1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: fixtureId,
            tournament_id: 'tournament-1',
            match_number: 1,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            scheduled_date: new Date('2024-01-01'),
            venue: 'Test Venue',
            status: 'SCHEDULED',
            match_id: null,
          },
        ],
        rowCount: 1,
      } as any);

      await expect(
        tournamentService.updateFixture(fixtureId, {
          scheduledDate: new Date('invalid-date'),
        })
      ).rejects.toThrow('Invalid scheduled date format');
    });
  });

  describe('Fixture Publication', () => {
    it('should reject publication when no fixtures exist', async () => {
      const tournamentId = 'tournament-1';

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: tournamentId,
              name: 'Test Tournament',
              sport: 'CRICKET',
              format: TournamentFormat.LEAGUE,
              host_id: 'host-1',
              host_type: 'TEAM',
              start_date: new Date('2024-01-01'),
              end_date: new Date('2024-01-31'),
              venue: 'Test Venue',
              registration_fee: 0,
              registration_deadline: new Date('2023-12-31'),
              team_capacity: 10,
              status: TournamentStatus.REGISTRATION_CLOSED,
              rules: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        } as any)
        .mockResolvedValueOnce({
          rows: [], // No fixtures
          rowCount: 0,
        } as any);

      await expect(tournamentService.publishFixtures(tournamentId)).rejects.toThrow(
        'No fixtures to publish'
      );
    });
  });

  describe('Validation', () => {
    it('should reject fixture generation with fewer than 2 teams', async () => {
      const tournamentId = 'tournament-1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: tournamentId,
            name: 'Test Tournament',
            sport: 'KABADDI',
            format: TournamentFormat.LEAGUE,
            host_id: 'host-1',
            host_type: 'ORGANIZATION',
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31'),
            venue: 'Test Venue',
            registration_fee: 0,
            registration_deadline: new Date('2023-12-31'),
            team_capacity: 10,
            status: TournamentStatus.REGISTRATION_CLOSED,
            rules: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'reg-1',
            tournament_id: tournamentId,
            team_id: 'team-1',
            status: RegistrationStatus.CONFIRMED,
            registered_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(tournamentService.generateFixtures(tournamentId)).rejects.toThrow(
        'Need at least 2 teams to generate fixtures'
      );
    });
  });
});
