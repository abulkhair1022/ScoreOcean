import { Router } from 'express';
import { userService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserRole } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { userSchemas } from '../middleware/validationSchemas';

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
