export enum AuctionStatus {
  SETUP = 'SETUP',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface Auction {
  id: string;
  tournamentId: string;
  status: AuctionStatus;
  config: AuctionConfig;
  playerPool: AuctionPlayer[];
  teamBudgets: TeamBudget[];
  currentPlayerIndex: number;
  results: AuctionResult[];
  createdAt: Date;
}

export interface AuctionConfig {
  teamBudget: number;
  minSquadSize: number;
  maxSquadSize: number;
  bidIncrement: number;
  bidTimeout: number;
}

export interface AuctionPlayer {
  playerId: string;
  basePrice: number;
  currentBid: number;
  currentBidder?: string;
  status: PlayerAuctionStatus;
  bids: Bid[];
}

export enum PlayerAuctionStatus {
  PENDING = 'PENDING',
  BIDDING = 'BIDDING',
  SOLD = 'SOLD',
  UNSOLD = 'UNSOLD',
}

export interface Bid {
  id: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  amount: number;
  timestamp: Date;
}

export interface TeamBudget {
  teamId: string;
  totalBudget: number;
  remainingBudget: number;
  playersAcquired: number;
}

export interface AuctionResult {
  playerId: string;
  teamId: string;
  finalPrice: number;
  totalBids: number;
}

export interface AuctionEvent {
  type: 'BID_PLACED' | 'PLAYER_SOLD' | 'PLAYER_UNSOLD' | 'NEXT_PLAYER';
  data: any;
  timestamp: Date;
}
