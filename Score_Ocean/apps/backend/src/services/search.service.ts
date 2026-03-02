import { query } from '../db/postgres';
import { SearchQuery, Sport } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';

export interface SearchResult {
  type: 'player' | 'team' | 'tournament';
  id: string;
  name: string;
  sport?: Sport;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  relevanceScore: number;
  metadata?: any;
}

export interface SearchFilters {
  sport?: Sport;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  performanceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export class SearchService {
  /**
   * Search for players, teams, and tournaments with fuzzy matching
   * Requirements: 11.1, 11.2, 11.3, 11.5
   */
  async search(searchQuery: SearchQuery): Promise<SearchResult[]> {
    const { query: searchTerm, filters, limit = 50, offset = 0 } = searchQuery;

    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new AppError('Search query cannot be empty', 400);
    }

    const searchFilters = filters as SearchFilters | undefined;

    // Search across players, teams, and tournaments
    const [playerResults, teamResults, tournamentResults] = await Promise.all([
      this.searchPlayers(searchTerm, searchFilters),
      this.searchTeams(searchTerm, searchFilters),
      this.searchTournaments(searchTerm, searchFilters),
    ]);

    // Combine and sort by relevance
    const allResults = [...playerResults, ...teamResults, ...tournamentResults];
    const sortedResults = this.rankByRelevance(allResults, searchTerm);

    // Apply pagination
    return sortedResults.slice(offset, offset + limit);
  }

  /**
   * Search for players with fuzzy matching
   * Requirements: 11.1
   */
  async searchPlayers(searchTerm: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    
    let whereClause = `WHERE (
      LOWER(up.name) LIKE $1 OR
      LOWER(up.city) LIKE $1 OR
      LOWER(up.state) LIKE $1 OR
      LOWER(up.country) LIKE $1
    )`;
    
    const params: any[] = [searchPattern];
    let paramIndex = 2;

    // Apply sport filter
    if (filters?.sport) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM sport_profiles sp 
        WHERE sp.user_id = u.id AND sp.sport = ${paramIndex++}
      )`;
      params.push(filters.sport);
    }

    // Apply location filter
    if (filters?.location) {
      if (filters.location.city) {
        whereClause += ` AND LOWER(up.city) = ${paramIndex++}`;
        params.push(filters.location.city.toLowerCase());
      }
      if (filters.location.state) {
        whereClause += ` AND LOWER(up.state) = ${paramIndex++}`;
        params.push(filters.location.state.toLowerCase());
      }
      if (filters.location.country) {
        whereClause += ` AND LOWER(up.country) = ${paramIndex++}`;
        params.push(filters.location.country.toLowerCase());
      }
    }

    const result = await query(
      `SELECT 
        u.id,
        up.name,
        up.city,
        up.state,
        up.country,
        up.avatar_url,
        (
          SELECT json_agg(json_build_object('sport', sp.sport, 'statistics', sp.statistics))
          FROM sport_profiles sp
          WHERE sp.user_id = u.id
        ) as sport_profiles
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      ${whereClause}
      AND u.role = 'PLAYER'
      LIMIT 100`,
      params
    );

    return result.rows
      .map((row) => {
        const relevanceScore = this.calculateRelevanceScore(
          searchTerm,
          [row.name, row.city, row.state, row.country]
        );

        // Filter by performance level if specified
        if (filters?.performanceLevel && row.sport_profiles) {
          const meetsPerformanceLevel = this.checkPerformanceLevel(
            row.sport_profiles,
            filters.performanceLevel
          );
          if (!meetsPerformanceLevel) {
            return null;
          }
        }

        const result: SearchResult = {
          type: 'player',
          id: row.id,
          name: row.name,
          location: {
            city: row.city || '',
            state: row.state || '',
            country: row.country || '',
          },
          relevanceScore,
          metadata: {
            avatarUrl: row.avatar_url,
            sportProfiles: row.sport_profiles || [],
          },
        };
        return result;
      })
      .filter((result): result is SearchResult => result !== null);
  }

  /**
   * Search for teams with fuzzy matching
   * Requirements: 11.2
   */
  async searchTeams(searchTerm: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Handle wildcard search to get all teams
    const isWildcard = searchTerm === '*' || searchTerm.trim().length === 0;
    const searchPattern = isWildcard ? '%' : `%${searchTerm.toLowerCase()}%`;
    
    let whereClause = '';
    
    if (!isWildcard) {
      whereClause = `WHERE (
        LOWER(t.name) LIKE $1 OR
        LOWER(t.city) LIKE $1 OR
        LOWER(t.state) LIKE $1 OR
        LOWER(t.country) LIKE $1
      )`;
    }
    
    const params: any[] = isWildcard ? [] : [searchPattern];
    let paramIndex = isWildcard ? 1 : 2;

    // Apply sport filter
    if (filters?.sport) {
      const connector = whereClause ? ' AND' : 'WHERE';
      whereClause += `${connector} t.sport = $${paramIndex++}`;
      params.push(filters.sport);
    }

    // Apply location filter
    if (filters?.location) {
      const connector = whereClause ? ' AND' : 'WHERE';
      if (filters.location.city) {
        whereClause += `${connector} LOWER(t.city) = $${paramIndex++}`;
        params.push(filters.location.city.toLowerCase());
      }
      if (filters.location.state) {
        whereClause += ` AND LOWER(t.state) = $${paramIndex++}`;
        params.push(filters.location.state.toLowerCase());
      }
      if (filters.location.country) {
        whereClause += ` AND LOWER(t.country) = $${paramIndex++}`;
        params.push(filters.location.country.toLowerCase());
      }
    }

    const result = await query(
      `SELECT 
        t.id,
        t.name,
        t.sport,
        t.city,
        t.state,
        t.country,
        t.statistics,
        (SELECT COUNT(*) FROM team_rosters tr WHERE tr.team_id = t.id) as roster_count
      FROM teams t
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT 100`,
      params
    );

    return result.rows.map((row) => {
      const relevanceScore = isWildcard ? 50 : this.calculateRelevanceScore(
        searchTerm,
        [row.name, row.city, row.state, row.country]
      );

      const result: SearchResult = {
        type: 'team',
        id: row.id,
        name: row.name,
        sport: row.sport as Sport,
        location: {
          city: row.city || '',
          state: row.state || '',
          country: row.country || '',
        },
        relevanceScore,
        metadata: {
          statistics: row.statistics,
          rosterCount: parseInt(row.roster_count),
        },
      };
      return result;
    });
  }

  /**
   * Search for tournaments
   * Requirements: 11.3
   */
  async searchTournaments(searchTerm: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    
    let whereClause = `WHERE (
      LOWER(t.name) LIKE $1 OR
      LOWER(t.venue) LIKE $1
    )`;
    
    const params: any[] = [searchPattern];
    let paramIndex = 2;

    // Only show published tournaments (not drafts)
    whereClause += ` AND t.status != 'DRAFT'`;

    // Apply sport filter
    if (filters?.sport) {
      whereClause += ` AND t.sport = ${paramIndex++}`;
      params.push(filters.sport);
    }

    // Apply location filter (based on venue text)
    if (filters?.location) {
      if (filters.location.city) {
        whereClause += ` AND LOWER(t.venue) LIKE ${paramIndex++}`;
        params.push(`%${filters.location.city.toLowerCase()}%`);
      }
      if (filters.location.state) {
        whereClause += ` AND LOWER(t.venue) LIKE ${paramIndex++}`;
        params.push(`%${filters.location.state.toLowerCase()}%`);
      }
    }

    const result = await query(
      `SELECT 
        t.id,
        t.name,
        t.sport,
        t.venue,
        t.format,
        t.status,
        t.start_date,
        t.end_date,
        t.registration_fee,
        t.registration_deadline,
        t.team_capacity,
        (SELECT COUNT(*) FROM tournament_registrations tr 
         WHERE tr.tournament_id = t.id AND tr.status = 'CONFIRMED') as registered_teams
      FROM tournaments t
      ${whereClause}
      ORDER BY t.start_date DESC
      LIMIT 100`,
      params
    );

    return result.rows.map((row) => {
      const relevanceScore = this.calculateRelevanceScore(
        searchTerm,
        [row.name, row.venue]
      );

      const result: SearchResult = {
        type: 'tournament',
        id: row.id,
        name: row.name,
        sport: row.sport as Sport,
        relevanceScore,
        metadata: {
          venue: row.venue,
          format: row.format,
          status: row.status,
          startDate: row.start_date,
          endDate: row.end_date,
          registrationFee: parseFloat(row.registration_fee),
          registrationDeadline: row.registration_deadline,
          teamCapacity: row.team_capacity,
          registeredTeams: parseInt(row.registered_teams),
        },
      };
      return result;
    });
  }

  /**
   * Calculate relevance score based on how well the search term matches
   * Requirements: 11.5
   */
  private calculateRelevanceScore(searchTerm: string, fields: string[]): number {
    const lowerSearchTerm = searchTerm.toLowerCase();
    let score = 0;

    for (const field of fields) {
      if (!field) continue;
      
      const lowerField = field.toLowerCase();

      // Exact match gets highest score
      if (lowerField === lowerSearchTerm) {
        score += 100;
      }
      // Starts with search term gets high score
      else if (lowerField.startsWith(lowerSearchTerm)) {
        score += 75;
      }
      // Contains search term gets medium score
      else if (lowerField.includes(lowerSearchTerm)) {
        score += 50;
      }
      // Fuzzy match (word boundaries) gets lower score
      else {
        const words = lowerField.split(/\s+/);
        for (const word of words) {
          if (word.startsWith(lowerSearchTerm)) {
            score += 25;
            break;
          }
        }
      }
    }

    return score;
  }

  /**
   * Rank search results by relevance
   * Requirements: 11.5
   */
  private rankByRelevance(results: SearchResult[], _searchTerm: string): SearchResult[] {
    return results.sort((a, b) => {
      // Primary sort: relevance score (higher is better)
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Secondary sort: type priority (players > teams > tournaments)
      const typePriority = { player: 3, team: 2, tournament: 1 };
      const aPriority = typePriority[a.type];
      const bPriority = typePriority[b.type];
      
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }

      // Tertiary sort: alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Check if player meets performance level criteria
   * Requirements: 11.6
   */
  private checkPerformanceLevel(
    sportProfiles: any[],
    performanceLevel: 'beginner' | 'intermediate' | 'advanced'
  ): boolean {
    if (!sportProfiles || sportProfiles.length === 0) {
      return performanceLevel === 'beginner';
    }

    // Calculate average performance across all sports
    let totalScore = 0;
    let profileCount = 0;

    for (const profile of sportProfiles) {
      const stats = profile.statistics;
      const score = this.calculatePerformanceScore(profile.sport, stats);
      totalScore += score;
      profileCount++;
    }

    const avgScore = profileCount > 0 ? totalScore / profileCount : 0;

    // Classify based on average score
    if (performanceLevel === 'beginner') {
      return avgScore < 30;
    } else if (performanceLevel === 'intermediate') {
      return avgScore >= 30 && avgScore < 70;
    } else {
      return avgScore >= 70;
    }
  }

  /**
   * Calculate performance score for a sport (0-100 scale)
   */
  private calculatePerformanceScore(sport: string, stats: any): number {
    if (!stats) return 0;

    switch (sport) {
      case Sport.CRICKET: {
        const runs = stats.runs || 0;
        const wickets = stats.wickets || 0;
        const battingAvg = stats.battingAverage || 0;
        const strikeRate = stats.strikeRate || 0;
        
        // Normalize to 0-100 scale
        const runsScore = Math.min(runs / 10, 25); // Max 25 points for 1000+ runs
        const wicketsScore = Math.min(wickets / 5, 25); // Max 25 points for 50+ wickets
        const avgScore = Math.min(battingAvg / 2, 25); // Max 25 points for 50+ average
        const srScore = Math.min(strikeRate / 4, 25); // Max 25 points for 100+ SR
        
        return runsScore + wicketsScore + avgScore + srScore;
      }
      case Sport.FOOTBALL: {
        const goals = stats.goals || 0;
        const assists = stats.assists || 0;
        const cleanSheets = stats.cleanSheets || 0;
        
        const goalsScore = Math.min(goals * 5, 40); // Max 40 points for 8+ goals
        const assistsScore = Math.min(assists * 5, 30); // Max 30 points for 6+ assists
        const csScore = Math.min(cleanSheets * 3, 30); // Max 30 points for 10+ clean sheets
        
        return goalsScore + assistsScore + csScore;
      }
      case Sport.KABADDI: {
        const raidPoints = stats.raidPoints || 0;
        const tacklePoints = stats.tacklePoints || 0;
        const superRaids = stats.superRaids || 0;
        
        const raidScore = Math.min(raidPoints * 2, 40); // Max 40 points for 20+ raid points
        const tackleScore = Math.min(tacklePoints * 2, 40); // Max 40 points for 20+ tackle points
        const superScore = Math.min(superRaids * 10, 20); // Max 20 points for 2+ super raids
        
        return raidScore + tackleScore + superScore;
      }
      case Sport.VOLLEYBALL: {
        const spikes = stats.spikes || 0;
        const blocks = stats.blocks || 0;
        const aces = stats.aces || 0;
        
        const spikesScore = Math.min(spikes * 2, 40); // Max 40 points for 20+ spikes
        const blocksScore = Math.min(blocks * 3, 30); // Max 30 points for 10+ blocks
        const acesScore = Math.min(aces * 5, 30); // Max 30 points for 6+ aces
        
        return spikesScore + blocksScore + acesScore;
      }
      default:
        return 0;
    }
  }
}

export const searchService = new SearchService();
