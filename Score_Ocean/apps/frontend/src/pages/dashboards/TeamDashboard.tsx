import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { showToast } from '../../utils/toast';

const SPORT_META: Record<string, { icon: string; gradient: string; bg: string; text: string }> = {
  CRICKET:    { icon: '🏏', gradient: 'from-green-500 to-emerald-600',  bg: 'bg-green-50',   text: 'text-green-700'   },
  FOOTBALL:   { icon: '⚽', gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50',    text: 'text-blue-700'    },
  KABADDI:    { icon: '🤼', gradient: 'from-amber-500 to-orange-600',  bg: 'bg-amber-50',   text: 'text-amber-700'   },
  VOLLEYBALL: { icon: '🏐', gradient: 'from-rose-500 to-pink-600',     bg: 'bg-rose-50',    text: 'text-rose-700'    },
  BASKETBALL: { icon: '🏀', gradient: 'from-orange-500 to-red-600',    bg: 'bg-orange-50',  text: 'text-orange-700'  },
  BADMINTON:  { icon: '🏸', gradient: 'from-teal-500 to-cyan-600',     bg: 'bg-teal-50',    text: 'text-teal-700'    },
};

const MATCH_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING_ACCEPTANCE: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Awaiting Response' },
  SCHEDULED:          { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Scheduled'        },
  IN_PROGRESS:        { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Live'              },
  COMPLETED:          { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Completed'         },
  CANCELLED:          { bg: 'bg-rose-100',   text: 'text-rose-700',   label: 'Cancelled'         },
};

const ALL_SPORTS = ['CRICKET', 'FOOTBALL', 'KABADDI', 'VOLLEYBALL', 'BASKETBALL', 'BADMINTON'];

export default function TeamDashboard() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [sportProfiles, setSportProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [browsedTeams, setBrowsedTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('');

  // Add sport modal
  const [showAddSport, setShowAddSport] = useState(false);
  const [addSportValue, setAddSportValue] = useState('CRICKET');
  const [addSportLoading, setAddSportLoading] = useState(false);

  // Challenge match modal
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ awayTeamId: '', sport: '', scheduledAt: '' });
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeActionLoading, setChallengeActionLoading] = useState<string | null>(null);
  const cf = (k: string, v: string) => setChallengeForm((p) => ({ ...p, [k]: v }));

  // Match detail modal
  const [matchDetail, setMatchDetail] = useState<any>(null);
  const [matchDetailLoading, setMatchDetailLoading] = useState(false);

  // League auction invites
  const [leagueInvites, setLeagueInvites] = useState<any[]>([]);
  const [leagueInviteLoading, setLeagueInviteLoading] = useState<string | null>(null);
  const [respondingInvite, setRespondingInvite] = useState<any>(null);
  const [leagueTeamName, setLeagueTeamName] = useState('');
  const [myLeagueSlots, setMyLeagueSlots] = useState<any[]>([]);

  const openMatchDetail = async (match: any) => {
    setMatchDetail({ _loading: true, ...match });
    setMatchDetailLoading(true);
    try {
      const res = await apiClient.get(`/matches/${match.id}`);
      setMatchDetail(res.data);
    } catch {
      setMatchDetail(match);
    } finally {
      setMatchDetailLoading(false);
    }
  };

  const renderMatchDetailModal = () => {
    if (!matchDetail) return null;
    const m = matchDetail;
    const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
    const ssd = m.score?.sportSpecificData || {};
    const homeInnings = ssd.home || {};
    const awayInnings = ssd.away || {};
    const hs = m.score?.homeScore ?? m.homeScore ?? m.home_score ?? 0;
    const as_ = m.score?.awayScore ?? m.awayScore ?? m.away_score ?? 0;
    const myScore = isHome ? hs : as_;
    const theirScore = isHome ? as_ : hs;
    const homeTeamName = m.homeTeam?.name || m.home_team_name || m.homeTeamName || 'Home';
    const awayTeamName = m.awayTeam?.name || m.away_team_name || m.awayTeamName || 'Away';
    const meta = SPORT_META[m.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500' };
    let result = '';
    let resultColor = '';
    if (m.status === 'COMPLETED') {
      if (myScore > theirScore) { result = 'W'; resultColor = 'text-green-600 bg-green-100'; }
      else if (myScore < theirScore) { result = 'L'; resultColor = 'text-rose-600 bg-rose-100'; }
      else { result = 'D'; resultColor = 'text-gray-600 bg-gray-100'; }
    }
    const dateStr = m.startTime
      ? new Date(m.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
    const isCricket = m.sport === 'CRICKET';
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setMatchDetail(null)}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className={`bg-gradient-to-br ${meta.gradient} p-5 text-white`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{meta.icon}</span>
                <span className="text-sm font-bold opacity-90">{m.sport}</span>
              </div>
              <button onClick={() => setMatchDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white text-lg">✕</button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs opacity-75 mb-1">{isHome ? 'Your Team' : 'Opponent'}</p>
                <p className="font-black text-lg leading-tight">{homeTeamName}</p>
                {isCricket && homeInnings.runs !== undefined ? (
                  <p className="text-3xl font-black mt-1">{homeInnings.runs}<span className="text-lg opacity-80">/{homeInnings.wickets ?? 0}</span></p>
                ) : (
                  <p className="text-3xl font-black mt-1">{hs}</p>
                )}
                {isCricket && homeInnings.overs !== undefined && (
                  <p className="text-xs opacity-75 mt-0.5">{homeInnings.overs} overs</p>
                )}
              </div>
              <div className="text-center px-4">
                <p className="text-xl font-black opacity-60">vs</p>
                {result && (
                  <span className={`mt-1 px-2.5 py-0.5 rounded-full text-xs font-black ${resultColor}`}>{result === 'W' ? 'WIN' : result === 'L' ? 'LOSS' : 'DRAW'}</span>
                )}
              </div>
              <div className="text-center flex-1">
                <p className="text-xs opacity-75 mb-1">{isHome ? 'Opponent' : 'Your Team'}</p>
                <p className="font-black text-lg leading-tight">{awayTeamName}</p>
                {isCricket && awayInnings.runs !== undefined ? (
                  <p className="text-3xl font-black mt-1">{awayInnings.runs}<span className="text-lg opacity-80">/{awayInnings.wickets ?? 0}</span></p>
                ) : (
                  <p className="text-3xl font-black mt-1">{as_}</p>
                )}
                {isCricket && awayInnings.overs !== undefined && (
                  <p className="text-xs opacity-75 mt-0.5">{awayInnings.overs} overs</p>
                )}
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {matchDetailLoading && (
              <div className="flex justify-center py-4"><div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" /></div>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 font-semibold">📅 {dateStr}</span>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold ${(MATCH_STATUS[m.status] || MATCH_STATUS.SCHEDULED).bg} ${(MATCH_STATUS[m.status] || MATCH_STATUS.SCHEDULED).text}`}>
                {(MATCH_STATUS[m.status] || MATCH_STATUS.SCHEDULED).label}
              </span>
              {m.tournamentId && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 font-semibold">🏆 Tournament</span>}
            </div>
            {isCricket && !matchDetailLoading && (homeInnings.runs !== undefined || awayInnings.runs !== undefined) && (
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Scorecard</p>
                {[{ label: homeTeamName, inn: homeInnings, tag: isHome ? 'Your Team' : 'Opponent' },
                  { label: awayTeamName, inn: awayInnings, tag: isHome ? 'Opponent' : 'Your Team' }].map(({ label, inn, tag }) =>
                  inn.runs !== undefined ? (
                    <div key={label} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-black text-gray-900 text-sm">{label}</p>
                          <p className="text-xs text-gray-400">{tag}</p>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{inn.runs}<span className="text-base text-gray-400">/{inn.wickets ?? 0}</span></p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-xl p-2">
                          <p className="text-xs text-gray-400 font-semibold">Overs</p>
                          <p className="font-black text-gray-800">{inn.overs ?? 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-2">
                          <p className="text-xs text-gray-400 font-semibold">Run Rate</p>
                          <p className="font-black text-gray-800">{inn.runRate ?? 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-2">
                          <p className="text-xs text-gray-400 font-semibold">Wickets</p>
                          <p className="font-black text-gray-800">{inn.wickets ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
            {!isCricket && m.status === 'COMPLETED' && (
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Final Score</p>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold mb-1">{homeTeamName}</p>
                    <p className="text-3xl font-black text-gray-900">{hs}</p>
                  </div>
                  <p className="text-gray-300 font-black text-xl">—</p>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold mb-1">{awayTeamName}</p>
                    <p className="text-3xl font-black text-gray-900">{as_}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setMatchDetail(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50">
                Close
              </button>
              <button onClick={() => { setMatchDetail(null); navigate(`/matches/${m.id}`); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold hover:from-violet-700 flex items-center justify-center gap-2">
                View Full Details →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [teamsRes, profileRes] = await Promise.allSettled([
        apiClient.get('/teams'),
        apiClient.get('/users/profile'),
      ]);

      if (profileRes.status === 'fulfilled') {
        const pName = profileRes.value.data?.profile?.name || profileRes.value.data?.name || '';
        if (pName) setProfileName(pName);
      }

      const teamList = teamsRes.status === 'fulfilled'
        ? (teamsRes.value.data?.data || teamsRes.value.data || [])
        : [];
      const tl = Array.isArray(teamList) ? teamList : [];
      setTeams(tl);

      if (tl.length > 0) {
        await loadTeamDetails(tl[0]);
      }

      // Load all teams for challenge modal opponents
      try {
        const br = await apiClient.get('/teams/browse');
        setBrowsedTeams(br.data?.data || br.data || []);
      } catch { /* ignore */ }
      try {
        const lr = await apiClient.get('/league-auctions/my/invitations');
        setLeagueInvites(lr.data || []);
      } catch { /* ignore */ }
      try {
        const slotRes = await apiClient.get('/league-auctions/my/teams');
        setMyLeagueSlots(slotRes.data || []);
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueInviteRespond = async (inv: any, accept: boolean) => {
    setLeagueInviteLoading(inv.id + (accept ? '_accept' : '_decline'));
    try {
      await apiClient.post(`/league-auctions/invitations/${inv.id}/respond`, {
        accept,
        leagueTeamName: accept ? leagueTeamName.trim() || inv.team_name : undefined,
      });
      setLeagueInvites((prev) => prev.filter((i) => i.id !== inv.id));
      setRespondingInvite(null);
      setLeagueTeamName('');
      showToast.success(accept ? 'Invitation accepted!' : 'Invitation declined');
    } catch (e: any) {
      showToast.error(e.response?.data?.error || 'Failed to respond');
    } finally { setLeagueInviteLoading(null); }
  };

  const loadTeamDetails = async (team: any) => {
    setSelectedTeam(team);
    try {
      const [sportsRes, matchesRes] = await Promise.allSettled([
        apiClient.get(`/teams/${team.id}/sports`),
        apiClient.get(`/matches/team/${team.id}`),
      ]);
      if (sportsRes.status === 'fulfilled') {
        setSportProfiles(sportsRes.value.data?.data || sportsRes.value.data || []);
      }
      if (matchesRes.status === 'fulfilled') {
        const ml = matchesRes.value.data?.data || matchesRes.value.data || [];
        setMatches(Array.isArray(ml) ? ml : []);
      }
    } catch { /* ignore */ }
  };

  const handleAddSport = async () => {
    if (!selectedTeam || !addSportValue) return;
    try {
      setAddSportLoading(true);
      await apiClient.post(`/teams/${selectedTeam.id}/sports`, { sport: addSportValue });
      const r = await apiClient.get(`/teams/${selectedTeam.id}/sports`);
      setSportProfiles(r.data?.data || r.data || []);
      setShowAddSport(false);
      showToast.success(`${addSportValue} added to team!`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to add sport');
    } finally { setAddSportLoading(false); }
  };

  const handleRemoveSport = async (sport: string) => {
    if (!selectedTeam) return;
    try {
      await apiClient.delete(`/teams/${selectedTeam.id}/sports/${sport}`);
      setSportProfiles((p) => p.filter((s: any) => s.sport !== sport));
      showToast.success(`${sport} removed from team.`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to remove sport');
    }
  };

  const handleSetPrimarySport = async (sport: string) => {
    if (!selectedTeam) return;
    try {
      await apiClient.put(`/teams/${selectedTeam.id}/primary-sport`, { sport });
      const r = await apiClient.get('/teams');
      const list = r.data?.data || r.data || [];
      setTeams(list);
      const updated = list.find((t: any) => t.id === selectedTeam.id) || { ...selectedTeam, sport };
      setSelectedTeam(updated);
      showToast.success(`${sport} is now your primary sport.`);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to change primary sport');
    }
  };

  const handleChallenge = async () => {
    if (!challengeForm.awayTeamId || !challengeForm.sport) {
      showToast.error('Please select an opponent team and sport.');
      return;
    }
    try {
      setChallengeLoading(true);
      await apiClient.post('/matches/direct', {
        homeTeamId: selectedTeam!.id,
        awayTeamId: challengeForm.awayTeamId,
        sport: challengeForm.sport,
        scheduledAt: challengeForm.scheduledAt || null,
      });
      showToast.success('Challenge sent! The opponent must accept before the match can start.');
      setShowChallenge(false);
      setChallengeForm({ awayTeamId: '', sport: '', scheduledAt: '' });
      const r = await apiClient.get(`/matches/team/${selectedTeam!.id}`);
      setMatches(r.data?.data || r.data || []);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create match');
    } finally { setChallengeLoading(false); }
  };

  const handleAcceptChallenge = async (matchId: string) => {
    try {
      setChallengeActionLoading(matchId + '_accept');
      await apiClient.post(`/matches/${matchId}/accept-challenge`);
      showToast.success('Challenge accepted! Match is now scheduled.');
      const r = await apiClient.get(`/matches/team/${selectedTeam!.id}`);
      setMatches(r.data?.data || r.data || []);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to accept challenge');
    } finally { setChallengeActionLoading(null); }
  };

  const handleDeclineChallenge = async (matchId: string) => {
    try {
      setChallengeActionLoading(matchId + '_decline');
      await apiClient.post(`/matches/${matchId}/decline-challenge`);
      showToast.success('Challenge declined.');
      const r = await apiClient.get(`/matches/team/${selectedTeam!.id}`);
      setMatches(r.data?.data || r.data || []);
    } catch (err: any) {
      showToast.error(err.response?.data?.error?.message || 'Failed to decline challenge');
    } finally { setChallengeActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const name = profileName || user?.name || user?.email?.split('@')[0] || 'Team Manager';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const wins = completedMatches.filter((m) => {
    const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
    const hs = m.homeScore ?? m.home_score ?? 0;
    const as_ = m.awayScore ?? m.away_score ?? 0;
    return (isHome && hs > as_) || (!isHome && as_ > hs);
  }).length;
  const losses = completedMatches.filter((m) => {
    const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
    const hs = m.homeScore ?? m.home_score ?? 0;
    const as_ = m.awayScore ?? m.away_score ?? 0;
    return (isHome && hs < as_) || (!isHome && as_ < hs);
  }).length;
  const draws = completedMatches.filter((m) => {
    const hs = m.homeScore ?? m.home_score ?? 0;
    const as_ = m.awayScore ?? m.away_score ?? 0;
    return hs === as_;
  }).length;
  const totalPlayers = teams.reduce((s: number, t: any) => s + (t.rosterCount || t.roster?.length || 0), 0);
  const existingSports = sportProfiles.map((sp: any) => sp.sport);
  const availableSports = ALL_SPORTS.filter((s) => !existingSports.includes(s));
  const challengeOpponents = browsedTeams.filter((t) => t.id !== selectedTeam?.id);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-8 text-white">
        <div className="absolute inset-0">
          <div className="absolute w-64 h-64 rounded-full opacity-10 bg-white -top-16 -right-16 animate-float" />
          <div className="absolute w-40 h-40 rounded-full opacity-10 bg-white bottom-0 left-1/4 animate-float-delay" />
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-emerald-200 text-sm font-medium mb-1">{greeting} 👋</p>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{name}</h1>
            <p className="text-emerald-100 max-w-md">Manage your teams, track performance, and challenge opponents.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => selectedTeam && setShowChallenge(true)}
              disabled={!selectedTeam}
              className="px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50">
              ⚔️ Challenge Team
            </button>
            <Link to="/tournaments"
              className="px-5 py-2.5 bg-white text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all hover:scale-105 shadow-lg">
              Find Tournaments
            </Link>
          </div>
        </div>
      </div>

      {/* Team Selector */}
      {teams.length > 1 && (
        <div className="card p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Team to View</p>
          <div className="flex gap-2 flex-wrap">
            {teams.map((t) => {
              const meta = SPORT_META[t.sport] || SPORT_META.CRICKET;
              return (
                <button key={t.id} onClick={() => loadTeamDetails(t)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    selectedTeam?.id === t.id
                      ? `${meta.bg} ${meta.text} border-current`
                      : 'bg-gray-50 text-gray-600 border-transparent hover:border-gray-200'
                  }`}>
                  <span>{meta.icon}</span> {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🛡️', label: 'My Teams',        value: teams.length,          gradient: 'from-emerald-500 to-teal-600',  text: 'text-emerald-600' },
          { icon: '🏃', label: 'Total Players',    value: totalPlayers,          gradient: 'from-blue-500 to-indigo-600',   text: 'text-blue-600'   },
          { icon: '✅', label: 'Wins',             value: wins,                  gradient: 'from-green-500 to-emerald-600', text: 'text-green-600'  },
          { icon: '📊', label: 'Matches Played',   value: completedMatches.length, gradient: 'from-violet-500 to-purple-600', text: 'text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="card-hover p-6">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-xl mb-4 shadow-sm`}>
              {s.icon}
            </div>
            <div className={`text-3xl font-black ${s.text} mb-1`}>{s.value}</div>
            <div className="text-sm text-gray-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Win/Loss indicator */}
      {completedMatches.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Wins',   value: wins,   bg: 'bg-green-50',  text: 'text-green-700',  icon: '🏆' },
            { label: 'Losses', value: losses, bg: 'bg-rose-50',   text: 'text-rose-700',   icon: '❌' },
            { label: 'Draws',  value: draws,  bg: 'bg-gray-50',   text: 'text-gray-700',   icon: '🤝' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl ${s.bg} p-5 text-center`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-black ${s.text}`}>{s.value}</div>
              <div className="text-xs text-gray-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Active League Auctions */}
          {myLeagueSlots.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">🔨</span>
                My League Auctions
              </h2>
              <div className="space-y-3">
                {myLeagueSlots.map((slot: any) => {
                  const statusColor = slot.auction_status === 'IN_PROGRESS' ? 'text-green-600 bg-green-50 border-green-100'
                    : slot.auction_status === 'COMPLETED' ? 'text-gray-500 bg-gray-50 border-gray-100'
                    : 'text-amber-600 bg-amber-50 border-amber-100';
                  const statusLabel = slot.auction_status === 'IN_PROGRESS' ? '🟢 Live'
                    : slot.auction_status === 'COMPLETED' ? '✅ Completed'
                    : '⏳ Setup';
                  return (
                    <div key={slot.league_team_id} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border ${statusColor}`}>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{slot.league_team_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">🏆 {slot.tournament_name} · {slot.remaining_budget?.toLocaleString()} / {slot.budget?.toLocaleString()} pts</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${statusColor}`}>{statusLabel}</span>
                        <Link to={`/league-auctions/${slot.auction_id}`}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                          Open →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active League Auctions */}
          {myLeagueSlots.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">🔨</span>
                My League Auctions
              </h2>
              <div className="space-y-3">
                {myLeagueSlots.map((slot: any) => {
                  const statusColor = slot.auction_status === 'IN_PROGRESS'
                    ? 'text-green-700 bg-green-50 border-green-100'
                    : slot.auction_status === 'COMPLETED'
                    ? 'text-gray-500 bg-gray-50 border-gray-100'
                    : 'text-amber-700 bg-amber-50 border-amber-100';
                  const statusLabel = slot.auction_status === 'IN_PROGRESS' ? '🟢 Live'
                    : slot.auction_status === 'COMPLETED' ? '✅ Completed'
                    : '⏳ Setup';
                  return (
                    <div key={slot.league_team_id} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border ${statusColor}`}>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{slot.league_team_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">🏆 {slot.tournament_name} · {slot.remaining_budget?.toLocaleString()} / {slot.budget?.toLocaleString()} pts</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${statusColor}`}>{statusLabel}</span>
                        <Link to={`/league-auctions/${slot.auction_id}`}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                          Open →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* League Auction Invitations */}
          {leagueInvites.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">🔨</span>
                League Auction Invitations
                <span className="ml-auto px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">{leagueInvites.length}</span>
              </h2>
              <div className="space-y-3">
                {leagueInvites.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">🏆 {inv.tournament_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Team: <span className="font-semibold text-gray-700">{inv.team_name}</span>{inv.inviter_name && <> · Invited by <span className="font-semibold">{inv.inviter_name}</span></>}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => { setRespondingInvite(inv); setLeagueTeamName(inv.team_name || ''); }}
                        disabled={!!leagueInviteLoading}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                        Accept
                      </button>
                      <button
                        onClick={() => handleLeagueInviteRespond(inv, false)}
                        disabled={leagueInviteLoading === inv.id + '_decline'}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors">
                        {leagueInviteLoading === inv.id + '_decline' ? '…' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accept modal — choose league team name */}
          {respondingInvite && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setRespondingInvite(null)}>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-black text-gray-900 mb-1">Accept League Invitation</h3>
                <p className="text-sm text-gray-500 mb-4">You're joining <span className="font-semibold text-gray-800">{respondingInvite.tournament_name}</span>. Choose a name for your league team:</p>
                <input
                  type="text"
                  placeholder={respondingInvite.team_name}
                  value={leagueTeamName}
                  onChange={(e) => setLeagueTeamName(e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => handleLeagueInviteRespond(respondingInvite, true)}
                    disabled={!!leagueInviteLoading}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm transition-colors">
                    {leagueInviteLoading ? '…' : '✅ Accept & Join'}
                  </button>
                  <button onClick={() => setRespondingInvite(null)}
                    className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* My Teams */}
          <div className="card p-6">
            <div className="section-header">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">🛡️</span>
                My Teams
              </h2>
              <Link to="/teams"
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-700 transition-all shadow-sm">
                + Create Team
              </Link>
            </div>

            {teams.length > 0 ? (
              <div className="space-y-3">
                {teams.map((team: any) => {
                  const meta = SPORT_META[team.sport] || { icon: '🛡️', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700' };
                  const isSelected = selectedTeam?.id === team.id;
                  return (
                    <div key={team.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:shadow-card cursor-pointer ${
                        isSelected ? `${meta.bg} border-current` : 'border-transparent bg-gray-50 hover:border-emerald-200 hover:bg-white'
                      }`}
                      onClick={() => loadTeamDetails(team)}>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 truncate">{team.name}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.text} text-xs font-semibold`}>Active</span>
                          {isSelected && <span className="text-xs text-emerald-600 font-semibold">● Viewing</span>}
                        </div>
                        <p className="text-sm text-gray-500">{team.sport} · {team.rosterCount || team.roster?.length || 0} players</p>
                      </div>
                      <Link to="/teams" onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-100 transition-colors flex-shrink-0">
                        Manage →
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">🛡️</div>
                <p className="font-semibold text-gray-700 mb-1">No teams yet</p>
                <p className="text-sm text-gray-400 mb-4">Create your first team to start recruiting players</p>
                <Link to="/teams" className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-700 transition-all shadow-sm">
                  Create Team
                </Link>
              </div>
            )}
          </div>

          {/* Sport Profiles */}
          {selectedTeam && (
            <div className="card p-6">
              <div className="section-header mb-1">
                <h2 className="section-title flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">🎯</span>
                  Sports — {selectedTeam.name}
                </h2>
                {availableSports.length > 0 && (
                  <button onClick={() => { setAddSportValue(availableSports[0]); setShowAddSport(true); }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 transition-all shadow-sm">
                    + Add Sport
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">Primary: <strong>{selectedTeam.sport}</strong> · {sportProfiles.length} sport(s) registered</p>

              {sportProfiles.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">No sport profiles yet.</p>
                  <button onClick={() => { setAddSportValue(ALL_SPORTS[0]); setShowAddSport(true); }}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700">+ Add first sport</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sportProfiles.map((sp: any) => {
                    const meta = SPORT_META[sp.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700' };
                    const isPrimary = sp.sport === selectedTeam.sport;
                    return (
                      <div key={sp.id || sp.sport}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${isPrimary ? `border-current ${meta.bg}` : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-lg shadow-sm flex-shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${isPrimary ? meta.text : 'text-gray-800'}`}>{sp.sport}</p>
                          {isPrimary && <p className="text-xs text-gray-400">Primary sport</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {!isPrimary && (
                            <button onClick={() => handleSetPrimarySport(sp.sport)} title="Set as primary sport"
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-black transition-colors">
                              ★
                            </button>
                          )}
                          <button onClick={() => handleRemoveSport(sp.sport)} title="Remove sport"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs transition-colors">
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pending Challenges */}
          {selectedTeam && matches.some(m => m.status === 'PENDING_ACCEPTANCE') && (() => {
            const pending = matches.filter(m => m.status === 'PENDING_ACCEPTANCE');
            const received = pending.filter(m => (m.away_team_id || m.awayTeamId) === selectedTeam.id);
            const sent     = pending.filter(m => (m.home_team_id || m.homeTeamId) === selectedTeam.id);
            if (!received.length && !sent.length) return null;
            return (
              <div className="card p-6">
                <h2 className="section-title flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">📩</span>
                  Pending Challenges
                  <span className="w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{pending.length}</span>
                </h2>
                <div className="space-y-3">
                  {received.map((match: any) => {
                    const meta = SPORT_META[match.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500' };
                    const opponentName = match.home_team_name || match.homeTeamName || 'Opponent';
                    const dateStr = match.created_at ? new Date(match.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                    return (
                      <div key={match.id} className="flex items-center gap-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-base shadow-sm flex-shrink-0`}>{meta.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 text-sm">{opponentName} challenged you!</p>
                          <p className="text-xs text-gray-500">{match.sport} · {dateStr}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptChallenge(match.id)}
                            disabled={challengeActionLoading === match.id + '_accept'}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                            {challengeActionLoading === match.id + '_accept' ? <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Accepting...</> : '✓ Accept'}
                          </button>
                          <button
                            onClick={() => handleDeclineChallenge(match.id)}
                            disabled={challengeActionLoading === match.id + '_decline'}
                            className="px-4 py-2 bg-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-300 disabled:opacity-50">
                            {challengeActionLoading === match.id + '_decline' ? 'Declining...' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {sent.map((match: any) => {
                    const meta = SPORT_META[match.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500' };
                    const opponentName = match.away_team_name || match.awayTeamName || 'Opponent';
                    const dateStr = match.created_at ? new Date(match.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                    return (
                      <div key={match.id} className="flex items-center gap-4 p-4 bg-violet-50 border-2 border-violet-200 rounded-2xl">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-base shadow-sm flex-shrink-0`}>{meta.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 text-sm">Challenge sent to {opponentName}</p>
                          <p className="text-xs text-gray-500">{match.sport} · {dateStr} · Waiting for response…</p>
                        </div>
                        <button
                          onClick={() => handleDeclineChallenge(match.id)}
                          disabled={challengeActionLoading === match.id + '_decline'}
                          className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-300 disabled:opacity-50">
                          {challengeActionLoading === match.id + '_decline' ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Match History */}
          {selectedTeam && (
            <div className="card p-6">
              <div className="section-header">
                <h2 className="section-title flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">⚔️</span>
                  Match History
                </h2>
                <button onClick={() => setShowChallenge(true)}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 transition-all shadow-sm">
                  + Challenge
                </button>
              </div>

              {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">⚔️</div>
                  <p className="font-semibold text-gray-700 mb-1">No matches yet</p>
                  <p className="text-sm text-gray-400 mb-4">Challenge another team or register for a tournament</p>
                  <button onClick={() => setShowChallenge(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-violet-700 transition-all shadow-sm">
                    ⚔️ Create Challenge Match
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').slice(0, 8).map((match: any) => {
                    const meta = SPORT_META[match.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500' };
                    const isHome = match.homeTeamId === selectedTeam.id || match.home_team_id === selectedTeam.id;
                    const hs = match.homeScore ?? match.home_score ?? 0;
                    const as_ = match.awayScore ?? match.away_score ?? 0;
                    const myScore = isHome ? hs : as_;
                    const theirScore = isHome ? as_ : hs;
                    const opponentName = isHome
                      ? (match.away_team_name || match.awayTeamName || 'Opponent')
                      : (match.home_team_name || match.homeTeamName || 'Opponent');
                    const myTeamName = isHome
                      ? (match.home_team_name || match.homeTeamName || selectedTeam.name)
                      : (match.away_team_name || match.awayTeamName || selectedTeam.name);
                    let result = '';
                    let resultColor = '';
                    if (match.status === 'COMPLETED') {
                      if (myScore > theirScore) { result = 'W'; resultColor = 'text-green-600 bg-green-100'; }
                      else if (myScore < theirScore) { result = 'L'; resultColor = 'text-rose-600 bg-rose-100'; }
                      else { result = 'D'; resultColor = 'text-gray-600 bg-gray-100'; }
                    }
                    const statusStyle = MATCH_STATUS[match.status] || MATCH_STATUS.SCHEDULED;
                    const dateStr = match.created_at
                      ? new Date(match.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'N/A';
                    const venue = match.tournament_venue || match.venue || null;
                    return (
                      <div key={match.id}
                        onClick={() => openMatchDetail(match)}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-100 hover:shadow-card transition-all cursor-pointer group">
                        {/* Sport icon */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-base shadow-sm flex-shrink-0 mt-0.5`}>
                          {meta.icon}
                        </div>
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">
                            {myTeamName} <span className="text-gray-400 font-normal">vs</span> {opponentName}
                          </p>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">{match.sport}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-xs text-gray-400">📅 {dateStr}</span>
                            {venue && <span className="text-xs text-gray-400">📍 {venue}</span>}
                          </div>
                        </div>
                        {/* Score + Result */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {match.status === 'COMPLETED' && (
                            <span className="text-sm font-black text-gray-700">{myScore}–{theirScore}</span>
                          )}
                          {result && (
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${resultColor}`}>{result}</span>
                          )}
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                  {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').length > 8 && (
                    <p className="text-xs text-center text-gray-400 pt-2">+ {matches.filter(m => m.status !== 'PENDING_ACCEPTANCE').length - 8} more matches</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Quick Actions + Sport Summary */}
        <div className="space-y-4">
          <div className="card p-6">
            <div className="section-header">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-ocean-100 flex items-center justify-center">⚡</span>
                Quick Actions
              </h2>
            </div>
            <div className="space-y-3">
              {[
                { icon: '➕', label: 'Create Team',      desc: 'Start a new team',            gradient: 'from-emerald-400 to-teal-500',  href: '/teams'       },
                { icon: '🏆', label: 'Find Tournaments', desc: 'Register your team',          gradient: 'from-violet-400 to-purple-500', href: '/tournaments' },
                { icon: '⚔️', label: 'Challenge a Team', desc: 'Create a direct match',       gradient: 'from-orange-400 to-red-500',    onClick: () => setShowChallenge(true) },
                { icon: '🎯', label: 'Manage Sports',    desc: 'Add or switch sports',        gradient: 'from-blue-400 to-indigo-500',   onClick: () => setShowAddSport(true)  },
                { icon: '⚙️', label: 'Settings',         desc: 'Update profile & team info',  gradient: 'from-gray-400 to-slate-500',    href: '/profile'     },
              ].map((action: any) => {
                const content = (
                  <div className="group flex items-center gap-3 p-3.5 rounded-2xl border-2 border-transparent hover:border-gray-200 bg-gray-50 hover:bg-white hover:shadow-card transition-all duration-200 w-full text-left">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0`}>
                      <span className="text-base">{action.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{action.label}</p>
                      <p className="text-xs text-gray-400">{action.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                );
                return action.onClick ? (
                  <button key={action.label} onClick={action.onClick} className="w-full">{content}</button>
                ) : (
                  <Link key={action.label} to={action.href}>{content}</Link>
                );
              })}
            </div>
          </div>

          {/* Active Sports summary */}
          {selectedTeam && sportProfiles.length > 0 && (
            <div className="card p-5">
              <h2 className="section-title mb-3">Active Sports</h2>
              <div className="space-y-2">
                {sportProfiles.map((sp: any) => {
                  const meta = SPORT_META[sp.sport] || { icon: '🏆', bg: 'bg-gray-50', text: 'text-gray-700' };
                  const stats = sp.statistics || sp.stats || {};
                  const isPrimary = sp.sport === selectedTeam.sport;
                  return (
                    <div key={sp.id || sp.sport} className={`flex items-center gap-3 p-3 rounded-xl ${meta.bg}`}>
                      <span className="text-lg">{meta.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${meta.text}`}>{sp.sport}</p>
                        <p className="text-xs text-gray-400">{stats.matchesPlayed || 0} played · {stats.wins || 0} wins</p>
                      </div>
                      {isPrimary && <span className="text-xs font-bold text-gray-400">Primary</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Sport Modal */}
      {showAddSport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSport(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-gray-900">Add Sport to Team</h3>
              <button onClick={() => setShowAddSport(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Add a sport that <strong>{selectedTeam?.name}</strong> plays.</p>
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Sport</label>
              <select value={addSportValue} onChange={(e) => setAddSportValue(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                {availableSports.map((s) => <option key={s} value={s}>{SPORT_META[s]?.icon} {s}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddSport(false)} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddSport} disabled={addSportLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:from-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {addSportLoading ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Adding...</> : '+ Add Sport'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Detail Modal */}
      {renderMatchDetailModal()}

      {/* Challenge Match Modal */}
      {showChallenge && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowChallenge(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-0.5">Challenge Match</p>
                <h3 className="text-xl font-black text-gray-900">{selectedTeam.name} vs ?</h3>
              </div>
              <button onClick={() => setShowChallenge(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Opponent Team *</label>
                <div className="relative">
                  <select value={challengeForm.awayTeamId} onChange={(e) => cf('awayTeamId', e.target.value)}
                    className="w-full appearance-none border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                    <option value="">Select opponent team...</option>
                    {challengeOpponents.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.sport})</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sport *</label>
                <div className="relative">
                  <select value={challengeForm.sport} onChange={(e) => cf('sport', e.target.value)}
                    className="w-full appearance-none border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                    <option value="">Select sport...</option>
                    {(sportProfiles.length > 0 ? sportProfiles : ALL_SPORTS.map((s) => ({ sport: s }))).map((sp: any) => (
                      <option key={sp.sport} value={sp.sport}>{SPORT_META[sp.sport]?.icon} {sp.sport}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Scheduled Date (Optional)</label>
                <input type="datetime-local" value={challengeForm.scheduledAt} onChange={(e) => cf('scheduledAt', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowChallenge(false)} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50">Cancel</button>
              <button onClick={handleChallenge} disabled={challengeLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold hover:from-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {challengeLoading
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating...</>
                  : '⚔️ Send Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
