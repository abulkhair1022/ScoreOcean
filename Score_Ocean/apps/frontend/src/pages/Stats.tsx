import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';

const SPORT_META: Record<string, { icon: string; gradient: string; bg: string; text: string; border: string; color: string }> = {
  CRICKET:    { icon: '🏏', gradient: 'from-green-500 to-emerald-600',  bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  color: '#10b981' },
  FOOTBALL:   { icon: '⚽', gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   color: '#6366f1' },
  KABADDI:    { icon: '🤼', gradient: 'from-amber-500 to-orange-600',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  color: '#f59e0b' },
  VOLLEYBALL: { icon: '🏐', gradient: 'from-rose-500 to-pink-600',     bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',   color: '#f43f5e' },
  BASKETBALL: { icon: '🏀', gradient: 'from-orange-500 to-red-600',    bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200', color: '#f97316' },
  BADMINTON:  { icon: '🏸', gradient: 'from-teal-500 to-cyan-600',     bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',   color: '#14b8a6' },
};

interface SportProfile {
  id: string;
  sport: string;
  statistics: Record<string, any>;
  createdAt: string;
}

function Stats() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sportProfiles, setSportProfiles] = useState<SportProfile[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // Team-specific stats
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamSports, setTeamSports] = useState<any[]>([]);
  const [teamMatches, setTeamMatches] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (!storedUser || !accessToken) { navigate('/login'); return; }
    const parsed = JSON.parse(storedUser);
    setUser(parsed);
    if (parsed.role === 'ORGANIZATION') {
      fetchOrgStats();
    } else if (parsed.role === 'TEAM') {
      fetchTeamStats();
    } else {
      fetchStats();
    }
  }, [navigate]);

  const fetchOrgStats = async () => {
    try {
      setLoading(true);
      const r = await apiClient.get('/tournaments');
      const list = r.data?.data || r.data || [];
      setTournaments(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load stats');
    } finally { setLoading(false); }
  };

  const fetchTeamStats = async () => {
    try {
      setLoading(true);
      const r = await apiClient.get('/teams');
      const teams = r.data?.data || r.data || [];
      setMyTeams(Array.isArray(teams) ? teams : []);
      if (teams.length > 0) {
        await loadTeamStatsDetail(teams[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team stats');
    } finally { setLoading(false); }
  };

  const loadTeamStatsDetail = async (team: any) => {
    setSelectedTeam(team);
    try {
      const [sportsRes, matchesRes] = await Promise.allSettled([
        apiClient.get(`/teams/${team.id}/sports`),
        apiClient.get(`/matches/team/${team.id}`),
      ]);
      if (sportsRes.status === 'fulfilled') setTeamSports(sportsRes.value.data?.data || sportsRes.value.data || []);
      if (matchesRes.status === 'fulfilled') {
        const ml = matchesRes.value.data?.data || matchesRes.value.data || [];
        setTeamMatches(Array.isArray(ml) ? ml : []);
      }
    } catch { /* ignore */ }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Sync stats from match history into sport_profiles before reading them
      try { await apiClient.post('/cricket-stats/recalculate'); } catch { /* ignore */ }
      const r = await apiClient.get('/users/profile');
      const profiles = r.data.sportProfiles || [];
      setSportProfiles(profiles);
      if (profiles.length > 0) setActiveProfile(profiles[0].id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
            <p className="text-gray-500 text-sm">Loading stats...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalSportsTracked = sportProfiles.length;
  const totalStatEntries = sportProfiles.reduce((acc, sp) => acc + Object.keys(sp.statistics || {}).length, 0);
  const displayName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'Athlete';

  const currentProfile = sportProfiles.find(sp => sp.id === activeProfile) || sportProfiles[0];

  // ── Team stats view ──────────────────────────────────────────────────────
  if (user?.role === 'TEAM') {
    const completedMatches = teamMatches.filter((m: any) => m.status === 'COMPLETED');
    const wins = completedMatches.filter((m: any) => {
      const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
      const hs = m.homeScore ?? m.home_score ?? 0;
      const as_ = m.awayScore ?? m.away_score ?? 0;
      return (isHome && hs > as_) || (!isHome && as_ > hs);
    }).length;
    const losses = completedMatches.filter((m: any) => {
      const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
      const hs = m.homeScore ?? m.home_score ?? 0;
      const as_ = m.awayScore ?? m.away_score ?? 0;
      return (isHome && hs < as_) || (!isHome && as_ < hs);
    }).length;
    const draws = completedMatches.length - wins - losses;
    const teamName = selectedTeam?.name || user?.name || 'Team';

    const chartData = teamSports.map((sp: any) => {
      const stats = sp.statistics || sp.stats || {};
      return { name: sp.sport.charAt(0) + sp.sport.slice(1).toLowerCase(), Played: stats.matchesPlayed || 0, Wins: stats.wins || 0 };
    });

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-8 text-white">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="absolute w-48 h-48 rounded-full opacity-10 bg-white -top-12 -right-12 animate-float" />
            <div className="relative z-10">
              <p className="text-emerald-200 text-sm font-medium mb-1">Team Performance</p>
              <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{teamName}'s Stats</h1>
              <p className="text-emerald-100 max-w-lg">Track your team's match performance and sport profiles.</p>
            </div>
          </div>

          {/* Team selector */}
          {myTeams.length > 1 && (
            <div className="card p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Team</p>
              <div className="flex gap-2 flex-wrap">
                {myTeams.map((t: any) => {
                  const meta = SPORT_META[t.sport] || { bg: 'bg-gray-50', text: 'text-gray-700', icon: '🛡️', gradient: 'from-gray-400 to-slate-500', border: 'border-gray-200', color: '' };
                  return (
                    <button key={t.id} onClick={() => loadTeamStatsDetail(t)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        selectedTeam?.id === t.id ? `${meta.bg} ${meta.text} border-current` : 'bg-gray-50 text-gray-600 border-transparent hover:border-gray-200'
                      }`}>
                      <span>{meta.icon}</span> {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '⚔️', label: 'Matches Played', value: completedMatches.length, gradient: 'from-violet-500 to-purple-600', text: 'text-violet-600' },
              { icon: '🏆', label: 'Wins',           value: wins,                    gradient: 'from-green-500 to-emerald-600', text: 'text-green-600'  },
              { icon: '❌', label: 'Losses',          value: losses,                  gradient: 'from-rose-500 to-red-600',     text: 'text-rose-600'   },
              { icon: '🤝', label: 'Draws',           value: draws,                   gradient: 'from-amber-500 to-orange-600', text: 'text-amber-600'  },
            ].map((s) => (
              <div key={s.label} className="card-hover p-5">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-xl mb-3 shadow-sm`}>{s.icon}</div>
                <div className={`text-3xl font-black ${s.text} mb-0.5`}>{s.value}</div>
                <div className="text-sm text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {error && <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl"><p className="text-rose-700 font-medium text-sm">{error}</p></div>}

          {/* W/L/D Pie chart */}
          {completedMatches.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title mb-5">Win / Loss / Draw</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Wins',   value: wins   || 0 },
                      { name: 'Losses', value: losses || 0 },
                      { name: 'Draws',  value: draws  || 0 },
                    ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                      <Cell fill="#9ca3af" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 flex-1">
                  {[
                    { label: 'Wins',   value: wins,   color: 'bg-emerald-500', pct: completedMatches.length ? Math.round((wins   / completedMatches.length) * 100) : 0 },
                    { label: 'Losses', value: losses, color: 'bg-rose-500',    pct: completedMatches.length ? Math.round((losses / completedMatches.length) * 100) : 0 },
                    { label: 'Draws',  value: draws,  color: 'bg-gray-400',    pct: completedMatches.length ? Math.round((draws  / completedMatches.length) * 100) : 0 },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1"><span>{s.label}</span><span>{s.value} ({s.pct}%)</span></div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 pt-1">{completedMatches.length} completed match{completedMatches.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sport Profiles */}
          {teamSports.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title mb-5">Sport Profiles</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {teamSports.map((sp: any) => {
                  const meta = SPORT_META[sp.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', color: '#6366f1' };
                  const stats = sp.statistics || sp.stats || {};
                  const isPrimary = sp.sport === selectedTeam?.sport;
                  return (
                    <div key={sp.id || sp.sport} className={`p-4 rounded-2xl border-2 ${isPrimary ? `${meta.bg} border-current` : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-xl shadow-sm mb-3`}>{meta.icon}</div>
                      <p className={`font-bold text-sm ${isPrimary ? meta.text : 'text-gray-800'}`}>{sp.sport}</p>
                      {isPrimary && <p className="text-xs text-gray-400 mb-2">Primary</p>}
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">{stats.matchesPlayed || 0} played</p>
                        <p className="text-xs text-gray-500">{stats.wins || 0} wins · {stats.losses || 0} losses</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Win/Loss chart */}
          {chartData.length > 0 && chartData.some((d) => d.Played > 0 || d.Wins > 0) && (
            <div className="card p-6">
              <h2 className="section-title mb-5">Performance by Sport</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 8 }} />
                  <Bar dataKey="Played" fill="#d1fae5" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Wins" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly match activity line chart */}
          {(() => {
            if (teamMatches.length < 2) return null;
            const byMonth: Record<string, { played: number; won: number }> = {};
            teamMatches.forEach((m: any) => {
              if (!m.created_at) return;
              const key = new Date(m.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
              if (!byMonth[key]) byMonth[key] = { played: 0, won: 0 };
              byMonth[key].played += 1;
              if (m.status === 'COMPLETED') {
                const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
                const hs = m.homeScore ?? m.home_score ?? 0;
                const as_ = m.awayScore ?? m.away_score ?? 0;
                if ((isHome && hs > as_) || (!isHome && as_ > hs)) byMonth[key].won += 1;
              }
            });
            const lineData = Object.entries(byMonth).reverse().map(([month, v]) => ({ month, ...v }));
            if (lineData.length < 2) return null;
            return (
              <div className="card p-6">
                <h2 className="section-title mb-5">Match Activity</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={lineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="played" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} name="Played" />
                    <Line type="monotone" dataKey="won"    stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Won" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* Recent Match History */}
          {teamMatches.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title mb-4">Recent Matches</h2>
              <div className="space-y-3">
                {teamMatches.slice(0, 10).map((m: any) => {
                  const meta = SPORT_META[m.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', color: '' };
                  const isHome = m.homeTeamId === selectedTeam?.id || m.home_team_id === selectedTeam?.id;
                  const hs = m.homeScore ?? m.home_score ?? 0;
                  const as_ = m.awayScore ?? m.away_score ?? 0;
                  const myScore = isHome ? hs : as_;
                  const theirScore = isHome ? as_ : hs;
                  const opponentName = isHome
                    ? (m.away_team_name || m.awayTeamName || 'Opponent')
                    : (m.home_team_name || m.homeTeamName || 'Opponent');
                  const myTeamName = isHome
                    ? (m.home_team_name || m.homeTeamName || selectedTeam?.name)
                    : (m.away_team_name || m.awayTeamName || selectedTeam?.name);
                  const venue = m.tournament_venue || m.venue || null;
                  let result = ''; let resultColor = '';
                  if (m.status === 'COMPLETED') {
                    if (myScore > theirScore) { result = 'W'; resultColor = 'text-green-600 bg-green-100'; }
                    else if (myScore < theirScore) { result = 'L'; resultColor = 'text-rose-600 bg-rose-100'; }
                    else { result = 'D'; resultColor = 'text-gray-600 bg-gray-100'; }
                  }
                  return (
                    <div key={m.id}
                      onClick={() => navigate(`/matches/${m.id}`)}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-100 hover:shadow-card transition-all cursor-pointer group">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-sm shadow-sm flex-shrink-0 mt-0.5`}>{meta.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">
                          {myTeamName} <span className="font-normal text-gray-400">vs</span> {opponentName}
                        </p>
                        <p className="text-xs font-semibold text-gray-500">{m.sport}</p>
                        <div className="flex items-center gap-3 flex-wrap mt-0.5">
                          <span className="text-xs text-gray-400">📅 {m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                          {venue && <span className="text-xs text-gray-400">📍 {venue}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {m.status === 'COMPLETED' && <span className="text-sm font-black text-gray-700">{myScore}–{theirScore}</span>}
                        {result && <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${resultColor}`}>{result}</span>}
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${m.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' : m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                          {m.status === 'COMPLETED' ? 'Done' : m.status === 'IN_PROGRESS' ? 'Live' : 'Scheduled'}
                        </span>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {teamMatches.length === 0 && teamSports.length === 0 && !error && (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">📊</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No stats yet</h3>
              <p className="text-gray-500 mb-6">Add sports to your team and play matches to see stats here.</p>
              <Link to="/teams" className="inline-flex px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-700 transition-all shadow-sm">
                Manage Teams →
              </Link>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Organisation stats view ──────────────────────────────────────────────
  if (user?.role === 'ORGANIZATION' || user?.role === 'TEAM') {
    const activeTournaments  = tournaments.filter((t: any) => ['ACTIVE','IN_PROGRESS','REGISTRATION_OPEN'].includes(t.status)).length;
    const totalRegistrations = tournaments.reduce((s: number, t: any) => s + (t.registrations?.length || t.currentTeams || 0), 0);
    const totalRevenue       = tournaments.reduce((s: number, t: any) =>
      s + (t.registrationFee || 0) * (t.registrations?.length || t.currentTeams || 0), 0);
    const chartData = tournaments.slice(0, 8).map((t: any) => ({
      name: t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name,
      Registrations: t.registrations?.length || t.currentTeams || 0,
      Capacity: t.teamCapacity || t.maxTeams || 0,
    }));
    const orgName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'Organization';

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700 p-8 text-white">
            <div className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="absolute w-48 h-48 rounded-full opacity-10 bg-white -top-12 -right-12 animate-float" />
            <div className="relative z-10">
              <p className="text-violet-200 text-sm font-medium mb-1">Organisation Dashboard</p>
              <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{orgName}'s Stats</h1>
              <p className="text-violet-100 max-w-lg">Overview of tournaments hosted, registrations and revenue.</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🏆', label: 'Tournaments Hosted', value: tournaments.length,  gradient: 'from-violet-500 to-purple-600', text: 'text-violet-600' },
              { icon: '⚡', label: 'Active Events',       value: activeTournaments,   gradient: 'from-emerald-500 to-teal-600',  text: 'text-emerald-600' },
              { icon: '📝', label: 'Total Registrations', value: totalRegistrations,  gradient: 'from-blue-500 to-indigo-600',   text: 'text-blue-600' },
              { icon: '💰', label: 'Total Revenue',        value: `₹${(totalRevenue/1000).toFixed(1)}K`, gradient: 'from-amber-500 to-orange-600', text: 'text-amber-600' },
            ].map((s) => (
              <div key={s.label} className="card-hover p-5">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-xl mb-3 shadow-sm`}>{s.icon}</div>
                <div className={`text-3xl font-black ${s.text} mb-0.5`}>{s.value}</div>
                <div className="text-sm text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <p className="text-rose-700 font-medium text-sm">{error}</p>
            </div>
          )}

          {tournaments.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">🏆</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No tournaments hosted yet</h3>
              <p className="text-gray-500 mb-6">Create your first tournament to see stats here.</p>
              <Link to="/tournaments"
                className="inline-flex px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-violet-700 transition-all shadow-sm">
                Go to Tournaments →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Registrations bar chart */}
              {chartData.length > 0 && (
                <div className="card p-6">
                  <h2 className="section-title mb-5">Registrations per Tournament</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 8 }} />
                      <Bar dataKey="Registrations" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Capacity" fill="#e9d5ff" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tournament table */}
              <div className="card p-6">
                <h2 className="section-title mb-4">All Tournaments</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Name', 'Sport', 'Format', 'Status', 'Registrations', 'Fee'].map((h) => (
                          <th key={h} className="text-left py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tournaments.map((t: any) => {
                        const regs = t.registrations?.length || t.currentTeams || 0;
                        const cap  = t.teamCapacity || t.maxTeams || '—';
                        return (
                          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 font-semibold text-gray-900 max-w-[140px] truncate">{t.name}</td>
                            <td className="py-3 px-2 text-gray-500">{t.sport}</td>
                            <td className="py-3 px-2 text-gray-500">{t.format}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                t.status === 'REGISTRATION_OPEN' ? 'bg-emerald-100 text-emerald-700' :
                                t.status === 'IN_PROGRESS'       ? 'bg-blue-100 text-blue-700' :
                                t.status === 'COMPLETED'         ? 'bg-gray-100 text-gray-600' :
                                'bg-violet-100 text-violet-700'
                              }`}>{t.status?.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="py-3 px-2 text-gray-700 font-semibold">{regs}/{cap}</td>
                            <td className="py-3 px-2 text-gray-700">{t.registrationFee ? `₹${t.registrationFee}` : 'Free'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }
  // ── End org view ────────────────────────────────────────────────────────



  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-cyan-600 p-8 text-white">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute w-48 h-48 rounded-full opacity-10 bg-white -top-12 -right-12 animate-float" />
          <div className="relative z-10">
            <p className="text-primary-200 text-sm font-medium mb-1">Performance Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{displayName}'s Stats</h1>
            <p className="text-primary-100 max-w-lg">Track your athletic performance and progress across all sports you play.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: '🏅', label: 'Sports Tracked', value: totalSportsTracked, gradient: 'from-primary-500 to-indigo-600', text: 'text-primary-600' },
            { icon: '📊', label: 'Stats Recorded', value: totalStatEntries,   gradient: 'from-emerald-500 to-teal-600',   text: 'text-emerald-600' },
            { icon: '🏆', label: 'Tournaments',     value: 0,                  gradient: 'from-violet-500 to-purple-600',  text: 'text-violet-600' },
          ].map((s) => (
            <div key={s.label} className="card-hover p-5">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-xl mb-3 shadow-sm`}>{s.icon}</div>
              <div className={`text-3xl font-black ${s.text} mb-0.5`}>{s.value}</div>
              <div className="text-sm text-gray-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <p className="text-rose-700 font-medium text-sm">{error}</p>
          </div>
        )}

        {sportProfiles.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl mx-auto mb-4">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No sport profiles yet</h3>
            <p className="text-gray-500 mb-6">Add sports to your profile to start tracking your performance statistics.</p>
            <Link to="/profile"
              className="inline-flex px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-primary-700 transition-all shadow-sm">
              Go to Profile →
            </Link>
          </div>
        ) : (
          <>
            {/* Multi-sport overview (only if 2+ sports) */}
            {sportProfiles.length >= 2 && (() => {
              const overviewData = sportProfiles.map((sp) => ({
                name: sp.sport.charAt(0) + sp.sport.slice(1).toLowerCase(),
                Stats: Object.keys(sp.statistics || {}).length,
                Value: Object.values(sp.statistics || {}).reduce((s: number, v: any) => s + (parseFloat(String(v)) || 0), 0),
              }));
              return (
                <div className="card p-6">
                  <h2 className="section-title mb-5">Sports Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Stats Tracked per Sport</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={overviewData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 8 }} />
                          <Bar dataKey="Stats" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Distribution</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={overviewData.filter(d => d.Stats > 0)} cx="50%" cy="50%" outerRadius={65} dataKey="Stats" nameKey="name" paddingAngle={3}>
                            {overviewData.map((_, i) => (
                              <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#f97316', '#14b8a6'][i % 6]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sport Selector Sidebar */}
            <div className="card p-5">
              <h2 className="section-title mb-4">Your Sports</h2>
              <div className="space-y-2">
                {sportProfiles.map((sp) => {
                  const meta = SPORT_META[sp.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
                  const isActive = sp.id === activeProfile;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => setActiveProfile(sp.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                        isActive ? `${meta.border} ${meta.bg}` : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200'
                      }`}>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isActive ? meta.text : 'text-gray-800'}`}>{sp.sport}</p>
                        <p className="text-xs text-gray-400">{Object.keys(sp.statistics || {}).length} stats</p>
                      </div>
                      {isActive && (
                        <div className={`w-2 h-2 rounded-full ml-auto flex-shrink-0 bg-gradient-to-br ${meta.gradient}`} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link to="/profile" className="flex items-center gap-2 text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                  <span>+ Add Sport</span>
                </Link>
              </div>
            </div>

            {/* Stats Detail Panel */}
            <div className="lg:col-span-2 space-y-4">
              {currentProfile ? (() => {
                const meta = SPORT_META[currentProfile.sport] || { icon: '🏆', gradient: 'from-gray-400 to-slate-500', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', color: '#6366f1' };
                const stats = Object.entries(currentProfile.statistics || {});
                return (
                  <>
                    <div className={`card p-6 border-l-4 ${meta.border}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-2xl shadow-sm`}>
                          {meta.icon}
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>{currentProfile.sport}</h2>
                          <p className="text-sm text-gray-400">
                            Tracking since {new Date(currentProfile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {stats.length > 0 ? (() => {
                        const numericStats = stats.filter(([, v]) => !isNaN(parseFloat(String(v))));
                        const chartData = numericStats.map(([key, value]) => ({
                          name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                          value: parseFloat(String(value)),
                        }));
                        const barColor = meta.color || '#6366f1';
                        return (
                          <div className="space-y-5">
                            {chartData.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Performance Chart</p>
                                <ResponsiveContainer width="100%" height={180}>
                                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px', padding: '8px 12px' }}
                                      cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 8 }}
                                    />
                                    <Bar dataKey="value" fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={48} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              {stats.map(([key, value]) => (
                                <div key={key} className={`p-3 rounded-2xl ${meta.bg}`}>
                                  <p className="text-xs text-gray-400 capitalize mb-0.5">{key.replace(/_/g, ' ')}</p>
                                  <p className={`text-xl font-black ${meta.text}`}>{String(value)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })() : (
                        <div className={`rounded-2xl ${meta.bg} p-6 text-center`}>
                          <p className={`text-sm font-semibold ${meta.text}`}>No stats recorded yet</p>
                          <p className="text-xs text-gray-400 mt-1">Play matches to start building your stats</p>
                        </div>
                      )}
                    </div>

                    {/* Quick nav to find tournaments */}
                    <div className="card p-5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">Ready to compete?</p>
                        <p className="text-sm text-gray-500">Find {currentProfile.sport.toLowerCase()} tournaments near you</p>
                      </div>
                      <Link to="/tournaments"
                        className={`px-5 py-2.5 bg-gradient-to-r ${meta.gradient} text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm flex-shrink-0`}>
                        Find Tournaments →
                      </Link>
                    </div>
                  </>
                );
              })() : null}
            </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Stats;
