export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
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

export interface PaymentCreate {
  userId: string;
  tournamentId: string;
  amount: number;
}

export interface PaymentSession {
  sessionId: string;
  paymentUrl: string;
  expiresAt: Date;
}

export enum PayoutStatus {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export interface Payout {
  id: string;
  hostId: string;
  amount: number;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt?: Date;
}
