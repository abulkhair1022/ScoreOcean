import { performanceService } from '../performance.service';
import { query } from '../../db/postgres';
import { Sport, CricketStats, FootballStats, KabaddiStats } from '@score-ocean/types';

jest.mock('../../db/postgres');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('PerformanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPerformance', () => {
    it('should record new player performance for a match', async () => {
      const matchId = 'match-1';
      const playerId = 'player-1';
      const teamId = 'team-1';
      const statistics: CricketStats = {
        runs: 50,
        wickets: 2,
        battingAverage: 25,
        bowlingAverage: 15,
        strikeRate: 125,
      };

      // Mock match exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: matchId, sport: Sport.CRICKET }],
        rowCount: 1,
      } as any);

      // Mock no existing performance
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock insert performance
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'perf-1' }],
        rowCount: 1,
      } as any);

      // Mock no existing sport profile
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock insert sport profile
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'sport-profile-1' }],
        rowCount: 1,
      } as any);

      const result = await performanceService.recordPerformance(
        matchId,
        playerId,
        teamId,
        statistics
      );

      expect(result).toEqual({
        playerId,
        teamId,
        statistics,
      });

      expect(mockQuery).toHaveBeenCalledTimes(5);
    });

    it('should update existing player performance', async () => {
      const matchId = 'match-1';
      const playerId = 'player-1';
      const teamId = 'team-1';
      const statistics: FootballStats = {
        goals: 2,
        assists: 1,
        cleanSheets: 0,
        saves: 0,
        yellowCards: 1,
        redCards: 0,
      };

      // Mock match exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: matchId, sport: Sport.FOOTBALL }],
        rowCount: 1,
      } as any);

      // Mock existing performance
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'perf-1' }],
        rowCount: 1,
      } as any);

      // Mock update performance
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      // Mock existing sport profile
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'sport-profile-1',
            statistics: {
              goals: 5,
              assists: 3,
              cleanSheets: 2,
              saves: 0,
              yellowCards: 2,
              redCards: 0,
            },
          },
        ],
        rowCount: 1,
      } as any);

      // Mock update sport profile
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      const result = await performanceService.recordPerformance(
        matchId,
        playerId,
        teamId,
        statistics
      );

      expect(result).toEqual({
        playerId,
        teamId,
        statistics,
      });
    });

    it('should throw error if match not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(
        performanceService.recordPerformance('invalid-match', 'player-1', 'team-1', {
          runs: 50,
          wickets: 2,
          battingAverage: 25,
          bowlingAverage: 15,
          strikeRate: 125,
        } as CricketStats)
      ).rejects.toThrow('Match not found');
    });

    it('should validate cricket statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'match-1', sport: Sport.CRICKET }],
        rowCount: 1,
      } as any);

      await expect(
        performanceService.recordPerformance('match-1', 'player-1', 'team-1', {
          runs: -10,
          wickets: 2,
          battingAverage: 25,
          bowlingAverage: 15,
          strikeRate: 125,
        } as CricketStats)
      ).rejects.toThrow('Runs cannot be negative');
    });

    it('should validate football statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'match-1', sport: Sport.FOOTBALL }],
        rowCount: 1,
      } as any);

      await expect(
        performanceService.recordPerformance('match-1', 'player-1', 'team-1', {
          goals: -1,
          assists: 0,
          cleanSheets: 0,
          saves: 0,
          yellowCards: 0,
          redCards: 0,
        } as FootballStats)
      ).rejects.toThrow('Goals cannot be negative');
    });
  });

  describe('recordBatchPerformances', () => {
    it('should record multiple performances', async () => {
      const matchId = 'match-1';
      const performances = [
        {
          playerId: 'player-1',
          teamId: 'team-1',
          statistics: {
            raidPoints: 10,
            tacklePoints: 5,
            superRaids: 1,
            superTackles: 0,
          } as KabaddiStats,
        },
        {
          playerId: 'player-2',
          teamId: 'team-1',
          statistics: {
            raidPoints: 8,
            tacklePoints: 7,
            superRaids: 0,
            superTackles: 1,
          } as KabaddiStats,
        },
      ];

      // Mock for first player
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: matchId, sport: Sport.KABADDI }],
        rowCount: 1,
      } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'perf-1' }], rowCount: 1 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sp-1' }], rowCount: 1 } as any);

      // Mock for second player
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: matchId, sport: Sport.KABADDI }],
        rowCount: 1,
      } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'perf-2' }], rowCount: 1 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'sp-2' }], rowCount: 1 } as any);

      const results = await performanceService.recordBatchPerformances(matchId, performances);

      expect(results).toHaveLength(2);
      expect(results[0].playerId).toBe('player-1');
      expect(results[1].playerId).toBe('player-2');
    });
  });

  describe('getMatchPerformances', () => {
    it('should retrieve all performances for a match', async () => {
      const matchId = 'match-1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            player_id: 'player-1',
            team_id: 'team-1',
            statistics: {
              spikes: 15,
              blocks: 8,
              serves: 20,
              digs: 12,
              aces: 3,
            },
          },
          {
            player_id: 'player-2',
            team_id: 'team-1',
            statistics: {
              spikes: 12,
              blocks: 10,
              serves: 18,
              digs: 15,
              aces: 2,
            },
          },
        ],
        rowCount: 2,
      } as any);

      const results = await performanceService.getMatchPerformances(matchId);

      expect(results).toHaveLength(2);
      expect(results[0].playerId).toBe('player-1');
      expect(results[1].playerId).toBe('player-2');
    });
  });

  describe('getPlayerPerformances', () => {
    it('should retrieve all performances for a player', async () => {
      const playerId = 'player-1';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            player_id: playerId,
            team_id: 'team-1',
            statistics: {
              runs: 50,
              wickets: 2,
              battingAverage: 25,
              bowlingAverage: 15,
              strikeRate: 125,
            },
          },
          {
            player_id: playerId,
            team_id: 'team-1',
            statistics: {
              runs: 75,
              wickets: 3,
              battingAverage: 25,
              bowlingAverage: 20,
              strikeRate: 130,
            },
          },
        ],
        rowCount: 2,
      } as any);

      const results = await performanceService.getPlayerPerformances(playerId);

      expect(results).toHaveLength(2);
      expect(results[0].playerId).toBe(playerId);
      expect(results[1].playerId).toBe(playerId);
    });
  });
});
