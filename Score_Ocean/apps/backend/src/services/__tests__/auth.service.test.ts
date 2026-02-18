import { authService, RegisterInput, LoginInput } from '../auth.service';
import { query } from '../../db/postgres';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole } from '@score-ocean/types';

// Mock dependencies
jest.mock('../../db/postgres');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
const mockJwtSign = jwt.sign as jest.MockedFunction<typeof jwt.sign>;
const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validInput: RegisterInput = {
      email: 'test@example.com',
      password: 'Password123!',
      role: UserRole.PLAYER,
      name: 'Test User',
      age: 25,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      phone: '+919876543210',
    };

    it('should successfully register a new user with valid data', async () => {
      // Mock email uniqueness check
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      // Mock BEGIN transaction
      mockQuery.mockResolvedValueOnce({} as any);

      // Mock user creation
      const mockUser = {
        id: 'user-123',
        email: validInput.email,
        role: validInput.role,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);

      // Mock profile creation
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      // Mock COMMIT transaction
      mockQuery.mockResolvedValueOnce({} as any);

      // Mock password hashing
      mockBcryptHash.mockResolvedValue('hashed_password' as never);

      // Mock JWT generation
      mockJwtSign.mockReturnValue('access_token' as never);
      mockJwtSign.mockReturnValue('refresh_token' as never);

      const result = await authService.register(validInput);

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        name: validInput.name,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(mockBcryptHash).toHaveBeenCalledWith(validInput.password, 10);
    });

    it('should reject registration with invalid email format', async () => {
      const invalidInput = { ...validInput, email: 'invalid-email' };

      await expect(authService.register(invalidInput)).rejects.toThrow('Invalid email format');
    });

    it('should reject registration with weak password', async () => {
      const invalidInput = { ...validInput, password: 'short' };

      await expect(authService.register(invalidInput)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject registration with invalid role', async () => {
      const invalidInput = { ...validInput, role: 'INVALID_ROLE' as UserRole };

      await expect(authService.register(invalidInput)).rejects.toThrow('Invalid role');
    });

    it('should reject registration with duplicate email', async () => {
      // Mock existing user
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] } as any);

      await expect(authService.register(validInput)).rejects.toThrow(
        'An account with this email already exists'
      );
    });

    it('should create user profile with all provided fields', async () => {
      // Mock email uniqueness check
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      
      // Mock BEGIN transaction
      mockQuery.mockResolvedValueOnce({} as any);
      
      // Mock user creation
      const mockUser = {
        id: 'user-123',
        email: validInput.email,
        role: validInput.role,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);
      
      // Mock profile creation
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      
      // Mock COMMIT transaction
      mockQuery.mockResolvedValueOnce({} as any);
      
      mockBcryptHash.mockResolvedValue('hashed_password' as never);
      mockJwtSign.mockReturnValue('token' as never);

      await authService.register(validInput);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profiles'),
        [
          mockUser.id,
          validInput.name,
          validInput.age,
          validInput.city,
          validInput.state,
          validInput.country,
          validInput.phone,
        ]
      );
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with correct credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginInput.email,
        password_hash: 'hashed_password',
        role: UserRole.PLAYER,
        name: 'Test User',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);
      mockBcryptCompare.mockResolvedValue(true as never);
      mockJwtSign.mockReturnValue('token' as never);

      const result = await authService.login(loginInput);

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        name: mockUser.name,
      });
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should reject login with non-existent email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(authService.login(loginInput)).rejects.toThrow('Invalid email or password');
    });

    it('should reject login with incorrect password', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginInput.email,
        password_hash: 'hashed_password',
        role: UserRole.PLAYER,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);
      mockBcryptCompare.mockResolvedValue(false as never);

      await expect(authService.login(loginInput)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PLAYER,
      };

      mockJwtVerify.mockReturnValue(mockPayload as never);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: mockPayload.userId, email: mockPayload.email, role: mockPayload.role }],
      } as any);
      mockJwtSign.mockReturnValue('new_token' as never);

      const result = await authService.refreshToken('valid_refresh_token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid_token')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should reject refresh token for non-existent user', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PLAYER,
      };

      mockJwtVerify.mockReturnValue(mockPayload as never);
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(authService.refreshToken('valid_token')).rejects.toThrow('User not found');
    });
  });

  describe('validateToken', () => {
    it('should validate and return payload for valid token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PLAYER,
      };

      mockJwtVerify.mockReturnValue(mockPayload as never);

      const result = await authService.validateToken('valid_token');

      expect(result).toEqual(mockPayload);
    });

    it('should reject invalid token', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.validateToken('invalid_token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      mockJwtSign
        .mockReturnValueOnce('access_token' as never)
        .mockReturnValueOnce('refresh_token' as never);

      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PLAYER,
      };

      const result = authService.generateTokens(payload);

      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: expect.any(String),
      });
      expect(mockJwtSign).toHaveBeenCalledTimes(2);
    });
  });
});
