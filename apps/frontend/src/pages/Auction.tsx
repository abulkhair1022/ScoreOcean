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
  const [placingBid, setPlacingBid] = useState(false);

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
      setTeamBudgets((prev) =>
        prev.map((budget) =>
          budget.teamId === data.data.teamId
            ? { ...budget, remainingBudget: budget.remainingBudget - data.data.amount }
            : budget
        )
      );
    } else if (data.type === 'PLAYER_SOLD' || data.type === 'PLAYER_UNSOLD') {
      setTimeout(() => { fetchAuction(); }, 2000);
    } else if (data.type === 'NEXT_PLAYER') {
      setCurrentPlayer(data.data);
      setBidAmount(data.data.basePrice);
    }
  };

  const handlePlaceBid = async () => {
    if (!currentPlayer || !selectedTeamId) return;
    try {
      setPlacingBid(true);
      await apiClient.post(`/auctions/${auctionId}/bid`, {
        playerId: currentPlayer.playerId,
        teamId: selectedTeamId,
        amount: bidAmount,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place bid');
    } finally {
      setPlacingBid(false);
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
            <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading auction...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!auction) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">Auction not found</p>
        </div>
      </Layout>
    );
  }

  const isInProgress = auction.status === 'IN_PROGRESS';
  const isCompleted = auction.status === 'COMPLETED';

  return (
    <Layout>
      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="flex-1 text-sm font-medium">{error}</p>
          <button onClick={() => setError('')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Auction Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 p-6 sm:p-8 mb-6 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-purple-500 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-500 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Player Auction</h2>
                {isInProgress && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-bold uppercase tracking-wider border border-red-500/30">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
                {isCompleted && (
                  <span className="px-3 py-1 bg-white/10 text-white/70 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20">
                    COMPLETED
                  </span>
                )}
              </div>
              <p className="text-indigo-300">{auction.tournament?.name}</p>
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Players Sold</span>
              <p className="text-xl font-bold text-white">{auction.results?.length || 0} <span className="text-white/40 text-sm font-normal">/ {auction.playerPool?.length || 0}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Team Budget', value: `₹${auction.config.teamBudget.toLocaleString()}` },
              { label: 'Squad Size', value: `${auction.config.minSquadSize}–${auction.config.maxSquadSize}` },
              { label: 'Bid Increment', value: `₹${auction.config.bidIncrement.toLocaleString()}` },
              { label: 'Status', value: auction.status },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                <span className="text-xs text-indigo-300 font-medium">{stat.label}</span>
                <p className="text-sm font-bold text-white mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Current Player + Bidding */}
        {isInProgress && currentPlayer ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Player Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Now Up</p>
                      <h3 className="text-xl font-bold text-gray-900">{currentPlayer.player?.name}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{currentPlayer.player?.sport}</p>
                    </div>
                    {currentPlayer.currentBidder && (
                      <div className="text-right bg-white rounded-xl px-3 py-2 border border-amber-200">
                        <p className="text-xs text-gray-500">Leading Bid</p>
                        <p className="text-sm font-bold text-amber-600">{currentPlayer.currentBidder.name}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white rounded-xl p-3 border border-amber-100 text-center">
                      <span className="text-xs text-gray-500">Base Price</span>
                      <p className="text-lg font-bold text-gray-900">₹{currentPlayer.basePrice?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-amber-100 text-center">
                      <span className="text-xs text-gray-500">Current Bid</span>
                      <p className="text-lg font-bold text-amber-600">₹{currentPlayer.currentBid?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bidding Interface */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Place Your Bid
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Team</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Choose team...</option>
                    {teamBudgets.map((budget) => (
                      <option key={budget.teamId} value={budget.teamId}>
                        {budget.team?.name} (₹{budget.remainingBudget?.toLocaleString()} left)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bid Amount (₹)</label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                    step={auction.config.bidIncrement}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePlaceBid}
                  disabled={!selectedTeamId || bidAmount <= currentPlayer.currentBid || placingBid}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-sm"
                >
                  {placingBid ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {placingBid ? 'Placing...' : 'Place Bid'}
                </button>
                <button
                  onClick={handleNextPlayer}
                  className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Skip
                </button>
              </div>
            </div>

            {/* Bid History */}
            {currentPlayer.bids && currentPlayer.bids.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h4 className="font-bold text-gray-900 mb-4">Bid History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {currentPlayer.bids.slice().reverse().map((bid: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors">
                      <span className="text-sm text-gray-700 font-medium">{bid.team?.name}</span>
                      <span className="text-sm font-bold text-indigo-600">₹{bid.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            {isCompleted ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Auction Completed</h3>
                <p className="text-gray-500 text-sm">All players have been auctioned</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Auction Not Started</h3>
                <p className="text-gray-500 text-sm">Waiting for auction to begin</p>
              </>
            )}
          </div>
        )}

        {/* Team Budgets Sidebar */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Team Budgets
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {teamBudgets.map((budget) => {
              const spentPct = budget.totalBudget > 0
                ? ((budget.totalBudget - budget.remainingBudget) / budget.totalBudget) * 100
                : 0;
              return (
                <div key={budget.teamId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{budget.team?.name}</h4>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                      {budget.playersAcquired} players
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between text-gray-500">
                      <span>Total</span>
                      <span className="font-medium text-gray-700">₹{budget.totalBudget?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Remaining</span>
                      <span className="font-semibold text-green-600">₹{budget.remainingBudget?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(spentPct)}% spent</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auction Results */}
      {auction.results && auction.results.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Auction Results
            </h3>
            <span className="text-sm text-gray-500">{auction.results.length} sold</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wide">Player</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Team</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Final Price</th>
                  <th className="text-center py-3 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wide">Bids</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auction.results.map((result: any) => (
                  <tr key={result.playerId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-gray-900">{result.player?.name}</td>
                    <td className="py-3.5 px-4 text-gray-700">{result.team?.name}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-indigo-600">
                      ₹{result.finalPrice?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 text-center text-gray-500">{result.totalBids}</td>
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
