import pool from '../db/postgres';
import redisClient from '../db/redis';
import { websocketService } from './websocket.service';
import {
  Auction,
  AuctionStatus,
  AuctionConfig,
  AuctionPlayer,
  PlayerAuctionStatus,
  Bid,
  TeamBudget,
  AuctionResult,
  AuctionEvent,
} from '@score-ocean/types';

export class AuctionService {
  /**
   * Create a new auction for a tournament
   */
  async createAuction(
    tournamentId: string,
    config: AuctionConfig
  ): Promise<Auction> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert auction
      const auctionResult = await client.query(
        `INSERT INTO auctions (
          tournament_id, status, team_budget, min_squad_size, 
          max_squad_size, bid_increment, bid_timeout
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tournamentId,
          AuctionStatus.SETUP,
          config.teamBudget,
          config.minSquadSize,
          config.maxSquadSize,
          config.bidIncrement,
          config.bidTimeout,
        ]
      );

      const auctionRow = auctionResult.rows[0];

      // Get registered teams for the tournament
      const teamsResult = await client.query(
        `SELECT team_id FROM tournament_registrations 
         WHERE tournament_id = $1 AND status = 'CONFIRMED'`,
        [tournamentId]
      );

      // Initialize team budgets in Redis
      const teamBudgets: TeamBudget[] = [];
      
      for (const teamRow of teamsResult.rows) {
        const teamBudget: TeamBudget = {
          teamId: teamRow.team_id,
          totalBudget: config.teamBudget,
          remainingBudget: config.teamBudget,
          playersAcquired: 0,
        };
        teamBudgets.push(teamBudget);

        // Store in Redis for fast access during bidding
        await redisClient.hSet(
          `auction:${auctionRow.id}:budget:${teamRow.team_id}`,
          {
            totalBudget: config.teamBudget.toString(),
            remainingBudget: config.teamBudget.toString(),
            playersAcquired: '0',
          }
        );
      }

      await client.query('COMMIT');

      return {
        id: auctionRow.id,
        tournamentId: auctionRow.tournament_id,
        status: auctionRow.status as AuctionStatus,
        config: {
          teamBudget: parseFloat(auctionRow.team_budget),
          minSquadSize: auctionRow.min_squad_size,
          maxSquadSize: auctionRow.max_squad_size,
          bidIncrement: parseFloat(auctionRow.bid_increment),
          bidTimeout: auctionRow.bid_timeout,
        },
        playerPool: [],
        teamBudgets,
        currentPlayerIndex: auctionRow.current_player_index,
        results: [],
        createdAt: auctionRow.created_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Register a player for auction
   */
  async registerPlayer(
    auctionId: string,
    playerId: string,
    basePrice: number
  ): Promise<void> {
    const result = await pool.query(
      `INSERT INTO auction_players (auction_id, player_id, base_price, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [auctionId, playerId, basePrice, PlayerAuctionStatus.PENDING]
    );

    if (result.rowCount === 0) {
      throw new Error('Failed to register player for auction');
    }
  }

  /**
   * Get auction by ID
   */
  async getAuction(auctionId: string): Promise<Auction | null> {
    const auctionResult = await pool.query(
      'SELECT * FROM auctions WHERE id = $1',
      [auctionId]
    );

    if (auctionResult.rows.length === 0) {
      return null;
    }

    const auctionRow = auctionResult.rows[0];

    // Get player pool
    const playersResult = await pool.query(
      `SELECT ap.*, 
        (SELECT COUNT(*) FROM auction_bids WHERE player_id = ap.player_id AND auction_id = ap.auction_id) as bid_count
       FROM auction_players ap
       WHERE ap.auction_id = $1
       ORDER BY ap.created_at`,
      [auctionId]
    );

    const playerPool: AuctionPlayer[] = [];
    for (const playerRow of playersResult.rows) {
      // Get bids for this player
      const bidsResult = await pool.query(
        `SELECT * FROM auction_bids 
         WHERE auction_id = $1 AND player_id = $2
         ORDER BY timestamp DESC`,
        [auctionId, playerRow.player_id]
      );

      const bids: Bid[] = bidsResult.rows.map((bidRow: any) => ({
        id: bidRow.id,
        auctionId: bidRow.auction_id,
        playerId: bidRow.player_id,
        teamId: bidRow.team_id,
        amount: parseFloat(bidRow.amount),
        timestamp: bidRow.timestamp,
      }));

      playerPool.push({
        playerId: playerRow.player_id,
        basePrice: parseFloat(playerRow.base_price),
        currentBid: playerRow.current_bid
          ? parseFloat(playerRow.current_bid)
          : parseFloat(playerRow.base_price),
        currentBidder: playerRow.current_bidder_id,
        status: playerRow.status as PlayerAuctionStatus,
        bids,
      });
    }

    // Get team budgets from Redis
    const teamsResult = await pool.query(
      `SELECT team_id FROM tournament_registrations 
       WHERE tournament_id = $1 AND status = 'CONFIRMED'`,
      [auctionRow.tournament_id]
    );

    const teamBudgets: TeamBudget[] = [];
    for (const teamRow of teamsResult.rows) {
      const budgetData = await redisClient.hGetAll(
        `auction:${auctionId}:budget:${teamRow.team_id}`
      );

      if (budgetData && Object.keys(budgetData).length > 0) {
        teamBudgets.push({
          teamId: teamRow.team_id,
          totalBudget: parseFloat(budgetData.totalBudget || '0'),
          remainingBudget: parseFloat(budgetData.remainingBudget || '0'),
          playersAcquired: parseInt(budgetData.playersAcquired || '0', 10),
        });
      }
    }

    // Get auction results
    const resultsResult = await pool.query(
      'SELECT * FROM auction_results WHERE auction_id = $1',
      [auctionId]
    );

    const results: AuctionResult[] = resultsResult.rows.map((row: any) => ({
      playerId: row.player_id,
      teamId: row.team_id,
      finalPrice: parseFloat(row.final_price),
      totalBids: row.total_bids,
    }));

    return {
      id: auctionRow.id,
      tournamentId: auctionRow.tournament_id,
      status: auctionRow.status as AuctionStatus,
      config: {
        teamBudget: parseFloat(auctionRow.team_budget),
        minSquadSize: auctionRow.min_squad_size,
        maxSquadSize: auctionRow.max_squad_size,
        bidIncrement: parseFloat(auctionRow.bid_increment),
        bidTimeout: auctionRow.bid_timeout,
      },
      playerPool,
      teamBudgets,
      currentPlayerIndex: auctionRow.current_player_index,
      results,
      createdAt: auctionRow.created_at,
    };
  }

  /**
   * Get auction by tournament ID
   */
  async getAuctionByTournament(
    tournamentId: string
  ): Promise<Auction | null> {
    const result = await pool.query(
      'SELECT id FROM auctions WHERE tournament_id = $1',
      [tournamentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.getAuction(result.rows[0].id);
  }

  /**
   * Start the auction
   */
  async startAuction(auctionId: string): Promise<Auction> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update auction status
      const result = await client.query(
        `UPDATE auctions SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND status = $3
         RETURNING *`,
        [AuctionStatus.IN_PROGRESS, auctionId, AuctionStatus.SETUP]
      );

      if (result.rowCount === 0) {
        throw new Error('Auction not found or already started');
      }

      // Set first player to BIDDING status
      await client.query(
        `UPDATE auction_players 
         SET status = $1
         WHERE auction_id = $2 AND status = $3
         ORDER BY created_at
         LIMIT 1`,
        [PlayerAuctionStatus.BIDDING, auctionId, PlayerAuctionStatus.PENDING]
      );

      await client.query('COMMIT');

      const auction = await this.getAuction(auctionId);
      if (!auction) {
        throw new Error('Failed to retrieve auction after starting');
      }

      return auction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Place a bid on a player
   */
  async placeBid(
    auctionId: string,
    playerId: string,
    teamId: string,
    amount: number
  ): Promise<Bid> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get auction config
      const auctionResult = await client.query(
        'SELECT * FROM auctions WHERE id = $1',
        [auctionId]
      );

      if (auctionResult.rows.length === 0) {
        throw new Error('Auction not found');
      }

      const auction = auctionResult.rows[0];

      if (auction.status !== AuctionStatus.IN_PROGRESS) {
        throw new Error('Auction is not in progress');
      }

      // Get player info
      const playerResult = await client.query(
        `SELECT * FROM auction_players 
         WHERE auction_id = $1 AND player_id = $2`,
        [auctionId, playerId]
      );

      if (playerResult.rows.length === 0) {
        throw new Error('Player not found in auction');
      }

      const player = playerResult.rows[0];

      if (player.status !== PlayerAuctionStatus.BIDDING) {
        throw new Error('Player is not currently up for bidding');
      }

      // Validate bid amount
      const currentBid = player.current_bid
        ? parseFloat(player.current_bid)
        : parseFloat(player.base_price);
      const bidIncrement = parseFloat(auction.bid_increment);

      if (amount < currentBid + bidIncrement) {
        throw new Error(
          `Bid must be at least ${currentBid + bidIncrement}`
        );
      }

      // Check team budget in Redis
      const budgetData = await redisClient.hGetAll(
        `auction:${auctionId}:budget:${teamId}`
      );

      if (!budgetData || Object.keys(budgetData).length === 0) {
        throw new Error('Team not found in auction');
      }

      const remainingBudget = parseFloat(budgetData.remainingBudget || '0');

      if (amount > remainingBudget) {
        throw new Error('Insufficient budget');
      }

      // Check squad size
      const playersAcquired = parseInt(budgetData.playersAcquired || '0', 10);
      const maxSquadSize = auction.max_squad_size;

      if (playersAcquired >= maxSquadSize) {
        throw new Error('Maximum squad size reached');
      }

      // Insert bid
      const bidResult = await client.query(
        `INSERT INTO auction_bids (auction_id, player_id, team_id, amount)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [auctionId, playerId, teamId, amount]
      );

      const bid = bidResult.rows[0];

      // Update player's current bid
      await client.query(
        `UPDATE auction_players 
         SET current_bid = $1, current_bidder_id = $2
         WHERE auction_id = $3 AND player_id = $4`,
        [amount, teamId, auctionId, playerId]
      );

      await client.query('COMMIT');

      // Broadcast bid to all auction participants
      await this.broadcastBid(auctionId, {
        id: bid.id,
        auctionId: bid.auction_id,
        playerId: bid.player_id,
        teamId: bid.team_id,
        amount: parseFloat(bid.amount),
        timestamp: bid.timestamp,
      });

      return {
        id: bid.id,
        auctionId: bid.auction_id,
        playerId: bid.player_id,
        teamId: bid.team_id,
        amount: parseFloat(bid.amount),
        timestamp: bid.timestamp,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current player being auctioned
   */
  async getCurrentPlayer(auctionId: string): Promise<AuctionPlayer | null> {
    const result = await pool.query(
      `SELECT ap.*, 
        (SELECT COUNT(*) FROM auction_bids WHERE player_id = ap.player_id AND auction_id = ap.auction_id) as bid_count
       FROM auction_players ap
       WHERE ap.auction_id = $1 AND ap.status = $2
       LIMIT 1`,
      [auctionId, PlayerAuctionStatus.BIDDING]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const playerRow = result.rows[0];

    // Get bids for this player
    const bidsResult = await pool.query(
      `SELECT * FROM auction_bids 
       WHERE auction_id = $1 AND player_id = $2
       ORDER BY timestamp DESC`,
      [auctionId, playerRow.player_id]
    );

    const bids: Bid[] = bidsResult.rows.map((bidRow: any) => ({
      id: bidRow.id,
      auctionId: bidRow.auction_id,
      playerId: bidRow.player_id,
      teamId: bidRow.team_id,
      amount: parseFloat(bidRow.amount),
      timestamp: bidRow.timestamp,
    }));

    return {
      playerId: playerRow.player_id,
      basePrice: parseFloat(playerRow.base_price),
      currentBid: playerRow.current_bid
        ? parseFloat(playerRow.current_bid)
        : parseFloat(playerRow.base_price),
      currentBidder: playerRow.current_bidder_id,
      status: playerRow.status as PlayerAuctionStatus,
      bids,
    };
  }

  /**
   * Get team budget
   */
  async getTeamBudget(
    auctionId: string,
    teamId: string
  ): Promise<TeamBudget | null> {
    const budgetData = await redisClient.hGetAll(
      `auction:${auctionId}:budget:${teamId}`
    );

    if (!budgetData || Object.keys(budgetData).length === 0) {
      return null;
    }

    return {
      teamId,
      totalBudget: parseFloat(budgetData.totalBudget || '0'),
      remainingBudget: parseFloat(budgetData.remainingBudget || '0'),
      playersAcquired: parseInt(budgetData.playersAcquired || '0', 10),
    };
  }

  /**
   * Broadcast bid to all auction participants
   * Requirements: 21.5
   */
  private async broadcastBid(auctionId: string, bid: Bid): Promise<void> {
    const event: AuctionEvent = {
      type: 'BID_PLACED',
      data: bid,
      timestamp: new Date(),
    };

    await websocketService.publishAuctionUpdate(
      auctionId,
      'auction:bid',
      event
    );
  }

  /**
   * Broadcast player sold event
   * Requirements: 21.5
   */
  async broadcastPlayerSold(
    auctionId: string,
    playerId: string,
    teamId: string,
    finalPrice: number
  ): Promise<void> {
    const event: AuctionEvent = {
      type: 'PLAYER_SOLD',
      data: { playerId, teamId, finalPrice },
      timestamp: new Date(),
    };

    await websocketService.publishAuctionUpdate(
      auctionId,
      'auction:player-sold',
      event
    );
  }

  /**
   * Broadcast player unsold event
   * Requirements: 21.5
   */
  async broadcastPlayerUnsold(
    auctionId: string,
    playerId: string
  ): Promise<void> {
    const event: AuctionEvent = {
      type: 'PLAYER_UNSOLD',
      data: { playerId },
      timestamp: new Date(),
    };

    await websocketService.publishAuctionUpdate(
      auctionId,
      'auction:player-unsold',
      event
    );
  }

  /**
   * Broadcast next player event
   * Requirements: 21.5
   */
  async broadcastNextPlayer(
    auctionId: string,
    player: AuctionPlayer
  ): Promise<void> {
    const event: AuctionEvent = {
      type: 'NEXT_PLAYER',
      data: player,
      timestamp: new Date(),
    };

    await websocketService.publishAuctionUpdate(
      auctionId,
      'auction:next-player',
      event
    );
  }

  /**
   * Move to next player in auction
   * Requirements: 21.6
   */
  async nextPlayer(auctionId: string): Promise<AuctionPlayer | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current player
      const currentPlayerResult = await client.query(
        `SELECT * FROM auction_players 
         WHERE auction_id = $1 AND status = $2`,
        [auctionId, PlayerAuctionStatus.BIDDING]
      );

      if (currentPlayerResult.rows.length > 0) {
        const currentPlayer = currentPlayerResult.rows[0];

        // Finalize current player
        if (currentPlayer.current_bidder_id) {
          // Player was sold
          await this.finalizePlayerSale(
            client,
            auctionId,
            currentPlayer.player_id,
            currentPlayer.current_bidder_id,
            parseFloat(currentPlayer.current_bid)
          );

          await client.query(
            `UPDATE auction_players 
             SET status = $1
             WHERE auction_id = $2 AND player_id = $3`,
            [PlayerAuctionStatus.SOLD, auctionId, currentPlayer.player_id]
          );

          // Broadcast player sold
          await this.broadcastPlayerSold(
            auctionId,
            currentPlayer.player_id,
            currentPlayer.current_bidder_id,
            parseFloat(currentPlayer.current_bid)
          );
        } else {
          // Player was unsold
          await client.query(
            `UPDATE auction_players 
             SET status = $1
             WHERE auction_id = $2 AND player_id = $3`,
            [PlayerAuctionStatus.UNSOLD, auctionId, currentPlayer.player_id]
          );

          // Broadcast player unsold
          await this.broadcastPlayerUnsold(auctionId, currentPlayer.player_id);
        }
      }

      // Get next pending player
      const nextPlayerResult = await client.query(
        `SELECT * FROM auction_players 
         WHERE auction_id = $1 AND status = $2
         ORDER BY created_at
         LIMIT 1`,
        [auctionId, PlayerAuctionStatus.PENDING]
      );

      if (nextPlayerResult.rows.length === 0) {
        // No more players - complete auction
        await this.completeAuction(client, auctionId);
        await client.query('COMMIT');
        return null;
      }

      const nextPlayer = nextPlayerResult.rows[0];

      // Set next player to BIDDING
      await client.query(
        `UPDATE auction_players 
         SET status = $1
         WHERE auction_id = $2 AND player_id = $3`,
        [PlayerAuctionStatus.BIDDING, auctionId, nextPlayer.player_id]
      );

      // Increment current player index
      await client.query(
        `UPDATE auctions 
         SET current_player_index = current_player_index + 1
         WHERE id = $1`,
        [auctionId]
      );

      await client.query('COMMIT');

      // Get full player data with bids
      const player = await this.getCurrentPlayer(auctionId);

      if (player) {
        // Broadcast next player
        await this.broadcastNextPlayer(auctionId, player);
      }

      return player;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finalize player sale - update team roster and budget
   * Requirements: 21.6, 21.7, 21.9
   */
  private async finalizePlayerSale(
    client: any,
    auctionId: string,
    playerId: string,
    teamId: string,
    finalPrice: number
  ): Promise<void> {
    // Get auction info
    const auctionResult = await client.query(
      'SELECT * FROM auctions WHERE id = $1',
      [auctionId]
    );
    const auction = auctionResult.rows[0];

    // Add player to team roster
    await client.query(
      `INSERT INTO team_rosters (team_id, player_id)
       VALUES ($1, $2)
       ON CONFLICT (team_id, player_id) DO NOTHING`,
      [teamId, playerId]
    );

    // Update team budget in Redis
    const budgetData = await redisClient.hGetAll(
      `auction:${auctionId}:budget:${teamId}`
    );

    const remainingBudget = parseFloat(budgetData.remainingBudget || '0');
    const playersAcquired = parseInt(budgetData.playersAcquired || '0', 10);

    await redisClient.hSet(`auction:${auctionId}:budget:${teamId}`, {
      totalBudget: budgetData.totalBudget,
      remainingBudget: (remainingBudget - finalPrice).toString(),
      playersAcquired: (playersAcquired + 1).toString(),
    });

    // Check squad size enforcement
    if (playersAcquired + 1 > auction.max_squad_size) {
      throw new Error('Maximum squad size exceeded');
    }

    // Get bid count
    const bidCountResult = await client.query(
      `SELECT COUNT(*) as count FROM auction_bids 
       WHERE auction_id = $1 AND player_id = $2`,
      [auctionId, playerId]
    );

    const totalBids = parseInt(bidCountResult.rows[0].count, 10);

    // Store auction result
    await client.query(
      `INSERT INTO auction_results (auction_id, player_id, team_id, final_price, total_bids)
       VALUES ($1, $2, $3, $4, $5)`,
      [auctionId, playerId, teamId, finalPrice, totalBids]
    );

    // Send notification to player
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data, channels)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        playerId,
        'AUCTION_WON',
        'You have been sold in auction!',
        `You have been acquired by a team for ${finalPrice}`,
        JSON.stringify({ auctionId, teamId, finalPrice }),
        ['IN_APP', 'EMAIL'],
      ]
    );

    // Send notification to team
    const teamResult = await client.query(
      'SELECT host_id FROM teams WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length > 0) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data, channels)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          teamResult.rows[0].host_id,
          'AUCTION_WON',
          'Player acquired in auction!',
          `You have successfully acquired a player for ${finalPrice}`,
          JSON.stringify({ auctionId, playerId, finalPrice }),
          ['IN_APP', 'EMAIL'],
        ]
      );
    }
  }

  /**
   * Complete auction
   * Requirements: 21.9, 21.10
   */
  private async completeAuction(client: any, auctionId: string): Promise<void> {
    // Get auction info
    const auctionResult = await client.query(
      'SELECT * FROM auctions WHERE id = $1',
      [auctionId]
    );
    const auction = auctionResult.rows[0];

    // Validate all teams meet minimum squad size
    const teamsResult = await client.query(
      `SELECT team_id FROM tournament_registrations 
       WHERE tournament_id = $1 AND status = 'CONFIRMED'`,
      [auction.tournament_id]
    );

    for (const teamRow of teamsResult.rows) {
      const budgetData = await redisClient.hGetAll(
        `auction:${auctionId}:budget:${teamRow.team_id}`
      );

      const playersAcquired = parseInt(budgetData.playersAcquired || '0', 10);

      if (playersAcquired < auction.min_squad_size) {
        throw new Error(
          `Team ${teamRow.team_id} has not met minimum squad size requirement`
        );
      }
    }

    // Update auction status
    await client.query(
      `UPDATE auctions SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [AuctionStatus.COMPLETED, auctionId]
    );
  }

  /**
   * Get auction results
   * Requirements: 21.12
   */
  async getAuctionResults(auctionId: string): Promise<AuctionResult[]> {
    const result = await pool.query(
      'SELECT * FROM auction_results WHERE auction_id = $1 ORDER BY final_price DESC',
      [auctionId]
    );

    return result.rows.map((row: any) => ({
      playerId: row.player_id,
      teamId: row.team_id,
      finalPrice: parseFloat(row.final_price),
      totalBids: row.total_bids,
    }));
  }
}

export const auctionService = new AuctionService();
