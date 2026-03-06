import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authService } from '../services/auth.service';
import { UserRole } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import { authSchemas } from '../middleware/validationSchemas';
import { config } from '../config';

const router = Router();

// In-memory store for OAuth state tokens (short-lived, max 10 min)
const oauthStateMap = new Map<string, number>();
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, ts] of oauthStateMap.entries()) {
    if (ts < cutoff) oauthStateMap.delete(key);
  }
}, 60 * 1000);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(authSchemas.register), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, name, age, city, state, country, phone } = req.body;

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
router.post('/login', validate(authSchemas.login), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

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
router.post('/refresh', validate(authSchemas.refresh), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

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

/**
 * @route   GET /api/auth/google
 * @desc    Redirect to Google OAuth consent screen
 * @access  Public
 */
router.get('/google', (_req: Request, res: Response) => {
  if (!config.google.clientId) {
    return res.status(503).json({ success: false, message: 'Google OAuth is not configured.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  oauthStateMap.set(state, Date.now());

  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.callbackUrl,
    response_type: 'code',
    scope: 'email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  const frontendUrl = config.frontendUrl;

  if (error) {
    return res.redirect(`${frontendUrl}/login?error=google_auth_cancelled`);
  }

  if (!state || !oauthStateMap.has(state)) {
    return res.redirect(`${frontendUrl}/login?error=invalid_state`);
  }
  oauthStateMap.delete(state);

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.callbackUrl,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData: any = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[GOOGLE OAUTH] Token exchange failed:', tokenData);
      return res.redirect(`${frontendUrl}/login?error=google_token_failed`);
    }

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser: any = await userInfoRes.json();

    if (!googleUser.email) {
      return res.redirect(`${frontendUrl}/login?error=google_no_email`);
    }

    // Find or create user in our DB
    const { user, tokens } = await authService.findOrCreateGoogleUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name || googleUser.email.split('@')[0],
      avatar: googleUser.picture,
    });

    // Redirect to frontend callback page with JWT tokens
    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || '',
      avatar: user.avatar || '',
    });

    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  } catch (err) {
    console.error('[GOOGLE OAUTH] Error:', err);
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
});

export default router;

