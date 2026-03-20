import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

const SPORT_META: Record<string, { icon: string; accent: string; border: string; bg: string }> = {
  CRICKET:    { icon: '🏏', accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.07)' },
  FOOTBALL:   { icon: '⚽', accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.07)'   },
  KABADDI:    { icon: '🤼', accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.07)'  },
  VOLLEYBALL: { icon: '🏐', accent: '#caf0f8', border: 'rgba(202,240,248,0.25)', bg: 'rgba(202,240,248,0.05)' },
};

const QUICK_ACTIONS = [
  { to: '/teams',       icon: '🛡️', label: 'My Teams',     desc: 'View & manage teams',   accent: '#00b4d8', border: 'rgba(0,180,216,0.25)',    bg: 'rgba(0,180,216,0.07)'   },
  { to: '/tournaments', icon: '🏆', label: 'Tournaments',  desc: 'Browse & register',     accent: '#90e0ef', border: 'rgba(144,224,239,0.25)',  bg: 'rgba(144,224,239,0.07)' },
  { to: '/stats',       icon: '📊', label: 'My Stats',     desc: 'Performance analytics', accent: '#48cae4', border: 'rgba(72,202,228,0.25)',   bg: 'rgba(72,202,228,0.07)'  },
  { to: '/profile',     icon: '👤', label: 'Edit Profile', desc: 'Update your info',       accent: '#0077b6', border: 'rgba(0,119,182,0.3)',     bg: 'rgba(0,119,182,0.07)'   },
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
    } catch (err) { console.error('Failed to accept invitation:', err); }
    finally { setActionLoading(null); }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setActionLoading(invitationId + '_decline');
      await apiClient.post(`/teams/invitations/${invitationId}/decline`);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) { console.error('Failed to decline invitation:', err); }
    finally { setActionLoading(null); }
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

  const name = profileName || user?.name || user?.email?.split('@')[0] || 'Player';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes float   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

        .pd-hero {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          padding: 40px 36px;
          background-color: #020817;
          background-image:
            radial-gradient(ellipse 80% 80% at 0% 0%, rgba(0,119,182,0.45) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,180,216,0.2) 0%, transparent 60%);
          border: 1px solid rgba(0,180,216,0.2);
          animation: fadeUp 0.4s ease both;
        }
        .pd-hero-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .pd-hero-orb-1 {
          position: absolute; width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,180,216,0.12) 0%, transparent 70%);
          top: -60px; right: -40px; filter: blur(40px); pointer-events: none;
          animation: float 5s ease-in-out infinite;
        }
        .pd-hero-orb-2 {
          position: absolute; width: 160px; height: 160px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,119,182,0.1) 0%, transparent 70%);
          bottom: -30px; left: 30%; filter: blur(40px); pointer-events: none;
          animation: float 7s ease-in-out infinite 1s;
        }
        .pd-hero-inner { position: relative; z-index: 10; display: flex; flex-direction: column; gap: 20px; }
        @media (min-width: 768px) { .pd-hero-inner { flex-direction: row; align-items: center; justify-content: space-between; } }

        .pd-greeting { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(0,180,216,0.7); margin-bottom: 6px; }
        .pd-hero-name { font-family: 'Barlow Condensed', sans-serif; font-size: 42px; font-weight: 900; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; margin-bottom: 10px; }
        .pd-hero-sub  { font-size: 14px; font-weight: 300; color: rgba(248,250,252,0.5); max-width: 380px; line-height: 1.6; }

        .pd-hero-btns { display: flex; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
        .pd-btn-ghost {
          padding: 10px 20px; border-radius: 8px; font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.25); color: #f8fafc;
          text-decoration: none; transition: background 120ms, border-color 120ms, transform 120ms;
        }
        .pd-btn-ghost:hover { background: rgba(0,180,216,0.15); border-color: rgba(0,180,216,0.4); transform: translateY(-1px); }
        .pd-btn-solid {
          padding: 10px 20px; border-radius: 8px; font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          background: linear-gradient(135deg, #0077b6, #00b4d8); color: #020817; border: none;
          text-decoration: none; box-shadow: 0 0 20px rgba(0,180,216,0.4);
          transition: transform 120ms, box-shadow 120ms, filter 120ms; position: relative; overflow: hidden;
        }
        .pd-btn-solid::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(202,240,248,0.2) 50%, transparent 60%);
          transform: translateX(-100%); transition: transform 0.5s;
        }
        .pd-btn-solid:hover { transform: translateY(-2px); box-shadow: 0 0 36px rgba(0,180,216,0.55); filter: brightness(1.08); }
        .pd-btn-solid:hover::after { transform: translateX(100%); }

        .pd-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; animation: fadeUp 0.45s ease both 0.05s; }
        @media (min-width: 1024px) { .pd-stats-grid { grid-template-columns: repeat(4, 1fr); } }

        .pd-stat-card {
          background: rgba(10,22,40,0.7); border: 1px solid rgba(0,180,216,0.15); border-radius: 14px;
          padding: 20px; backdrop-filter: blur(12px);
          transition: transform 220ms, border-color 220ms, box-shadow 220ms;
          cursor: default;
        }
        .pd-stat-card:hover { transform: translateY(-3px); border-color: rgba(0,180,216,0.3); box-shadow: 0 0 24px rgba(0,180,216,0.08); }
        .pd-stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 14px; background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.2); }
        .pd-stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 34px; font-weight: 900; color: #00b4d8; line-height: 1; margin-bottom: 4px; }
        .pd-stat-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(248,250,252,0.4); }

        .pd-section { background: rgba(10,22,40,0.7); border: 1px solid rgba(0,180,216,0.15); border-radius: 14px; padding: 24px; backdrop-filter: blur(12px); animation: fadeUp 0.5s ease both 0.1s; }
        .pd-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .pd-section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #f8fafc; display: flex; align-items: center; gap: 10px; }
        .pd-section-icon { width: 30px; height: 30px; border-radius: 6px; background: rgba(0,180,216,0.1); border: 1px solid rgba(0,180,216,0.2); display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .pd-section-link { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #00b4d8; text-decoration: none; transition: opacity 120ms; }
        .pd-section-link:hover { opacity: 0.75; }

        .pd-invite-card {
          display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 10px;
          background: rgba(0,180,216,0.06); border: 1px solid rgba(0,180,216,0.2);
          transition: border-color 150ms;
        }
        .pd-invite-card:hover { border-color: rgba(0,180,216,0.35); }
        .pd-invite-icon { width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, #0077b6, #00b4d8); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .pd-invite-name { font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #f8fafc; }
        .pd-invite-sub  { font-size: 12px; color: rgba(248,250,252,0.45); margin-top: 2px; }
        .pd-invite-btns { display: flex; gap: 8px; flex-shrink: 0; }
        .pd-accept-btn {
          padding: 7px 16px; border-radius: 7px; font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          background: linear-gradient(135deg, #0077b6, #00b4d8); color: #020817; border: none;
          cursor: pointer; transition: transform 120ms, box-shadow 120ms; box-shadow: 0 0 14px rgba(0,180,216,0.35);
          display: flex; align-items: center; gap: 6px;
        }
        .pd-accept-btn:hover { transform: translateY(-1px); box-shadow: 0 0 22px rgba(0,180,216,0.5); }
        .pd-accept-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .pd-decline-btn {
          padding: 7px 14px; border-radius: 7px; font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          background: transparent; color: rgba(248,250,252,0.4); border: 1px solid rgba(0,180,216,0.15);
          cursor: pointer; transition: background 120ms, border-color 120ms, color 120ms;
          display: flex; align-items: center; gap: 6px;
        }
        .pd-decline-btn:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #fca5a5; }
        .pd-decline-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .pd-sport-row {
          display: flex; align-items: center; gap: 14px; padding: 13px 16px; border-radius: 10px;
          border: 1px solid rgba(0,180,216,0.12); background: rgba(0,180,216,0.04);
          transition: transform 180ms, border-color 180ms, background 180ms;
        }
        .pd-sport-row:hover { transform: translateX(3px); border-color: rgba(0,180,216,0.25); background: rgba(0,180,216,0.07); }
        .pd-sport-icon { width: 44px; height: 44px; border-radius: 8px; background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .pd-sport-name { font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #f8fafc; }
        .pd-sport-hint { font-size: 11px; color: rgba(248,250,252,0.35); margin-top: 2px; }
        .pd-sport-link {
          margin-left: auto; padding: 5px 14px; border-radius: 6px; font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          background: rgba(0,180,216,0.1); border: 1px solid rgba(0,180,216,0.2); color: #00b4d8;
          text-decoration: none; flex-shrink: 0; transition: background 120ms, border-color 120ms;
        }
        .pd-sport-link:hover { background: rgba(0,180,216,0.18); border-color: rgba(0,180,216,0.4); }

        .pd-add-sport {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px; border-radius: 10px; border: 1px dashed rgba(0,180,216,0.2);
          color: rgba(0,180,216,0.5); font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          text-decoration: none; transition: border-color 120ms, color 120ms, background 120ms;
        }
        .pd-add-sport:hover { border-color: rgba(0,180,216,0.4); color: #00b4d8; background: rgba(0,180,216,0.04); }

        .pd-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; text-align: center; gap: 12px; }
        .pd-empty-icon { font-size: 40px; opacity: 0.3; }
        .pd-empty-title { font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(248,250,252,0.55); }
        .pd-empty-sub { font-size: 12px; color: rgba(248,250,252,0.3); max-width: 220px; line-height: 1.6; }

        .pd-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pd-action-card {
          display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 10px;
          border: 1px solid rgba(0,180,216,0.12); background: rgba(10,22,40,0.5);
          text-decoration: none; transition: transform 180ms, border-color 180ms, background 180ms, box-shadow 180ms;
        }
        .pd-action-card:hover { transform: translateY(-3px); background: rgba(0,180,216,0.06); }
        .pd-action-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .pd-action-name { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #f8fafc; }
        .pd-action-desc { font-size: 11px; color: rgba(248,250,252,0.35); margin-top: 1px; }

        .pd-2col { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 1024px) { .pd-2col { grid-template-columns: 1fr 1fr; } }
        .pd-space { display: flex; flex-direction: column; gap: 16px; }
        .pd-inv-space { display: flex; flex-direction: column; gap: 10px; }

        .pd-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(0,180,216,0.3); border: 1px solid rgba(0,180,216,0.4);
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 900; color: #00b4d8;
        }

        .pd-spinner { animation: spin 0.8s linear infinite; }
      `}</style>

      <div style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
          <div className="pd-space">

            {/* Hero Banner */}
            <div className="pd-hero">
          <div className="pd-hero-grid" />
          <div className="pd-hero-orb-1" />
          <div className="pd-hero-orb-2" />
          <div className="pd-hero-inner">
            <div>
              <p className="pd-greeting">{greeting} 👋</p>
              <h1 className="pd-hero-name">{name}</h1>
              <p className="pd-hero-sub">Track your performance, manage teams, and compete in tournaments.</p>
            </div>
            <div className="pd-hero-btns">
              <Link to="/profile" className="pd-btn-ghost">Edit Profile</Link>
              <Link to="/tournaments" className="pd-btn-solid">Find Tournaments →</Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="pd-stats-grid">
          {[
            { icon: '🏅', label: 'Sport Profiles', value: stats?.sportProfiles.length ?? 0 },
            { icon: '⚡', label: 'Matches Played', value: stats?.totalMatches ?? 0 },
            { icon: '🛡️', label: 'Teams',          value: stats?.totalTeams ?? 0 },
            { icon: '🏆', label: 'Tournaments',    value: stats?.totalTournaments ?? 0 },
          ].map((s) => (
            <div key={s.label} className="pd-stat-card">
              <div className="pd-stat-icon">{s.icon}</div>
              <div className="pd-stat-value">{s.value}</div>
              <div className="pd-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Team Invitations */}
        {invitations.length > 0 && (
          <div className="pd-section">
            <div className="pd-section-header">
              <span className="pd-section-title">
                <span className="pd-section-icon">📩</span>
                Team Invitations
                <span className="pd-badge">{invitations.length}</span>
              </span>
            </div>
            <div className="pd-inv-space">
              {invitations.map((inv: any) => (
                <div key={inv.id} className="pd-invite-card">
                  <div className="pd-invite-icon">🛡️</div>
                  <div style={{ flex: 1 }}>
                    <div className="pd-invite-name">{inv.teamName || 'Team Invitation'}</div>
                    <div className="pd-invite-sub">
                      You've been invited to join {inv.teamName ? <strong style={{ color: '#00b4d8' }}>{inv.teamName}</strong> : 'a team'}
                    </div>
                  </div>
                  <div className="pd-invite-btns">
                    <button
                      onClick={() => handleAcceptInvitation(inv.id)}
                      disabled={actionLoading === inv.id + '_accept'}
                      className="pd-accept-btn">
                      {actionLoading === inv.id + '_accept'
                        ? <><svg className="pd-spinner" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(2,8,23,0.3)" strokeWidth="4"/><path fill="#020817" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>...</>
                        : 'Accept'
                      }
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(inv.id)}
                      disabled={actionLoading === inv.id + '_decline'}
                      className="pd-decline-btn">
                      {actionLoading === inv.id + '_decline'
                        ? <><svg className="pd-spinner" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(239,68,68,0.2)" strokeWidth="4"/><path fill="#fca5a5" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>...</>
                        : 'Decline'
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Two Columns */}
        <div className="pd-2col">

          {/* Sport Profiles */}
          <div className="pd-section">
            <div className="pd-section-header">
              <span className="pd-section-title">
                <span className="pd-section-icon">🎯</span>
                Sport Profiles
              </span>
              <Link to="/stats" className="pd-section-link">View all →</Link>
            </div>

            {stats?.sportProfiles && stats.sportProfiles.length > 0 ? (
              <div className="pd-space">
                {stats.sportProfiles.map((profile: any) => {
                  const meta = SPORT_META[profile.sport] || SPORT_META.FOOTBALL;
                  return (
                    <div key={profile.id} className="pd-sport-row" style={{ borderColor: meta.border, background: meta.bg }}>
                      <div className="pd-sport-icon" style={{ borderColor: meta.border, background: meta.bg, fontSize: 22 }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div className="pd-sport-name" style={{ color: meta.accent }}>{profile.sport}</div>
                        <div className="pd-sport-hint">Tap to view statistics</div>
                      </div>
                      <Link to="/stats" className="pd-sport-link" style={{ color: meta.accent, borderColor: meta.border }}>
                        Stats →
                      </Link>
                    </div>
                  );
                })}
                <Link to="/profile" className="pd-add-sport">+ Add another sport</Link>
              </div>
            ) : (
              <div className="pd-empty">
                <div className="pd-empty-icon">🏅</div>
                <div className="pd-empty-title">No sport profiles yet</div>
                <div className="pd-empty-sub">Add a sport to start tracking your performance</div>
                <Link to="/profile" className="pd-btn-solid" style={{ marginTop: 4, fontSize: 12, padding: '9px 18px' }}>
                  Add Sport Profile
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="pd-section">
            <div className="pd-section-header">
              <span className="pd-section-title">
                <span className="pd-section-icon">⚡</span>
                Quick Actions
              </span>
            </div>
            <div className="pd-action-grid">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="pd-action-card"
                  style={{ borderColor: action.border }}>
                  <div className="pd-action-icon" style={{ background: action.bg, border: `1px solid ${action.border}` }}>
                    {action.icon}
                  </div>
                  <div>
                    <div className="pd-action-name">{action.label}</div>
                    <div className="pd-action-desc">{action.desc}</div>
                  </div>
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