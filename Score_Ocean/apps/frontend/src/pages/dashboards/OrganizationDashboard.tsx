import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

const SPORT_ICON: Record<string, string> = {
  CRICKET: '🏏', FOOTBALL: '⚽', KABADDI: '🤼', VOLLEYBALL: '🏐',
};

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ACTIVE:               { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active'               },
  UPCOMING:             { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Upcoming'             },
  REGISTRATION_OPEN:    { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Registration Open'    },
  REGISTRATION_CLOSED:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Registration Closed'  },
  ONGOING:              { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Ongoing'              },
  COMPLETED:            { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Completed'            },
  CANCELLED:            { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Cancelled'            },
  DRAFT:                { bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400',    label: 'Draft'                },
};

const getEffectiveStatusKey = (t: any): string => {
  const dbStatus = t.status || 'UPCOMING';
  const now = new Date();
  const startDate   = t.dates?.startDate   || t.startDate;
  const endDate     = t.dates?.endDate     || t.endDate;
  const regDeadline = t.dates?.registrationDeadline || t.registrationDeadline;
  if (dbStatus === 'CANCELLED' || dbStatus === 'DRAFT') return dbStatus;
  if (endDate     && now > new Date(endDate))     return 'COMPLETED';
  if (startDate   && now >= new Date(startDate))  return 'ONGOING';
  if (regDeadline && now > new Date(regDeadline)) return 'REGISTRATION_CLOSED';
  return dbStatus;
};

const QUICK_ACTIONS = [
  { to: '/tournaments', icon: '🏆', label: 'Create Tournament',    desc: 'Host a new event',           gradient: 'from-violet-400 to-purple-500' },
  { to: '/tournaments', icon: '👥', label: 'Manage Teams',         desc: 'View registrations',         gradient: 'from-blue-400 to-indigo-500'   },
  { to: '/tournaments', icon: '📊', label: 'View Analytics',       desc: 'Stats & insights',           gradient: 'from-amber-400 to-orange-500'  },
  { to: '/profile',     icon: '⚙️', label: 'Organization Profile', desc: 'Update org details',         gradient: 'from-gray-400 to-slate-500'    },
];

export default function OrganizationDashboard() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [tournamentsRes, profileRes] = await Promise.allSettled([
        apiClient.get('/tournaments'),
        apiClient.get('/users/profile'),
      ]);

      if (tournamentsRes.status === 'fulfilled') {
        const list = tournamentsRes.value.data?.data || tournamentsRes.value.data || [];
        setTournaments(Array.isArray(list) ? list : []);
      }
      if (profileRes.status === 'fulfilled') {
        const pName = profileRes.value.data?.profile?.name || profileRes.value.data?.name || '';
        if (pName) setProfileName(pName);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const activeTournaments  = tournaments.filter((t: any) =>
    ['ACTIVE', 'IN_PROGRESS', 'REGISTRATION_OPEN', 'FIXTURES_PUBLISHED'].includes(t.status)
  ).length;
  const totalRegistrations = tournaments.reduce((s: number, t: any) =>
    s + (t.registrations?.length || t.currentTeams || 0), 0);
  const totalRevenue       = tournaments.reduce((s: number, t: any) =>
    s + (t.registrationFee || 0) * (t.registrations?.length || t.currentTeams || 0), 0);
  const name = profileName || user?.name || user?.email?.split('@')[0] || 'Organization';
  const myTournaments = tournaments.filter((t: any) =>
    t.host_id === user?.id || t.hostId === user?.id
  );
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700 p-8 text-white">
        <div className="absolute inset-0">
          <div className="absolute w-64 h-64 rounded-full opacity-10 bg-white -top-16 -right-16 animate-float" />
          <div className="absolute w-40 h-40 rounded-full opacity-10 bg-white bottom-0 left-1/4 animate-float-delay" />
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-violet-200 text-sm font-medium mb-1">{greeting} 👋</p>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>{name}</h1>
            <p className="text-violet-100 max-w-md">Host tournaments, manage registrations, and grow the sports ecosystem.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/tournaments"
              className="px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white rounded-xl text-sm font-semibold transition-all hover:scale-105">
              View Tournaments
            </Link>
            <Link to="/tournaments"
              className="px-5 py-2.5 bg-white text-violet-700 rounded-xl text-sm font-bold hover:bg-violet-50 transition-all hover:scale-105 shadow-lg">
              + Create Event
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🏆', label: 'Total Tournaments',  value: tournaments.length,   gradient: 'from-violet-500 to-purple-600',  text: 'text-violet-600' },
          { icon: '⚡', label: 'Active Events',       value: activeTournaments,    gradient: 'from-emerald-500 to-teal-600',   text: 'text-emerald-600' },
          { icon: '📝', label: 'Registrations',       value: totalRegistrations,   gradient: 'from-blue-500 to-indigo-600',    text: 'text-blue-600' },
          { icon: '💰', label: 'Total Revenue',        value: `₹${(totalRevenue/1000).toFixed(1)}K`, gradient: 'from-amber-500 to-orange-600', text: 'text-amber-600' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tournaments List */}
        <div className="lg:col-span-2 card p-6">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">🏆</span>
              My Tournaments
            </h2>
            <Link to="/tournaments"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm">
              + Create New
            </Link>
          </div>

          {tournaments.length > 0 ? (
            <div className="space-y-3">
              {(myTournaments.length > 0 ? myTournaments : tournaments).slice(0, 6).map((t: any) => {
                const statusKey = getEffectiveStatusKey(t);
                const s = STATUS_STYLE[statusKey] || STATUS_STYLE.UPCOMING;
                const regs = t.registrations?.length || t.currentTeams || 0;
                const cap  = t.teamCapacity || t.maxTeams || '—';
                const startDate = t.dates?.startDate || t.startDate;
                return (
                  <div key={t.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 border-transparent hover:border-violet-200 bg-gray-50 hover:bg-white transition-all hover:shadow-card">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                      {SPORT_ICON[t.sport] || '🏆'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 truncate">{t.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${s.bg} ${s.text} text-xs font-semibold`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {t.sport} · {regs}/{cap} teams
                        {startDate ? ` · ${new Date(startDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}` : ''}
                      </p>
                    </div>
                    <Link to={`/tournaments/${t.id}/manage`}
                      className="px-4 py-2 bg-violet-50 text-violet-700 text-sm font-bold rounded-xl hover:bg-violet-100 transition-colors flex-shrink-0">
                      Manage
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">🏆</div>
              <p className="font-semibold text-gray-700 mb-1">No tournaments yet</p>
              <p className="text-sm text-gray-400 mb-4">Create your first tournament to start accepting registrations</p>
              <Link to="/tournaments"
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-violet-700 transition-all shadow-sm">
                Create Tournament
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
          <div className="space-y-3">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.label} to={action.to}
                className="group flex items-center gap-3 p-3.5 rounded-2xl border-2 border-transparent hover:border-gray-200 bg-gray-50 hover:bg-white hover:shadow-card transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
                  <span className="text-base">{action.icon}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-400">{action.desc}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
