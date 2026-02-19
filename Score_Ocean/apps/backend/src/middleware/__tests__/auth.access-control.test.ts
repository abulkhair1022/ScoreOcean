import { Response, NextFunction } from 'express';
import {
  AuthRequest,
  requireResourceOwnership,
  requireMatchScorePermission,
  requireTeamManagementPermission,
  requireInvitationRecipient,
} from '../auth';
import { UserRole } from '@score-ocean/types';
import { query } from '../../db/postgres';

// Mock the database query function
jest.mock('../../db/postgres', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Access Control Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PLAYER,
      },
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireResourceOwnership', () => {
    it('should allow admin users unrestricted access', async () => {
      mockReq.user!.role = UserRole.ADMIN;
      mockReq.params = { id: 'tournament-123' };

      const middleware = requireResourceOwnership({
        resourceType: 'tournament',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should allow resource owner to access their resource', async () => {
      mockReq.params = { id: 'tournament-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ host_id: 'user-123' }],
      } as any);

      const middleware = requireResourceOwnership({
        resourceType: 'tournament',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT host_id FROM tournaments WHERE id = $1',
        ['tournament-123']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user is not the resource owner', async () => {
      mockReq.params = { id: 'tournament-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ host_id: 'other-user' }],
      } as any);

      const middleware = requireResourceOwnership({
        resourceType: 'tournament',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to modify this tournament',
          statusCode: 403,
        })
      );
    });

    it('should return 404 when resource does not exist', async () => {
      mockReq.params = { id: 'nonexistent-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      const middleware = requireResourceOwnership({
        resourceType: 'tournament',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'tournament not found',
          statusCode: 404,
        })
      );
    });

    it('should work with team resources', async () => {
      mockReq.params = { id: 'team-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ host_id: 'user-123' }],
      } as any);

      const middleware = requireResourceOwnership({
        resourceType: 'team',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT host_id FROM teams WHERE id = $1',
        ['team-123']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireMatchScorePermission', () => {
    it('should allow admin users to update any match score', async () => {
      mockReq.user!.role = UserRole.ADMIN;
      mockReq.params = { id: 'match-123' };

      await requireMatchScorePermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should allow tournament host to update match score', async () => {
      mockReq.params = { id: 'match-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tournament_id: 'tournament-123',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            status: 'IN_PROGRESS',
            tournament_host_id: 'user-123',
            home_team_host_id: 'other-user-1',
            away_team_host_id: 'other-user-2',
          },
        ],
      } as any);

      await requireMatchScorePermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow home team host to update match score', async () => {
      mockReq.params = { id: 'match-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tournament_id: 'tournament-123',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            status: 'IN_PROGRESS',
            tournament_host_id: 'other-user',
            home_team_host_id: 'user-123',
            away_team_host_id: 'other-user-2',
          },
        ],
      } as any);

      await requireMatchScorePermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow away team host to update match score', async () => {
      mockReq.params = { id: 'match-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tournament_id: 'tournament-123',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            status: 'IN_PROGRESS',
            tournament_host_id: 'other-user',
            home_team_host_id: 'other-user-1',
            away_team_host_id: 'user-123',
          },
        ],
      } as any);

      await requireMatchScorePermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access to unauthorized users', async () => {
      mockReq.params = { id: 'match-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tournament_id: 'tournament-123',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            status: 'IN_PROGRESS',
            tournament_host_id: 'other-user',
            home_team_host_id: 'other-user-1',
            away_team_host_id: 'other-user-2',
          },
        ],
      } as any);

      await requireMatchScorePermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You are not authorized to update this match score',
          statusCode: 403,
        })
      );
    });

    it('should deny access to finalized matches for non-admin users', async () => {
      mockReq.params = { id: 'match-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tournament_id: 'tournament-123',
            home_team_id: 'team-1',
            away_team_id: 'team-2',
            status: 'COMPLETED',
            tournament_host_id: 'user-123',
            home_team_host_id: 'other-user-1',
            away_team_host_id: 'other-user-2',
          },
        ],
      } as any);

      await requireMatchScorePermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot update score for a finalized match',
          statusCode: 403,
        })
      );
    });

    it('should return 404 when match does not exist', async () => {
      mockReq.params = { id: 'nonexistent-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      await requireMatchScorePermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Match not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('requireTeamManagementPermission', () => {
    it('should allow admin users to manage any team', async () => {
      mockReq.user!.role = UserRole.ADMIN;
      mockReq.params = { id: 'team-123' };

      await requireTeamManagementPermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should allow team host to manage their team', async () => {
      mockReq.params = { id: 'team-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ host_id: 'user-123' }],
      } as any);

      await requireTeamManagementPermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT host_id FROM teams WHERE id = $1',
        ['team-123']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user is not the team host', async () => {
      mockReq.params = { id: 'team-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ host_id: 'other-user' }],
      } as any);

      await requireTeamManagementPermission(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to manage this team',
          statusCode: 403,
        })
      );
    });
  });

  describe('requireInvitationRecipient', () => {
    it('should allow admin users to respond to any invitation', async () => {
      mockReq.user!.role = UserRole.ADMIN;
      mockReq.params = { invitationId: 'invitation-123' };

      await requireInvitationRecipient(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should allow invited player to respond to their invitation', async () => {
      mockReq.params = { invitationId: 'invitation-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ player_id: 'user-123' }],
      } as any);

      await requireInvitationRecipient(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT player_id FROM team_invitations WHERE id = $1',
        ['invitation-123']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user is not the invited player', async () => {
      mockReq.params = { invitationId: 'invitation-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ player_id: 'other-user' }],
      } as any);

      await requireInvitationRecipient(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to respond to this invitation',
          statusCode: 403,
        })
      );
    });

    it('should return 404 when invitation does not exist', async () => {
      mockReq.params = { invitationId: 'nonexistent-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [],
      } as any);

      await requireInvitationRecipient(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invitation not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('Permission updates take effect immediately', () => {
    it('should use updated role for subsequent requests', async () => {
      // First request as PLAYER
      mockReq.user!.role = UserRole.PLAYER;
      mockReq.params = { id: 'tournament-123' };
      mockQuery.mockResolvedValueOnce({
        rows: [{ host_id: 'other-user' }],
      } as any);

      const middleware = requireResourceOwnership({
        resourceType: 'tournament',
        resourceIdParam: 'id',
      });

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        })
      );

      // Reset mock
      jest.clearAllMocks();

      // Second request as ADMIN (role updated)
      mockReq.user!.role = UserRole.ADMIN;

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
