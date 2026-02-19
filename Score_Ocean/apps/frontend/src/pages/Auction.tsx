import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import socketService from '../services/socket';
import Layout from '../components/Layout';

function Auction() {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState<any>(null);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [teamBudgets, setTeamBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidAmount, setBidAmount] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  useEffect(() => {
    if (!auctionId) {
      navigate('/tournaments');
      return;
    }

    fetchAuction();
    
    // Subscribe to real-time auction updates
    socketService.connect();
    socketService.subscribeToAuction(auctionId, handleAuctionUpdate);

    return () => {
      socketService.unsubscribeFromAuction(auctionId);
    };
  }, [auctionId, navigate]);

  const fetchAuction = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/auctions/${auctionId}`);
      setAuction(response.data);
      setTeamBudgets(response.data.teamBudgets || []);
      
      // Get current player
      if (response.data.status === 'IN_PROGRESS') {
        const currentPlayerResponse = await apiClient.get(`/auctions/${auctionId}/current-player`);
        setCurrentPlayer(currentPlayerResponse.data);
        setBidAmount(currentPlayerResponse.data.currentBid + response.data.config.bidIncrement);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  };

  const handleAuctionUpdate = (data: any) => {
    if (data.type === 'BID_PLACED') {
      setCurrentPlayer((prev: any) => ({
        ...prev,
        currentBid: data.data.amount,
        currentBidder: data.data.teamId,
        bids: [...(prev?.bids || []), data.data],
      }));
      setBidAmount(data.data.amount + auction.config.bidIncrement);
      
      // Update team budgets
      setTeamBudgets((prev) =>
        prev.map((budget) =>
          budget.teamId === data.data.teamId
            ? { ...budget, remainingBudget: budget.remainingBudget - data.data.amount }
            : budget
        )
      );
    } else if (data.type === 'PLAYER_SOLD' || data.type === 'PLAYER_UNSOLD') {
      // Move to next player
      setTimeout(() => {
        fetchAuction();
      }, 2000);
    } else if (data.type === 'NEXT_PLAYER') {
      setCurrentPlayer(data.data);
      setBidAmount(data.data.basePrice);
    }
  };

  const handlePlaceBid = async () => {
    if (!currentPlayer || !selectedTeamId) return;
    
    try {
      await apiClient.post(`/auctions/${auctionId}/bid`, {
        playerId: currentPlayer.playerId,
        teamId: selectedTeamId,
        amount: bidAmount,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place bid');
    }
  };

  const handleNextPlayer = async () => {
    try {
      await apiClient.post(`/auctions/${auctionId}/next-player`);
      fetchAuction();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to move to next player');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading auction...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!auction) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Auction not found</p>
        </div>
      </Layout>
    );
  }

  const isInProgress = auction.status === 'IN_PROGRESS';
  const isCompleted = auction.status === 'COMPLETED';

  return (
    <Layout>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-700 hover:text-red-900">×</button>
        </div>
      )}

      {/* Auction Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Player Auction</h2>
            <p className="text-gray-600">Tournament: {auction.tournament?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {isInProgress && (
              <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
            {isCompleted && (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                COMPLETED
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Team Budget:</span>
            <p className="font-medium text-gray-900">₹{auction.config.teamBudget.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-600">Squad Size:</span>
            <p className="font-medium text-gray-900">{auction.config.minSquadSize} - {auction.config.maxSquadSize}</p>
          </div>
          <div>
            <span className="text-gray-600">Bid Increment:</span>
            <p className="font-medium text-gray-900">₹{auction.config.bidIncrement.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-600">Players Sold:</span>
            <p className="font-medium text-gray-900">{auction.results?.length || 0} / {auction.playerPool?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Current Player */}
      {isInProgress && currentPlayer && (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg shadow-md p-8 mb-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Current Player</h3>
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900">{currentPlayer.player?.name}</h4>
            <p className="text-gray-600">{currentPlayer.player?.sport}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <span className="text-sm text-gray-600">Base Price</span>
              <p className="text-2xl font-bold text-gray-900">₹{currentPlayer.basePrice.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <span className="text-sm text-gray-600">Current Bid</span>
              <p className="text-2xl font-bold text-primary-600">₹{currentPlayer.currentBid.toLocaleString()}</p>
            </div>
          </div>

          {currentPlayer.currentBidder && (
            <div className="bg-white rounded-lg p-4 mb-6 text-center">
              <span className="text-sm text-gray-600">Current Bidder</span>
              <p className="text-lg font-semibold text-gray-900">{currentPlayer.currentBidder.name}</p>
            </div>
          )}

          {/* Bidding Interface */}
          <div className="bg-white rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Place Your Bid</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Team</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select team</option>
                  {teamBudgets.map((budget) => (
                    <option key={budget.teamId} value={budget.teamId}>
                      {budget.team?.name} (₹{budget.remainingBudget.toLocaleString()} left)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bid Amount</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                  step={auction.config.bidIncrement}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePlaceBid}
                disabled={!selectedTeamId || bidAmount <= currentPlayer.currentBid}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 transition-colors font-semibold"
              >
                Place Bid
              </button>
              <button
                onClick={handleNextPlayer}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>

          {/* Bid History */}
          {currentPlayer.bids && currentPlayer.bids.length > 0 && (
            <div className="mt-6 bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Bid History</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {currentPlayer.bids.slice().reverse().map((bid: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{bid.team?.name}</span>
                    <span className="font-medium text-gray-900">₹{bid.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Budgets */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Budgets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamBudgets.map((budget) => (
            <div key={budget.teamId} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{budget.team?.name}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Budget:</span>
                  <span className="font-medium">₹{budget.totalBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium text-green-600">₹{budget.remainingBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Players:</span>
                  <span className="font-medium">{budget.playersAcquired}</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${(budget.remainingBudget / budget.totalBudget) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auction Results */}
      {auction.results && auction.results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Auction Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Player</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Team</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-900">Final Price</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Total Bids</th>
                </tr>
              </thead>
              <tbody>
                {auction.results.map((result: any) => (
                  <tr key={result.playerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 text-gray-900">{result.player?.name}</td>
                    <td className="py-3 px-2 text-gray-900">{result.team?.name}</td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900">
                      ₹{result.finalPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center text-gray-600">{result.totalBids}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Auction;
