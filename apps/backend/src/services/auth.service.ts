import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, getClient } from '../db/postgres';
import { config } from '../config';
import { UserRole } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 10;

// Validation constants
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const AGE_MIN = 10;
const AGE_MAX = 120;

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  age?: number;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  sport?: string; // For TEAM role users
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export class AuthService {
  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      throw new AppError('Invalid email format. Please provide a valid email address.', 400);
    }
    if (email.length > 255) {
      throw new AppError('Email address is too long (maximum 255 characters).', 400);
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (!password) {
      throw new AppError('Password is required.', 400);
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new AppError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
        400
      );
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      throw new AppError(
        `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`,
        400
      );
    }

    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const complexityCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(
      Boolean
    ).length;

    if (complexityCount < 3) {
      throw new AppError(
        'Password must contain at least 3 of the following: uppercase letter, lowercase letter, number, special character.',
        400
      );
    }
  }

  /**
   * Validate user role
   */
  private validateRole(role: string): void {
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      throw new AppError(
        `Invalid role. Must be one of: ${validRoles.join(', ')}.`,
        400
      );
    }
  }

  /**
   * Validate name
   */
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new AppError('Name is required.', 400);
    }
    if (name.length < NAME_MIN_LENGTH) {
      throw new AppError(`Name must be at least ${NAME_MIN_LENGTH} characters long.`, 400);
    }
    if (name.length > NAME_MAX_LENGTH) {
      throw new AppError(`Name must not exceed ${NAME_MAX_LENGTH} characters.`, 400);
    }
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(name)) {
      throw new AppError(
        'Name can only contain letters, spaces, hyphens, and apostrophes.',
        400
      );
    }
  }

  /**
   * Validate age
   */
  private validateAge(age?: number): void {
    if (age !== undefined && age !== null) {
      if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
        throw new AppError(`Age must be between ${AGE_MIN} and ${AGE_MAX}.`, 400);
      }
    }
  }

  /**
   * Validate phone number
   */
  private validatePhone(phone?: string): void {
    if (phone) {
      // Indian phone number format: +91XXXXXXXXXX or 10 digits
      const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        throw new AppError(
          'Invalid phone number format. Please provide a valid Indian phone number.',
          400
        );
      }
    }
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<{ user: any; tokens: AuthToken }> {
    // Validate all inputs
    this.validateEmail(input.email);
    this.validatePassword(input.password);
    this.validateRole(input.role);
    this.validateName(input.name);
    // Age only relevant for individual players, not teams/orgs
    if (input.role === UserRole.PLAYER) {
      this.validateAge(input.age);
    }
    this.validatePhone(input.phone);

    // Normalize email to lowercase
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

    if (existingUser.rows.length > 0) {
      throw new AppError(
        'An account with this email already exists. Please use a different email or try logging in.',
        409
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Start transaction using a dedicated client
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, email, role, created_at, updated_at`,
        [normalizedEmail, passwordHash, input.role]
      );

      const user = userResult.rows[0];

      // Create user profile
      await client.query(
        `INSERT INTO user_profiles (user_id, name, age, city, state, country, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.id,
          input.name.trim(),
          input.age || null,
          input.city?.trim() || null,
          input.state?.trim() || null,
          input.country?.trim() || null,
          input.phone?.trim() || null,
        ]
      );

      // If user role is TEAM, automatically create a team entity
      if (input.role === UserRole.TEAM) {
        const teamName = input.name.trim();
        const city = input.city?.trim() || '';
        const state = input.state?.trim() || '';
        const country = input.country?.trim() || 'India';
        const sport = input.sport || 'CRICKET';

        const teamResult = await client.query(
          `INSERT INTO teams (name, sport, host_id, city, state, country, statistics)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            teamName,
            sport,
            user.id,
            city,
            state,
            country,
            JSON.stringify({ matchesPlayed: 0, wins: 0, losses: 0, draws: 0 }),
          ]
        );

        const teamId = teamResult.rows[0].id;

        await client.query(
          `INSERT INTO team_sport_profiles (team_id, sport, statistics)
           VALUES ($1, $2, $3)`,
          [
            teamId,
            sport,
            JSON.stringify({ matchesPlayed: 0, wins: 0, losses: 0, draws: 0 }),
          ]
        );
      }

      await client.query('COMMIT');

      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: input.name.trim(),
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        tokens,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<{ user: any; tokens: AuthToken }> {
    // Validate inputs
    if (!input.email || !input.password) {
      throw new AppError('Email and password are required.', 400);
    }

    this.validateEmail(input.email);

    // Normalize email
    const normalizedEmail = input.email.toLowerCase().trim();

    // Find user by email
    const userResult = await query(
      `SELECT u.id, u.email, u.password_hash, u.role, up.name
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.email = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Invalid email or password.', 401);
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      tokens,
    };
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(payload: TokenPayload): AuthToken {
    // @ts-ignore - jwt.sign types are complex, but this usage is correct
    const accessToken: string = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    });

    // @ts-ignore - jwt.sign types are complex, but this usage is correct
    const refreshToken: string = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpiresIn,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;

      // Verify user still exists
      const userResult = await query('SELECT id, email, role FROM users WHERE id = $1', [
        decoded.userId,
      ]);

      if (userResult.rows.length === 0) {
        throw new AppError('User not found.', 404);
      }

      const user = userResult.rows[0];

      // Generate new tokens
      return this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Invalid or expired refresh token.', 401);
    }
  }

  /**
   * Validate access token
   */
  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token.', 401);
    }
  }

  /**
   * Find or create a user from Google OAuth profile
   */
  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<{ user: any; tokens: AuthToken }> {
    const normalizedEmail = profile.email.toLowerCase().trim();

    // 1. Check if a user with this google_id already exists
    let userResult = await query(
      `SELECT u.id, u.email, u.role, up.name, u.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.google_id = $1`,
      [profile.googleId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const tokens = this.generateTokens({ userId: user.id, email: user.email, role: user.role });
      return { user: { id: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar_url }, tokens };
    }

    // 2. Check if a user with this email exists → link the Google account
    userResult = await query(
      `SELECT u.id, u.email, u.role, up.name
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.email = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      // Link Google account to existing user
      await query(
        `UPDATE users SET google_id = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [profile.googleId, profile.avatar || null, user.id]
      );
      const tokens = this.generateTokens({ userId: user.id, email: user.email, role: user.role });
      return { user: { id: user.id, email: user.email, role: user.role, name: user.name, avatar: profile.avatar }, tokens };
    }

    // 3. Brand new user — create as PLAYER
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const newUser = await client.query(
        `INSERT INTO users (email, password_hash, role, google_id, avatar_url)
         VALUES ($1, NULL, $2, $3, $4)
         RETURNING id, email, role`,
        [normalizedEmail, UserRole.PLAYER, profile.googleId, profile.avatar || null]
      );

      const user = newUser.rows[0];

      await client.query(
        `INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)`,
        [user.id, profile.name]
      );

      await client.query('COMMIT');

      const tokens = this.generateTokens({ userId: user.id, email: user.email, role: user.role });
      return {
        user: { id: user.id, email: user.email, role: user.role, name: profile.name, avatar: profile.avatar },
        tokens,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const authService = new AuthService();
