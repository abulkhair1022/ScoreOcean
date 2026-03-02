import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

const SPORT_META: Record<string, { icon: string; gradient: string; bg: string; text: string }> = {
  CRICKET:    { icon: '🏏', gradient: 'from-green-500 to-emerald-600',  bg: 'bg-green-50',  text: 'text-green-700' },
  FOOTBALL:   { icon: '⚽', gradient: 'from-blue-500 to-indigo-600',    bg: 'bg-blue-50',   text: 'text-blue-700' },
  KABADDI:    { icon: '🤼', gradient: 'from-amber-500 to-orange-600',   bg: 'bg-amber-50',  text: 'text-amber-700' },
  VOLLEYBALL: { icon: '🏐', gradient: 'from-rose-500 to-pink-600',      bg: 'bg-rose-50',   text: 'text-rose-700' },
};

const QUICK_ACTIONS = [
  { to: '/teams',       icon: '🛡️', label: 'My Teams',     desc: 'View & manage teams',    gradient: 'from-emerald-400 to-teal-500' },
  { to: '/tournaments', icon: '🏆', label: 'Tournaments',  desc: 'Browse & register',      gradient: 'from-violet-400 to-purple-500' },
  { to: '/stats',       icon: '📊', label: 'My Stats',     desc: 'Performance analytics',  gradient: 'from-ocean-400 to-cyan-500' },
  { to: '/profile',     icon: '👤', label: 'Edit Profile', desc: 'Update your info',        gradient: 'from-rose-400 to-pink-500' },
];

interface DashboardStats {
  sportProfiles: any[];
  totalMatches: number;
  totalTeams: number;
  totalTournaments: number;
}

export default function PlayerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [profileRes, teamsRes] = await Promise.allSettled([
        apiClient.get('/users/profile'),
        apiClient.get('/teams'),
      ]);

      const u = profileRes.status === 'fulfilled' ? profileRes.value.data : {};
      const pName = u?.profile?.name || u?.name || '';
      if (pName) setProfileName(pName);
      const teamsData = teamsRes.status === 'fulfilled'
        ? (teamsRes.value.data?.data || teamsRes.value.data || [])
        : [];

      // Fetch invitations using the user id from profile
      const userId = u.id || u.userId;
      if (userId) {
        try {
          const invRes = await apiClient.get(`/teams/invitations/player/${userId}`);
          setInvitations(invRes.data?.data || invRes.data || []);
        } catch { setInvitations([]); }
      }

      setStats({
        sportProfiles: u.sportProfiles || [],
        totalMatches: 0,
        totalTeams: Array.isArray(teamsData) ? teamsData.length : 0,
        totalTournaments: 0,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setActionLoading(invitationId + '_accept');
      await apiClient.post(`/teams/invitations/${invitationId}/accept`);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setActionLoading(invitationId + '_decline');
      await apiClient.post(`/teams/invitations/${invitationId}/decline`);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const name = profileName || user?.name || user?.email?.split('@')[0] || 'Player';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-ocean-600 p-8 text-white">
        <div className="absolute inset-0">
          <div className="absolute w-64 h-64 rounded-full opacity-10 bg-white -top-16 -right-16 animate-float" />
          <div className="absolute w-40 h-40 rounded-full opacity-10 bg-white bottom-0 left-1/3 animate-float-delay" />
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-primary-200 text-sm font-medium mb-1">{greeting} 👋</p>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              {name}
            </h1>
            <p className="text-primary-100 max-w-md">
              Track your performance, manage teams, and compete in tournaments.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/profile"
              className="px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105">
              Edit Profile
            </Link>
            <Link to="/tournaments"
              className="px-5 py-2.5 bg-white text-primary-700 rounded-xl text-sm font-bold hover:bg-primary-50 transition-all hover:scale-105 shadow-lg">
              Find Tournaments
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🏅', label: 'Sport Profiles', value: stats?.sportProfiles.length ?? 0, gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600' },
          { icon: '⚡', label: 'Matches Played', value: stats?.totalMatches ?? 0, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600' },
          { icon: '🛡️', label: 'Teams',          value: stats?.totalTeams ?? 0, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { icon: '🏆', label: 'Tournaments',    value: stats?.totalTournaments ?? 0, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
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

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="card p-6">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">📩</span>
              Team Invitations
              <span className="w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {invitations.length}
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl hover:border-amber-300 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-sm">
                  🛡️
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{inv.teamName || 'Team Invitation'}</p>
                  <p className="text-sm text-gray-500">You've been invited to join {inv.teamName ? <span className="font-semibold text-amber-700">{inv.teamName}</span> : 'a team'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvitation(inv.id)}
                    disabled={actionLoading === inv.id + '_accept'}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                    {actionLoading === inv.id + '_accept' ? (
                      <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Accepting...</>
                    ) : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(inv.id)}
                    disabled={actionLoading === inv.id + '_decline'}
                    className="px-4 py-2 bg-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {actionLoading === inv.id + '_decline' ? (
                      <><div className="w-3 h-3 rounded-full border-2 border-gray-400/30 border-t-gray-600 animate-spin" />Declining...</>
                    ) : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sport Profiles */}
        <div className="card p-6">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">🎯</span>
              Sport Profiles
            </h2>
            <Link to="/stats" className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline">
              View all →
            </Link>
          </div>

          {stats?.sportProfiles && stats.sportProfiles.length > 0 ? (
            <div className="space-y-3">
              {stats.sportProfiles.map((profile: any) => {
                const meta = SPORT_META[profile.sport] || SPORT_META.FOOTBALL;
                return (
                  <div key={profile.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-transparent hover:border-gray-200 ${meta.bg} transition-all hover:scale-[1.01]`}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-xl shadow-sm`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold ${meta.text}`}>{profile.sport}</p>
                      <p className="text-xs text-gray-500">Tap to view statistics</p>
                    </div>
                    <Link to="/stats" className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${meta.gradient} text-white text-xs font-bold hover:opacity-90 transition-opacity`}>
                      Stats →
                    </Link>
                  </div>
                );
              })}
              <Link to="/profile"
                className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-all text-sm font-medium">
                + Add another sport
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">🏅</div>
              <p className="font-semibold text-gray-700 mb-1">No sport profiles yet</p>
              <p className="text-sm text-gray-400 mb-4">Add a sport to start tracking your performance</p>
              <Link to="/profile"
                className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-bold rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all shadow-sm">
                Add Sport Profile
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-ocean-100 flex items-center justify-center">⚡</span>
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-gray-200 bg-gray-50 hover:bg-white hover:shadow-card transition-all duration-200"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  {action.icon}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-400">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
