import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/client';
import socketService from '../services/socket';
import Navbar from '../components/Layout/Navbar';

// ── Role badges ───────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; icon: string }> = {
  BATSMAN:       { label: 'Batsman',       color: 'bg-emerald-100 text-emerald-700', icon: '🏏' },
  BOWLER:        { label: 'Bowler',        color: 'bg-blue-100 text-blue-700',       icon: '⚾' },
  ALL_ROUNDER:   { label: 'All-Rounder',   color: 'bg-violet-100 text-violet-700',   icon: '⚡' },
  WICKET_KEEPER: { label: 'Wicket Keeper', color: 'bg-amber-100 text-amber-700',     icon: '🧤' },
  GOALKEEPER:    { label: 'Goalkeeper',    color: 'bg-yellow-100 text-yellow-700',   icon: '🧤' },
  DEFENDER:      { label: 'Defender',      color: 'bg-blue-100 text-blue-700',       icon: '🛡️' },
  MIDFIELDER:    { label: 'Midfielder',    color: 'bg-violet-100 text-violet-700',   icon: '⚡' },
  FORWARD:       { label: 'Forward',       color: 'bg-red-100 text-red-700',         icon: '🎯' },
  UNKNOWN:       { label: 'Player',        color: 'bg-gray-100 text-gray-700',       icon: '👤' },
};

function fmt(n: any) { return Number(n || 0).toLocaleString('en-IN'); }

// ─────────────────────────────────────────────────────────────────────────────
// SOLD ANIMATION OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
function SoldOverlay({ data, onDone }: { data: any; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="relative flex flex-col items-center gap-4 animate-sold-pop">
        {/* Hammer */}
        <div className="text-7xl select-none animate-bounce">🔨</div>
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-3xl px-10 py-6 shadow-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">SOLD!</p>
          <p className="text-2xl font-black">{data.playerName}</p>
          <p className="text-lg font-semibold mt-1">→ {data.teamName}</p>
          <p className="text-3xl font-black mt-2">{fmt(data.finalPrice)} pts</p>
        </div>
        {/* Confetti dots */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute w-3 h-3 rounded-full animate-confetti"
            style={{
              background: ['#f59e0b','#10b981','#6366f1','#ef4444','#3b82f6'][i % 5],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
            }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER CARD
// ─────────────────────────────────────────────────────────────────────────────
function PlayerCard({ player, isHost, myLeagueTeam, onBid, onSell, onUnsold }: {
  player: any; isHost: boolean; myLeagueTeam: any;
  onBid: (amount: number) => void; onSell: () => void; onUnsold: () => void;
}) {
  const minBid = (player.currentBid || 0) + 1;
  const [bidAmount, setBidAmount] = useState(minBid);
  const roleMeta = ROLE_META[player.role?.toUpperCase?.()] || ROLE_META.UNKNOWN;

  useEffect(() => {
    setBidAmount((player.currentBid || 0) + 1);
  }, [player.currentBid]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white shadow-2xl">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-purple-400 -translate-y-1/3 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-400 translate-y-1/3 -translate-x-1/3 blur-3xl" />
      </div>

      <div className="relative z-10 p-6">
        {/* LIVE badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-bold uppercase tracking-wider border border-red-500/30">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            LIVE AUCTION
          </span>
          {player.round === 2 && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30">
              ROUND 2
            </span>
          )}
        </div>

        {/* Player info */}
        <div className="flex items-start gap-5 mb-6">
          <div className="relative flex-shrink-0">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.playerName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white/20 shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-4xl">
                {roleMeta.icon}
              </div>
            )}
            <span className={`absolute -bottom-2 -right-2 text-xs px-2 py-0.5 rounded-full font-bold ${roleMeta.color}`}>
              {roleMeta.label}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black truncate">{player.playerName}</h2>
            <p className="text-indigo-300 text-sm mt-0.5">
              {[player.city, player.state].filter(Boolean).join(', ') || 'Location not set'}
            </p>
            {player.age && <p className="text-indigo-300 text-xs mt-0.5">Age: {player.age}</p>}

            {/* Stats row */}
            <div className="flex flex-wrap gap-2 mt-3">
              {player.stats?.runs > 0 && (
                <span className="bg-white/10 backdrop-blur rounded-lg px-2 py-1 text-xs font-semibold">
                  🏏 {player.stats.runs} Runs
                </span>
              )}
              {player.stats?.wickets > 0 && (
                <span className="bg-white/10 backdrop-blur rounded-lg px-2 py-1 text-xs font-semibold">
                  ⚾ {player.stats.wickets} Wkts
                </span>
              )}
              {player.stats?.battingAverage > 0 && (
                <span className="bg-white/10 backdrop-blur rounded-lg px-2 py-1 text-xs font-semibold">
                  Avg: {Number(player.stats.battingAverage).toFixed(1)}
                </span>
              )}
              {player.stats?.strikeRate > 0 && (
                <span className="bg-white/10 backdrop-blur rounded-lg px-2 py-1 text-xs font-semibold">
                  SR: {Number(player.stats.strikeRate).toFixed(1)}
                </span>
              )}
              {player.stats?.matchesPlayed > 0 && (
                <span className="bg-white/10 backdrop-blur rounded-lg px-2 py-1 text-xs font-semibold">
                  {player.stats.matchesPlayed} Matches
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bid info */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-xs text-indigo-300 font-medium">Base Price</p>
            <p className="text-xl font-black">{fmt(player.basePrice)}</p>
          </div>
          <div className="bg-amber-400/20 border border-amber-400/30 rounded-2xl p-3 text-center">
            <p className="text-xs text-amber-300 font-medium">Current Bid</p>
            <p className="text-xl font-black text-amber-300">{fmt(player.currentBid)}</p>
            {player.currentBidderName && (
              <p className="text-xs text-amber-200 mt-0.5 truncate">{player.currentBidderName}</p>
            )}
          </div>
        </div>

        {/* Bidding controls */}
        {myLeagueTeam && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-indigo-300 font-medium">Your bid (min: {minBid})</label>
              <div className="flex gap-2">
                <button onClick={() => setBidAmount((a: number) => Math.max(minBid, a - 100))}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-lg flex items-center justify-center transition-colors flex-shrink-0">−</button>
                <input type="number" value={bidAmount}
                  min={minBid}
                  onChange={e => setBidAmount(parseInt(e.target.value) || minBid)}
                  className="flex-1 bg-white/10 rounded-xl px-4 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-amber-400 border border-white/20" />
                <button onClick={() => setBidAmount((a: number) => a + 100)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-lg flex items-center justify-center transition-colors flex-shrink-0">+</button>
              </div>
              {bidAmount <= (player.currentBid || 0) && (
                <p className="text-xs text-red-300">↑ Must be higher than current bid of {player.currentBid}</p>
              )}
            </div>
            <button
              onClick={() => onBid(bidAmount)}
              disabled={bidAmount <= (player.currentBid || 0)}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black text-lg shadow-lg hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              🔨 BID {fmt(bidAmount)}
            </button>
          </div>
        )}

        {/* Host controls */}
        {isHost && (
          <div className="flex gap-2 mt-3">
            <button onClick={onSell}
              disabled={!player.currentBidderId}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 rounded-xl font-bold transition-colors">
              ✅ Sell
            </button>
            <button onClick={onUnsold}
              className="flex-1 py-2.5 bg-rose-500/80 hover:bg-rose-600 rounded-xl font-bold transition-colors">
              ❌ Unsold
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LeagueAuction() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'auction' | 'teams' | 'players' | 'results' | 'fixtures'>('auction');
  const [soldAnim, setSoldAnim] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Host-only state
  const [teamSearch, setTeamSearch] = useState('');
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerResults, setPlayerResults] = useState<any[]>([]);
  const [registerBasePrice, setRegisterBasePrice] = useState(100);
  const [importMsg, setImportMsg] = useState('');

  const socketRef = useRef<any>(null);

  // Derive current user's league team & host status
  const isHost = !!(auction && user &&
    (auction.hostUserId === user.id || auction.hostId === user.id));
  const myLeagueTeam = auction?.leagueTeams?.find((t: any) => t.host_user_id === user?.id);

  // Role order state (for host setup)
  const [roleOrder, setRoleOrder] = useState(['BATSMAN', 'WICKET_KEEPER', 'ALL_ROUNDER', 'BOWLER']);
  const moveRole = (i: number, dir: -1 | 1) => {
    const next = [...roleOrder];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setRoleOrder(next);
  };
  const ROLE_ICON: Record<string, string> = { BATSMAN: '🏏', WICKET_KEEPER: '🧤', ALL_ROUNDER: '⚡', BOWLER: '⚾' };

  // ── Fetch full auction state ──────────────────────────────────────────────
  const fetchAuction = useCallback(async () => {
    if (!auctionId) return;
    try {
      const r = await apiClient.get(`/league-auctions/${auctionId}`);
      setAuction(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Failed to load auction');
    }
  }, [auctionId]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (!stored || !token) { navigate('/login'); return; }
    const parsed = JSON.parse(stored);
    setUser(parsed);

    (async () => {
      setLoading(true);
      await fetchAuction();
      setLoading(false);
    })();
  }, [navigate, fetchAuction]);

  // ── Socket subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!auctionId) return;
    const socket = socketService.connect();
    socketRef.current = socket;
    socket.emit('subscribe:auction', { auctionId });

    const onBid = (data: any) => {
      setAuction((prev: any) => {
        if (!prev?.currentPlayer) return prev;
        const bids = [data.data, ...(prev.currentPlayer.bids || [])];
        return {
          ...prev,
          currentPlayer: {
            ...prev.currentPlayer,
            currentBid: data.data.amount,
            currentBidderId: data.data.leagueTeamId,
            currentBidderName: data.data.teamName,
            bids,
          },
          leagueTeams: prev.leagueTeams?.map((t: any) =>
            t.id === data.data.leagueTeamId
              ? { ...t, remaining_budget: t.remaining_budget - 0 } // server handles deduction on sell
              : t
          ),
        };
      });
    };

    const onNextPlayer = (data: any) => {
      setAuction((prev: any) => prev ? { ...prev, currentPlayer: data.data } : prev);
    };

    const onSold = (data: any) => {
      setSoldAnim(data.data);
      setTimeout(() => fetchAuction(), 3600);
    };

    const onUnsold = () => {
      setTimeout(() => fetchAuction(), 800);
    };

    const onCompleted = () => {
      fetchAuction();
      setActiveTab('results');
    };

    const onFixtures = () => {
      fetchAuction();
      setActiveTab('fixtures');
    };

    socket.on('auction:bid', onBid);
    socket.on('auction:next-player', onNextPlayer);
    socket.on('auction:player-sold', onSold);
    socket.on('auction:player-unsold', onUnsold);
    socket.on('auction:completed', onCompleted);
    socket.on('auction:fixtures-ready', onFixtures);

    return () => {
      socket.off('auction:bid', onBid);
      socket.off('auction:next-player', onNextPlayer);
      socket.off('auction:player-sold', onSold);
      socket.off('auction:player-unsold', onUnsold);
      socket.off('auction:completed', onCompleted);
      socket.off('auction:fixtures-ready', onFixtures);
      socket.emit('unsubscribe:auction', { auctionId });
    };
  }, [auctionId, fetchAuction]);

  // ── Host: load all teams for inviting ────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;
    apiClient.get('/teams/all').then(r => setAllTeams(r.data?.data || r.data || [])).catch(() => {});
  }, [isHost]);

  // ── Host: search players ─────────────────────────────────────────────────
  useEffect(() => {
    if (!playerSearch.trim() || !isHost) { setPlayerResults([]); return; }
    const t = setTimeout(() => {
      apiClient.get(`/search?q=${encodeURIComponent(playerSearch)}&type=player`)
        .then(r => setPlayerResults(r.data?.data || r.data || []))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [playerSearch, isHost]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleNextPlayer = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/league-auctions/${auctionId}/next-player`);
      await fetchAuction();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleSell = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const r = await apiClient.post(`/league-auctions/${auctionId}/sell`);
      setSoldAnim({ ...r.data, teamName: auction?.leagueTeams?.find((t: any) => t.id === r.data.leagueTeamId)?.name });
      setTimeout(() => fetchAuction(), 3600);
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleMarkUnsold = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/league-auctions/${auctionId}/unsold`);
      await fetchAuction();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleReAuctionUnsold = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const r = await apiClient.post(`/league-auctions/${auctionId}/reauction-unsold`);
      setImportMsg(`✅ ${r.data?.message || 'Unsold players moved back to queue'}`);
      await fetchAuction();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to re-auction'); }
    finally { setActionLoading(false); }
  };

  const handleBid = async (amount: number) => {
    if (!myLeagueTeam || !auction?.currentPlayer) return;
    try {
      await apiClient.post(`/league-auctions/${auctionId}/bid`, {
        playerId: auction.currentPlayer.playerId,
        leagueTeamId: myLeagueTeam.id,
        amount,
      });
    } catch (e: any) { setError(e.response?.data?.error || e.message || 'Bid failed'); }
  };

  const handleInviteTeamDirect = async (teamId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/league-auctions/${auctionId}/invite`, { teamId });
      setTeamSearch('');
      await fetchAuction();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to invite team'); }
    finally { setActionLoading(false); }
  };

  const handleImportRegisteredPlayers = async () => {
    setActionLoading(true);
    setImportMsg('');
    try {
      const r = await apiClient.post(`/league-auctions/${auctionId}/import-registered`, { defaultBasePrice: registerBasePrice });
      const { imported, skipped, message } = r.data;
      await fetchAuction();
      setImportMsg(message || `✅ Imported ${imported} player${imported !== 1 ? 's' : ''}${skipped ? ` (${skipped} already in pool)` : ''}`);
    } catch (e: any) { setImportMsg('❌ ' + (e.response?.data?.error || 'Import failed')); }
    finally { setActionLoading(false); }
  };

  const handleRegisterPlayer = async (playerId: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/league-auctions/${auctionId}/players`, { playerId, basePrice: registerBasePrice });
      setPlayerSearch('');
      setPlayerResults([]);
      await fetchAuction();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleGenerateFixtures = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/league-auctions/${auctionId}/generate-fixtures`);
      await fetchAuction();
      setActiveTab('fixtures');
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to generate fixtures'); }
    finally { setActionLoading(false); }
  };

  const handleStartAuction = async () => {
    try {
      await apiClient.post(`/league-auctions/${auctionId}/start`, { roleOrder });
      await fetchAuction();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to start'); }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-14 h-14 border-4 border-indigo-300 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-indigo-200">Loading Auction...</p>
      </div>
    </div>
  );

  if (!auction) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-800 mb-2">Auction not found</p>
          <button onClick={() => navigate(-1)} className="text-indigo-600 underline">Go back</button>
        </div>
      </div>
    </div>
  );

  const { config, currentPlayer, leagueTeams = [], playerPool = [], results = [], fixtures = [], invitations = [] } = auction;
  const soldCount = playerPool.filter((p: any) => p.status === 'SOLD').length;
  const totalCount = playerPool.length;
  const pendingCount = playerPool.filter((p: any) => p.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Sold animation overlay */}
      {soldAnim && <SoldOverlay data={soldAnim} onDone={() => setSoldAnim(null)} />}

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <span className="flex-1 text-sm font-medium">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white px-4 sm:px-8 py-8">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <button onClick={() => navigate(-1)} className="text-indigo-300 hover:text-white transition-colors text-sm">← Back</button>
                <span className="text-indigo-400">|</span>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  auction.status === 'IN_PROGRESS' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                  auction.status === 'COMPLETED' || auction.status === 'FIXTURES_READY' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                  'bg-white/10 text-white/60 border-white/20'
                }`}>
                  {auction.status === 'IN_PROGRESS' && <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />}
                  {auction.status}
                </span>
              </div>
              <h1 className="text-3xl font-black">🔨 League Auction</h1>
              {myLeagueTeam && (
                <p className="text-indigo-300 mt-1">Your team: <span className="text-white font-bold">{myLeagueTeam.name}</span> · Budget: <span className="text-amber-300 font-bold">{fmt(myLeagueTeam.remaining_budget)} pts</span> remaining</p>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Teams', value: leagueTeams.length },
                { label: 'Player Pool', value: `${soldCount}/${totalCount}` },
                { label: 'Remaining', value: pendingCount },
                { label: 'Budget/Team', value: `${fmt(config.teamBudget)} pts` },
              ].map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 text-center min-w-[80px]">
                  <p className="text-xs text-indigo-300 font-medium">{s.label}</p>
                  <p className="text-lg font-black">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 mt-6 bg-white/5 rounded-2xl p-1 w-fit flex-wrap">
            {(['auction', 'teams', 'players', 'results', 'fixtures'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  activeTab === tab ? 'bg-white text-indigo-900' : 'text-indigo-200 hover:text-white'
                }`}>
                {tab === 'auction' ? '🔨 Auction' :
                 tab === 'teams' ? `👥 Teams (${leagueTeams.length})` :
                 tab === 'players' ? `🎯 Pool (${totalCount})` :
                 tab === 'results' ? `🏆 Results (${results.length})` :
                 `📅 Fixtures (${fixtures.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ── AUCTION TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'auction' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Current player + bid */}
            <div className="lg:col-span-2 space-y-4">
              {currentPlayer ? (
                <PlayerCard
                  player={currentPlayer}
                  isHost={isHost}
                  myLeagueTeam={myLeagueTeam}
                  onBid={handleBid}
                  onSell={handleSell}
                  onUnsold={handleMarkUnsold}
                />
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                  {auction.status === 'COMPLETED' || auction.status === 'FIXTURES_READY' ? (
                    <>
                      <div className="text-6xl mb-4">🏆</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Auction Completed!</h3>
                      <p className="text-gray-500 mb-4">All players have been auctioned.</p>
                      {isHost && auction.status === 'COMPLETED' && (
                        <button onClick={handleGenerateFixtures} disabled={actionLoading}
                          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                          📅 Generate Fixtures
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">⏳</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Auction Not Started</h3>
                      {isHost ? (
                        <p className="text-gray-500">Configure the auction order below, then start when ready.</p>
                      ) : (
                        <div className="text-left max-w-sm mx-auto mt-4 space-y-3">
                          <p className="text-gray-500 text-center text-sm">Waiting for the host to start the auction. When it begins, you'll see each player here and can place bids.</p>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">How bidding works</p>
                            <div className="space-y-1.5 text-sm text-gray-700">
                              <div className="flex items-start gap-2"><span className="text-indigo-500 font-bold">1.</span><span>Host puts a player up for auction — you'll see their stats &amp; base price</span></div>
                              <div className="flex items-start gap-2"><span className="text-indigo-500 font-bold">2.</span><span>Enter any amount above the current bid and hit <span className="font-bold text-amber-600">🔨 BID</span></span></div>
                              <div className="flex items-start gap-2"><span className="text-indigo-500 font-bold">3.</span><span>Highest bidder when the host sells wins the player — cost is deducted from your budget</span></div>
                              <div className="flex items-start gap-2"><span className="text-indigo-500 font-bold">4.</span><span>Keep an eye on your remaining budget shown in the top bar</span></div>
                            </div>
                          </div>
                          {myLeagueTeam && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                              <p className="text-xs text-amber-600 font-semibold">Your budget</p>
                              <p className="text-2xl font-black text-amber-700">{fmt(myLeagueTeam.remaining_budget)} pts</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Host SETUP panel — invite + role order + start */}
              {isHost && auction.status === 'SETUP' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                  {/* Invite teams */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">✉️ Invite Teams to League</h4>
                    <p className="text-xs text-gray-400 mb-3">Each team's manager will receive an invite and can choose a league team name upon accepting.</p>
                    <div>
                      <input
                        type="text"
                        placeholder="Search teams by name..."
                        value={teamSearch}
                        onChange={e => setTeamSearch(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                      />
                      {teamSearch.trim() && (
                        <div className="mt-1 border border-gray-100 rounded-xl divide-y max-h-48 overflow-y-auto shadow-sm">
                          {allTeams
                            .filter((t: any) =>
                              t.name.toLowerCase().includes(teamSearch.toLowerCase()) &&
                              !invitations.some((inv: any) => inv.team_id === t.id)
                            )
                            .map((t: any) => (
                              <div key={t.id} className="flex justify-between items-center px-3 py-2.5 hover:bg-gray-50">
                                <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                                <button
                                  onClick={() => handleInviteTeamDirect(t.id)}
                                  disabled={actionLoading}
                                  className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                                  Invite
                                </button>
                              </div>
                            ))
                          }
                          {allTeams.filter((t: any) =>
                            t.name.toLowerCase().includes(teamSearch.toLowerCase()) &&
                            !invitations.some((inv: any) => inv.team_id === t.id)
                          ).length === 0 && (
                            <div className="px-3 py-3 text-sm text-gray-400 text-center">No matching teams found</div>
                          )}
                        </div>
                      )}
                    </div>
                    {invitations.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {invitations.map((inv: any) => (
                          <div key={inv.id} className="flex justify-between items-center text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                            <span className="font-semibold text-gray-700">{inv.team_name}</span>
                            <span className={`font-bold ${
                              inv.status === 'ACCEPTED' ? 'text-green-600' :
                              inv.status === 'DECLINED' ? 'text-red-500' : 'text-amber-600'
                            }`}>{inv.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Role auction order */}
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">🎯 Auction Role Order</h4>
                    <p className="text-xs text-gray-400 mb-3">Drag to reorder. Players will be auctioned role-by-role in this sequence.</p>
                    <div className="space-y-2">
                      {roleOrder.map((role, i) => (
                        <div key={role} className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl">
                          <span className="text-lg">{ROLE_ICON[role] || '👤'}</span>
                          <span className="flex-1 font-semibold text-sm text-gray-800 capitalize">{role.replace('_', ' ')}</span>
                          <span className="text-xs text-gray-400 font-medium">#{i + 1}</span>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveRole(i, -1)} disabled={i === 0}
                              className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-indigo-100 disabled:opacity-30 flex items-center justify-center text-xs transition-colors">▲</button>
                            <button onClick={() => moveRole(i, 1)} disabled={i === roleOrder.length - 1}
                              className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-indigo-100 disabled:opacity-30 flex items-center justify-center text-xs transition-colors">▼</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Import players from tournament registrations */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-0.5">📋 Import Players from Registrations</h4>
                      <p className="text-xs text-gray-500">Automatically import all confirmed registered players into the auction pool.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Base Price (pts)</label>
                        <input
                          type="number"
                          value={registerBasePrice}
                          onChange={e => setRegisterBasePrice(Number(e.target.value))}
                          className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                          min={0}
                        />
                      </div>
                      <div className="pt-5">
                        <button
                          onClick={handleImportRegisteredPlayers}
                          disabled={actionLoading}
                          className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                          {actionLoading ? '...' : '⬇ Import All'}
                        </button>
                      </div>
                    </div>
                    {importMsg && (
                      <p className={`text-sm font-semibold rounded-xl px-3 py-2 ${importMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {importMsg}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">Current pool: <span className="font-bold text-indigo-600">{playerPool.length} players</span></p>
                  </div>

                  <div>
                    <button onClick={handleStartAuction} disabled={actionLoading || playerPool.length === 0}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                      {actionLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🚀'}
                      Start Auction
                    </button>
                    {playerPool.length === 0 && (
                      <p className="text-center text-xs text-gray-400 mt-2">Import players above first to enable this button</p>
                    )}
                  </div>
                </div>
              )}

              {/* Host: Next player control */}
              {isHost && currentPlayer && (
                <button onClick={handleNextPlayer} disabled={actionLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
                  {actionLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '→'}
                  {actionLoading ? 'Loading...' : 'Next Player'}
                </button>
              )}

              {/* Live bid history */}
              {currentPlayer?.bids?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live Bids
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentPlayer.bids.map((bid: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 px-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors">
                        <span className="text-sm font-semibold text-gray-700">{bid.teamName || bid.leagueTeamId}</span>
                        <span className="text-sm font-black text-indigo-600">{fmt(bid.amount)} pts</span>
                        <span className="text-xs text-gray-400">{bid.timestamp ? new Date(bid.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar: Team budgets + quick actions */}
            <div className="space-y-4">

              {/* Host invite panel (sidebar — during live auction only) */}
              {isHost && auction.status !== 'SETUP' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h4 className="font-bold text-gray-900 mb-3 text-sm">✉️ Invite Team</h4>
                  <input
                    type="text"
                    placeholder="Search teams by name..."
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-1 focus:outline-none focus:border-indigo-400"
                  />
                  {teamSearch.trim() && (
                    <div className="border border-gray-100 rounded-xl divide-y max-h-40 overflow-y-auto mb-2 shadow-sm">
                      {allTeams
                        .filter((t: any) =>
                          t.name.toLowerCase().includes(teamSearch.toLowerCase()) &&
                          !invitations.some((inv: any) => inv.team_id === t.id)
                        )
                        .map((t: any) => (
                          <div key={t.id} className="flex justify-between items-center px-2 py-2 hover:bg-gray-50">
                            <span className="text-xs font-semibold text-gray-800 truncate">{t.name}</span>
                            <button
                              onClick={() => handleInviteTeamDirect(t.id)}
                              disabled={actionLoading}
                              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors ml-2 shrink-0">
                              Invite
                            </button>
                          </div>
                        ))
                      }
                      {allTeams.filter((t: any) =>
                        t.name.toLowerCase().includes(teamSearch.toLowerCase()) &&
                        !invitations.some((inv: any) => inv.team_id === t.id)
                      ).length === 0 && (
                        <div className="px-2 py-2 text-xs text-gray-400 text-center">No matching teams</div>
                      )}
                    </div>
                  )}

                  {/* Invitation statuses */}
                  {invitations.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {invitations.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center text-xs px-2 py-1.5 rounded-lg bg-gray-50">
                          <span className="font-medium text-gray-700 truncate">{inv.team_name}</span>
                          <span className={`font-bold ${
                            inv.status === 'ACCEPTED' ? 'text-green-600' :
                            inv.status === 'DECLINED' ? 'text-red-500' : 'text-amber-600'
                          }`}>{inv.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Team budgets */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h4 className="font-bold text-gray-900 mb-3 text-sm">💰 Team Budgets</h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {leagueTeams.map((team: any) => {
                    const total = parseFloat(team.budget);
                    const remaining = parseFloat(team.remaining_budget);
                    const spent = total - remaining;
                    const pct = total > 0 ? (spent / total) * 100 : 0;
                    return (
                      <div key={team.id} className={`p-3 rounded-xl border transition-all ${myLeagueTeam?.id === team.id ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-gray-900 truncate">{team.name}</p>
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">
                            {team.players_acquired} players
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>{fmt(remaining)} pts left</span>
                          <span>of {fmt(total)} pts</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {leagueTeams.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No teams have accepted invitations yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TEAMS TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {leagueTeams.map((team: any) => (
              <div key={team.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-5 text-white">
                  <h3 className="text-lg font-black">{team.name}</h3>
                  <p className="text-indigo-200 text-sm">{team.manager_name}</p>
                  <div className="flex gap-3 mt-3">
                    <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                      <p className="text-xs text-indigo-200">Budget Left</p>
                      <p className="font-black">{fmt(team.remaining_budget)} pts</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                      <p className="text-xs text-indigo-200">Players</p>
                      <p className="font-black">{team.players_acquired}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Roster</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(Array.isArray(team.roster) ? team.roster : []).map((p: any) => (
                      <div key={p.playerId} className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{ROLE_META[p.role?.toUpperCase()] ? ROLE_META[p.role.toUpperCase()].icon : '👤'}</span>
                          <span className="text-sm font-semibold text-gray-800 truncate">{p.playerName}</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 flex-shrink-0 ml-2">{fmt(p.pricePaid)} pts</span>
                      </div>
                    ))}
                    {(!team.roster || team.roster.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-3">No players yet</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {leagueTeams.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-gray-500 font-medium">No teams have joined yet.</p>
                {isHost && <p className="text-sm text-gray-400 mt-1">Use the Auction tab to invite teams.</p>}
              </div>
            )}
          </div>
        )}

        {/* ── PLAYER POOL TAB ─────────────────────────────────────────────── */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            {/* Host: register players */}
            {isHost && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-3">➕ Add Players to Auction</h3>

                {/* Import from tournament registrations */}
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-indigo-800">📋 Import from Tournament Registrations</p>
                      <p className="text-xs text-indigo-600 mt-0.5">Automatically pull in all players who registered for this league tournament.</p>
                    </div>
                    <button
                      onClick={handleImportRegisteredPlayers}
                      disabled={actionLoading}
                      className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {actionLoading ? '...' : 'Import All'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-indigo-600 font-medium">Default base price:</span>
                    <input type="number" value={registerBasePrice} onChange={e => setRegisterBasePrice(parseInt(e.target.value) || 0)}
                      className="w-24 border border-indigo-200 bg-white rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-indigo-400" />
                    <span className="text-xs text-indigo-500">pts per player</span>
                  </div>
                  {importMsg && (
                    <p className={`mt-2 text-xs font-semibold ${importMsg.startsWith('❌') ? 'text-red-600' : 'text-green-700'}`}>{importMsg}</p>
                  )}
                </div>

                {/* Manual search */}
                <div className="flex gap-3 flex-wrap">
                  <input
                    type="text" placeholder="Or search players manually..."
                    value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                    className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                {playerResults.length > 0 && (
                  <div className="mt-3 border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-48 overflow-y-auto">
                    {playerResults.map((p: any) => {
                      const alreadyAdded = playerPool.some((ap: any) => ap.playerId === p.id || ap.playerId === p.userId);
                      return (
                        <div key={p.id || p.userId} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {p.avatarUrl ? <img src={p.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" /> :
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm">👤</div>}
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                              <p className="text-xs text-gray-500">{p.city || ''}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRegisterPlayer(p.id || p.userId)}
                            disabled={alreadyAdded || actionLoading}
                            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            {alreadyAdded ? 'Added' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Player list grouped by role */}
            {['BATSMAN', 'WICKET_KEEPER', 'ALL_ROUNDER', 'BOWLER', 'UNKNOWN'].map(role => {
              const players = playerPool.filter((p: any) => (p.role || 'UNKNOWN').toUpperCase() === role);
              if (!players.length) return null;
              const meta = ROLE_META[role];
              return (
                <div key={role}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-3 ${meta.color}`}>
                    {meta.icon} {meta.label}s ({players.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {players.map((p: any) => (
                      <div key={p.playerId} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 ${
                        p.status === 'SOLD' ? 'border-green-200 bg-green-50' :
                        p.status === 'UNSOLD' ? 'border-gray-200 opacity-60' :
                        p.status === 'BIDDING' ? 'border-amber-300 ring-2 ring-amber-200' :
                        'border-gray-100'
                      }`}>
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                          {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover rounded-xl" alt="" /> : meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{p.playerName}</p>
                          <p className="text-xs text-gray-500">{fmt(p.basePrice)} base</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'SOLD' ? 'bg-green-100 text-green-700' :
                          p.status === 'UNSOLD' ? 'bg-gray-100 text-gray-500' :
                          p.status === 'BIDDING' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {p.status === 'BIDDING' ? '🔨' : ''}{p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {playerPool.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🎯</div>
                <p className="text-gray-500 font-medium">No players added to the pool yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── RESULTS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {isHost && auction.status === 'COMPLETED' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-indigo-800">Auction Complete!</p>
                  <p className="text-sm text-indigo-600">Generate fixtures to schedule matches for all teams.</p>
                </div>
                <button onClick={handleGenerateFixtures} disabled={actionLoading}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  📅 Generate Fixtures
                </button>
              </div>
            )}

            {/* Unsold Players */}
            {(() => {
              const unsoldPlayers = playerPool.filter((p: any) => p.status === 'UNSOLD');
              if (unsoldPlayers.length === 0) return null;
              return (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-rose-800">❌ Unsold Players ({unsoldPlayers.length})</h3>
                      <p className="text-xs text-rose-500 mt-0.5">These players went unsold after 2 rounds. Host can re-add them to the queue.</p>
                    </div>
                    {isHost && (
                      <button
                        onClick={handleReAuctionUnsold}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 disabled:opacity-50 transition-all whitespace-nowrap">
                        {actionLoading ? '...' : '🔄 Re-Auction All'}
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-rose-100/50 border-b border-rose-100">
                          <th className="text-left py-3 px-5 font-semibold text-rose-700 text-xs uppercase tracking-wide">Player</th>
                          <th className="text-left py-3 px-4 font-semibold text-rose-700 text-xs uppercase tracking-wide">Role</th>
                          <th className="text-right py-3 px-5 font-semibold text-rose-700 text-xs uppercase tracking-wide">Base Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50">
                        {unsoldPlayers.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-rose-50/50 transition-colors">
                            <td className="py-3 px-5 font-semibold text-gray-900 flex items-center gap-2">
                              {p.avatarUrl && <img src={p.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" />}
                              {p.playerName}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium capitalize">{(p.role || '').toLowerCase().replace('_', ' ')}</span>
                            </td>
                            <td className="py-3 px-5 text-right font-bold text-gray-700">{fmt(p.basePrice)} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {importMsg && (
              <p className={`text-sm font-semibold rounded-xl px-4 py-2.5 ${importMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {importMsg}
              </p>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">🏆 Auction Results</h3>
                <span className="text-sm text-gray-500">{results.length} sold</span>
              </div>
              {results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Player</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Team</th>
                        <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Final Price</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Bids</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {results.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-gray-900">{r.player_name || r.playerName}</td>
                          <td className="py-3.5 px-4 text-gray-700">{r.team_name || r.teamName}</td>
                          <td className="py-3.5 px-5 text-right font-black text-indigo-600">{fmt(r.final_price || r.finalPrice)} pts</td>
                          <td className="py-3.5 px-4 text-center text-gray-500">{r.total_bids || r.totalBids}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No results yet. Start the auction and sell some players first.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FIXTURES TAB ────────────────────────────────────────────────── */}
        {activeTab === 'fixtures' && (() => {
          const groupFx = fixtures.filter((f: any) => f.stage === 'GROUP').sort((a: any, b: any) => a.round - b.round || a.match_number - b.match_number);
          const qfFx    = fixtures.filter((f: any) => f.stage === 'QF').sort((a: any, b: any) => a.match_number - b.match_number);
          const sfFx    = fixtures.filter((f: any) => f.stage === 'SF').sort((a: any, b: any) => a.match_number - b.match_number);
          const finalFx = fixtures.filter((f: any) => f.stage === 'FINAL');
          const koExists = qfFx.length + sfFx.length + finalFx.length > 0;
          const fmtDate  = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

          // Match card for bracket tree
          const BMatch = ({ m, label, golden }: { m: any; label?: string; golden?: boolean }) => (
            <div className={`rounded-2xl border-2 p-3 w-48 shadow-sm flex-shrink-0 ${golden ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50' : 'border-gray-100 bg-white'}`}>
              {label && <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${golden ? 'text-amber-600' : 'text-indigo-500'}`}>{label}</p>}
              <div className={`px-2.5 py-2 rounded-xl mb-1.5 text-sm font-bold truncate ${golden ? 'bg-amber-100 text-amber-900' : 'bg-gray-50 text-gray-800'}`}>
                {m?.home_team_name || 'TBD'}
              </div>
              <div className="text-center text-[10px] text-gray-400 font-semibold my-1">
                vs {m?.scheduled_date ? `· ${fmtDate(m.scheduled_date)}` : ''}
              </div>
              <div className={`px-2.5 py-2 rounded-xl text-sm font-bold truncate ${golden ? 'bg-amber-100 text-amber-900' : 'bg-gray-50 text-gray-800'}`}>
                {m?.away_team_name || 'TBD'}
              </div>
            </div>
          );

          // Bracket connector: groups pairCount×2 on left into pairCount×1 on right
          const Connector = ({ pairCount }: { pairCount: number }) => (
            <div className="flex flex-col w-8 self-stretch flex-shrink-0">
              {Array.from({ length: pairCount }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 border-r-2 border-t-2 border-indigo-200 rounded-tr-xl" style={{ marginTop: '52px' }} />
                  <div className="flex-1 border-r-2 border-b-2 border-indigo-200 rounded-br-xl" style={{ marginBottom: '52px' }} />
                </div>
              ))}
            </div>
          );

          return (
            <div className="space-y-8">
              {isHost && (auction.status === 'COMPLETED' || auction.status === 'FIXTURES_READY') && fixtures.length > 0 && (
                <div className="flex justify-end">
                  <button onClick={handleGenerateFixtures} disabled={actionLoading}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-semibold text-sm hover:bg-indigo-100 disabled:opacity-50 transition-all">
                    🔄 Regenerate Fixtures
                  </button>
                </div>
              )}

              {fixtures.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📅</div>
                  <p className="font-bold text-gray-800 text-lg mb-1">No fixtures yet</p>
                  <p className="text-gray-500 text-sm">
                    {isHost ? 'Complete the auction and generate fixtures.' : 'Waiting for host to generate fixtures.'}
                  </p>
                  {isHost && (auction.status === 'COMPLETED' || auction.status === 'FIXTURES_READY') && (
                    <button onClick={handleGenerateFixtures} disabled={actionLoading}
                      className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                      📅 Generate Fixtures
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* ── GROUP STAGE ─────────────────────────────────── */}
                  {groupFx.length > 0 && (
                    <div>
                      <h3 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
                        🏟️ Group Stage
                        <span className="text-xs font-semibold text-gray-400">({groupFx.length} matches · round-robin)</span>
                      </h3>
                      {[...new Set(groupFx.map((f: any) => f.round))].sort((a: any, b: any) => a - b).map((round: any) => (
                        <div key={round} className="mb-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Round {round}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {groupFx.filter((f: any) => f.round === round).map((f: any) => (
                              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                                <div className="flex-1 text-right">
                                  <p className="font-bold text-gray-900 text-sm">{f.home_team_name}</p>
                                </div>
                                <div className="text-center flex-shrink-0">
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">VS</span>
                                  {f.scheduled_date && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(f.scheduled_date)}</p>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 text-sm">{f.away_team_name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── KNOCKOUT BRACKET TREE ───────────────────────── */}
                  {koExists && (
                    <div>
                      <h3 className="font-black text-gray-900 text-lg mb-2 flex items-center gap-2">
                        🏆 Knockout Bracket
                      </h3>
                      <p className="text-xs text-gray-500 mb-6">
                        Top teams from group stage advance. Winners of each match move to the next round.
                      </p>
                      <div className="overflow-x-auto pb-4">
                        <div className="flex items-stretch gap-0 min-w-max">

                          {/* QF column */}
                          {qfFx.length > 0 && (
                            <>
                              <div className="flex flex-col gap-6 flex-shrink-0">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider text-center">Quarter Finals</p>
                                {qfFx.map((m: any, i: number) => (
                                  <BMatch key={i} m={m} label={`QF ${i + 1}`} />
                                ))}
                              </div>
                              <Connector pairCount={Math.ceil(qfFx.length / 2)} />
                            </>
                          )}

                          {/* SF column */}
                          {sfFx.length > 0 && (
                            <>
                              <div className="flex flex-col gap-6 flex-shrink-0" style={{ paddingTop: qfFx.length > 0 ? '32px' : '0' }}>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider text-center">Semi Finals</p>
                                {sfFx.map((m: any, i: number) => (
                                  <BMatch key={i} m={m} label={`SF ${i + 1}`} />
                                ))}
                              </div>
                              <Connector pairCount={1} />
                            </>
                          )}

                          {/* FINAL column */}
                          {finalFx.length > 0 && (
                            <div className="flex flex-col flex-shrink-0 justify-center" style={{ paddingTop: sfFx.length > 0 ? '20px' : '0' }}>
                              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider text-center mb-3">Final</p>
                              <BMatch m={finalFx[0]} golden />
                              <div className="text-center mt-4">
                                <div className="inline-flex flex-col items-center gap-1 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2">
                                  <span className="text-3xl">🏆</span>
                                  <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Champion</p>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                        <span className="text-sm">ℹ️</span>
                        <p className="text-xs text-blue-700">
                          <span className="font-bold">Standings rule:</span> Win = 3pts · Draw = 1pt · Loss = 0pts.
                          TBD teams are filled in automatically after group stage standings are finalized.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Inline animation styles */}
      <style>{`
        @keyframes soldPop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-sold-pop { animation: soldPop 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-200px) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti 1.5s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default LeagueAuction;
