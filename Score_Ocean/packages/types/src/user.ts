import { Location, Sport } from './common';

export enum UserRole {
  PLAYER = 'PLAYER',
  TEAM = 'TEAM',
  ORGANIZATION = 'ORGANIZATION',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  sportProfiles: SportProfile[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  age: number;
  location: Location;
  contactDetails: ContactDetails;
  avatarUrl?: string;
}

export interface ContactDetails {
  phone?: string;
  email: string;
}

export interface SportProfile {
  id: string;
  sport: Sport;
  statistics: SportStats;
  matchHistory: MatchParticipation[];
}

export type SportStats = CricketStats | FootballStats | KabaddiStats | VolleyballStats;

export interface CricketStats {
  runs: number;
  wickets: number;
  battingAverage: number;
  bowlingAverage: number;
  strikeRate: number;
}

export interface FootballStats {
  goals: number;
  assists: number;
  cleanSheets: number;
  saves: number;
  yellowCards: number;
  redCards: number;
}

export interface KabaddiStats {
  raidPoints: number;
  tacklePoints: number;
  superRaids: number;
  superTackles: number;
}

export interface VolleyballStats {
  spikes: number;
  blocks: number;
  serves: number;
  digs: number;
  aces: number;
}

export interface MatchParticipation {
  matchId: string;
  tournamentId: string;
  date: Date;
  performance: SportStats;
}

export interface PerformanceStats {
  aggregated: SportStats;
  matchCount: number;
  trends: StatsTrend[];
}

export interface StatsTrend {
  date: Date;
  value: number;
  metric: string;
}

export interface StatsFilter {
  dateRange?: { start: Date; end: Date };
  tournamentId?: string;
  sport?: Sport;
}
