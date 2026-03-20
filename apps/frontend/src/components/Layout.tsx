import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ReactNode, useState, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: ReactNode;
}

const ROLE_CONFIG: Record<string, { accent: string; border: string; bg: string }> = {
  PLAYER:       { accent: '#90e0ef', border: 'rgba(144,224,239,0.3)',  bg: 'rgba(144,224,239,0.08)' },
  TEAM:         { accent: '#00b4d8', border: 'rgba(0,180,216,0.3)',    bg: 'rgba(0,180,216,0.08)'   },
  ORGANIZATION: { accent: '#48cae4', border: 'rgba(72,202,228,0.3)',   bg: 'rgba(72,202,228,0.08)'  },
  ADMIN:        { accent: '#fca5a5', border: 'rgba(239,68,68,0.3)',    bg: 'rgba(239,68,68,0.08)'   },
};

const NAV_LINKS = [
  { path: '/profile',     label: 'Profile',     icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { path: '/teams',       label: 'Teams',       icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { path: '/tournaments', label: 'Tournaments', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
];

function Layout({ children }: LayoutProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser]               = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solid, setSolid]             = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const role = user ? (ROLE_CONFIG[user.role] || ROLE_CONFIG.PLAYER) : ROLE_CONFIG.PLAYER;
  const displayName = user?.name || user?.email?.split('@')[0] || '';

  return (
    <>
      <style>{`
        .layout-root { min-height: 100vh; background: transparent; }

        .layout-nav {
          position: sticky; top: 0; z-index: 50; width: 100%;
          transition: background 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
          font-family: 'Barlow', system-ui, sans-serif;
        }
        .layout-nav.solid {
          background: rgba(2,8,23,0.92);
          border-bottom: 1px solid rgba(0,180,216,0.2);
          box-shadow: 0 0 32px rgba(0,180,216,0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .layout-nav.transparent {
          background: rgba(2,8,23,0.6);
          border-bottom: 1px solid rgba(0,180,216,0.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .layout-nav-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 24px; height: 64px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }

        .layout-logo {
          display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0;
        }
        .layout-logo-mark {
          width: 34px; height: 34px; border-radius: 8px;
          background: linear-gradient(135deg, #0077b6, #00b4d8);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 13px; color: #020817;
          box-shadow: 0 0 16px rgba(0,180,216,0.4); transition: box-shadow 200ms; flex-shrink: 0;
        }
        .layout-logo:hover .layout-logo-mark { box-shadow: 0 0 28px rgba(0,180,216,0.65); }
        .layout-logo-text {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 18px;
          color: #f8fafc; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .layout-logo-text span { color: #00b4d8; }

        .layout-nav-links {
          display: none; align-items: center; gap: 2px;
        }
        @media (min-width: 768px) { .layout-nav-links { display: flex; } }

        .layout-nav-link {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none;
          color: rgba(248,250,252,0.5); transition: color 150ms, background 150ms;
        }
        .layout-nav-link:hover { color: #f8fafc; background: rgba(0,180,216,0.08); }
        .layout-nav-link.active { color: #00b4d8; background: rgba(0,180,216,0.1); }

        .layout-right { display: flex; align-items: center; gap: 8px; }

        .layout-user-info {
          display: none; align-items: center; gap: 8px;
        }
        @media (min-width: 640px) { .layout-user-info { display: flex; } }

        .layout-username {
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase;
          color: rgba(248,250,252,0.7); max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .layout-role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 9999px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .layout-role-dot { width: 5px; height: 5px; border-radius: 50%; }

        .layout-logout-btn {
          display: none; padding: 7px 16px; border-radius: 8px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          background: transparent; color: rgba(248,250,252,0.45);
          border: 1px solid rgba(0,180,216,0.15); cursor: pointer;
          transition: background 120ms, border-color 120ms, color 120ms;
        }
        .layout-logout-btn:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #fca5a5; }
        @media (min-width: 640px) { .layout-logout-btn { display: block; } }

        .layout-mobile-btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          color: rgba(248,250,252,0.6); transition: background 150ms, color 150ms;
        }
        .layout-mobile-btn:hover { background: rgba(0,180,216,0.08); color: #f8fafc; }
        @media (min-width: 768px) { .layout-mobile-btn { display: none; } }

        .layout-mobile-menu {
          border-top: 1px solid rgba(0,180,216,0.1);
          background: rgba(2,8,23,0.97);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        }
        .layout-mobile-inner { padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 4px; }

        .layout-mobile-link {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px; border-radius: 8px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(248,250,252,0.55); text-decoration: none;
          transition: background 120ms, color 120ms;
        }
        .layout-mobile-link:hover { background: rgba(0,180,216,0.08); color: #f8fafc; }
        .layout-mobile-link.active { background: rgba(0,180,216,0.1); color: #00b4d8; }

        .layout-mobile-divider { height: 1px; background: rgba(0,180,216,0.1); margin: 6px 0; }

        .layout-mobile-user {
          padding: 10px 14px; display: flex; align-items: center; gap: 10px;
        }
        .layout-mobile-logout {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px; border-radius: 8px; width: 100%; text-align: left;
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(252,165,165,0.7); background: transparent; border: none; cursor: pointer;
          transition: background 120ms, color 120ms;
        }
        .layout-mobile-logout:hover { background: rgba(239,68,68,0.08); color: #fca5a5; }

        .layout-main {
          max-width: 1280px; margin: 0 auto;
          padding: 32px 24px;
        }
      `}</style>

      <div className="layout-root">
        <nav className={`layout-nav ${solid ? 'solid' : 'transparent'}`}>
          <div className="layout-nav-inner">

            {/* Logo */}
            <Link to="/" className="layout-logo">
              <div className="layout-logo-mark">SO</div>
              <span className="layout-logo-text">Score<span>Ocean</span></span>
            </Link>

            {/* Desktop nav links */}
            <div className="layout-nav-links">
              {NAV_LINKS.map((link) => (
                <Link key={link.path} to={link.path} className={`layout-nav-link${isActive(link.path) ? ' active' : ''}`}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d={link.icon} />
                  </svg>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="layout-right">
              {user && (
                <>
                  <NotificationCenter />

                  <div className="layout-user-info">
                    <span className="layout-username">{displayName}</span>
                    <span className="layout-role-badge" style={{ background: role.bg, border: `1px solid ${role.border}` }}>
                      <span className="layout-role-dot" style={{ background: role.accent }} />
                      <span style={{ color: role.accent }}>{user.role}</span>
                    </span>
                  </div>

                  <button className="layout-logout-btn" onClick={handleLogout}>Logout</button>
                </>
              )}

              <button className="layout-mobile-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  {mobileMenuOpen
                    ? <path d="M6 18L18 6M6 6l12 12" />
                    : <path d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="layout-mobile-menu">
              <div className="layout-mobile-inner">
                {NAV_LINKS.map((link) => (
                  <Link key={link.path} to={link.path} onClick={() => setMobileMenuOpen(false)}
                    className={`layout-mobile-link${isActive(link.path) ? ' active' : ''}`}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d={link.icon} />
                    </svg>
                    {link.label}
                  </Link>
                ))}

                {user && (
                  <>
                    <div className="layout-mobile-divider" />
                    <div className="layout-mobile-user">
                      <span className="layout-username" style={{ maxWidth: 'none' }}>{displayName}</span>
                      <span className="layout-role-badge" style={{ background: role.bg, border: `1px solid ${role.border}` }}>
                        <span className="layout-role-dot" style={{ background: role.accent }} />
                        <span style={{ color: role.accent }}>{user.role}</span>
                      </span>
                    </div>
                    <button className="layout-mobile-logout" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                      🚪 Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        <main className="layout-main">
          {children}
        </main>
      </div>
    </>
  );
}

export default Layout;