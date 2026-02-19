import { Router, Request, Response } from 'express';
import { auctionService } from '../services/auction.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AuctionConfig } from '@score-ocean/types';
import { UserRole } from '@score-ocean/types';
import { AppError } from '../middleware/errorHandler';
import { query } from '../db/postgres';

/**
 * Middleware to check if user is the tournament host
 */
const requireTournamentHost = async (req: AuthRequest, _res: Response, next: any) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Admin users have unrestricted access
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Get tournament ID from request body or params
    const tournamentId = req.body.tournamentId || req.params.tournamentId;
    
    if (!tournamentId) {
      // If we're working with an auction ID, get the tournament ID from the auction
      const auctionId = req.params.id;
      if (auctionId) {
        const auctionResult = await query(
          'SELECT tournament_id FROM auctions WHERE id = $1',
          [auctionId]
        );
        
        if (auctionResult.rows.length === 0) {
          return next(new AppError('Auction not found', 404));
        }
        
        const tournamentIdFromAuction = auctionResult.rows[0].tournament_id;
        const tournamentResult = await query(
          'SELECT host_id FROM tournaments WHERE id = $1',
          [tournamentIdFromAuction]
        );
        
        if (tournamentResult.rows.length === 0) {
          return next(new AppError('Tournament not found', 404));
        }
        
        const hostId = tournamentResult.rows[0].host_id;
        if (hostId !== req.user.userId) {
          return next(new AppError('You do not have permission to manage this auction', 403));
        }
        
        return next();
      }
      
      return next(new AppError('Tournament ID not provided', 400));
    }

    // Check if user is the tournament host
    const result = await query(
      'SELECT host_id FROM tournaments WHERE id = $1',
      [tournamentId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Tournament not found', 404));
    }

    const hostId = result.rows[0].host_id;
    if (hostId !== req.user.userId) {
      return next(new AppError('You do not have permission to manage this tournament auction', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

const router = Router();

/**
 * Create a new auction for a tournament - requires tournament host
 * POST /api/auctions
 */
router.post('/', authenticate, requireTournamentHost, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournamentId, config } = req.body as {
      tournamentId: string;
      config: AuctionConfig;
    };

    if (!tournamentId || !config) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tournament ID and config are required',
        },
      });
      return;
    }

    // Validate config
    if (
      !config.teamBudget ||
      !config.minSquadSize ||
      !config.maxSquadSize ||
      !config.bidIncrement ||
      !config.bidTimeout
    ) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid auction configuration',
        },
      });
      return;
    }

    const auction = await auctionService.createAuction(tournamentId, config);
    res.status(201).json(auction);
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create auction',
      },
    });
  }
});

/**
 * Register a player for auction - requires tournament host
 * POST /api/auctions/:id/players
 */
router.post('/:id/players', authenticate, requireTournamentHost, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: auctionId } = req.params;
    const { playerId, basePrice } = req.body as {
      playerId: string;
      basePrice: number;
    };

    if (!playerId || basePrice === undefined) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Player ID and base price are required',
        },
      });
      return;
    }

    if (basePrice < 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Base price must be non-negative',
        },
      });
      return;
    }

    await auctionService.registerPlayer(auctionId, playerId, basePrice);
    res.status(201).json({ message: 'Player registered successfully' });
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register player',
      },
    });
  }
});

/**
 * Get auction by ID
 * GET /api/auctions/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const auction = await auctionService.getAuction(id);

    if (!auction) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Auction not found',
        },
      });
      return;
    }

    res.json(auction);
  } catch (error) {
    console.error('Error getting auction:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get auction',
      },
    });
  }
});

/**
 * Get auction by tournament ID
 * GET /api/auctions/tournament/:tournamentId
 */
router.get('/tournament/:tournamentId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournamentId } = req.params;
    const auction = await auctionService.getAuctionByTournament(tournamentId);

    if (!auction) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Auction not found for this tournament',
        },
      });
      return;
    }

    res.json(auction);
  } catch (error) {
    console.error('Error getting auction:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get auction',
      },
    });
  }
});

/**
 * Start auction - requires tournament host
 * POST /api/auctions/:id/start
 */
router.post('/:id/start', authenticate, requireTournamentHost, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const auction = await auctionService.startAuction(id);
    res.json(auction);
  } catch (error: any) {
    console.error('Error starting auction:', error);
    res.status(400).json({
      error: {
        code: 'AUCTION_ERROR',
        message: error.message || 'Failed to start auction',
      },
    });
  }
});

/**
 * Place a bid
 * POST /api/auctions/:id/bid
 */
router.post('/:id/bid', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: auctionId } = req.params;
    const { playerId, teamId, amount } = req.body as {
      playerId: string;
      teamId: string;
      amount: number;
    };

    if (!playerId || !teamId || amount === undefined) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Player ID, team ID, and amount are required',
        },
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bid amount must be positive',
        },
      });
      return;
    }

    const bid = await auctionService.placeBid(auctionId, playerId, teamId, amount);
    res.status(201).json(bid);
  } catch (error: any) {
    console.error('Error placing bid:', error);
    res.status(400).json({
      error: {
        code: 'BID_ERROR',
        message: error.message || 'Failed to place bid',
      },
    });
  }
});

/**
 * Get current player being auctioned
 * GET /api/auctions/:id/current-player
 */
router.get('/:id/current-player', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const player = await auctionService.getCurrentPlayer(id);

    if (!player) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No player currently being auctioned',
        },
      });
      return;
    }

    res.json(player);
  } catch (error) {
    console.error('Error getting current player:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get current player',
      },
    });
  }
});

/**
 * Get team budget
 * GET /api/auctions/:id/budget/:teamId
 */
router.get('/:id/budget/:teamId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: auctionId, teamId } = req.params;
    const budget = await auctionService.getTeamBudget(auctionId, teamId);

    if (!budget) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Team budget not found',
        },
      });
      return;
    }

    res.json(budget);
  } catch (error) {
    console.error('Error getting team budget:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get team budget',
      },
    });
  }
});

/**
 * Move to next player - requires tournament host
 * POST /api/auctions/:id/next-player
 */
router.post('/:id/next-player', authenticate, requireTournamentHost, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const player = await auctionService.nextPlayer(id);

    if (!player) {
      res.json({
        message: 'Auction completed - no more players',
        completed: true,
      });
      return;
    }

    res.json(player);
  } catch (error: any) {
    console.error('Error moving to next player:', error);
    res.status(400).json({
      error: {
        code: 'AUCTION_ERROR',
        message: error.message || 'Failed to move to next player',
      },
    });
  }
});

/**
 * Get auction results
 * GET /api/auctions/:id/results
 */
router.get('/:id/results', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const results = await auctionService.getAuctionResults(id);
    res.json(results);
  } catch (error) {
    console.error('Error getting auction results:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get auction results',
      },
    });
  }
});

export default router;
