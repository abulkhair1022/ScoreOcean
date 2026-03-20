import { Router } from 'express';
import { userService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserRole } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { userSchemas } from '../middleware/validationSchemas';
import { query } from '../db/postgres';

const router = Router();

/**
 * Middleware to check if user can modify the profile
 * Users can only modify their own profile unless they're admin
 */
const requireProfileOwnership = (req: AuthRequest, _res: any, next: any) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const targetUserId = req.params.id;
  
  // Admin users have unrestricted access
  if (req.user.role === UserRole.ADMIN) {
    return next();
  }

  // Users can only modify their own profile
  if (targetUserId !== req.user.userId) {
    return next(new AppError('You do not have permission to modify this profile', 403));
  }

  next();
};

// Search users by name or email (for team invitations)
router.get('/search', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { q, sport } = req.query;

    if (!q || (q as string).trim().length < 1) {
      res.json([]);
      return;
    }

    const searchTerm = `%${(q as string).trim()}%`;
    const params: any[] = [searchTerm, searchTerm];
    let sportExclusion = '';

    // If sport provided, exclude players already in a team for that sport
    if (sport) {
      params.push(sport);
      sportExclusion = `
        AND u.id NOT IN (
          SELECT tr.player_id FROM team_rosters tr
          JOIN teams t ON tr.team_id = t.id
          WHERE t.sport = $3
        )
      `;
    }

    const result = await query(
      `SELECT u.id, u.email, u.role, up.name, up.avatar_url, up.city, up.state
       FROM users u
       JOIN user_profiles up ON u.id = up.user_id
       WHERE u.role = 'PLAYER'
         AND (up.name ILIKE $1 OR u.email ILIKE $2)
         ${sportExclusion}
       ORDER BY up.name ASC
       LIMIT 20`,
      params
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      name: row.name,
      avatarUrl: row.avatar_url,
      location: { city: row.city || '', state: row.state || '' },
    })));
  } catch (error) {
    next(error);
  }
});

// Get all players (for team invitations, etc.)
router.get('/players/all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { sport, limit = 100 } = req.query;
    
    let whereClause = "WHERE u.role = 'PLAYER'";
    const params: any[] = [];
    let paramIndex = 1;
    
    // Filter by sport if provided
    if (sport) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM sport_profiles sp 
        WHERE sp.user_id = u.id AND sp.sport = $${paramIndex++}
      )`;
      params.push(sport);
    }
    
    const result = await query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        up.name,
        up.city,
        up.state,
        up.country,
        up.avatar_url,
        (
          SELECT json_agg(json_build_object('id', sp.id, 'sport', sp.sport, 'statistics', sp.statistics, 'base_price', sp.base_price))
          FROM sport_profiles sp
          WHERE sp.user_id = u.id
        ) as sport_profiles
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      ${whereClause}
      ORDER BY up.name ASC
      LIMIT $${paramIndex}`,
      [...params, limit]
    );
    
    const players = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      name: row.name,
      location: {
        city: row.city || '',
        state: row.state || '',
        country: row.country || '',
      },
      avatarUrl: row.avatar_url,
      sportProfiles: row.sport_profiles || [],
    }));
    
    res.json(players);
  } catch (error: any) {
    next(error);
  }
});

// Get all organizations (for team joining, etc.)
router.get('/organizations/all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 100 } = req.query;
    
    const result = await query(
      `SELECT 
        u.id,
        u.email,
        u.role,
        up.name,
        up.city,
        up.state,
        up.country,
        up.avatar_url,
        u.created_at
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      WHERE u.role = 'ORGANIZATION'
      ORDER BY up.name ASC
      LIMIT $1`,
      [limit]
    );
    
    const organizations = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      name: row.name,
      location: {
        city: row.city || '',
        state: row.state || '',
        country: row.country || '',
      },
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));
    
    res.json(organizations);
  } catch (error: any) {
    next(error);
  }
});

// Get current user's profile
router.get('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await userService.getProfile(userId);
    res.json(user);
  } catch (error: any) {
    next(error);
  }
});

// Get user profile by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getProfile(id);
    res.json(user);
  } catch (error: any) {
    next(error);
  }
});

// Create user profile - requires ownership
router.post('/:id/profile', authenticate, requireProfileOwnership, validate(userSchemas.createProfile), async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = req.body;

    const user = await userService.createProfile(id, profile);
    return res.status(201).json(user);
  } catch (error: any) {
    return next(error);
  }
});

// Update user profile - requires ownership
router.put('/:id/profile', authenticate, requireProfileOwnership, validate(userSchemas.updateProfile), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await userService.updateProfile(id, updates);
    res.json(user);
  } catch (error: any) {
    next(error);
  }
});

// Delete user profile - requires ownership
router.delete('/:id/profile', authenticate, requireProfileOwnership, async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteProfile(id);
    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
});

// Sport profile routes - requires ownership
router.post('/:id/sport-profiles', authenticate, requireProfileOwnership, validate(userSchemas.addSportProfile), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sport } = req.body;

    const sportProfile = await userService.addSportProfile(id, sport);
    return res.status(201).json(sportProfile);
  } catch (error: any) {
    return next(error);
  }
});

router.put('/:id/sport-profiles/:sportId', authenticate, requireProfileOwnership, async (req, res, next) => {
  try {
    const { id, sportId } = req.params;
    const stats = req.body;

    const sportProfile = await userService.updateSportProfile(id, sportId, stats);
    res.json(sportProfile);
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id/performance-stats', authenticate, validate(userSchemas.getPerformanceStats), async (req, res, next) => {
  try {
    const { id } = req.params;
    const filters: any = {};

    if (req.query.sport) {
      filters.sport = req.query.sport;
    }
    if (req.query.tournamentId) {
      filters.tournamentId = req.query.tournamentId;
    }
    if (req.query.startDate && req.query.endDate) {
      filters.dateRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      };
    }

    const stats = await userService.getPerformanceStats(id, filters);
    res.json(stats);
  } catch (error: any) {
    next(error);
  }
});

export default router;
