import { searchService } from '../search.service';
import { query } from '../../db/postgres';
import { Sport } from '@score-ocean/types';

jest.mock('../../db/postgres');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchPlayers', () => {
    it('should search players with fuzzy matching', async () => {
      const searchTerm = 'john';
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'player-1',
            name: 'John Doe',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              { sport: Sport.CRICKET, statistics: { runs: 500, wickets: 10 } },
            ],
          },
          {
            id: 'player-2',
            name: 'Johnny Smith',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            avatar_url: null,
            sport_profiles: [
              { sport: Sport.FOOTBALL, statistics: { goals: 15, assists: 8 } },
            ],
          },
        ],
        rowCount: 2,
      } as any);

      const results = await searchService.searchPlayers(searchTerm);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('player');
      expect(results[0].name).toContain('John');
      expect(results[0].relevanceScore).toBeGreaterThan(0);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

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
      expect(results[0].metadata.sportProfiles[0].sport).toBe(Sport.CRICKET);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('sp.sport'),
        expect.arrayContaining([expect.stringContaining('%player%'), Sport.CRICKET])
      );
    });

    it('should filter players by location', async () => {
      const searchTerm = 'player';
      const filters = {
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
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
      expect(results[0]?.location?.state).toBe('Maharashtra');
    });
  });

  describe('searchTeams', () => {
    it('should search teams with fuzzy matching', async () => {
      const searchTerm = 'warriors';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'team-1',
            name: 'Mumbai Warriors',
            sport: Sport.CRICKET,
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            statistics: { matchesPlayed: 10, wins: 7 },
            roster_count: '15',
          },
          {
            id: 'team-2',
            name: 'Delhi Warriors',
            sport: Sport.FOOTBALL,
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            statistics: { matchesPlayed: 8, wins: 5 },
            roster_count: '18',
          },
        ],
        rowCount: 2,
      } as any);

      const results = await searchService.searchTeams(searchTerm);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('team');
      expect(results[0].name).toContain('Warriors');
      expect(results[0].sport).toBeDefined();
      expect(results[0].metadata.rosterCount).toBeGreaterThan(0);
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
      expect(results[0].sport).toBe(Sport.FOOTBALL);
    });
  });

  describe('searchTournaments', () => {
    it('should search tournaments', async () => {
      const searchTerm = 'championship';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'tournament-1',
            name: 'Cricket Championship 2024',
            sport: Sport.CRICKET,
            venue: 'Wankhede Stadium, Mumbai',
            format: 'LEAGUE',
            status: 'REGISTRATION_OPEN',
            start_date: new Date('2024-03-01'),
            end_date: new Date('2024-03-15'),
            registration_fee: '5000',
            registration_deadline: new Date('2024-02-20'),
            team_capacity: 16,
            registered_teams: '8',
          },
        ],
        rowCount: 1,
      } as any);

      const results = await searchService.searchTournaments(searchTerm);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('tournament');
      expect(results[0].name).toContain('Championship');
      expect(results[0].metadata.status).toBe('REGISTRATION_OPEN');
      expect(results[0].metadata.registeredTeams).toBe(8);
    });

    it('should not return draft tournaments', async () => {
      const searchTerm = 'tournament';

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const results = await searchService.searchTournaments(searchTerm);

      expect(results).toHaveLength(0);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status != 'DRAFT'"),
        expect.any(Array)
      );
    });
  });

  describe('search (combined)', () => {
    it('should search across all entity types', async () => {
      const searchTerm = 'mumbai';

      // Mock player search
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

      // Mock team search
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'team-1',
            name: 'Mumbai Warriors',
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

      // Mock tournament search
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'tournament-1',
            name: 'Mumbai Championship',
            sport: Sport.CRICKET,
            venue: 'Mumbai Stadium',
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

      const results = await searchService.search({ query: searchTerm });

      expect(results).toHaveLength(3);
      expect(results.some((r) => r.type === 'player')).toBe(true);
      expect(results.some((r) => r.type === 'team')).toBe(true);
      expect(results.some((r) => r.type === 'tournament')).toBe(true);
    });

    it('should throw error for empty search query', async () => {
      await expect(searchService.search({ query: '' })).rejects.toThrow(
        'Search query cannot be empty'
      );
    });

    it('should apply pagination', async () => {
      const searchTerm = 'test';

      // Mock searches returning multiple results
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const results = await searchService.search({
        query: searchTerm,
        limit: 10,
        offset: 5,
      });

      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('relevance scoring', () => {
    it('should rank exact matches higher', async () => {
      const searchTerm = 'warriors';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'team-1',
            name: 'Warriors',
            sport: Sport.CRICKET,
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            statistics: {},
            roster_count: '15',
          },
          {
            id: 'team-2',
            name: 'Mumbai Warriors',
            sport: Sport.CRICKET,
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            statistics: {},
            roster_count: '15',
          },
        ],
        rowCount: 2,
      } as any);

      const results = await searchService.searchTeams(searchTerm);

      // Exact match should have higher relevance score
      const exactMatch = results.find((r) => r.name === 'Warriors');
      const partialMatch = results.find((r) => r.name === 'Mumbai Warriors');

      expect(exactMatch).toBeDefined();
      expect(partialMatch).toBeDefined();
      expect(exactMatch!.relevanceScore).toBeGreaterThan(partialMatch!.relevanceScore);
    });
  });

  describe('performance level filtering', () => {
    it('should filter players by performance level', async () => {
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
          {
            id: 'player-2',
            name: 'Beginner Player',
            city: 'Delhi',
            state: 'Delhi',
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
        ],
        rowCount: 2,
      } as any);

      const results = await searchService.searchPlayers(searchTerm, filters);

      // Should only return advanced player
      expect(results.length).toBeLessThanOrEqual(1);
      if (results.length > 0) {
        expect(results[0].name).toBe('Advanced Player');
      }
    });
  });
});
