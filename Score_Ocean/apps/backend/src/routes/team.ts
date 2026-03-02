import { Router } from 'express';
import { teamService } from '../services/team.service';
import { query } from '../db/postgres';
import { notificationService, NotificationType, NotificationChannel } from '../services/notification.service';
import {
  authenticate,
  AuthRequest,
  requireResourceOwnership,
  requireTeamManagementPermission,
  requireInvitationRecipient,
} from '../middleware/auth';

const router = Router();

// Get all teams (for browsing - returns all teams in the system)
router.get('/browse', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { sport } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (sport) {
      whereClause = 'WHERE sport = $1';
      params.push(sport);
    }
    
    const result = await query(
      `SELECT * FROM teams ${whereClause} ORDER BY created_at DESC LIMIT 100`,
      params
    );
    
    const teams = await Promise.all(
      result.rows.map(async (row) => {
        const roster = await teamService.getRoster(row.id);
        return {
          id: row.id,
          name: row.name,
          sport: row.sport,
          location: {
            city: row.city || '',
            state: row.state || '',
            country: row.country || '',
          },
          hostId: row.host_id,
          roster,
          statistics: row.statistics || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0 },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      })
    );
    
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

// Get all teams (for browsing/searching)
router.get('/all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { sport } = req.query;
    const filters = sport ? { sport: sport as string } : undefined;
    const teams = await teamService.getAllTeams(filters);
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

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

// ── Org-Team Affiliation Routes ─────────────────────────────────────────────

// Get teams affiliated with this org
router.get('/org-affiliates', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orgId = req.user!.userId;
    const result = await query(
      `SELECT t.* FROM teams t WHERE t.organization_id = $1 ORDER BY t.created_at DESC`,
      [orgId]
    );
    const teams = await Promise.all(
      result.rows.map(async (row) => {
        const roster = await teamService.getRoster(row.id);
        return {
          id: row.id, name: row.name, sport: row.sport,
          location: { city: row.city || '', state: row.state || '', country: row.country || '' },
          hostId: row.host_id, organizationId: row.organization_id,
          roster, statistics: row.statistics || {},
          createdAt: row.created_at, updatedAt: row.updated_at,
        };
      })
    );
    res.json(teams);
  } catch (error) { next(error); }
});

// Get pending org invitations for the current team host
router.get('/org-invitations/pending', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const result = await query(
      `SELECT oti.id, oti.org_id, oti.team_id, oti.status, oti.created_at,
              t.name AS team_name, up.name AS org_name
       FROM org_team_invitations oti
       JOIN teams t ON t.id = oti.team_id
       LEFT JOIN user_profiles up ON up.user_id = oti.org_id
       WHERE t.host_id = $1 AND oti.status = 'PENDING'
       ORDER BY oti.created_at DESC`,
      [userId]
    );
    res.json(result.rows.map((r) => ({
      id: r.id, orgId: r.org_id, orgName: r.org_name || 'Unknown Org',
      teamId: r.team_id, teamName: r.team_name, status: r.status, createdAt: r.created_at,
    })));
  } catch (error) { next(error); }
});

// Accept org invite (called by team host)
router.post('/org-invitations/:inviteId/accept', authenticate, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { inviteId } = req.params;
    const invite = await query(
      `SELECT oti.*, t.host_id FROM org_team_invitations oti JOIN teams t ON t.id = oti.team_id WHERE oti.id = $1`,
      [inviteId]
    );
    if (invite.rows.length === 0) { res.status(404).json({ error: { message: 'Invitation not found' } }); return; }
    if (invite.rows[0].host_id !== userId) { res.status(403).json({ error: { message: 'Not authorized' } }); return; }
    await query(`UPDATE org_team_invitations SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1`, [inviteId]);
    await query(`UPDATE teams SET organization_id = $1, updated_at = NOW() WHERE id = $2`, [invite.rows[0].org_id, invite.rows[0].team_id]);
    res.json({ message: 'Invitation accepted' });
  } catch (error) { next(error); }
});

// Reject org invite
router.post('/org-invitations/:inviteId/reject', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { inviteId } = req.params;
    await query(`UPDATE org_team_invitations SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`, [inviteId]);
    res.json({ message: 'Invitation rejected' });
  } catch (error) { next(error); }
});

// ── Standard Team Routes ─────────────────────────────────────────────────────

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

// Send org invite to a team (org invites team to affiliate)
router.post('/:id/org-invite', authenticate, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const orgId = req.user!.userId;
    const teamId = req.params.id;

    // Check already invited
    const existing = await query(`SELECT id FROM org_team_invitations WHERE org_id = $1 AND team_id = $2`, [orgId, teamId]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: { message: 'Invite already sent to this team' } }); return;
    }

    // Get team
    const teamResult = await query('SELECT host_id, name FROM teams WHERE id = $1', [teamId]);
    if (teamResult.rows.length === 0) { res.status(404).json({ error: { message: 'Team not found' } }); return; }
    const teamHostId = teamResult.rows[0].host_id;
    const teamName = teamResult.rows[0].name;

    // Get org name from profile
    const orgResult = await query(`SELECT name FROM user_profiles WHERE user_id = $1`, [orgId]);
    const orgName = orgResult.rows[0]?.name || 'An organization';

    // Create invitation record
    const inviteResult = await query(
      `INSERT INTO org_team_invitations (org_id, team_id, status) VALUES ($1, $2, 'PENDING') RETURNING *`,
      [orgId, teamId]
    );

    // Notify team host
    await notificationService.sendNotification({
      userId: teamHostId,
      type: NotificationType.TEAM_INVITATION,
      title: 'Organization Invite',
      message: `${orgName} has invited "${teamName}" to join their organization`,
      data: {
        inviteId: inviteResult.rows[0].id,
        orgId, orgName, teamId, teamName, inviteType: 'ORG_INVITE',
      },
      channels: [NotificationChannel.IN_APP],
    });

    res.status(201).json({ message: 'Invitation sent', inviteId: inviteResult.rows[0].id });
  } catch (error) { next(error); }
});

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

// Player leaves their current team
router.post('/leave', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const playerId = req.user!.userId;
    
    // Verify user is a player
    if (req.user!.role !== 'PLAYER') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only players can leave teams',
        },
      });
    }

    await teamService.leaveTeam(playerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get player's current team
router.get('/player/:playerId/team', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { playerId } = req.params;
    const team = await teamService.getPlayerTeam(playerId);
    
    if (!team) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Player is not a member of any team',
        },
      });
    }
    
    res.json(team);
  } catch (error) {
    next(error);
  }
});

// Player requests to leave a team
router.post('/:id/leave-request', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const playerId = req.user!.userId;
    const { id: teamId } = req.params;
    const { reason } = req.body;
    await teamService.requestLeave(playerId, teamId, reason);
    res.json({ message: 'Leave request submitted. The team host will review it.' });
  } catch (error) {
    next(error);
  }
});

// Get pending leave requests for a team (host only)
router.get('/:id/leave-requests', authenticate, requireTeamManagementPermission, async (req: AuthRequest, res, next) => {
  try {
    const { id: teamId } = req.params;
    const requests = await teamService.getLeaveRequests(teamId);
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get current player's own leave request for a team
router.get('/:id/leave-requests/my', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const playerId = req.user!.userId;
    const { id: teamId } = req.params;
    const result = await query(
      `SELECT id, status, reason, created_at FROM team_leave_requests
       WHERE team_id = $1 AND player_id = $2 AND status = 'PENDING' LIMIT 1`,
      [teamId, playerId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    next(error);
  }
});

// Approve a leave request (host only)
router.post('/:id/leave-requests/:requestId/approve', authenticate, requireTeamManagementPermission, async (req: AuthRequest, res, next) => {
  try {
    const { id: teamId, requestId } = req.params;
    await teamService.approveLeaveRequest(requestId, teamId);
    res.json({ message: 'Leave request approved. Player has been removed from the team.' });
  } catch (error) {
    next(error);
  }
});

// Reject a leave request (host only)
router.post('/:id/leave-requests/:requestId/reject', authenticate, requireTeamManagementPermission, async (req: AuthRequest, res, next) => {
  try {
    const { id: teamId, requestId } = req.params;
    await teamService.rejectLeaveRequest(requestId, teamId);
    res.json({ message: 'Leave request rejected.' });
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

// Get team's sport profiles
router.get('/:id/sports', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const sportProfiles = await teamService.getTeamSportProfiles(id);
    res.json(sportProfiles);
  } catch (error) {
    next(error);
  }
});

// Add a sport to team
router.post(
  '/:id/sports',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const { id } = req.params;
      const { sport } = req.body;

      if (!sport) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'sport is required',
          },
        });
        return;
      }

      await teamService.addSportToTeam(id, sport);
      res.status(201).json({ message: 'Sport added successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Remove a sport from team
router.delete(
  '/:id/sports/:sport',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next) => {
    try {
      const { id, sport } = req.params;
      await teamService.removeSportFromTeam(id, sport as any);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Change team's primary sport
router.put(
  '/:id/primary-sport',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const { id } = req.params;
      const { sport } = req.body;

      if (!sport) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'sport is required',
          },
        });
        return;
      }

      await teamService.changePrimarySport(id, sport);
      res.json({ message: 'Primary sport changed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Assign captain to team
router.put(
  '/:id/captain',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const { id } = req.params;
      const { captainId } = req.body;

      if (!captainId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'captainId is required',
          },
        });
        return;
      }

      await teamService.assignCaptain(id, captainId);
      res.json({ message: 'Captain assigned successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Join organization
router.post(
  '/:id/join-organization',
  authenticate,
  requireTeamManagementPermission,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const { id } = req.params;
      const { organizationId } = req.body;

      if (!organizationId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organizationId is required',
          },
        });
        return;
      }

      await teamService.joinOrganization(id, organizationId);
      res.json({ message: 'Successfully joined organization' });
    } catch (error) {
      next(error);
    }
  }
);

// Get teams by organization
router.get('/organization/:organizationId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { organizationId } = req.params;
    const teams = await teamService.getTeamsByOrganization(organizationId);
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

export default router;
