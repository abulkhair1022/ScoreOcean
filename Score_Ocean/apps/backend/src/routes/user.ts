import { Router } from 'express';
import { userService } from '../services/user.service';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get current user's profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
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

// Create user profile
router.post('/:id/profile', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = req.body;

    // Validate required fields
    if (!profile.name || !profile.location || !profile.contactDetails) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, location, contactDetails',
        },
      });
    }

    const user = await userService.createProfile(id, profile);
    return res.status(201).json(user);
  } catch (error: any) {
    return next(error);
  }
});

// Update user profile
router.put('/:id/profile', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await userService.updateProfile(id, updates);
    res.json(user);
  } catch (error: any) {
    next(error);
  }
});

// Delete user profile
router.delete('/:id/profile', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteProfile(id);
    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
});

// Sport profile routes
router.post('/:id/sport-profiles', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sport } = req.body;

    if (!sport) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sport is required',
        },
      });
    }

    const sportProfile = await userService.addSportProfile(id, sport);
    return res.status(201).json(sportProfile);
  } catch (error: any) {
    return next(error);
  }
});

router.put('/:id/sport-profiles/:sportId', authenticate, async (req, res, next) => {
  try {
    const { id, sportId } = req.params;
    const stats = req.body;

    const sportProfile = await userService.updateSportProfile(id, sportId, stats);
    res.json(sportProfile);
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id/performance-stats', authenticate, async (req, res, next) => {
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
