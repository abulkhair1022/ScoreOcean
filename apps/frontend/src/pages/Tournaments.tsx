import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

const SPORT_META: Record<string, { icon: string; gradient: string; bg: string; text: string }> = {
  CRICKET:    { icon: '🏏', gradient: 'from-primary-400 to-primary-500', bg: 'bg-primary-50',   text: 'text-primary-700'  },
  FOOTBALL:   { icon: '⚽', gradient: 'from-primary-600 to-primary-700',  bg: 'bg-primary-100',    text: 'text-primary-800'   },
  KABADDI:    { icon: '🤼', gradient: 'from-primary-300 to-primary-400', bg: 'bg-primary-50',   text: 'text-primary-600'  },
  VOLLEYBALL: { icon: '🏐', gradient: 'from-primary-200 to-primary-300',    bg: 'bg-primary-50',    text: 'text-primary-600'   },
  BASKETBALL: { icon: '🏀', gradient: 'from-primary-500 to-primary-600',   bg: 'bg-primary-100',  text: 'text-primary-700' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  REGISTRATION_OPEN:   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Registration Open'   },
  REGISTRATION_CLOSED: { bg: 'bg-primary-100',  text: 'text-primary-700',  dot: 'bg-primary-500',  label: 'Registration Closed' },
  ONGOING:             { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Ongoing'             },
  IN_PROGRESS:         { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'In Progress'         },
  AUCTION_PENDING:     { bg: 'bg-primary-100',   text: 'text-primary-700',   dot: 'bg-primary-500',   label: '🔨 Auction Pending'  },
  COMPLETED:           { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Completed'           },
  ACTIVE:              { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active'              },
  UPCOMING:            { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Upcoming'            },
  CANCELLED:           { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Cancelled'           },
  DRAFT:               { bg: 'bg-primary-100',   text: 'text-primary-700',   dot: 'bg-primary-500',   label: 'Draft'               },
};

const getEffectiveStatusKey = (t: any): string => {
  const dbStatus = t.status || 'UPCOMING';
  // Terminal states — keep as-is
  if (['COMPLETED', 'CANCELLED', 'DRAFT', 'IN_PROGRESS'].includes(dbStatus)) return dbStatus;
  const now = Date.now();
  const dates = t.dates || {};
  const startDate = dates.startDate || t.startDate;
  const endDate   = dates.endDate   || t.endDate;
  const regDeadline = dates.registrationDeadline || t.registrationDeadline;
  if (endDate && now > new Date(endDate).getTime()) return 'COMPLETED';
  if (startDate && now >= new Date(startDate).getTime()) return 'ONGOING';
  if (regDeadline && now > new Date(regDeadline).getTime()) return 'REGISTRATION_CLOSED';
  return dbStatus;
};

// Custom Select component for attractive dropdowns
const SelectField = ({ label, value, onChange, children, required }: {
  label: string; value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
      {label}{required && ' *'}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all cursor-pointer pr-10 shadow-sm hover:border-gray-300">
        {children}
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

const SPORT_ROLES: Record<string, string[]> = {
  CRICKET:    ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'],
  FOOTBALL:   ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'],
  KABADDI:    ['RAIDER', 'DEFENDER', 'ALL_ROUNDER'],
  VOLLEYBALL: ['SETTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'LIBERO'],
  BASKETBALL: ['POINT_GUARD', 'SHOOTING_GUARD', 'SMALL_FORWARD', 'POWER_FORWARD', 'CENTER'],
};

const EXPERIENCE_OPTIONS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'];

const toLocaleDateStr = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Tournaments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [myTournaments, setMyTournaments] = useState<any[]>([]);
  const manageId = searchParams.get('manage');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  // Registration modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registeringTournament, setRegisteringTournament] = useState<any | null>(null);
  const [registerStep, setRegisterStep] = useState<'details' | 'payment' | 'done'>('details');
  const [registerForm, setRegisterForm] = useState({ role: '', experience: 'BEGINNER', preferredPosition: '', additionalInfo: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const rf = (field: string, value: string) => setRegisterForm((p) => ({ ...p, [field]: value }));
  // Team role registration
  const [myRegTeams, setMyRegTeams] = useState<any[]>([]);
  const [selectedRegTeamId, setSelectedRegTeamId] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    name: '', sport: 'CRICKET', format: 'KNOCKOUT', competitionType: 'TOURNAMENT',
    venue: '', startDate: '', endDate: '', registrationDeadline: '',
    registrationFee: 0, teamCapacity: 16,
  });
  const cf = (field: string, value: any) => setCreateForm((p) => ({ ...p, [field]: value }));
  const [auctionMap, setAuctionMap] = useState<Record<string, { id: string; auctionStatus: string }>>({});
  // Auction setup modal
  const [showAuctionSetup, setShowAuctionSetup] = useState(false);
  const [auctionSetupTournament, setAuctionSetupTournament] = useState<any | null>(null);
  const [auctionSetupForm, setAuctionSetupForm] = useState({ teamBudget: 1000, bidIncrement: 50, bidTimeout: 30, minSquadSize: 11, maxSquadSize: 15 });
  const [creatingAuction, setCreatingAuction] = useState(false);
  const af = (field: string, value: any) => setAuctionSetupForm((p) => ({ ...p, [field]: value }));

  const handleStartAuction = async () => {
    if (!auctionSetupTournament) return;
    setCreatingAuction(true);
    try {
      const r = await apiClient.post(`/league-auctions/tournament/${auctionSetupTournament.id}/create`, auctionSetupForm);
      const auction = r.data?.data || r.data;
      setAuctionMap(prev => ({ ...prev, [auctionSetupTournament.id]: { id: auction.id, auctionStatus: auction.status || 'SETUP' } }));
      setShowAuctionSetup(false);
      navigate(`/league-auctions/${auction.id}`);
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || 'Failed to create auction';
      alert(msg);
    } finally { setCreatingAuction(false); }
  };

  const handleRegisterOpen = async (t: any) => {
    setRegisteringTournament(t);
    setRegisterStep('details');
    setRegisterForm({ role: '', experience: 'BEGINNER', preferredPosition: '', additionalInfo: '' });
    setSelectedRegTeamId('');
    if (user?.role === 'TEAM') {
      try {
        const r = await apiClient.get('/teams');
        const teams = r.data?.data || r.data || [];
        setMyRegTeams(teams);
        if (teams.length > 0) setSelectedRegTeamId(teams[0].id);
      } catch { setMyRegTeams([]); }
    }
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = async () => {
    const t = registeringTournament;
    try {
      setRegisteringId(t.id);
      if (user?.role === 'TEAM') {
        if (!selectedRegTeamId) { alert('Please select a team to register.'); return; }
        await apiClient.post(`/tournaments/${t.id}/register`, { teamId: selectedRegTeamId });
      } else {
        if (!registerForm.role) { alert('Please select your playing role.'); return; }
        await apiClient.post(`/tournaments/${t.id}/register`, { playerDetails: registerForm });
      }
      if (Number(t.registrationFee) > 0) {
        setRegisterStep('payment');
      } else {
        setRegisterStep('done');
        fetchTournaments(user);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally { setRegisteringId(null); }
  };

  const handlePayment = async () => {
    const t = registeringTournament;
    try {
      setPaymentLoading(true);
      const res = await apiClient.post('/payments/initiate', {
        tournamentId: t.id,
        amount: t.registrationFee,
      });
      const { orderId, amount, currency, keyId } = res.data.data;
      // Load Razorpay checkout dynamically
      const loadRazorpay = () => new Promise<void>((resolve) => {
        if ((window as any).Razorpay) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve();
        document.body.appendChild(s);
      });
      await loadRazorpay();
      const options = {
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Score Ocean',
        description: `Registration fee for ${t.name}`,
        handler: async (response: any) => {
          try {
            await apiClient.post('/payments/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setRegisterStep('done');
            fetchTournaments(user);
          } catch {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: { email: user?.email || '' },
        theme: { color: '#7c3aed' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      if (err.response?.status === 503) {
        // Razorpay not configured (dev mode) — mark as paid via simulate
        alert('Payment gateway is not configured (dev mode). Your registration is PENDING until payment is verified.');
        setShowRegisterModal(false);
        fetchTournaments(user);
      } else {
        alert(err.response?.data?.error?.message || err.response?.data?.message || 'Payment initiation failed.');
      }
    } finally { setPaymentLoading(false); }
  };

  const handlePublish = async (id: string) => {
    try {
      await apiClient.post(`/tournaments/${id}/publish`);
      fetchTournaments(user);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to publish tournament');
    }
  };

  const handleCreateTournament = async () => {
    if (!createForm.name || !createForm.venue || !createForm.startDate || !createForm.endDate || !createForm.registrationDeadline) {
      alert('Please fill in all required fields.');
      return;
    }
    if (new Date(createForm.registrationDeadline) >= new Date(createForm.startDate)) {
      alert('Registration deadline must be strictly before the start date.');
      return;
    }
    if (new Date(createForm.endDate) <= new Date(createForm.startDate)) {
      alert('End date must be after the start date.');
      return;
    }
    try {
      setCreating(true);
      await apiClient.post('/tournaments', {
        name: createForm.name,
        sport: createForm.sport,
        format: createForm.format,
        competitionType: createForm.competitionType,
        venue: createForm.venue,
        dates: { startDate: new Date(createForm.startDate), endDate: new Date(createForm.endDate) },
        registrationDeadline: new Date(createForm.registrationDeadline),
        registrationFee: Number(createForm.registrationFee),
        teamCapacity: Number(createForm.teamCapacity),
        rules: { matchDuration: 90, pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', sport: 'CRICKET', format: 'KNOCKOUT', competitionType: 'TOURNAMENT',
        venue: '', startDate: '', endDate: '', registrationDeadline: '', registrationFee: 0, teamCapacity: 16 });
      fetchTournaments(user);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create tournament');
    } finally { setCreating(false); }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (!storedUser || !accessToken) { navigate('/login'); return; }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchTournaments(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (user) fetchTournaments(user);
  }, [searchQuery, sportFilter, statusFilter]);

  useEffect(() => {
    const leagueTournaments = allTournaments.filter(
      (t: any) => t.format === 'LEAGUE' || t.competitionType === 'LEAGUE'
    );
    leagueTournaments.forEach(async (t: any) => {
      if (auctionMap[t.id]) return; // already fetched
      try {
        const r = await apiClient.get(`/league-auctions/tournament/${t.id}`);
        const auction = r.data?.data || r.data;
        if (auction?.id) {
          setAuctionMap(prev => ({ ...prev, [t.id]: { id: auction.id, auctionStatus: auction.status || 'SETUP' } }));
        }
      } catch { /* no auction yet for this tournament */ }
    });
  }, [allTournaments]);

  // Auto-open tournament detail if ?manage=<id> is in the URL
  useEffect(() => {
    if (!manageId) return;
    const all = [...allTournaments, ...myTournaments];
    const found = all.find((t: any) => t.id === manageId);
    if (found) {
      setSelectedTournament(found);
      setActiveTab('my');
    }
  }, [manageId, allTournaments, myTournaments]);

  const fetchTournaments = async (currentUser: any) => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery) params.q = searchQuery;
      if (sportFilter) params.sport = sportFilter;
      if (statusFilter) params.status = statusFilter;
      // Include drafts so org can see and publish their own draft tournaments
      const r = await apiClient.get('/tournaments', { params: { ...params, includeDrafts: true } });
      const list = r.data?.data || r.data || [];
      setAllTournaments(list.filter((t: any) => t.status !== 'DRAFT'));
      setMyTournaments(list.filter((t: any) =>
        t.hostId === currentUser.id || t.host_id === currentUser.id ||
        t.registrations?.some((reg: any) => reg.playerId === currentUser.id || reg.team?.members?.some((m: any) => m.id === currentUser.id))));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tournaments');
    } finally { setLoading(false); }
  };

  const isRegistered = (t: any) => {
    if (!user) return false;
    const isLeague = t.format === 'LEAGUE' || t.competitionType === 'LEAGUE';
    if (isLeague) {
      // Check player registration
      return t.registrations?.some((reg: any) => reg.playerId === user.id || reg.player?.id === user.id);
    }
    // Check team registration
    return t.registrations?.some((reg: any) => reg.team?.members?.some((m: any) => m.id === user.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            <p className="text-gray-500 text-sm">Loading tournaments...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderCard = (t: any) => {
    const meta = SPORT_META[t.sport] || { icon: '🏆', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700' };
    const statusKey = getEffectiveStatusKey(t);
    const isLeague = t.format === 'LEAGUE' || t.competitionType === 'LEAGUE';
    // For leagues: if dates say ONGOING but auction isn't COMPLETED, show AUCTION_PENDING
    const auctionEntry = auctionMap[t.id];
    const displayStatusKey = (isLeague && statusKey === 'ONGOING' && auctionEntry?.auctionStatus !== 'COMPLETED')
      ? 'AUCTION_PENDING'
      : statusKey;
    const ss = STATUS_STYLE[displayStatusKey] || STATUS_STYLE.UPCOMING;
    const registered = isRegistered(t);
    const isHost = t.hostId === user?.id || t.host_id === user?.id;
    const userRole = user?.role;
    // Players register for leagues only; teams register for tournaments only
    const canUserRegisterThisType =
      userRole === 'PLAYER' ? isLeague :
      userRole === 'TEAM'   ? !isLeague :
      false;
    const isOpen = (statusKey === 'REGISTRATION_OPEN' || statusKey === 'UPCOMING' || statusKey === 'ACTIVE') && !['ONGOING', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED'].includes(statusKey);
    const canRegister = isOpen && !registered && !isHost && canUserRegisterThisType;
    const showTypeRestriction = isOpen && !registered && !isHost && !canUserRegisterThisType
      && userRole !== 'ORGANIZATION' && userRole !== 'ADMIN';
    const dates = t.dates || {};
    const startDate = dates.startDate || t.startDate;
    const endDate = dates.endDate || t.endDate;
    const capacity = t.teamCapacity || t.maxTeams || '—';
    const registrations = t.registrations?.length || t.currentTeams || 0;
    const fee = t.registrationFee != null ? `₹${t.registrationFee.toLocaleString('en-IN')}` : 'Free';

    return (
      <div key={t.id} className="card-hover flex flex-col">
        {/* Card Header */}
        <div className={`p-5 rounded-t-2xl bg-gradient-to-br ${meta.gradient} text-white relative overflow-hidden`}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                {meta.icon}
              </div>
              <div>
                <h3 className="font-black text-white leading-tight">{t.name}</h3>
                <p className="text-white/70 text-xs">{t.venue || 'Venue TBD'}</p>
              </div>
            </div>
            {isHost && (
              <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-white/20 text-white text-xs font-bold">Host</span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${ss.bg} ${ss.text} text-xs font-bold`}>
              {displayStatusKey !== 'AUCTION_PENDING' && <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />}{ss.label}
            </span>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
              isLeague ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {isLeague ? '👤 League' : '👥 Tournament'}
            </span>
            {t.format && t.format !== 'LEAGUE' && (
              <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold">{t.format}</span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2">
            {startDate && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>📅</span>
                <span>{toLocaleDateStr(startDate)}{endDate ? ` – ${toLocaleDateStr(endDate)}` : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>👥</span>
              <span>{registrations} / {capacity} teams</span>
              <div className="flex-1 ml-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                  style={{ width: typeof capacity === 'number' ? `${Math.min(100, (registrations / capacity) * 100)}%` : '0%' }} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>💰</span>
              <span className="font-semibold text-gray-700">{fee} registration fee</span>
            </div>
          </div>

          {/* Action */}
          <div className="mt-auto flex flex-col gap-2">
            {registered ? (
              <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-center text-sm font-bold border-2 border-emerald-200">
                ✓ Registered
              </div>
            ) : canRegister ? (
              <button
                onClick={() => handleRegisterOpen(t)}
                disabled={registeringId === t.id}
                className={`w-full py-2.5 bg-gradient-to-r ${meta.gradient} text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2`}>
                {registeringId === t.id ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Registering...</>
                ) : isLeague ? 'Register as Player →' : 'Register Team →'}
              </button>
            ) : showTypeRestriction ? (
              <div className={`w-full py-2.5 rounded-xl text-center text-xs font-bold border-2 border-dashed ${
                isLeague
                  ? 'bg-violet-50 text-violet-500 border-violet-200'
                  : 'bg-indigo-50 text-indigo-500 border-indigo-200'
              }`}>
                {isLeague ? '👤 Players only' : '👥 Teams only'}
              </div>
            ) : isHost && displayStatusKey === 'DRAFT' ? (
              <button
                onClick={() => handlePublish(t.id)}
                className={`w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-400 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2`}>
                🚀 Publish Tournament
              </button>
            ) : (
              <button
                onClick={() => setSelectedTournament(t)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors">
                View Details
              </button>
            )}
            {isLeague && auctionEntry?.id && (isHost || registered || user?.role === 'TEAM') && (
              <button
                onClick={() => navigate(`/league-auctions/${auctionEntry.id}`)}
                className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-400 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2">
                🔨 {isHost ? 'Manage Auction' : 'View Auction'}
              </button>
            )}
            {isLeague && isHost && !auctionEntry && statusKey !== 'DRAFT' && (
              statusKey === 'REGISTRATION_CLOSED' ? (
                <button
                  onClick={() => { setAuctionSetupTournament(t); setShowAuctionSetup(true); }}
                  className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-400 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2">
                  🔨 Start Auction
                </button>
              ) : (statusKey === 'ONGOING' || statusKey === 'COMPLETED') ? (
                <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold border-2 border-dashed bg-gray-50 text-gray-400 border-gray-200">
                  🔒 Tournament started — auction window passed
                </div>
              ) : (
                <div className="w-full py-2.5 rounded-xl text-center text-xs font-bold border-2 border-dashed bg-primary-50 text-primary-500 border-primary-200">
                  ⏳ Auction available after registration closes
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const displayed = activeTab === 'all' ? allTournaments : myTournaments;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>Tournaments</h1>
            <p className="text-gray-500 mt-1">Browse, register and compete in tournaments</p>
          </div>
          {(user?.role === 'ORGANIZATION' || user?.role === 'ADMIN') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-400 text-white rounded-xl text-sm font-bold hover:from-primary-700 transition-all shadow-sm">
              + Create Tournament
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-rose-700 font-medium text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200/60 p-1 rounded-2xl w-fit">
          {[
            { id: 'all', label: 'All Tournaments', count: allTournaments.length },
            { id: 'my',  label: 'My Tournaments',  count: myTournaments.length  },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-gray-300 text-gray-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search</label>
              <input type="text" placeholder="Search tournaments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sport</label>
              <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="input-field">
                <option value="">All Sports</option>
                {Object.keys(SPORT_META).map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
                <option value="">All Status</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {displayed.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">🏆</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {activeTab === 'my' ? 'Not in any tournaments' : 'No tournaments found'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'my' ? 'Register for a tournament to see it here' : 'Check back later or adjust your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayed.map((t) => renderCard(t))}
          </div>
        )}
      </main>

      {/* ── Tournament Detail Modal ─────────────────────────────────── */}
      {selectedTournament && (() => {
        const t = selectedTournament;
        const meta = SPORT_META[t.sport] || { icon: '🏆', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700' };
        const statusKey = getEffectiveStatusKey(t);
        const isLeague = t.format === 'LEAGUE' || t.competitionType === 'LEAGUE';
        const auctionEntry = auctionMap[t.id];
        const displayStatusKey = (isLeague && statusKey === 'ONGOING' && auctionEntry?.auctionStatus !== 'COMPLETED')
          ? 'AUCTION_PENDING' : statusKey;
        const ss = STATUS_STYLE[displayStatusKey] || STATUS_STYLE.UPCOMING;
        const dates = t.dates || {};
        const startDate = dates.startDate || t.startDate;
        const endDate   = dates.endDate   || t.endDate;
        const regs = t.registrations?.length || t.currentTeams || 0;
        const cap  = t.teamCapacity || t.maxTeams || '—';
        const fee  = t.registrationFee != null ? `₹${t.registrationFee.toLocaleString('en-IN')}` : 'Free';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTournament(null)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
              {/* Header */}
              <div className={`p-6 bg-gradient-to-br ${meta.gradient} text-white`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">{meta.icon}</div>
                    <div>
                      <h2 className="text-xl font-black leading-tight">{t.name}</h2>
                      <p className="text-white/70 text-sm mt-0.5">{t.venue || 'Venue TBD'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTournament(null)} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">✕</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/20 text-white text-xs font-bold`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />{ss.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-xs font-bold">{isLeague ? '👤 League' : '👥 Tournament'}</span>
                  {t.format && t.format !== 'LEAGUE' && <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-xs font-bold">{t.format}</span>}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '📅', label: 'Start Date',  value: startDate ? toLocaleDateStr(startDate) : '—' },
                    { icon: '📅', label: 'End Date',    value: endDate   ? toLocaleDateStr(endDate)   : '—' },
                    { icon: '👥', label: 'Teams',       value: `${regs} / ${cap}` },
                    { icon: '💰', label: 'Entry Fee',   value: fee },
                    { icon: '🏅', label: 'Sport',       value: t.sport },
                    { icon: '📋', label: 'Format',      value: t.format || '—' },
                  ].map((row) => (
                    <div key={row.label} className={`p-3 rounded-2xl ${meta.bg}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{row.icon}</span>
                        <p className="text-xs text-gray-400 font-medium">{row.label}</p>
                      </div>
                      <p className={`text-sm font-bold ${meta.text}`}>{row.value}</p>
                    </div>
                  ))}
                </div>

                {/* Capacity bar */}
                {typeof cap === 'number' && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Registration progress</span>
                      <span>{Math.round((regs / cap) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${meta.gradient} transition-all`}
                        style={{ width: `${Math.min(100, (regs / cap) * 100)}%` }} />
                    </div>
                  </div>
                )}

                {t.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{t.description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Register Modal ─────────────────────────────────────────── */}
      {showRegisterModal && registeringTournament && (() => {
        const t = registeringTournament;
        const meta = SPORT_META[t.sport] || { gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700', icon: '🏆' };
        const roles = SPORT_ROLES[t.sport] || ['PLAYER'];
        const fee = Number(t.registrationFee);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
              {/* Header */}
              <div className={`p-6 bg-gradient-to-br ${meta.gradient} text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-0.5">
                      {registerStep === 'details' ? (user?.role === 'TEAM' ? 'Team Registration' : 'Player Registration') : registerStep === 'payment' ? 'Payment' : 'Confirmed!'}
                    </p>
                    <h2 className="text-xl font-black leading-tight">{t.name}</h2>
                    <p className="text-white/70 text-sm mt-0.5">{meta.icon} {t.sport} &nbsp;·&nbsp; {t.venue}</p>
                  </div>
                  <button onClick={() => setShowRegisterModal(false)} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">✕</button>
                </div>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mt-4">
                  {['details', fee > 0 ? 'payment' : null, 'done'].filter(Boolean).map((step, i, arr) => (
                    <React.Fragment key={step as string}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step === registerStep ? 'bg-white text-violet-700' :
                        arr.indexOf(step) < arr.indexOf(registerStep) ? 'bg-white/40 text-white' : 'bg-white/20 text-white/60'
                      }`}>{i + 1}</div>
                      <span className="text-white/60 text-xs font-medium capitalize">{step}</span>
                      {i < arr.length - 1 && <div className="flex-1 h-0.5 bg-white/20 rounded" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* Step 1: Player / Team Details */}
                {registerStep === 'details' && (
                  <div className="space-y-4">
                    {user?.role === 'TEAM' ? (
                      /* TEAM role: select which team to register */
                      <>
                        <p className="text-sm font-medium text-gray-700">Select the team you want to register for this tournament:</p>
                        {myRegTeams.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">No teams found. Create a team first.</p>
                        ) : (
                          <div className="space-y-2">
                            {myRegTeams.map((team: any) => (
                              <label key={team.id} className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border-2 transition-all ${selectedRegTeamId === team.id ? `border-violet-400 bg-violet-50` : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}>
                                <input type="radio" name="regTeam" value={team.id} checked={selectedRegTeamId === team.id} onChange={() => setSelectedRegTeamId(team.id)} className="accent-violet-600" />
                                <div>
                                  <p className="font-bold text-sm text-gray-900">{team.name}</p>
                                  <p className="text-xs text-gray-400">{team.sport}{team.location ? ` · ${team.location}` : ''}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      /* PLAYER role: existing form */
                      <>
                        <SelectField label="Playing Role" value={registerForm.role} onChange={(v) => rf('role', v)} required>
                          <option value="">Select your role…</option>
                          {roles.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                        </SelectField>

                        <SelectField label="Experience Level" value={registerForm.experience} onChange={(v) => rf('experience', v)} required>
                          {EXPERIENCE_OPTIONS.map((e) => <option key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase()}</option>)}
                        </SelectField>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Preferred Position</label>
                          <input type="text" value={registerForm.preferredPosition}
                            onChange={(e) => rf('preferredPosition', e.target.value)}
                            placeholder="e.g. Opening Batsman, Leg Spinner"
                            className="input-field" />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Additional Info</label>
                          <textarea value={registerForm.additionalInfo}
                            onChange={(e) => rf('additionalInfo', e.target.value)}
                            placeholder="Any additional information about yourself…"
                            rows={2}
                            className="input-field resize-none" />
                        </div>
                      </>
                    )}

                    {fee > 0 && (
                      <div className={`flex items-center gap-3 p-3 ${meta.bg} rounded-2xl border border-violet-100`}>
                        <span className="text-xl">💳</span>
                        <div>
                          <p className="text-xs font-bold text-gray-700">Registration Fee</p>
                          <p className={`text-lg font-black ${meta.text}`}>₹{fee.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setShowRegisterModal(false)}
                        className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={handleRegisterSubmit}
                        disabled={registeringId === t.id || (user?.role === 'TEAM' ? !selectedRegTeamId : !registerForm.role)}
                        className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${meta.gradient} text-white font-bold text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2`}>
                        {registeringId === t.id
                          ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Submitting…</>
                          : fee > 0 ? 'Continue to Payment →' : 'Register for Free →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Payment */}
                {registerStep === 'payment' && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mx-auto mb-3">✓</div>
                      <p className="font-bold text-gray-900">Details submitted!</p>
                      <p className="text-sm text-gray-500 mt-1">Complete payment to confirm your spot in <span className="font-semibold">{t.name}</span>.</p>
                    </div>

                    <div className={`p-4 ${meta.bg} rounded-2xl text-center`}>
                      <p className="text-xs text-gray-500 font-medium">Amount Due</p>
                      <p className={`text-3xl font-black ${meta.text} mt-0.5`}>₹{fee.toLocaleString('en-IN')}</p>
                    </div>

                    <button onClick={handlePayment} disabled={paymentLoading}
                      className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${meta.gradient} text-white font-black text-base hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2`}>
                      {paymentLoading
                        ? <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing…</>
                        : '💳 Pay ₹' + fee.toLocaleString('en-IN')}
                    </button>
                    <p className="text-center text-xs text-gray-400">Secured by Razorpay</p>
                  </div>
                )}

                {/* Step 3: Done */}
                {registerStep === 'done' && (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl mx-auto">🎉</div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">You're in!</h3>
                      <p className="text-gray-500 text-sm mt-1">Successfully registered for <span className="font-semibold">{t.name}</span>.</p>
                    </div>
                    <button onClick={() => setShowRegisterModal(false)}
                      className={`w-full py-3 rounded-xl bg-gradient-to-r ${meta.gradient} text-white font-bold text-sm hover:opacity-90 transition-all shadow-sm`}>
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Auction Setup Modal ─────────────────────────────────────── */}
      {showAuctionSetup && auctionSetupTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuctionSetup(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 bg-gradient-to-br from-primary-600 to-primary-400 text-white rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">🔨 Start Auction</h2>
                  <p className="text-primary-100 text-sm mt-0.5">{auctionSetupTournament.name}</p>
                </div>
                <button onClick={() => setShowAuctionSetup(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Starting Budget per Team</label>
                <input type="number" value={auctionSetupForm.teamBudget}
                  onChange={e => af('teamBudget', Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none text-sm" />
                <p className="text-xs text-gray-400 mt-1">Can be points (e.g. 1000), credits, or money — host decides the unit</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bid Increment</label>
                  <input type="number" value={auctionSetupForm.bidIncrement}
                    onChange={e => af('bidIncrement', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bid Timeout (sec)</label>
                  <input type="number" value={auctionSetupForm.bidTimeout}
                    onChange={e => af('bidTimeout', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Min Squad Size</label>
                  <input type="number" value={auctionSetupForm.minSquadSize}
                    onChange={e => af('minSquadSize', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Squad Size</label>
                  <input type="number" value={auctionSetupForm.maxSquadSize}
                    onChange={e => af('maxSquadSize', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:outline-none text-sm" />
                </div>
              </div>
              <button
                onClick={handleStartAuction}
                disabled={creatingAuction}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-400 text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingAuction
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating...</>
                  : '🔨 Create Auction & Open Dashboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Tournament Modal ─────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-primary-600 to-primary-400 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Create Tournament</h2>
                  <p className="text-violet-200 text-sm mt-0.5">Set up a new event for teams to join</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">✕</button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tournament Name *</label>
                <input type="text" value={createForm.name} onChange={(e) => cf('name', e.target.value)}
                  placeholder="e.g. Champions Cricket League 2026" className="input-field" />
              </div>

              {/* Sport + Competition type */}
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Sport" value={createForm.sport} onChange={(v) => cf('sport', v)} required>
                  {Object.keys(SPORT_META).map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                </SelectField>
                <SelectField
                  label="Type"
                  value={createForm.competitionType}
                  onChange={(v) => {
                    cf('competitionType', v);
                    // Auto-sync format: League type → League format
                    if (v === 'LEAGUE') cf('format', 'LEAGUE');
                    else if (createForm.format === 'LEAGUE') cf('format', 'KNOCKOUT');
                  }}
                  required>
                  <option value="TOURNAMENT">🏆 Tournament (Teams)</option>
                  <option value="LEAGUE">👤 League (Players)</option>
                </SelectField>
              </div>

              {/* Format */}
              {createForm.competitionType !== 'LEAGUE' && (
                <SelectField label="Format" value={createForm.format} onChange={(v) => cf('format', v)} required>
                  <option value="KNOCKOUT">⚔️ Knockout</option>
                  <option value="GROUP_KNOCKOUT">🏟️ Group + Knockout</option>
                </SelectField>
              )}
              {createForm.competitionType === 'LEAGUE' && (
                <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-2xl border border-violet-100">
                  <span className="text-lg">🔄</span>
                  <div>
                    <p className="text-xs font-bold text-violet-700">League Format</p>
                    <p className="text-xs text-violet-500">Round-robin style — all teams/players compete against each other</p>
                  </div>
                </div>
              )}

              {/* Venue */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Venue *</label>
                <input type="text" value={createForm.venue} onChange={(e) => cf('venue', e.target.value)}
                  placeholder="e.g. SportsPlex, Mumbai" className="input-field" />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                  <input type="date" value={createForm.startDate} onChange={(e) => cf('startDate', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">End Date *</label>
                  <input type="date" value={createForm.endDate} onChange={(e) => cf('endDate', e.target.value)} className="input-field" />
                </div>
              </div>

              {/* Registration deadline */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Registration Deadline *</label>
                <input type="date" value={createForm.registrationDeadline} onChange={(e) => cf('registrationDeadline', e.target.value)} className="input-field" />
                <p className="text-xs text-amber-600 mt-1">⚠️ Must be strictly before the start date</p>
              </div>

              {/* Fee + Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Entry Fee (₹)</label>
                  <input type="number" min="0" value={createForm.registrationFee} onChange={(e) => cf('registrationFee', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Team Capacity</label>
                  <input type="number" min="2" value={createForm.teamCapacity} onChange={(e) => cf('teamCapacity', e.target.value)} className="input-field" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreateTournament} disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-400 text-white font-bold text-sm hover:from-primary-700 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</> : '+ Create Tournament'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tournaments;
