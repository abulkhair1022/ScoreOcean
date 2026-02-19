import Stripe from 'stripe';
import { query } from '../db/postgres';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

export interface PaymentCreate {
  userId: string;
  tournamentId: string;
  amount: number;
}

export interface Payment {
  id: string;
  userId: string;
  tournamentId: string;
  amount: number;
  commission: number;
  status: PaymentStatus;
  gatewayTransactionId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaymentSession {
  sessionId: string;
  paymentUrl: string;
  expiresAt: Date;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface Payout {
  id: string;
  hostId: string;
  amount: number;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt?: Date;
}

export enum PayoutStatus {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export class PaymentService {
  private stripe: Stripe | null = null;

  constructor() {
    // Initialize Stripe only if credentials are provided
    if (config.payment.gatewayKey && config.payment.gatewaySecret) {
      this.stripe = new Stripe(config.payment.gatewaySecret, {
        apiVersion: '2026-01-28.clover',
      });
    }
  }

  /**
   * Check if payment gateway is configured
   */
  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new AppError(
        'Payment gateway is not configured. Please contact support.',
        503
      );
    }
  }

  /**
   * Calculate commission amount
   */
  calculateCommission(amount: number): number {
    return Math.round(amount * config.payment.commissionRate * 100) / 100;
  }

  /**
   * Initiate payment for tournament registration
   */
  async initiatePayment(paymentData: PaymentCreate): Promise<PaymentSession> {
    this.ensureStripeConfigured();

    // Validate amount
    if (paymentData.amount <= 0) {
      throw new AppError('Payment amount must be greater than zero.', 400);
    }

    // Verify tournament exists
    const tournamentResult = await query(
      'SELECT id, name, registration_fee FROM tournaments WHERE id = $1',
      [paymentData.tournamentId]
    );

    if (tournamentResult.rows.length === 0) {
      throw new AppError('Tournament not found.', 404);
    }

    const tournament = tournamentResult.rows[0];

    // Verify amount matches tournament registration fee
    if (Math.abs(paymentData.amount - parseFloat(tournament.registration_fee)) > 0.01) {
      throw new AppError('Payment amount does not match tournament registration fee.', 400);
    }

    // Calculate commission
    const commission = this.calculateCommission(paymentData.amount);

    // Create payment record
    const paymentResult = await query(
      `INSERT INTO payments (user_id, tournament_id, amount, commission, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, tournament_id, amount, commission, status, created_at`,
      [paymentData.userId, paymentData.tournamentId, paymentData.amount, commission, PaymentStatus.PENDING]
    );

    const payment = paymentResult.rows[0];

    // Create Stripe checkout session
    const session = await this.stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Tournament Registration: ${tournament.name}`,
              description: `Registration fee for ${tournament.name}`,
            },
            unit_amount: Math.round(paymentData.amount * 100), // Convert to paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
      metadata: {
        paymentId: payment.id,
        userId: paymentData.userId,
        tournamentId: paymentData.tournamentId,
      },
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    });

    // Update payment with session ID
    await query(
      'UPDATE payments SET gateway_transaction_id = $1, status = $2 WHERE id = $3',
      [session.id, PaymentStatus.PROCESSING, payment.id]
    );

    return {
      sessionId: session.id,
      paymentUrl: session.url!,
      expiresAt: new Date(session.expires_at * 1000),
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    this.ensureStripeConfigured();

    if (!config.payment.webhookSecret) {
      throw new AppError('Webhook secret is not configured.', 500);
    }

    let event: Stripe.Event;

    try {
      event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        config.payment.webhookSecret
      );
    } catch (error) {
      throw new AppError('Invalid webhook signature.', 400);
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout session
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const paymentId = session.metadata?.paymentId;

    if (!paymentId) {
      console.error('Payment ID not found in session metadata');
      return;
    }

    await query('BEGIN', []);

    try {
      // Update payment status
      await query(
        'UPDATE payments SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [PaymentStatus.COMPLETED, paymentId]
      );

      // Get payment details
      const paymentResult = await query(
        'SELECT tournament_id, user_id FROM payments WHERE id = $1',
        [paymentId]
      );

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0];

        // Update tournament registration status
        await query(
          'UPDATE tournament_registrations SET status = $1, payment_id = $2 WHERE tournament_id = $3 AND team_id IN (SELECT id FROM teams WHERE host_id = $4)',
          ['CONFIRMED', paymentId, payment.tournament_id, payment.user_id]
        );

        // Get tournament and team details for notification
        const tournamentResult = await query(
          'SELECT name FROM tournaments WHERE id = $1',
          [payment.tournament_id]
        );

        const teamResult = await query(
          'SELECT id, name FROM teams WHERE host_id = $1',
          [payment.user_id]
        );

        if (tournamentResult.rows.length > 0 && teamResult.rows.length > 0) {
          const tournament = tournamentResult.rows[0];
          const team = teamResult.rows[0];

          // Send confirmation notification to team host
          await query(
            `INSERT INTO notifications (user_id, type, title, message, channels, data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              payment.user_id,
              'REGISTRATION_CONFIRMED',
              'Payment Successful - Registration Confirmed',
              `Payment successful! Your team "${team.name}" has been registered for "${tournament.name}"`,
              ['IN_APP', 'EMAIL'],
              JSON.stringify({ tournamentId: payment.tournament_id, teamId: team.id, paymentId }),
            ]
          );

          // Send notifications to all team members
          const membersResult = await query(
            'SELECT player_id FROM team_rosters WHERE team_id = $1',
            [team.id]
          );

          for (const member of membersResult.rows) {
            await query(
              `INSERT INTO notifications (user_id, type, title, message, channels, data)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                member.player_id,
                'REGISTRATION_CONFIRMED',
                'Team Registration Confirmed',
                `Your team "${team.name}" has been registered for "${tournament.name}"`,
                ['IN_APP', 'EMAIL'],
                JSON.stringify({ tournamentId: payment.tournament_id, teamId: team.id }),
              ]
            );
          }
        }
      }

      await query('COMMIT', []);
    } catch (error) {
      await query('ROLLBACK', []);
      console.error('Error handling checkout session completed:', error);
      throw error;
    }
  }

  /**
   * Handle expired checkout session
   */
  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
    const paymentId = session.metadata?.paymentId;

    if (!paymentId) {
      console.error('Payment ID not found in session metadata');
      return;
    }

    // Update payment status to failed
    await query(
      'UPDATE payments SET status = $1 WHERE id = $2',
      [PaymentStatus.FAILED, paymentId]
    );

    // Get payment details for notification
    const paymentResult = await query(
      'SELECT user_id, tournament_id FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];

      // Send notification about payment expiration
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          payment.user_id,
          'TOURNAMENT_UPDATE',
          'Payment Session Expired',
          'Your payment session has expired. Please try registering again.',
          ['IN_APP', 'EMAIL'],
          JSON.stringify({ tournamentId: payment.tournament_id, paymentId }),
        ]
      );
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Find payment by gateway transaction ID
    const paymentResult = await query(
      'SELECT id, user_id, tournament_id FROM payments WHERE gateway_transaction_id = $1',
      [paymentIntent.id]
    );

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];
      
      await query(
        'UPDATE payments SET status = $1 WHERE id = $2',
        [PaymentStatus.FAILED, payment.id]
      );

      // Send notification about payment failure
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          payment.user_id,
          'TOURNAMENT_UPDATE',
          'Payment Failed',
          'Your payment failed. Please try again or contact support if the issue persists.',
          ['IN_APP', 'EMAIL'],
          JSON.stringify({ tournamentId: payment.tournament_id, paymentId: payment.id }),
        ]
      );
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    const result = await query(
      `SELECT id, user_id, tournament_id, amount, commission, status, 
              gateway_transaction_id, created_at, completed_at
       FROM payments
       WHERE id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      tournamentId: row.tournament_id,
      amount: parseFloat(row.amount),
      commission: parseFloat(row.commission),
      status: row.status as PaymentStatus,
      gatewayTransactionId: row.gateway_transaction_id,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string): Promise<Payment[]> {
    const result = await query(
      `SELECT p.id, p.user_id, p.tournament_id, p.amount, p.commission, p.status,
              p.gateway_transaction_id, p.created_at, p.completed_at,
              t.name as tournament_name
       FROM payments p
       JOIN tournaments t ON p.tournament_id = t.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      tournamentId: row.tournament_id,
      amount: parseFloat(row.amount),
      commission: parseFloat(row.commission),
      status: row.status as PaymentStatus,
      gatewayTransactionId: row.gateway_transaction_id,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  }

  /**
   * Calculate total revenue for a tournament host
   */
  async calculateHostRevenue(hostId: string): Promise<number> {
    const result = await query(
      `SELECT COALESCE(SUM(p.amount - p.commission), 0) as total_revenue
       FROM payments p
       JOIN tournaments t ON p.tournament_id = t.id
       WHERE t.host_id = $1 AND p.status = $2`,
      [hostId, PaymentStatus.COMPLETED]
    );

    return parseFloat(result.rows[0].total_revenue);
  }

  /**
   * Request payout for tournament host
   */
  async requestPayout(hostId: string): Promise<Payout> {
    // Calculate available revenue
    const revenue = await this.calculateHostRevenue(hostId);

    if (revenue <= 0) {
      throw new AppError('No revenue available for payout.', 400);
    }

    // Check for pending payouts
    const pendingResult = await query(
      `SELECT id FROM payouts 
       WHERE host_id = $1 AND status IN ($2, $3)`,
      [hostId, PayoutStatus.REQUESTED, PayoutStatus.PROCESSING]
    );

    if (pendingResult.rows.length > 0) {
      throw new AppError('You already have a pending payout request.', 400);
    }

    // Create payout request
    const result = await query(
      `INSERT INTO payouts (host_id, amount, status)
       VALUES ($1, $2, $3)
       RETURNING id, host_id, amount, status, requested_at`,
      [hostId, revenue, PayoutStatus.REQUESTED]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      hostId: row.host_id,
      amount: parseFloat(row.amount),
      status: row.status as PayoutStatus,
      requestedAt: row.requested_at,
    };
  }
}

export const paymentService = new PaymentService();
