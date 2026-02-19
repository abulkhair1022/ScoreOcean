import { Router, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * Initiate payment for tournament registration
 * POST /api/payments/initiate
 */
router.post('/initiate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tournamentId, amount } = req.body;
    const userId = req.user!.userId;

    if (!tournamentId || !amount) {
      throw new AppError('Tournament ID and amount are required.', 400);
    }

    const session = await paymentService.initiatePayment({
      userId,
      tournamentId,
      amount: parseFloat(amount),
    });

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Handle Stripe webhook events
 * POST /api/payments/webhook
 */
router.post('/webhook', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      throw new AppError('Missing Stripe signature.', 400);
    }

    // Get raw body for signature verification
    const payload = req.body;

    await paymentService.handleWebhook(payload, signature);

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Get payment details
 * GET /api/payments/:paymentId
 */
router.get('/:paymentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;
    const payment = await paymentService.getPayment(paymentId);

    if (!payment) {
      throw new AppError('Payment not found.', 404);
    }

    // Verify user owns this payment
    if (payment.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new AppError('You do not have permission to view this payment.', 403);
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get transaction history for current user
 * GET /api/payments/history
 */
router.get('/history/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const transactions = await paymentService.getTransactionHistory(userId);

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get host revenue
 * GET /api/payments/revenue/me
 */
router.get('/revenue/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const revenue = await paymentService.calculateHostRevenue(userId);

    res.status(200).json({
      success: true,
      data: { revenue },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Request payout
 * POST /api/payments/payout
 */
router.post('/payout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const payout = await paymentService.requestPayout(userId);

    res.status(201).json({
      success: true,
      data: payout,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
