import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

const SPORT_ICON: Record<string, string> = {
  CRICKET: '🏏', FOOTBALL: '⚽', KABADDI: '🤼', VOLLEYBALL: '🏐',
};

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ACTIVE:              { bg: 'rgba(0,180,216,0.1)',    text: '#00b4d8', dot: '#00b4d8', label: 'Active'              },
  UPCOMING:            { bg: 'rgba(144,224,239,0.1)',  text: '#90e0ef', dot: '#90e0ef', label: 'Upcoming'            },
  REGISTRATION_OPEN:   { bg: 'rgba(0,180,216,0.1)',    text: '#00b4d8', dot: '#00b4d8', label: 'Registration Open'   },
  REGISTRATION_CLOSED: { bg: 'rgba(0,119,182,0.1)',    text: '#0077b6', dot: '#0077b6', label: 'Registration Closed' },
  ONGOING:             { bg: 'rgba(0,180,216,0.1)',    text: '#00b4d8', dot: '#00b4d8', label: 'Ongoing'             },
  COMPLETED:           { bg: 'rgba(248,250,252,0.06)', text: 'rgba(248,250,252,0.4)', dot: 'rgba(248,250,252,0.3)', label: 'Completed' },
  CANCELLED:           { bg: 'rgba(239,68,68,0.1)',    text: '#fca5a5', dot: '#ef4444', label: 'Cancelled'           },
  DRAFT:               { bg: 'rgba(248,250,252,0.05)', text: 'rgba(248,250,252,0.3)', dot: 'rgba(248,250,252,0.25)', label: 'Draft' },
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
  { to: '/tournaments', icon: '🏆', label: 'Create Tournament',    desc: 'Host a new event',    accent: '#00b4d8', border: 'rgba(0,180,216,0.25)',    bg: 'rgba(0,180,216,0.07)'   },
  { to: '/tournaments', icon: '👥', label: 'Manage Teams',         desc: 'View registrations',  accent: '#90e0ef', border: 'rgba(144,224,239,0.25)',  bg: 'rgba(144,224,239,0.07)' },
  { to: '/tournaments', icon: '📊', label: 'View Analytics',       desc: 'Stats & insights',    accent: '#48cae4', border: 'rgba(72,202,228,0.25)',   bg: 'rgba(72,202,228,0.07)'  },
  { to: '/profile',     icon: '⚙️', label: 'Org Profile',          desc: 'Update org details',  accent: '#0077b6', border: 'rgba(0,119,182,0.3)',     bg: 'rgba(0,119,182,0.07)'   },
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,180,216,0.2)', borderTopColor: '#00b4d8', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'rgba(248,250,252,0.45)', fontSize: 13, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeTournaments  = tournaments.filter((t: any) =>
    ['ACTIVE', 'IN_PROGRESS', 'REGISTRATION_OPEN', 'FIXTURES_PUBLISHED'].includes(t.status)
  ).length;
  const totalRegistrations = tournaments.reduce((s: number, t: any) => s + (t.registrations?.length || t.currentTeams || 0), 0);
  const totalRevenue       = tournaments.reduce((s: number, t: any) => s + (t.registrationFee || 0) * (t.registrations?.length || t.currentTeams || 0), 0);
  const name = profileName || user?.name || user?.email?.split('@')[0] || 'Organization';
  const myTournaments = tournaments.filter((t: any) => t.host_id === user?.id || t.hostId === user?.id);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes float  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

        .od-space { display:flex; flex-direction:column; gap:16px; }

        .od-hero {
          position:relative; overflow:hidden; border-radius:18px;
          padding:40px 36px;
          background-color:#020817;
          background-image:
            radial-gradient(ellipse 80% 80% at 0% 0%, rgba(3,4,94,0.6) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,180,216,0.18) 0%, transparent 60%);
          border:1px solid rgba(0,180,216,0.2);
          animation:fadeUp 0.4s ease both;
        }
        .od-hero-grid {
          position:absolute; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px);
          background-size:40px 40px;
        }
        .od-hero-orb-1 {
          position:absolute; width:220px; height:220px; border-radius:50%;
          background:radial-gradient(circle, rgba(3,4,94,0.5) 0%, transparent 70%);
          top:-60px; right:-40px; filter:blur(50px); pointer-events:none;
          animation:float 5s ease-in-out infinite;
        }
        .od-hero-orb-2 {
          position:absolute; width:160px; height:160px; border-radius:50%;
          background:radial-gradient(circle, rgba(0,180,216,0.1) 0%, transparent 70%);
          bottom:-30px; left:30%; filter:blur(40px); pointer-events:none;
          animation:float 7s ease-in-out infinite 1s;
        }
        .od-hero-inner {
          position:relative; z-index:10;
          display:flex; flex-direction:column; gap:20px;
        }
        @media(min-width:768px) { .od-hero-inner { flex-direction:row; align-items:center; justify-content:space-between; } }

        .od-greeting { font-family:'Barlow Condensed',sans-serif; font-size:12px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(0,180,216,0.7); margin-bottom:6px; }
        .od-hero-name { font-family:'Barlow Condensed',sans-serif; font-size:42px; font-weight:900; color:#f8fafc; text-transform:uppercase; letter-spacing:0.02em; line-height:1; margin-bottom:10px; }
        .od-hero-sub  { font-size:14px; font-weight:300; color:rgba(248,250,252,0.5); max-width:380px; line-height:1.6; }

        .od-hero-btns { display:flex; gap:10px; flex-wrap:wrap; flex-shrink:0; }
        .od-btn-ghost {
          padding:10px 20px; border-radius:8px; font-family:'Barlow Condensed',sans-serif;
          font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.25); color:#f8fafc;
          text-decoration:none; transition:background 120ms, border-color 120ms, transform 120ms;
        }
        .od-btn-ghost:hover { background:rgba(0,180,216,0.15); border-color:rgba(0,180,216,0.4); transform:translateY(-1px); }
        .od-btn-solid {
          padding:10px 20px; border-radius:8px; font-family:'Barlow Condensed',sans-serif;
          font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none;
          text-decoration:none; box-shadow:0 0 20px rgba(0,180,216,0.4);
          transition:transform 120ms, box-shadow 120ms, filter 120ms;
          position:relative; overflow:hidden;
        }
        .od-btn-solid::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(105deg,transparent 40%,rgba(202,240,248,0.2) 50%,transparent 60%);
          transform:translateX(-100%); transition:transform 0.5s;
        }
        .od-btn-solid:hover { transform:translateY(-2px); box-shadow:0 0 36px rgba(0,180,216,0.55); filter:brightness(1.08); }
        .od-btn-solid:hover::after { transform:translateX(100%); }

        .od-stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; animation:fadeUp 0.45s ease both 0.05s; }
        @media(min-width:1024px) { .od-stats-grid { grid-template-columns:repeat(4,1fr); } }

        .od-stat-card {
          background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px;
          padding:20px; backdrop-filter:blur(12px);
          transition:transform 220ms, border-color 220ms, box-shadow 220ms;
        }
        .od-stat-card:hover { transform:translateY(-3px); border-color:rgba(0,180,216,0.3); box-shadow:0 0 24px rgba(0,180,216,0.08); }
        .od-stat-icon  { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:14px; background:rgba(0,180,216,0.08); border:1px solid rgba(0,180,216,0.2); }
        .od-stat-value { font-family:'Barlow Condensed',sans-serif; font-size:34px; font-weight:900; color:#00b4d8; line-height:1; margin-bottom:4px; }
        .od-stat-label { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:rgba(248,250,252,0.4); }

        .od-2col { display:grid; grid-template-columns:1fr; gap:16px; animation:fadeUp 0.5s ease both 0.1s; }
        @media(min-width:1024px) { .od-2col { grid-template-columns:2fr 1fr; } }

        .od-section { background:rgba(10,22,40,0.7); border:1px solid rgba(0,180,216,0.15); border-radius:14px; padding:24px; backdrop-filter:blur(12px); }
        .od-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .od-section-title  { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#f8fafc; display:flex; align-items:center; gap:10px; }
        .od-section-icon   { width:30px; height:30px; border-radius:6px; background:rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.2); display:flex; align-items:center; justify-content:center; font-size:14px; }

        .od-create-btn {
          padding:8px 18px; border-radius:8px; font-family:'Barlow Condensed',sans-serif;
          font-size:12px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;
          background:linear-gradient(135deg,#0077b6,#00b4d8); color:#020817; border:none;
          text-decoration:none; box-shadow:0 0 16px rgba(0,180,216,0.35);
          transition:transform 120ms, box-shadow 120ms, filter 120ms;
        }
        .od-create-btn:hover { transform:translateY(-1px); box-shadow:0 0 24px rgba(0,180,216,0.5); filter:brightness(1.08); }

        .od-t-row {
          display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:10px;
          border:1px solid rgba(0,180,216,0.1); background:rgba(0,180,216,0.03);
          transition:border-color 150ms, background 150ms, transform 150ms;
        }
        .od-t-row:hover { border-color:rgba(0,180,216,0.25); background:rgba(0,180,216,0.06); transform:translateX(3px); }
        .od-t-icon { width:44px; height:44px; border-radius:8px; background:linear-gradient(135deg,#03045e,#0077b6); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .od-t-name { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:800; letter-spacing:0.03em; text-transform:uppercase; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .od-t-meta { font-size:12px; color:rgba(248,250,252,0.4); margin-top:2px; }

        .od-status {
          display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:4px;
          font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          white-space:nowrap; flex-shrink:0;
        }
        .od-status-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }

        .od-manage-btn {
          padding:6px 14px; border-radius:6px; font-family:'Barlow Condensed',sans-serif;
          font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
          background:rgba(0,180,216,0.1); border:1px solid rgba(0,180,216,0.2); color:#00b4d8;
          text-decoration:none; flex-shrink:0; transition:background 120ms, border-color 120ms;
        }
        .od-manage-btn:hover { background:rgba(0,180,216,0.18); border-color:rgba(0,180,216,0.4); }

        .od-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; text-align:center; gap:12px; }
        .od-empty-icon  { font-size:40px; opacity:0.3; }
        .od-empty-title { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:rgba(248,250,252,0.55); }
        .od-empty-sub   { font-size:12px; color:rgba(248,250,252,0.3); max-width:220px; line-height:1.6; }

        .od-action-card {
          display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:10px;
          border:1px solid rgba(0,180,216,0.12); background:rgba(10,22,40,0.5);
          text-decoration:none; transition:transform 180ms, border-color 180ms, background 180ms;
        }
        .od-action-card:hover { transform:translateX(3px); background:rgba(0,180,216,0.06); }
        .od-action-icon { width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .od-action-name { font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:#f8fafc; }
        .od-action-desc { font-size:11px; color:rgba(248,250,252,0.35); margin-top:1px; }
        .od-action-arrow { margin-left:auto; color:rgba(248,250,252,0.2); flex-shrink:0; transition:color 150ms; }
        .od-action-card:hover .od-action-arrow { color:rgba(0,180,216,0.6); }

        .od-t-list { display:flex; flex-direction:column; gap:10px; }
        .od-action-list { display:flex; flex-direction:column; gap:10px; }
      `}</style>

      <div style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
          <div className="od-space">

            {/* Hero */}
        <div className="od-hero">
          <div className="od-hero-grid" />
          <div className="od-hero-orb-1" />
          <div className="od-hero-orb-2" />
          <div className="od-hero-inner">
            <div>
              <p className="od-greeting">{greeting} 👋</p>
              <h1 className="od-hero-name">{name}</h1>
              <p className="od-hero-sub">Host tournaments, manage registrations, and grow the sports ecosystem.</p>
            </div>
            <div className="od-hero-btns">
              <Link to="/tournaments" className="od-btn-ghost">View Tournaments</Link>
              <Link to="/tournaments" className="od-btn-solid">+ Create Event</Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="od-stats-grid">
          {[
            { icon: '🏆', label: 'Total Tournaments',  value: tournaments.length },
            { icon: '⚡', label: 'Active Events',       value: activeTournaments },
            { icon: '📝', label: 'Registrations',       value: totalRegistrations },
            { icon: '💰', label: 'Total Revenue',        value: `₹${(totalRevenue / 1000).toFixed(1)}K` },
          ].map((s) => (
            <div key={s.label} className="od-stat-card">
              <div className="od-stat-icon">{s.icon}</div>
              <div className="od-stat-value">{s.value}</div>
              <div className="od-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div className="od-2col">

          {/* Tournaments list */}
          <div className="od-section">
            <div className="od-section-header">
              <span className="od-section-title">
                <span className="od-section-icon">🏆</span>
                My Tournaments
              </span>
              <Link to="/tournaments" className="od-create-btn">+ Create New</Link>
            </div>

            {tournaments.length > 0 ? (
              <div className="od-t-list">
                {(myTournaments.length > 0 ? myTournaments : tournaments).slice(0, 6).map((t: any) => {
                  const statusKey = getEffectiveStatusKey(t);
                  const s = STATUS_STYLE[statusKey] || STATUS_STYLE.UPCOMING;
                  const regs = t.registrations?.length || t.currentTeams || 0;
                  const cap  = t.teamCapacity || t.maxTeams || '—';
                  const startDate = t.dates?.startDate || t.startDate;
                  return (
                    <div key={t.id} className="od-t-row">
                      <div className="od-t-icon">{SPORT_ICON[t.sport] || '🏆'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <p className="od-t-name">{t.name}</p>
                          <span className="od-status" style={{ background: s.bg, color: s.text }}>
                            <span className="od-status-dot" style={{ background: s.dot }} />
                            {s.label}
                          </span>
                        </div>
                        <p className="od-t-meta">
                          {t.sport} · {regs}/{cap} teams
                          {startDate ? ` · ${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                        </p>
                      </div>
                      <Link to={`/tournaments/${t.id}/manage`} className="od-manage-btn">Manage</Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="od-empty">
                <div className="od-empty-icon">🏆</div>
                <div className="od-empty-title">No tournaments yet</div>
                <div className="od-empty-sub">Create your first tournament to start accepting registrations</div>
                <Link to="/tournaments" className="od-btn-solid" style={{ marginTop: 8, fontSize: 12, padding: '9px 18px' }}>
                  Create Tournament
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="od-section">
            <div className="od-section-header">
              <span className="od-section-title">
                <span className="od-section-icon">⚡</span>
                Quick Actions
              </span>
            </div>
            <div className="od-action-list">
              {QUICK_ACTIONS.map((action) => (
                <Link key={action.label} to={action.to} className="od-action-card" style={{ borderColor: action.border }}>
                  <div className="od-action-icon" style={{ background: action.bg, border: `1px solid ${action.border}` }}>
                    {action.icon}
                  </div>
                  <div>
                    <div className="od-action-name">{action.label}</div>
                    <div className="od-action-desc">{action.desc}</div>
                  </div>
                  <svg className="od-action-arrow" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

        </div>
          </div>
        </div>
      </div>
    </>
  );
}