import { Router } from 'express';
import { teamService } from '../services/team.service';
import {
  authenticate,
  AuthRequest,
  requireResourceOwnership,
  requireTeamManagementPermission,
  requireInvitationRecipient,
} from '../middleware/auth';

const router = Router();

// Get all teams (for current user)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const teams = await teamService.getUserTeams(userId);
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

// Create team
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const hostId = req.user!.userId;
    const teamData = req.body;

    const team = await teamService.createTeam(hostId, teamData);
    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
});

// Get team by ID
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const team = await teamService.getTeam(id);
    res.json(team);
  } catch (error) {
    next(error);
  }
});

// Update team - requires ownership
router.put(
  '/:id',
  authenticate,
  requireResourceOwnership({ resourceType: 'team', resourceIdParam: 'id' }),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const team = await teamService.updateTeam(id, updates);
      res.json(team);
    } catch (error) {
      next(error);
    }
  }
);

// Delete team - requires ownership
router.delete(
  '/:id',
  authenticate,
  requireResourceOwnership({ resourceType: 'team', resourceIdParam: 'id' }),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      await teamService.deleteTeam(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Get team roster
router.get('/:id/roster', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const roster = await teamService.getRoster(id);
    res.json(roster);
  } catch (error) {
    next(error);
  }
});

// Validate roster
router.get('/:id/roster/validate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const team = await teamService.getTeam(id);
    const validation = await teamService.validateRoster(id, team.sport);
    res.json(validation);
  } catch (error) {
    next(error);
  }
});

// Invite player to team - requires team management permission
router.post(
  '/:id/invitations',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;
      const invitedBy = req.user!.userId;

      if (!playerId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'playerId is required',
          },
        });
        return;
      }

      const invitation = await teamService.invitePlayer(id, playerId, invitedBy);
      res.status(201).json(invitation);
    } catch (error) {
      next(error);
    }
  }
);

// Get team invitations
router.get('/:id/invitations', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const invitations = await teamService.getTeamInvitations(id);
    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

// Accept invitation - requires being the invited player
router.post(
  '/invitations/:invitationId/accept',
  authenticate,
  requireInvitationRecipient,
  async (req: AuthRequest, res, next) => {
    try {
      const { invitationId } = req.params;
      const playerId = req.user!.userId;

      await teamService.acceptInvitation(invitationId, playerId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Decline invitation - requires being the invited player
router.post(
  '/invitations/:invitationId/decline',
  authenticate,
  requireInvitationRecipient,
  async (req: AuthRequest, res, next) => {
    try {
      const { invitationId } = req.params;
      const playerId = req.user!.userId;

      await teamService.declineInvitation(invitationId, playerId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Get player's invitations
router.get('/invitations/player/:playerId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { playerId } = req.params;
    const invitations = await teamService.getPlayerInvitations(playerId);
    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

// Add player to roster - requires team management permission
router.post(
  '/:id/roster',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;

      if (!playerId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'playerId is required',
          },
        });
        return;
      }

      await teamService.addPlayerToRoster(id, playerId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Remove player from roster - requires team management permission
router.delete(
  '/:id/roster/:playerId',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next) => {
    try {
      const { id, playerId } = req.params;
      await teamService.removePlayerFromRoster(id, playerId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Validate roster for tournament registration
router.get('/:id/roster/validate-tournament/:sport', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id, sport } = req.params;
    const validation = await teamService.validateRosterForTournament(id, sport as any);
    res.json(validation);
  } catch (error) {
    next(error);
  }
});

export default router;
