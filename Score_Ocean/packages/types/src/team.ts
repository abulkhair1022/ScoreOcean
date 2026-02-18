import { Location, Sport } from './common';

export interface Team {
  id: string;
  name: string;
  sport: Sport;
  location: Location;
  hostId: string;
  roster: Player[];
  statistics: TeamStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamCreate {
  name: string;
  sport: Sport;
  location: Location;
}

export interface Player {
  id: string;
  name: string;
  joinedAt: Date;
}

export interface TeamStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Invitation {
  id: string;
  teamId: string;
  playerId: string;
  status: InvitationStatus;
  createdAt: Date;
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface RosterValidation {
  isValid: boolean;
  errors: string[];
  minPlayers: number;
  maxPlayers: number;
  currentPlayers: number;
}
