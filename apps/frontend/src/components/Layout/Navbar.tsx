import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import NotificationCenter from '../NotificationCenter';

interface NavbarProps {
  user?: any;
  onLogout?: () => void;
}

const NAV_LINKS = [
  { to: '/',            label: 'Dashboard',   icon: '⊞', exact: true  },
  { to: '/teams',       label: 'Teams',       icon: '🛡️', exact: false },
  { to: '/tournaments', label: 'Tournaments', icon: '🏆', exact: false },
  { to: '/stats',       label: 'Stats',       icon: '📊', exact: false },
];

const ROLE_CONFIG: Record<string, { label: string; accent: string; border: string; bg: string }> = {
  PLAYER:       { label: 'Player',       accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.08)' },
  TEAM:         { label: 'Team',         accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.08)'   },
  ORGANIZATION: { label: 'Organization', accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.08)'  },
  ADMIN:        { label: 'Admin',        accent: '#fca5a5', border: 'rgba(239,68,68,0.3)',    bg: 'rgba(239,68,68,0.08)'   },
};

export default function Navbar({ user: userProp, onLogout: onLogoutProp }: NavbarProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [solid,       setSolid]       = useState(false);

  const user = userProp ?? (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiClient.get('/users/profile')
      .then((r) => { setAvatarUrl(r.data?.profile?.avatarUrl || r.data?.avatarUrl || null); })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const role        = ROLE_CONFIG[user?.role] || ROLE_CONFIG.PLAYER;
  const displayName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'User';
  const initials    = displayName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    if (onLogoutProp) onLogoutProp();
    else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <>
      <style>{`
        .nb-root {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          transition: background 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
          font-family: 'Barlow', system-ui, sans-serif;
        }
        .nb-root.solid {
          background: rgba(2, 8, 23, 0.92);
          border-bottom: 1px solid rgba(0,180,216,0.2);
          box-shadow: 0 0 32px rgba(0,180,216,0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .nb-root.transparent {
          background: rgba(2, 8, 23, 0.6);
          border-bottom: 1px solid rgba(0,180,216,0.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .nb-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .nb-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .nb-logo-mark {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0077b6, #00b4d8);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900; font-size: 13px; color: #020817;
          box-shadow: 0 0 16px rgba(0,180,216,0.4);
          transition: box-shadow 200ms;
        }
        .nb-logo:hover .nb-logo-mark { box-shadow: 0 0 28px rgba(0,180,216,0.65); }
        .nb-logo-text {
          display: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900; font-size: 18px;
          color: #f8fafc; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .nb-logo-text span { color: #00b4d8; }
        @media (min-width: 640px) { .nb-logo-text { display: block; } }

        .nb-nav {
          display: none;
          align-items: center;
          gap: 2px;
        }
        @media (min-width: 768px) { .nb-nav { display: flex; } }

        .nb-link {
          position: relative;
          display: flex; align-items: center;
          padding: 8px 14px;
          border-radius: 8px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          text-decoration: none;
          color: rgba(248,250,252,0.5);
          transition: color 150ms, background 150ms;
        }
        .nb-link:hover { color: #f8fafc; background: rgba(0,180,216,0.08); }
        .nb-link.active { color: #00b4d8; background: rgba(0,180,216,0.1); }
        .nb-link.active::after {
          content: '';
          position: absolute;
          bottom: 5px; left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #00b4d8;
          box-shadow: 0 0 6px rgba(0,180,216,0.8);
        }

        .nb-right { display: flex; align-items: center; gap: 8px; }

        .nb-role {
          display: none;
          align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 9999px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
        }
        @media (min-width: 640px) { .nb-role { display: flex; } }
        .nb-role-dot { width: 6px; height: 6px; border-radius: 50%; }

        .nb-avatar-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 8px; border-radius: 10px;
          background: transparent; border: none; cursor: pointer;
          transition: background 150ms;
        }
        .nb-avatar-btn:hover { background: rgba(0,180,216,0.08); }

        .nb-avatar {
          width: 34px; height: 34px;
          border-radius: 8px;
          border: 1px solid rgba(0,180,216,0.3);
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #03045e, #0077b6);
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 900; font-size: 13px; color: #f8fafc;
          overflow: hidden; flex-shrink: 0;
        }

        .nb-display-name {
          display: none;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
          color: rgba(248,250,252,0.7);
          max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        @media (min-width: 768px) { .nb-display-name { display: block; } }

        .nb-chevron {
          display: none; color: rgba(248,250,252,0.3);
          transition: transform 200ms, color 150ms;
        }
        @media (min-width: 768px) { .nb-chevron { display: block; } }
        .nb-chevron.open { transform: rotate(180deg); }
        .nb-avatar-btn:hover .nb-chevron { color: rgba(248,250,252,0.6); }

        .nb-dropdown {
          position: absolute;
          right: 0; top: calc(100% + 8px);
          width: 220px;
          background: rgba(10,22,40,0.97);
          border: 1px solid rgba(0,180,216,0.2);
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(3,4,94,0.6), 0 0 40px rgba(0,180,216,0.08);
          overflow: hidden;
          backdrop-filter: blur(20px);
          animation: nb-drop 180ms ease both;
          z-index: 60;
        }
        @keyframes nb-drop { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

        .nb-dropdown-header {
          padding: 16px;
          background: linear-gradient(135deg, rgba(3,4,94,0.8), rgba(0,119,182,0.4));
          border-bottom: 1px solid rgba(0,180,216,0.15);
        }
        .nb-dd-name  { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:800; letter-spacing:0.04em; text-transform:uppercase; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .nb-dd-email { font-size:11px; color:rgba(248,250,252,0.4); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .nb-dd-badge { display:inline-flex; margin-top:8px; padding:2px 8px; border-radius:4px; font-family:'Barlow Condensed',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }

        .nb-dropdown-body { padding: 6px; }

        .nb-dd-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(248,250,252,0.65); text-decoration: none;
          transition: background 120ms, color 120ms;
          cursor: pointer; width: 100%; border: none; background: transparent; text-align: left;
        }
        .nb-dd-item:hover { background: rgba(0,180,216,0.08); color: #f8fafc; }
        .nb-dd-item.danger:hover { background: rgba(239,68,68,0.08); color: #fca5a5; }

        .nb-dd-icon {
          width: 28px; height: 28px; border-radius: 6px;
          background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.15);
          display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;
        }
        .nb-dd-item.danger .nb-dd-icon { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.15); }

        .nb-dd-divider { height: 1px; background: rgba(0,180,216,0.1); margin: 4px 6px; }

        .nb-mobile-btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          color: rgba(248,250,252,0.6); transition: background 150ms, color 150ms;
        }
        .nb-mobile-btn:hover { background: rgba(0,180,216,0.08); color: #f8fafc; }
        @media (min-width: 768px) { .nb-mobile-btn { display: none; } }

        .nb-mobile-menu {
          border-top: 1px solid rgba(0,180,216,0.1);
          background: rgba(2,8,23,0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .nb-mobile-inner { padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 4px; }

        .nb-mobile-link {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px; border-radius: 8px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(248,250,252,0.55); text-decoration: none;
          transition: background 120ms, color 120ms;
        }
        .nb-mobile-link:hover { background: rgba(0,180,216,0.08); color: #f8fafc; }
        .nb-mobile-link.active { background: rgba(0,180,216,0.1); color: #00b4d8; }

        .nb-mobile-divider { height: 1px; background: rgba(0,180,216,0.1); margin: 6px 0; }

        .nb-mobile-logout {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px; border-radius: 8px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(252,165,165,0.7); background: transparent; border: none; cursor: pointer; width: 100%; text-align: left;
          transition: background 120ms, color 120ms;
        }
        .nb-mobile-logout:hover { background: rgba(239,68,68,0.08); color: #fca5a5; }
      `}</style>

      <nav className={`nb-root ${solid ? 'solid' : 'transparent'}`}>
        <div className="nb-inner">

          {/* Logo */}
          <Link to="/" className="nb-logo">
            <div className="nb-logo-mark">SO</div>
            <span className="nb-logo-text">Score<span>Ocean</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="nb-nav">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nb-link${isActive(link.to, link.exact) ? ' active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="nb-right">

            <NotificationCenter />

            {/* Role badge */}
            <div className="nb-role" style={{ background: role.bg, border: `1px solid ${role.border}` }}>
              <span className="nb-role-dot" style={{ background: role.accent }} />
              <span style={{ color: role.accent }}>{role.label}</span>
            </div>

            {/* Profile dropdown */}
            <div style={{ position: 'relative' }}>
              <button className="nb-avatar-btn" onClick={() => setProfileOpen(!profileOpen)}>
                <div className="nb-avatar">
                  {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials
                  }
                </div>
                <span className="nb-display-name">{displayName}</span>
                <svg className={`nb-chevron${profileOpen ? ' open' : ''}`} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setProfileOpen(false)} />
                  <div className="nb-dropdown">
                    <div className="nb-dropdown-header">
                      <div className="nb-dd-name">{displayName}</div>
                      <div className="nb-dd-email">{user?.email}</div>
                      <span className="nb-dd-badge" style={{ background: role.bg, border: `1px solid ${role.border}`, color: role.accent }}>
                        {role.label}
                      </span>
                    </div>
                    <div className="nb-dropdown-body">
                      {[
                        { to: '/profile',      icon: '👤', label: 'Profile Settings' },
                        { to: '/stats',        icon: '📊', label: 'My Statistics'    },
                        { to: '/certificates', icon: '🎖️', label: 'Certificates'     },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setProfileOpen(false)}
                          className="nb-dd-item">
                          <span className="nb-dd-icon">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                      <div className="nb-dd-divider" />
                      <button onClick={handleLogout} className="nb-dd-item danger">
                        <span className="nb-dd-icon">🚪</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button className="nb-mobile-btn" onClick={() => setMenuOpen(!menuOpen)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {menuOpen
                  ? <path d="M6 18L18 6M6 6l12 12" />
                  : <path d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="nb-mobile-menu">
            <div className="nb-mobile-inner">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`nb-mobile-link${isActive(link.to, link.exact) ? ' active' : ''}`}>
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              <div className="nb-mobile-divider" />
              <button onClick={handleLogout} className="nb-mobile-logout">
                <span>🚪</span>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}