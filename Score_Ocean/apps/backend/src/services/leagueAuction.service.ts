import pool, { query } from '../db/postgres';
import { websocketService } from './websocket.service';

// Role sort order for auction sequencing
const ROLE_ORDER: Record<string, number> = {
  BATSMAN: 1,
  WICKET_KEEPER: 2,
  ALL_ROUNDER: 3,
  BOWLER: 4,
  // Football
  GOALKEEPER: 1,
  DEFENDER: 2,
  MIDFIELDER: 3,
  FORWARD: 4,
  // Generic fallback
  UNKNOWN: 99,
};

// ─────────────────────────────────────────────────────────────────────────────
// LEAGUE TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function inviteTeamToLeague(
  auctionId: string,
  teamId: string,
  invitedById: string
): Promise<any> {
  // Verify the auction belongs to the inviter's tournament
  const auctionRes = await query('SELECT * FROM auctions WHERE id = $1', [auctionId]);
  if (!auctionRes.rows.length) throw new Error('Auction not found');

  const existing = await query(
    'SELECT id FROM league_team_invitations WHERE auction_id = $1 AND team_id = $2',
    [auctionId, teamId]
  );
  if (existing.rows.length) throw new Error('Team already invited');

  const res = await query(
    `INSERT INTO league_team_invitations (auction_id, team_id, invited_by_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [auctionId, teamId, invitedById]
  );

  // Notify team host
  const teamRes = await query('SELECT host_id, name FROM teams WHERE id = $1', [teamId]);
  if (teamRes.rows.length) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, channels)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        teamRes.rows[0].host_id,
        'LEAGUE_INVITE',
        'League Auction Invitation',
        `Your team "${teamRes.rows[0].name}" has been invited to participate in a league auction!`,
        JSON.stringify({ auctionId, invitationId: res.rows[0].id }),
        ['IN_APP'],
      ]
    );
  }

  return res.rows[0];
}

export async function respondToLeagueInvite(
  invitationId: string,
  userId: string,
  accept: boolean,
  leagueTeamName: string
): Promise<any> {
  const invRes = await query(
    `SELECT lti.*, t.host_id, t.name as team_name
     FROM league_team_invitations lti
     JOIN teams t ON t.id = lti.team_id
     WHERE lti.id = $1`,
    [invitationId]
  );
  if (!invRes.rows.length) throw new Error('Invitation not found');
  const inv = invRes.rows[0];
  if (inv.host_id !== userId) throw new Error('Not authorized');
  if (inv.status !== 'PENDING') throw new Error('Invitation already responded to');

  if (!accept) {
    await query(
      `UPDATE league_team_invitations SET status = 'DECLINED', updated_at = NOW() WHERE id = $1`,
      [invitationId]
    );
    return { status: 'DECLINED' };
  }

  // Get auction budget
  const auctionRes = await query('SELECT * FROM auctions WHERE id = $1', [inv.auction_id]);
  if (!auctionRes.rows.length) throw new Error('Auction not found');
  const auction = auctionRes.rows[0];
  const budget = parseFloat(auction.team_budget);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create league-specific team
    const ltRes = await client.query(
      `INSERT INTO league_teams (auction_id, name, host_team_id, host_user_id, budget, remaining_budget)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [inv.auction_id, leagueTeamName || inv.team_name, inv.team_id, userId, budget, budget]
    );
    const leagueTeam = ltRes.rows[0];

    // Update invitation
    await client.query(
      `UPDATE league_team_invitations
       SET status = 'ACCEPTED', league_team_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [leagueTeam.id, invitationId]
    );

    await client.query('COMMIT');
    return leagueTeam;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getLeagueTeams(auctionId: string): Promise<any[]> {
  const res = await query(
    `SELECT lt.*,
       up.name AS manager_name, up.avatar_url AS manager_avatar,
       COALESCE(json_agg(
         json_build_object(
           'playerId', ltr.player_id,
           'playerName', pup.name,
           'playerAvatar', pup.avatar_url,
           'role', (SELECT sp.statistics->>'role' FROM sport_profiles sp WHERE sp.user_id = ltr.player_id LIMIT 1),
           'pricePaid', ltr.price_paid
         )
       ) FILTER (WHERE ltr.player_id IS NOT NULL), '[]') AS roster
     FROM league_teams lt
     LEFT JOIN user_profiles up ON up.user_id = lt.host_user_id
     LEFT JOIN league_team_rosters ltr ON ltr.league_team_id = lt.id
     LEFT JOIN user_profiles pup ON pup.user_id = ltr.player_id
     WHERE lt.auction_id = $1
     GROUP BY lt.id, up.name, up.avatar_url
     ORDER BY lt.created_at`,
    [auctionId]
  );
  return res.rows;
}

export async function getLeagueInvitations(auctionId: string): Promise<any[]> {
  const res = await query(
    `SELECT lti.*, t.name AS team_name, up.name AS host_name, up.avatar_url AS host_avatar
     FROM league_team_invitations lti
     JOIN teams t ON t.id = lti.team_id
     LEFT JOIN user_profiles up ON up.user_id = t.host_id
     WHERE lti.auction_id = $1
     ORDER BY lti.created_at DESC`,
    [auctionId]
  );
  return res.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER REGISTRATION WITH ROLE ORDERING
// ─────────────────────────────────────────────────────────────────────────────

export async function registerPlayerForAuction(
  auctionId: string,
  playerId: string,
  basePrice: number
): Promise<void> {
  // Get player role from sport profile
  const roleRes = await query(
    `SELECT sp.statistics->>'role' AS role
     FROM sport_profiles sp
     JOIN auctions a ON a.tournament_id = (SELECT tournament_id FROM auctions WHERE id = $1)
     JOIN tournaments t ON t.id = a.tournament_id
     WHERE sp.user_id = $2 AND sp.sport = t.sport
     LIMIT 1`,
    [auctionId, playerId]
  );
  const role = (roleRes.rows[0]?.role || 'UNKNOWN').toUpperCase();
  const sortOrder = ROLE_ORDER[role] ?? 99;

  // Use player's own auction base price from sport_profile if set, else fall back to provided basePrice
  const playerBpRes = await query(
    `SELECT base_price FROM sport_profiles
     WHERE user_id = $1
       AND sport = (SELECT sport FROM tournaments t JOIN auctions a ON a.tournament_id = t.id WHERE a.id = $2)
     LIMIT 1`,
    [playerId, auctionId]
  );
  const effectiveBasePrice = playerBpRes.rows[0]?.base_price != null
    ? parseFloat(playerBpRes.rows[0].base_price)
    : basePrice;

  await query(
    `INSERT INTO auction_players (auction_id, player_id, base_price, status, player_role, sort_order, auction_round)
     VALUES ($1, $2, $3, 'PENDING', $4, $5, 1)
     ON CONFLICT DO NOTHING`,
    [auctionId, playerId, effectiveBasePrice, role, sortOrder]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE AUCTION — NEXT PLAYER (role-ordered, round-aware)
// ─────────────────────────────────────────────────────────────────────────────

export async function nextAuctionPlayer(auctionId: string): Promise<any | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Finalize currently BIDDING player
    const currentRes = await client.query(
      `SELECT ap.*, up.name AS player_name, up.avatar_url, u_prof.city, u_prof.state,
              sp.statistics AS sport_stats
       FROM auction_players ap
       LEFT JOIN user_profiles up ON up.user_id = ap.player_id
       LEFT JOIN user_profiles u_prof ON u_prof.user_id = ap.player_id
       LEFT JOIN sport_profiles sp ON sp.user_id = ap.player_id
       WHERE ap.auction_id = $1 AND ap.status = 'BIDDING'`,
      [auctionId]
    );

    if (currentRes.rows.length > 0) {
      const cur = currentRes.rows[0];
      if (cur.current_bidder_id) {
        await _finalizeLeagueSale(client, auctionId, cur);
      } else {
        // Mark unsold — push to round 2 if not already
        if (cur.auction_round === 1) {
          await client.query(
            `UPDATE auction_players SET status = 'PENDING', auction_round = 2, updated_at = NOW()
             WHERE auction_id = $1 AND player_id = $2`,
            [auctionId, cur.player_id]
          );
        } else {
          await client.query(
            `UPDATE auction_players SET status = 'UNSOLD', updated_at = NOW()
             WHERE auction_id = $1 AND player_id = $2`,
            [auctionId, cur.player_id]
          );
        }
        await websocketService.publishAuctionUpdate(auctionId, 'auction:player-unsold', {
          type: 'PLAYER_UNSOLD',
          data: { playerId: cur.player_id, name: cur.player_name, round: cur.auction_round },
          timestamp: new Date(),
        });
      }
    }

    // Get next pending player: round 1 first, ordered by role sort_order, then round 2
    const nextRes = await client.query(
      `SELECT ap.*, up.name AS player_name, up.avatar_url,
              u_prof.city, u_prof.state, u_prof.age,
              sp.statistics AS sport_stats
       FROM auction_players ap
       LEFT JOIN user_profiles up ON up.user_id = ap.player_id
       LEFT JOIN user_profiles u_prof ON u_prof.user_id = ap.player_id
       LEFT JOIN auctions a ON a.id = ap.auction_id
       LEFT JOIN sport_profiles sp ON sp.user_id = ap.player_id
         AND sp.sport = (SELECT sport FROM tournaments WHERE id = a.tournament_id)
       WHERE ap.auction_id = $1 AND ap.status = 'PENDING'
       ORDER BY ap.auction_round ASC, ap.sort_order ASC, ap.created_at ASC
       LIMIT 1`,
      [auctionId]
    );

    if (nextRes.rows.length === 0) {
      // Auction complete
      await client.query(
        `UPDATE auctions SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
        [auctionId]
      );
      await client.query('COMMIT');
      await websocketService.publishAuctionUpdate(auctionId, 'auction:completed', {
        type: 'AUCTION_COMPLETED',
        data: {},
        timestamp: new Date(),
      });
      return null;
    }

    const next = nextRes.rows[0];
    await client.query(
      `UPDATE auction_players
       SET status = 'BIDDING', current_bid = base_price, current_bidder_id = NULL, updated_at = NOW()
       WHERE auction_id = $1 AND player_id = $2`,
      [auctionId, next.player_id]
    );

    await client.query(
      `UPDATE auctions SET current_player_index = current_player_index + 1, updated_at = NOW()
       WHERE id = $1`,
      [auctionId]
    );

    await client.query('COMMIT');

    const playerData = buildPlayerData(next);
    await websocketService.publishAuctionUpdate(auctionId, 'auction:next-player', {
      type: 'NEXT_PLAYER',
      data: playerData,
      timestamp: new Date(),
    });

    return playerData;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BID ON LEAGUE TEAM
// ─────────────────────────────────────────────────────────────────────────────

export async function placeLeagueBid(
  auctionId: string,
  playerId: string,
  leagueTeamId: string,
  amount: number
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate player is BIDDING
    const apRes = await client.query(
      `SELECT * FROM auction_players WHERE auction_id = $1 AND player_id = $2 AND status = 'BIDDING'`,
      [auctionId, playerId]
    );
    if (!apRes.rows.length) throw new Error('Player is not currently up for auction');

    const ap = apRes.rows[0];
    if (amount <= parseFloat(ap.current_bid || ap.base_price)) {
      throw new Error(`Bid must be higher than current bid of ${ap.current_bid || ap.base_price}`);
    }

    // Validate league team budget
    const ltRes = await client.query(
      `SELECT * FROM league_teams WHERE id = $1 AND auction_id = $2`,
      [leagueTeamId, auctionId]
    );
    if (!ltRes.rows.length) throw new Error('League team not found');
    const lt = ltRes.rows[0];
    if (parseFloat(lt.remaining_budget) < amount) {
      throw new Error(`Insufficient budget. Remaining: ${lt.remaining_budget}`);
    }

    // Get auction config for max squad size
    const auctionRes = await client.query('SELECT * FROM auctions WHERE id = $1', [auctionId]);
    const maxSquad = auctionRes.rows[0]?.max_squad_size || 999;
    if (lt.players_acquired >= maxSquad) throw new Error('Max squad size reached');

    // Record bid
    const bidRes = await client.query(
      `INSERT INTO auction_bids (auction_id, player_id, team_id, amount, league_team_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [auctionId, playerId, leagueTeamId, amount, leagueTeamId]
    );

    // Update current bid on auction_players
    await client.query(
      `UPDATE auction_players
       SET current_bid = $1, current_bidder_id = $2, updated_at = NOW()
       WHERE auction_id = $3 AND player_id = $4`,
      [amount, leagueTeamId, auctionId, playerId]
    );

    await client.query('COMMIT');

    const bid = bidRes.rows[0];

    await websocketService.publishAuctionUpdate(auctionId, 'auction:bid', {
      type: 'BID_PLACED',
      data: {
        bidId: bid.id,
        playerId,
        leagueTeamId,
        amount,
        teamName: lt.name,
        timestamp: bid.timestamp,
      },
      timestamp: new Date(),
    });

    return bid;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELL / UNSOLD (host manually triggers)
// ─────────────────────────────────────────────────────────────────────────────

export async function sellCurrentPlayer(auctionId: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query(
      `SELECT ap.*, up.name AS player_name FROM auction_players ap
       LEFT JOIN user_profiles up ON up.user_id = ap.player_id
       WHERE ap.auction_id = $1 AND ap.status = 'BIDDING'`,
      [auctionId]
    );
    if (!currentRes.rows.length) throw new Error('No player is currently being auctioned');
    const cur = currentRes.rows[0];
    if (!cur.current_bidder_id) throw new Error('No bid has been placed yet');

    await _finalizeLeagueSale(client, auctionId, cur);
    await client.query('COMMIT');

    await websocketService.publishAuctionUpdate(auctionId, 'auction:player-sold', {
      type: 'PLAYER_SOLD',
      data: {
        playerId: cur.player_id,
        playerName: cur.player_name,
        leagueTeamId: cur.current_bidder_id,
        finalPrice: parseFloat(cur.current_bid),
      },
      timestamp: new Date(),
    });

    return {
      playerId: cur.player_id,
      playerName: cur.player_name,
      leagueTeamId: cur.current_bidder_id,
      finalPrice: parseFloat(cur.current_bid),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markPlayerUnsold(auctionId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentRes = await client.query(
      `SELECT * FROM auction_players WHERE auction_id = $1 AND status = 'BIDDING'`,
      [auctionId]
    );
    if (!currentRes.rows.length) throw new Error('No player being auctioned');
    const cur = currentRes.rows[0];

    if (cur.auction_round === 1) {
      // Push to round 2
      await client.query(
        `UPDATE auction_players SET status = 'PENDING', auction_round = 2, current_bid = base_price, current_bidder_id = NULL, updated_at = NOW()
         WHERE auction_id = $1 AND player_id = $2`,
        [auctionId, cur.player_id]
      );
    } else {
      // Final unsold
      await client.query(
        `UPDATE auction_players SET status = 'UNSOLD', updated_at = NOW()
         WHERE auction_id = $1 AND player_id = $2`,
        [auctionId, cur.player_id]
      );
    }
    await client.query('COMMIT');

    await websocketService.publishAuctionUpdate(auctionId, 'auction:player-unsold', {
      type: 'PLAYER_UNSOLD',
      data: { playerId: cur.player_id, round: cur.auction_round },
      timestamp: new Date(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-AUCTION UNSOLD PLAYERS
// ─────────────────────────────────────────────────────────────────────────────

export async function reAuctionUnsoldPlayers(auctionId: string): Promise<{ reset: number }> {
  const res = await query(
    `UPDATE auction_players
     SET status = 'PENDING', auction_round = 1,
         current_bid = base_price, current_bidder_id = NULL, updated_at = NOW()
     WHERE auction_id = $1 AND status = 'UNSOLD'
     RETURNING id`,
    [auctionId]
  );
  const count = res.rows.length;
  if (count > 0) {
    // Move auction back to LIVE so nextPlayer can proceed
    await query(
      `UPDATE auctions SET status = 'LIVE', updated_at = NOW() WHERE id = $1 AND status = 'COMPLETED'`,
      [auctionId]
    );
  }
  await websocketService.publishAuctionUpdate(auctionId, 'auction:reauction-unsold', {
    type: 'REAUCTION_UNSOLD',
    data: { reset: count },
    timestamp: new Date(),
  });
  return { reset: count };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export async function generateLeagueFixtures(auctionId: string): Promise<any[]> {
  const auctionRes = await query('SELECT * FROM auctions WHERE id = $1', [auctionId]);
  if (!auctionRes.rows.length) throw new Error('Auction not found');
  const auction = auctionRes.rows[0];

  if (auction.status !== 'COMPLETED' && auction.status !== 'FIXTURES_READY') throw new Error('Auction must be completed before generating fixtures');

  const teamsRes = await query(
    `SELECT id, name FROM league_teams WHERE auction_id = $1 ORDER BY created_at`,
    [auctionId]
  );
  const teams = teamsRes.rows;
  if (teams.length < 2) throw new Error('Need at least 2 teams to generate fixtures');

  // Delete existing fixtures for this auction
  await query('DELETE FROM league_fixtures WHERE auction_id = $1', [auctionId]);

  const fixtures: any[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  if (teams.length <= 8) {
    // Round-robin group stage → knockout
    fixtures.push(..._generateRoundRobin(teams, auctionId, auction.tournament_id, startDate));
  } else {
    // Large league: pure round-robin
    fixtures.push(..._generateRoundRobin(teams, auctionId, auction.tournament_id, startDate));
  }

  // Insert fixtures
  const inserted: any[] = [];
  for (const f of fixtures) {
    const res = await query(
      `INSERT INTO league_fixtures (auction_id, tournament_id, round, match_number, home_team_id, away_team_id, stage, scheduled_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [f.auctionId, f.tournamentId, f.round, f.matchNumber, f.homeTeamId, f.awayTeamId, f.stage, f.scheduledDate]
    );
    inserted.push(res.rows[0]);
  }

  await query(
    `UPDATE auctions SET status = 'FIXTURES_READY', updated_at = NOW() WHERE id = $1`,
    [auctionId]
  );

  await websocketService.publishAuctionUpdate(auctionId, 'auction:fixtures-ready', {
    type: 'FIXTURES_READY',
    data: { count: inserted.length },
    timestamp: new Date(),
  });

  return inserted;
}

export async function getLeagueFixtures(auctionId: string): Promise<any[]> {
  const res = await query(
    `SELECT lf.*,
       ht.name AS home_team_name,
       at2.name AS away_team_name
     FROM league_fixtures lf
     JOIN league_teams ht ON ht.id = lf.home_team_id
     JOIN league_teams at2 ON at2.id = lf.away_team_id
     WHERE lf.auction_id = $1
     ORDER BY lf.round ASC, lf.match_number ASC`,
    [auctionId]
  );
  return res.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT BIDDING PLAYER (with full details)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentBiddingPlayer(auctionId: string): Promise<any | null> {
  const res = await query(
    `SELECT ap.*,
       up.name AS player_name, up.avatar_url,
       u_prof.city, u_prof.state, u_prof.age,
       sp.statistics AS sport_stats,
       (SELECT json_agg(json_build_object(
           'leagueTeamId', ab.league_team_id,
           'teamName', lt.name,
           'amount', ab.amount,
           'timestamp', ab.timestamp
         ) ORDER BY ab.timestamp DESC)
        FROM auction_bids ab
        JOIN league_teams lt ON lt.id = ab.league_team_id
        WHERE ab.auction_id = ap.auction_id AND ab.player_id = ap.player_id
       ) AS bids,
       lt2.name AS current_bidder_name
     FROM auction_players ap
     LEFT JOIN user_profiles up ON up.user_id = ap.player_id
     LEFT JOIN user_profiles u_prof ON u_prof.user_id = ap.player_id
     LEFT JOIN auctions a ON a.id = ap.auction_id
     LEFT JOIN sport_profiles sp ON sp.user_id = ap.player_id
       AND sp.sport = (SELECT sport FROM tournaments WHERE id = a.tournament_id)
     LEFT JOIN league_teams lt2 ON lt2.id = ap.current_bidder_id
     WHERE ap.auction_id = $1 AND ap.status = 'BIDDING'`,
    [auctionId]
  );
  if (!res.rows.length) return null;
  return buildPlayerData(res.rows[0]);
}

export async function getFullAuctionState(auctionId: string): Promise<any> {
  const auctionRes = await query(
    `SELECT a.*, t.host_id AS tournament_host_id
     FROM auctions a JOIN tournaments t ON t.id = a.tournament_id
     WHERE a.id = $1`,
    [auctionId]
  );
  if (!auctionRes.rows.length) throw new Error('Auction not found');
  const auction = auctionRes.rows[0];

  const [leagueTeams, invitations, currentPlayer, playerPool, results, fixtures] = await Promise.all([
    getLeagueTeams(auctionId),
    getLeagueInvitations(auctionId),
    getCurrentBiddingPlayer(auctionId),
    query(
      `SELECT ap.*, up.name AS player_name, up.avatar_url, sp.statistics AS sport_stats
       FROM auction_players ap
       LEFT JOIN user_profiles up ON up.user_id = ap.player_id
       LEFT JOIN auctions a ON a.id = ap.auction_id
       LEFT JOIN sport_profiles sp ON sp.user_id = ap.player_id
         AND sp.sport = (SELECT sport FROM tournaments WHERE id = a.tournament_id)
       WHERE ap.auction_id = $1
       ORDER BY ap.auction_round, ap.sort_order, ap.created_at`,
      [auctionId]
    ),
    query(
      `SELECT ar.*, up.name AS player_name, up.avatar_url, lt.name AS team_name
       FROM auction_results ar
       LEFT JOIN user_profiles up ON up.user_id = ar.player_id
       LEFT JOIN league_teams lt ON lt.id = ar.league_team_id
       WHERE ar.auction_id = $1
       ORDER BY ar.created_at DESC`,
      [auctionId]
    ),
    getLeagueFixtures(auctionId),
  ]);

  return {
    id: auction.id,
    tournamentId: auction.tournament_id,
    hostUserId: auction.tournament_host_id,
    status: auction.status,
    config: {
      teamBudget: parseFloat(auction.team_budget),
      minSquadSize: auction.min_squad_size,
      maxSquadSize: auction.max_squad_size,
      bidIncrement: parseFloat(auction.bid_increment),
      bidTimeout: auction.bid_timeout,
    },
    leagueTeams,
    invitations,
    currentPlayer,
    playerPool: playerPool.rows.map(buildPlayerData),
    results: results.rows,
    fixtures,
    currentPlayerIndex: auction.current_player_index,
  };
}

// Start auction with a custom role order
export async function startAuction(auctionId: string, roleOrder: string[]): Promise<any> {
  // Re-assign sort_order for all PENDING round-1 players based on host's chosen role order
  for (let i = 0; i < roleOrder.length; i++) {
    await query(
      `UPDATE auction_players
       SET sort_order = $1
       WHERE auction_id = $2 AND player_role = $3 AND auction_round = 1 AND status = 'PENDING'`,
      [(i + 1) * 1000, auctionId, roleOrder[i].toUpperCase()]
    );
  }
  // Any roles not in the list go last
  await query(
    `UPDATE auction_players
     SET sort_order = 9000
     WHERE auction_id = $1 AND auction_round = 1 AND status = 'PENDING'
       AND player_role NOT IN (${roleOrder.map((_: any, j: number) => `$${j + 2}`).join(',')} )`,
    [auctionId, ...roleOrder.map((r: string) => r.toUpperCase())]
  );
  return nextAuctionPlayer(auctionId);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function _finalizeLeagueSale(client: any, auctionId: string, cur: any): Promise<void> {
  const finalPrice = parseFloat(cur.current_bid);
  const leagueTeamId = cur.current_bidder_id;

  // Mark sold
  await client.query(
    `UPDATE auction_players SET status = 'SOLD', updated_at = NOW()
     WHERE auction_id = $1 AND player_id = $2`,
    [auctionId, cur.player_id]
  );

  // Add to league team roster
  await client.query(
    `INSERT INTO league_team_rosters (league_team_id, player_id, price_paid)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [leagueTeamId, cur.player_id, finalPrice]
  );

  // Deduct from league team budget
  await client.query(
    `UPDATE league_teams
     SET remaining_budget = remaining_budget - $1,
         players_acquired  = players_acquired + 1,
         updated_at = NOW()
     WHERE id = $2`,
    [finalPrice, leagueTeamId]
  );

  // Count bids
  const bidCountRes = await client.query(
    `SELECT COUNT(*) AS cnt FROM auction_bids WHERE auction_id = $1 AND player_id = $2`,
    [auctionId, cur.player_id]
  );
  const totalBids = parseInt(bidCountRes.rows[0].cnt, 10);

  // Store result
  await client.query(
    `INSERT INTO auction_results (auction_id, player_id, team_id, final_price, total_bids, league_team_id)
     VALUES ($1, $2, $3, $4, $5, $3) ON CONFLICT DO NOTHING`,
    [auctionId, cur.player_id, leagueTeamId, finalPrice, totalBids]
  );

  // Notify player
  await client.query(
    `INSERT INTO notifications (user_id, type, title, message, data, channels)
     VALUES ($1, 'AUCTION_SOLD', 'You were sold in the auction!',
       'Congratulations! You have been acquired by a team.', $2, '{IN_APP}')`,
    [cur.player_id, JSON.stringify({ auctionId, leagueTeamId, finalPrice })]
  );
}

function buildPlayerData(row: any): any {
  const stats = row.sport_stats || {};
  return {
    playerId: row.player_id,
    playerName: row.player_name || 'Unknown',
    avatarUrl: row.avatar_url,
    city: row.city,
    state: row.state,
    age: row.age,
    role: row.player_role || stats.role || 'UNKNOWN',
    basePrice: parseFloat(row.base_price),
    currentBid: parseFloat(row.current_bid || row.base_price),
    currentBidderId: row.current_bidder_id,
    currentBidderName: row.current_bidder_name,
    status: row.status,
    round: row.auction_round,
    stats: {
      runs: stats.Runs ?? stats.runs ?? 0,
      wickets: stats.Wickets ?? stats.wickets ?? 0,
      battingAverage: stats.BattingAverage ?? stats.battingAverage ?? 0,
      strikeRate: stats.StrikeRate ?? stats.strikeRate ?? 0,
      bowlingAverage: stats.BowlingAverage ?? stats.bowlingAverage ?? 0,
      matchesPlayed: stats.matchesPlayed ?? stats.InningsPlayed ?? 0,
    },
    bids: row.bids || [],
  };
}

function _generateRoundRobin(
  teams: any[],
  auctionId: string,
  tournamentId: string,
  startDate: Date
): any[] {
  const fixtures: any[] = [];
  const n = teams.length;
  // Circle algorithm — single round-robin (each pair plays exactly once)
  const list = [...teams];
  if (n % 2 !== 0) list.push({ id: null, name: 'BYE' }); // BYE for odd number
  const groupRounds = list.length - 1;
  const half = list.length / 2;
  let matchNumber = 1;

  for (let r = 0; r < groupRounds; r++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + r * 2); // 2 days between rounds
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[list.length - 1 - i];
      if (home.id && away.id) {
        fixtures.push({
          auctionId, tournamentId,
          round: r + 1,
          matchNumber: matchNumber++,
          homeTeamId: home.id,
          awayTeamId: away.id,
          stage: 'GROUP',
          scheduledDate: date,
        });
      }
    }
    // Rotate — keep first element fixed, rotate the rest
    list.splice(1, 0, list.pop()!);
  }

  // ── Knockout bracket ──────────────────────────────────────────────────────
  // Determine how many teams advance based on team count:
  //   3 teams  → top 2 → FINAL (no SF)
  //   4-7 teams → top 4 → 2 SFs → FINAL
  //   8+ teams → top 8 → 4 QFs → 2 SFs → FINAL
  const koBase = new Date(startDate);
  koBase.setDate(koBase.getDate() + groupRounds * 2 + 3);

  const hasQF = n >= 8;
  const hasSF = n >= 4; // 4+ teams get semis

  let koRound = groupRounds + 1;

  // Quarter-Finals (4 matches, 8 teams → 4)
  if (hasQF) {
    const qfDate = new Date(koBase);
    for (let i = 0; i < 4; i++) {
      fixtures.push({
        auctionId, tournamentId,
        round: koRound,
        matchNumber: matchNumber++,
        homeTeamId: teams[i % teams.length].id,
        awayTeamId: teams[(i * 2 + 1) % teams.length].id,
        stage: 'QF',
        scheduledDate: qfDate,
      });
    }
    koRound++;
  }

  // Semi-Finals (2 matches, top 4 → 2)
  if (hasSF) {
    const sfDate = new Date(koBase);
    sfDate.setDate(sfDate.getDate() + (hasQF ? 4 : 0));
    for (let i = 0; i < 2; i++) {
      fixtures.push({
        auctionId, tournamentId,
        round: koRound,
        matchNumber: matchNumber++,
        homeTeamId: teams[i % teams.length].id,
        awayTeamId: teams[(i + 1) % teams.length].id,
        stage: 'SF',
        scheduledDate: sfDate,
      });
    }
    koRound++;
  }

  // Final (1 match, top 2 → champion)
  const finalDate = new Date(koBase);
  finalDate.setDate(finalDate.getDate() + (hasQF ? 8 : hasSF ? 4 : 0));
  fixtures.push({
    auctionId, tournamentId,
    round: koRound,
    matchNumber: matchNumber++,
    homeTeamId: teams[0].id,
    awayTeamId: teams[1].id,
    stage: 'FINAL',
    scheduledDate: finalDate,
  });

  return fixtures;
}
