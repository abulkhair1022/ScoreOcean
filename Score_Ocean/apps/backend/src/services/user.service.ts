import { query } from '../db/postgres';
import { User, UserProfile, UserRole, Sport, SportProfile, SportStats, CricketStats, FootballStats, KabaddiStats, VolleyballStats, StatsFilter, PerformanceStats } from '@score-ocean/types';

// Sport-specific default statistics
const getDefaultStats = (sport: Sport): SportStats => {
  switch (sport) {
    case Sport.CRICKET:
      return {
        runs: 0,
        wickets: 0,
        battingAverage: 0,
        bowlingAverage: 0,
        strikeRate: 0,
      } as CricketStats;
    case Sport.FOOTBALL:
      return {
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        saves: 0,
        yellowCards: 0,
        redCards: 0,
      } as FootballStats;
    case Sport.KABADDI:
      return {
        raidPoints: 0,
        tacklePoints: 0,
        superRaids: 0,
        superTackles: 0,
      } as KabaddiStats;
    case Sport.VOLLEYBALL:
      return {
        spikes: 0,
        blocks: 0,
        serves: 0,
        digs: 0,
        aces: 0,
      } as VolleyballStats;
    default:
      throw new Error(`Unsupported sport: ${sport}`);
  }
};

export class UserService {
  async createProfile(userId: string, profile: UserProfile): Promise<User> {
    const { name, age, location, contactDetails, avatarUrl } = profile;

    // Validate required fields
    if (!name || !location || !contactDetails) {
      throw new Error('Missing required profile fields');
    }

    // Insert profile
    await query(
      `INSERT INTO user_profiles (user_id, name, age, city, state, country, phone, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        name,
        age,
        location.city,
        location.state,
        location.country,
        contactDetails.phone || null,
        avatarUrl || null,
      ]
    );

    // Get the complete user with profile
    return this.getProfile(userId);
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.age !== undefined) {
      fields.push(`age = $${paramIndex++}`);
      values.push(updates.age);
    }
    if (updates.location) {
      if (updates.location.city !== undefined) {
        fields.push(`city = $${paramIndex++}`);
        values.push(updates.location.city);
      }
      if (updates.location.state !== undefined) {
        fields.push(`state = $${paramIndex++}`);
        values.push(updates.location.state);
      }
      if (updates.location.country !== undefined) {
        fields.push(`country = $${paramIndex++}`);
        values.push(updates.location.country);
      }
    }
    if (updates.contactDetails?.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(updates.contactDetails.phone);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatarUrl);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    await query(
      `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = $${paramIndex}`,
      values
    );

    return this.getProfile(userId);
  }

  async getProfile(userId: string): Promise<User> {
    const userResult = await query(
      `SELECT u.id, u.email, u.role, u.created_at, u.updated_at,
              p.name, p.age, p.city, p.state, p.country, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const row = userResult.rows[0];

    // Get sport profiles
    const sportProfilesResult = await query(
      `SELECT id, sport, statistics, created_at, updated_at
       FROM sport_profiles
       WHERE user_id = $1`,
      [userId]
    );

    const sportProfiles = sportProfilesResult.rows.map((sp) => ({
      id: sp.id,
      sport: sp.sport,
      statistics: sp.statistics,
      matchHistory: [], // Will be populated when needed
    }));

    const user: User = {
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      profile: {
        name: row.name || '',
        age: row.age || 0,
        location: {
          city: row.city || '',
          state: row.state || '',
          country: row.country || '',
        },
        contactDetails: {
          phone: row.phone,
          email: row.email,
        },
        avatarUrl: row.avatar_url,
      },
      sportProfiles,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return user;
  }

  async deleteProfile(userId: string): Promise<void> {
    await query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
  }

  async addSportProfile(userId: string, sport: Sport): Promise<SportProfile> {
    // Validate sport
    const validSports = [Sport.CRICKET, Sport.FOOTBALL, Sport.KABADDI, Sport.VOLLEYBALL];
    if (!validSports.includes(sport)) {
      throw new Error(`Invalid sport: ${sport}. Must be one of: ${validSports.join(', ')}`);
    }

    // Check if sport profile already exists
    const existingResult = await query(
      `SELECT id FROM sport_profiles WHERE user_id = $1 AND sport = $2`,
      [userId, sport]
    );

    if (existingResult.rows.length > 0) {
      throw new Error(`Sport profile for ${sport} already exists`);
    }

    // Create sport profile with default statistics
    const defaultStats = getDefaultStats(sport);
    const result = await query(
      `INSERT INTO sport_profiles (user_id, sport, statistics)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, sport, JSON.stringify(defaultStats)]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      sport: row.sport,
      statistics: row.statistics,
      matchHistory: [],
    };
  }

  async updateSportProfile(userId: string, sportId: string, stats: SportStats): Promise<SportProfile> {
    // Verify the sport profile belongs to the user
    const verifyResult = await query(
      `SELECT sport FROM sport_profiles WHERE id = $1 AND user_id = $2`,
      [sportId, userId]
    );

    if (verifyResult.rows.length === 0) {
      throw new Error('Sport profile not found or does not belong to user');
    }

    // Update statistics
    const result = await query(
      `UPDATE sport_profiles 
       SET statistics = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [JSON.stringify(stats), sportId, userId]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      sport: row.sport,
      statistics: row.statistics,
      matchHistory: [],
    };
  }

  async getPerformanceStats(userId: string, filters: StatsFilter): Promise<PerformanceStats> {
    // Build query based on filters
    let whereClause = 'WHERE pp.player_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters.sport) {
      whereClause += ` AND m.sport = $${paramIndex++}`;
      params.push(filters.sport);
    }

    if (filters.tournamentId) {
      whereClause += ` AND m.tournament_id = $${paramIndex++}`;
      params.push(filters.tournamentId);
    }

    if (filters.dateRange) {
      whereClause += ` AND m.end_time >= $${paramIndex++} AND m.end_time <= $${paramIndex++}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    // Get all performances matching filters
    const result = await query(
      `SELECT pp.statistics, m.sport, m.end_time
       FROM player_performances pp
       JOIN matches m ON pp.match_id = m.id
       ${whereClause}
       ORDER BY m.end_time DESC`,
      params
    );

    if (result.rows.length === 0) {
      // Return empty stats if no matches found
      const sport = filters.sport || Sport.CRICKET;
      return {
        aggregated: getDefaultStats(sport),
        matchCount: 0,
        trends: [],
      };
    }

    // Aggregate statistics
    const sport = result.rows[0].sport;
    const aggregated = this.aggregateStats(result.rows.map(r => r.statistics), sport);

    // Calculate trends (simplified - just track values over time)
    const trends = result.rows.map(row => ({
      date: row.end_time,
      value: this.getStatValue(row.statistics, sport),
      metric: this.getPrimaryMetric(sport),
    }));

    return {
      aggregated,
      matchCount: result.rows.length,
      trends,
    };
  }

  private aggregateStats(statsArray: SportStats[], sport: Sport): SportStats {
    if (statsArray.length === 0) {
      return getDefaultStats(sport);
    }

    switch (sport) {
      case Sport.CRICKET: {
        const cricketStats = statsArray as CricketStats[];
        const totalRuns = cricketStats.reduce((sum, s) => sum + s.runs, 0);
        const totalWickets = cricketStats.reduce((sum, s) => sum + s.wickets, 0);
        const avgBattingAvg = cricketStats.reduce((sum, s) => sum + s.battingAverage, 0) / cricketStats.length;
        const avgBowlingAvg = cricketStats.reduce((sum, s) => sum + s.bowlingAverage, 0) / cricketStats.length;
        const avgStrikeRate = cricketStats.reduce((sum, s) => sum + s.strikeRate, 0) / cricketStats.length;
        
        return {
          runs: totalRuns,
          wickets: totalWickets,
          battingAverage: avgBattingAvg,
          bowlingAverage: avgBowlingAvg,
          strikeRate: avgStrikeRate,
        } as CricketStats;
      }
      case Sport.FOOTBALL: {
        const footballStats = statsArray as FootballStats[];
        return {
          goals: footballStats.reduce((sum, s) => sum + s.goals, 0),
          assists: footballStats.reduce((sum, s) => sum + s.assists, 0),
          cleanSheets: footballStats.reduce((sum, s) => sum + s.cleanSheets, 0),
          saves: footballStats.reduce((sum, s) => sum + s.saves, 0),
          yellowCards: footballStats.reduce((sum, s) => sum + s.yellowCards, 0),
          redCards: footballStats.reduce((sum, s) => sum + s.redCards, 0),
        } as FootballStats;
      }
      case Sport.KABADDI: {
        const kabaddiStats = statsArray as KabaddiStats[];
        return {
          raidPoints: kabaddiStats.reduce((sum, s) => sum + s.raidPoints, 0),
          tacklePoints: kabaddiStats.reduce((sum, s) => sum + s.tacklePoints, 0),
          superRaids: kabaddiStats.reduce((sum, s) => sum + s.superRaids, 0),
          superTackles: kabaddiStats.reduce((sum, s) => sum + s.superTackles, 0),
        } as KabaddiStats;
      }
      case Sport.VOLLEYBALL: {
        const volleyballStats = statsArray as VolleyballStats[];
        return {
          spikes: volleyballStats.reduce((sum, s) => sum + s.spikes, 0),
          blocks: volleyballStats.reduce((sum, s) => sum + s.blocks, 0),
          serves: volleyballStats.reduce((sum, s) => sum + s.serves, 0),
          digs: volleyballStats.reduce((sum, s) => sum + s.digs, 0),
          aces: volleyballStats.reduce((sum, s) => sum + s.aces, 0),
        } as VolleyballStats;
      }
      default:
        return getDefaultStats(sport);
    }
  }

  private getStatValue(stats: SportStats, sport: Sport): number {
    switch (sport) {
      case Sport.CRICKET:
        return (stats as CricketStats).runs;
      case Sport.FOOTBALL:
        return (stats as FootballStats).goals;
      case Sport.KABADDI:
        return (stats as KabaddiStats).raidPoints;
      case Sport.VOLLEYBALL:
        return (stats as VolleyballStats).spikes;
      default:
        return 0;
    }
  }

  private getPrimaryMetric(sport: Sport): string {
    switch (sport) {
      case Sport.CRICKET:
        return 'runs';
      case Sport.FOOTBALL:
        return 'goals';
      case Sport.KABADDI:
        return 'raidPoints';
      case Sport.VOLLEYBALL:
        return 'spikes';
      default:
        return 'value';
    }
  }
}

export const userService = new UserService();
