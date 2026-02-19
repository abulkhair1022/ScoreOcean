import { matchService } from '../match.service';
import { query } from '../../db/postgres';
import { MatchStatus, Sport } from '@score-ocean/types';

// Mock the database query function
jest.mock('../../db/postgres');
jest.mock('../points.service');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('MatchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMatch', () => {
    it('should create a match from a fixture', async () => {
      const fixtureId = 'fixture-123';
      const tournamentId = 'tournament-123';
      const homeTeamId = 'team-1';
      const awayTeamId = 'team-2';

      // Mock fixture query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: fixtureId,
            tournament_id: tournamentId,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
          },
        ],
        rowCount: 1,
      } as any);

      // Mock existing match check
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock tournament query
      mockQuery.mockResolvedValueOnce({
        rows: [{ sport: Sport.FOOTBALL }],
        rowCount: 1,
      } as any);

      // Mock match creation
      const matchId = 'match-123';
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            fixture_id: fixtureId,
            tournament_id: tournamentId,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            sport: Sport.FOOTBALL,
            status: MatchStatus.SCHEDULED,
            home_score: 0,
            away_score: 0,
            sport_specific_data: { goals: 0, yellowCards: 0, redCards: 0 },
          },
        ],
        rowCount: 1,
      } as any);

      // Mock fixture update
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      // Mock score history query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock player performances query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const match = await matchService.createMatch(fixtureId);

      expect(match.id).toBe(matchId);
      expect(match.fixtureId).toBe(fixtureId);
      expect(match.status).toBe(MatchStatus.SCHEDULED);
      expect(match.sport).toBe(Sport.FOOTBALL);
    });

    it('should throw error if fixture not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(matchService.createMatch('invalid-id')).rejects.toThrow('Fixture not found');
    });

    it('should throw error if match already exists for fixture', async () => {
      const fixtureId = 'fixture-123';

      // Mock fixture query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: fixtureId, tournament_id: 'tournament-123' }],
        rowCount: 1,
      } as any);

      // Mock existing match check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-match' }],
        rowCount: 1,
      } as any);

      await expect(matchService.createMatch(fixtureId)).rejects.toThrow(
        'Match already exists for this fixture'
      );
    });
  });

  describe('updateScore', () => {
    it('should update match score and create history entry', async () => {
      const matchId = 'match-123';
      const userId = 'user-123';

      // Mock getMatch
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.IN_PROGRESS,
            sport: Sport.FOOTBALL,
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      // Mock score update
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock history insert
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock getMatch again for return value
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.IN_PROGRESS,
            sport: Sport.FOOTBALL,
            home_score: 2,
            away_score: 1,
            sport_specific_data: { goals: 3, yellowCards: 2, redCards: 0 },
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      const scoreUpdate = {
        homeScore: 2,
        awayScore: 1,
        sportSpecificData: { goals: 3, yellowCards: 2, redCards: 0 },
        updatedBy: userId,
      };

      const match = await matchService.updateScore(matchId, scoreUpdate, userId);

      expect(match.score.homeScore).toBe(2);
      expect(match.score.awayScore).toBe(1);
    });

    it('should throw error when updating completed match', async () => {
      const matchId = 'match-123';
      const userId = 'user-123';

      // Mock getMatch
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.COMPLETED,
            sport: Sport.FOOTBALL,
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      const scoreUpdate = {
        homeScore: 2,
        awayScore: 1,
        sportSpecificData: { goals: 3, yellowCards: 2, redCards: 0 },
        updatedBy: userId,
      };

      await expect(matchService.updateScore(matchId, scoreUpdate, userId)).rejects.toThrow(
        'Cannot update score for completed match'
      );
    });

    it('should validate cricket score correctly', async () => {
      const matchId = 'match-123';
      const userId = 'user-123';

      // Mock getMatch
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.IN_PROGRESS,
            sport: Sport.CRICKET,
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      const scoreUpdate = {
        homeScore: 150,
        awayScore: 120,
        sportSpecificData: { runs: 150, wickets: 5, overs: 20, runRate: 7.5 },
        updatedBy: userId,
      };

      // Mock score update
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock history insert
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock getMatch again for return value
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.IN_PROGRESS,
            sport: Sport.CRICKET,
            home_score: 150,
            away_score: 120,
            sport_specific_data: { runs: 150, wickets: 5, overs: 20, runRate: 7.5 },
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      const match = await matchService.updateScore(matchId, scoreUpdate, userId);

      expect(match.score.homeScore).toBe(150);
    });

    it('should reject invalid cricket score with negative wickets', async () => {
      const matchId = 'match-123';
      const userId = 'user-123';

      // Mock getMatch
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.IN_PROGRESS,
            sport: Sport.CRICKET,
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      const scoreUpdate = {
        homeScore: 150,
        awayScore: 120,
        sportSpecificData: { runs: 150, wickets: -1, overs: 20, runRate: 7.5 },
        updatedBy: userId,
      };

      await expect(matchService.updateScore(matchId, scoreUpdate, userId)).rejects.toThrow(
        'Wickets must be between 0 and 10'
      );
    });
  });

  describe('finalizeMatch', () => {
    it('should finalize match and update statistics', async () => {
      const matchId = 'match-123';

      // Mock getMatch for finalize
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.IN_PROGRESS,
            sport: Sport.FOOTBALL,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            home_score: 2,
            away_score: 1,
            tournament_id: 'tournament-123',
            fixture_id: 'fixture-123',
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      // Mock BEGIN transaction
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock match status update
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock fixture status update
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock getMatch for updatePlayerStatistics
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.IN_PROGRESS,
            sport: Sport.FOOTBALL,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            home_score: 2,
            away_score: 1,
            tournament_id: 'tournament-123',
            fixture_id: 'fixture-123',
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      // Mock notification queries for sendResultNotifications
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Team 1', host_id: 'host-1' }],
        rowCount: 1,
      } as any);
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Team 2', host_id: 'host-2' }],
        rowCount: 1,
      } as any);

      // Mock notification inserts
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      // Mock player roster queries
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock COMMIT transaction
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock getMatch for return value
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.COMPLETED,
            sport: Sport.FOOTBALL,
            home_score: 2,
            away_score: 1,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            tournament_id: 'tournament-123',
            fixture_id: 'fixture-123',
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      const match = await matchService.finalizeMatch(matchId);

      expect(match.status).toBe(MatchStatus.COMPLETED);
    });

    it('should throw error when finalizing already completed match', async () => {
      const matchId = 'match-123';

      // Mock getMatch
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.COMPLETED,
            sport: Sport.FOOTBALL,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            tournament_id: 'tournament-123',
            fixture_id: 'fixture-123',
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      await expect(matchService.finalizeMatch(matchId)).rejects.toThrow(
        'Match is already completed'
      );
    });

    it('should throw error when finalizing scheduled match', async () => {
      const matchId = 'match-123';

      // Mock getMatch
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: matchId,
            status: MatchStatus.SCHEDULED,
            sport: Sport.FOOTBALL,
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            tournament_id: 'tournament-123',
            fixture_id: 'fixture-123',
          },
        ],
        rowCount: 1,
      } as any);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // score history
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // player performances

      await expect(matchService.finalizeMatch(matchId)).rejects.toThrow(
        'Can only finalize matches that are in progress'
      );
    });
  });
});
