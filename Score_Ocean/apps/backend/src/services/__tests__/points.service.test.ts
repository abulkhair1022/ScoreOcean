import { pointsService } from '../points.service';
import { query } from '../../db/postgres';
import redisClient from '../../db/redis';
import { Sport } from '@score-ocean/types';

// Mock dependencies
jest.mock('../../db/postgres');
jest.mock('../../db/redis');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

describe('PointsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePointsTable', () => {
    it('should calculate points table for a tournament with completed matches', async () => {
      const tournamentId = 'tournament-1';

      // Mock tournament query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sport: Sport.FOOTBALL,
            rules: { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
          },
        ],
      } as any);

      // Mock matches query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'match-1',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            home_score: 3,
            away_score: 1,
            sport_specific_data: {},
          },
          {
            id: 'match-2',
            home_team_id: 'team-2',
            away_team_id: 'team-3',
            home_score: 2,
            away_score: 2,
            sport_specific_data: {},
          },
        ],
      } as any);

      // Mock teams query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { team_id: 'team-1', name: 'Team 1' },
          { team_id: 'team-2', name: 'Team 2' },
          { team_id: 'team-3', name: 'Team 3' },
        ],
      } as any);

      const result = await pointsService.calculatePointsTable(tournamentId);

      expect(result.tournamentId).toBe(tournamentId);
      expect(result.standings).toHaveLength(3);

      // Team 1: 1 win, 3 points, +2 goal difference
      const team1 = result.standings.find((s) => s.teamId === 'team-1');
      expect(team1).toBeDefined();
      expect(team1!.played).toBe(1);
      expect(team1!.won).toBe(1);
      expect(team1!.lost).toBe(0);
      expect(team1!.drawn).toBe(0);
      expect(team1!.points).toBe(3);
      expect(team1!.tiebreaker).toBe(2);

      // Team 2: 1 loss, 1 draw, 1 point, -2 goal difference
      const team2 = result.standings.find((s) => s.teamId === 'team-2');
      expect(team2).toBeDefined();
      expect(team2!.played).toBe(2);
      expect(team2!.won).toBe(0);
      expect(team2!.lost).toBe(1);
      expect(team2!.drawn).toBe(1);
      expect(team2!.points).toBe(1);
      expect(team2!.tiebreaker).toBe(-2);

      // Team 3: 1 draw, 1 point, 0 goal difference
      const team3 = result.standings.find((s) => s.teamId === 'team-3');
      expect(team3).toBeDefined();
      expect(team3!.played).toBe(1);
      expect(team3!.won).toBe(0);
      expect(team3!.lost).toBe(0);
      expect(team3!.drawn).toBe(1);
      expect(team3!.points).toBe(1);
      expect(team3!.tiebreaker).toBe(0);
    });

    it('should use sport-specific point rules', async () => {
      const tournamentId = 'tournament-1';

      // Mock tournament query with Cricket (2 points for win)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sport: Sport.CRICKET,
            rules: {},
          },
        ],
      } as any);

      // Mock matches query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'match-1',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            home_score: 200,
            away_score: 150,
            sport_specific_data: {},
          },
        ],
      } as any);

      // Mock teams query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { team_id: 'team-1', name: 'Team 1' },
          { team_id: 'team-2', name: 'Team 2' },
        ],
      } as any);

      const result = await pointsService.calculatePointsTable(tournamentId);

      const team1 = result.standings.find((s) => s.teamId === 'team-1');
      expect(team1!.points).toBe(2); // Cricket default: 2 points for win
    });

    it('should handle tournaments with no completed matches', async () => {
      const tournamentId = 'tournament-1';

      // Mock tournament query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sport: Sport.FOOTBALL,
            rules: {},
          },
        ],
      } as any);

      // Mock matches query - no completed matches
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      // Mock teams query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { team_id: 'team-1', name: 'Team 1' },
          { team_id: 'team-2', name: 'Team 2' },
        ],
      } as any);

      const result = await pointsService.calculatePointsTable(tournamentId);

      expect(result.standings).toHaveLength(2);
      result.standings.forEach((standing) => {
        expect(standing.played).toBe(0);
        expect(standing.points).toBe(0);
      });
    });
  });

  describe('getPointsTable', () => {
    it('should return cached points table if available', async () => {
      const tournamentId = 'tournament-1';
      const cachedData = {
        tournamentId,
        standings: [
          {
            rank: 1,
            teamId: 'team-1',
            teamName: 'Team 1',
            played: 1,
            won: 1,
            lost: 0,
            drawn: 0,
            points: 3,
            tiebreaker: 2,
          },
        ],
        lastUpdated: new Date().toISOString(),
      };

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await pointsService.getPointsTable(tournamentId);

      expect(result.tournamentId).toBe(tournamentId);
      expect(result.standings).toHaveLength(1);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`tournament:${tournamentId}:points`);
    });

    it('should calculate and cache points table if not in cache', async () => {
      const tournamentId = 'tournament-1';

      // Mock cache miss
      mockRedisClient.get.mockResolvedValueOnce(null);

      // Mock tournament query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sport: Sport.FOOTBALL,
            rules: { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
          },
        ],
      } as any);

      // Mock matches query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'match-1',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            home_score: 2,
            away_score: 1,
            sport_specific_data: {},
          },
        ],
      } as any);

      // Mock teams query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { team_id: 'team-1', name: 'Team 1' },
          { team_id: 'team-2', name: 'Team 2' },
        ],
      } as any);

      mockRedisClient.setEx.mockResolvedValueOnce('OK');

      const result = await pointsService.getPointsTable(tournamentId);

      expect(result.standings).toHaveLength(2);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `tournament:${tournamentId}:points`,
        3600,
        expect.any(String)
      );
    });

    it('should rank teams correctly', async () => {
      const tournamentId = 'tournament-1';

      mockRedisClient.get.mockResolvedValueOnce(null);

      // Mock tournament query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sport: Sport.FOOTBALL,
            rules: { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
          },
        ],
      } as any);

      // Mock matches query - create scenario with different rankings
      mockQuery.mockResolvedValueOnce({
        rows: [
          // Team 1 vs Team 2: Team 1 wins (Team 1: 3 pts, +2 GD)
          {
            id: 'match-1',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            home_score: 3,
            away_score: 1,
            sport_specific_data: {},
          },
          // Team 3 vs Team 4: Team 3 wins (Team 3: 3 pts, +1 GD)
          {
            id: 'match-2',
            home_team_id: 'team-3',
            away_team_id: 'team-4',
            home_score: 2,
            away_score: 1,
            sport_specific_data: {},
          },
        ],
      } as any);

      // Mock teams query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { team_id: 'team-1', name: 'Team 1' },
          { team_id: 'team-2', name: 'Team 2' },
          { team_id: 'team-3', name: 'Team 3' },
          { team_id: 'team-4', name: 'Team 4' },
        ],
      } as any);

      mockRedisClient.setEx.mockResolvedValueOnce('OK');

      const result = await pointsService.getPointsTable(tournamentId);

      // Check rankings
      expect(result.standings[0].rank).toBe(1);
      expect(result.standings[0].teamId).toBe('team-1'); // 3 pts, +2 GD
      expect(result.standings[1].rank).toBe(2);
      expect(result.standings[1].teamId).toBe('team-3'); // 3 pts, +1 GD
      expect(result.standings[2].rank).toBe(3);
      expect(result.standings[3].rank).toBe(4);
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache for tournament', async () => {
      const tournamentId = 'tournament-1';

      mockRedisClient.del.mockResolvedValueOnce(1);

      await pointsService.invalidateCache(tournamentId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`tournament:${tournamentId}:points`);
    });
  });

  describe('updatePointsTableForMatch', () => {
    it('should invalidate cache and recalculate points table', async () => {
      const tournamentId = 'tournament-1';

      mockRedisClient.del.mockResolvedValueOnce(1);
      mockRedisClient.get.mockResolvedValueOnce(null);

      // Mock tournament query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sport: Sport.FOOTBALL,
            rules: {},
          },
        ],
      } as any);

      // Mock matches query
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      // Mock teams query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { team_id: 'team-1', name: 'Team 1' },
        ],
      } as any);

      mockRedisClient.setEx.mockResolvedValueOnce('OK');

      await pointsService.updatePointsTableForMatch(tournamentId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`tournament:${tournamentId}:points`);
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
