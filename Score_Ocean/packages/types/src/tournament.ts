import { DateRange, Sport } from './common';

export enum CompetitionType {
  TOURNAMENT = 'TOURNAMENT', // Team-based competitions
  LEAGUE = 'LEAGUE',         // Individual player-based competitions
}

export enum TournamentFormat {
  LEAGUE = 'LEAGUE',
  KNOCKOUT = 'KNOCKOUT',
  GROUP_KNOCKOUT = 'GROUP_KNOCKOUT',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  FIXTURES_PUBLISHED = 'FIXTURES_PUBLISHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface Tournament {
  id: string;
  name: string;
  sport: Sport;
  format: TournamentFormat;
  competitionType: CompetitionType; // NEW: Distinguish between tournament and league
  hostId: string;
  hostType: 'TEAM' | 'ORGANIZATION';
  dates: DateRange;
  venue: string;
  registrationFee: number;
  registrationDeadline: Date;
  teamCapacity: number;
  status: TournamentStatus;
  rules: SportRules;
  registrations: (Registration | PlayerRegistration)[];
  fixtures: Fixture[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentCreate {
  name: string;
  sport: Sport;
  format: TournamentFormat;
  competitionType: CompetitionType; // NEW: Required when creating
  dates: DateRange;
  venue: string;
  registrationFee: number;
  registrationDeadline: Date;
  teamCapacity: number;
  rules: SportRules;
}

export interface SportRules {
  matchDuration: number;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  customRules?: Record<string, any>;
}

export interface Registration {
  id: string;
  tournamentId: string;
  teamId: string;
  status: RegistrationStatus;
  paymentId?: string;
  registeredAt: Date;
}

export interface PlayerRegistration {
  id: string;
  tournamentId: string;
  teamId?: string;
  playerId: string;
  status: RegistrationStatus;
  paymentId?: string;
  registeredAt: Date;
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface Fixture {
  id: string;
  tournamentId: string;
  matchNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  scheduledDate: Date;
  venue: string;
  status: MatchStatus;
  matchId?: string;
}

export enum MatchStatus {
  PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface PointsTable {
  tournamentId: string;
  standings: Standing[];
  lastUpdated: Date;
}

export interface Standing {
  rank: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  tiebreaker: number;
}

export interface FixtureUpdate {
  scheduledDate?: Date;
  venue?: string;
}
