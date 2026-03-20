import { Sport } from './common';
import { MatchStatus } from './tournament';

export interface Match {
  id: string;
  fixtureId: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  sport: Sport;
  status: MatchStatus;
  score: Score;
  playerPerformances: PlayerPerformance[];
  startTime?: Date;
  endTime?: Date;
  scoreHistory: ScoreUpdate[];
}

export interface Score {
  homeScore: number;
  awayScore: number;
  sportSpecificData: SportScore;
}

export interface ScoreUpdate {
  timestamp: Date;
  homeScore: number;
  awayScore: number;
  sportSpecificData: SportScore;
  updatedBy: string;
}

export interface PlayerPerformance {
  playerId: string;
  teamId: string;
  statistics: any;
}

export type SportScore = CricketScore | FootballScore | KabaddiScore | VolleyballScore;

export interface CricketScore {
  runs: number;
  wickets: number;
  overs: number;
  runRate: number;
}

export interface FootballScore {
  goals: number;
  yellowCards: number;
  redCards: number;
}

export interface KabaddiScore {
  points: number;
  allOuts: number;
}

export interface VolleyballScore {
  sets: number;
  points: number;
}
