import { userService } from '../user.service';
import { query } from '../../db/postgres';
import { Sport, CricketStats, FootballStats } from '@score-ocean/types';

jest.mock('../../db/postgres');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Statistics Dashboard', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('getPerformanceStats with filtering', () => {
    it('should filter by sport', async () => {
      const userId = 'player-1';
      const filters = { sport: Sport.CRICKET };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 50,
              wickets: 2,
              battingAverage: 25,
              bowlingAverage: 15,
              strikeRate: 125,
            },
            team_id: 'team-1',
            sport: Sport.CRICKET,
            end_time: new Date('2024-01-15'),
            tournament_id: 'tournament-1',
            match_id: 'match-1',
          },
        ],
        rowCount: 1,
      } as any);

      // Mock team average query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 45,
              wickets: 1,
              battingAverage: 22,
              bowlingAverage: 18,
              strikeRate: 120,
            },
          },
        ],
        rowCount: 1,
      } as any);

      // Mock sport average query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 40,
              wickets: 1,
              battingAverage: 20,
              bowlingAverage: 20,
              strikeRate: 115,
            },
          },
        ],
        rowCount: 1,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.matchCount).toBe(1);
      expect((result.aggregated as CricketStats).runs).toBe(50);
      expect(result.sportAverage).toBeDefined();
    });

    it('should filter by tournament', async () => {
      const userId = 'player-1';
      const filters = { tournamentId: 'tournament-1', sport: Sport.FOOTBALL };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              goals: 2,
              assists: 1,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 1,
              redCards: 0,
            },
            team_id: 'team-1',
            sport: Sport.FOOTBALL,
            end_time: new Date('2024-01-15'),
            tournament_id: 'tournament-1',
            match_id: 'match-1',
          },
        ],
        rowCount: 1,
      } as any);

      // Mock team average query - 3 players with different stats
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              goals: 3,
              assists: 2,
              cleanSheets: 1,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
            },
          },
          {
            statistics: {
              goals: 1,
              assists: 1,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 1,
              redCards: 0,
            },
          },
          {
            statistics: {
              goals: 2,
              assists: 0,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
            },
          },
        ],
        rowCount: 3,
      } as any);

      // Mock sport average query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              goals: 1,
              assists: 1,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
            },
          },
          {
            statistics: {
              goals: 2,
              assists: 0,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 1,
              redCards: 0,
            },
          },
        ],
        rowCount: 2,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.matchCount).toBe(1);
      expect((result.aggregated as FootballStats).goals).toBe(2);
      expect(result.teamAverage).toBeDefined();
    });

    it('should filter by date range', async () => {
      const userId = 'player-1';
      const filters = {
        sport: Sport.CRICKET,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 50,
              wickets: 2,
              battingAverage: 25,
              bowlingAverage: 15,
              strikeRate: 125,
            },
            team_id: 'team-1',
            sport: Sport.CRICKET,
            end_time: new Date('2024-01-15'),
            tournament_id: 'tournament-1',
            match_id: 'match-1',
          },
          {
            statistics: {
              runs: 75,
              wickets: 3,
              battingAverage: 25,
              bowlingAverage: 20,
              strikeRate: 130,
            },
            team_id: 'team-1',
            sport: Sport.CRICKET,
            end_time: new Date('2024-01-20'),
            tournament_id: 'tournament-1',
            match_id: 'match-2',
          },
        ],
        rowCount: 2,
      } as any);

      // Mock sport average query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 40,
              wickets: 1,
              battingAverage: 20,
              bowlingAverage: 20,
              strikeRate: 115,
            },
          },
          {
            statistics: {
              runs: 30,
              wickets: 1,
              battingAverage: 15,
              bowlingAverage: 18,
              strikeRate: 110,
            },
          },
        ],
        rowCount: 2,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.matchCount).toBe(2);
      expect((result.aggregated as CricketStats).runs).toBe(125);
      expect(result.trends).toHaveLength(2);
    });

    it('should return empty stats when no matches found', async () => {
      const userId = 'player-1';
      const filters = { sport: Sport.CRICKET };

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock sport average query (will be called even when no matches found)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.matchCount).toBe(0);
      expect((result.aggregated as CricketStats).runs).toBe(0);
      expect(result.trends).toHaveLength(0);
      expect(result.teamAverage).toBeUndefined();
      expect(result.sportAverage).toBeDefined();
      expect((result.sportAverage as CricketStats).runs).toBe(0);
    });
  });

  describe('comparison calculations', () => {
    it('should calculate team average correctly', async () => {
      const userId = 'player-1';
      const filters = { tournamentId: 'tournament-1', sport: Sport.FOOTBALL };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              goals: 3,
              assists: 2,
              cleanSheets: 1,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
            },
            team_id: 'team-1',
            sport: Sport.FOOTBALL,
            end_time: new Date('2024-01-15'),
            tournament_id: 'tournament-1',
            match_id: 'match-1',
          },
        ],
        rowCount: 1,
      } as any);

      // Mock team average query - 3 players with different stats
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              goals: 3,
              assists: 2,
              cleanSheets: 1,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
            },
          },
          {
            statistics: {
              goals: 1,
              assists: 1,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 1,
              redCards: 0,
            },
          },
          {
            statistics: {
              goals: 2,
              assists: 0,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
            },
          },
        ],
        rowCount: 3,
      } as any);

      // Mock sport average query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              goals: 1,
              assists: 0.5,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 0.3,
              redCards: 0,
            },
          },
        ],
        rowCount: 1,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.teamAverage).toBeDefined();
      // Team average should be (3+1+2)/3 = 2 goals
      expect((result.teamAverage as FootballStats).goals).toBeCloseTo(2, 1);
      // Team average should be (2+1+0)/3 = 1 assist
      expect((result.teamAverage as FootballStats).assists).toBeCloseTo(1, 1);
    });

    it('should calculate sport average correctly', async () => {
      const userId = 'player-1';
      const filters = { sport: Sport.CRICKET };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 100,
              wickets: 3,
              battingAverage: 33.33,
              bowlingAverage: 20,
              strikeRate: 140,
            },
            team_id: 'team-1',
            sport: Sport.CRICKET,
            end_time: new Date('2024-01-15'),
            tournament_id: 'tournament-1',
            match_id: 'match-1',
          },
        ],
        rowCount: 1,
      } as any);

      // Mock sport average query - multiple players
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 50,
              wickets: 2,
              battingAverage: 25,
              bowlingAverage: 15,
              strikeRate: 125,
            },
          },
          {
            statistics: {
              runs: 30,
              wickets: 1,
              battingAverage: 30,
              bowlingAverage: 25,
              strikeRate: 100,
            },
          },
        ],
        rowCount: 2,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.sportAverage).toBeDefined();
      // Sport average should be (50+30)/2 = 40 runs
      expect((result.sportAverage as CricketStats).runs).toBeCloseTo(40, 1);
      // Sport average should be (2+1)/2 = 1.5 wickets
      expect((result.sportAverage as CricketStats).wickets).toBeCloseTo(1.5, 1);
    });
  });

  describe('trends calculation', () => {
    it('should calculate performance trends over time', async () => {
      const userId = 'player-1';
      const filters = { sport: Sport.CRICKET };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 50,
              wickets: 2,
              battingAverage: 25,
              bowlingAverage: 15,
              strikeRate: 125,
            },
            team_id: 'team-1',
            sport: Sport.CRICKET,
            end_time: new Date('2024-01-15'),
            tournament_id: 'tournament-1',
            match_id: 'match-1',
          },
          {
            statistics: {
              runs: 75,
              wickets: 3,
              battingAverage: 25,
              bowlingAverage: 20,
              strikeRate: 130,
            },
            team_id: 'team-1',
            sport: Sport.CRICKET,
            end_time: new Date('2024-01-20'),
            tournament_id: 'tournament-1',
            match_id: 'match-2',
          },
          {
            statistics: {
              runs: 60,
              wickets: 1,
              battingAverage: 60,
              bowlingAverage: 30,
              strikeRate: 120,
            },
            team_id: 'team-1',
            sport: Sport.CRICKET,
            end_time: new Date('2024-01-25'),
            tournament_id: 'tournament-1',
            match_id: 'match-3',
          },
        ],
        rowCount: 3,
      } as any);

      // Mock sport average query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: {
              runs: 40,
              wickets: 1,
              battingAverage: 20,
              bowlingAverage: 20,
              strikeRate: 115,
            },
          },
          {
            statistics: {
              runs: 30,
              wickets: 1,
              battingAverage: 15,
              bowlingAverage: 18,
              strikeRate: 110,
            },
          },
        ],
        rowCount: 2,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.trends).toHaveLength(3);
      expect(result.trends[0].metric).toBe('runs');
      expect(result.trends[0].value).toBe(50);
      expect(result.trends[1].value).toBe(75);
      expect(result.trends[2].value).toBe(60);
    });
  });
});
