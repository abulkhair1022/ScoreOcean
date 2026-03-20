import { Router } from 'express';
import { matchChallengeService } from '../services/matchChallenge.service';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Create a match challenge
 */
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const challengeData = req.body;

    const challenge = await matchChallengeService.createChallenge(userId, challengeData);
    
    res.status(201).json({
      success: true,
      message: 'Match challenge created successfully',
      data: challenge,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get received challenges (challenges to user's teams)
 */
router.get('/received', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const challenges = await matchChallengeService.getReceivedChallenges(userId);
    
    res.json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get sent challenges (challenges from user's teams)
 */
router.get('/sent', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const challenges = await matchChallengeService.getSentChallenges(userId);
    
    res.json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Accept a match challenge
 */
router.post('/:id/accept', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await matchChallengeService.acceptChallenge(userId, id);
    
    res.json({
      success: true,
      message: 'Challenge accepted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Decline a match challenge
 */
router.post('/:id/decline', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await matchChallengeService.declineChallenge(userId, id);
    
    res.json({
      success: true,
      message: 'Challenge declined',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel a match challenge
 */
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await matchChallengeService.cancelChallenge(userId, id);
    
    res.json({
      success: true,
      message: 'Challenge cancelled',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
