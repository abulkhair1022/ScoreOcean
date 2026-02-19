import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { UserRole } from '@score-ocean/types';
import { query } from '../db/postgres';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Resource ownership validation middleware
 * Validates that the user owns the resource or is an admin
 */
export interface ResourceOwnershipConfig {
  resourceType: 'tournament' | 'team' | 'match';
  resourceIdParam: string; // The param name in req.params (e.g., 'id', 'tournamentId')
  ownerField?: string; // The field name in the database (defaults to 'host_id')
}

export const requireResourceOwnership = (config: ResourceOwnershipConfig) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      // Admin users have unrestricted access
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      const resourceId = req.params[config.resourceIdParam];
      if (!resourceId) {
        return next(new AppError('Resource ID not provided', 400));
      }

      const ownerField = config.ownerField || 'host_id';
      let tableName: string;

      switch (config.resourceType) {
        case 'tournament':
          tableName = 'tournaments';
          break;
        case 'team':
          tableName = 'teams';
          break;
        case 'match':
          tableName = 'matches';
          break;
        default:
          return next(new AppError('Invalid resource type', 500));
      }

      // Check if user owns the resource
      const result = await query(
        `SELECT ${ownerField} FROM ${tableName} WHERE id = $1`,
        [resourceId]
      );

      if (result.rows.length === 0) {
        return next(new AppError(`${config.resourceType} not found`, 404));
      }

      const ownerId = result.rows[0][ownerField];
      if (ownerId !== req.user.userId) {
        return next(
          new AppError(
            `You do not have permission to modify this ${config.resourceType}`,
            403
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Match score entry authorization middleware
 * Validates that the user is authorized to enter scores for a match
 * Authorized users: tournament host, team hosts, or admin
 */
export const requireMatchScorePermission = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Admin users have unrestricted access
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const matchId = req.params.id;
    if (!matchId) {
      return next(new AppError('Match ID not provided', 400));
    }

    // Get match details including tournament and teams
    const matchResult = await query(
      `SELECT m.tournament_id, m.home_team_id, m.away_team_id, m.status,
              t.host_id as tournament_host_id,
              ht.host_id as home_team_host_id,
              at.host_id as away_team_host_id
       FROM matches m
       JOIN tournaments t ON m.tournament_id = t.id
       JOIN teams ht ON m.home_team_id = ht.id
       JOIN teams at ON m.away_team_id = at.id
       WHERE m.id = $1`,
      [matchId]
    );

    if (matchResult.rows.length === 0) {
      return next(new AppError('Match not found', 404));
    }

    const match = matchResult.rows[0];

    // Check if match is finalized
    if (match.status === 'COMPLETED') {
      // Only admins can modify finalized matches
      return next(
        new AppError('Cannot update score for a finalized match', 403)
      );
    }

    // Check if user is authorized (tournament host or either team host)
    const isAuthorized =
      req.user.userId === match.tournament_host_id ||
      req.user.userId === match.home_team_host_id ||
      req.user.userId === match.away_team_host_id;

    if (!isAuthorized) {
      return next(
        new AppError('You are not authorized to update this match score', 403)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Team roster management authorization middleware
 * Validates that the user is the team host or admin
 */
export const requireTeamManagementPermission = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Admin users have unrestricted access
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const teamId = req.params.id;
    if (!teamId) {
      return next(new AppError('Team ID not provided', 400));
    }

    // Check if user is the team host
    const result = await query(
      'SELECT host_id FROM teams WHERE id = $1',
      [teamId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Team not found', 404));
    }

    const hostId = result.rows[0].host_id;
    if (hostId !== req.user.userId) {
      return next(
        new AppError('You do not have permission to manage this team', 403)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Invitation acceptance authorization middleware
 * Validates that the user is the invited player
 */
export const requireInvitationRecipient = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Admin users have unrestricted access
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const invitationId = req.params.invitationId;
    if (!invitationId) {
      return next(new AppError('Invitation ID not provided', 400));
    }

    // Check if user is the invited player
    const result = await query(
      'SELECT player_id FROM team_invitations WHERE id = $1',
      [invitationId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Invitation not found', 404));
    }

    const playerId = result.rows[0].player_id;
    if (playerId !== req.user.userId) {
      return next(
        new AppError('You do not have permission to respond to this invitation', 403)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
