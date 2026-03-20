import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db/postgres';
import * as la from '../services/leagueAuction.service';

const router = Router();

// ─── Auth guard helper ────────────────────────────────────────────────────────
const isAuctionHost = async (auctionId: string, userId: string): Promise<boolean> => {
  const res = await query(
    `SELECT t.host_id FROM auctions a
     JOIN tournaments t ON t.id = a.tournament_id
     WHERE a.id = $1`,
    [auctionId]
  );
  return res.rows[0]?.host_id === userId;
};

// ─── Check if tournament has started (blocks live auction actions) ─────────────
const assertAuctionWindowOpen = async (auctionId: string): Promise<string | null> => {
  const res = await query(
    `SELECT t.start_date, t.registration_deadline
     FROM auctions a JOIN tournaments t ON t.id = a.tournament_id
     WHERE a.id = $1`,
    [auctionId]
  );
  if (!res.rows.length) return null;
  const now = new Date();
  const startDate = new Date(res.rows[0].start_date);
  const regDeadline = new Date(res.rows[0].registration_deadline);
  if (now <= regDeadline) return `Registration is still open until ${regDeadline.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}. Auction cannot run during registration.`;
  if (now >= startDate) return `Tournament started on ${startDate.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}. Auction window has passed.`;
  return null; // window is open
};

// ─── Run migration on first load ──────────────────────────────────────────────
import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../db/postgres';

(async () => {
  try {
    const sql = readFileSync(join(__dirname, '../db/migrations/auction_v2.sql'), 'utf8');
    await pool.query(sql);
    console.log('✓ Auction V2 migration applied');
  } catch (e: any) {
    console.log('Auction V2 migration note:', e.message?.slice(0, 80));
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// CREATE auction for a league tournament (host only)
// POST /api/league-auctions/tournament/:tournamentId/create
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tournament/:tournamentId/create', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Verify host
    const tRes = await query(
      'SELECT host_id, registration_deadline, start_date FROM tournaments WHERE id = $1',
      [req.params.tournamentId]
    );
    if (!tRes.rows.length) { res.status(404).json({ error: 'Tournament not found' }); return; }
    if (tRes.rows[0].host_id !== req.user!.userId) { res.status(403).json({ error: 'Only tournament host can create an auction' }); return; }

    // Enforce auction window: after registration closes, before tournament starts
    const now = new Date();
    const regDeadline = new Date(tRes.rows[0].registration_deadline);
    const startDate   = new Date(tRes.rows[0].start_date);
    if (now <= regDeadline) {
      res.status(400).json({ error: `Registration is still open. Auction can only be created after ${regDeadline.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}.` });
      return;
    }
    if (now >= startDate) {
      res.status(400).json({ error: `Tournament has already started. Auction must be set up before ${startDate.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}.` });
      return;
    }

    // Check no auction exists yet
    const existing = await query('SELECT id FROM auctions WHERE tournament_id = $1', [req.params.tournamentId]);
    if (existing.rows.length) {
      const data = await la.getFullAuctionState(existing.rows[0].id);
      res.json(data);
      return;
    }

    const { teamBudget = 1000000, minSquadSize = 11, maxSquadSize = 15, bidIncrement = 10000, bidTimeout = 30 } = req.body;

    const aRes = await query(
      `INSERT INTO auctions (tournament_id, status, team_budget, min_squad_size, max_squad_size, bid_increment, bid_timeout)
       VALUES ($1, 'SETUP', $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.tournamentId, teamBudget, minSquadSize, maxSquadSize, bidIncrement, bidTimeout]
    );
    const data = await la.getFullAuctionState(aRes.rows[0].id);
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET league teams the current user is managing (accepted invitations)
// GET /api/league-auctions/my/teams
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my/teams', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const res2 = await query(
      `SELECT lt.id AS league_team_id, lt.name AS league_team_name,
              lt.budget, lt.remaining_budget, lt.auction_id,
              a.status AS auction_status,
              t2.name AS tournament_name, t2.sport
       FROM league_teams lt
       JOIN auctions a ON a.id = lt.auction_id
       JOIN tournaments t2 ON t2.id = a.tournament_id
       WHERE lt.host_user_id = $1
       ORDER BY lt.created_at DESC`,
      [req.user!.userId]
    );
    res.json(res2.rows);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET invitations for current user's teams (for team dashboard)
// GET /api/league-auctions/my/invitations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my/invitations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const res2 = await query(
      `SELECT lti.*, a.id AS auction_id, t2.name AS tournament_name,
              t.name AS team_name, up.name AS inviter_name
       FROM league_team_invitations lti
       JOIN auctions a ON a.id = lti.auction_id
       JOIN tournaments t2 ON t2.id = a.tournament_id
       JOIN teams t ON t.id = lti.team_id
       LEFT JOIN user_profiles up ON up.user_id = lti.invited_by_id
       WHERE t.host_id = $1 AND lti.status = 'PENDING'
       ORDER BY lti.created_at DESC`,
      [req.user!.userId]
    );
    res.json(res2.rows);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET full auction state (replaces existing GET /:id for league auctions)
// GET /api/league-auctions/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await la.getFullAuctionState(req.params.id);
    res.json(data);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET auction by tournament
// GET /api/league-auctions/tournament/:tournamentId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tournament/:tournamentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const res2 = await query('SELECT id FROM auctions WHERE tournament_id = $1', [req.params.tournamentId]);
    if (!res2.rows.length) { res.json(null); return; }  // no auction yet — return null, not 404
    const data = await la.getFullAuctionState(res2.rows[0].id);
    res.json(data);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET current bidding player
// GET /api/league-auctions/:id/current-player
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/current-player', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const player = await la.getCurrentBiddingPlayer(req.params.id);
    if (!player) { res.status(404).json({ error: 'No player currently being auctioned' }); return; }
    res.json(player);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET league teams
// GET /api/league-auctions/:id/teams
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/teams', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teams = await la.getLeagueTeams(req.params.id);
    res.json(teams);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET invitations for an auction
// GET /api/league-auctions/:id/invitations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/invitations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invs = await la.getLeagueInvitations(req.params.id);
    res.json(invs);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET fixtures
// GET /api/league-auctions/:id/fixtures
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/fixtures', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const fixtures = await la.getLeagueFixtures(req.params.id);
    res.json(fixtures);
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVITE team to league
// POST /api/league-auctions/:id/invite
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/invite', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only the auction host can send invitations' }); return;
    }
    const { teamId } = req.body;
    if (!teamId) { res.status(400).json({ error: 'teamId required' }); return; }
    const inv = await la.inviteTeamToLeague(req.params.id, teamId, req.user!.userId);
    res.status(201).json(inv);
  } catch (e: any) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPOND to invitation (team host)
// POST /api/league-auctions/invitations/:invitationId/respond
// ─────────────────────────────────────────────────────────────────────────────
router.post('/invitations/:invitationId/respond', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { accept, leagueTeamName } = req.body;
    const result = await la.respondToLeagueInvite(
      req.params.invitationId,
      req.user!.userId,
      !!accept,
      leagueTeamName || ''
    );
    res.json(result);
  } catch (e: any) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER player for auction (host)
// POST /api/league-auctions/:id/players
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/players', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can register players' }); return;
    }
    const { playerId, basePrice } = req.body;
    if (!playerId || basePrice == null) { res.status(400).json({ error: 'playerId and basePrice required' }); return; }
    await la.registerPlayerForAuction(req.params.id, playerId, basePrice);
    res.status(201).json({ message: 'Player registered' });
  } catch (e: any) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// BULK IMPORT all tournament-registered players into pool (host)
// POST /api/league-auctions/:id/import-registered
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/import-registered', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can import players' }); return;
    }
    const { defaultBasePrice = 100 } = req.body;
    // Get tournament_id for this auction
    const auctionRes = await query('SELECT tournament_id FROM auctions WHERE id = $1', [req.params.id]);
    if (!auctionRes.rows.length) { res.status(404).json({ error: 'Auction not found' }); return; }
    const tournamentId = auctionRes.rows[0].tournament_id;
    // Get all confirmed registrations for this tournament
    const regRes = await query(
      `SELECT player_id, player_details FROM tournament_registrations
       WHERE tournament_id = $1 AND player_id IS NOT NULL AND status = 'CONFIRMED'`,
      [tournamentId]
    );
    if (!regRes.rows.length) {
      res.json({ imported: 0, message: 'No confirmed player registrations found for this tournament' });
      return;
    }
    let imported = 0;
    let skipped = 0;
    for (const row of regRes.rows) {
      const basePrice = row.player_details?.basePrice || defaultBasePrice;
      try {
        await la.registerPlayerForAuction(req.params.id, row.player_id, basePrice);
        imported++;
      } catch {
        skipped++; // already in pool or other error
      }
    }
    res.json({ imported, skipped, total: regRes.rows.length });
  } catch (e: any) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// START AUCTION with role order (host)
// POST /api/league-auctions/:id/start
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can start the auction' }); return;
    }
    const windowErr = await assertAuctionWindowOpen(req.params.id);
    if (windowErr) { res.status(400).json({ error: windowErr }); return; }
    if (!req.body.playerPool || req.body.playerPool.length === 0) {
      // Check if any players exist
      const chk = await query(`SELECT COUNT(*) AS cnt FROM auction_players WHERE auction_id = $1 AND status = 'PENDING'`, [req.params.id]);
      if (parseInt(chk.rows[0].cnt) === 0) { res.status(400).json({ error: 'Add players to the pool before starting' }); return; }
    }
    const roleOrder: string[] = req.body.roleOrder || ['BATSMAN', 'WICKET_KEEPER', 'ALL_ROUNDER', 'BOWLER'];
    const player = await la.startAuction(req.params.id, roleOrder);
    if (!player) { res.json({ completed: true, message: 'No players in pool' }); return; }
    res.json(player);
  } catch (e: any) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEXT PLAYER (host)
// POST /api/league-auctions/:id/next-player
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/next-player', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can advance the auction' }); return;
    }
    const windowErr = await assertAuctionWindowOpen(req.params.id);
    if (windowErr) { res.status(400).json({ error: windowErr }); return; }
    const player = await la.nextAuctionPlayer(req.params.id);
    if (!player) { res.json({ completed: true, message: 'All players auctioned' }); return; }
    res.json(player);
  } catch (e: any) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PLACE BID (league team manager)
// POST /api/league-auctions/:id/bid
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/bid', authenticate, async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    const { playerId, leagueTeamId, amount } = req.body;
    if (!playerId || !leagueTeamId || !amount) {
      res.status(400).json({ error: 'playerId, leagueTeamId, amount required' }); return;
    }
    const windowErr = await assertAuctionWindowOpen(req.params.id);
    if (windowErr) { res.status(400).json({ error: windowErr }); return; }
    // Verify user is the manager of that league team
    const ltRes = await query(
      `SELECT lt.* FROM league_teams lt WHERE lt.id = $1 AND lt.host_user_id = $2`,
      [leagueTeamId, req.user!.userId]
    );
    if (!ltRes.rows.length) { res.status(403).json({ error: 'Not your league team' }); return; }

    const bid = await la.placeLeagueBid(req.params.id, playerId, leagueTeamId, amount);
    res.status(201).json(bid);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SELL current player (host finalizes)
// POST /api/league-auctions/:id/sell
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/sell', authenticate, async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can sell a player' }); return;
    }
    const windowErr = await assertAuctionWindowOpen(req.params.id);
    if (windowErr) { res.status(400).json({ error: windowErr }); return; }
    const result = await la.sellCurrentPlayer(req.params.id);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// MARK UNSOLD (host)
// POST /api/league-auctions/:id/unsold
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/unsold', authenticate, async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can mark a player unsold' }); return;
    }
    const windowErr = await assertAuctionWindowOpen(req.params.id);
    if (windowErr) { res.status(400).json({ error: windowErr }); return; }
    await la.markPlayerUnsold(req.params.id);
    res.json({ message: 'Player marked unsold' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// RE-AUCTION UNSOLD PLAYERS (host resets all UNSOLD back to PENDING)
// POST /api/league-auctions/:id/reauction-unsold
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/reauction-unsold', authenticate, async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can re-auction unsold players' }); return;
    }
    const result = await la.reAuctionUnsoldPlayers(req.params.id);
    res.json({ message: `${result.reset} unsold player(s) moved back to auction queue`, ...result });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE FIXTURES (host, after auction complete)
// POST /api/league-auctions/:id/generate-fixtures
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/generate-fixtures', authenticate, async (req: AuthRequest, res: Response, _next: NextFunction) => {
  try {
    if (!await isAuctionHost(req.params.id, req.user!.userId)) {
      res.status(403).json({ error: 'Only host can generate fixtures' }); return;
    }
    const fixtures = await la.generateLeagueFixtures(req.params.id);
    res.json(fixtures);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
