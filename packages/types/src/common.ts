export interface Location {
  city: string;
  state: string;
  country: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimeRange {
  start: string;
  end: string;
}

export enum Sport {
  CRICKET = 'CRICKET',
  FOOTBALL = 'FOOTBALL',
  BASKETBALL = 'BASKETBALL',
  BADMINTON = 'BADMINTON',
  KABADDI = 'KABADDI',
  VOLLEYBALL = 'VOLLEYBALL',
}

export interface Subscription {
  unsubscribe: () => void;
}

export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}
