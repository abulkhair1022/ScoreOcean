import Razorpay from 'razorpay';
import crypto from 'crypto';
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
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
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
  private razorpay: Razorpay | null = null;

  constructor() {
    // Initialize Razorpay only if credentials are provided
    if (config.payment.gatewayKey && config.payment.gatewaySecret) {
      this.razorpay = new Razorpay({
        key_id: config.payment.gatewayKey,
        key_secret: config.payment.gatewaySecret,
      });
    }
  }

  /**
   * Check if payment gateway is configured
   */
  private ensureRazorpayConfigured(): void {
    if (!this.razorpay) {
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
    this.ensureRazorpayConfigured();

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

    // Create Razorpay order
    const order = await this.razorpay!.orders.create({
      amount: Math.round(paymentData.amount * 100), // Convert to paise
      currency: 'INR',
      receipt: payment.id,
      notes: {
        paymentId: payment.id,
        userId: paymentData.userId,
        tournamentId: paymentData.tournamentId,
        tournamentName: tournament.name,
      },
    });

    // Update payment with order ID
    await query(
      'UPDATE payments SET gateway_transaction_id = $1, status = $2 WHERE id = $3',
      [order.id, PaymentStatus.PROCESSING, payment.id]
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.payment.gatewayKey!,
    };
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    if (!config.payment.gatewaySecret) {
      throw new AppError('Payment gateway secret is not configured.', 500);
    }

    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', config.payment.gatewaySecret)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  }

  /**
   * Complete payment after verification (for local development without webhooks)
   */
  async completePayment(orderId: string, paymentId: string): Promise<void> {
    // Find payment by order ID
    const paymentResult = await query(
      'SELECT id, user_id, tournament_id FROM payments WHERE gateway_transaction_id = $1',
      [orderId]
    );

    if (paymentResult.rows.length === 0) {
      throw new AppError('Payment not found.', 404);
    }

    const payment = paymentResult.rows[0];

    // Simulate the webhook payment captured event
    await this.handlePaymentCaptured({
      order_id: orderId,
      id: paymentId,
      status: 'captured'
    });
  }

  /**
   * Handle Razorpay webhook events
   */
  async handleWebhook(payload: any, signature: string): Promise<void> {
    this.ensureRazorpayConfigured();

    if (!config.payment.webhookSecret) {
      throw new AppError('Webhook secret is not configured.', 500);
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', config.payment.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new AppError('Invalid webhook signature.', 400);
    }

    const event = payload.event;

    // Handle different event types
    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload.payload.payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload.payload.payment.entity);
        break;
      case 'order.paid':
        await this.handleOrderPaid(payload.payload.order.entity);
        break;
      default:
        console.log(`Unhandled event type: ${event}`);
    }
  }

  /**
   * Handle successful payment capture
   */
  private async handlePaymentCaptured(payment: any): Promise<void> {
    const orderId = payment.order_id;

    // Find payment by order ID
    const paymentResult = await query(
      'SELECT id, user_id, tournament_id FROM payments WHERE gateway_transaction_id = $1',
      [orderId]
    );

    if (paymentResult.rows.length === 0) {
      console.error('Payment not found for order ID:', orderId);
      return;
    }

    const dbPayment = paymentResult.rows[0];

    await query('BEGIN', []);

    try {
      // Update payment status
      await query(
        'UPDATE payments SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [PaymentStatus.COMPLETED, dbPayment.id]
      );

      // Get tournament details
      const tournamentResult = await query(
        'SELECT name, format FROM tournaments WHERE id = $1',
        [dbPayment.tournament_id]
      );

      if (tournamentResult.rows.length === 0) {
        throw new Error('Tournament not found');
      }

      const tournament = tournamentResult.rows[0];
      const isLeague = tournament.format === 'LEAGUE';

      if (isLeague) {
        // For leagues: Update player registration
        await query(
          'UPDATE tournament_registrations SET status = $1, payment_id = $2 WHERE tournament_id = $3 AND player_id = $4',
          ['CONFIRMED', dbPayment.id, dbPayment.tournament_id, dbPayment.user_id]
        );

        // Send confirmation notification to player
        await query(
          `INSERT INTO notifications (user_id, type, title, message, channels, data)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            dbPayment.user_id,
            'REGISTRATION_CONFIRMED',
            'Payment Successful - Registration Confirmed',
            `Payment successful! You have been registered for "${tournament.name}". Teams will be formed after the auction.`,
            ['IN_APP', 'EMAIL'],
            JSON.stringify({ tournamentId: dbPayment.tournament_id, paymentId: dbPayment.id }),
          ]
        );
      } else {
        // For tournaments: Update team registration
        await query(
          'UPDATE tournament_registrations SET status = $1, payment_id = $2 WHERE tournament_id = $3 AND team_id IN (SELECT id FROM teams WHERE host_id = $4)',
          ['CONFIRMED', dbPayment.id, dbPayment.tournament_id, dbPayment.user_id]
        );

        // Get team details
        const teamResult = await query(
          'SELECT id, name FROM teams WHERE host_id = $1',
          [dbPayment.user_id]
        );

        if (teamResult.rows.length > 0) {
          const team = teamResult.rows[0];

          // Send confirmation notification to team host
          await query(
            `INSERT INTO notifications (user_id, type, title, message, channels, data)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              dbPayment.user_id,
              'REGISTRATION_CONFIRMED',
              'Payment Successful - Registration Confirmed',
              `Payment successful! Your team "${team.name}" has been registered for "${tournament.name}"`,
              ['IN_APP', 'EMAIL'],
              JSON.stringify({ tournamentId: dbPayment.tournament_id, teamId: team.id, paymentId: dbPayment.id }),
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
                JSON.stringify({ tournamentId: dbPayment.tournament_id, teamId: team.id }),
              ]
            );
          }
        }
      }

      await query('COMMIT', []);
    } catch (error) {
      await query('ROLLBACK', []);
      console.error('Error handling payment captured:', error);
      throw error;
    }
  }

  /**
   * Handle order paid event
   */
  private async handleOrderPaid(order: any): Promise<void> {
    // This is called when an order is fully paid
    // We handle this in handlePaymentCaptured, but keeping for completeness
    console.log('Order paid:', order.id);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(payment: any): Promise<void> {
    const orderId = payment.order_id;

    // Find payment by order ID
    const paymentResult = await query(
      'SELECT id, user_id, tournament_id FROM payments WHERE gateway_transaction_id = $1',
      [orderId]
    );

    if (paymentResult.rows.length > 0) {
      const dbPayment = paymentResult.rows[0];
      
      await query(
        'UPDATE payments SET status = $1 WHERE id = $2',
        [PaymentStatus.FAILED, dbPayment.id]
      );

      // Send notification about payment failure
      await query(
        `INSERT INTO notifications (user_id, type, title, message, channels, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          dbPayment.user_id,
          'TOURNAMENT_UPDATE',
          'Payment Failed',
          `Your payment failed. Reason: ${payment.error_description || 'Unknown error'}. Please try again or contact support.`,
          ['IN_APP', 'EMAIL'],
          JSON.stringify({ tournamentId: dbPayment.tournament_id, paymentId: dbPayment.id }),
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
