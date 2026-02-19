import { Router, Request, Response } from 'express';
import { searchService } from '../services/search.service';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Search for players, teams, and tournaments
 * GET /api/search?q=searchTerm&sport=CRICKET&city=Mumbai&limit=20&offset=0
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, sport, city, state, country, performanceLevel, limit, offset } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
      return;
    }

    // Build filters
    const filters: any = {};

    if (sport) {
      filters.sport = sport;
    }

    if (city || state || country) {
      filters.location = {};
      if (city) filters.location.city = city;
      if (state) filters.location.state = state;
      if (country) filters.location.country = country;
    }

    if (performanceLevel) {
      if (!['beginner', 'intermediate', 'advanced'].includes(performanceLevel as string)) {
        res.status(400).json({
          error: {
            code: 'INVALID_PERFORMANCE_LEVEL',
            message: 'Performance level must be one of: beginner, intermediate, advanced',
          },
        });
        return;
      }
      filters.performanceLevel = performanceLevel;
    }

    const searchQuery = {
      query: q,
      filters,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    };

    const results = await searchService.search(searchQuery);

    res.json({
      results,
      total: results.length,
      query: q,
      filters,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(error.statusCode || 500).json({
      error: {
        code: error.code || 'SEARCH_ERROR',
        message: error.message || 'Failed to perform search',
      },
    });
  }
});

/**
 * Search for players only
 * GET /api/search/players?q=searchTerm&sport=CRICKET
 */
router.get('/players', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, sport, city, state, country, performanceLevel } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
      return;
    }

    // Build filters
    const filters: any = {};

    if (sport) {
      filters.sport = sport;
    }

    if (city || state || country) {
      filters.location = {};
      if (city) filters.location.city = city;
      if (state) filters.location.state = state;
      if (country) filters.location.country = country;
    }

    if (performanceLevel) {
      if (!['beginner', 'intermediate', 'advanced'].includes(performanceLevel as string)) {
        res.status(400).json({
          error: {
            code: 'INVALID_PERFORMANCE_LEVEL',
            message: 'Performance level must be one of: beginner, intermediate, advanced',
          },
        });
        return;
      }
      filters.performanceLevel = performanceLevel;
    }

    const results = await searchService.searchPlayers(q, filters);

    res.json({
      results,
      total: results.length,
      query: q,
      filters,
    });
  } catch (error: any) {
    console.error('Player search error:', error);
    res.status(error.statusCode || 500).json({
      error: {
        code: error.code || 'SEARCH_ERROR',
        message: error.message || 'Failed to search players',
      },
    });
  }
});

/**
 * Search for teams only
 * GET /api/search/teams?q=searchTerm&sport=FOOTBALL
 */
router.get('/teams', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, sport, city, state, country } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
      return;
    }

    // Build filters
    const filters: any = {};

    if (sport) {
      filters.sport = sport;
    }

    if (city || state || country) {
      filters.location = {};
      if (city) filters.location.city = city;
      if (state) filters.location.state = state;
      if (country) filters.location.country = country;
    }

    const results = await searchService.searchTeams(q, filters);

    res.json({
      results,
      total: results.length,
      query: q,
      filters,
    });
  } catch (error: any) {
    console.error('Team search error:', error);
    res.status(error.statusCode || 500).json({
      error: {
        code: error.code || 'SEARCH_ERROR',
        message: error.message || 'Failed to search teams',
      },
    });
  }
});

/**
 * Search for tournaments only
 * GET /api/search/tournaments?q=searchTerm&sport=CRICKET
 */
router.get('/tournaments', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, sport, city, state } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
      return;
    }

    // Build filters
    const filters: any = {};

    if (sport) {
      filters.sport = sport;
    }

    if (city || state) {
      filters.location = {};
      if (city) filters.location.city = city;
      if (state) filters.location.state = state;
    }

    const results = await searchService.searchTournaments(q, filters);

    res.json({
      results,
      total: results.length,
      query: q,
      filters,
    });
  } catch (error: any) {
    console.error('Tournament search error:', error);
    res.status(error.statusCode || 500).json({
      error: {
        code: error.code || 'SEARCH_ERROR',
        message: error.message || 'Failed to search tournaments',
      },
    });
  }
});

export default router;
