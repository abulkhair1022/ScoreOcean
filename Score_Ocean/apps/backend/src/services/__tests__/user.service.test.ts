import { userService } from '../user.service';
import { query } from '../../db/postgres';
import { UserProfile, Sport } from '@score-ocean/types';

jest.mock('../../db/postgres');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create a user profile with valid data', async () => {
      const userId = 'user-123';
      const profile: UserProfile = {
        name: 'John Doe',
        age: 25,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
        contactDetails: {
          phone: '+919876543210',
          email: 'john@example.com',
        },
      };

      // Mock INSERT query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'profile-123', user_id: userId, ...profile }],
        rowCount: 1,
      } as any);

      // Mock SELECT query for getProfile
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: 'john@example.com',
            role: 'PLAYER',
            name: profile.name,
            age: profile.age,
            city: profile.location.city,
            state: profile.location.state,
            country: profile.location.country,
            phone: profile.contactDetails.phone,
            avatar_url: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock sport profiles query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await userService.createProfile(userId, profile);

      expect(result.id).toBe(userId);
      expect(result.profile.name).toBe(profile.name);
      expect(result.profile.age).toBe(profile.age);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw error when required fields are missing', async () => {
      const userId = 'user-123';
      const invalidProfile = {
        name: 'John Doe',
      } as UserProfile;

      await expect(userService.createProfile(userId, invalidProfile)).rejects.toThrow(
        'Missing required profile fields'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields', async () => {
      const userId = 'user-123';
      const updates = {
        name: 'Jane Doe',
        age: 26,
      };

      // Mock UPDATE query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      // Mock SELECT query for getProfile
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: 'jane@example.com',
            role: 'PLAYER',
            name: updates.name,
            age: updates.age,
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            phone: '+919876543210',
            avatar_url: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock sport profiles query
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await userService.updateProfile(userId, updates);

      expect(result.profile.name).toBe(updates.name);
      expect(result.profile.age).toBe(updates.age);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw error when no fields to update', async () => {
      const userId = 'user-123';
      const updates = {};

      await expect(userService.updateProfile(userId, updates)).rejects.toThrow(
        'No fields to update'
      );
    });
  });

  describe('getProfile', () => {
    it('should retrieve user profile with sport profiles', async () => {
      const userId = 'user-123';

      // Mock user query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            email: 'john@example.com',
            role: 'PLAYER',
            name: 'John Doe',
            age: 25,
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            phone: '+919876543210',
            avatar_url: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock sport profiles query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'sport-123',
            sport: Sport.CRICKET,
            statistics: { runs: 100, wickets: 5 },
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      const result = await userService.getProfile(userId);

      expect(result.id).toBe(userId);
      expect(result.profile.name).toBe('John Doe');
      expect(result.sportProfiles).toHaveLength(1);
      expect(result.sportProfiles[0].sport).toBe(Sport.CRICKET);
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(userService.getProfile(userId)).rejects.toThrow('User not found');
    });
  });

  describe('deleteProfile', () => {
    it('should delete user profile', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      await userService.deleteProfile(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM user_profiles WHERE user_id = $1',
        [userId]
      );
    });
  });

  describe('addSportProfile', () => {
    it('should create a sport profile with default statistics', async () => {
      const userId = 'user-123';
      const sport = Sport.CRICKET;

      // Mock check for existing profile
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock INSERT query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'sport-123',
            user_id: userId,
            sport: Sport.CRICKET,
            statistics: {
              runs: 0,
              wickets: 0,
              battingAverage: 0,
              bowlingAverage: 0,
              strikeRate: 0,
            },
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      const result = await userService.addSportProfile(userId, sport);

      expect(result.sport).toBe(Sport.CRICKET);
      expect(result.statistics).toHaveProperty('runs');
      expect(result.statistics).toHaveProperty('wickets');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid sport', async () => {
      const userId = 'user-123';
      const invalidSport = 'INVALID' as Sport;

      await expect(userService.addSportProfile(userId, invalidSport)).rejects.toThrow(
        'Invalid sport'
      );
    });

    it('should throw error if sport profile already exists', async () => {
      const userId = 'user-123';
      const sport = Sport.CRICKET;

      // Mock existing profile
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'sport-123' }],
        rowCount: 1,
      } as any);

      await expect(userService.addSportProfile(userId, sport)).rejects.toThrow(
        'Sport profile for CRICKET already exists'
      );
    });

    it('should create correct default stats for each sport', async () => {
      const userId = 'user-123';

      // Test Football
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'sport-123',
            sport: Sport.FOOTBALL,
            statistics: {
              goals: 0,
              assists: 0,
              cleanSheets: 0,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
            },
          },
        ],
        rowCount: 1,
      } as any);

      const footballProfile = await userService.addSportProfile(userId, Sport.FOOTBALL);
      expect(footballProfile.statistics).toHaveProperty('goals');
      expect(footballProfile.statistics).toHaveProperty('assists');
    });
  });

  describe('updateSportProfile', () => {
    it('should update sport profile statistics', async () => {
      const userId = 'user-123';
      const sportId = 'sport-123';
      const stats = {
        runs: 100,
        wickets: 5,
        battingAverage: 50,
        bowlingAverage: 20,
        strikeRate: 120,
      };

      // Mock verify query
      mockQuery.mockResolvedValueOnce({
        rows: [{ sport: Sport.CRICKET }],
        rowCount: 1,
      } as any);

      // Mock UPDATE query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: sportId,
            sport: Sport.CRICKET,
            statistics: stats,
          },
        ],
        rowCount: 1,
      } as any);

      const result = await userService.updateSportProfile(userId, sportId, stats);

      expect(result.id).toBe(sportId);
      expect(result.statistics).toEqual(stats);
    });

    it('should throw error if sport profile not found', async () => {
      const userId = 'user-123';
      const sportId = 'nonexistent';
      const stats = { runs: 100 } as any;

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(userService.updateSportProfile(userId, sportId, stats)).rejects.toThrow(
        'Sport profile not found or does not belong to user'
      );
    });
  });

  describe('getPerformanceStats', () => {
    it('should return aggregated statistics', async () => {
      const userId = 'user-123';
      const filters = { sport: Sport.CRICKET };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: { runs: 50, wickets: 2, battingAverage: 50, bowlingAverage: 25, strikeRate: 100 },
            sport: Sport.CRICKET,
            end_time: new Date(),
          },
          {
            statistics: { runs: 30, wickets: 1, battingAverage: 30, bowlingAverage: 30, strikeRate: 90 },
            sport: Sport.CRICKET,
            end_time: new Date(),
          },
        ],
        rowCount: 2,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.matchCount).toBe(2);
      expect(result.aggregated).toHaveProperty('runs');
      expect((result.aggregated as any).runs).toBe(80); // 50 + 30
      expect((result.aggregated as any).wickets).toBe(3); // 2 + 1
    });

    it('should return empty stats when no matches found', async () => {
      const userId = 'user-123';
      const filters = { sport: Sport.CRICKET };

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.matchCount).toBe(0);
      expect(result.aggregated).toBeDefined();
      expect(result.trends).toEqual([]);
    });

    it('should filter by tournament', async () => {
      const userId = 'user-123';
      const filters = { tournamentId: 'tournament-123' };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            statistics: { goals: 2, assists: 1, cleanSheets: 0, saves: 0, yellowCards: 0, redCards: 0 },
            sport: Sport.FOOTBALL,
            end_time: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      const result = await userService.getPerformanceStats(userId, filters);

      expect(result.matchCount).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tournament_id'),
        expect.arrayContaining([userId, 'tournament-123'])
      );
    });
  });
});
