import { teamService } from '../team.service';
import { query } from '../../db/postgres';
import { Sport, InvitationStatus } from '@score-ocean/types';

// Mock the database
jest.mock('../../db/postgres');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('TeamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTeam', () => {
    it('should create a team with valid data', async () => {
      const mockTeamData = {
        name: 'Test Team',
        sport: Sport.CRICKET,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
      };

      const mockTeamRow = {
        id: 'team-123',
        name: 'Test Team',
        sport: Sport.CRICKET,
        host_id: 'user-123',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        statistics: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock INSERT query
      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const team = await teamService.createTeam('user-123', mockTeamData);

      expect(team.id).toBe('team-123');
      expect(team.name).toBe('Test Team');
      expect(team.sport).toBe(Sport.CRICKET);
      expect(team.roster).toEqual([]);
    });

    it('should reject invalid sport', async () => {
      const mockTeamData = {
        name: 'Test Team',
        sport: 'INVALID_SPORT' as any,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
      };

      await expect(teamService.createTeam('user-123', mockTeamData)).rejects.toThrow(
        'Invalid sport'
      );
    });

    it('should reject team name that is too short', async () => {
      const mockTeamData = {
        name: 'A',
        sport: Sport.CRICKET,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
      };

      await expect(teamService.createTeam('user-123', mockTeamData)).rejects.toThrow(
        'Team name must be between 2 and 100 characters'
      );
    });
  });

  describe('validateRoster', () => {
    it('should validate roster size for cricket', async () => {
      const mockRoster = Array(11).fill(null).map((_, i) => ({
        player_id: `player-${i}`,
        name: `Player ${i}`,
        joined_at: new Date(),
      }));

      mockQuery.mockResolvedValueOnce({
        rows: mockRoster,
        rowCount: mockRoster.length,
      } as any);

      const validation = await teamService.validateRoster('team-123', Sport.CRICKET);

      expect(validation.isValid).toBe(true);
      expect(validation.currentPlayers).toBe(11);
      expect(validation.minPlayers).toBe(11);
      expect(validation.maxPlayers).toBe(15);
      expect(validation.errors).toEqual([]);
    });

    it('should fail validation when roster is too small', async () => {
      const mockRoster = Array(5).fill(null).map((_, i) => ({
        player_id: `player-${i}`,
        name: `Player ${i}`,
        joined_at: new Date(),
      }));

      mockQuery.mockResolvedValueOnce({
        rows: mockRoster,
        rowCount: mockRoster.length,
      } as any);

      const validation = await teamService.validateRoster('team-123', Sport.FOOTBALL);

      expect(validation.isValid).toBe(false);
      expect(validation.currentPlayers).toBe(5);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when roster is too large', async () => {
      const mockRoster = Array(20).fill(null).map((_, i) => ({
        player_id: `player-${i}`,
        name: `Player ${i}`,
        joined_at: new Date(),
      }));

      mockQuery.mockResolvedValueOnce({
        rows: mockRoster,
        rowCount: mockRoster.length,
      } as any);

      const validation = await teamService.validateRoster('team-123', Sport.FOOTBALL);

      expect(validation.isValid).toBe(false);
      expect(validation.currentPlayers).toBe(20);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('invitePlayer', () => {
    it('should create invitation for valid player', async () => {
      const mockTeamRow = {
        id: 'team-123',
        name: 'Test Team',
        sport: Sport.CRICKET,
        host_id: 'user-123',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        statistics: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster for getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock player exists check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'player-123', role: 'PLAYER' }],
        rowCount: 1,
      } as any);

      // Mock roster check
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock invitation check
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock invitation creation
      const mockInvitation = {
        id: 'invitation-123',
        team_id: 'team-123',
        player_id: 'player-123',
        status: InvitationStatus.PENDING,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockInvitation],
        rowCount: 1,
      } as any);

      // Mock getTeam for notification
      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster for notification getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock notification insert
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      const invitation = await teamService.invitePlayer('team-123', 'player-123', 'user-123');

      expect(invitation.id).toBe('invitation-123');
      expect(invitation.teamId).toBe('team-123');
      expect(invitation.playerId).toBe('player-123');
      expect(invitation.status).toBe(InvitationStatus.PENDING);
    });

    it('should reject invitation if player is already in roster', async () => {
      const mockTeamRow = {
        id: 'team-123',
        name: 'Test Team',
        sport: Sport.CRICKET,
        host_id: 'user-123',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        statistics: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster for getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock player exists check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'player-123', role: 'PLAYER' }],
        rowCount: 1,
      } as any);

      // Mock roster check - player already in roster
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'roster-123' }],
        rowCount: 1,
      } as any);

      await expect(
        teamService.invitePlayer('team-123', 'player-123', 'user-123')
      ).rejects.toThrow('Player is already in the team roster');
    });
  });

  describe('acceptInvitation', () => {
    it('should add player to roster when invitation is accepted', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        team_id: 'team-123',
        player_id: 'player-123',
        status: InvitationStatus.PENDING,
        created_at: new Date(),
      };

      // Mock get invitation
      mockQuery.mockResolvedValueOnce({
        rows: [mockInvitation],
        rowCount: 1,
      } as any);

      // Mock getTeam for validation
      const mockTeamRow = {
        id: 'team-123',
        name: 'Test Team',
        sport: Sport.CRICKET,
        host_id: 'user-123',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        statistics: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster for getTeam
      mockQuery.mockResolvedValueOnce({
        rows: Array(11).fill(null).map((_, i) => ({
          player_id: `player-${i}`,
          name: `Player ${i}`,
          joined_at: new Date(),
        })),
        rowCount: 11,
      } as any);

      // Mock getRoster for validation
      mockQuery.mockResolvedValueOnce({
        rows: Array(11).fill(null).map((_, i) => ({
          player_id: `player-${i}`,
          name: `Player ${i}`,
          joined_at: new Date(),
        })),
        rowCount: 11,
      } as any);

      // Mock BEGIN
      mockQuery.mockResolvedValueOnce({} as any);

      // Mock update invitation
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      // Mock add to roster
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      // Mock COMMIT
      mockQuery.mockResolvedValueOnce({} as any);

      // Mock getTeam for notification
      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster for notification getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock get player name
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Test Player' }],
        rowCount: 1,
      } as any);

      // Mock notification insert
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      await expect(
        teamService.acceptInvitation('invitation-123', 'player-123')
      ).resolves.not.toThrow();
    });
  });

  describe('removePlayerFromRoster', () => {
    it('should remove player from roster', async () => {
      const mockTeamRow = {
        id: 'team-123',
        name: 'Test Team',
        sport: Sport.CRICKET,
        host_id: 'user-123',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        statistics: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster for getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock roster check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'roster-123' }],
        rowCount: 1,
      } as any);

      // Mock delete
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
      } as any);

      await expect(
        teamService.removePlayerFromRoster('team-123', 'player-123')
      ).resolves.not.toThrow();
    });

    it('should reject if player is not in roster', async () => {
      const mockTeamRow = {
        id: 'team-123',
        name: 'Test Team',
        sport: Sport.CRICKET,
        host_id: 'user-123',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        statistics: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [mockTeamRow],
        rowCount: 1,
      } as any);

      // Mock getRoster for getTeam
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock roster check - player not in roster (return empty array)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(
        teamService.removePlayerFromRoster('team-123', 'player-123')
      ).rejects.toThrow('Player is not in the team roster');
    });
  });
});
