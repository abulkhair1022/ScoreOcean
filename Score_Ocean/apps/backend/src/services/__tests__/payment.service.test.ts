import { PaymentService } from '../payment.service';
import { query } from '../../db/postgres';

// Mock dependencies
jest.mock('../../db/postgres');
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
  });

  describe('calculateCommission', () => {
    it('should calculate commission correctly', () => {
      const amount = 1000;
      const commission = paymentService.calculateCommission(amount);
      
      // Default commission rate is 5% (0.05)
      expect(commission).toBe(50);
    });

    it('should round commission to 2 decimal places', () => {
      const amount = 333.33;
      const commission = paymentService.calculateCommission(amount);
      
      // 333.33 * 0.05 = 16.6665, rounded to 16.67
      expect(commission).toBe(16.67);
    });

    it('should handle zero amount', () => {
      const amount = 0;
      const commission = paymentService.calculateCommission(amount);
      
      expect(commission).toBe(0);
    });

    it('should handle large amounts', () => {
      const amount = 100000;
      const commission = paymentService.calculateCommission(amount);
      
      expect(commission).toBe(5000);
    });
  });

  describe('getPayment', () => {
    it('should return payment when found', async () => {
      const mockPayment = {
        id: 'payment-123',
        user_id: 'user-123',
        tournament_id: 'tournament-123',
        amount: '1000.00',
        commission: '50.00',
        status: 'COMPLETED',
        gateway_transaction_id: 'stripe-123',
        created_at: new Date(),
        completed_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockPayment],
        rowCount: 1,
      } as any);

      const result = await paymentService.getPayment('payment-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('payment-123');
      expect(result?.amount).toBe(1000);
      expect(result?.commission).toBe(50);
      expect(result?.status).toBe('COMPLETED');
    });

    it('should return null when payment not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await paymentService.getPayment('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history for user', async () => {
      const mockTransactions = [
        {
          id: 'payment-1',
          user_id: 'user-123',
          tournament_id: 'tournament-1',
          amount: '1000.00',
          commission: '50.00',
          status: 'COMPLETED',
          gateway_transaction_id: 'stripe-1',
          created_at: new Date(),
          completed_at: new Date(),
          tournament_name: 'Tournament 1',
        },
        {
          id: 'payment-2',
          user_id: 'user-123',
          tournament_id: 'tournament-2',
          amount: '2000.00',
          commission: '100.00',
          status: 'PENDING',
          gateway_transaction_id: 'stripe-2',
          created_at: new Date(),
          completed_at: null,
          tournament_name: 'Tournament 2',
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockTransactions,
        rowCount: 2,
      } as any);

      const result = await paymentService.getTransactionHistory('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(1000);
      expect(result[1].amount).toBe(2000);
    });

    it('should return empty array when no transactions found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await paymentService.getTransactionHistory('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('calculateHostRevenue', () => {
    it('should calculate total revenue for host', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_revenue: '4500.00' }],
        rowCount: 1,
      } as any);

      const result = await paymentService.calculateHostRevenue('host-123');

      expect(result).toBe(4500);
    });

    it('should return 0 when no revenue', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_revenue: '0' }],
        rowCount: 1,
      } as any);

      const result = await paymentService.calculateHostRevenue('host-123');

      expect(result).toBe(0);
    });
  });

  describe('requestPayout', () => {
    it('should create payout request when revenue available', async () => {
      // Mock revenue calculation
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_revenue: '5000.00' }],
        rowCount: 1,
      } as any);

      // Mock pending payout check
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock payout creation
      const mockPayout = {
        id: 'payout-123',
        host_id: 'host-123',
        amount: '5000.00',
        status: 'REQUESTED',
        requested_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockPayout],
        rowCount: 1,
      } as any);

      const result = await paymentService.requestPayout('host-123');

      expect(result).toBeDefined();
      expect(result.amount).toBe(5000);
      expect(result.status).toBe('REQUESTED');
    });

    it('should throw error when no revenue available', async () => {
      // Mock revenue calculation
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_revenue: '0' }],
        rowCount: 1,
      } as any);

      await expect(paymentService.requestPayout('host-123')).rejects.toThrow(
        'No revenue available for payout.'
      );
    });

    it('should throw error when pending payout exists', async () => {
      // Mock revenue calculation
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_revenue: '5000.00' }],
        rowCount: 1,
      } as any);

      // Mock pending payout check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'payout-existing' }],
        rowCount: 1,
      } as any);

      await expect(paymentService.requestPayout('host-123')).rejects.toThrow(
        'You already have a pending payout request.'
      );
    });
  });
});
