import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { connectRedis } from './db/redis';
import { testConnection } from './db/postgres';
import { websocketService } from './services/websocket.service';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import teamRoutes from './routes/team';
import tournamentRoutes from './routes/tournament';
import matchRoutes from './routes/match';
import auctionRoutes from './routes/auction';
import notificationRoutes from './routes/notification';
import paymentRoutes from './routes/payment';
import searchRoutes from './routes/search';
import certificateRoutes from './routes/certificate';
import matchChallengeRoutes from './routes/matchChallenge';
import cricketStatsRoutes from './routes/cricketStats';
import leagueAuctionRoutes from './routes/leagueAuction';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Raw body for Stripe webhooks (must be before express.json())
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Increase body size limit to handle base64 images (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  if (config.nodeEnv === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/match-challenges', matchChallengeRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/cricket-stats', cricketStatsRoutes);
app.use('/api/league-auctions', leagueAuctionRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// Error handling
app.use(errorHandler);

const PORT = config.port || 3000;

// Initialize connections and start server
async function startServer() {
  console.log('=================================');
  console.log('Starting Score Ocean Backend...');
  console.log('=================================');

  try {
    // Test PostgreSQL connection
    console.log('Testing PostgreSQL connection...');
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('✓ PostgreSQL connected successfully');
    } else {
      console.warn('⚠ PostgreSQL connection failed - some features may not work');
      console.warn('  Please ensure PostgreSQL is running and configured correctly');
      console.warn('  See SETUP.md for installation instructions');
    }

    // Connect to Redis
    console.log('Connecting to Redis...');
    try {
      await connectRedis();
      console.log('✓ Redis connected successfully');
    } catch (error) {
      console.warn('⚠ Redis connection failed - caching features will be disabled');
      console.warn('  Please ensure Redis is running and configured correctly');
      console.warn('  See SETUP.md for installation instructions');
    }

    // Initialize WebSocket server
    console.log('Initializing WebSocket server...');
    await websocketService.initialize(httpServer);

    // Start server
    httpServer.listen(PORT, () => {
      console.log('=================================');
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ API Base URL: http://localhost:${PORT}/api`);
      console.log(`✓ Health Check: http://localhost:${PORT}/health`);
      console.log(`✓ WebSocket URL: ws://localhost:${PORT}`);
      console.log('=================================');
      console.log('API Endpoints:');
      console.log(`  POST /api/auth/register - Register new user`);
      console.log(`  POST /api/auth/login    - Login user`);
      console.log(`  POST /api/auth/refresh  - Refresh token`);
      console.log(`  POST /api/auth/logout   - Logout user`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
