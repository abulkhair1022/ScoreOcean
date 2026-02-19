import { searchService } from '../search.service';
import { query } from '../../db/postgres';
import { Sport } from '@score-ocean/types';

jest.mock('../../db/postgres');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('SearchService - Filtering (Task 18.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Filter by sport', () => {
    it('should filter players by sport', async () => {
      const searchTerm = 'player';
      const filters = { sport: Sport.CRICKET };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Cricket Player',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              { sport: Sport.CRICKET, statistics: { runs: 500 } },
            ],
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sp.sport'),
        expect.arrayContaining([expect.any(String), Sport.CRICKET])
      );
    });

    it('should filter teams by sport', async () => {
      const searchTerm = 'team';
      const filters = { sport: Sport.FOOTBALL };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'team-1',
            name: 'Football Team',
            sport: Sport.FOOTBALL,
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            statistics: {},
            roster_count: '11',
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchTeams(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(results[0]?.sport).toBe(Sport.FOOTBALL);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('t.sport'),
        expect.arrayContaining([expect.any(String), Sport.FOOTBALL])
      );
    });

    it('should filter tournaments by sport', async () => {
      const searchTerm = 'tournament';
      const filters = { sport: Sport.KABADDI };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'tournament-1',
            name: 'Kabaddi Tournament',
            sport: Sport.KABADDI,
            venue: 'Stadium',
            format: 'LEAGUE',
            status: 'REGISTRATION_OPEN',
            start_date: new Date(),
            end_date: new Date(),
            registration_fee: '1000',
            registration_deadline: new Date(),
            team_capacity: 8,
            registered_teams: '4',
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchTournaments(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(results[0]?.sport).toBe(Sport.KABADDI);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('t.sport'),
        expect.arrayContaining([expect.any(String), Sport.KABADDI])
      );
    });
  });

  describe('Filter by location', () => {
    it('should filter players by city', async () => {
      const searchTerm = 'player';
      const filters = {
        location: { city: 'Mumbai' },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Mumbai Player',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [],
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(results[0]?.location?.city).toBe('Mumbai');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(up.city)'),
        expect.arrayContaining([expect.any(String), 'mumbai'])
      );
    });

    it('should filter players by state', async () => {
      const searchTerm = 'player';
      const filters = {
        location: { state: 'Maharashtra' },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Maharashtra Player',
            city: 'Pune',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [],
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(results[0]?.location?.state).toBe('Maharashtra');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(up.state)'),
        expect.arrayContaining([expect.any(String), 'maharashtra'])
      );
    });

    it('should filter players by country', async () => {
      const searchTerm = 'player';
      const filters = {
        location: { country: 'India' },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Indian Player',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            avatar_url: null,
            sport_profiles: [],
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(results[0]?.location?.country).toBe('India');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(up.country)'),
        expect.arrayContaining([expect.any(String), 'india'])
      );
    });

    it('should filter teams by multiple location fields', async () => {
      const searchTerm = 'team';
      const filters = {
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'team-1',
            name: 'Mumbai Team',
            sport: Sport.CRICKET,
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            statistics: {},
            roster_count: '15',
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchTeams(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(results[0]?.location?.city).toBe('Mumbai');
      expect(results[0]?.location?.state).toBe('Maharashtra');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(t.city)'),
        expect.arrayContaining([expect.any(String), 'mumbai', 'maharashtra'])
      );
    });

    it('should filter tournaments by location (venue)', async () => {
      const searchTerm = 'tournament';
      const filters = {
        location: { city: 'Mumbai' },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'tournament-1',
            name: 'Mumbai Tournament',
            sport: Sport.CRICKET,
            venue: 'Wankhede Stadium, Mumbai',
            format: 'LEAGUE',
            status: 'REGISTRATION_OPEN',
            start_date: new Date(),
            end_date: new Date(),
            registration_fee: '5000',
            registration_deadline: new Date(),
            team_capacity: 16,
            registered_teams: '8',
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchTournaments(searchTerm, filters);

      expect(results).toHaveLength(1);
      expect(results[0]?.metadata?.venue).toContain('Mumbai');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(t.venue) LIKE'),
        expect.arrayContaining([expect.any(String), '%mumbai%'])
      );
    });
  });

  describe('Filter by performance level', () => {
    it('should filter beginner players', async () => {
      const searchTerm = 'player';
      const filters = { performanceLevel: 'beginner' as const };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Beginner Player',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              {
                sport: Sport.CRICKET,
                statistics: {
                  runs: 10,
                  wickets: 1,
                  battingAverage: 5,
                  strikeRate: 50,
                },
              },
            ],
          },
          {
            id: 'player-2',
            name: 'Advanced Player',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              {
                sport: Sport.CRICKET,
                statistics: {
                  runs: 1000,
                  wickets: 50,
                  battingAverage: 50,
                  strikeRate: 120,
                },
              },
            ],
          },
        ],
        rowCount: 2,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      // Should only return beginner player
      expect(results.length).toBeLessThanOrEqual(1);
      if (results.length > 0) {
        expect(results[0]?.name).toBe('Beginner Player');
      }
    });

    it('should filter intermediate players', async () => {
      const searchTerm = 'player';
      const filters = { performanceLevel: 'intermediate' as const };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Intermediate Player',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              {
                sport: Sport.FOOTBALL,
                statistics: {
                  goals: 5,
                  assists: 3,
                  cleanSheets: 2,
                  saves: 0,
                  yellowCards: 1,
                  redCards: 0,
                },
              },
            ],
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0]?.name).toBe('Intermediate Player');
      }
    });

    it('should filter advanced players', async () => {
      const searchTerm = 'player';
      const filters = { performanceLevel: 'advanced' as const };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Advanced Player',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              {
                sport: Sport.VOLLEYBALL,
                statistics: {
                  spikes: 50,
                  blocks: 20,
                  serves: 30,
                  digs: 15,
                  aces: 10,
                },
              },
            ],
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0]?.name).toBe('Advanced Player');
      }
    });

    it('should handle players with no sport profiles as beginners', async () => {
      const searchTerm = 'player';
      const filters = { performanceLevel: 'beginner' as const };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'New Player',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: null,
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0]?.name).toBe('New Player');
      }
    });
  });

  describe('Combined filters', () => {
    it('should apply multiple filters together', async () => {
      const searchTerm = 'player';
      const filters = {
        sport: Sport.CRICKET,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
        performanceLevel: 'advanced' as const,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'Advanced Mumbai Cricket Player',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              {
                sport: Sport.CRICKET,
                statistics: {
                  runs: 1000,
                  wickets: 50,
                  battingAverage: 50,
                  strikeRate: 120,
                },
              },
            ],
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0]?.location?.city).toBe('Mumbai');
        expect(results[0]?.location?.state).toBe('Maharashtra');
        expect(results[0]?.metadata?.sportProfiles[0]?.sport).toBe(Sport.CRICKET);
      }

      // Verify all filters were applied in the query
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sp.sport'),
        expect.arrayContaining([
          expect.any(String),
          Sport.CRICKET,
          'mumbai',
          'maharashtra',
        ])
      );
    });
  });
});
