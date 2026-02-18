import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UserRole } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, name, age, city, state, country, phone } = req.body;

    // Validate required fields
    if (!email || !password || !role || !name) {
      throw new AppError(
        'Missing required fields. Email, password, role, and name are required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    console.log(`[AUTH] Registration attempt for email: ${email}, role: ${role}`);

    const result = await authService.register({
      email,
      password,
      role: role as UserRole,
      name,
      age: age ? parseInt(age) : undefined,
      city,
      state,
      country,
      phone,
    });

    console.log(`[AUTH] User registered successfully: ${result.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError(
        'Missing required fields. Email and password are required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    console.log(`[AUTH] Login attempt for email: ${email}`);

    const result = await authService.login({ email, password });

    console.log(`[AUTH] User logged in successfully: ${result.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(
        'Missing required field. Refresh token is required.',
        400,
        'VALIDATION_ERROR'
      );
    }

    console.log('[AUTH] Token refresh attempt');

    const tokens = await authService.refreshToken(refreshToken);

    console.log('[AUTH] Token refreshed successfully');

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  } catch (error) {
    console.error('[AUTH] Token refresh error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    // In a production system, you might want to blacklist the token in Redis
    // For now, we rely on client-side token removal
    console.log('[AUTH] User logged out');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

export default router;

